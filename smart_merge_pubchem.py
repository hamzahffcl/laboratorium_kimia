import sqlite3
import csv
import os

DB_PATH = 'chemistry.db'
CSV_PATH = r'C:\Users\Acer\Downloads\Data_PubChem_Lengkap.csv'

def add_columns_if_not_exist(cursor):
    """Menambahkan kolom baru jika belum ada di tabel Molecules"""
    cursor.execute("PRAGMA table_info(Molecules)")
    existing_columns = [col[1] for col in cursor.fetchall()]
    
    new_columns = {
        'pubchem_cid': 'INTEGER',
        'iupac_name': 'TEXT',
        'molecular_weight': 'REAL',
        'exact_mass': 'REAL',
        'charge': 'INTEGER',
        'complexity': 'REAL',
        'isomeric_smiles': 'TEXT'
    }
    
    for col_name, col_type in new_columns.items():
        if col_name not in existing_columns:
            cursor.execute(f"ALTER TABLE Molecules ADD COLUMN {col_name} {col_type}")
            print(f"  [+] Kolom {col_name} berhasil ditambahkan.")

def main():
    print("=" * 60)
    print("SUNTIK DATA PUBCHEM KE DATABASE (Aman dari Overwrite)")
    print("=" * 60)

    if not os.path.exists(CSV_PATH):
        print(f"File CSV tidak ditemukan: {CSV_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Tambah Kolom
    print("Memeriksa struktur tabel Molecules...")
    add_columns_if_not_exist(cur)

    # 2. Proses Injeksi
    stats = {"updated": 0, "skipped": 0}
    
    print("\nMemulai injeksi data PubChem...")
    with open(CSV_PATH, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            row_id = row.get('id_asli', '').strip()
            cid = row.get('PubChem_CID', '').strip()
            
            # Jika PubChem_CID kosong (molekul radikal/gagal), lewati
            if not cid:
                stats["skipped"] += 1
                continue
                
            # Ambil sisa data (beri nilai None jika string kosong agar jadi NULL di SQL)
            iupac = row.get('IUPACName', '').strip() or None
            mw = float(row['MolecularWeight']) if row.get('MolecularWeight', '').strip() else None
            em = float(row['ExactMass']) if row.get('ExactMass', '').strip() else None
            charge = int(row['Charge']) if row.get('Charge', '').strip() else None
            comp = float(row['Complexity']) if row.get('Complexity', '').strip() else None
            smiles = row.get('IsomericSMILES', '').strip() or None
            
            cur.execute("""
                UPDATE Molecules 
                SET pubchem_cid = ?,
                    iupac_name = ?,
                    molecular_weight = ?,
                    exact_mass = ?,
                    charge = ?,
                    complexity = ?,
                    isomeric_smiles = ?
                WHERE id = ?
            """, (int(cid), iupac, mw, em, charge, comp, smiles, int(row_id)))
            
            if cur.rowcount > 0:
                stats["updated"] += 1

    conn.commit()
    conn.close()

    print("\n" + "=" * 60)
    print("INJEKSI SELESAI")
    print(f"  Molekul sukses diperbarui : {stats['updated']}")
    print(f"  Molekul dilewati (kosong): {stats['skipped']}")
    print("  *Data Entalpi, Titik Didih, pH, dsb SAMA SEKALI TIDAK TERSENTUH*")
    print("=" * 60)

if __name__ == "__main__":
    main()
