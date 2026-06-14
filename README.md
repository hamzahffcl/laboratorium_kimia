# 🧪 Laboratorium Fisika Kimia 2D (Chemistry Sandbox)

**Laboratorium Fisika Kimia 2D** adalah simulator edukasi interaktif berbasis web (*sandbox environment*) yang dirancang khusus untuk memvisualisasikan dinamika molekuler, termodinamika, dan kinetika reaksi kimia. Dikembangkan dengan standar arsitektur data akademik, simulator ini memungkinkan pelajar, pendidik, maupun peneliti untuk melakukan eksperimen reaksi kimia secara aman, *real-time*, dan akurat secara saintifik di dalam kanvas spasial 2D.

> **Diciptakan oleh:** umjhamzel

---

## 🌟 Keunggulan & Arsitektur Saintifik

Simulator ini tidak menggunakan reaksi terprogram (*hard-coded*) sederhana. Di balik visualnya, sistem ini ditenagai oleh kombinasi *Physics Engine* berkinerja tinggi dan *Database Relasional* berstandar akademik murni:

### 🔬 Kinetika dan Termodinamika Tingkat Lanjut
*   **Persamaan Arrhenius & Probabilitas Stokastik:** Probabilitas terjadinya sebuah reaksi kimia dihitung menggunakan persamaan eksponensial Arrhenius yang melibatkan *Activation Energy* (Suhu Minimum) dan dipadukan dengan *Steric Factor* (probabilitas orientasi tumbukan spesifik untuk Ikatan Ionik vs Kovalen).
*   **Umpan Balik Termal ($\Delta H$):** Reaksi eksotermik memicu pelepasan panas secara *real-time* ke dalam *environment*, menciptakan fluktuasi suhu global reaktor yang terlihat secara visual.
*   **Indikator pH Molaritas (*Auto-Dilution*):** Deteksi keasaman dan kebasaan secara kuantitatif. Mesin pH menghitung konsentrasi $H^+$ absolut berdasarkan konstanta ionisasi senyawa (pKa) terhadap volume pelarut (skala dimensi kanvas).

### ⚙️ Fisika Tumbukan Spasial (*Spatial Grid Engine*)
*   Ribuan molekul dapat disimulasikan dan bertabrakan pada *frame-rate* stabil (60 FPS) menggunakan algoritma partisi ruang (*Spatial Grid*), memastikan keakuratan hukum Newton dan pelestarian momentum kinetik partikel.

### 🗄️ Database Arsitektur Relasional Murni
*   **Kekekalan Massa (Hukum Lavoisier):** Sebanyak 929 jalur reaksi berantai dan 573 entri molekul telah lolos audit stoikiometri ketat. Jumlah atom reaktan dipastikan secara matematis selalu sama dengan produk.
*   **Kalkulasi Massa & Stoikiometri Otomatis:** Berat molekul (*Molar Mass*) di-*generate* secara presisi langsung dari pustaka unsur *Mendeleev*. Skema telah mendukung fondasi stoikiometri multi-reaktan dengan menggunakan model tabel pemetaan *Foreign Key* (tanpa redundansi data teks).
*   **Akurasi Transisi Fase:** Hukum fisika mutlak ditegakkan di mana tidak ada materi yang dapat mendidih (*Boiling Point*) sebelum meleleh (*Melting Point*), dengan pengecualian kasus sublimasi murni seperti $SF_6$.

---

## 🚀 Panduan Instalasi & Eksekusi

Laboratorium Kimia ini diproses 100% pada antarmuka *client* (Browser) sehingga tidak membutuhkan pengaturan server *backend* yang rumit untuk dijalankan.

1.  **Kloning Repositori:**
    ```bash
    git clone https://github.com/hamzahffcl/laboratorium_kimia.git
    cd laboratorium_kimia
    ```
2.  **Jalankan Simulator:**
    Cukup buka berkas `index.html` menggunakan peramban web modern apa saja (Google Chrome, Microsoft Edge, Mozilla Firefox, atau Safari).
3.  **Pengembangan & Modifikasi (*Opsional*):**
    Jika Anda berniat melakukan modifikasi saintifik pada `chemistry.db`, Anda wajib memiliki Python terinstal di sistem Anda dan menjalankan skrip adaptor setelah melakukan perubahan:
    ```bash
    python export_data.py
    ```
    *Skrip ini akan mengekstrak arsitektur relasional kompleks dan meratakannya (*flattening*) ke dalam berkas `static/data.js` tanpa merusak kompatibilitas antarmuka pengguna.*

---

## 🎮 Panduan Laboratorium (User Interface)

*   **Penyuntikan Molekul:** Masukkan rumus kimia molekul (misal: `HCl`, `NaOH`, `Fe`, `O2`) ke dalam panel kontrol dan klik **Tambah**. Partikel akan disuntikkan ke dalam kanvas virtual.
*   **Termostat Lingkungan:** Gunakan *slider* Temperatur untuk mensimulasikan lingkungan dari Nol Absolut (-273 °C) hingga 3000 °C. Amati perubahan fase wujud benda (Padat $\rightarrow$ Cair $\rightarrow$ Gas) yang dihitung secara presisi berdasarkan sifat intrinsik molekul.
*   **Pemeriksaan (*Inspection Tool*):** Klik kiri pada partikel apa pun yang sedang bergerak untuk menampilkan jendela telemetri. Jendela ini memuat klasifikasi senyawa (Organik/Anorganik, Ionik/Kovalen), wujud termal, dan rekam jejak asam-basa molekul tersebut.

---

## ⚖️ Lisensi (MIT License)

Perangkat lunak ini dirilis secara **Open-Source** di bawah [Lisensi MIT](LICENSE). 

Ditujukan sebagai sumbangsih teknologi edukasi untuk memudahkan tenaga pengajar, pelajar, dan cendekiawan mengeksplorasi ilmu kimia dalam format yang belum pernah ada sebelumnya. Anda diizinkan secara bebas untuk menggandakan, memodifikasi, dan mendistribusikan perangkat lunak ini.

> *"Science is magic that works."* — Kurt Vonnegut
