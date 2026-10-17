const canvas = document.getElementById('labCanvas');
const ctx = canvas.getContext('2d');
const liquidCanvas = document.getElementById('liquidCanvas');
const liquidCtx = liquidCanvas ? liquidCanvas.getContext('2d') : null;

window.camera = { 
    targetZoom: 1.0, zoom: 1.0,
    targetX: 0, x: 0,
    targetY: 0, y: 0
};

function getCanvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    let rawX = clientX - rect.left;
    let rawY = clientY - rect.top;
    
    let mx = (rawX - window.camera.x) / window.camera.zoom;
    let my = (rawY - window.camera.y) / window.camera.zoom;
    return { mx, my };
}

function clampCamera() {
    let minX = canvas.width - canvas.width * window.camera.targetZoom;
    let minY = canvas.height - canvas.height * window.camera.targetZoom;
    
    window.camera.targetX = Math.min(0, Math.max(window.camera.targetX, minX));
    window.camera.targetY = Math.min(0, Math.max(window.camera.targetY, minY));
}

window.DB = {
    periodicTable: [],
    molecules: [],
    reactions: [],
    knownMolecules: {}, // mapped by atoms string
    moleculeAtoms: {},
    moleculeThermo: {},
    moleculeAcidBase: {} // Menyimpan data "ACID" / "BASE"
};
let DB = window.DB;

let particles = [];
let flashes = []; // Array untuk menampung ReactionFlash
let visualEffects = []; // Array untuk partikel asap/gelembung
let audioCtx = null;
let bgmAudio = new Audio('./static/audio/bgm.mp3');
bgmAudio.loop = true;
bgmAudio.volume = 0.2; // Sangat pelan agar cozy
let hasStartedAudio = false;

let activeOscillators = 0;
const MAX_OSCILLATORS = 8;
let isMuted = false;

// Fungsi untuk memulai Audio
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (!hasStartedAudio && !isMuted) {
        hasStartedAudio = true;
        bgmAudio.play().catch(e => console.log("BGM autoplay blocked until further interaction."));
    }
}

document.body.addEventListener('click', initAudio, { once: false });
document.body.addEventListener('touchstart', initAudio, { once: false });

function playPopSFX() {
    if (!audioCtx || isMuted || activeOscillators >= MAX_OSCILLATORS) return;
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        activeOscillators++;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.05);
        
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
        osc.onended = () => { activeOscillators = Math.max(0, activeOscillators - 1); };
    } catch (_) {
        activeOscillators = Math.max(0, activeOscillators - 1);
    }
}

function playBoomSFX(energy) {
    if (!audioCtx || isMuted || activeOscillators >= MAX_OSCILLATORS) return;
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        activeOscillators++;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        let isExo = (energy === undefined || energy === null || energy <= 0);
        osc.type = isExo ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(isExo ? 120 : 300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(isExo ? 45 : 100, audioCtx.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
        osc.onended = () => { activeOscillators = Math.max(0, activeOscillators - 1); };
    } catch (_) {
        activeOscillators = Math.max(0, activeOscillators - 1);
    }
}

class VisualEffect {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'smoke' atau 'bubble'
        this.life = 1.0;
        
        if (type === 'smoke') {
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = -Math.random() * 2 - 1;
            this.radius = Math.random() * 10 + 5;
            this.color = `255, 255, 255`;
        } else {
            // bubble
            this.vx = 0;
            this.vy = -Math.random() * 1 - 0.5;
            this.radius = Math.random() * 5 + 3;
            this.color = `173, 216, 230`;
            this.wobblePhase = Math.random() * Math.PI * 2;
            this.wobbleSpeed = Math.random() * 0.1 + 0.05;
        }
    }
    
    update() {
        if (this.type === 'smoke') {
            this.x += this.vx;
            this.y += this.vy;
            this.radius += 0.5;
            this.life -= 0.02;
        } else {
            // bubble
            this.wobblePhase += this.wobbleSpeed;
            this.x += Math.sin(this.wobblePhase) * 1.5;
            this.y += this.vy;
            this.radius += 0.1;
            this.life -= 0.015;
        }
    }
    
    draw() {
        ctx.save();
        ctx.beginPath();
        if (this.type === 'smoke') {
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color}, ${Math.max(0, this.life * 0.5)})`;
            ctx.fill();
        } else {
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${this.color}, ${Math.max(0, this.life)})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            // inner highlight
            ctx.beginPath();
            ctx.arc(this.x - this.radius*0.3, this.y - this.radius*0.3, this.radius*0.2, 0, Math.PI*2);
            ctx.fillStyle = `rgba(255,255,255, ${Math.max(0, this.life)})`;
            ctx.fill();
        }
        ctx.restore();
    }
}

let currentTemp = 25.0;
let targetTemp = 25.0;
let currentPress = 1.0;
const MAX_PARTICLES = 150;
let particleCounter = 0; // Untuk ID partikel (digunakan di Spatial Grid)

// Latar belakang saat ini (Netral putih)
let currentBg = {r: 255, g: 255, b: 255};
let currentPH = 7.0;

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    if (liquidCanvas) {
        liquidCanvas.width = canvas.width;
        liquidCanvas.height = canvas.height;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Ambil Data dari API JSON Lokal (Static Site)
async function initDB() {
    try {
        if (!window.CHEM_DATA) throw new Error("window.CHEM_DATA tidak ditemukan!");
        let data = window.CHEM_DATA;
        
        DB.periodicTable = data.periodic_table;
        DB.molecules = data.molecules;
        
        data.molecules.forEach(m => {
            DB.moleculeAtoms[m.label] = m.atoms_csv.split(',');
            DB.moleculeThermo[m.label] = { mp: m.mp, bp: m.bp };
            if (m.acid_base_type) {
                DB.moleculeAcidBase[m.label] = m.acid_base_type;
            }
            let sortedSyms = m.atoms_csv.split(',').sort().join(',');
            DB.knownMolecules[sortedSyms] = m.label;
        });

        // Masukkan juga atom-atom dasar ke dalam ensiklopedia jika belum ada
        DB.periodicTable.forEach(a => {
            if (!DB.moleculeAtoms[a.symbol]) {
                DB.moleculeAtoms[a.symbol] = [a.symbol];
                DB.moleculeThermo[a.symbol] = { mp: a.mp, bp: a.bp };
                DB.knownMolecules[a.symbol] = a.symbol;
            }
        });

        DB.reactions = data.reactions;
        DB.reactionMap = new Map();
        DB.catalystMap = new Map();
        if (data.reactions) {
            data.reactions.forEach(r => {
                let key1 = `${r.r1}::${r.r2}`;
                let key2 = `${r.r2}::${r.r1}`;
                DB.reactionMap.set(key1, r);
                DB.reactionMap.set(key2, r);
                
                if (r.catalyst) {
                    DB.catalystMap.set(`${r.r1}::${r.catalyst}`, true);
                    DB.catalystMap.set(`${r.r2}::${r.catalyst}`, true);
                }
            });
        }
        
        const datalist = document.getElementById('atomList');
        window.updateAtomDatalist = function() {
            datalist.innerHTML = '';
            let unlocked = window.QuestEngine ? window.QuestEngine.state.unlockedAtoms : [];
            
            Object.keys(DB.moleculeAtoms).forEach(label => {
                if(unlocked.includes(label)) {
                    const opt = document.createElement('option');
                    opt.value = label.split(' ')[0];
                    datalist.appendChild(opt);
                }
            });
        };
        updateAtomDatalist();
        if (window.AtomSpriteSystem && window.AtomSpriteSystem.preload) {
            window.AtomSpriteSystem.preload();
        }

    } catch (e) {
        console.error("Gagal memuat data", e);
        alert("Gagal memuat data! Database rusak atau data.js tidak terbaca.");
    }
}

function getAtomData(symbol) {
    let found = DB.periodicTable ? DB.periodicTable.find(a => a.symbol === symbol) : null;
    if (found) {
        return {
            symbol: found.symbol,
            name: found.name || found.symbol,
            mass: found.mass || found.atomic_mass || 12,
            color: found.color || '#64748b',
            charge: found.charge !== undefined ? found.charge : 0,
            atomic_number: found.atomic_number,
            valence: found.valence
        };
    }
    return { symbol: symbol, name: symbol, mass: 12, color: '#64748b', charge: 0 };
}

function getValence(symbol) {
    const valences = {
        'H': 1, 'Li': 1, 'Na': 1, 'K': 1, 'Rb': 1, 'Cs': 1, 'Fr': 1,
        'F': 1, 'Cl': 1, 'Br': 1, 'I': 1, 'At': 1, 'Ag': 1,
        'O': 2, 'Se': 2, 'Te': 2, 'Be': 2, 'Mg': 2, 'Ca': 2, 'Sr': 2, 'Ba': 2, 'Ra': 2, 'Zn': 2, 'Cu': 2, 'Cd': 2, 'Hg': 2,
        'N': 3, 'As': 3, 'Sb': 3, 'Bi': 3, 'B': 3, 'Al': 3, 'Fe': 3, 'Au': 3, 'Cr': 3,
        'C': 4, 'Si': 4, 'Ge': 4, 'Sn': 4, 'Pb': 4, 'Ti': 4, 'Pt': 4,
        'P': 5,
        'S': 6,
        'He': 0, 'Ne': 0, 'Ar': 0, 'Kr': 0, 'Xe': 0, 'Rn': 0
    };
    return valences[symbol] || 0;
}

function showToast(msg) {
    const toast = document.getElementById('reaction-toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');

    // Hentikan animasi sebelumnya jika ada
    anime.remove(toast);

    // Animasi MASUK - spring bouncy
    anime({
        targets: toast,
        translateX: ['-50%', '-50%'], // jaga posisi horizontal tetap
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 500,
        easing: 'spring(1, 80, 10, 0)',
        complete: () => {
            // Animasi KELUAR setelah 2.5 detik
            anime({
                targets: toast,
                translateX: '-50%',
                translateY: [0, -15],
                opacity: [1, 0],
                duration: 400,
                delay: 2500,
                easing: 'easeInCubic',
                complete: () => toast.classList.add('hidden')
            });
        }
    });

    const log = document.getElementById('reactionLog');
    if (log) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const time = new Date().toLocaleTimeString();
        entry.textContent = `[${time}] ${msg}`;
        // Animasi entri log baru
        entry.style.opacity = '0';
        entry.style.transform = 'translateX(-10px)';
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
        anime({
            targets: entry,
            opacity: [0, 1],
            translateX: [-10, 0],
            duration: 300,
            easing: 'easeOutQuart'
        });
    }
}

// P2.12: Pembatasan kilatan cahaya secara global (WCAG 2.3.1: maks 3 per detik)
let flashTimestamps = [];
function canTriggerFlash() {
    const now = performance.now();
    flashTimestamps = flashTimestamps.filter(t => now - t < 1000);
    if (flashTimestamps.length < 3) {
        flashTimestamps.push(now);
        return true;
    }
    return false;
}

class ReactionFlash {
    constructor(x, y, isExothermic, deltaT) {
        this.x = x;
        this.y = y;
        
        // Ukuran kilatan bergantung pada seberapa ekstrim suhunya naik/turun
        let intensity = 1.0;
        if (deltaT) {
            intensity = Math.max(0.5, Math.min(3.0, Math.abs(deltaT) / 5.0));
        }
        
        this.r = 8 * intensity;
        this.alpha = 0.8;
        // Eksotermik = Kuning Emas/Orange. Endotermik = Biru Es
        this.color = isExothermic ? '#FFD700' : '#87CEEB';
    }

    update() {
        this.r += 2.5;
        this.alpha -= 0.025;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        let grad = ctx.createRadialGradient(this.x, this.y, this.r * 0.2, this.x, this.y, this.r);
        grad.addColorStop(0, this.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
    }
}

// --- ATOM SPRITE ANIMATION SYSTEM (PIXEL ART) ---
window.AtomSpriteSystem = {
    enabled: true,
    fps: 14, // Kecepatan animasi pantulan pixel art
    sprites: {},
    mapping: {"H": "001_H.png", "He": "002_He.png", "Li": "003_Li.png", "Be": "004_Be.png", "B": "005_B.png", "C": "006_C.png", "N": "007_N.png", "O": "008_O.png", "F": "009_F.png", "Ne": "010_Ne.png", "Na": "011_Na.png", "Mg": "012_Mg.png", "Al": "013_Al.png", "Si": "014_Si.png", "P": "015_P.png", "S": "016_S.png", "Cl": "017_Cl.png", "Ar": "018_Ar.png", "K": "019_K.png", "Ca": "020_Ca.png", "Sc": "021_Sc.png", "Ti": "022_Ti.png", "V": "023_V.png", "Cr": "024_Cr.png", "Mn": "025_Mn.png", "Fe": "026_Fe.png", "Co": "027_Co.png", "Ni": "028_Ni.png", "Cu": "029_Cu.png", "Zn": "030_Zn.png", "Ga": "031_Ga.png", "Ge": "032_Ge.png", "As": "033_As.png", "Se": "034_Se.png", "Br": "035_Br.png", "Kr": "036_Kr.png", "Rb": "037_Rb.png", "Sr": "038_Sr.png", "Y": "039_Y.png", "Zr": "040_Zr.png", "Nb": "041_Nb.png", "Mo": "042_Mo.png", "Tc": "043_Tc.png", "Ru": "044_Ru.png", "Rh": "045_Rh.png", "Pd": "046_Pd.png", "Ag": "047_Ag.png", "Cd": "048_Cd.png", "In": "049_In.png", "Sn": "050_Sn.png", "Sb": "051_Sb.png", "Te": "052_Te.png", "I": "053_I.png", "Xe": "054_Xe.png", "Cs": "055_Cs.png", "Ba": "056_Ba.png", "La": "057_La.png", "Ce": "058_Ce.png", "Pr": "059_Pr.png", "Nd": "060_Nd.png", "Pm": "061_Pm.png", "Sm": "062_Sm.png", "Eu": "063_Eu.png", "Gd": "064_Gd.png", "Tb": "065_Tb.png", "Dy": "066_Dy.png", "Ho": "067_Ho.png", "Er": "068_Er.png", "Tm": "069_Tm.png", "Yb": "070_Yb.png", "Lu": "071_Lu.png", "Hf": "072_Hf.png", "Ta": "073_Ta.png", "W": "074_W.png", "Re": "075_Re.png", "Os": "076_Os.png", "Ir": "077_Ir.png", "Pt": "078_Pt.png", "Au": "079_Au.png", "Hg": "080_Hg.png", "Tl": "081_Tl.png", "Pb": "082_Pb.png", "Bi": "083_Bi.png", "Po": "084_Po.png", "At": "085_At.png", "Rn": "086_Rn.png", "Fr": "087_Fr.png", "Ra": "088_Ra.png", "Ac": "089_Ac.png", "Th": "090_Th.png", "Pa": "091_Pa.png", "U": "092_U.png", "Np": "093_Np.png", "Pu": "094_Pu.png", "Am": "095_Am.png", "Cm": "096_Cm.png", "Bk": "097_Bk.png", "Cf": "098_Cf.png", "Es": "099_Es.png", "Fm": "100_Fm.png", "Md": "101_Md.png", "No": "102_No.png", "Lr": "103_Lr.png", "Rf": "104_Rf.png", "Db": "105_Db.png", "Sg": "106_Sg.png", "Bh": "107_Bh.png", "Hs": "108_Hs.png", "Mt": "109_Mt.png", "Ds": "110_Ds.png", "Rg": "111_Rg.png", "Cn": "112_Cn.png", "Nh": "113_Nh.png", "Fl": "114_Fl.png", "Mc": "115_Mc.png", "Lv": "116_Lv.png", "Ts": "117_Ts.png", "Og": "118_Og.png"},
    getSprite(symbol) {
        if (!this.mapping[symbol]) return null;
        if (!this.sprites[symbol]) {
            const img = new Image();
            img.src = `./static/atoms/${this.mapping[symbol]}`;
            this.sprites[symbol] = { img, loaded: false, error: false };
            img.onload = () => { this.sprites[symbol].loaded = true; };
            img.onerror = () => { this.sprites[symbol].error = true; };
            if (img.complete && img.naturalWidth > 0) {
                this.sprites[symbol].loaded = true;
            }
        }
        return (this.sprites[symbol].loaded || (this.sprites[symbol].img && this.sprites[symbol].img.complete && this.sprites[symbol].img.naturalWidth > 0)) ? this.sprites[symbol].img : null;
    },
    preload(symbolList) {
        const list = symbolList || Object.keys(this.mapping);
        list.forEach(sym => this.getSprite(sym));
    },
    drawAtom(targetCtx, symbol, x, y, radius, particleId) {
        if (!this.enabled) return false;
        const img = this.getSprite(symbol);
        if (!img) return false;
        try {
            const totalFrames = 16;
            const frameW = 160;
            const ballH = 142; // Pangkas baris bawah (y >= 143) untuk menghilangkan bayangan lantai (preferensi data main)
            
            // Variasi fase agar tidak memantul kaku serempak
            const time = Date.now() / 1000;
            const offset = ((particleId || 0) * 0.38);
            const frameIndex = Math.floor((time + offset) * this.fps) % totalFrames;
            
            // Hitung ukuran rendering proporsional terhadap radius
            const drawW = (radius * 2) * (160 / 88);
            const drawH = drawW * (ballH / 160);
            const drawX = x - drawW * 0.5;
            const drawY = y - drawH * 0.52; // Pusat bola pas di tengah tanpa bayangan bawah
            
            targetCtx.save();
            targetCtx.imageSmoothingEnabled = false; // Efek tajam pixel art
            targetCtx.drawImage(
                img,
                frameIndex * frameW, 0, frameW, ballH,
                drawX, drawY, drawW, drawH
            );
            targetCtx.restore();
            return true;
        } catch (err) {
            return false;
        }
    }
};

class Particle {
    constructor(atomSymbols, x, y, moleculeName = null) {
        this.id = particleCounter++;
        this.moleculeName = moleculeName;

        // Jika ini molekul, pastikan daftar atom penyusunnya selalu lengkap dari definisi database
        if (moleculeName && window.DB && window.DB.moleculeAtoms && window.DB.moleculeAtoms[moleculeName]) {
            atomSymbols = window.DB.moleculeAtoms[moleculeName];
        } else if (moleculeName && (!atomSymbols || atomSymbols.length <= 1) && window.DB && window.DB.moleculeAtoms) {
            let formula = moleculeName.split(' ')[0].trim();
            let foundKey = Object.keys(window.DB.moleculeAtoms).find(k => k.split(' ')[0] === formula);
            if (foundKey) atomSymbols = window.DB.moleculeAtoms[foundKey];
        }

        this.atomData = (atomSymbols || ['C']).map(sym => getAtomData(sym));
        this.label = moleculeName ? moleculeName : this.atomData.map(a => a.symbol).join('+');
        
        this.mass = this.atomData.reduce((sum, a) => sum + (a.mass || 12), 0);
        if (!this.mass || isNaN(this.mass) || this.mass <= 0) this.mass = 12;
        
        // Hitung radius partikel berdasarkan kelompok Ar / Mr (Skala presisi main branch)
        let m = this.mass;
        if (moleculeName && this.atomData.length > 1) {
            // Molekul menggunakan massa total (Mr) dengan sedikit penyesuaian
            if (m <= 10) this.radius = 16;
            else if (m <= 30) this.radius = 22;
            else if (m <= 50) this.radius = 26;
            else if (m <= 80) this.radius = 29;
            else this.radius = 32;
        } else {
            // Skala Ar atom tunggal sesuai permintaan:
            // Ar 1 - 10  : 15 px
            // Ar 11 - 30 : 20 px
            // Ar 31 - 50 : 25 px
            // Ar 51 - 80 : 28 px
            // Ar > 80    : 30 px
            if (m <= 10) this.radius = 15;
            else if (m <= 30) this.radius = 20;
            else if (m <= 50) this.radius = 25;
            else if (m <= 80) this.radius = 28;
            else this.radius = 30;
        }
        
        this.x = x || Math.random() * (canvas.width - 100) + 50;
        this.y = y || Math.random() * (canvas.height - 100) + 50;
        
        // Kecepatan gerak awal tenang dan terkontrol
        this.dx = (Math.random() - 0.5) * 1.5;
        this.dy = (Math.random() - 0.5) * 1.5;
        this.restitution = 0.8;
        
        if (moleculeName) {
            if (moleculeName.includes('Radikal')) this.color = '#9333ea';
            else if (moleculeName.includes('Air')) this.color = '#3b82f6';
            else if (moleculeName.includes('Klorida') || moleculeName.includes('Metana')) this.color = '#22c55e';
            else if (moleculeName.includes('Ester') || moleculeName.includes('Karboksilat')) this.color = '#f59e0b';
            else this.color = '#64748b';
        } else {
            let baseColor = (this.atomData[0] && this.atomData[0].color) ? this.atomData[0].color : '#64748b';
            this.color = baseColor.replace(/\s+/g, '');
        }
        
        this.state = "GAS";
        this._gridX = 0;
        this._gridY = 0;
    }

    updatePhysics() {
        let molData = DB.molecules ? DB.molecules.find(m => m.label === this.label) : null;
        let isRadicalIntermediate = (molData && molData.is_intermediate === 1);
        
        let thermo = DB.moleculeThermo[this.label];
        let mp = null, bp = null;
        if (!isRadicalIntermediate) {
            if (thermo && thermo.mp !== undefined) {
                mp = thermo.mp;
                bp = thermo.bp;
            } else if (molData) {
                mp = molData.mp;
                bp = molData.bp;
            } else if (!this.moleculeName) {
                let atm = this.atomData[0];
                if (atm && atm.mp !== undefined && atm.bp !== undefined && atm.mp !== 0.0) {
                    mp = atm.mp;
                    bp = atm.bp;
                } else if (atm) {
                    if (atm.symbol === 'C') {
                        mp = 3550; bp = 3825;
                    } else if (['Fe', 'Zn', 'Mg', 'Al', 'Ag', 'Pb', 'Pt', 'Na', 'K', 'Ca', 'P', 'S', 'I'].includes(atm.symbol)) {
                        mp = 600; bp = 2000;
                    } else if (['H', 'O', 'N', 'Cl', 'F', 'He', 'Ne', 'Ar', 'Kr', 'Xe'].includes(atm.symbol)) {
                        mp = -250; bp = -200;
                    }
                }
            }
        }
        
        // P0.3: Titik didih dinamis (Clausius-Clapeyron presisi)
        const R = 8.314;
        let dynamic_bp = Infinity;
        if (bp !== null && bp !== undefined && bp > -273.15) {
            let Tref = bp + 273.15; // Kelvin
            let H = (molData && molData.hvap_kj_mol) ? (molData.hvap_kj_mol * 1000.0) : (88.0 * Tref);
            let inv = (1.0 / Tref) - (R / H) * Math.log(Math.max(0.01, currentPress));
            dynamic_bp = inv > 0 ? (1.0 / inv - 273.15) : Infinity;
        }
        
        let dynamic_mp = mp;
        if (mp !== null && mp !== undefined) {
            if (this.label && this.label.includes("H2O")) {
                dynamic_mp = mp - 0.0074 * (currentPress - 1.0);
            } else {
                dynamic_mp = mp + 0.02 * (currentPress - 1.0);
            }
        }
        
        this.current_mp = dynamic_mp;
        this.current_bp = dynamic_bp;
        
        // Sublimasi: jika titik didih <= titik leleh atau tidak ada fase cair normal, lewati fase cair
        let isSublimating = (dynamic_mp === null || dynamic_mp === undefined || dynamic_bp <= dynamic_mp);
        
        if (isRadicalIntermediate) {
            this.state = "GAS";
        } else if (currentTemp >= dynamic_bp) {
            if (this.state !== "GAS") {
                this.state = "GAS";
                this.dy -= 1.5;
            }
        } else if (!isSublimating && currentTemp >= dynamic_mp) {
            this.state = "CAIR";
        } else {
            this.state = "PADAT";
        }
        
        // Kecepatan fisika diperhalus agar tidak terlalu cepat
        let speedMult = Math.min(2.0, Math.max(0.2, (currentTemp + 273.15) / 298.15));
        
        if (this.state === "GAS") {
            this.restitution = 0.85;
            this.dy -= 0.015 * speedMult; // daya apung gas lembut
            this.dx += (Math.random() - 0.5) * 0.06 * speedMult;
            this.dy += (Math.random() - 0.5) * 0.06 * speedMult;
            this.dx *= 0.995; // hambatan udara tipis
            this.dy *= 0.995;
        } else if (this.state === "CAIR") {
            this.restitution = 0.25;
            this.dy += 0.2; // jatuh lembut ke dasar
            if (currentTemp > -273) {
                let jitter = ((currentTemp + 273) * 0.00003);
                this.dx += (Math.random() - 0.5) * jitter;
                this.dy += (Math.random() - 0.5) * jitter;
            }
            this.dx *= 0.95; // viskositas cairan
            this.dy *= 0.95;
        } else {
            // PADAT
            this.restitution = 0.1;
            this.dy += 0.35; // gravitasi padat
            this.dx *= 0.88; // friksi padatan
            this.dy *= 0.88;
        }
        
        let v = Math.hypot(this.dx, this.dy);
        const maxSpeed = 3.2; // Batas kecepatan maksimal yang nyaman dipandang
        if (v > maxSpeed) {
            this.dx = (this.dx / v) * maxSpeed;
            this.dy = (this.dy / v) * maxSpeed;
        }
        
        if (isNaN(this.dx) || !isFinite(this.dx)) this.dx = 0;
        if (isNaN(this.dy) || !isFinite(this.dy)) this.dy = 0;

        this.x += this.dx;
        this.y += this.dy;
        
        if (isNaN(this.x) || !isFinite(this.x)) this.x = Math.random() * (canvas.width - 100) + 50;
        if (isNaN(this.y) || !isFinite(this.y)) this.y = Math.random() * (canvas.height - 100) + 50;
        
        if (this.x - this.radius < 0) { this.x = this.radius; this.dx *= -this.restitution; }
        if (this.x + this.radius > canvas.width) { this.x = canvas.width - this.radius; this.dx *= -this.restitution; }
        if (this.y - this.radius < 0) { this.y = this.radius; this.dy *= -this.restitution; }
        if (this.y + this.radius > canvas.height) { this.y = canvas.height - this.radius; this.dy *= -this.restitution; }
    }

    draw() {
        // Tentukan kanvas target: Jika zat cair dan liquidCtx tersedia, gunakan liquidCtx
        let targetCtx = (this.state === "CAIR" && typeof liquidCtx !== 'undefined' && liquidCtx !== null) ? liquidCtx : ctx;
        
        // Break illusion of liquid if zoomed in
        if (window.camera.zoom >= 1.5) {
            targetCtx = ctx;
        }

        // --- DRAW EXPERIMENTAL COMPOSITE MOLECULE STRUCTURE ---
        // Jika atomData kurang dari 2 karena data lama di localStorage, pulihkan dari DB
        if (this.moleculeName && this.atomData.length <= 1 && window.DB && window.DB.moleculeAtoms) {
            let formula = this.moleculeName.split(' ')[0].trim();
            let foundKey = Object.keys(window.DB.moleculeAtoms).find(k => k.split(' ')[0] === formula);
            if (foundKey && window.DB.moleculeAtoms[foundKey].length > 1) {
                this.atomData = window.DB.moleculeAtoms[foundKey].map(sym => getAtomData(sym));
            }
        }

        let cleanMolFormula = this.moleculeName ? this.moleculeName.split(' ')[0].trim() : this.atomData.map(a => a.symbol).join('');

        // Dukung SEMUA molekul majemuk (termasuk molekul panjang seperti H2SO4, Na2SO4, C2H5OH, dll)
        if (this.atomData.length > 1) {
            try {
                // Cari atom pusat (valensi tertinggi, atau atom pertama jika sama)
                let sortedAtoms = [...this.atomData].sort((a, b) => getValence(b.symbol) - getValence(a.symbol));
                let centerAtom = sortedAtoms[0];
                let branches = sortedAtoms.slice(1);

                // Ukuran radius visual atom penyusun di dalam molekul
                const getSubRadius = (sym, mass) => {
                    let m = mass || 1;
                    if (m <= 10) return 10;
                    if (m <= 30) return 13;
                    if (m <= 50) return 15;
                    return 17;
                };

                let centerR = getSubRadius(centerAtom.symbol, centerAtom.mass);

                // Tentukan sudut geometri alami
                let angles = [];
                if (branches.length === 1) {
                    angles = [0];
                } else if (branches.length === 2) {
                    if (cleanMolFormula === 'CO2') {
                        angles = [0, Math.PI]; // Linear 180°
                    } else {
                        // H2O: Bent ~104.5°
                        let halfAngle = (104.5 * Math.PI) / 360;
                        angles = [-halfAngle, halfAngle];
                    }
                } else if (branches.length === 3) {
                    // NH3: Trigonal
                    angles = [-Math.PI * 0.45, Math.PI * 0.45, Math.PI];
                } else if (branches.length === 4) {
                    // CH4: Tetrahedral projection
                    angles = [-Math.PI * 0.35, Math.PI * 0.35, Math.PI * 0.75, -Math.PI * 0.75];
                } else {
                    let step = (Math.PI * 2) / branches.length;
                    for (let i = 0; i < branches.length; i++) angles.push(i * step);
                }

                targetCtx.save();
                targetCtx.translate(this.x, this.y);
                targetCtx.rotate((Date.now() * 0.0004) + (this.id * 1.2)); // Rotasi lambat dan estetik

                // 1. Gambar Tangan-Tangan Ikatan (Bond Arms)
                targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
                targetCtx.lineWidth = Math.max(2.5, this.radius * 0.12);
                targetCtx.lineCap = 'round';

                let branchPositions = [];
                // Jarak ikatan adaptif: untuk molekul dengan banyak cabang (seperti H2SO4 dengan 6 cabang), jaraknya meluas agar tidak bertabrakan
                let minCircumference = branches.length * 20;
                let neededDist = minCircumference / (2 * Math.PI);
                let defaultDist = centerR + 13;
                let bondDist = Math.max(defaultDist, neededDist);

                for (let i = 0; i < branches.length; i++) {
                    let bAtom = branches[i];
                    let branchR = getSubRadius(bAtom.symbol, bAtom.mass);
                    let ang = angles[i] !== undefined ? angles[i] : (i * (Math.PI * 2 / branches.length));
                    let bx = Math.cos(ang) * bondDist;
                    let by = Math.sin(ang) * bondDist;
                    branchPositions.push({ bAtom, bx, by, branchR });

                    targetCtx.beginPath();
                    targetCtx.moveTo(0, 0);
                    targetCtx.lineTo(bx, by);
                    targetCtx.stroke();
                }

                // 2. Gambar Atom Pusat (Sprite atau Fallback Lingkaran)
                let drawnCenter = false;
                if (window.AtomSpriteSystem && window.AtomSpriteSystem.enabled) {
                    drawnCenter = window.AtomSpriteSystem.drawAtom(targetCtx, centerAtom.symbol, 0, 0, centerR, this.id);
                }
                if (!drawnCenter) {
                    targetCtx.beginPath();
                    targetCtx.arc(0, 0, centerR, 0, Math.PI * 2);
                    targetCtx.fillStyle = centerAtom.color || '#3b82f6';
                    targetCtx.fill();
                    targetCtx.strokeStyle = 'rgba(255,255,255,0.4)';
                    targetCtx.stroke();
                }

                // 3. Gambar Atom Cabang (Sprite atau Fallback Lingkaran)
                for (let i = 0; i < branchPositions.length; i++) {
                    let bp = branchPositions[i];
                    let drawnBranch = false;
                    if (window.AtomSpriteSystem && window.AtomSpriteSystem.enabled) {
                        drawnBranch = window.AtomSpriteSystem.drawAtom(targetCtx, bp.bAtom.symbol, bp.bx, bp.by, bp.branchR, this.id + i + 1);
                    }
                    if (!drawnBranch) {
                        targetCtx.beginPath();
                        targetCtx.arc(bp.bx, bp.by, bp.branchR, 0, Math.PI * 2);
                        targetCtx.fillStyle = bp.bAtom.color || '#94a3b8';
                        targetCtx.fill();
                        targetCtx.strokeStyle = 'rgba(255,255,255,0.4)';
                        targetCtx.stroke();
                    }
                }

                targetCtx.restore();

                // 4. Label Nama Molekul di atas partikel (bersih tanpa shadow)
                ctx.save();
                ctx.translate(this.x, this.y - this.radius * 1.3);
                ctx.scale(1 / window.camera.zoom, 1 / window.camera.zoom);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(cleanMolFormula, 0, 0);
                ctx.restore();

                return; // Berhasil render molekul uji coba!
            } catch (err) {
                console.warn("Fallback rendering molekul karena:", err);
                // Jika ada kendala, otomatis lanjut ke rendering default di bawah tanpa crash!
            }
        }

        // --- DRAW VALENCE BONDS (TANGAN ATOM) ---
        if (this.atomData.length === 1 && this.state !== "CAIR") {
            let valence = getValence(this.atomData[0].symbol);
            if (valence > 0) {
                targetCtx.save();
                targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                targetCtx.lineWidth = Math.max(2, this.radius * 0.15);
                targetCtx.lineCap = 'round';
                
                // Animasi rotasi lambat
                let timeOffset = Date.now() * 0.001 * 0.5;
                let baseAngle = timeOffset + (this.id * 0.5);
                let angleStep = (Math.PI * 2) / valence;
                
                for (let i = 0; i < valence; i++) {
                    let angle = baseAngle + (i * angleStep);
                    let startX = this.x + Math.cos(angle) * (this.radius * 0.8);
                    let startY = this.y + Math.sin(angle) * (this.radius * 0.8);
                    let endX = this.x + Math.cos(angle) * (this.radius * 1.5);
                    let endY = this.y + Math.sin(angle) * (this.radius * 1.5);
                    
                    targetCtx.beginPath();
                    targetCtx.moveTo(startX, startY);
                    targetCtx.lineTo(endX, endY);
                    targetCtx.stroke();
                }
                targetCtx.restore();
            }
        }

        let drawnWithSprite = false;
        if (this.atomData.length === 1) {
            drawnWithSprite = window.AtomSpriteSystem.drawAtom(targetCtx, this.atomData[0].symbol, this.x, this.y, this.radius, this.id);
        }

        if (!drawnWithSprite) {
            targetCtx.beginPath();
            targetCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            
            let gradient = targetCtx.createRadialGradient(
                this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.1,
                this.x, this.y, this.radius
            );
            gradient.addColorStop(0, '#ffffff');
            try {
                gradient.addColorStop(1, this.color || '#64748b');
            } catch (err) {
                gradient.addColorStop(1, '#64748b');
            }
            
            targetCtx.fillStyle = gradient;
            targetCtx.fill();
            
            // Garis tepi putih pudar untuk efek 3D
            targetCtx.strokeStyle = 'rgba(255,255,255,0.3)';
            targetCtx.lineWidth = 1;
            targetCtx.stroke();
        }

        // --- LABEL NAMA ATOM / MOLEKUL ---
        // Gambar teks jika ini molekul ATAU jika sprite tidak aktif (agar simbol di pixel art tidak tertumpuk)
        if (this.moleculeName || !drawnWithSprite) {
            ctx.fillStyle = '#ffffff';
            let fontSize = Math.max(8, Math.min(11, Math.floor(this.radius * 0.75)));
            ctx.font = `bold ${fontSize}px Inter`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let displayLabel = this.moleculeName ? this.moleculeName.split(' ')[0] : this.label;
            if (displayLabel.length > 5) displayLabel = displayLabel.substring(0,5) + '..';
            
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.scale(1 / window.camera.zoom, 1 / window.camera.zoom);
            ctx.fillText(displayLabel, 0, 0);
            ctx.restore();
        }
    }
}

function applyReactionHeat(deltaH_kJ, numReactions = 1) {
    if (deltaH_kJ === null || deltaH_kJ === undefined) return 0;
    
    // P1.7: Kalor reaksi nyata: ΔT = −(ΔH · 1000 · N0) / Σ(nᵢ · Cpᵢ)
    const N0 = 0.01; // mol per partikel (konstanta simulasi)
    
    let totalHeatCap = 0;
    particles.forEach(p => {
        let mol = DB.molecules ? DB.molecules.find(m => m.label === p.label) : null;
        let cp = (mol && mol.heat_capacity) ? mol.heat_capacity : 75.3; // Default 75.3 J/(mol·K)
        totalHeatCap += N0 * cp;
    });
    // Inersia termal minimum agar reaksi 2 partikel tidak meledak ke ribuan derajat
    if (totalHeatCap < 8.0) totalHeatCap = 8.0;

    // Eksotermik (deltaH < 0) menaikkan suhu (+); Endotermik (deltaH > 0) menurunkan suhu (-)
    let deltaT = -(deltaH_kJ * 1000.0 * N0 * numReactions) / totalHeatCap;
    
    // Batas kenaikan suhu yang nyaman (+30 °C / -30 °C per reaksi)
    const clampedDelta = Math.min(Math.max(deltaT, -30.0), 30.0);
    currentTemp += clampedDelta;
    
    // Batas bawah nol mutlak (-273.15 °C)
    if (currentTemp < -273.15) currentTemp = -273.15;
    
    const tempEl = document.getElementById('tempValue');
    if (tempEl) tempEl.textContent = currentTemp.toFixed(1);
    
    return clampedDelta;
}

function checkChemistry(p1, p2, spatialGrid) {
    let rReaction = DB.reactionMap ? DB.reactionMap.get(`${p1.label}::${p2.label}`) : DB.reactions.find(r => 
        (r.r1 === p1.label && r.r2 === p2.label) || 
        (r.r1 === p2.label && r.r2 === p1.label)
    );
    
    if (rReaction) {
        let effectiveMinTemp = rReaction.min_temp;
        
        // Cek Katalis secara radius
        if (rReaction.catalyst) {
            let catalystFound = false;
            let mx = (p1.x + p2.x)/2;
            let my = (p1.y + p2.y)/2;
            
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    let cellKey = `${p1._gridX + dx},${p1._gridY + dy}`;
                    let cell = spatialGrid.get(cellKey);
                    if (cell) {
                        for (let cp of cell) {
                            let isCatalyst = false;
                            if (rReaction.catalyst.includes('(')) {
                                isCatalyst = (cp.label === rReaction.catalyst);
                            } else {
                                isCatalyst = (!cp.moleculeName && cp.atomData[0].symbol === rReaction.catalyst);
                            }
                            
                            if (cp !== p1 && cp !== p2 && isCatalyst) {
                                let dist = Math.hypot(mx - cp.x, my - cp.y);
                                if (dist <= 60) {
                                    catalystFound = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (catalystFound) break;
            }
        if (catalystFound && rReaction.min_temp_catalyzed !== null) {
                effectiveMinTemp = rReaction.min_temp_catalyzed;
            }
        }
        
        // --- REALISTIC ARRHENIUS PROBABILITY (P0 Item 4) ---
        const NON_METALS = new Set(['H', 'C', 'N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I', 'He', 'Ne', 'Ar']);
        let isP1Metal = p1.atomData.some(a => !NON_METALS.has(a.symbol));
        let isP2Metal = p2.atomData.some(a => !NON_METALS.has(a.symbol));
        let isAcidBaseReaction = (DB.moleculeAcidBase[p1.label] && DB.moleculeAcidBase[p2.label]);
        let isIonic = isP1Metal || isP2Metal || isAcidBaseReaction;
        
        let isP1Radical = DB.molecules.find(m => m.label === p1.label)?.is_intermediate === 1;
        let isP2Radical = DB.molecules.find(m => m.label === p2.label)?.is_intermediate === 1;
        
        let baseRate = (isIonic || isP1Radical || isP2Radical) ? 1.0 : 0.20;
        let ea_val = rReaction.ea_kj_mol || 50.0;
        
        // Arrhenius: tepat Pbase pada min_temp, naik di atasnya, dan turun halus di bawahnya
        const T_curr = Math.max(1.0, currentTemp + 273.15);
        const Tr_ref = Math.max(1.0, effectiveMinTemp + 273.15);
        const R_const = 8.314;
        let prob = Math.min(1.0, baseRate * Math.exp((ea_val * 1000.0 / R_const) * (1.0 / Tr_ref - 1.0 / T_curr)));
        
        if (Math.random() <= prob) {
            return { 
                type: 'COMPLEX', 
                products: rReaction.products, 
                is_exothermic: rReaction.delta_H_kJ ? rReaction.delta_H_kJ < 0 : true,
                delta_H_kJ: rReaction.delta_H_kJ
            };
        }
    }
    
    // 2. Cek Sintesis Dasar (Termasuk penggabungan Radikal + Atom)
    let combinedSymbols = p1.atomData.map(a => a.symbol).concat(p2.atomData.map(a => a.symbol));
    let signature = combinedSymbols.sort().join(',');
    let molName = DB.knownMolecules[signature];
    
    if (molName) {
            let c1 = p1.atomData.reduce((s, a) => s + a.charge, 0);
            let c2 = p2.atomData.reduce((s, a) => s + a.charge, 0);
            if (c1 !== 0 && c2 !== 0 && c1 + c2 === 0) {
                return { type: 'SYNTHESIS', products: [molName], is_exothermic: true, delta_H_kJ: -50.0 };
            } else if (currentTemp >= 300) {
                return { type: 'SYNTHESIS', products: [molName], is_exothermic: true, delta_H_kJ: -50.0 };
            }
        }
    return null;
}

function areParticlesRelated(p1, p2) {
    if (DB.reactionMap && DB.reactionMap.has(`${p1.label}::${p2.label}`)) return true;
    
    if (DB.catalystMap) {
        let catKey1 = p2.moleculeName ? p2.label : (p2.atomData.length === 1 ? p2.atomData[0].symbol : p2.label);
        let catKey2 = p1.moleculeName ? p1.label : (p1.atomData.length === 1 ? p1.atomData[0].symbol : p1.label);
        
        if (DB.catalystMap.has(`${p1.label}::${catKey1}`)) return true;
        if (DB.catalystMap.has(`${p2.label}::${catKey2}`)) return true;
        if (DB.catalystMap.has(`${p1.label}::${p2.label}`)) return true;
        if (DB.catalystMap.has(`${p2.label}::${p1.label}`)) return true;
    }
    return false;
}

const CELL_SIZE = 250;
const spatialGrid = new Map();

function resolveCollisions() {
    let toRemove = new Set();
    let toAdd = [];
    
    // Spatial Partitioning Grid (Cell Size = 80)
    spatialGrid.clear();
    
    particles.forEach(p => {
        let cx = Math.floor(p.x / CELL_SIZE);
        let cy = Math.floor(p.y / CELL_SIZE);
        let key = `${cx},${cy}`;
        let cell = spatialGrid.get(key);
        if (!cell) {
            cell = [];
            spatialGrid.set(key, cell);
        }
        cell.push(p);
        p._gridX = cx;
        p._gridY = cy;
    });
    
    let checkedPairs = new Set();
    
    for (let p1 of particles) {
        if (toRemove.has(p1)) continue;
        
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                let neighborKey = `${p1._gridX + dx},${p1._gridY + dy}`;
                let cell = spatialGrid.get(neighborKey);
                
                if (cell) {
                    for (let p2 of cell) {
                        if (p1 === p2 || toRemove.has(p2)) continue;
                        
                        let pairId = p1.id < p2.id ? `${p1.id}-${p2.id}` : `${p2.id}-${p1.id}`;
                        if (checkedPairs.has(pairId)) continue;
                        checkedPairs.add(pairId);
                        
                        let distX = p1.x - p2.x;
                        let distY = p1.y - p2.y;
                        let dist = Math.hypot(distX, distY);
                        let minDist = p1.radius + p2.radius;
                        
                        // --- GAYA TARIK KIMIA (CHEMICAL ATTRACTION) ---
                        // Tarikan halus hanya saat partikel sudah cukup dekat (radius 35 px dari batas tabrakan)
                        const ATTRACTION_RANGE = 35;
                        if (dist >= minDist && dist < minDist + ATTRACTION_RANGE) {
                            if (areParticlesRelated(p1, p2)) {
                                let pullFactor = (1 - (dist - minDist) / ATTRACTION_RANGE);
                                let pullSpeed = 0.4 * pullFactor; 
                                let nx = dist > 0 ? (distX / dist) : 1;
                                let ny = dist > 0 ? (distY / dist) : 0;
                                
                                p1.x -= nx * pullSpeed;
                                p1.y -= ny * pullSpeed;
                                p2.x += nx * pullSpeed;
                                p2.y += ny * pullSpeed;
                            }
                        }
                        
                        if (dist < minDist) {
                            // Check Chemistry dengan Passing Grid (untuk Katalis)
                            let reaction = checkChemistry(p1, p2, spatialGrid);
                            if (reaction) {
                                toRemove.add(p1);
                                toRemove.add(p2);
                                
                                // Kalkulasi Panas & Termodinamika
                                let dTemp = applyReactionHeat(reaction.delta_H_kJ, 1);
                                
                                // VFX Screen Shake & Audio
                                if (Math.abs(reaction.delta_H_kJ) > 20) {
                                    playBoomSFX(reaction.delta_H_kJ);
                                    let container = document.querySelector('.app-container');
                                    if (container) {
                                        container.classList.remove('bump-active');
                                        void container.offsetWidth; // trigger reflow
                                        container.classList.add('bump-active');
                                    }
                                }
                                
                                let sign = dTemp > 0 ? "+" : "";
                                let heatStr = dTemp ? ` (Hasil: ${sign}${dTemp.toFixed(1)}°C)` : "";
                                let enthalpyStr = (reaction.delta_H_kJ !== null && reaction.delta_H_kJ !== undefined) ? `[Energi: ${reaction.delta_H_kJ > 0 ? '+' : ''}${reaction.delta_H_kJ} kJ]` : "";
                                
                                let r1Name = p1.label.split(' ')[0];
                                let r2Name = p2.label.split(' ')[0];
                                let productNames = reaction.products.map(p => p.split(' ')[0]).join(' + ');
                                
                                let msg = `💥 ${r1Name} + ${r2Name} -> ${productNames} | Suhu: ${currentTemp.toFixed(1)}°C | ${enthalpyStr}${heatStr}`;
                                showToast(msg);
                                
                                let mx = (p1.x + p2.x)/2;
                                let my = (p1.y + p2.y)/2;
                                
                                // P2.12: Batasi kilatan cahaya maksimum 3 per detik (WCAG 2.3.1)
                                if (canTriggerFlash()) {
                                    flashes.push(new ReactionFlash(mx, my, reaction.is_exothermic, dTemp));
                                }
                                
                                // Spawn visual effects
                                let isAqueous = reaction.products.some(p => p.includes("Air") || p.includes("Asam") || p.includes("Hidroksida"));
                                let vfxType = isAqueous ? 'bubble' : 'smoke';
                                for(let i=0; i<8; i++) {
                                    visualEffects.push(new VisualEffect(mx, my, vfxType));
                                }
                                
                                reaction.products.forEach(prodName => {
                                    let atoms = DB.moleculeAtoms[prodName] || ['C'];
                                    toAdd.push(new Particle(atoms, mx, my, prodName));
                                    
                                    // TRIGGER QUEST ENGINE DISCOVERY
                                    if (window.QuestEngine) {
                                        window.QuestEngine.checkDiscovery(prodName);
                                    }
                                });
                                continue;
                            }
                            
                            // Physics Elastic Bounce
                            let nx = dist === 0 ? 1 : distX / dist;
                            let ny = dist === 0 ? 0 : distY / dist;
                            let overlap = minDist - dist;
                            p1.x += nx * overlap / 2;
                            p1.y += ny * overlap / 2;
                            p2.x -= nx * overlap / 2;
                            p2.y -= ny * overlap / 2;
                            
                            let rvx = p1.dx - p2.dx;
                            let rvy = p1.dy - p2.dy;
                            let velAlongNormal = rvx * nx + rvy * ny;
                            
                            if (velAlongNormal > 0) continue;
                            
                            let m1 = (p1.mass && !isNaN(p1.mass) && p1.mass > 0) ? p1.mass : 12;
                            let m2 = (p2.mass && !isNaN(p2.mass) && p2.mass > 0) ? p2.mass : 12;
                            let e = Math.min(p1.restitution, p2.restitution);
                            let j_impulse = -(1 + e) * velAlongNormal;
                            let invMassSum = (1 / m1) + (1 / m2);
                            if (invMassSum > 0) {
                                j_impulse /= invMassSum;
                                let impulseX = j_impulse * nx;
                                let impulseY = j_impulse * ny;
                                
                                p1.dx += impulseX / m1;
                                p1.dy += impulseY / m1;
                                p2.dx -= impulseX / m2;
                                p2.dy -= impulseY / m2;
                            }
                        }
                    }
                }
            }
        }
    }
    
    particles = particles.filter(p => !toRemove.has(p));
    particles.push(...toAdd);
    
    while (particles.length > MAX_PARTICLES) {
        particles.shift();
    }
}

const Kw = 1e-14;
function calculatePH(nH, nOH, V = 1.0) {
    // P0.5: Skala pH logaritmik nyata menggunakan Kw dan net konsentrasi H+/OH-
    const net = (nH - nOH) / V;
    const s = Math.sqrt(net * net + 4.0 * Kw);
    const h = net >= 0 ? (net + s) / 2.0 : Kw / ((-net + s) / 2.0);
    return Math.min(14.0, Math.max(0.0, -Math.log10(h)));
}

function updatePHIndicator() {
    const N0 = 0.01; // mol per partikel (konstanta simulasi)
    const V = 1.0;   // 1 Liter wadah simulasi
    
    let nH = 0;
    let nOH = 0;
    
    particles.forEach(p => {
        let mol = DB.molecules ? DB.molecules.find(m => m.label === p.label) : null;
        let f = (mol && mol.ionization_factor !== null && mol.ionization_factor !== undefined) ? mol.ionization_factor : 1.0;
        let h_count = mol ? (mol.h_count || 0) : 0;
        let oh_count = mol ? (mol.oh_count || 0) : 0;
        
        if (h_count === 0 && DB.moleculeAcidBase[p.label] === 'ACID') h_count = 1;
        if (oh_count === 0 && DB.moleculeAcidBase[p.label] === 'BASE') oh_count = 1;
        
        nH += h_count * f * N0;
        nOH += oh_count * f * N0;
    });

    const targetPH = calculatePH(nH, nOH, V);
    currentPH += (targetPH - currentPH) * 0.03; 
    const pH = currentPH;

    let targetR = 255, targetG = 255, targetB = 255;
    
    if (pH < 3) { targetR = 255; targetG = 20; targetB = 20; }      
    else if (pH < 5) { targetR = 255; targetG = 100; targetB = 100; } 
    else if (pH < 6.5) { targetR = 255; targetG = 180; targetB = 80; } 
    else if (pH <= 7.5) { targetR = 255; targetG = 255; targetB = 255; } 
    else if (pH <= 9) { targetR = 100; targetG = 180; targetB = 255; } 
    else if (pH <= 11) { targetR = 60; targetG = 80; targetB = 255; } 
    else { targetR = 80; targetG = 0; targetB = 200; }             

    currentBg.r += (targetR - currentBg.r) * 0.02;
    currentBg.g += (targetG - currentBg.g) * 0.02;
    currentBg.b += (targetB - currentBg.b) * 0.02;

    const wrapper = document.querySelector('.canvas-wrapper');
    if (wrapper) {
        if (pH > 6.8 && pH < 7.2) {
             wrapper.style.backgroundColor = `rgba(255, 255, 255, 0.05)`; 
        } else {
             wrapper.style.backgroundColor = `rgba(${Math.round(currentBg.r)}, ${Math.round(currentBg.g)}, ${Math.round(currentBg.b)}, 0.25)`;
        }
    }

    // P2.13: Tampilkan angka pH visual
    const phValEl = document.getElementById('phValue');
    const phStatusEl = document.getElementById('phStatus');
    if (phValEl) phValEl.textContent = pH.toFixed(2);
    if (phStatusEl) {
        if (pH < 6.8) phStatusEl.textContent = 'Asam';
        else if (pH > 7.2) phStatusEl.textContent = 'Basa';
        else phStatusEl.textContent = 'Netral';
    }
}

// P1.6: Fixed Timestep 60 Hz Physics Loop
const FIXED_STEP = 1.0 / 60.0;
let physicsAccumulator = 0;
let lastFrameTimestamp = performance.now();

function updatePhysicsStep() {
    // Thermal Conductivity (Newton's Law of Cooling)
    let diff = targetTemp - currentTemp;
    let step = diff * 0.04;
    if (step > 4.0) step = 4.0; 
    if (step < -8.0) step = -8.0;
    currentTemp += step;
    
    // Tampilkan suhu aktual kanvas secara langsung
    const tempEl = document.getElementById('tempValue');
    if (tempEl) tempEl.textContent = currentTemp.toFixed(1);
    
    updatePHIndicator();
    particles.forEach(p => p.updatePhysics());
    resolveCollisions();
}

function animate(now = performance.now()) {
    try {
        let dt = Math.min(0.1, (now - lastFrameTimestamp) / 1000.0);
        lastFrameTimestamp = now;
        physicsAccumulator += dt;
        
        while (physicsAccumulator >= FIXED_STEP) {
            updatePhysicsStep();
            physicsAccumulator -= FIXED_STEP;
        }

        window.camera.zoom += (window.camera.targetZoom - window.camera.zoom) * 0.15;
        window.camera.x += (window.camera.targetX - window.camera.x) * 0.15;
        window.camera.y += (window.camera.targetY - window.camera.y) * 0.15;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (liquidCtx) liquidCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        if (liquidCtx) liquidCtx.save();
        
        ctx.translate(window.camera.x, window.camera.y);
        ctx.scale(window.camera.zoom, window.camera.zoom);
        
        if (liquidCtx) {
            liquidCtx.translate(window.camera.x, window.camera.y);
            liquidCtx.scale(window.camera.zoom, window.camera.zoom);
        }
        
        // Draw Particles
        particles.forEach(p => p.draw());
        
        // Draw Flashes (P2.12: Hormati prefers-reduced-motion)
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        flashes.forEach(f => {
            f.update();
            if (!prefersReducedMotion) {
                f.draw();
            }
        });
        flashes = flashes.filter(f => f.alpha > 0);
        
        // Draw VFX Particles
        visualEffects.forEach(v => {
            v.update();
            v.draw();
        });
        visualEffects = visualEffects.filter(v => v.life > 0);
        
        // --- THERMAL VISUAL CUES ---
        if (currentTemp > 80) {
            let intensity = Math.min((currentTemp - 80) / 200, 1.0);
            
            // Embers / Heat wave overlay
            ctx.save();
            ctx.fillStyle = `rgba(255, 60, 0, ${0.05 * intensity})`;
            ctx.fillRect(0, canvas.height - 50 * intensity, canvas.width, 50 * intensity);
            
            // Spawn heat distortion / embers
            if (Math.random() < 0.2 * intensity && particles.length > 0) {
                let px = Math.random() * canvas.width;
                let py = canvas.height - Math.random() * 20;
                let vfx = new VisualEffect(px, py, 'smoke');
                vfx.color = '255, 100, 0';
                vfx.life = 0.5 + Math.random() * 0.5;
                visualEffects.push(vfx);
            }
            ctx.restore();
        } else if (currentTemp < 0) {
            let intensity = Math.min(Math.abs(currentTemp) / 100, 1.0);
            
            // Frost border vignette
            ctx.save();
            ctx.strokeStyle = `rgba(200, 240, 255, ${0.4 * intensity})`;
            ctx.lineWidth = 15 * intensity;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
            
            // Spawn frost / ice crystals
            if (Math.random() < 0.1 * intensity && particles.length > 0) {
                let px = Math.random() * canvas.width;
                let py = canvas.height - Math.random() * 20;
                let vfx = new VisualEffect(px, py, 'smoke');
                vfx.color = '200, 240, 255';
                vfx.vx = (Math.random() - 0.5) * 0.5;
                vfx.vy = Math.random() * 0.5 + 0.1;
                vfx.life = 0.8 + Math.random() * 0.5;
                visualEffects.push(vfx);
            }
            ctx.restore();
        }
        
        // Live update Info Panel
        if (selectedParticle) {
            if (!particles.includes(selectedParticle)) {
                selectedParticle = null;
                document.getElementById('particleInfo').classList.add('hidden');
            } else {
                let molData = DB.molecules ? DB.molecules.find(m => m.label === selectedParticle.label) : null;
                document.getElementById('infoName').textContent = selectedParticle.label;
                document.getElementById('infoCurrentTemp').textContent = currentTemp.toFixed(1) + ' °C';
                document.getElementById('infoMolarMass').textContent = (molData && molData.molar_mass) ? molData.molar_mass.toFixed(2) + ' g/mol' : selectedParticle.mass.toFixed(2) + ' g/mol (Kalkulasi)';
                document.getElementById('infoDensity').textContent = (molData && molData.density) ? molData.density + ' g/cm³' : 'N/A';
                document.getElementById('infoMP').textContent = (selectedParticle.current_mp !== undefined && selectedParticle.current_mp !== null ? selectedParticle.current_mp.toFixed(1) + ' °C' : "N/A (Sublimasi/Radikal)");
                document.getElementById('infoBP').textContent = (selectedParticle.current_bp !== undefined && selectedParticle.current_bp !== null && selectedParticle.current_bp !== Infinity ? selectedParticle.current_bp.toFixed(1) + ' °C' : "N/A (Terurai/Radikal)");
                document.getElementById('infoPhase').textContent = selectedParticle.state;
                
                let abType = DB.moleculeAcidBase[selectedParticle.label];
                let abText = "Netral";
                if (abType === 'ACID') abText = "Asam";
                else if (abType === 'BASE') abText = "Basa";
                document.getElementById('infoAcidBase').textContent = abText;
                
                let bondText = molData && molData.bond_type ? molData.bond_type : "Tidak Diketahui";
                document.getElementById('infoBondType').textContent = bondText;
                document.getElementById('infoIUPAC').textContent = (molData && molData.iupac_name) ? molData.iupac_name : "N/A";
                document.getElementById('infoExactMass').textContent = (molData && molData.exact_mass) ? molData.exact_mass.toFixed(4) + ' Da' : "N/A";
            }
        }
        
        ctx.restore();
        if (liquidCtx) liquidCtx.restore();
    } catch (err) {
        console.error("Simulation error in animate:", err);
        try {
            ctx.restore();
            if (liquidCtx) liquidCtx.restore();
        } catch (_) {}
    }
    
    requestAnimationFrame(animate);
}

// Fitur Export/Import State Kanvas (Auto-Save partikel)
window.getCanvasState = function() {
    return {
        temp: currentTemp,
        targetTemp: targetTemp,
        press: currentPress,
        particles: particles.map(p => ({
            atomSymbols: p.atomData.map(a => a.symbol),
            moleculeName: p.moleculeName,
            x: p.x,
            y: p.y,
            dx: p.dx,
            dy: p.dy,
            state: p.state
        }))
    };
};

window.restoreCanvasState = function(savedData) {
    if (!savedData) return;
    
    if (savedData.temp !== undefined) {
        currentTemp = savedData.temp || 25.0;
        targetTemp = savedData.targetTemp !== undefined ? savedData.targetTemp : 25.0;
        const tempEl = document.getElementById('tempValue');
        const tempSl = document.getElementById('tempSlider');
        if (tempEl) tempEl.textContent = targetTemp.toFixed(0);
        if (tempSl) tempSl.value = targetTemp.toFixed(0);
    }
    
    if (savedData.press !== undefined) {
        currentPress = savedData.press;
        const pressEl = document.getElementById('pressValue');
        const pressSl = document.getElementById('pressSlider');
        if (pressEl) pressEl.textContent = currentPress.toFixed(1);
        if (pressSl) pressSl.value = currentPress.toFixed(1);
    }
    
    if (savedData.particles && Array.isArray(savedData.particles)) {
        particles = [];
        savedData.particles.forEach(sp => {
            let p = new Particle(sp.atomSymbols, sp.x, sp.y, sp.moleculeName);
            p.dx = sp.dx !== undefined ? sp.dx : ((Math.random() - 0.5) * 4) / 1.5;
            p.dy = sp.dy !== undefined ? sp.dy : ((Math.random() - 0.5) * 4) / 1.5;
            if (sp.state) p.state = sp.state;
            particles.push(p);
        });
    }
};

// Event Listeners
const tempSliderEl = document.getElementById('tempSlider');

if (tempSliderEl) {
    tempSliderEl.addEventListener('input', (e) => {
        targetTemp = parseFloat(e.target.value);
        // Jika selisih suhu besar, percepat sinkronisasi awal
        if (Math.abs(currentTemp - targetTemp) > 100) {
            currentTemp += (targetTemp - currentTemp) * 0.25;
        }
        const tempEl = document.getElementById('tempValue');
        if (tempEl) tempEl.textContent = currentTemp.toFixed(1);
    });
}

document.getElementById('pressSlider').addEventListener('input', (e) => {
    currentPress = parseFloat(e.target.value);
    document.getElementById('pressValue').textContent = currentPress.toFixed(1);
});

document.getElementById('clearBtn').addEventListener('click', () => {
    particles = [];
    currentTemp = 25.0;
    targetTemp = 25.0;
    currentPress = 1.0;
    
    const tempEl = document.getElementById('tempValue');
    const tempSl = document.getElementById('tempSlider');
    if (tempEl) tempEl.textContent = '25.0';
    if (tempSl) tempSl.value = '25';
    
    const pressEl = document.getElementById('pressValue');
    const pressSl = document.getElementById('pressSlider');
    if (pressEl) pressEl.textContent = '1.0';
    if (pressSl) pressSl.value = '1';
    
    currentPH = 7.0;
    updatePHIndicator();
    
    if (window.QuestEngine) window.QuestEngine.saveProgress();
    showToast("Meja lab dikosongkan. Suhu disetel ke 25 °C, Tekanan 1.0 atm.");
});

document.getElementById('addAtomBtn').addEventListener('click', () => {
    let inputOriginal = document.getElementById('atomInput').value.trim();
    if (!inputOriginal) return;
    
    let inputUpper = inputOriginal.toUpperCase();
    let matchedLabel = null;
    let atomSymbols = [];
    
    let foundAtom = DB.periodicTable.find(a => a.symbol.toUpperCase() === inputUpper);
    if (foundAtom) {
        atomSymbols = [foundAtom.symbol];
    } else {
        matchedLabel = Object.keys(DB.moleculeAtoms).find(lbl => lbl.split(' ')[0].toUpperCase() === inputUpper);
        if (matchedLabel) {
            atomSymbols = DB.moleculeAtoms[matchedLabel];
        }
    }
    
    // VALIDASI QUEST SYSTEM: Cek apakah input terkunci
    let isUnlocked = false;
    let unlockedList = window.QuestEngine ? window.QuestEngine.state.unlockedAtoms : [];
    if (matchedLabel && unlockedList.includes(matchedLabel)) isUnlocked = true;
    else if (!matchedLabel && atomSymbols.length === 1 && unlockedList.includes(atomSymbols[0])) isUnlocked = true;
    
    if (atomSymbols.length === 0) {
        alert("❌ Atom atau Senyawa tidak ditemukan! Pastikan ejaannya benar (contoh: H, HCl).");
        return;
    }

    if (!isUnlocked) {
        alert("🔒 Elemen atau Senyawa ini masih TERKUNCI! Selesaikan Misi untuk membukanya.");
        return;
    }
    
    if (atomSymbols.length > 0) {
        playPopSFX();
        particles.push(new Particle(atomSymbols, null, null, matchedLabel));
        if (window.QuestEngine) window.QuestEngine.saveProgress();

        // Micro-animation pada tombol Tambah: pulse effect
        const btn = document.getElementById('addAtomBtn');
        if (btn && window.anime) {
            anime({
                targets: btn,
                scale: [1, 1.15, 1],
                duration: 350,
                easing: 'spring(1, 80, 10, 0)'
            });
        }
    } else {
        alert("Atom/Molekul tidak ditemukan!");
    }
});

let selectedParticle = null;
let draggedParticle = null;

// Track mouse speed for throwing
let lastMouseX = 0;
let lastMouseY = 0;
let mouseVelocityX = 0;
let mouseVelocityY = 0;

let isPanning = false;
let panStartMouseX = 0;
let panStartMouseY = 0;
let panStartCameraX = 0;
let panStartCameraY = 0;

canvas.addEventListener('mousedown', (e) => {
    let { mx, my } = getCanvasPos(e.clientX, e.clientY);
    
    // Cari partikel dari atas ke bawah (z-index visual, min hit area 20px agar atom kecil tetap mudah diklik)
    selectedParticle = particles.slice().reverse().find(p => Math.hypot(p.x - mx, p.y - my) <= Math.max(20, p.radius * 1.5));
    const infoPanel = document.getElementById('particleInfo');
    
    if (selectedParticle) {
        infoPanel.classList.remove('hidden');
        draggedParticle = selectedParticle;
        
        lastMouseX = mx;
        lastMouseY = my;
    } else {
        infoPanel.classList.add('hidden');
        
        // Mulai Panning (geser layar)
        const rect = canvas.getBoundingClientRect();
        panStartMouseX = e.clientX - rect.left;
        panStartMouseY = e.clientY - rect.top;
        panStartCameraX = window.camera.targetX;
        panStartCameraY = window.camera.targetY;
        isPanning = true;
        
        let inputOriginal = document.getElementById('atomInput').value.trim();
        if (!inputOriginal) return;
        
        let inputUpper = inputOriginal.toUpperCase();
        let matchedLabel = null;
        let atomSymbols = [];
        
        let foundAtom = DB.periodicTable.find(a => a.symbol.toUpperCase() === inputUpper);
        if (foundAtom) {
            atomSymbols = [foundAtom.symbol];
        } else {
            matchedLabel = Object.keys(DB.moleculeAtoms).find(lbl => lbl.split(' ')[0].toUpperCase() === inputUpper);
            if (matchedLabel) {
                atomSymbols = DB.moleculeAtoms[matchedLabel];
            }
        }
        
        // VALIDASI QUEST SYSTEM
        let isUnlocked = false;
        let unlockedList = window.QuestEngine ? window.QuestEngine.state.unlockedAtoms : [];
        if (matchedLabel && unlockedList.includes(matchedLabel)) isUnlocked = true;
        else if (!matchedLabel && atomSymbols.length === 1 && unlockedList.includes(atomSymbols[0])) isUnlocked = true;
        
        if (atomSymbols.length === 0) {
            showToast("❌ Atom atau Senyawa tidak ditemukan!");
            return;
        }

        if (!isUnlocked) {
            showToast("🔒 Elemen ini masih terkunci!");
            return;
        }
        
        if (atomSymbols.length > 0) {
            playPopSFX();
            particles.push(new Particle(atomSymbols, mx, my, matchedLabel));
            if (window.QuestEngine) window.QuestEngine.saveProgress();
        }
    }
});

// Logic untuk Tangan (Drag & Throw)
canvas.addEventListener('mousemove', (e) => {
    let { mx, my } = getCanvasPos(e.clientX, e.clientY);

    if (draggedParticle) {
        // Kalkulasi kecepatan mouse untuk efek melempar
        mouseVelocityX = mx - lastMouseX;
        mouseVelocityY = my - lastMouseY;
        
        draggedParticle.x = mx;
        draggedParticle.y = my;
        draggedParticle.dx = 0;
        draggedParticle.dy = 0;
        
        lastMouseX = mx;
        lastMouseY = my;
    } else if (isPanning) {
        const rect = canvas.getBoundingClientRect();
        let currentMouseX = e.clientX - rect.left;
        let currentMouseY = e.clientY - rect.top;
        
        let dx = currentMouseX - panStartMouseX;
        let dy = currentMouseY - panStartMouseY;
        window.camera.targetX = panStartCameraX + dx;
        window.camera.targetY = panStartCameraY + dy;
        clampCamera();
    } else {
        // Ubah kursor menjadi tangan jika di atas partikel
        const hover = particles.some(p => Math.hypot(p.x - mx, p.y - my) <= Math.max(20, p.radius * 1.5));
        canvas.style.cursor = hover ? 'grab' : 'default';
    }
});

canvas.addEventListener('mouseup', () => {
    isPanning = false;
    if (draggedParticle) {
        // Berikan momentum lemparan
        draggedParticle.dx = (mouseVelocityX * 0.8) / 1.5;
        draggedParticle.dy = (mouseVelocityY * 0.8) / 1.5;
        draggedParticle = null;
        canvas.style.cursor = 'grab';
    }
});

canvas.addEventListener('mouseleave', () => {
    isPanning = false;
    if (draggedParticle) {
        draggedParticle = null;
    }
});

// Support untuk Touch Screen (HP)
let initialPinchDistance = null;
let initialZoom = 1.0;
let lastTouchCenterX = 0;
let lastTouchCenterY = 0;

canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        let dx = e.touches[0].clientX - e.touches[1].clientX;
        let dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance = Math.hypot(dx, dy);
        initialZoom = window.camera.targetZoom;
        
        const rect = canvas.getBoundingClientRect();
        let touchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        let touchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        lastTouchCenterX = touchCenterX - rect.left;
        lastTouchCenterY = touchCenterY - rect.top;
        return;
    }
    
    const touch = e.touches[0];
    let { mx, my } = getCanvasPos(touch.clientX, touch.clientY);
    
    selectedParticle = particles.slice().reverse().find(p => Math.hypot(p.x - mx, p.y - my) <= Math.max(25, p.radius * 2));
    const infoPanel = document.getElementById('particleInfo');
    
    if (selectedParticle) {
        infoPanel.classList.remove('hidden');
        draggedParticle = selectedParticle;
        lastMouseX = mx;
        lastMouseY = my;
        e.preventDefault(); // Mencegah scrolling saat drag
    } else {
        infoPanel.classList.add('hidden');
        
        // Mulai Panning untuk layar sentuh
        const rect = canvas.getBoundingClientRect();
        panStartMouseX = touch.clientX - rect.left;
        panStartMouseY = touch.clientY - rect.top;
        panStartCameraX = window.camera.targetX;
        panStartCameraY = window.camera.targetY;
        isPanning = true;
    }
}, {passive: false});

canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
        let dx = e.touches[0].clientX - e.touches[1].clientX;
        let dy = e.touches[0].clientY - e.touches[1].clientY;
        let dist = Math.hypot(dx, dy);
        if (initialPinchDistance) {
            let scale = dist / initialPinchDistance;
            
            let touchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            let touchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            
            const rect = canvas.getBoundingClientRect();
            let mouseX = touchCenterX - rect.left;
            let mouseY = touchCenterY - rect.top;
            
            let newZoom = Math.max(1.0, Math.min(initialZoom * scale, 5.0));
            
            // Hitung koordinat dunia berdasarkan posisi jari SEBELUM ini dan zoom saat ini
            let worldX = (lastTouchCenterX - window.camera.targetX) / window.camera.targetZoom;
            let worldY = (lastTouchCenterY - window.camera.targetY) / window.camera.targetZoom;

            window.camera.targetZoom = newZoom;
            // Pindahkan kamera agar worldX/Y tadi tepat jatuh di bawah posisi jari BARU (mouseX/Y)
            window.camera.targetX = mouseX - worldX * window.camera.targetZoom;
            window.camera.targetY = mouseY - worldY * window.camera.targetZoom;
            clampCamera();
            
            lastTouchCenterX = mouseX;
            lastTouchCenterY = mouseY;
        }
        e.preventDefault();
        return;
    }

    if (draggedParticle) {
        const touch = e.touches[0];
        let { mx, my } = getCanvasPos(touch.clientX, touch.clientY);

        mouseVelocityX = mx - lastMouseX;
        mouseVelocityY = my - lastMouseY;
        
        draggedParticle.x = mx;
        draggedParticle.y = my;
        draggedParticle.dx = 0;
        draggedParticle.dy = 0;
        
        lastMouseX = mx;
        lastMouseY = my;
        e.preventDefault();
    } else if (isPanning) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        let currentMouseX = touch.clientX - rect.left;
        let currentMouseY = touch.clientY - rect.top;
        
        let dx = currentMouseX - panStartMouseX;
        let dy = currentMouseY - panStartMouseY;
        window.camera.targetX = panStartCameraX + dx;
        window.camera.targetY = panStartCameraY + dy;
        clampCamera();
        e.preventDefault();
    }
}, {passive: false});

canvas.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
        initialPinchDistance = null;
        isPanning = false;
    }
    if (draggedParticle) {
        draggedParticle.dx = (mouseVelocityX * 0.8) / 1.5;
        draggedParticle.dy = (mouseVelocityY * 0.8) / 1.5;
        draggedParticle = null;
    }
});

// Zoom Mouse Wheel
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;
    
    let deltaZoom = Math.sign(e.deltaY) * -0.3;
    let newZoom = Math.max(1.0, Math.min(window.camera.targetZoom + deltaZoom, 5.0));
    
    let worldX = (mouseX - window.camera.targetX) / window.camera.targetZoom;
    let worldY = (mouseY - window.camera.targetY) / window.camera.targetZoom;

    window.camera.targetZoom = newZoom;
    window.camera.targetX = mouseX - worldX * window.camera.targetZoom;
    window.camera.targetY = mouseY - worldY * window.camera.targetZoom;
    clampCamera();
}, {passive: false});

initDB().then(() => {
    if (window.QuestEngine) {
        window.QuestEngine.init();
    }
    animate();
});

// ==========================================
// EFEK UI PREMIUM: CONFETTI (Anime.js)
// ==========================================
window.shootConfetti = function() {
    if (!window.anime) return;
    
    const colors = ['#fbbf24', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa'];
    const fragments = 80; // Jumlah partikel confetti
    
    for (let i = 0; i < fragments; i++) {
        const el = document.createElement('div');
        el.style.position = 'fixed';
        // Mulai dari tengah layar
        el.style.left = '50%';
        el.style.top = '40%';
        el.style.width = (Math.random() * 8 + 4) + 'px';
        el.style.height = (Math.random() * 8 + 4) + 'px';
        el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        // Bentuk acak (lingkaran atau persegi panjang)
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        el.style.zIndex = '999999';
        el.style.pointerEvents = 'none';
        document.body.appendChild(el);
        
        // Animasi sebaran ledakan (burst)
        anime({
            targets: el,
            translateX: () => anime.random(-300, 300),
            translateY: () => anime.random(-200, 400),
            scale: [0, 1.5, 0],
            rotate: () => anime.random(-360, 360),
            opacity: [1, 0],
            duration: () => anime.random(1000, 2500),
            easing: 'easeOutExpo',
            complete: () => el.remove() // Mencegah memory leak! Hapus setelah selesai
        });
    }
};
