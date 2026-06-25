const fs = require('fs');
let code = fs.readFileSync('static/quest.js', 'utf8');
const hints = {
    'Q1': 'Hidrogen dan Klorin adalah gas diatomik, yang berarti mereka selalu berpasangan di alam bebas. Keluarkan dua atom H, lalu dekatkan mereka sampai menempel!',
    'Q2': 'Coba jatuhkan atom Hidrogen (H) dan atom Klorin (Cl) secara bersamaan. Di dunia nyata, Asam Klorida adalah komponen utama cairan asam di dalam lambung kita lho!',
    'Q3': 'Air terdiri dari 2 atom Hidrogen dan 1 atom Oksigen. Tapi ingat, oksigen yang kamu punya berwujud gas O2 (dua oksigen menempel). Tabrakkan Hidrogen ke Oksigen!',
    'Q4': 'Natrium (Na) sangat reaktif. Tabrakkan Natrium dengan Oksigen dan Hidrogen untuk membuat senyawa basa yang sangat kuat ini.',
    'Q5': 'Asam (HCl) dan Basa (NaOH) jika bertemu akan saling menetralkan, membuang air, dan menyisakan garam murni.',
    'Q7': 'Amonia butuh 1 atom Nitrogen (N) dan 3 atom Hidrogen (H). Tarik mereka semua ke area tengah kanvas.',
    'Q10': 'Perak (Ag) dan Klorin (Cl) akan langsung bereaksi saat bersentuhan, membentuk endapan garam perak putih.',
    'Q12': 'Pembakaran selalu melibatkan Oksigen. Gabungkan atom Karbon (C) dari pensilmu dengan Gas Oksigen (O2) di udara.',
    'Q13': 'Proses karat tidak bisa terjadi tanpa Air! Pertama, buat Besi (Fe) bersentuhan dengan Oksigen (O2) dan Oksigen tunggal. Lalu, teteskan Air (H2O) di dekat mereka untuk menjadi katalisator pengantar elektron yang mempercepat karat!',
    'Q14': 'Asam Sulfat (H2SO4) butuh 2 Hidrogen, 1 Sulfur, dan 4 Oksigen. Gabungkan perlahan!',
    'Q16': 'Metana (CH4) adalah komponen utama gas alam. Satu atom Karbon bisa memegang maksimal empat atom Hidrogen.',
    'Q17': 'Ozon adalah O3. Coba tabrakkan Gas Oksigen (O2) dengan satu atom Oksigen tunggal (O).',
    'Q19': 'Coba jatuhkan molekul Amonia (NH3) dan Asam Klorida (HCl). Keduanya akan bereaksi di udara membentuk partikel garam padat!',
    'Q20': 'Hidrogen Peroksida (H2O2) mirip dengan Air (H2O), tapi kelebihan satu Oksigen. Tabrakkan Air dengan Oksigen tambahan!',
    'Q24': 'Belerang (S) ada di tengah, dikelilingi oleh enam Fluorin (F). Ini butuh ketelatenan ekstra.'
};

for (let id in hints) {
    let regex = new RegExp('(id:\\s*"' + id + '"[\\s\\S]*?educationalText:\\s*".*?")');
    code = code.replace(regex, '$1,\n            hint: "' + hints[id] + '"');
}

let qRegex = /(id:\s*"(?!Q1"|Q2"|Q3"|Q4"|Q5"|Q7"|Q10"|Q12"|Q13"|Q14"|Q16"|Q17"|Q19"|Q20"|Q24")[^"]*"[\s\S]*?educationalText:\s*".*?")/g;
code = code.replace(qRegex, '$1,\n            hint: "Lihat rumus kimianya di target misi, lalu tarik elemen-elemen yang dibutuhkan dari laci (tombol Tambah) dan tabrakkan semuanya!"');

fs.writeFileSync('static/quest.js', code);
console.log('Hints added successfully');
