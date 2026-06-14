import sqlite3
import urllib.request
import json
import time
import re
import urllib.parse

def extract_value(text, pattern):
    match = re.search(pattern, text, re.IGNORECASE)
    if match: return float(match.group(1))
    return None

def fetch_property(cid, prop, regex_pattern):
    prop_encoded = urllib.parse.quote(prop)
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/{cid}/JSON?heading={prop_encoded}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                for sect1 in data.get('Record', {}).get('Section', []):
                    if sect1.get('TOCHeading') == 'Chemical and Physical Properties':
                        for sect2 in sect1.get('Section', []):
                            if sect2.get('TOCHeading') == 'Experimental Properties':
                                for sect3 in sect2.get('Section', []):
                                    if sect3.get('TOCHeading') == prop:
                                        for info in sect3.get('Information', []):
                                            val = info.get('Value', {}).get('StringWithMarkup', [])
                                            if val:
                                                text = val[0]['String']
                                                parsed = extract_value(text, regex_pattern)
                                                if parsed is not None:
                                                    return parsed
    except Exception:
        pass
    return None

def run_advanced_fetch():
    print("Mulai mengambil data termodinamika lanjutan dari PubChem (Estimasi: 10-15 menit)...")
    conn = sqlite3.connect('chemistry.db')
    c = conn.cursor()

    c.execute("SELECT id, label FROM Molecules WHERE density IS NULL OR heat_capacity IS NULL")
    rows = c.fetchall()

    count = 0
    for mol_id, label in rows:
        formula = label.split(" ")[0]
        
        try:
            req_cid = urllib.request.Request(f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{formula}/cids/JSON", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req_cid, timeout=5) as response_cid:
                if response_cid.status == 200:
                    data_cid = json.loads(response_cid.read().decode())
                    cid = data_cid['IdentifierList']['CID'][0]
                    
                    # Regex untuk mengekstrak angka
                    dens = fetch_property(cid, 'Density', r'(\d+\.?\d*)\s*(?:g/cm|g/mL|g/L)')
                    time.sleep(0.2)
                    hc = fetch_property(cid, 'Heat Capacity', r'(\d+\.?\d*)\s*(?:J/|cal/|J·|cal·)')
                    time.sleep(0.2)
                    hf = fetch_property(cid, 'Heat of Formation', r'(-?\d+\.?\d*)\s*(?:kJ/mol|kcal/mol)')
                    time.sleep(0.2)
                    
                    if dens or hc or hf:
                        c.execute("UPDATE Molecules SET density=COALESCE(?, density), heat_capacity=COALESCE(?, heat_capacity), enthalpy_formation=COALESCE(?, enthalpy_formation) WHERE id=?", 
                                  (dens, hc, hf, mol_id))
                        conn.commit()
                        count += 1
                        print(f"[{count}] {formula} -> Dens: {dens}, HC: {hc}, Hf: {hf}")
                        
        except Exception:
            time.sleep(0.5)
            pass

    conn.close()
    print(f"Selesai! {count} molekul berhasil diperbarui dengan data termodinamika PubChem.")

if __name__ == '__main__':
    run_advanced_fetch()
