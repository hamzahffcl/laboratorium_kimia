import sqlite3
import pandas as pd
import os

DB_PATH = 'chemistry.db'
MOLECULE_CSV = 'eksport_molekul_fase6_final.csv'
REACTION_CSV = 'eksport_reaksi_fase6_final.csv'

def main():
    print("=" * 60)
    print("MEMBUAT CADANGAN DATA DALAM FORMAT CSV")
    print("=" * 60)

    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} tidak ditemukan.")
        return

    conn = sqlite3.connect(DB_PATH)

    try:
        # Ekspor Tabel Molecules
        df_molekul = pd.read_sql_query("SELECT * FROM Molecules", conn)
        df_molekul.to_csv(MOLECULE_CSV, index=False, encoding='utf-8-sig')
        print(f"  [OK] Data Molekul berhasil diekspor ke : {MOLECULE_CSV} ({len(df_molekul)} baris)")

        # Ekspor Tabel Reactions
        # Kita gabungkan data dari Reactions, tapi akan lebih rapi jika kita ekspor mentah saja
        df_reaksi = pd.read_sql_query("SELECT * FROM Reactions", conn)
        df_reaksi.to_csv(REACTION_CSV, index=False, encoding='utf-8-sig')
        print(f"  [OK] Data Reaksi berhasil diekspor ke  : {REACTION_CSV} ({len(df_reaksi)} baris)")

    except Exception as e:
        print(f"Terjadi kesalahan saat ekspor CSV: {e}")
    finally:
        conn.close()

    print("\n" + "=" * 60)
    print("EKSPOR SELESAI")
    print("=" * 60)

if __name__ == "__main__":
    main()
