import sqlite3
import urllib.request
import json
import time
import re
import urllib.parse

def extract_celsius(text):
    match = re.search(r'(-?\d+\.?\d*)\s*(?:-|to)?\s*(?:-?\d+\.?\d*)?\s*(?:deg|°)?\s*[cC]', text)
    if match: return float(match.group(1))
    
    match_f = re.search(r'(-?\d+\.?\d*)\s*(?:-|to)?\s*(?:-?\d+\.?\d*)?\s*(?:deg|°)?\s*[fF]', text)
    if match_f: return (float(match_f.group(1)) - 32) * 5.0/9.0
    
    match_k = re.search(r'(-?\d+\.?\d*)\s*(?:-|to)?\s*(?:-?\d+\.?\d*)?\s*[kK]', text)
    if match_k: return float(match_k.group(1)) - 273.15
    return None

def fetch_property(cid, prop):
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
                                                val_c = extract_celsius(val[0]['String'])
                                                if val_c is not None:
                                                    return val_c
    except Exception:
        pass
    return None

def run_fetch():
    print("Mulai sinkronisasi data dengan server PubChem...")
    conn = sqlite3.connect('chemistry.db')
    c = conn.cursor()

    c.execute("SELECT rowid, label, atoms_csv, melting_point, boiling_point FROM Molecules")
    rows = c.fetchall()

    count = 0
    total = 0
    for rowid, label, atoms_csv, cur_mp, cur_bp in rows:
        formula = label.split(" ")[0]
        c_count = atoms_csv.split(",").count('C')
        
        if c_count > 15:
            continue
            
        try:
            req_cid = urllib.request.Request(f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{formula}/cids/JSON", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req_cid, timeout=5) as response_cid:
                if response_cid.status == 200:
                    data_cid = json.loads(response_cid.read().decode())
                    cid = data_cid['IdentifierList']['CID'][0]
                    
                    mp = fetch_property(cid, 'Melting Point')
                    time.sleep(0.2)
                    bp = fetch_property(cid, 'Boiling Point')
                    time.sleep(0.2)
                    
                    if mp is not None or bp is not None:
                        final_mp = mp if mp is not None else cur_mp
                        final_bp = bp if bp is not None else cur_bp
                        
                        c.execute("UPDATE Molecules SET melting_point=?, boiling_point=? WHERE rowid=?", (final_mp, final_bp, rowid))
                        count += 1
                        print(f"Data tersimpan di DB: {formula} -> MP: {final_mp:.1f}°C, BP: {final_bp:.1f}°C")
                        
                        if count % 5 == 0:
                            conn.commit()
            total += 1
            if total >= 50:
                break
        except Exception:
            time.sleep(1)
            pass

    conn.commit()
    conn.close()
    print(f"Sinkronisasi selesai! {count} molekul berhasil diperbarui datanya dari PubChem.")

if __name__ == '__main__':
    run_fetch()
