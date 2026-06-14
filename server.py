from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_data():
    conn = sqlite3.connect('chemistry.db')
    c = conn.cursor()
    
    c.execute("SELECT label, atoms_csv, melting_point, boiling_point FROM Molecules")
    molecules = []
    for row in c.fetchall():
        molecules.append({
            "label": row[0],
            "atoms_csv": row[1],
            "mp": row[2],
            "bp": row[3]
        })
        
    c.execute("SELECT reactant1, reactant2, products_csv, min_temp FROM Reactions")
    reactions = []
    for row in c.fetchall():
        reactions.append({
            "r1": row[0],
            "r2": row[1],
            "products": row[2],
            "min_temp": row[3]
        })
        
    conn.close()
    
    # Generate PERIODIC_TABLE data dynamically from the DB
    from chemistry import get_atom_data
    c = sqlite3.connect('chemistry.db').cursor()
    c.execute("SELECT atoms_csv FROM Molecules")
    atoms_set = set()
    for row in c.fetchall():
        atoms_set.update(row[0].split(","))
    
    periodic_symbols = sorted(list(atoms_set))
    # Selalu pastikan elemen dasar ada meskipun belum terpakai di DB
    base_symbols = {"H", "C", "N", "O", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "K", "Ca", "Fe", "Cu", "Zn", "Ag", "I", "Pb"}
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
                "charge": adata.charge
            })
        except Exception:
            pass

    return {
        "molecules": molecules, 
        "reactions": reactions, 
        "periodic_table": periodic_table
    }

@app.get("/api/data")
def read_data():
    return get_db_data()

# Pastikan folder static ada
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def index():
    return FileResponse("static/index.html")

if __name__ == "__main__":
    print("Server berjalan di http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)
