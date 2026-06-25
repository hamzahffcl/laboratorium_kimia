import sqlite3
import json
from mendeleev import element

def get_exact_mass(e):
    try:
        # Most abundant isotope mass
        isotopes = e.isotopes
        if isotopes:
            most_abundant = max(isotopes, key=lambda iso: iso.abundance if iso.abundance else 0)
            return most_abundant.mass
    except:
        pass
    return e.atomic_weight

def main():
    conn = sqlite3.connect('tools/chemistry.db')
    c = conn.cursor()

    # Get existing labels in DB
    c.execute("SELECT label FROM Molecules")
    existing_db_labels = set([row[0] for row in c.fetchall()])

    with open('static/data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    existing_json_labels = set([m['label'] for m in data['molecules']])

    atoms_inserted = 0
    new_json_molecules = []

    for i in range(1, 119):
        try:
            e = element(i)
            label = e.symbol
            
            if label in existing_db_labels:
                continue

            mp = e.melting_point - 273.15 if e.melting_point else None
            bp = e.boiling_point - 273.15 if e.boiling_point else None
            
            acid_base_type = 'Netral'
            acid_base_strength = 'Tidak Ada'
            ionization_factor = 0.0
            bond_type = 'Atom Tunggal'
            molar_mass = e.atomic_weight
            density = e.density
            heat_capacity = None
            if hasattr(e, 'specific_heat') and e.specific_heat:
                heat_capacity = e.specific_heat
            
            enthalpy_formation = 0.0
            pubchem_cid = None
            iupac_name = e.name
            molecular_weight = e.atomic_weight
            
            exact_mass = get_exact_mass(e)
            if exact_mass is None:
                exact_mass = e.atomic_weight
                
            charge = 0
            complexity = 0.0
            isomeric_smiles = f"[{e.symbol}]"
            
            # Insert to DB
            c.execute('''
                INSERT INTO Molecules (
                    label, melting_point, boiling_point, acid_base_type, acid_base_strength,
                    ionization_factor, bond_type, molar_mass, density, heat_capacity,
                    enthalpy_formation, pubchem_cid, iupac_name, molecular_weight, exact_mass,
                    charge, complexity, isomeric_smiles
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                label, mp, bp, acid_base_type, acid_base_strength,
                ionization_factor, bond_type, molar_mass, density, heat_capacity,
                enthalpy_formation, pubchem_cid, iupac_name, molecular_weight, exact_mass,
                charge, complexity, isomeric_smiles
            ))
            
            mol_id = c.lastrowid
            
            c.execute('INSERT INTO MoleculeAtoms (molecule_id, atom_symbol, atom_count) VALUES (?, ?, ?)', (mol_id, e.symbol, 1))
            
            # Add to JSON format
            json_mol = {
                "label": label,
                "atoms_csv": e.symbol,
                "mp": mp,
                "bp": bp,
                "acid_base_type": acid_base_type,
                "acid_base_strength": acid_base_strength,
                "ionization_factor": ionization_factor,
                "bond_type": bond_type,
                "molar_mass": molar_mass,
                "density": density,
                "heat_capacity": heat_capacity,
                "enthalpy_formation": enthalpy_formation,
                "pubchem_cid": pubchem_cid,
                "iupac_name": iupac_name,
                "molecular_weight": molecular_weight,
                "exact_mass": exact_mass,
                "charge": charge,
                "complexity": complexity,
                "isomeric_smiles": isomeric_smiles
            }
            new_json_molecules.append(json_mol)
            atoms_inserted += 1
            
        except Exception as ex:
            print(f"Error processing element {i}: {ex}")

    conn.commit()
    print(f"Inserted {atoms_inserted} atoms into chemistry.db")

    # Append to data.json
    for nm in new_json_molecules:
        if nm['label'] not in existing_json_labels:
            data['molecules'].append(nm)

    with open('static/data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

    with open('static/data.js', 'w', encoding='utf-8') as f:
        f.write('window.CHEM_DATA = ' + json.dumps(data, indent=2) + ';')

    print("data.json and data.js successfully updated!")

if __name__ == "__main__":
    main()
