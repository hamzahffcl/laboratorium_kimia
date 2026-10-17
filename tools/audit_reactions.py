import json
from collections import Counter

def audit():
    with open('static/data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    molecules = {m['label']: m for m in data.get('molecules', [])}
    periodic_table = {e['symbol']: e for e in data.get('periodic_table', [])}

    def get_atoms(species_name):
        # 1. Check if it's a known molecule
        if species_name in molecules:
            csv = molecules[species_name].get('atoms_csv', '')
            if csv:
                return Counter([a.strip() for a in csv.split(',') if a.strip()])
        # 2. Check if it's an element symbol
        if species_name in periodic_table:
            return Counter([species_name])
        # 3. Check if species_name is formatted like "H (Hidrogen)" or bare symbol
        for sym in periodic_table:
            if species_name == sym or species_name.startswith(sym + " "):
                return Counter([sym])
        return None

    reactions = data.get('reactions', [])
    print(f"Total reactions to audit: {len(reactions)}")

    imbalanced = []
    unknown_species = []
    suspicious_combos = []

    for idx, rxn in enumerate(reactions):
        r1 = rxn.get('r1', '')
        r2 = rxn.get('r2', '')
        products = rxn.get('products', [])

        a1 = get_atoms(r1)
        a2 = get_atoms(r2)

        if a1 is None:
            unknown_species.append((idx, 'r1', r1))
        if a2 is None:
            unknown_species.append((idx, 'r2', r2))

        prod_atoms = Counter()
        prod_unknown = False
        for p in products:
            ap = get_atoms(p)
            if ap is None:
                unknown_species.append((idx, 'product', p))
                prod_unknown = True
            else:
                prod_atoms.update(ap)

        if a1 is not None and a2 is not None and not prod_unknown:
            react_atoms = Counter()
            react_atoms.update(a1)
            react_atoms.update(a2)

            if react_atoms != prod_atoms:
                diff_gain = prod_atoms - react_atoms # atoms created from nothing
                diff_loss = react_atoms - prod_atoms # atoms vanished into void
                imbalanced.append({
                    'index': idx,
                    'r1': r1,
                    'r2': r2,
                    'products': products,
                    'react_atoms': dict(react_atoms),
                    'prod_atoms': dict(prod_atoms),
                    'gain': dict(diff_gain),
                    'loss': dict(diff_loss)
                })

    print(f"Unknown species: {len(unknown_species)}")
    for u in unknown_species[:20]:
        print(f"  Rxn {u[0]} [{u[1]}]: {u[2]}")

    print(f"\nTotal Imbalanced reactions (Atoms in != Atoms out): {len(imbalanced)}")
    
    # Save detailed report to json
    report = {
        'total_reactions': len(reactions),
        'unknown_species': unknown_species,
        'imbalanced_count': len(imbalanced),
        'imbalanced': imbalanced
    }
    with open('tools/audit_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print("Report written to tools/audit_report.json")

if __name__ == '__main__':
    audit()
