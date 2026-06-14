const canvas = document.getElementById('labCanvas');
const ctx = canvas.getContext('2d');

let DB = {
    periodicTable: [],
    molecules: [],
    reactions: [],
    knownMolecules: {}, // mapped by atoms string
    moleculeAtoms: {},
    moleculeThermo: {},
    moleculeAcidBase: {} // Menyimpan data "ACID" / "BASE"
};

let particles = [];
let flashes = []; // Array untuk menampung ReactionFlash
let currentTemp = 25.0;
let currentPress = 1.0;
const MAX_PARTICLES = 150;
let particleCounter = 0; // Untuk ID partikel (digunakan di Spatial Grid)

// Latar belakang saat ini (Netral putih)
let currentBg = {r: 255, g: 255, b: 255};

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
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

        DB.reactions = data.reactions;
        
        const datalist = document.getElementById('atomList');
        DB.periodicTable.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.symbol;
            datalist.appendChild(opt);
        });
        Object.keys(DB.moleculeAtoms).forEach(label => {
            const opt = document.createElement('option');
            opt.value = label.split(' ')[0];
            datalist.appendChild(opt);
        });

    } catch (e) {
        console.error("Gagal memuat data", e);
        alert("Gagal memuat data! Database rusak atau data.js tidak terbaca.");
    }
}

function getAtomData(symbol) {
    return DB.periodicTable.find(a => a.symbol === symbol) || DB.periodicTable.find(a => a.symbol === 'C');
}

function showToast(msg) {
    const toast = document.getElementById('reaction-toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);

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

class Particle {
    constructor(atomSymbols, x, y, moleculeName = null) {
        this.id = particleCounter++;
        this.atomData = atomSymbols.map(sym => getAtomData(sym));
        this.moleculeName = moleculeName;
        this.label = moleculeName ? moleculeName : this.atomData.map(a => a.symbol).join('+');
        
        this.mass = this.atomData.reduce((sum, a) => sum + a.mass, 0);
        
        let rad = 0;
        if (moleculeName) {
            rad = Math.max(8, Math.log1p(this.mass) * 4);
        } else {
            rad = Math.max(6, this.mass * 0.9);
        }
        this.radius = Math.min(rad, 40);
        
        this.x = x || Math.random() * (canvas.width - 100) + 50;
        this.y = y || Math.random() * (canvas.height - 100) + 50;
        
        this.dx = (Math.random() - 0.5) * 4;
        this.dy = (Math.random() - 0.5) * 4;
        this.restitution = 0.8;
        
        if (moleculeName) {
            if (moleculeName.includes('Radikal')) this.color = '#9333ea';
            else if (moleculeName.includes('Air')) this.color = '#3b82f6';
            else if (moleculeName.includes('Klorida') || moleculeName.includes('Metana')) this.color = '#22c55e';
            else if (moleculeName.includes('Ester') || moleculeName.includes('Karboksilat')) this.color = '#f59e0b';
            else this.color = '#64748b';
        } else {
            this.color = this.atomData[0].color;
        }
        
        this.state = "GAS";
        this._gridX = 0;
        this._gridY = 0;
    }

    updatePhysics() {
        let thermo = DB.moleculeThermo[this.label];
        let mp = -273.15, bp = -273.15;
        if (thermo) {
            mp = thermo.mp;
            bp = thermo.bp;
        } else if (!this.moleculeName) {
            let atm = this.atomData[0];
            if (atm.mp !== undefined && atm.bp !== undefined && atm.mp !== 0.0) {
                mp = atm.mp;
                bp = atm.bp;
            } else {
                if (['Fe', 'Zn', 'Mg', 'Al', 'Ag', 'Pb', 'Pt'].includes(atm.symbol)) {
                    mp = 600; bp = 2000;
                } else if (['H', 'O', 'N', 'Cl', 'F', 'He', 'Ne', 'Ar'].includes(atm.symbol)) {
                    mp = -250; bp = -200;
                }
            }
        }
        
        let P_ref = 1.0;
        let R = 8.314;
        let dH_vap = 30000;
        let bp_k = bp + 273.15;
        let dynamic_bp_k = bp_k;
        if (currentPress !== P_ref) {
            dynamic_bp_k = 1.0 / ( (1.0/bp_k) - (R/dH_vap)*Math.log(currentPress/P_ref) );
        }
        let dynamic_bp = dynamic_bp_k - 273.15;
        
        let dynamic_mp = mp;
        if (this.label && this.label.includes("H2O")) {
            dynamic_mp = mp - 0.0074 * (currentPress - 1);
        } else {
            dynamic_mp = mp + 0.02 * (currentPress - 1);
        }
        
        this.current_mp = dynamic_mp;
        this.current_bp = dynamic_bp;
        
        if (currentTemp >= dynamic_bp) {
            if (this.state !== "GAS") {
                this.state = "GAS";
                this.dy -= 3;
            }
        } else if (currentTemp >= dynamic_mp) {
            this.state = "CAIR";
        } else {
            this.state = "PADAT";
        }
        
        let speedMult = (currentTemp + 273.15) / 298.15;
        speedMult = Math.max(0.1, Math.min(speedMult, 3.0));
        
        if (this.state === "GAS") {
            this.restitution = 1.0;
            this.dy -= 0.05 * speedMult;
            this.dx += (Math.random() - 0.5) * 0.2 * speedMult;
            this.dy += (Math.random() - 0.5) * 0.2 * speedMult;
        } else if (this.state === "CAIR") {
            this.restitution = 0.3; // Tidak memantul seperti bola karet
            this.dy += 0.4; // Jatuh ke dasar wadah
            if (currentTemp > -273) {
                let jitter = (currentTemp + 273) * 0.00005;
                this.dx += (Math.random() - 0.5) * jitter;
                this.dy += (Math.random() - 0.5) * jitter;
            }
            this.dx *= 0.95; // Gesekan cairan
            this.dy *= 0.95;
        } else {
            // PADAT
            this.restitution = 0.1; // Sangat kaku
            this.dy += 0.6; // Cepat jatuh
            this.dx *= 0.85; // Gesekan padat tinggi
            this.dy *= 0.85;
        }
        
        let v = Math.hypot(this.dx, this.dy);
        if (v > 10) {
            this.dx = (this.dx/v)*10;
            this.dy = (this.dy/v)*10;
        }
        
        this.x += this.dx;
        this.y += this.dy;
        
        if (this.x - this.radius < 0) { this.x = this.radius; this.dx *= -this.restitution; }
        if (this.x + this.radius > canvas.width) { this.x = canvas.width - this.radius; this.dx *= -this.restitution; }
        if (this.y - this.radius < 0) { this.y = this.radius; this.dy *= -this.restitution; }
        if (this.y + this.radius > canvas.height) { this.y = canvas.height - this.radius; this.dy *= -this.restitution; }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        let gradient = ctx.createRadialGradient(
            this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.1,
            this.x, this.y, this.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, this.color);
        
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let displayLabel = this.moleculeName ? this.moleculeName.split(' ')[0] : this.label;
        if (displayLabel.length > 5) displayLabel = displayLabel.substring(0,5) + '..';
        
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 2;
        ctx.fillText(displayLabel, this.x, this.y);
        ctx.shadowBlur = 0;
    }
}

function applyReactionHeat(deltaH_kJ, numReactions) {
    if (deltaH_kJ === null || deltaH_kJ === undefined) return 0;
    
    // Total massa dari seluruh partikel yang ada saat ini sebagai Heat Capacity pseudo-realistis
    let totalMass = particles.reduce((acc, p) => acc + p.mass, 1.0);
    // Kapasitas panas semu (c) agar suhunya masuk akal di visual
    let heatCapacity = totalMass * 0.15; 
    
    // Perhitungan energi q = mcDT -> DT = q / mc
    // Kita buat skala efisiensi energi 0.08 agar tidak terlalu ekstrim merusak layar
    const energy = Math.abs(deltaH_kJ) * numReactions * 0.08; 
    let deltaT = energy / heatCapacity;
    
    // Eksotermik = memanaskan (+). Endotermik = mendinginkan (-)
    if (deltaH_kJ > 0) deltaT = -deltaT; 
    
    // Dampening limit yang lebih realistis (max 100 derajat per ledakan agar bisa cascade tapi tak hancur)
    const clampedDelta = Math.min(Math.max(deltaT, -50), 100);
    currentTemp += clampedDelta;
    
    // Mencegah suhu drop di bawah nol mutlak (-273.15 C)
    if (currentTemp < -273.15) currentTemp = -273.15;
    
    // Update visual thermometer DOM
    const tempEl = document.getElementById('tempValue');
    if (tempEl) tempEl.textContent = currentTemp.toFixed(1);
    
    // Update posisi tuas Slider agar sinkron dengan ledakan
    const sliderEl = document.getElementById('tempSlider');
    if (sliderEl && !isDraggingTemp) {
        sliderEl.value = currentTemp.toFixed(0);
    }
    
    return clampedDelta; // Kembalikan besaran asli untuk ukuran flash
}

function checkChemistry(p1, p2, spatialGrid) {
    let rReaction = DB.reactions.find(r => 
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
                            if (cp !== p1 && cp !== p2 && !cp.moleculeName && cp.atomData[0].symbol === rReaction.catalyst) {
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
        
        // --- REALISTIC ARRHENIUS PROBABILITY ---
        let T_k = currentTemp + 273.15;
        let Ea_k = effectiveMinTemp + 273.15;
        
        // Deteksi Ikatan Ionik vs Kovalen untuk menentukan Steric Factor
        const NON_METALS = new Set(['H', 'C', 'N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I', 'He', 'Ne', 'Ar']);
        let isP1Metal = p1.atomData.some(a => !NON_METALS.has(a.symbol));
        let isP2Metal = p2.atomData.some(a => !NON_METALS.has(a.symbol));
        let isAcidBaseReaction = (DB.moleculeAcidBase[p1.label] && DB.moleculeAcidBase[p2.label]);
        
        let isIonic = isP1Metal || isP2Metal || isAcidBaseReaction;
        
        let isP1Radical = DB.molecules.find(m => m.label === p1.label)?.bond_type === 'Radikal Bebas';
        let isP2Radical = DB.molecules.find(m => m.label === p2.label)?.bond_type === 'Radikal Bebas';
        
        // Steric factor: Ionik/Radikal = 1.0 (100% bebas sudut). Kovalen = 0.15 (15% - optimal dan seimbang)
        let baseRate = (isIonic || isP1Radical || isP2Radical) ? 1.0 : 0.15; 
        let prob = baseRate;
        
        if (T_k < Ea_k) {
            // Peluruhan eksponensial probabilitas (Persamaan Arrhenius)
            // Jika suhu 50 K di bawah batas, probabilitas tersisa e^-1 (~36% dari base rate)
            prob = baseRate * Math.exp(-(Ea_k - T_k) / 50.0);
        }
        
        if (Math.random() <= prob) {
            return { 
                type: 'COMPLEX', 
                products: rReaction.products, 
                is_exothermic: rReaction.delta_H_kJ ? rReaction.delta_H_kJ < 0 : true,
                delta_H_kJ: rReaction.delta_H_kJ
            };
        }
    }
    
    // 2. Cek Sintesis Dasar
    if (!p1.moleculeName && !p2.moleculeName) {
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
    }
    return null;
}

function resolveCollisions() {
    let toRemove = new Set();
    let toAdd = [];
    
    // Spatial Partitioning Grid (Cell Size = 80)
    const CELL_SIZE = 80;
    let grid = new Map();
    
    particles.forEach(p => {
        let cx = Math.floor(p.x / CELL_SIZE);
        let cy = Math.floor(p.y / CELL_SIZE);
        let key = `${cx},${cy}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(p);
        p._gridX = cx;
        p._gridY = cy;
    });
    
    let checkedPairs = new Set();
    
    for (let p1 of particles) {
        if (toRemove.has(p1)) continue;
        
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                let neighborKey = `${p1._gridX + dx},${p1._gridY + dy}`;
                let cell = grid.get(neighborKey);
                
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
                        
                        if (dist < minDist) {
                            // Check Chemistry dengan Passing Grid (untuk Katalis)
                            let reaction = checkChemistry(p1, p2, grid);
                            if (reaction) {
                                toRemove.add(p1);
                                toRemove.add(p2);
                                
                                // Kalkulasi Panas & Termodinamika
                                let dTemp = applyReactionHeat(reaction.delta_H_kJ, 1);
                                
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
                                
                                flashes.push(new ReactionFlash(mx, my, reaction.is_exothermic, dTemp));
                                
                                reaction.products.forEach(prodName => {
                                    let atoms = DB.moleculeAtoms[prodName] || ['C'];
                                    toAdd.push(new Particle(atoms, mx, my, prodName));
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
                            
                            let e = Math.min(p1.restitution, p2.restitution);
                            let j_impulse = -(1 + e) * velAlongNormal;
                            j_impulse /= (1/p1.mass) + (1/p2.mass);
                            
                            let impulseX = j_impulse * nx;
                            let impulseY = j_impulse * ny;
                            
                            p1.dx += impulseX / p1.mass;
                            p1.dy += impulseY / p1.mass;
                            p2.dx -= impulseX / p2.mass;
                            p2.dy -= impulseY / p2.mass;
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

function updatePHIndicator() {
    // 1. HITUNG SCORE H+ EFEKTIF
    const score = particles.reduce((acc, p) => {
        let label = p.label;
        let type = DB.moleculeAcidBase[label];
        let f = 0;
        if (type) {
             let factorInfo = DB.molecules.find(m => m.label === label);
             if (factorInfo && factorInfo.ionization_factor !== null) {
                 f = factorInfo.ionization_factor;
             } else {
                 f = 1.0; 
             }
        }
        
        if (type === 'ACID') return acc + f;
        if (type === 'BASE') return acc - f;
        return acc;
    }, 0);

    const volume_L = (canvas.width * canvas.height) / 10000.0;
    const concentration = score / volume_L;
    
    const k = 1.0;
    const targetPH = 7.0 - Math.tanh(concentration / k) * 7.0;

    if (typeof this._currentPH === 'undefined') this._currentPH = 7.0;
    this._currentPH += (targetPH - this._currentPH) * 0.03;
    const pH = this._currentPH;

    let targetR = 255, targetG = 255, targetB = 255;
    
    if (pH < 3) { targetR = 229; targetG = 57; targetB = 53; }      
    else if (pH < 5) { targetR = 239; targetG = 154; targetB = 154; } 
    else if (pH < 6.5) { targetR = 255; targetG = 204; targetB = 128; } 
    else if (pH <= 7.5) { targetR = 255; targetG = 255; targetB = 255; } 
    else if (pH <= 9) { targetR = 227; targetG = 242; targetB = 253; } 
    else if (pH <= 11) { targetR = 92; targetG = 107; targetB = 192; } 
    else { targetR = 49; targetG = 27; targetB = 146; }             

    currentBg.r += (targetR - currentBg.r) * 0.05;
    currentBg.g += (targetG - currentBg.g) * 0.05;
    currentBg.b += (targetB - currentBg.b) * 0.05;

    const wrapper = document.querySelector('.canvas-wrapper');
    if (wrapper) {
        if (pH > 6.5 && pH < 7.5) {
             wrapper.style.backgroundColor = `rgba(255, 255, 255, 0.1)`; 
        } else {
             wrapper.style.backgroundColor = `rgba(${Math.round(currentBg.r)}, ${Math.round(currentBg.g)}, ${Math.round(currentBg.b)}, 0.3)`;
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    updatePHIndicator();
    
    particles.forEach(p => p.updatePhysics());
    resolveCollisions();
    
    // Draw Particles
    particles.forEach(p => p.draw());
    
    // Draw Flashes
    flashes.forEach(f => {
        f.update();
        f.draw();
    });
    flashes = flashes.filter(f => f.alpha > 0);
    
    // Live update Info Panel
    if (selectedParticle) {
        if (!particles.includes(selectedParticle)) {
            selectedParticle = null;
            document.getElementById('particleInfo').classList.add('hidden');
        } else {
            let molData = DB.molecules.find(m => m.label === selectedParticle.label);
            document.getElementById('infoName').textContent = selectedParticle.label;
            document.getElementById('infoMolarMass').textContent = (molData && molData.molar_mass) ? molData.molar_mass.toFixed(2) + ' g/mol' : selectedParticle.mass.toFixed(2) + ' g/mol (Kalkulasi)';
            document.getElementById('infoDensity').textContent = (molData && molData.density) ? molData.density + ' g/cm³' : 'N/A';
            document.getElementById('infoMP').textContent = (selectedParticle.current_mp !== undefined ? selectedParticle.current_mp.toFixed(1) : "N/A") + ' °C';
            document.getElementById('infoBP').textContent = (selectedParticle.current_bp !== undefined ? selectedParticle.current_bp.toFixed(1) : "N/A") + ' °C';
            document.getElementById('infoPhase').textContent = selectedParticle.state;
            
            let abType = DB.moleculeAcidBase[selectedParticle.label];
            let abText = "Netral";
            if (abType === 'ACID') abText = "Asam";
            else if (abType === 'BASE') abText = "Basa";
            document.getElementById('infoAcidBase').textContent = abText;
            
            let bondText = molData && molData.bond_type ? molData.bond_type : "Tidak Diketahui";
            document.getElementById('infoBondType').textContent = bondText;
        }
    }
    
    requestAnimationFrame(animate);
}

// Event Listeners
let isDraggingTemp = false;
const tempSliderEl = document.getElementById('tempSlider');

if (tempSliderEl) {
    tempSliderEl.addEventListener('mousedown', () => isDraggingTemp = true);
    tempSliderEl.addEventListener('mouseup', () => isDraggingTemp = false);
    tempSliderEl.addEventListener('touchstart', () => isDraggingTemp = true);
    tempSliderEl.addEventListener('touchend', () => isDraggingTemp = false);

    tempSliderEl.addEventListener('input', (e) => {
        currentTemp = parseFloat(e.target.value);
        const tempEl = document.getElementById('tempValue');
        if (tempEl) tempEl.textContent = currentTemp.toFixed(0);
    });
}

document.getElementById('pressSlider').addEventListener('input', (e) => {
    currentPress = parseFloat(e.target.value);
    document.getElementById('pressValue').textContent = currentPress.toFixed(1);
});

document.getElementById('clearBtn').addEventListener('click', () => {
    particles = [];
});

document.getElementById('addAtomBtn').addEventListener('click', () => {
    let input = document.getElementById('atomInput').value.trim();
    if (!input) return;
    
    input = input.charAt(0).toUpperCase() + input.slice(1);
    let matchedLabel = null;
    let atomSymbols = [];
    
    if (DB.periodicTable.find(a => a.symbol === input)) {
        atomSymbols = [input];
    } else {
        matchedLabel = Object.keys(DB.moleculeAtoms).find(lbl => lbl.startsWith(input + " ") || lbl === input);
        if (matchedLabel) {
            atomSymbols = DB.moleculeAtoms[matchedLabel];
        }
    }
    
    if (atomSymbols.length > 0) {
        particles.push(new Particle(atomSymbols, null, null, matchedLabel));
    } else {
        alert("Atom/Molekul tidak ditemukan!");
    }
});

let selectedParticle = null;
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    selectedParticle = particles.find(p => Math.hypot(p.x - mx, p.y - my) <= p.radius);
    const infoPanel = document.getElementById('particleInfo');
    
    if (selectedParticle) {
        infoPanel.classList.remove('hidden');
    } else {
        infoPanel.classList.add('hidden');
        
        let input = document.getElementById('atomInput').value.trim();
        if (!input) return;
        
        input = input.charAt(0).toUpperCase() + input.slice(1);
        let matchedLabel = null;
        let atomSymbols = [];
        
        matchedLabel = Object.keys(DB.moleculeAtoms).find(lbl => lbl.startsWith(input + " ") || lbl === input);
        if (matchedLabel) {
            atomSymbols = DB.moleculeAtoms[matchedLabel];
        } else if (DB.periodicTable.find(a => a.symbol === input)) {
            atomSymbols = [input];
        }
        
        if (atomSymbols.length > 0) {
            particles.push(new Particle(atomSymbols, mx, my, matchedLabel));
        }
    }
});

initDB().then(() => {
    animate();
});
