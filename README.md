# 🧪 Laboratorium Kimia Virtual

Laboratorium Kimia Virtual adalah simulasi sandbox berbasis browser yang menggabungkan physics engine 2D interaktif dengan data kimia yang akurat. Proyek ini dirancang agar pemain dapat memahami konsep kimia dan termodinamika secara intuitif — bukan dengan menghafal, melainkan dengan bereksperimen langsung.

> Tidak ada instalasi backend. Tidak ada dependensi kompleks. Cukup buka browser dan mulai reaksi.

---

## ✨ Fitur Utama

### 🔬 Sandbox Fisika Terintegrasi (Matter.js)
Gunakan mouse untuk mengambil, melempar, dan menabrakkan atom secara bebas di dalam lingkungan gravitasi-mikro. Physics engine 2D memonitor tabrakan antar atom secara real-time dan memicu reaksi kimia secara dinamis berdasarkan komposisi dan kondisi lingkungan.

### ⚛️ Database Kimia Ekstensif
- **118 Unsur**: Seluruh tabel periodik tersedia (dapat diakses penuh setelah Unlimited Mode terbuka).
- **574 Molekul Valid**: Mulai dari air (H₂O), asam kuat (H₂SO₄), senyawa beracun (HCN), hingga senyawa organik kompleks — semuanya divalidasi terhadap stoikiometri nyata dengan akurasi 99.8%.

### 🌡️ Engine Termodinamika
Reaksi tidak terjadi begitu saja. Pemain harus mengkondisikan lingkungan reaktor secara aktif:
- **Suhu** (−273°C hingga 5.000°C): Mencairkan logam, mendidihkan cairan, atau membekukan gas.
- **Tekanan** (0,1 atm hingga 100 atm): Memengaruhi kerapatan kinetik di dalam reaktor.

### 📜 Sistem Jurnal Misi (25 Quest)
Kampanye *Scientist Journal* memandu pemain dari sintesis dasar (ikatan kovalen H₂) hingga senyawa kompleks (Sulfur Hexafluoride). Setiap misi disusun secara sekuensial dan hanya dapat diselesaikan melalui eksperimentasi nyata — tidak ada jalan pintas auto-complete.

### 🏆 Pustaka Penemuan (Discovery Vault)
Setiap molekul yang berhasil diracik — baik disengaja maupun tidak — akan tersimpan otomatis di Discovery Vault. Mengumpulkan sejumlah penemuan akan membuka pencapaian (*achievements*) dan material baru untuk dieksperimentasi.

---

## 🎮 Mainkan Sekarang!

Karena *game* ini 100% *Client-Side*, Anda dan pemain lainnya **tidak perlu menginstal apa pun** atau mengunduh repositori ini. 
Anda hanya perlu mengaktifkan **GitHub Pages** di repositori ini, dan membagikan link publiknya (contoh: `https://hamzahffcl.github.io/laboratorium_kimia`) kepada siapapun!

---

## 🚀 Cara Menjalankan (Bagi Developer / Kontributor)

Jika Anda adalah seorang programmer yang ingin mengunduh (*clone*) kode ini untuk dimodifikasi atau dikembangkan di komputer Anda sendiri (*localhost*):

```bash
# 1. Clone repositori
git clone https://github.com/hamzahffcl/laboratorium_kimia.git
cd laboratorium_kimia

# 2. Jalankan local server (wajib agar file eksternal .js bisa dimuat oleh browser)
python -m http.server 8080

# 3. Buka di browser
# http://localhost:8080
```

> **Catatan:** Langkah *Localhost* di atas HANYA untuk *developer*. Pemain biasa cukup menggunakan link GitHub Pages untuk bermain.

---

## 🎮 Cara Bermain

1. **Spawn Atom** — Buka panel *Pilih Atom* dan klik elemen yang ingin dimunculkan ke dalam kanvas reaktor.
2. **Tabrakan** — Ambil atom dengan kursor dan benturkan satu sama lain.
3. **Perhatikan Kondisi Lingkungan** — Pastikan suhu dan tekanan reaktor sesuai sebelum reaksi dapat terjadi.
4. **Ikuti Jurnal Misi** — Klik `[+] Buka Jurnal Misi` untuk membaca petunjuk ilmiah dan mengetahui senyawa apa yang perlu disintesis selanjutnya.
5. **Buka Unlimited Mode** — Selesaikan seluruh 25 misi untuk membuka akses penuh ke semua 118 unsur.

---

## 🛠️ Stack Teknologi

| Teknologi | Peran |
|-----------|-------|
| **HTML5 Canvas** | Rendering engine utama |
| **Vanilla JavaScript** | Logika reaktor, quest engine, dan sistem penemuan |
| **Matter.js** | Physics engine 2D — kalkulasi tumbukan elastis dan gravitasi-mikro |
| **CSS3 Vanilla** | Antarmuka Glassmorphism dengan tema gelap (jurnal mengambang, panel reaktor) |

---

## 📁 Struktur Proyek

```text
laboratorium_kimia/
├── index.html
└── static/
    ├── app.js       # Logika reaktor fisika dan termodinamika
    ├── data.js      # Database 118 unsur dan 574 molekul
    ├── quest.js     # Sistem jurnal misi
    └── style.css    # Gaya UI Glassmorphism
```

---

## 📄 Lisensi

[Non-Commercial License](LICENSE) — bebas digunakan untuk pendidikan dan penelitian, namun dilarang keras untuk komersialisasi.
