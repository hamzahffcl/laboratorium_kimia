import sqlite3
import json
import os
from chemistry import get_atom_data

def export_to_json():
    print("Memulai proses ekspor data Relasional dari SQLite ke JSON...")
    conn = sqlite3.connect('chemistry.db')
    conn.execute('PRAGMA foreign_keys = ON;')
    c = conn.cursor()
    
    # Ekstrak Molecules dengan JOIN ke MoleculeAtoms
    c.execute("SELECT id, label, melting_point, boiling_point, acid_base_type, acid_base_strength, ionization_factor, bond_type, molar_mass, density FROM Molecules")
    molecules_data = c.fetchall()
    
    molecules = []
    atoms_set = set()
    
    # Lookup dictionary for ID -> label
    mol_label_map = {row[0]: row[1] for row in molecules_data}
    
    for row in molecules_data:
        mol_id = row[0]
        label = row[1]
        
        # Rekonstruksi atoms_csv
        c.execute("SELECT atom_symbol, atom_count FROM MoleculeAtoms WHERE molecule_id=?", (mol_id,))
        atom_rows = c.fetchall()
        atom_list = []
        for sym, count in atom_rows:
            atom_list.extend([sym] * count)
            atoms_set.add(sym)
            
        atoms_csv = ",".join(atom_list)
        
        molecules.append({
            "label": label,
            "atoms_csv": atoms_csv,
            "mp": row[2],
            "bp": row[3],
            "acid_base_type": row[4],
            "acid_base_strength": row[5],
            "ionization_factor": row[6],
            "bond_type": row[7],
            "molar_mass": row[8],
            "density": row[9]
        })
        
    print(f"Berhasil mengekstrak {len(molecules)} Molekul secara Relasional.")
        
    # Ekstrak Reactions dengan JOIN Stoikiometri
    c.execute("SELECT id, min_temp, catalyst, min_temp_catalyzed, is_exothermic, delta_H_kJ FROM Reactions")
    reactions_data = c.fetchall()
    
    reactions = []
    for row in reactions_data:
        rx_id = row[0]
        
        # Dapatkan reaktan
        c.execute("SELECT molecule_id, coefficient FROM ReactionReactants WHERE reaction_id=?", (rx_id,))
        reactants_rows = c.fetchall()
        if len(reactants_rows) < 2:
            continue
            
        r1_label = mol_label_map.get(reactants_rows[0][0])
        r2_label = mol_label_map.get(reactants_rows[1][0])
        
        if not r1_label or not r2_label:
            continue
            
        # Dapatkan produk
        c.execute("SELECT product_id, coefficient FROM ReactionProducts WHERE reaction_id=?", (rx_id,))
        product_rows = c.fetchall()
        product_labels = [mol_label_map.get(pr[0]) for pr in product_rows if mol_label_map.get(pr[0])]
        
        reactions.append({
            "r1": r1_label,
            "r2": r2_label,
            "products": product_labels,
            "min_temp": row[1],
            "catalyst": row[2],
            "min_temp_catalyzed": row[3],
            "is_exothermic": row[4],
            "delta_H_kJ": row[5]
        })
        
    print(f"Berhasil mengekstrak {len(reactions)} Reaksi ter-Rekonstruksi.")
        
    conn.close()
    
    # Susun Tabel Periodik Dinamis dengan Penjagaan Ketat (Memasukkan Gas Mulia untuk future-proofing)
    base_symbols = {"H", "C", "N", "O", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "K", "Ca", "Fe", "Cu", "Zn", "Ag", "I", "Pb", "He", "Ne", "Ar", "Kr", "Xe", "Rn"}
    periodic_symbols = sorted(list(atoms_set.union(base_symbols)))
    
    periodic_table = []
    for sym in periodic_symbols:
        try:
            adata = get_atom_data(sym)
            periodic_table.append({
                "symbol": adata.symbol,
                "name": adata.name,
                "mass": adata.mass,
                "color": adata.color,
                "charge": adata.charge,
                "mp": adata.mp,
                "bp": adata.bp
            })
        except Exception as e:
            print(f"Peringatan: Gagal memuat data atom {sym}. Error: {e}")

    print(f"Berhasil mengekstrak {len(periodic_table)} jenis Atom.")

    data = {
        "molecules": molecules, 
        "reactions": reactions, 
        "periodic_table": periodic_table
    }
    
    js_content = "window.CHEM_DATA = " + json.dumps(data, indent=2) + ";"
    
    os.makedirs("static", exist_ok=True)
    output_path = os.path.join("static", "data.js")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(js_content)
        
    print("Ekspor Relasional selesai! Data berhasil diratakan (flattened) ke 'static/data.js'.")

if __name__ == "__main__":
    export_to_json()
