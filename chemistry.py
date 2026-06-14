import sys
import subprocess

# Fitur Auto-Install Library Kimia (Mendeleev)
try:
    from mendeleev import element
except ImportError:
    import tkinter as tk
    from tkinter import messagebox
    
    # Munculkan info bahwa library sedang diinstal (opsional)
    print("Library 'mendeleev' (database kimia) belum ditemukan. Memulai proses instalasi otomatis...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "mendeleev"])
        from mendeleev import element
        print("Instalasi berhasil!")
    except Exception as e:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("Error Instalasi", f"Gagal menginstal library kimia.\nPastikan Anda memiliki koneksi internet.\nError: {e}")
        sys.exit(1)

_ATOM_CACHE = {}

def get_atom_data(symbol):
    """
    Fungsi caching: Jika data atom sudah pernah diambil dari database Mendeleev,
    gunakan data yang tersimpan di memori (cache) alih-alih melakukan query ulang.
    Ini menghilangkan lag I/O secara total.
    """
    if symbol not in _ATOM_CACHE:
        _ATOM_CACHE[symbol] = AtomData(symbol)
    return _ATOM_CACHE[symbol]

class AtomData:
    def __init__(self, symbol):
        self.el = element(symbol)
        self.symbol = self.el.symbol
        self.name = self.el.name
        self.atomic_number = self.el.atomic_number
        self.mass = self.el.atomic_weight
        self.group = self.el.group_id
        
        self.charge = self._determine_charge()
        self.color = self._determine_color()
        
        # Ekstrak titik didih & lebur (dalam Kelvin -> Celcius)
        mp_k = self.el.melting_point
        bp_k = self.el.boiling_point
        self.mp = (mp_k - 273.15) if mp_k is not None else 0.0
        self.bp = (bp_k - 273.15) if bp_k is not None else 100.0

    def _determine_charge(self):
        # Penentuan muatan sederhana berdasarkan golongan (Group)
        if self.group == 1: return 1
        if self.group == 2: return 2
        if self.group == 13: return 3
        if self.group == 15: return -3
        if self.group == 16: return -2
        if self.group == 17: return -1
        if self.group == 18: return 0
        return 0 # Default untuk logam transisi

    def _determine_color(self):
        # Pewarnaan CPK (Corey-Pauling-Koltun) sederhana
        colors = {
            'H': 'white', 'C': 'gray', 'N': 'blue', 'O': 'red',
            'F': 'green', 'Cl': 'green', 'Br': 'darkred', 'I': 'purple',
            'He': 'cyan', 'Ne': 'cyan', 'Ar': 'cyan', 'Kr': 'cyan', 'Xe': 'cyan',
            'S': 'yellow', 'P': 'orange', 'Na': 'purple', 'K': 'purple',
            'Ca': 'darkgray', 'Mg': 'darkgray', 'Fe': 'orange'
        }
        return colors.get(self.symbol, '#a8a8a8') # Default abu-abu terang

import sqlite3
import os

KNOWN_MOLECULES = {}
COMPLEX_REACTIONS = {}
MOLECULE_THERMO_BY_LABEL = {}
MOLECULE_ATOMS_BY_LABEL = {}

def load_database():
    """Memuat data dari SQLite ke dalam memori secara instan"""
    global KNOWN_MOLECULES, COMPLEX_REACTIONS, MOLECULE_THERMO_BY_LABEL
    db_path = os.path.join(os.path.dirname(__file__), 'chemistry.db')
    
    if not os.path.exists(db_path):
        print("Peringatan: chemistry.db tidak ditemukan. Menjalankan fallback kosong.")
        return
        
    try:
        conn = sqlite3.connect(db_path)
        conn.execute('PRAGMA foreign_keys = ON;')
        c = conn.cursor()
        
        # Load Molecules dengan JOIN
        c.execute("SELECT id, label, melting_point, boiling_point FROM Molecules")
        mols = c.fetchall()
        
        mol_label_map = {}
        for row in mols:
            mol_id, label, mp, bp = row
            
            # Rekonstruksi atoms_csv
            c.execute("SELECT atom_symbol, atom_count FROM MoleculeAtoms WHERE molecule_id=?", (mol_id,))
            atom_list = []
            for sym, count in c.fetchall():
                atom_list.extend([sym] * count)
            
            atoms_tuple = tuple(atom_list)
            KNOWN_MOLECULES[atoms_tuple] = label
            MOLECULE_THERMO_BY_LABEL[label] = {'mp': mp, 'bp': bp}
            MOLECULE_ATOMS_BY_LABEL[label] = atoms_tuple
            mol_label_map[mol_id] = label
            
        # Load Reactions dengan Stoikiometri
        c.execute("SELECT id, min_temp FROM Reactions")
        for rx_id, min_temp in c.fetchall():
            c.execute("SELECT molecule_id, coefficient FROM ReactionReactants WHERE reaction_id=?", (rx_id,))
            reactants = c.fetchall()
            if len(reactants) < 2: continue
            
            r1 = mol_label_map.get(reactants[0][0])
            r2 = mol_label_map.get(reactants[1][0])
            if not r1 or not r2: continue
            
            c.execute("SELECT product_id FROM ReactionProducts WHERE reaction_id=?", (rx_id,))
            products = [mol_label_map.get(pid[0]) for pid in c.fetchall() if mol_label_map.get(pid[0])]
            
            sorted_r = tuple(sorted([r1, r2]))
            COMPLEX_REACTIONS[sorted_r] = {
                'products': products,
                'min_temp': min_temp
            }
            
    except Exception as e:
        print("Gagal memuat database:", e)

# Load isi database langsung saat aplikasi (module) diimport
load_database()

def check_complex_reaction(reactants_list, current_temp):
    sorted_reactants = tuple(sorted(reactants_list))
    reaction_data = COMPLEX_REACTIONS.get(sorted_reactants)
    if reaction_data and current_temp >= reaction_data['min_temp']:
        return reaction_data['products']
    return None

def get_molecule_thermo(label):
    return MOLECULE_THERMO_BY_LABEL.get(label, {'mp': 0.0, 'bp': 100.0})

def get_molecule_atoms(label):
    """Mengambil susunan atom asli dari database untuk menghindari bug 'Atom Hantu'"""
    atom_symbols = MOLECULE_ATOMS_BY_LABEL.get(label)
    if atom_symbols:
        return [get_atom_data(sym) for sym in atom_symbols]
    return [get_atom_data("C")] # Fallback aman

def can_bond(atoms_list, current_temp=0):
    """
    Mengecek apakah daftar atom ini bisa bersatu menjadi senyawa.
    """
    symbols = sorted([a.symbol for a in atoms_list])
    
    # Cek di kamus molekul terkenal
    if tuple(symbols) in KNOWN_MOLECULES:
        mol = KNOWN_MOLECULES[tuple(symbols)]
        
        # Syarat Suhu Aktivasi (Energi Aktivasi)
        activation_energy = {
            "H2O (Air)": 300,
            "H2O2 (Hidrogen Peroksida)": 150,
            "CO2 (Karbon Dioksida)": 400
        }
        
        for k, v in activation_energy.items():
            if k in mol and current_temp < v:
                return None # Suhu belum cukup untuk memicu ikatan
                
        return mol
    
    # Cek kombinasi ion biner sederhana (Cation + Anion = Netral)
    # Misal: Mg (+2) + O (-2) -> MgO
    if len(atoms_list) == 2:
        c1, c2 = atoms_list[0].charge, atoms_list[1].charge
        if c1 != 0 and c2 != 0 and c1 + c2 == 0:
            # Tampilkan Kation dulu baru Anion
            if c1 > 0:
                return f"{atoms_list[0].symbol}{atoms_list[1].symbol}"
            else:
                return f"{atoms_list[1].symbol}{atoms_list[0].symbol}"
            
    return None
