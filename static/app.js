const canvas = document.getElementById('labCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let W = 0, H = 0, K = 4, bg = null, L = {}, tick = 0;
const COL = { H: "#f4f4f4", C: "#566c86", O: "#b13e53", N: "#3b5dc9", Cl: "#38b764", Na: "#7b5fd6", S: "#ffcd75" };
const PHC = ["#b13e53","#d3524a","#ef7d57","#f4a261","#ffcd75","#e8e36a","#a7f070","#38b764","#2fa586","#257179","#3b8fb5","#41a6f6","#3b5dc9","#5d4fb0","#5d275d"];
const FONT = "8px 'Press Start 2P', monospace";

// Fungsi pembantu persegi piksel
const R = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
};

// Fungsi pembantu piringan piksel tajam
function disc(cx, cy, r, c) {
    cx = Math.round(cx);
    cy = Math.round(cy);
    for (let dy = -r; dy <= r; dy++) {
        const hw = Math.round(Math.sqrt(r * r - dy * dy));
        ctx.fillStyle = c;
        ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
    }
}

// Batas pergerakan atom bebas di seluruh 1 canvas penuh
function bounds() {
    return {
        x0: 8,
        x1: Math.max(24, W - 8),
        y0: 8,
        y1: Math.max(24, H - 8)
    };
}

// Generator background ubin dinding + meja dari pixel_ui_preview.html
function buildBg(mk) {
    if (W <= 0 || H <= 0) return;
    bg = mk(W, H);
    const b = bg.getContext("2d");
    const r = (x, y, w, h, c) => { b.fillStyle = c; b.fillRect(x, y, w, h); };
    const { cx, cy } = L;
    const ts = 24;
    
    r(0, 0, W, H, "#1a2138");
    const x0 = (((cx - ts / 2) % ts) + ts) % ts - ts;
    for (let y = cy - ts; y > -ts; y -= ts) {
        for (let x = x0; x < W; x += ts) {
            r(x, y, ts, ts, "#1b2339");
            for (let dy = 5; dy < ts - 3; dy += 4) {
                for (let dx = 5 + ((dy >> 2) & 1) * 2; dx < ts - 3; dx += 4) {
                    r(x + dx, y + dy, 1, 1, "#222d4d");
                }
            }
            r(x, y, ts, 1, "#33467a");
            r(x, y, 1, ts, "#33467a");
            r(x, y + ts - 1, ts, 1, "#0e1326");
            r(x + ts - 1, y, 1, ts, "#0e1326");
        }
    }
    r(0, cy, W, 3, "#7a829f");
    r(0, cy + 3, W, H - cy - 3, "#4b5163");
    r(0, cy + 3, W, 1, "#5f6684");
    const y2 = cy + Math.round((H - cy) * 0.5);
    r(0, y2, W, H - y2, "#3a3e4d");
    r(0, y2, W, 1, "#2b2e3a");
}

let flick = 0, fi = 0;
function drawSign(g, R) {
    const s = L.sign;
    if (!s) return;
    const { sx, sy, sw, sh, fs } = s;
    const t = "LAB KIMIA";
    R(sx - 3, sy - 3, sw + 6, sh + 6, "#2a3f8f");
    R(sx - 1, sy - 1, sw + 2, sh + 2, "#dfe7ff");
    R(sx + 1, sy + 1, sw - 2, sh - 2, "#141a33");
    const on = i => (i + (tick >> 1)) % 3 === 0;
    let i = 0;
    for (let x = sx - 3; x <= sx + sw + 1; x += 6, i++) {
        R(x, sy - 3, 2, 2, on(i) ? "#ffcd75" : "#5a74c8");
        R(x, sy + sh + 1, 2, 2, on(i + 1) ? "#ffcd75" : "#5a74c8");
    }
    for (let y = sy + 3; y <= sy + sh - 3; y += 6, i++) {
        R(sx - 3, y, 2, 2, on(i) ? "#ffcd75" : "#5a74c8");
        R(sx + sw + 1, y, 2, 2, on(i + 2) ? "#ffcd75" : "#5a74c8");
    }
    if (flick > 0) {
        flick--;
    } else if (Math.random() < 0.025) {
        flick = 2 + (Math.random() * 2 | 0);
        fi = [0, 1, 2, 4, 5, 6, 7, 8][Math.random() * 8 | 0];
    }
    g.font = fs + "px 'Press Start 2P', monospace";
    g.textAlign = "left";
    g.textBaseline = "middle";
    const x0 = sx + (sw - t.length * fs) / 2;
    const cy0 = sy + sh / 2 + 1;
    const amp = fs > 8 ? 2 : 1;
    [...t].forEach((ch, k) => {
        if (ch === " ") return;
        const x = Math.round(x0 + k * fs);
        const y = Math.round(cy0 + Math.sin(tick * 0.35 + k * 0.9) * amp);
        const dim = flick > 0 && k === fi;
        if (!dim) {
            g.fillStyle = "#2a3f8f";
            [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => g.fillText(ch, x + dx, y + dy));
        }
        g.fillStyle = dim ? "#4a557f" : (k < 3 ? "#f4f4f4" : "#ffcd75");
        g.fillText(ch, x, y);
    });
    if (Math.random() < 0.35) {
        R(sx + 2 + Math.random() * (sw - 6), sy + 2 + Math.random() * (sh - 6), 1, 1, "#ffffff");
    }
}

function fitCanvas() {
    const wrap = document.getElementById('wrap') || canvas.parentElement;
    if (!wrap) return;
    const cw = wrap.clientWidth;
    const ch = wrap.clientHeight;
    if (cw === 0 || ch === 0) return;
    
    K = Math.max(2, Math.round(cw / 260));
    W = Math.floor(cw / K);
    H = Math.floor(ch / K);
    
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = (W * K) + "px";
    canvas.style.height = (H * K) + "px";
    
    ctx.imageSmoothingEnabled = false;
    
    L = { cx: W >> 1, cy: Math.round(H * 0.74), sign: null };
    if (H >= 130 && W >= 150) {
        const fs = W >= 200 ? 16 : 8;
        const sw = 9 * fs + 24;
        const sh = fs + 26;
        L.sign = { fs, sw, sh, sx: Math.round((W - sw) / 2), sy: 14 };
    }
    
    const b = bounds();
    if (particles && particles.length > 0) {
        particles.forEach(p => {
            p.x = Math.min(b.x1 - p.radius, Math.max(b.x0 + p.radius, p.x));
            p.y = Math.min(b.y1 - p.radius, Math.max(b.y0 + p.radius, p.y));
        });
    }
    
    buildBg((w, h) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
    });
}
window.addEventListener('resize', fitCanvas);
if (window.ResizeObserver) {
    const wrapEl = document.getElementById('wrap');
    if (wrapEl) new ResizeObserver(() => fitCanvas()).observe(wrapEl);
}
setTimeout(fitCanvas, 50);

function getCanvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    let mx = (clientX - rect.left) * scaleX;
    let my = (clientY - rect.top) * scaleY;
    return { mx, my };
}

window.camera = { 
    targetZoom: 1.0, zoom: 1.0,
    targetX: 0, x: 0,
    targetY: 0, y: 0
};

function clampCamera() {
    let minX = W - W * window.camera.targetZoom;
    let minY = H - H * window.camera.targetZoom;
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
        
        // 8-bit square wave dengan arpeggio bertahap
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.03);
        
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
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
        osc.type = 'square';
        osc.frequency.setValueAtTime(isExo ? 150 : 350, audioCtx.currentTime);
        osc.frequency.setValueAtTime(isExo ? 75 : 180, audioCtx.currentTime + 0.08);
        osc.frequency.setValueAtTime(isExo ? 40 : 90, audioCtx.currentTime + 0.16);
        
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
        osc.onended = () => { activeOscillators = Math.max(0, activeOscillators - 1); };
    } catch (_) {
        activeOscillators = Math.max(0, activeOscillators - 1);
    }
}

class VisualEffect {
    constructor(x, y, type) {
        this.x = Math.round(x);
        this.y = Math.round(y);
        this.type = type; // 'smoke', 'bubble', atau 'acid_bubble'
        this.life = 1.0;
        this.tick = 0;
        
        if (type === 'smoke') {
            this.vx = (Math.random() - 0.5) * 1.0;
            this.vy = -0.8 - Math.random() * 0.8;
            // Warna asap hangat: antara abu tipis dan oranye-merah sesuai suhu
            const smokeColors = ['#94b0c2', '#b0a0a0', '#c8a080', '#d4947a', '#c87060'];
            this.color = smokeColors[Math.floor(Math.random() * (currentTemp > 200 ? 5 : currentTemp > 100 ? 3 : 2))];
            this.size = Math.random() > 0.5 ? 3 : 2;
        } else if (type === 'acid_bubble') {
            // Gelembung hijau tipis saat larutan asam
            this.vx = 0;
            this.vy = -0.5 - Math.random() * 0.5;
            this.color = Math.random() > 0.5 ? '#a7f070' : '#38b764';
            this.wobblePhase = Math.random() * Math.PI * 2;
            this.size = Math.random() > 0.6 ? 3 : 2;
        } else if (type === 'frost_flower') {
            // Bunga es kecil (delicate pixel ice flower / crystal flake)
            this.vx = (Math.random() - 0.5) * 0.35;
            this.vy = 0.18 + Math.random() * 0.22; // Melayang turun perlahan seperti salju / kristal es
            this.wobblePhase = Math.random() * Math.PI * 2;
            this.color = Math.random() > 0.4 ? '#73eff7' : '#ffffff';
            this.size = Math.random() > 0.5 ? 5 : 3;
            this.sparkle = Math.random() * Math.PI * 2;
        } else {
            // bubble biasa
            this.vx = 0;
            this.vy = -0.8 - Math.random() * 0.6;
            this.color = '#f4f4f4';
            this.wobblePhase = Math.random() * Math.PI * 2;
            this.size = 2;
        }
    }
    
    update() {
        this.tick++;
        if (this.tick % 2 === 0) { // Stepped motion retro (14-15 fps rhythm)
            if (this.type === 'smoke') {
                this.x += this.vx;
                this.y += this.vy;
                this.life -= 0.035;
            } else if (this.type === 'acid_bubble') {
                this.wobblePhase += 0.25;
                this.x += Math.sin(this.wobblePhase) * 0.5;
                this.y += this.vy;
                this.life -= 0.022;
            } else if (this.type === 'frost_flower') {
                this.wobblePhase += 0.08;
                this.sparkle += 0.18;
                this.x += Math.sin(this.wobblePhase) * 0.35 + this.vx;
                this.y += this.vy;
                this.life -= 0.008; // Melayang anggun cukup lama
            } else {
                this.wobblePhase += 0.4;
                this.x += Math.sin(this.wobblePhase) * 0.8;
                this.y += this.vy;
                this.life -= 0.03;
            }
        }
    }
    
    draw() {
        if (this.life <= 0) return;
        ctx.save();
        if (this.type === 'acid_bubble') {
            // Warna tipis gelembung hijau yang tidak mengganggu pandangan
            ctx.globalAlpha = Math.min(0.45, this.life * 0.45);
            ctx.fillStyle = this.color;
            ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size);
        } else if (this.type === 'smoke') {
            // Asap tipis pixel
            ctx.globalAlpha = Math.min(0.5, this.life * 0.5);
            ctx.fillStyle = this.color;
            ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size);
        } else if (this.type === 'frost_flower') {
            // Render bunga es kecil pixel art kristal
            let alpha = Math.min(0.85, this.life * 1.5);
            let sparkleAlpha = alpha * (0.7 + Math.sin(this.sparkle) * 0.3);
            ctx.globalAlpha = Math.max(0.1, Math.min(1.0, sparkleAlpha));
            
            let px = Math.round(this.x);
            let py = Math.round(this.y);

            if (this.size >= 5) {
                // Bunga es 5x5 piksel bentuk bintang kristal:
                //       #
                //     # # #
                //   # # # # #
                //     # # #
                //       #
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(px, py, 1, 1);
                
                ctx.fillStyle = this.color;
                ctx.fillRect(px - 1, py, 1, 1);
                ctx.fillRect(px + 1, py, 1, 1);
                ctx.fillRect(px, py - 1, 1, 1);
                ctx.fillRect(px, py + 1, 1, 1);
                
                ctx.fillStyle = '#dfe7ff';
                ctx.fillRect(px - 2, py, 1, 1);
                ctx.fillRect(px + 2, py, 1, 1);
                ctx.fillRect(px, py - 2, 1, 1);
                ctx.fillRect(px, py + 2, 1, 1);
                
                ctx.fillStyle = 'rgba(115, 239, 247, 0.5)';
                ctx.fillRect(px - 1, py - 1, 1, 1);
                ctx.fillRect(px + 1, py - 1, 1, 1);
                ctx.fillRect(px - 1, py + 1, 1, 1);
                ctx.fillRect(px + 1, py + 1, 1, 1);
            } else {
                // Bunga es kecil 3x3 piksel:
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(px, py, 1, 1);
                ctx.fillStyle = this.color;
                ctx.fillRect(px - 1, py, 1, 1);
                ctx.fillRect(px + 1, py, 1, 1);
                ctx.fillRect(px, py - 1, 1, 1);
                ctx.fillRect(px, py + 1, 1, 1);
            }
        } else {
            ctx.globalAlpha = Math.min(0.8, this.life);
            ctx.fillStyle = this.color;
            ctx.fillRect(Math.round(this.x), Math.round(this.y), 2, 2);
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
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');

    // Hentikan animasi sebelumnya jika ada
    anime.remove(toast);

    // Animasi MASUK bertahap (stepped 8-bit)
    anime({
        targets: toast,
        translateX: ['-50%', '-50%'],
        translateY: [15, 0],
        opacity: [0, 1],
        duration: 160,
        easing: 'steps(4)',
        complete: () => {
            // Animasi KELUAR setelah 2.5 detik
            anime({
                targets: toast,
                translateX: '-50%',
                translateY: [0, -10],
                opacity: [1, 0],
                duration: 160,
                delay: 2400,
                easing: 'steps(4)',
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
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
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
        this.x = Math.round(x);
        this.y = Math.round(y);
        this.isExothermic = isExothermic;
        this.life = 1.0;
        this.step = 0;
        // Palet retro 16-warna: Kilatan Emas vs Kristal Es
        this.colors = isExothermic 
            ? ['#f4f4f4', '#ffcd75', '#ef7d57', '#b13e53']
            : ['#f4f4f4', '#73eff7', '#41a6f6', '#3b5dc9'];
    }

    update() {
        this.step++;
        this.life -= 0.08;
    }

    draw() {
        if (this.life <= 0) return;
        const s = this.step;
        const color = this.colors[Math.min(this.colors.length - 1, Math.floor(s / 2))];
        ctx.fillStyle = color;
        
        // Kotak 4x4 piksel menyebar dalam pola bintang 8-arah (emas) atau salib kristal es
        const offsets = this.isExothermic
            ? [
                [0, -s * 2], [0, s * 2], [-s * 2, 0], [s * 2, 0],
                [-s * 1.5, -s * 1.5], [s * 1.5, -s * 1.5], [-s * 1.5, s * 1.5], [s * 1.5, s * 1.5],
                [0, 0]
              ]
            : [
                [0, -s * 2], [0, s * 2], [-s * 2, 0], [s * 2, 0],
                [-s, -s], [s, -s], [-s, s], [s, s],
                [-s * 2, -s], [s * 2, -s], [-s * 2, s], [s * 2, s]
              ];
              
        offsets.forEach(([dx, dy]) => {
            let px = Math.round(this.x + dx);
            let py = Math.round(this.y + dy);
            ctx.fillRect(px - 2, py - 2, 4, 4);
        });
    }
}

// --- ATOM SPRITE ANIMATION SYSTEM (PIXEL ART NATIVE) ---
window.AtomSpriteSystem = {
    enabled: true, // Diaktifkan: menggunakan sprite animasi baru 15–30px dari folder static/atoms
    fps: 14, // Kecepatan animasi 14 FPS dengan squash & sweeping shine
    sprites: {},
    mapping: {"H": "001_H.png", "He": "002_He.png", "Li": "003_Li.png", "Be": "004_Be.png", "B": "005_B.png", "C": "006_C.png", "N": "007_N.png", "O": "008_O.png", "F": "009_F.png", "Ne": "010_Ne.png", "Na": "011_Na.png", "Mg": "012_Mg.png", "Al": "013_Al.png", "Si": "014_Si.png", "P": "015_P.png", "S": "016_S.png", "Cl": "017_Cl.png", "Ar": "018_Ar.png", "K": "019_K.png", "Ca": "020_Ca.png", "Sc": "021_Sc.png", "Ti": "022_Ti.png", "V": "023_V.png", "Cr": "024_Cr.png", "Mn": "025_Mn.png", "Fe": "026_Fe.png", "Co": "027_Co.png", "Ni": "028_Ni.png", "Cu": "029_Cu.png", "Zn": "030_Zn.png", "Ga": "031_Ga.png", "Ge": "032_Ge.png", "As": "033_As.png", "Se": "034_Se.png", "Br": "035_Br.png", "Kr": "036_Kr.png", "Rb": "037_Rb.png", "Sr": "038_Sr.png", "Y": "039_Y.png", "Zr": "040_Zr.png", "Nb": "041_Nb.png", "Mo": "042_Mo.png", "Tc": "043_Tc.png", "Ru": "044_Ru.png", "Rh": "045_Rh.png", "Pd": "046_Pd.png", "Ag": "047_Ag.png", "Cd": "048_Cd.png", "In": "049_In.png", "Sn": "050_Sn.png", "Sb": "051_Sb.png", "Te": "052_Te.png", "I": "053_I.png", "Xe": "054_Xe.png", "Cs": "055_Cs.png", "Ba": "056_Ba.png", "La": "057_La.png", "Ce": "058_Ce.png", "Pr": "059_Pr.png", "Nd": "060_Nd.png", "Pm": "061_Pm.png", "Sm": "062_Sm.png", "Eu": "063_Eu.png", "Gd": "064_Gd.png", "Tb": "065_Tb.png", "Dy": "066_Dy.png", "Ho": "067_Ho.png", "Er": "068_Er.png", "Tm": "069_Tm.png", "Yb": "070_Yb.png", "Lu": "071_Lu.png", "Hf": "072_Hf.png", "Ta": "073_Ta.png", "W": "074_W.png", "Re": "075_Re.png", "Os": "076_Os.png", "Ir": "077_Ir.png", "Pt": "078_Pt.png", "Au": "079_Au.png", "Hg": "080_Hg.png", "Tl": "081_Tl.png", "Pb": "082_Pb.png", "Bi": "083_Bi.png", "Po": "084_Po.png", "At": "085_At.png", "Rn": "086_Rn.png", "Fr": "087_Fr.png", "Ra": "088_Ra.png", "Ac": "089_Ac.png", "Th": "090_Th.png", "Pa": "091_Pa.png", "U": "092_U.png", "Np": "093_Np.png", "Pu": "094_Pu.png", "Am": "095_Am.png", "Cm": "096_Cm.png", "Bk": "097_Bk.png", "Cf": "098_Cf.png", "Es": "099_Es.png", "Fm": "100_Fm.png", "Md": "101_Md.png", "No": "102_No.png", "Lr": "103_Lr.png", "Rf": "104_Rf.png", "Db": "105_Db.png", "Sg": "106_Sg.png", "Bh": "107_Bh.png", "Hs": "108_Hs.png", "Mt": "109_Mt.png", "Ds": "110_Ds.png", "Rg": "111_Rg.png", "Cn": "112_Cn.png", "Nh": "113_Nh.png", "Fl": "114_Fl.png", "Mc": "115_Mc.png", "Lv": "116_Lv.png", "Ts": "117_Ts.png", "Og": "118_Og.png"},
    getSize(symbol) {
        let file = this.mapping[symbol];
        let z = file ? parseInt(file.slice(0, 3), 10) : 6;
        let d = z <= 10 ? 15 : z <= 30 ? 20 : z <= 50 ? 25 : z <= 80 ? 28 : 30;
        let fw = d + 2;
        let fh = fw;
        return { z, diameter: d, radius: d / 2, fw, fh };
    },
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
            const size = this.getSize(symbol);
            const fw = size.fw;
            const fh = size.fh;
            
            // Variasi fase agar tidak memantul kaku serempak
            const time = Date.now() / 1000;
            const offset = ((particleId || 0) * 0.38);
            const frameIndex = Math.floor((time + offset) * this.fps) % totalFrames;
            
            targetCtx.save();
            targetCtx.imageSmoothingEnabled = false; // Efek tajam pixel art
            // Gambar 1:1 tepat tanpa sampling nearest-neighbor (resolusi asli per piksel):
            targetCtx.drawImage(
                img,
                frameIndex * fw, 0, fw, fh,
                Math.round(x - fw / 2), Math.round(y - fh / 2), fw, fh
            );
            targetCtx.restore();
            return true;
        } catch (err) {
            return false;
        }
    }
};

// Fungsi pembantu tata letak dan radius molekul gabungan
function getMoleculeLayout(atomData, cleanMolFormula) {
    if (!atomData || atomData.length <= 1) return null;
    
    const getSubRadius = (sym, mass, zNum) => {
        let z = zNum || (window.AtomSpriteSystem ? window.AtomSpriteSystem.getSize(sym).z : 6);
        let d = z <= 10 ? 15 : z <= 30 ? 20 : z <= 50 ? 25 : z <= 80 ? 28 : 30;
        return d / 2;
    };

    let sortedAtoms = [...atomData].sort((a, b) => getValence(b.symbol) - getValence(a.symbol));
    let centerAtom = sortedAtoms[0];
    let branches = sortedAtoms.slice(1);
    let centerR = getSubRadius(centerAtom.symbol, centerAtom.mass, centerAtom.atomic_number);

    let atomPositions = [];
    let bonds = [];

    if (branches.length === 1) {
        let branchAtom = branches[0];
        let branchR = getSubRadius(branchAtom.symbol, branchAtom.mass, branchAtom.atomic_number);
        let dist = centerR + branchR + 4;
        let halfDist = dist / 2;
        
        atomPositions.push({ atom: centerAtom, x: -halfDist, y: 0, r: centerR });
        atomPositions.push({ atom: branchAtom, x: halfDist, y: 0, r: branchR });
        bonds.push([0, 1]);
    } else {
        let angles = [];
        if (branches.length === 2) {
            if (cleanMolFormula === 'CO2') {
                angles = [-Math.PI / 2, Math.PI / 2];
            } else {
                let halfAngle = (104.5 * Math.PI) / 360;
                angles = [Math.PI / 2 - halfAngle, Math.PI / 2 + halfAngle];
            }
        } else if (branches.length === 3) {
            angles = [-Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 / 3), -Math.PI / 2 + (Math.PI * 4 / 3)];
        } else if (branches.length === 4) {
            angles = [-Math.PI * 0.25, Math.PI * 0.25, Math.PI * 0.75, -Math.PI * 0.75];
        } else {
            let step = (Math.PI * 2) / branches.length;
            for (let i = 0; i < branches.length; i++) angles.push(i * step);
        }

        let minCircumference = branches.length * 20;
        let neededDist = minCircumference / (2 * Math.PI);

        let rawPositions = [{ atom: centerAtom, x: 0, y: 0, r: centerR }];

        for (let i = 0; i < branches.length; i++) {
            let bAtom = branches[i];
            let bR = getSubRadius(bAtom.symbol, bAtom.mass, bAtom.atomic_number);
            let bondDist = Math.max(centerR + bR + 4, neededDist);
            let ang = angles[i];
            let bx = Math.cos(ang) * bondDist;
            let by = Math.sin(ang) * bondDist;
            rawPositions.push({ atom: bAtom, x: bx, y: by, r: bR });
            bonds.push([0, i + 1]);
        }

        let sumX = rawPositions.reduce((s, p) => s + p.x, 0);
        let sumY = rawPositions.reduce((s, p) => s + p.y, 0);
        let avgX = sumX / rawPositions.length;
        let avgY = sumY / rawPositions.length;

        atomPositions = rawPositions.map(p => ({
            ...p,
            x: p.x - avgX,
            y: p.y - avgY
        }));
    }

    let maxExtent = 12;
    atomPositions.forEach(p => {
        let ext = Math.hypot(p.x, p.y) + p.r;
        if (ext > maxExtent) maxExtent = ext;
    });

    return {
        atomPositions,
        bonds,
        boundingRadius: Math.ceil(maxExtent) + 2
    };
}

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
        
        // Hitung radius partikel berdasarkan kelompok Ar / Mr (Skala diameter native 15–30 px)
        let z = (this.atomData[0] && this.atomData[0].atomic_number) ? this.atomData[0].atomic_number : 6;
        let d = z <= 10 ? 15 : z <= 30 ? 20 : z <= 50 ? 25 : z <= 80 ? 28 : 30;
        
        if (this.atomData.length > 1) {
            let layout = getMoleculeLayout(this.atomData, (moleculeName || this.label).split(' ')[0]);
            this.radius = layout ? layout.boundingRadius : 16;
        } else {
            this.radius = d / 2;
        }
        
        // Spawn bebas di area kanvas penuh dengan margin radius
        const b = bounds();
        this.x = (x !== undefined && x !== null) ? x : (b.x0 + this.radius + Math.random() * Math.max(10, b.x1 - b.x0 - 2 * this.radius));
        this.y = (y !== undefined && y !== null) ? y : (b.y0 + this.radius + Math.random() * Math.max(10, b.y1 - b.y0 - 2 * this.radius));
        
        // Kecepatan dan arah gerak awal
        const a = Math.random() * 6.28;
        const v = 0.5 + Math.random() * 0.6;
        this.dx = Math.cos(a) * v;
        this.dy = Math.sin(a) * v;
        this.ph = Math.random() * 6.28;
        this.restitution = 0.85;
        
        if (moleculeName) {
            if (moleculeName.includes('Radikal')) this.color = '#9333ea';
            else if (moleculeName.includes('Air')) this.color = '#3b82f6';
            else if (moleculeName.includes('Klorida') || moleculeName.includes('Metana')) this.color = '#22c55e';
            else if (moleculeName.includes('Ester') || moleculeName.includes('Karboksilat')) this.color = '#f59e0b';
            else this.color = '#64748b';
        } else {
            let sym = this.atomData[0] ? this.atomData[0].symbol : 'C';
            this.color = COL[sym] || ((this.atomData[0] && this.atomData[0].color) ? this.atomData[0].color.replace(/\s+/g, '') : '#41a6f6');
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
        
        // Titik didih dinamis (Clausius-Clapeyron)
        const R_const = 8.314;
        let dynamic_bp = Infinity;
        if (bp !== null && bp !== undefined && bp > -273.15) {
            let Tref = bp + 273.15; // Kelvin
            let H = (molData && molData.hvap_kj_mol) ? (molData.hvap_kj_mol * 1000.0) : (88.0 * Tref);
            let inv = (1.0 / Tref) - (R_const / H) * Math.log(Math.max(0.01, currentPress));
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
        
        let isSublimating = (dynamic_mp === null || dynamic_mp === undefined || dynamic_bp <= dynamic_mp);
        if (isRadicalIntermediate) {
            this.state = "GAS";
        } else if (currentTemp >= dynamic_bp) {
            this.state = "GAS";
        } else if (!isSublimating && currentTemp >= dynamic_mp) {
            this.state = "CAIR";
        } else {
            this.state = "PADAT";
        }
        
        // Jika partikel sedang di-drag kursor pengguna, jangan jalankan fisika gravitasi internal
        if (typeof draggedParticle !== 'undefined' && draggedParticle === this) {
            return;
        }

        // Suhu: mengatur kecepatan gerak kinetik atom (kecepatan ∝ √T)
        // Di 25 °C gerak normal (sp = 1.0), makin panas makin cepat, mendekati nol mutlak hampir diam
        const sp = Math.max(0.12, Math.min(3.0, Math.sqrt(Math.max(currentTemp + 273.15, 1) / 298.15)));
        
        if (this.state === "GAS") {
            // GAS: Melayang bebas ke segala arah, restitusi elastis (0.85), microgravity
            this.restitution = 0.85;
            this.ph += 0.05 * sp;
            this.x += this.dx * sp;
            this.y += this.dy * sp;

            // Agitasi termal gas acak
            this.dx += (Math.random() - 0.5) * 0.08 * sp;
            this.dy += (Math.random() - 0.5) * 0.08 * sp;

            // Jaga kecepatan gas tetap stabil dan halus
            let curV = Math.hypot(this.dx, this.dy);
            if (curV > 2.2) {
                this.dx = (this.dx / curV) * 2.2;
                this.dy = (this.dy / curV) * 2.2;
            } else if (curV < 0.35) {
                if (curV > 0.01) {
                    this.dx = (this.dx / curV) * 0.35;
                    this.dy = (this.dy / curV) * 0.35;
                } else {
                    let ang = Math.random() * 6.28;
                    this.dx = Math.cos(ang) * 0.35;
                    this.dy = Math.sin(ang) * 0.35;
                }
            }
        } else if (this.state === "CAIR") {
            // CAIRAN: Gravitasi cairan menarik ke bawah (meja), mengalir dengan viskositas
            this.restitution = 0.30;
            this.dy += 0.20; // Gravitasi cairan
            this.dx *= 0.97; // Gesekan viskositas cairan
            this.dy *= 0.98;

            // Gerak Brown cairan sesuai suhu
            let jitter = Math.max(0, (currentTemp + 273.15) * 0.00012);
            this.dx += (Math.random() - 0.5) * jitter;

            this.x += this.dx * sp;
            this.y += this.dy;
        } else {
            // PADAT: Gravitasi padatan menarik ke bawah (jatuh dan mengendap di meja lab)
            this.restitution = 0.18;
            this.dy += 0.30; // Gravitasi padatan
            this.dx *= 0.88; // Gesekan permukaan padat
            this.dy *= 0.92;

            // Getaran kisi kristal padat (makin dingin makin diam)
            let vib = Math.max(0.005, (currentTemp + 273.15) * 0.00006);
            this.dx += (Math.random() - 0.5) * vib;

            this.x += this.dx * sp;
            this.y += this.dy;
        }
        
        if (isNaN(this.dx) || !isFinite(this.dx)) this.dx = 0;
        if (isNaN(this.dy) || !isFinite(this.dy)) this.dy = 0;

        // Pantulan di batas ruangan (dinding kiri/kanan, papan neon atas, lis meja bawah)
        const b = bounds();
        if (this.x - this.radius < b.x0) {
            this.x = b.x0 + this.radius;
            this.dx = Math.abs(this.dx) * this.restitution;
        } else if (this.x + this.radius > b.x1) {
            this.x = b.x1 - this.radius;
            this.dx = -Math.abs(this.dx) * this.restitution;
        }
        if (this.y - this.radius < b.y0) {
            this.y = b.y0 + this.radius;
            this.dy = Math.abs(this.dy) * this.restitution;
        } else if (this.y + this.radius > b.y1) {
            this.y = b.y1 - this.radius;
            if (this.state === "PADAT") {
                this.dy = -Math.abs(this.dy) * this.restitution;
                if (Math.abs(this.dy) < 0.25) this.dy = 0; // Mengendap stabil di atas meja
                this.dx *= 0.82;
            } else if (this.state === "CAIR") {
                this.dy = -Math.abs(this.dy) * this.restitution;
                if (Math.abs(this.dy) < 0.18) this.dy = 0;
                this.dx *= 0.94;
            } else {
                this.dy = -Math.abs(this.dy) * this.restitution;
            }
        }
    }

    draw() {
        let targetCtx = ctx;
        const drawX = Math.round(this.x);
        const drawY = Math.round(this.y + Math.sin(this.ph) * 1.5);

        // --- DRAW EXPERIMENTAL COMPOSITE MOLECULE STRUCTURE ---
        if (this.moleculeName && this.atomData.length <= 1 && window.DB && window.DB.moleculeAtoms) {
            let formula = this.moleculeName.split(' ')[0].trim();
            let foundKey = Object.keys(window.DB.moleculeAtoms).find(k => k.split(' ')[0] === formula);
            if (foundKey && window.DB.moleculeAtoms[foundKey].length > 1) {
                this.atomData = window.DB.moleculeAtoms[foundKey].map(sym => getAtomData(sym));
            }
        }

        let cleanMolFormula = this.moleculeName ? this.moleculeName.split(' ')[0].trim() : this.atomData.map(a => a.symbol).join('');

        if (this.atomData.length > 1) {
            try {
                let layout = getMoleculeLayout(this.atomData, cleanMolFormula);
                if (layout) {
                    this.radius = layout.boundingRadius;

                    // Bayangan tipis di bawah molekul proporsional radius
                    R(drawX - this.radius, drawY + this.radius + 2, this.radius * 2, 2, "rgba(0,0,0,.28)");

                    // Ayunan mengapung lembut (gentle sway ±6°), tanpa memutar sprite piksel
                    let sway = Math.sin((Date.now() * 0.001) + (this.id * 1.5)) * 0.1;
                    let cosR = Math.cos(sway);
                    let sinR = Math.sin(sway);

                    let renderedCoords = layout.atomPositions.map(p => {
                        let rx = p.x * cosR - p.y * sinR;
                        let ry = p.x * sinR + p.y * cosR;
                        return {
                            ...p,
                            drawX: Math.round(drawX + rx),
                            drawY: Math.round(drawY + ry)
                        };
                    });

                    // 1. Gambar garis ikatan (Bond Sticks)
                    targetCtx.save();
                    targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
                    targetCtx.lineWidth = 2;
                    targetCtx.lineCap = 'round';
                    layout.bonds.forEach(([idxA, idxB]) => {
                        let pA = renderedCoords[idxA];
                        let pB = renderedCoords[idxB];
                        targetCtx.beginPath();
                        targetCtx.moveTo(pA.drawX, pA.drawY);
                        targetCtx.lineTo(pB.drawX, pB.drawY);
                        targetCtx.stroke();
                    });
                    targetCtx.restore();

                    // 2. Gambar atom-atom penyusun UPRIGHT (TEGAK 1:1 tanpa rotate canvas)
                    renderedCoords.forEach((p, idx) => {
                        let drawn = false;
                        if (window.AtomSpriteSystem && window.AtomSpriteSystem.enabled) {
                            drawn = window.AtomSpriteSystem.drawAtom(
                                targetCtx,
                                p.atom.symbol,
                                p.drawX,
                                p.drawY,
                                p.r,
                                this.id + idx * 7
                            );
                        }
                        if (!drawn) {
                            let cColor = COL[p.atom.symbol] || p.atom.color || '#3b82f6';
                            disc(p.drawX, p.drawY, p.r + 1, "#0d0f1c");
                            disc(p.drawX, p.drawY, p.r, cColor);
                        }
                    });

                    // 3. Formula Label di atas molekul (bersih dan tidak menutupi atom)
                    ctx.fillStyle = '#ffffff';
                    ctx.font = FONT;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(cleanMolFormula, drawX, Math.round(drawY - this.radius - 5));

                    return;
                }
            } catch (err) {
                console.warn("Fallback rendering molekul:", err);
            }
        }

        // --- ATOM TUNGGAL (Sprite Utama dengan Fallback Pixel Art) ---
        let drawnWithSprite = false;
        if (this.atomData.length === 1 && window.AtomSpriteSystem && window.AtomSpriteSystem.enabled) {
            drawnWithSprite = window.AtomSpriteSystem.drawAtom(targetCtx, this.atomData[0].symbol, drawX, drawY, this.radius, this.id);
        }

        if (!drawnWithSprite) {
            let c = COL[this.atomData[0].symbol] || this.color || "#41a6f6";
            let rInt = Math.round(this.radius);
            
            // Lingkaran luar hitam (outline)
            ctx.fillStyle = "#0d0f1c";
            for (let dy = -(rInt + 1); dy <= (rInt + 1); dy++) {
                const hw = Math.round(Math.sqrt((rInt + 1) * (rInt + 1) - dy * dy));
                ctx.fillRect(drawX - hw, drawY + dy, hw * 2 + 1, 1);
            }
            // Badan atom
            ctx.fillStyle = c;
            for (let dy = -rInt; dy <= rInt; dy++) {
                const hw = Math.round(Math.sqrt(rInt * rInt - dy * dy));
                ctx.fillRect(drawX - hw, drawY + dy, hw * 2 + 1, 1);
            }
            // Kilau piksel putih
            R(drawX - Math.round(rInt * 0.5), drawY - Math.round(rInt * 0.5), 2, 2, "rgba(255,255,255,.8)");
            R(drawX - Math.round(rInt * 0.4), drawY - Math.round(rInt * 0.6), 2, 1, "rgba(255,255,255,.8)");

            // Simbol atom dengan auto-kontras teks
            let sym = this.atomData[0].symbol;
            const atomFontSize = sym.length === 1 ? Math.max(9, Math.round(this.radius * 0.55)) + "px" : Math.max(7, Math.round(this.radius * 0.45)) + "px";
            ctx.font = `${atomFontSize} 'Press Start 2P', monospace`;
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";
            
            let isBright = false;
            if (c.startsWith('#') && c.length >= 7) {
                let rVal = parseInt(c.slice(1, 3), 16) || 0;
                let gVal = parseInt(c.slice(3, 5), 16) || 0;
                let bVal = parseInt(c.slice(5, 7), 16) || 0;
                isBright = (rVal * 0.3 + gVal * 0.59 + bVal * 0.11) > 150;
            }
            ctx.strokeStyle = isBright ? "#1a2138" : "#0d0f1c";
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.strokeText(sym.slice(0, 2), drawX, drawY + 1);
            ctx.fillStyle = isBright ? "#1a2138" : "#fff";
            ctx.fillText(sym.slice(0, 2), drawX, drawY + 1);
        }

        // Efek kristal bunga es kecil pada atom/molekul yang membeku (PADAT) saat suhu dingin (< 0 °C)
        if (currentTemp < 0 && this.state === "PADAT") {
            let frostTwinkle = Math.sin((Date.now() * 0.005) + (this.id * 2.3));
            if (frostTwinkle > -0.2) {
                let fx = drawX + Math.round(this.radius * 0.45);
                let fy = drawY - Math.round(this.radius * 0.45);
                R(fx, fy, 2, 2, "#ffffff");
                R(fx - 1, fy, 1, 1, "#73eff7");
                R(fx + 2, fy, 1, 1, "#73eff7");
                R(fx, fy - 1, 1, 1, "#73eff7");
                R(fx, fy + 2, 1, 1, "#73eff7");
            }
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

const CELL_SIZE = 24;
const spatialGrid = new Map();

function resolveCollisions() {
    let toRemove = new Set();
    let toAdd = [];
    
    // Spatial Partitioning Grid (Cell Size = 24 untuk canvas 192x108)
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
                        
                        // --- GAYA TARIK KIMIA (CHEMICAL ATTRACTION) - HALUS / SMOOTH ACCELERATION ---
                        const ATTRACTION_RANGE = 12;
                        if (dist >= minDist && dist < minDist + ATTRACTION_RANGE) {
                            if (areParticlesRelated(p1, p2)) {
                                let pullFactor = (1 - (dist - minDist) / ATTRACTION_RANGE);
                                let pullAcc = 0.04 * pullFactor; 
                                let nx = dist > 0 ? (distX / dist) : 1;
                                let ny = dist > 0 ? (distY / dist) : 0;
                                
                                p1.dx -= nx * pullAcc;
                                p1.dy -= ny * pullAcc;
                                p2.dx += nx * pullAcc;
                                p2.dy += ny * pullAcc;
                            }
                        }
                        
                        if (dist < minDist) {
                            let reaction = checkChemistry(p1, p2, spatialGrid);
                            if (reaction) {
                                toRemove.add(p1);
                                toRemove.add(p2);
                                
                                let dTemp = applyReactionHeat(reaction.delta_H_kJ, 1);
                                
                                if (Math.abs(reaction.delta_H_kJ) > 20) {
                                    playBoomSFX(reaction.delta_H_kJ);
                                    let container = document.querySelector('.stage-wrap') || document.querySelector('.app');
                                    if (container) {
                                        container.classList.remove('bump-active');
                                        void container.offsetWidth;
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
                                
                                let mx = (p1.x + p2.x) / 2;
                                let my = (p1.y + p2.y) / 2;
                                
                                if (canTriggerFlash()) {
                                    flashes.push(new ReactionFlash(mx, my, reaction.is_exothermic, dTemp));
                                }
                                
                                let isAqueous = reaction.products.some(p => p.includes("Air") || p.includes("Asam") || p.includes("Hidroksida"));
                                let vfxType = isAqueous ? 'bubble' : 'smoke';
                                for (let i = 0; i < 6; i++) {
                                    visualEffects.push(new VisualEffect(mx, my, vfxType));
                                }
                                
                                reaction.products.forEach(prodName => {
                                    let atoms = DB.moleculeAtoms[prodName] || ['C'];
                                    toAdd.push(new Particle(atoms, mx, my, prodName));
                                    
                                    if (window.QuestEngine) {
                                        window.QuestEngine.checkDiscovery(prodName);
                                    }
                                });
                                continue;
                            }
                            
                            // Physics Elastic Bounce (Halus & Terkendali)
                            let nx = dist === 0 ? 1 : distX / dist;
                            let ny = dist === 0 ? 0 : distY / dist;
                            let overlap = minDist - dist;
                            let sep = Math.min(overlap * 0.5, 2.0);
                            p1.x += nx * sep;
                            p1.y += ny * sep;
                            p2.x -= nx * sep;
                            p2.y -= ny * sep;
                            
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
    const net = (nH - nOH) / V;
    const s = Math.sqrt(net * net + 4.0 * Kw);
    const h = net >= 0 ? (net + s) / 2.0 : Kw / ((-net + s) / 2.0);
    return Math.min(14.0, Math.max(0.0, -Math.log10(h)));
}

function updatePHIndicator() {
    const N0 = 0.01;
    const V = 1.0;
    
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
    currentPH += (targetPH - currentPH) * 0.05;
    const pH = currentPH;

    // Tampilkan angka pH visual di HUD
    const phValEl = document.getElementById('phValue');
    const phStatusEl = document.getElementById('phStatus');
    if (phValEl) phValEl.textContent = pH.toFixed(2);
    if (phStatusEl) {
        if (pH < 6.5) phStatusEl.textContent = 'ASAM';
        else if (pH > 7.5) phStatusEl.textContent = 'BASA';
        else phStatusEl.textContent = 'NETRAL';
    }

    // Perbarui segmen pita pH (15 segmen)
    const phStrip = document.getElementById('phStrip');
    if (phStrip) {
        const activeIdx = Math.max(0, Math.min(14, Math.round(pH)));
        [...phStrip.children].forEach((el, i) => {
            el.classList.toggle('on', i === activeIdx);
        });
    }
}

// Fixed Timestep 60 Hz Physics Loop
const FIXED_STEP = 1.0 / 60.0;
let physicsAccumulator = 0;
let lastFrameTimestamp = performance.now();

function updatePhysicsStep() {
    let diff = targetTemp - currentTemp;
    let step = diff * 0.04;
    if (step > 4.0) step = 4.0; 
    if (step < -8.0) step = -8.0;
    currentTemp += step;
    
    const tempEl = document.getElementById('tempValue');
    if (tempEl) tempEl.textContent = currentTemp.toFixed(1) + ' °C';
    
    updatePHIndicator();
    particles.forEach(p => p.updatePhysics());
    resolveCollisions();
}

function animate(now = performance.now()) {
    try {
        tick++;
        let dt = Math.min(0.05, (now - lastFrameTimestamp) / 1000.0);
        lastFrameTimestamp = now;
        physicsAccumulator += dt;
        
        let steps = 0;
        while (physicsAccumulator >= FIXED_STEP && steps < 4) {
            updatePhysicsStep();
            physicsAccumulator -= FIXED_STEP;
            steps++;
        }
        if (physicsAccumulator >= FIXED_STEP) {
            physicsAccumulator = 0;
        }

        ctx.clearRect(0, 0, W, H);

        // 1. Gambar latar ubin dinding & meja (pixel_ui_preview.html)
        if (bg) {
            ctx.drawImage(bg, 0, 0);
        }

        // 2. Papan neon interaktif beranimasi (marquee + wave)
        drawSign(ctx, R);

        // 3. Tint warna dinding mengikuti pH (hanya jika menjauhi netral)
        const dev = Math.abs(currentPH - 7);
        if (dev > 0.5 && L.cy) {
            ctx.globalAlpha = Math.min(0.3, dev * 0.05);
            R(0, 0, W, L.cy, PHC[Math.max(0, Math.min(14, Math.round(currentPH)))]);
            ctx.globalAlpha = 1;
        }

        // 4. Partikel Atom & Molekul bebas melayang di seluruh kanvas
        particles.slice().sort((p, q) => p.y - q.y).forEach(p => p.draw());

        // 5. Kilatan Reaksi (Reaction Flash)
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        flashes.forEach(f => {
            f.update();
            if (!prefersReducedMotion) f.draw();
        });
        flashes = flashes.filter(f => f.life > 0);

        // 6. Efek Asap / Partikel Reaksi
        visualEffects.forEach(v => {
            v.update();
            v.draw();
        });
        visualEffects = visualEffects.filter(v => v.life > 0);
        if (visualEffects.length > 150) {
            visualEffects = visualEffects.slice(-100);
        }

        // 6. Efek Termal Ekstrim — Panas (asap pixel + tint merah) vs Dingin (bunga es + kristal + tint es)
        if (currentTemp > 80 && particles.length > 0) {
            let intensity = Math.min((currentTemp - 80) / 200, 1.0);
            // Spawn asap lebih sering seiring suhu naik
            let smokeRate = 0.15 + intensity * 0.35;
            if (Math.random() < smokeRate) {
                const p = particles[Math.floor(Math.random() * particles.length)];
                // Spawn 1–3 partikel asap per frame jika sangat panas
                let smokeCount = intensity > 0.5 ? 2 : 1;
                for (let si = 0; si < smokeCount; si++) {
                    let sx = p.x + (Math.random() - 0.5) * 6;
                    let sy = p.y - 2;
                    visualEffects.push(new VisualEffect(sx, sy, 'smoke'));
                }
            }
            // Tint merah tipis di area dinding — semakin panas semakin merah
            if (L.cy) {
                ctx.globalAlpha = Math.min(0.22, intensity * 0.22);
                ctx.fillStyle = "#b13e53"; // merah retro
                ctx.fillRect(0, 0, W, L.cy);
                ctx.globalAlpha = 1;
            }
        } else if (currentTemp < 0) {
            // EFEK SUHU DINGIN — Bunga es kecil melayang + kristal es + tint es retro
            let coldIntensity = Math.min(1.0, Math.abs(currentTemp) / 100);
            let frostRate = 0.12 + coldIntensity * 0.35;
            if (Math.random() < frostRate) {
                let fx, fy;
                // 50% spawn di dekat partikel padat/beku, 50% mengapung di kanvas
                const solidParticles = particles.filter(p => p.state === "PADAT");
                if (solidParticles.length > 0 && Math.random() < 0.6) {
                    const p = solidParticles[Math.floor(Math.random() * solidParticles.length)];
                    fx = p.x + (Math.random() - 0.5) * (p.radius * 2);
                    fy = p.y + (Math.random() - 0.5) * (p.radius * 2);
                } else {
                    fx = Math.random() * W;
                    fy = Math.random() * (H * 0.75);
                }
                visualEffects.push(new VisualEffect(fx, fy, 'frost_flower'));
            }

            // Tint biru es sejuk retro di area dinding
            if (L.cy) {
                ctx.globalAlpha = Math.min(0.20, coldIntensity * 0.20);
                ctx.fillStyle = "#73eff7"; // cyan es
                ctx.fillRect(0, 0, W, L.cy);
                ctx.globalAlpha = 1;
            }
        }

        // 7. Efek Asam — gelembung hijau tipis dari atom/molekul asam
        if (currentPH < 6.5 && particles.length > 0 && tick % 4 === 0) {
            let acidIntensity = Math.min(1.0, (6.5 - currentPH) / 6.5);
            let spawnChance = 0.08 * acidIntensity;
            for (let ap of particles) {
                let abType = DB.moleculeAcidBase[ap.label];
                if (abType === 'ACID' && Math.random() < spawnChance) {
                    let bx = ap.x + (Math.random() - 0.5) * 10;
                    let by = ap.y - ap.radius;
                    visualEffects.push(new VisualEffect(bx, by, 'acid_bubble'));
                }
            }
        }

        // Live update Info Panel
        const particleInfoBox = document.getElementById('particleInfoBox');
        const particleInfoPrompt = document.getElementById('particleInfoPrompt');
        const particleInfo = document.getElementById('particleInfo');
        
        if (selectedParticle) {
            if (!particles.includes(selectedParticle)) {
                selectedParticle = null;
                if (particleInfo) particleInfo.classList.add('hidden');
                if (particleInfoPrompt) particleInfoPrompt.classList.remove('hidden');
            } else {
                if (particleInfoPrompt) particleInfoPrompt.classList.add('hidden');
                if (particleInfo) particleInfo.classList.remove('hidden');
                let molData = DB.molecules ? DB.molecules.find(m => m.label === selectedParticle.label) : null;
                const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
                setTxt('infoName', selectedParticle.label);
                setTxt('infoCurrentTemp', currentTemp.toFixed(1) + ' °C');
                setTxt('infoMolarMass', (molData && molData.molar_mass) ? molData.molar_mass.toFixed(2) + ' g/mol' : selectedParticle.mass.toFixed(2) + ' g/mol');
                setTxt('infoDensity', (molData && molData.density) ? molData.density + ' g/cm³' : 'N/A');
                setTxt('infoMP', (selectedParticle.current_mp !== undefined && selectedParticle.current_mp !== null ? selectedParticle.current_mp.toFixed(1) + ' °C' : "N/A"));
                setTxt('infoBP', (selectedParticle.current_bp !== undefined && selectedParticle.current_bp !== null && selectedParticle.current_bp !== Infinity ? selectedParticle.current_bp.toFixed(1) + ' °C' : "N/A"));
                setTxt('infoPhase', selectedParticle.state);
                
                let abType = DB.moleculeAcidBase[selectedParticle.label];
                let abText = "Netral";
                if (abType === 'ACID') abText = "Asam";
                else if (abType === 'BASE') abText = "Basa";
                setTxt('infoAcidBase', abText);
                
                setTxt('infoBondType', molData && molData.bond_type ? molData.bond_type : "Tidak Diketahui");
                setTxt('infoIUPAC', (molData && molData.iupac_name) ? molData.iupac_name : "N/A");
                setTxt('infoExactMass', (molData && molData.exact_mass) ? molData.exact_mass.toFixed(4) + ' Da' : "N/A");
            }
        } else {
            if (particleInfo) particleInfo.classList.add('hidden');
            if (particleInfoPrompt) particleInfoPrompt.classList.remove('hidden');
        }

    } catch (err) {
        console.error("Simulation error in animate:", err);
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
        if (tempEl) tempEl.textContent = targetTemp.toFixed(1) + ' °C';
        if (tempSl) tempSl.value = String(Math.round(tInv(targetTemp)));
    }
    
    if (savedData.press !== undefined) {
        currentPress = savedData.press;
        const pressEl = document.getElementById('pressValue');
        const pressSl = document.getElementById('pressSlider');
        if (pressEl) pressEl.textContent = currentPress.toFixed(1) + ' atm';
        if (pressSl) pressSl.value = String(Math.round(pInv(currentPress)));
    }
    
    if (savedData.particles && Array.isArray(savedData.particles)) {
        particles = [];
        savedData.particles.forEach(sp => {
            let p = new Particle(sp.atomSymbols, sp.x, sp.y, sp.moleculeName);
            p.dx = sp.dx !== undefined ? sp.dx : ((Math.random() - 0.5) * 0.8);
            p.dy = sp.dy !== undefined ? sp.dy : ((Math.random() - 0.5) * 0.8);
            if (sp.state) p.state = sp.state;
            particles.push(p);
        });
    }
};

// Skala Sliders Non-linear
const tMap = s => s <= 20 ? -273.15 + (s / 20) * 273.15 : s <= 60 ? ((s - 20) / 40) * 1000 : 1000 + ((s - 60) / 40) * 4000;
const tInv = T => T <= 0 ? ((T + 273.15) / 273.15) * 20 : T <= 1000 ? 20 + (T / 1000) * 40 : 60 + ((T - 1000) / 4000) * 40;

const pMap = s => 0.1 * Math.pow(10, 3 * s / 100);
const pInv = P => Math.max(0, Math.min(100, Math.round(100 * Math.log10(Math.max(0.1, P) / 0.1) / 3)));

// Event Listeners
const tempSliderEl = document.getElementById('tempSlider');
if (tempSliderEl) {
    tempSliderEl.addEventListener('input', (e) => {
        targetTemp = tMap(parseFloat(e.target.value));
        if (Math.abs(currentTemp - targetTemp) > 100) {
            currentTemp += (targetTemp - currentTemp) * 0.25;
        }
        const tempEl = document.getElementById('tempValue');
        if (tempEl) tempEl.textContent = currentTemp.toFixed(1) + ' °C';
    });
}

const pressSliderEl = document.getElementById('pressSlider');
if (pressSliderEl) {
    pressSliderEl.addEventListener('input', (e) => {
        currentPress = pMap(parseFloat(e.target.value));
        const pressEl = document.getElementById('pressValue');
        if (pressEl) pressEl.textContent = currentPress.toFixed(1) + ' atm';
    });
}

document.getElementById('clearBtn').addEventListener('click', () => {
    particles = [];
    currentTemp = 25.0;
    targetTemp = 25.0;
    currentPress = 1.0;
    
    const tempEl = document.getElementById('tempValue');
    const tempSl = document.getElementById('tempSlider');
    if (tempEl) tempEl.textContent = '25.0 °C';
    if (tempSl) tempSl.value = String(Math.round(tInv(25.0)));
    
    const pressEl = document.getElementById('pressValue');
    const pressSl = document.getElementById('pressSlider');
    if (pressEl) pressEl.textContent = '1.0 atm';
    if (pressSl) pressSl.value = String(Math.round(pInv(1.0)));
    
    currentPH = 7.0;
    updatePHIndicator();
    
    if (window.QuestEngine) window.QuestEngine.saveProgress();
    showToast("Meja lab dikosongkan. Suhu disetel ke 25 °C, Tekanan 1.0 atm.");
});

// Konfirmasi 2-Langkah untuk "Mulai dari Nol"
let resetArmed = 0;
const resetBtn = document.getElementById('resetProgressBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        if (!resetArmed) {
            resetArmed = 1;
            resetBtn.textContent = "YAKIN? KLIK LAGI";
            setTimeout(() => {
                resetArmed = 0;
                resetBtn.textContent = "MULAI DARI NOL";
            }, 3000);
        } else {
            resetArmed = 0;
            resetBtn.textContent = "MULAI DARI NOL";
            if (window.QuestEngine) {
                window.QuestEngine.resetProgress();
            }
            document.getElementById('clearBtn').click();
        }
    });
}

// Inisialisasi Segmen Pita pH (15 segmen)
const phStrip = document.getElementById("phStrip");
if (phStrip) {
    phStrip.innerHTML = PHC.map(c => `<i style="background:${c}"></i>`).join("");
}

// Tab Misi / Ensiklopedia Switcher
document.querySelectorAll(".px-tab").forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll(".px-tab").forEach(x => x.setAttribute("aria-selected", x === btn));
        const p0 = document.getElementById("pane0");
        const p1 = document.getElementById("pane1");
        if (p0) p0.hidden = btn.dataset.i !== "0";
        if (p1) p1.hidden = btn.dataset.i !== "1";
    });
});

// Tekan Enter di Input Atom
const atomInputEl = document.getElementById('atomInput');
if (atomInputEl) {
    atomInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('addAtomBtn').click();
        }
    });
}

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
    
    const colors = ['#ffcd75', '#a7f070', '#38b764', '#41a6f6', '#73eff7', '#ef7d57'];
    const fragments = 60;
    
    for (let i = 0; i < fragments; i++) {
        const el = document.createElement('div');
        el.style.position = 'fixed';
        el.style.left = '50%';
        el.style.top = '40%';
        el.style.width = '6px';
        el.style.height = '6px';
        el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        el.style.borderRadius = '0';
        el.style.boxShadow = '1px 1px 0 #0d0f1c';
        el.style.zIndex = '999999';
        el.style.pointerEvents = 'none';
        document.body.appendChild(el);
        
        anime({
            targets: el,
            translateX: () => Math.round(anime.random(-250, 250) / 4) * 4,
            translateY: () => Math.round(anime.random(-150, 350) / 4) * 4,
            opacity: [1, 0],
            duration: () => anime.random(800, 1800),
            easing: 'steps(8)',
            complete: () => el.remove()
        });
    }
};
