import json

with open('tools/audit_report.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

for i, x in enumerate(d['imbalanced']):
    print(f"--- #{i+1} (Index {x['index']}) ---")
    print(f"Reactants: {x['r1']} + {x['r2']}")
    print(f"Products : {' + '.join(x['products'])}")
    print(f"Reactant atoms: {x['react_atoms']}")
    print(f"Product atoms : {x['prod_atoms']}")
    if x['gain']:
        print(f"UNREALISTIC GAIN (spawned from void): {x['gain']}")
    if x['loss']:
        print(f"UNREALISTIC LOSS (vanished into void): {x['loss']}")
    print()
