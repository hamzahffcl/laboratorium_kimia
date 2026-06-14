import sqlite3
import os

# Data awal yang akan dimasukkan ke database
KNOWN_MOLECULES = {
    ('H', 'H'): 'H2 (Gas Hidrogen)',
    ('O', 'O'): 'O2 (Gas Oksigen)',
    ('N', 'N'): 'N2 (Gas Nitrogen)',
    ('Cl', 'Cl'): 'Cl2 (Gas Klorin)',
    ('F', 'F'): 'F2 (Gas Fluorin)',
    ('Br', 'Br'): 'Br2 (Gas Bromin)',
    ('I', 'I'): 'I2 (Gas Iodida)',
    ('H', 'O'): 'OH (Radikal Hidroksil)',
    ('H', 'H', 'O'): 'H2O (Air)',
    ('H', 'H', 'O', 'O'): 'H2O2 (Hidrogen Peroksida)',
    ('C', 'O'): 'CO (Karbon Monoksida)',
    ('C', 'O', 'O'): 'CO2 (Karbon Dioksida)',
    ('C', 'O', 'O', 'O'): 'CO3 (Radikal Karbonat)',
    ('C', 'H'): 'CH (Radikal Metilidin)',
    ('C', 'H', 'H'): 'CH2 (Metilena)',
    ('C', 'H', 'H', 'H'): 'CH3 (Radikal Metil)',
    ('C', 'H', 'H', 'H', 'H'): 'CH4 (Gas Metana)',
    ('C', 'C', 'H', 'H', 'H', 'H', 'H', 'H'): 'C2H6 (Gas Etana)',
    ('C', 'C', 'H', 'H', 'H', 'H'): 'C2H4 (Gas Etena)',
    ('C', 'C', 'H', 'H'): 'C2H2 (Gas Etuna)',
    ('C', 'H', 'H', 'H', 'H', 'O'): 'CH3OH (Metanol)',
    ('C', 'C', 'H', 'H', 'H', 'H', 'H', 'H', 'O'): 'C2H5OH (Etanol Alkohol)',
    ('C', 'H', 'H', 'O'): 'CH2O (Formaldehida)',
    ('H', 'N'): 'NH (Radikal Imidogen)',
    ('H', 'H', 'N'): 'NH2 (Radikal Amino)',
    ('H', 'H', 'H', 'N'): 'NH3 (Gas Amonia)',
    ('N', 'O'): 'NO (Nitrogen Monoksida)',
    ('N', 'O', 'O'): 'NO2 (Nitrogen Dioksida)',
    ('N', 'N', 'O'): 'N2O (Gas Tertawa / Nitrous Oksida)',
    ('Cl', 'H'): 'HCl (Asam Klorida)',
    ('F', 'H'): 'HF (Asam Fluorida)',
    ('Br', 'H'): 'HBr (Asam Bromida)',
    ('H', 'I'): 'HI (Asam Iodida)',
    ('H', 'N', 'O', 'O', 'O'): 'HNO3 (Asam Nitrat)',
    ('H', 'H', 'O', 'O', 'O', 'O', 'S'): 'H2SO4 (Asam Sulfat)',
    ('H', 'Na', 'O'): 'NaOH (Natrium Hidroksida)',
    ('H', 'K', 'O'): 'KOH (Kalium Hidroksida)',
    ('Cl', 'Na'): 'NaCl (Garam Dapur)',
    ('Cl', 'K'): 'KCl (Kalium Klorida)',
    ('F', 'Na'): 'NaF (Natrium Fluorida)',
    ('I', 'K'): 'KI (Kalium Iodida)',
    ('Cl', 'Cl', 'Mg'): 'MgCl2 (Magnesium Klorida)',
    ('Ca', 'Cl', 'Cl'): 'CaCl2 (Kalsium Klorida)',
    ('O', 'O', 'O'): 'O3 (Gas Ozon)',
    ('O', 'S'): 'SO (Sulfur Monoksida)',
    ('O', 'O', 'S'): 'SO2 (Sulfur Dioksida)',
    ('O', 'O', 'O', 'S'): 'SO3 (Sulfur Trioksida)',
    ('Fe', 'O'): 'FeO (Besi(II) Oksida)',
    ('Fe', 'Fe', 'O', 'O', 'O'): 'Fe2O3 (Karat Besi)',
    ('Al', 'Al', 'O', 'O', 'O'): 'Al2O3 (Alumina)',
    ('O', 'Ti', 'Ti'): 'TiO2 (Titanium Dioksida)',
    ('Ag', 'N', 'O', 'O', 'O'): 'AgNO3 (Perak Nitrat)',
    ('N', 'Na', 'O', 'O', 'O'): 'NaNO3 (Natrium Nitrat)',
    ('K', 'N', 'O', 'O', 'O'): 'KNO3 (Kalium Nitrat)',
    ('N', 'N', 'O', 'O', 'O', 'O', 'O', 'O', 'Pb'): 'Pb(NO3)2 (Timbal(II) Nitrat)',
    ('Ag', 'Cl'): 'AgCl (Endapan Perak Klorida)',
    ('I', 'I', 'Pb'): 'PbI2 (Endapan Kuning Timbal Iodida)',
    ('Na', 'Na', 'O', 'O', 'O', 'O', 'S'): 'Na2SO4 (Natrium Sulfat)',
    ('K', 'K', 'O', 'O', 'O', 'O', 'S'): 'K2SO4 (Kalium Sulfat)',
    ('Cl', 'Cl', 'Zn'): 'ZnCl2 (Seng Klorida)',
    ('Cl', 'Cl', 'Fe'): 'FeCl2 (Besi(II) Klorida)'
}

COMPLEX_REACTIONS = {
    frozenset(['HCl (Asam Klorida)', 'NaOH (Natrium Hidroksida)']): ['NaCl (Garam Dapur)', 'H2O (Air)'],
    frozenset(['HCl (Asam Klorida)', 'KOH (Kalium Hidroksida)']): ['KCl (Kalium Klorida)', 'H2O (Air)'],
    frozenset(['HNO3 (Asam Nitrat)', 'NaOH (Natrium Hidroksida)']): ['NaNO3 (Natrium Nitrat)', 'H2O (Air)'],
    frozenset(['H2SO4 (Asam Sulfat)', 'NaOH (Natrium Hidroksida)']): ['Na2SO4 (Natrium Sulfat)', 'H2O (Air)'],
    frozenset(['Mg', 'HCl (Asam Klorida)']): ['MgCl2 (Magnesium Klorida)', 'H2 (Gas Hidrogen)'],
    frozenset(['Zn', 'HCl (Asam Klorida)']): ['ZnCl2 (Seng Klorida)', 'H2 (Gas Hidrogen)'],
    frozenset(['Fe', 'HCl (Asam Klorida)']): ['FeCl2 (Besi(II) Klorida)', 'H2 (Gas Hidrogen)'],
    frozenset(['AgNO3 (Perak Nitrat)', 'NaCl (Garam Dapur)']): ['AgCl (Endapan Perak Klorida)', 'NaNO3 (Natrium Nitrat)'],
    frozenset(['Pb(NO3)2 (Timbal(II) Nitrat)', 'KI (Kalium Iodida)']): ['PbI2 (Endapan Kuning Timbal Iodida)', 'KNO3 (Kalium Nitrat)'],
    frozenset(['CH4 (Gas Metana)', 'O2 (Gas Oksigen)']): ['CO2 (Karbon Dioksida)', 'H2O (Air)', 'H2O (Air)'],
}

def setup_database():
    db_path = 'chemistry.db'
    if os.path.exists(db_path):
        os.remove(db_path)
        
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Buat tabel Molecules
    c.execute('''
        CREATE TABLE Molecules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            atoms_csv TEXT NOT NULL UNIQUE,
            label TEXT NOT NULL
        )
    ''')
    
    # Buat tabel Reactions
    c.execute('''
        CREATE TABLE Reactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reactant1 TEXT NOT NULL,
            reactant2 TEXT NOT NULL,
            products_csv TEXT NOT NULL
        )
    ''')
    
    # Insert Molecules
    for atoms, label in KNOWN_MOLECULES.items():
        atoms_str = ",".join(atoms)
        c.execute('INSERT INTO Molecules (atoms_csv, label) VALUES (?, ?)', (atoms_str, label))
        
    # Insert Reactions
    for reactants, products in COMPLEX_REACTIONS.items():
        r_list = sorted(list(reactants))
        r1 = r_list[0]
        r2 = r_list[1] if len(r_list) > 1 else r_list[0]
        p_str = ",".join(products)
        c.execute('INSERT INTO Reactions (reactant1, reactant2, products_csv) VALUES (?, ?, ?)', (r1, r2, p_str))
        
    conn.commit()
    conn.close()
    print("Database chemistry.db berhasil diinisialisasi dan diisi!")

if __name__ == "__main__":
    setup_database()
