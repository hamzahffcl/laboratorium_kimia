"""
Build script for Chemistry Data (v3).
1. Runs validate_chemdb.py to strictly enforce zero errors.
2. Exports chemistry_v3.db into static/data.json and static/data.js.
Ensures 100% backward compatibility for existing game engine while adding v3 columns.
"""
import subprocess
import sqlite3
import json
import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = 'tools/chemistry_v3.db'
VALIDATOR = 'tools/validate_chemdb.py'
DATA_JSON = 'static/data.json'
DATA_JS = 'static/data.js'

def main():
    print("=== [1/2] RUNNING VALIDATOR (validate_chemdb.py) ===")
    res = subprocess.run([sys.executable, VALIDATOR, DB_PATH])
    if res.returncode != 0:
        print("\n[BUILD ABORTED] Database validation failed with exit code", res.returncode)
        sys.exit(1)

    print("\n=== [2/2] EXPORTING chemistry_v3.db -> data.json & data.js ===")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 1. Molecules
    c.execute("""
        SELECT id, label, melting_point_c, boiling_point_c, hvap_kj_mol,
               density, heat_capacity, enthalpy_formation, molar_mass,
               acid_base_type, acid_base_strength, ionization_factor,
               h_count, oh_count, pka1, pka2, bond_type, charge,
               is_intermediate, pubchem_cid, iupac_name
        FROM Molecules
        ORDER BY id
    """)
    mol_rows = c.fetchall()

    # Load atom compositions for each molecule
    c.execute("SELECT molecule_id, atom_symbol, atom_count FROM MoleculeAtoms ORDER BY molecule_id, atom_symbol")
    atoms_map = {}
    for mid, sym, cnt in c.fetchall():
        atoms_map.setdefault(mid, []).extend([sym] * cnt)

    molecules_list = []
    for r in mol_rows:
        mid = r[0]
        label = r[1]
        atoms = atoms_map.get(mid, [])
        atoms_csv = ",".join(sorted(atoms)) if atoms else label.split(' ')[0]

        molecules_list.append({
            'id': mid,
            'label': label,
            'atoms_csv': atoms_csv,
            'mp': r[2],
            'bp': r[3],
            'hvap_kj_mol': r[4],
            'density': r[5],
            'heat_capacity': r[6],
            'enthalpy_formation': r[7],
            'molar_mass': r[8],
            'acid_base_type': r[9] if r[9] != 'NEUTRAL' else None,
            'acid_base_strength': r[10] if r[10] != 'NONE' else None,
            'ionization_factor': r[11],
            'h_count': r[12],
            'oh_count': r[13],
            'pka1': r[14],
            'pka2': r[15],
            'bond_type': r[16],
            'charge': r[17],
            'is_intermediate': r[18],
            'pubchem_cid': r[19],
            'iupac_name': r[20]
        })

    # 2. Reactions
    c.execute("""
        SELECT r.id, r.min_temp_c, cat.label AS catalyst, r.min_temp_catalyzed_c,
               vdh.dh_effective, r.is_reversible
        FROM Reactions r
        LEFT JOIN Molecules cat ON cat.id = r.catalyst_id
        LEFT JOIN v_reaction_dh vdh ON vdh.reaction_id = r.id
        ORDER BY r.id
    """)
    rx_rows = c.fetchall()

    reactions_list = []
    for rx in rx_rows:
        rid = rx[0]
        min_temp = rx[1]
        catalyst = rx[2]
        min_temp_cat = rx[3]
        dh_eff = rx[4]
        is_rev = rx[5]

        # Get reactants
        c.execute("""
            SELECT m.label, rr.coefficient
            FROM ReactionReactants rr
            JOIN Molecules m ON m.id = rr.molecule_id
            WHERE rr.reaction_id = ?
            ORDER BY rr.molecule_id
        """, (rid,))
        reactants = []
        for lbl, coeff in c.fetchall():
            reactants.extend([lbl] * coeff)

        # Get products
        c.execute("""
            SELECT m.label, rp.coefficient
            FROM ReactionProducts rp
            JOIN Molecules m ON m.id = rp.molecule_id
            WHERE rp.reaction_id = ?
            ORDER BY rp.molecule_id
        """, (rid,))
        products = []
        for lbl, coeff in c.fetchall():
            products.extend([lbl] * coeff)

        if len(reactants) < 2:
            r1 = reactants[0] if len(reactants) > 0 else None
            r2 = None
        else:
            r1 = reactants[0]
            r2 = reactants[1]

        dh_val = round(dh_eff, 2) if dh_eff is not None else -50.0
        is_exo = 1 if dh_val < 0 else 0

        reactions_list.append({
            'id': rid,
            'r1': r1,
            'r2': r2,
            'products': products,
            'min_temp': min_temp,
            'catalyst': catalyst,
            'min_temp_catalyzed': min_temp_cat,
            'is_exothermic': is_exo,
            'delta_H_kJ': dh_val,
            'is_reversible': is_rev
        })

    # 3. Elements (Periodic table)
    c.execute("""
        SELECT atomic_number, symbol, name, atomic_mass, category, valence
        FROM Elements
        ORDER BY atomic_number
    """)
    elements_list = []
    for el in c.fetchall():
        elements_list.append({
            'atomic_number': el[0],
            'symbol': el[1],
            'name': el[2],
            'atomic_mass': el[3],
            'category': el[4],
            'valence': el[5]
        })

    conn.close()

    output_data = {
        'molecules': molecules_list,
        'reactions': reactions_list,
        'periodic_table': elements_list
    }

    # Backup current files before overwrite
    if os.path.exists(DATA_JSON):
        with open(DATA_JSON + '.bak', 'w', encoding='utf-8') as f:
            with open(DATA_JSON, 'r', encoding='utf-8') as src:
                f.write(src.read())

    with open(DATA_JSON, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    with open(DATA_JS, 'w', encoding='utf-8') as f:
        f.write('window.CHEM_DATA = ' + json.dumps(output_data, indent=2, ensure_ascii=False) + ';')

    print(f"Successfully exported {len(molecules_list)} molecules and {len(reactions_list)} reactions!")
    print(f"Updated: {DATA_JSON} and {DATA_JS}")

if __name__ == '__main__':
    main()
