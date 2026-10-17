"""Membuat seed_elements.sql (118 unsur) dari paket `periodictable`.
pip install periodictable ; python seed_elements.py"""
import periodictable as pt
def cat(z):
    if z in (1,6,7,8,15,16,34): return "nonmetal"
    if z in (2,10,18,36,54,86,118): return "noble_gas"
    if z in (9,17,35,53,85,117): return "halogen"
    if z in (3,11,19,37,55,87): return "alkali_metal"
    if z in (4,12,20,38,56,88): return "alkaline_earth"
    if z in (5,14,32,33,51,52,84): return "metalloid"
    if z in (13,31,49,50,81,82,83,113,114,115,116): return "post_transition"
    if 57<=z<=71: return "lanthanide"
    if 89<=z<=103: return "actinide"
    return "transition_metal"
VAL={1:1,6:4,7:3,8:2,9:1,15:3,16:2,17:1}
rows=[]
for z in range(1,119):
    e=pt.elements[z]; m=e.mass or 0
    rows.append(f"({z},'{e.symbol}','{e.name.capitalize()}',{m:.4f},'{cat(z)}',{VAL.get(z,'NULL')})")
open("seed_elements.sql","w").write("INSERT INTO Elements(atomic_number,symbol,name,atomic_mass,category,valence) VALUES\n"+",\n".join(rows)+";\n")
print(len(rows),"unsur ditulis")
