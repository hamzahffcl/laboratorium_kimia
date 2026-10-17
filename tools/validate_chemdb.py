"""Validasi database v3.  Pakai: python3 validate_chemdb.py chemistry_v3.db
Exit code 1 jika ada galat."""
import sqlite3, sys, re, math
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
db = sqlite3.connect(sys.argv[1] if len(sys.argv) > 1 else "chemistry_v3.db")
db.execute("PRAGMA foreign_keys=ON")
errors = 0
def report(title, rows):
    global errors
    if rows:
        errors += len(rows); print(f"[GALAT] {title}: {len(rows)}")
        for r in rows[:10]: print("   ", r)
    else: print(f"[OK]    {title}")

report("foreign key", db.execute("PRAGMA foreign_key_check").fetchall())
for v in ["atom_balance","charge_balance","mass_balance","molar_mass",
          "incomplete_reaction","molecule_without_atoms"]:
    report(v, db.execute(f"SELECT * FROM v_check_{v}").fetchall())

# Rumus label harus sama dengan MoleculeAtoms (menangkap typo seperti 'H8')
def parse(f):
    def grp(s, i=0):
        out = {}
        while i < len(s):
            if s[i] == "(":
                inner, i = grp(s, i + 1); i += 1
                m = re.match(r"\d+", s[i:]); k = int(m.group()) if m else 1
                if m: i += len(m.group())
                for a, n in inner.items(): out[a] = out.get(a, 0) + n * k
            elif s[i] == ")": return out, i
            else:
                m = re.match(r"([A-Z][a-z]?)(\d*)", s[i:])
                if not m: raise ValueError
                out[m.group(1)] = out.get(m.group(1), 0) + int(m.group(2) or 1); i += len(m.group())
        return out, i
    return grp(f)[0]
bad = []
for mid, label in db.execute("SELECT id,label FROM Molecules"):
    core = re.sub(r"[+\-−]\d*$|\^.*$", "", label)
    try: want = parse(core)
    except Exception: continue            # label non-rumus (mis. nama): lewati
    have = dict(db.execute("SELECT atom_symbol,atom_count FROM MoleculeAtoms WHERE molecule_id=?", (mid,)))
    if want != have: bad.append((label, want, have))
report("label vs MoleculeAtoms", bad)

# Titik didih dinamis (Clausius-Clapeyron) tidak boleh <= titik leleh pada 0.1-100 atm
R = 8.314; bad = []
for label, mp, bp, hv in db.execute("SELECT label,melting_point_c,boiling_point_c,hvap_kj_mol FROM Molecules WHERE boiling_point_c IS NOT NULL"):
    Tr = bp + 273.15; H = (hv * 1000) if hv else 88.0 * Tr
    for P in (0.1, 1, 10, 100):
        inv = 1 / Tr - (R / H) * math.log(P)
        T = (1 / inv - 273.15) if inv > 0 else float("inf")
        if mp is not None and T <= mp: bad.append((label, P, round(T, 1), mp))
report("bp dinamis <= mp (rentang cair hilang)", bad)

# ΔH tersimpan vs hitungan dari ΔHf (selisih > 15 kJ = curiga)
rows = db.execute("SELECT reaction_id,dh_manual,dh_computed FROM v_reaction_dh WHERE dh_manual IS NOT NULL AND dh_computed IS NOT NULL AND ABS(dh_manual-dh_computed)>15").fetchall()
report("ΔH manual vs hitungan ΔHf", rows)
print("\nTOTAL GALAT:", errors); sys.exit(1 if errors else 0)
