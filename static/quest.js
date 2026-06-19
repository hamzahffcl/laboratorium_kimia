// === QUEST & PROGRESSION ENGINE === //

window.QuestEngine = {
    // State Game Utama
    state: {
        unlockedAtoms: ['H', 'Cl'], // Atom awal
        discoveredMolecules: [], // Molekul yang pernah berhasil diciptakan
        completedQuests: [], // ID misi yang sudah selesai
        unlockedAchievements: [] // Easter Eggs
    },

    // Definisi Misi
    quests: [
        {
            id: "Q1",
            title: "Ikatan Kovalen Dasar",
            description: "Gabungkan dua atom yang sama untuk membentuk molekul gas sederhana. Coba buat gas Hidrogen atau gas Klorin.",
            target: ["H2 (Gas Hidrogen)", "Cl2 (Gas Klorin)"],
            rewardText: "Unsur Karbon (C) Terbuka.",
            rewardAtoms: ["C"],
            educationalText: "Gas Hidrogen (H2) dan Klorin (Cl2) terbentuk karena dua atom saling meminjamkan elektron. Ikatan ini dinamakan ikatan kovalen, yang membuat molekul menjadi sangat stabil di alam."
        },
        {
            id: "Q2",
            title: "Sintesis Asam Kuat",
            description: "Asam klorida adalah salah satu asam paling umum di lab kimia. Coba buat dengan mencampurkan Hidrogen dan Klorin.",
            target: "HCl (Asam Klorida)",
            rewardText: "Unsur Oksigen (O) Terbuka.",
            rewardAtoms: ["O", "O2 (Gas Oksigen)"],
            educationalText: "Asam Klorida (HCl) adalah contoh asam kuat. Sifat asam berarti ia sangat mudah melepaskan ion H+ di dalam larutan, sehingga terasa asam dan bisa menyebabkan korosi."
        },
        {
            id: "Q3",
            title: "Molekul Air",
            description: "Gabungkan Hidrogen dan Oksigen untuk menciptakan zat cair paling penting bagi kehidupan di bumi.",
            target: "H2O (Air)",
            rewardText: "Unsur Natrium (Na) Terbuka.",
            rewardAtoms: ["Na"],
            educationalText: "Air (H2O) memiliki bentuk molekul yang agak bengkok. Berkat bentuk bengkok inilah air menjadi bersifat polar, membuatnya sangat ahli dalam melarutkan zat-zat lain."
        },
        {
            id: "Q4",
            title: "Senyawa Basa Kuat",
            description: "Selain asam, kita juga perlu mempelajari basa. Coba racik Natrium Hidroksida, bahan baku pembuat sabun.",
            target: "NaOH (Natrium Hidroksida)",
            rewardText: "Seng (Zn) & Belerang (S) Terbuka.",
            rewardAtoms: ["Zn", "S"],
            educationalText: "Berbeda dengan asam, Natrium Hidroksida (NaOH) adalah basa kuat. Ia sangat suka menangkap ion H+ dan memiliki tekstur yang terasa licin seperti sabun jika mengenai kulit."
        },
        {
            id: "Q5",
            title: "Reaksi Netralisasi",
            description: "Apa jadinya kalau asam kuat dan basa kuat dicampur? Reaksikan senyawa pembuat HCl dan NaOH untuk membuktikannya.",
            target: "NaCl (Garam Dapur)",
            rewardText: "Besi (Fe) & Tembaga (Cu) Terbuka.",
            rewardAtoms: ["Fe", "Cu"],
            educationalText: "Reaksi antara asam (HCl) dan basa (NaOH) disebut reaksi netralisasi. Hasil pencampurannya tidak lagi berbahaya, karena mereka berubah menjadi garam biasa (NaCl) dan air."
        },
        {
            id: "Q6",
            type: "discovery",
            title: "Eksperimen Bebas",
            description: "Coba-coba saja gabungkan atom yang ada di kanvas sampai kamu berhasil mencetak 5 senyawa baru.",
            targetAmount: 5,
            rewardText: "Golongan Non-Logam (N, P, Si, Al) Terbuka.",
            rewardAtoms: ["N", "P", "Si", "Al"],
            educationalText: "Bagus! Kamu sudah mulai terbiasa mencoba kombinasi sendiri. Dalam dunia kimia sungguhan, banyak penemuan besar juga diawali dari eksperimen coba-coba seperti ini."
        },
        {
            id: "Q7",
            title: "Sintesis Amonia",
            description: "Gabungkan unsur Nitrogen dengan tiga unsur Hidrogen. Hasilnya adalah gas yang baunya pesing tapi sangat penting.",
            target: "NH3 (Gas Amonia)",
            rewardText: "Klan Halogen & Logam Alkali Terbuka.",
            rewardAtoms: ["F", "Br", "I", "K", "Mg", "Ca"],
            educationalText: "Amonia (NH3) banyak dipakai di pabrik sebagai bahan dasar pembuat pupuk tanaman. Jadi meski baunya menyengat, kehadirannya sangat membantu pertanian global."
        },
        {
            id: "Q8",
            type: "discovery",
            title: "Pengatur Suhu & Tekanan",
            description: "Bermainlah dengan penggeser suhu dan tekanan di panel kanan. Kumpulkan sampai 12 molekul.",
            targetAmount: 12,
            rewardText: "Logam Transisi Berat (Ag, Pb, Ti) Terbuka.",
            rewardAtoms: ["Ag", "Pb", "Ti"],
            educationalText: "Suhu dan tekanan sangat memengaruhi reaksi kimia. Ada beberapa molekul yang wujud awalnya berupa padatan atau gas, tapi bisa berubah jika kamu menaikkan atau menurunkan suhunya."
        },
        {
            id: "Q9",
            type: "discovery",
            title: "Mengisi Jurnal",
            description: "Terus isi jurnal reaksimu sampai kamu menemukan 20 molekul berbeda.",
            targetAmount: 20,
            rewardText: "Gas Mulia (He, Ne, Ar, Kr, Xe, Rn) Terbuka.",
            rewardAtoms: ["He", "Ne", "Ar", "Kr", "Xe", "Rn"],
            educationalText: "Kamu sudah membuka kumpulan unsur Gas Mulia. Golongan gas ini disebut 'mulia' karena sifatnya sangat mandiri dan hampir tidak mau bereaksi dengan atom apa pun."
        },
        {
            id: "Q10",
            title: "Endapan Putih Perak",
            description: "Gabungkan Perak (Ag) dengan Klorin untuk menghasilkan endapan padat.",
            target: "AgCl (Endapan Perak Klorida)",
            rewardText: "Logam Ekstrem & Lantanida Terbuka.",
            rewardAtoms: ["Au", "Pt", "U", "Pu", "Ce", "Nd"],
            educationalText: "Perak Klorida (AgCl) adalah contoh garam yang sulit larut dalam air. Di zaman dulu, senyawa ini sangat penting untuk teknologi cuci cetak lembaran foto analog."
        },
        
        {
            id: "Q12",
            title: "Gas Pernapasan",
            description: "Buat senyawa gas hasil pembakaran yang juga kita embuskan saat bernapas. Gabungkan Karbon dan Oksigen.",
            target: "CO2 (Karbon Dioksida)",
            rewardText: "Logam Alkali Tanah Terbuka.",
            rewardAtoms: ["Ba", "Sr", "Be"],
            educationalText: "Karbon Dioksida (CO2) sangat erat dengan proses kehidupan. Meski sering disorot sebagai penyebab pemanasan global, tanaman justru membutuhkannya sebagai 'makanan' fotosintesis."
        },
        {
            id: "Q13",
            title: "Proses Karat",
            description: "Besi sangat mudah berkarat kalau terpapar udara. Coba satukan molekul Besi dan Oksigen.",
            target: "Fe2O3 (Karat Besi)",
            rewardText: "Material Oksida Terbuka.",
            rewardAtoms: ["O3 (Ozon)"],
            educationalText: "Karat besi (Fe2O3) adalah reaksi oksidasi lambat. Oksigen perlahan mengikat atom besi, membuat logam yang tadinya keras menjadi rapuh dan keropos."
        },
        {
            id: "Q14",
            title: "Air Aki Mobil",
            description: "Racik Asam Sulfat, jenis asam pekat yang sering dipasang pada baterai aki kendaraan.",
            target: "H2SO4 (Asam Sulfat)",
            rewardText: "Unsur Sintetik dan Berat Terbuka.",
            rewardAtoms: ["Tl", "Bi", "Po", "At"],
            educationalText: "Asam Sulfat (H2SO4) adalah salah satu bahan kimia yang paling banyak diproduksi di industri. Ia bisa menyerap molekul air dari bahan organik dengan sangat agresif."
        },
        {
            id: "Q15",
            title: "Hujan Emas",
            description: "Coba reaksikan Timbal (Pb) dengan Iodin untuk membuat kristal berwarna cerah.",
            target: "PbI2 (Endapan Kuning Timbal Iodida)",
            rewardText: "Halogen Ekstrem Terbuka.",
            rewardAtoms: ["As", "Se", "Sb", "Te"],
            educationalText: "Timbal(II) Iodida (PbI2) adalah serbuk padat kuning terang. Jika serbuk ini dilarutkan ke air lalu didinginkan perlahan, akan muncul efek cantik layaknya hujan bubuk emas."
        },
        {
            id: "Q16",
            title: "Gas Rawa",
            description: "Gabungkan satu Karbon dengan empat Hidrogen untuk membuat gas penyumbang efek rumah kaca alami.",
            target: "CH4 (Gas Metana)",
            rewardText: "Isotop Karbon dan Boron Terbuka.",
            rewardAtoms: ["B", "Li"],
            educationalText: "Metana (CH4) mudah terbakar sehingga sering digunakan untuk gas kompor. Gas ini secara alami sering muncul dari rawa-rawa atau pembusukan tumpukan sampah."
        },
        {
            id: "Q17",
            title: "Gas Ozon",
            description: "Buat jenis molekul Oksigen yang lebih padat, berisi 3 atom Oksigen sekaligus.",
            target: "O3 (Gas Ozon)",
            rewardText: "Logam Transisi Langka Terbuka.",
            rewardAtoms: ["V", "Cr", "Mn", "Co", "Ni"],
            educationalText: "Ozon (O3) di langit tinggi berfungsi melindungi bumi dari radiasi ultraviolet matahari. Tapi jika Ozon berada terlalu dekat di darat, ia bisa menjadi polusi yang mengganggu pernapasan."
        },
        {
            id: "Q18",
            title: "Alkohol Industri",
            description: "Racik alkohol jenis Metanol. Jangan diminum karena jenis ini sangat beracun untuk tubuh.",
            target: "CH3OH (Metanol)",
            rewardText: "Logam Tambahan Terbuka.",
            rewardAtoms: ["Ga", "Ge"],
            educationalText: "Metanol adalah bentuk alkohol yang paling sederhana tapi paling berbahaya. Mengonsumsi metanol sedikit saja sudah cukup untuk merusak saraf dan menyebabkan kebutaan."
        },
        {
            id: "Q19",
            title: "Pertemuan Asap Putih",
            description: "Reaksikan gas Amonia dan gas Asam Klorida untuk membuktikan wujud asap padat putih.",
            target: "NH4Cl (Amonium Klorida / Salmiak)",
            rewardText: "Logam Katalis Terbuka.",
            rewardAtoms: ["Rb", "Cs"],
            educationalText: "Saat amonia dan uap asam klorida bertemu di udara terbuka, mereka langsung membentuk partikel debu halus Amonium Klorida. Secara kasat mata, reaksinya terlihat seperti asap putih tebal."
        },
        {
            id: "Q20",
            title: "Cairan Pemutih",
            description: "Coba tempelkan satu atom oksigen ekstra ke molekul Air (H2O).",
            target: "H2O2 (Hidrogen Peroksida)",
            rewardText: "Unsur Transisi Bawah Terbuka.",
            rewardAtoms: ["Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Cd"],
            educationalText: "Hidrogen Peroksida (H2O2) sangat suka melepaskan sisa oksigen tambahannya. Karena pelepasan tersebut, cairan ini sering dipakai sebagai pemutih pakaian atau obat antiseptik luka."
        },
        {
            id: "Q21",
            title: "Garam Kalium",
            description: "Gabungkan unsur Kalium (K) dengan Asam Sulfat untuk menghasilkan garam penyubur tanah.",
            target: "K2SO4 (Kalium Sulfat)",
            rewardText: "Lantanida Utama Terbuka.",
            rewardAtoms: ["Pr", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu"],
            educationalText: "Garam Kalium Sulfat ini banyak ditebar di lahan pertanian untuk menyuburkan tanah. Petani menyukainya karena tidak mengandung zat klorida yang kadang buruk untuk beberapa tanaman."
        },
        {
            id: "Q22",
            title: "Aroma Kacang Almond",
            description: "Hati-hati, senyawa Hidrogen Sianida sangat berbahaya. Coba susun dari Hidrogen, Karbon, dan Nitrogen.",
            target: "HCN (Asam Sianida)",
            rewardText: "Unsur Radioaktif Aktinida Terbuka.",
            rewardAtoms: ["Th", "Pa", "Np", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr"],
            educationalText: "Asam sianida (HCN) cukup terkenal lewat novel detektif karena aromanya mirip kacang almond pahit. Ini adalah gas yang sangat amat beracun dan mematikan."
        },
        {
            id: "Q23",
            title: "Pigmen Cat Putih",
            description: "Buat Titanium Dioksida, bahan campuran pemutih yang aman dan serbaguna.",
            target: "TiO2 (Titanium Dioksida)",
            rewardText: "Sisa Elemen Post-Transisi Terbuka.",
            rewardAtoms: ["In", "Sn"],
            educationalText: "Hampir semua benda berwarna putih di rumahmu (seperti cat dinding atau pasta gigi) mengandung senyawa Titanium Dioksida (TiO2), karena sifatnya yang luar biasa dalam memantulkan cahaya."
        },
        {
            id: "Q24",
            title: "Gas Sangat Berat",
            description: "Gabungkan 1 Belerang (S) dengan 6 Fluorin (F). Ini menghasilkan wujud gas, tapi massanya berat.",
            target: "SF6 (Sulfur Heksafluorida)",
            rewardText: "Elemen Langka Tersisa Terbuka.",
            rewardAtoms: ["Hf", "Ta", "W", "Re", "Os", "Ir"],
            educationalText: "Sulfur Heksafluorida (SF6) adalah gas yang tidak berwarna dan tidak berbau. Menariknya, massanya enam kali lebih padat dari udara biasa, jadi kamu bahkan bisa mengapungkan perahu mainan di atas gas ini."
        },
        {
            id: "Q25",
            type: "discovery",
            title: "Kelulusan Lab",
            description: "Misi kelulusan! Teruslah bereksperimen sampai kamu mencatat total 45 molekul di jurnal.",
            targetAmount: 45,
            rewardText: "Seluruh 118 Unsur Tabel Periodik Terbuka Penuh.",
            rewardAtoms: ["ALL"],
            educationalText: "Selamat! Kamu telah merampungkan semua misi dasar. Sekarang kamu punya akses utuh ke 118 unsur di tabel periodik. Bersenang-senanglah bermain secara bebas di mode lab tanpa batas ini!"
        }
    ],

    // Inisialisasi
    init() {
        this.loadProgress();
        this.renderQuestUI();
        if (window.updateAtomDatalist) {
            window.updateAtomDatalist();
        }
    },

    // ==========================================
    // SISTEM KOLEKSI MOLEKUL
    // ==========================================
    renderCollection() {
        const container = document.getElementById('collectionContainer');
        if (!container || !window.DB || !window.DB.moleculeAtoms) return;
        
        container.innerHTML = ''; 
        const allMolecules = Object.keys(window.DB.moleculeAtoms);
        let discoveredCount = 0;

        allMolecules.forEach(molLabel => {
            // Sebuah item dianggap 'ditemukan' jika ia ada di discoveredMolecules (untuk molekul) 
            // ATAU ada di unlockedAtoms (untuk atom-atom dasar).
            const isDiscovered = this.state.discoveredMolecules.includes(molLabel) || this.state.unlockedAtoms.includes(molLabel);
            if (isDiscovered) discoveredCount++;

            const badge = document.createElement('div');
            badge.className = 'collection-badge ' + (isDiscovered ? 'unlocked' : 'locked');
            
            badge.innerHTML = `
                <div class="mol-icon">${isDiscovered ? '🧪' : '🔒'}</div>
                <div class="mol-name">${isDiscovered ? molLabel : '???'}</div>
            `;
            container.appendChild(badge);
        });

        const progressEl = document.getElementById('collectionProgress');
        if (progressEl) {
            progressEl.innerText = `${discoveredCount} / ${allMolecules.length}`;
        }
        
        // Animasi Staggering saat Modal Koleksi dirender
        if (window.anime) {
            anime({
                targets: '#collectionContainer .collection-badge',
                scale: [0.8, 1],
                opacity: [0, 1],
                delay: anime.stagger(50, {start: 100}), // berjatuhan satu per satu
                easing: 'spring(1, 80, 10, 0)',
                duration: 600
            });
        }
    },

    // Pengecekan Penemuan Baru
    checkDiscovery(moleculeLabel) {
        // Jangan catat radikal bebas (bintang di akhir)
        if (moleculeLabel.includes('*')) return; 

        if (!this.state.discoveredMolecules.includes(moleculeLabel)) {
            this.state.discoveredMolecules.push(moleculeLabel);
            if (window.showToast) {
                window.showToast(`Molekul Baru Ditemukan: ${moleculeLabel}! 📖`);
            }
            this.saveProgress();
            this.renderCollection();
        }
        
        // Cek misi setiap kali molekul tercipta (meski sudah pernah ditemukan)
        this.checkQuests(moleculeLabel);
    },

    // Pengecekan Penyelesaian Misi
    checkQuests(moleculeLabel) {
        let questCompleted = false;

        // Cari misi aktif (misi pertama yang belum selesai)
        let activeQuest = this.quests.find(q => !this.state.completedQuests.includes(q.id));
        if (!activeQuest) return;

        let isTargetMet = false;
        
        // Logika untuk Tipe Discovery
        if (activeQuest.type === "discovery") {
            if (this.state.discoveredMolecules.length >= activeQuest.targetAmount) {
                isTargetMet = true;
            }
        } 
        // Logika untuk Tipe Sintesis (Default)
        else {
            // Harus bereaksi secara langsung saat misi aktif (tidak ada auto-complete dari riwayat)
            if (Array.isArray(activeQuest.target)) {
                isTargetMet = activeQuest.target.includes(moleculeLabel);
            } else {
                isTargetMet = activeQuest.target === moleculeLabel;
            }
        }

        // Jika misi aktif terpenuhi
        if (isTargetMet) {
            this.state.completedQuests.push(activeQuest.id);
            questCompleted = true;
                
                // Berikan Reward Atom Baru
                if (activeQuest.rewardAtoms.includes("ALL")) {
                    // Buka SEMUA 118 Atom dari database
                    if (window.CHEM_DATA && window.CHEM_DATA.periodic_table) {
                        window.CHEM_DATA.periodic_table.forEach(at => {
                            if (!this.state.unlockedAtoms.includes(at.symbol)) {
                                this.state.unlockedAtoms.push(at.symbol);
                            }
                        });
                    }
                } else {
                    activeQuest.rewardAtoms.forEach(atom => {
                        if (!this.state.unlockedAtoms.includes(atom)) {
                            this.state.unlockedAtoms.push(atom);
                        }
                    });
                }
                
                // Panggil Modal Edukasi
                this.showEducationalModal(activeQuest);
                
                // Pengecoh: Reset suhu dan tekanan ke default
                if (typeof currentTemp !== 'undefined') {
                    currentTemp = 25;
                    const tempEl = document.getElementById('tempValue');
                    const tempSl = document.getElementById('tempSlider');
                    if (tempEl) tempEl.textContent = currentTemp.toFixed(1);
                    if (tempSl) tempSl.value = currentTemp;
                }
                if (typeof currentPress !== 'undefined') {
                    currentPress = 1.0;
                    const pressEl = document.getElementById('pressValue');
                    const pressSl = document.getElementById('pressSlider');
                    if (pressEl) pressEl.textContent = currentPress.toFixed(1);
                    if (pressSl) pressSl.value = currentPress;
                }
            }

        if (questCompleted) {
            this.saveProgress();
            this.renderQuestUI();
            
            // Beritahu UI utama untuk update Datalist
            if (window.updateAtomDatalist) {
                window.updateAtomDatalist();
            }
            
            // Cek berantai: Jika misi selanjutnya sudah memenuhi syarat (sudah ditemukan sebelumnya), selesaikan juga
            setTimeout(() => {
                this.checkQuests(null);
            }, 1000);
        }
    },

    // UI Toast Pencapaian
    showAchievementToast(message, isMajor = false) {
        const toast = document.createElement('div');
        toast.className = `achievement-toast ${isMajor ? 'major' : ''}`;
        toast.innerHTML = message;
        document.body.appendChild(toast);

        // Panggil Confetti khusus misi/pencapaian penting
        if (isMajor && window.shootConfetti) {
            window.shootConfetti();
        }

        // Animasi MASUK dari atas dengan spring yang sangat ekspresif
        anime({
            targets: toast,
            top: ['-100px', '30px'],
            opacity: [0, 1],
            duration: 700,
            easing: 'spring(1, 60, 8, 0)',
            complete: () => {
                // Animasi KELUAR setelah 5 detik
                anime({
                    targets: toast,
                    top: [30, -100],
                    opacity: [1, 0],
                    duration: 500,
                    delay: 5000,
                    easing: 'easeInBack',
                    complete: () => toast.remove()
                });
            }
        });
    },

    // Render Panel Misi di Layar (Ke dalam Modal Jurnal)
    renderQuestUI() {
        const questActiveContainer = document.getElementById('questActiveContainer');
        const questCompletedContainer = document.getElementById('questCompletedContainer');
        
        if (!questActiveContainer || !questCompletedContainer) return;

        questActiveContainer.innerHTML = '';
        questCompletedContainer.innerHTML = '';
        
        let activeQuestFound = false;

        this.quests.forEach(quest => {
            const isCompleted = this.state.completedQuests.includes(quest.id);
            
            // Tampilkan misi pertama yang belum selesai (Misi Aktif)
            if (!isCompleted && !activeQuestFound) {
                activeQuestFound = true;
                
                let progressText = "";
                if (quest.type === "discovery") {
                    let currentCount = this.state.discoveredMolecules.length;
                    progressText = `<div style="margin-top: 10px; font-weight: bold; color: #fbbf24; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">📈 Observasi Aktual: ${currentCount} / ${quest.targetAmount} Tercatat</div>`;
                }
                
                questActiveContainer.innerHTML += `
                    <div class="quest-card active" style="margin-bottom: 12px; background: rgba(15, 23, 42, 0.6); box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                        <div class="quest-status" style="color: #60a5fa;">🔵 Misi Prioritas</div>
                        <h4 style="color: #f8fafc; font-size: 1.1rem; border-bottom: 1px solid #334155; padding-bottom: 5px;">[${quest.id}] ${quest.title}</h4>
                        <p style="color: #94a3b8; font-family: monospace; font-size: 0.85rem; line-height: 1.5; margin-top: 8px;">"${quest.description}"</p>
                        ${progressText}
                        <div class="quest-reward" style="margin-top: 10px; border-left: 3px solid #fbbf24; padding-left: 8px;"><strong>Reward:</strong> <span style="color:#e2e8f0">${quest.rewardText}</span></div>
                    </div>
                `;
            } 
            // Tampilkan misi yang sudah selesai
            else if (isCompleted) {
                questCompletedContainer.innerHTML += `
                    <div class="quest-card completed" style="margin-bottom: 10px; background: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.2);">
                        <div class="quest-status" style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color: #4ade80;">✅ Tereksekusi</span>
                            <button onclick="QuestEngine.showEducationalModalById('${quest.id}')" style="background:none; border:none; color:#fbbf24; cursor:pointer; font-size:0.8rem; text-decoration:underline; font-weight:bold;">🔍 Tinjau Log</button>
                        </div>
                        <h4 style="margin-top: 5px; color: #cbd5e1;"><del>[${quest.id}] ${quest.title}</del></h4>
                    </div>
                `;
            }
        });

        if (!activeQuestFound) {
            questActiveContainer.innerHTML += `
                <div class="quest-card active" style="text-align: center; border-color: gold; padding: 20px;">
                    <h4 style="color: gold; font-size: 1.2rem;">🏆 Protokol Lab Terselesaikan</h4>
                    <p style="color: #94a3b8; font-family: monospace; margin-top: 10px;">Semua log reaktor telah penuh. Database kimia berada dalam otoritas penuh Anda. Mode Sandbox Tidak Terbatas diaktifkan.</p>
                </div>
            `;
        }
        
        // Render koleksi molekul juga
        this.renderCollection();
    },

    // Menampilkan Modal Edukasi
    showEducationalModal(quest) {
        const modalTitle = document.getElementById('eduModalTitle');
        const modalContent = document.getElementById('eduModalContent');
        
        if (modalTitle && modalContent) {
            modalTitle.innerHTML = `🌟 ${quest.title} Selesai!`;
            let contentHTML = `<p>${quest.educationalText}</p>`;
            if (quest.rewardText) {
                contentHTML += `<div style="margin-top:15px; padding:10px; background:rgba(251, 191, 36, 0.2); border: 1px dashed #fbbf24; border-radius:6px; color:#fbbf24; font-weight:bold;">🎁 Reward: ${quest.rewardText}</div>`;
            }
            modalContent.innerHTML = contentHTML;

            // Gunakan openModal() global agar konsisten dengan modal lain
            if (typeof openModal === 'function') {
                openModal('eduModalOverlay');
            }
        }
    },

    // Dipanggil saat klik "Baca Penjelasan" di misi yang sudah selesai
    showEducationalModalById(questId) {
        const quest = this.quests.find(q => q.id === questId);
        if (quest) {
            this.showEducationalModal(quest);
        }
    },

    // === SISTEM PENYIMPANAN (SAVE/LOAD) ===

    saveProgress() {
        if (window.getCanvasState) {
            this.state.canvas = window.getCanvasState();
        }
        localStorage.setItem('labSimulatorProgress', JSON.stringify(this.state));
        
        // Hindari menumpuk toast
        if (document.querySelector('.auto-save-toast')) {
            const existing = document.querySelector('.auto-save-toast');
            anime.remove(existing);
            existing.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'auto-save-toast';
        toast.innerHTML = '💾 Auto-Saved';
        document.body.appendChild(toast);
        
        // Animasi masuk smooth
        anime({
            targets: toast,
            opacity: [0, 1],
            translateY: [10, 0],
            duration: 300,
            easing: 'easeOutQuart',
            complete: () => {
                // Animasi keluar setelah 2 detik
                anime({
                    targets: toast,
                    opacity: [1, 0],
                    translateY: [0, 10],
                    duration: 400,
                    delay: 2000,
                    easing: 'easeInQuart',
                    complete: () => toast.remove()
                });
            }
        });
    },

    loadProgress() {
        const saved = localStorage.getItem('labSimulatorProgress');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge state to handle structural updates in the future
                this.state = { ...this.state, ...parsed };
                
                if (this.state.canvas && window.restoreCanvasState) {
                    window.restoreCanvasState(this.state.canvas);
                }
            } catch (e) {
                console.error("Gagal membaca save data:", e);
            }
        }
    },

    resetProgress() {
        if (confirm("Yakin mau menghapus semua catatan eksperimenmu dan mengulang dari nol? (Pencapaian yang dihapus tidak bisa dikembalikan lho!)")) {
            localStorage.removeItem('labSimulatorProgress');
            location.reload();
        }
    },

    exportProgress() {
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        if (window.getCanvasState) {
            this.state.canvas = window.getCanvasState();
        }
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `lab-progress-backup_${dateStr}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    importProgress(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (parsed.unlockedAtoms && parsed.completedQuests) {
                    this.state = parsed;
                    this.saveProgress();
                    alert("Yeay! Data progres eksperimenmu berhasil dimuat ulang.");
                    location.reload();
                } else {
                    alert("File backup tidak valid!");
                }
            } catch (err) {
                alert("Gagal membaca file backup!");
            }
        };
        reader.readAsText(file);
    }
};
