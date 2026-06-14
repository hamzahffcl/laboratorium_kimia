import tkinter as tk
from tkinter import ttk, messagebox
import random
import math
import datetime
from chemistry import get_atom_data, get_molecule_thermo, check_complex_reaction, can_bond, get_molecule_atoms

class Particle:
    def __init__(self, canvas, atom_data_list, x, y, molecule_name=None):
        self.canvas = canvas
        self.atom_data = atom_data_list # List of AtomData objects
        
        if molecule_name:
            self.label = molecule_name
            # Buat warna spesifik untuk senyawa (ungu / magenta)
            color = '#9b59b6' 
            mass = sum(a.mass for a in self.atom_data)
            thermo = get_molecule_thermo(molecule_name)
            self.mp = thermo['mp']
            self.bp = thermo['bp']
        else:
            self.label = atom_data_list[0].symbol
            color = atom_data_list[0].color
            mass = atom_data_list[0].mass
            self.mp = atom_data_list[0].mp
            self.bp = atom_data_list[0].bp
            
        self.x = x
        self.y = y
        self.vx = random.uniform(-2, 2)
        self.vy = random.uniform(-2, 2)
        
        # Ukuran radius berdasarkan massa (diskalakan, diperkecil 50%)
        self.radius = max(6, min(17, math.sqrt(mass) * 0.9))
        self.state = "gas"
        self.current_mp = self.mp
        self.current_bp = self.bp
        
        # Gambar bola dan teks di canvas
        self.id = canvas.create_oval(x-self.radius, y-self.radius, x+self.radius, y+self.radius, fill=color, outline='white')
        
        text_color = 'black' if color in ['white', 'yellow', 'cyan'] else 'white'
        self.text_id = canvas.create_text(x, y, text=self.label, fill=text_color, font=('Arial', 10, 'bold'))
        
    def move(self, min_x, min_y, max_x, max_y, temp_factor, current_temp, pressure):
        # Fisika Termodinamika: Perubahan Titik Didih (Clausius-Clapeyron & Aturan Trouton)
        bp_k = self.bp + 273.15
        if bp_k > 0:
            # T_bp_baru = T_bp_lama / (1 - (R/dH_vap) * ln(P))
            # R/dH_vap dengan aturan Trouton bernilai sekitar 0.0978
            denominator = 1 - 0.0978 * math.log(pressure) if pressure > 0 else 1
            if denominator > 0:
                current_bp = (bp_k / denominator) - 273.15
            else:
                current_bp = self.bp
        else:
            current_bp = self.bp
            
        # Perubahan Titik Beku (Anomali Air)
        if "H2O" in self.label:
            current_mp = self.mp - 0.0074 * (pressure - 1) # Es mencair jika ditekan
        else:
            current_mp = self.mp + 0.02 * (pressure - 1)   # Benda lain makin keras/beku jika ditekan

        # Penentuan wujud zat
        if current_temp < current_mp:
            state = "solid"
        elif current_temp < current_bp:
            state = "liquid"
        else:
            state = "gas"
            
        self.state = state
        self.current_mp = current_mp
        self.current_bp = current_bp

        jitter_x = 0
        jitter_y = 0
        
        if state == "gas":
            if temp_factor > 1.0:
                jitter_x = random.uniform(-0.5, 0.5) * temp_factor
                jitter_y = random.uniform(-0.5, 0.5) * temp_factor
                
            # Efek Menguap (Evaporation Kick): Jika gas terdiam (ex-cairan), beri dorongan mengapung
            if abs(self.vx) < 0.5 and abs(self.vy) < 0.5:
                self.vx += random.uniform(-2, 2)
                self.vy -= random.uniform(2, 5) # Daya apung ke atas
                
            self.x += self.vx * temp_factor + jitter_x
            self.y += self.vy * temp_factor + jitter_y
        elif state == "liquid":
            # Agitasi Termal (Gerak Brown) sesuai suhu
            brownian = temp_factor * 0.4
            self.vx += random.uniform(-brownian, brownian)
            self.vy += random.uniform(-brownian, brownian)
            
            # Gravitasi & Viskositas ringan
            self.vy += 0.2
            self.vx *= 0.95
            self.vy *= 0.95
            if self.vy > 5: self.vy = 5
            self.x += self.vx
            self.y += self.vy
        elif state == "solid":
            # Getaran Kristal pada kisi padat akibat suhu
            vibration = temp_factor * 0.2
            self.x += random.uniform(-vibration, vibration)
            self.y += random.uniform(-vibration, vibration)
            
            # Gravitasi kaku & Gesekan besar
            self.vy += 0.5
            self.vx *= 0.5
            self.vy *= 0.9
            if self.vy > 8: self.vy = 8
            self.x += self.vx
            self.y += self.vy
        
        # Pantulan di dinding Chamber (Wadah Tekanan)
        # Jika partikel berada di luar batas (karena tekanan dinaikkan mendadak), paksa masuk
        if self.x - self.radius < min_x:
            self.x = min_x + self.radius
            self.vx *= -1 if state == "gas" else -0.5
        elif self.x + self.radius > max_x:
            self.x = max_x - self.radius
            self.vx *= -1 if state == "gas" else -0.5
            
        if self.y - self.radius < min_y:
            self.y = min_y + self.radius
            self.vy *= -1 if state == "gas" else -0.5
        elif self.y + self.radius > max_y:
            self.y = max_y - self.radius
            if state == "gas":
                self.vy *= -1
                if abs(self.vy) < 2: self.vy = random.uniform(-4, -1) # Cegah gas nyangkut di lantai
            else:
                self.vy *= -0.3 # Menyerap gaya saat menyentuh lantai
                if abs(self.vy) < 0.5: 
                    self.vy = 0
                    if state == "solid": self.vx = 0
            
        # Update posisi di canvas
        self.canvas.coords(self.id, self.x-self.radius, self.y-self.radius, self.x+self.radius, self.y+self.radius)
        self.canvas.coords(self.text_id, self.x, self.y)

class LabSimulation:
    def __init__(self, root):
        self.root = root
        self.root.title("Simulasi Lab Kimia 2D (Tumbukan & Reaksi)")
        self.root.geometry("1100x600")
        
        self.particles = []
        self.selected_particle = None
        self.max_particles = 300 
        
        # Setup UI
        main_layout = ttk.Frame(root)
        main_layout.pack(fill=tk.BOTH, expand=True)
        
        self.canvas = tk.Canvas(main_layout, bg="#2c3e50")
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.chamber_rect = self.canvas.create_rectangle(50, 50, 750, 550, outline="red", dash=(4, 4), width=2)
        self.canvas.bind("<Button-1>", self.on_canvas_click)
        
        control_frame = ttk.Frame(main_layout, width=300, padding=10)
        control_frame.pack(side=tk.RIGHT, fill=tk.Y)
        
        ttk.Label(control_frame, text="Pilih / Ketik Atom:", font=('Arial', 11, 'bold')).pack(pady=(0, 5))
        periodic_table = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "Fe", "Zn", "Ag", "Pb", "K", "I"]
        self.selected_atom_var = tk.StringVar(value="H")
        self.atom_dropdown = ttk.Combobox(control_frame, textvariable=self.selected_atom_var, values=periodic_table)
        self.atom_dropdown.pack(fill=tk.X, pady=5)
        ttk.Button(control_frame, text="Tambah Atom", command=lambda: self.add_atom(self.selected_atom_var.get().strip().capitalize())).pack(fill=tk.X)
        
        # Slider Suhu
        ttk.Label(control_frame, text="Suhu Wadah (°C):", font=('Arial', 10, 'bold')).pack(pady=(10, 0))
        self.temp_var = tk.DoubleVar(value=25.0)
        self.temp_slider = ttk.Scale(control_frame, from_=-273.0, to=3000.0, orient='horizontal', variable=self.temp_var)
        self.temp_slider.pack(fill=tk.X)
        
        temp_input_frame = ttk.Frame(control_frame)
        temp_input_frame.pack(pady=(0, 10))
        self.temp_entry = ttk.Spinbox(temp_input_frame, from_=-273.0, to=3000.0, textvariable=self.temp_var, width=8)
        self.temp_entry.pack(side=tk.LEFT)
        ttk.Label(temp_input_frame, text=" °C").pack(side=tk.LEFT)
        
        # Tekanan Label
        ttk.Label(control_frame, text="Tekanan (atm) [Efek Clausius-Clapeyron]:", font=('Arial', 9, 'bold')).pack(pady=(10, 0))
        self.press_var = tk.DoubleVar(value=1.0)
        self.press_slider = ttk.Scale(control_frame, from_=0.1, to=100.0, variable=self.press_var, orient=tk.HORIZONTAL)
        self.press_slider.pack(fill=tk.X)
        
        press_input_frame = ttk.Frame(control_frame)
        press_input_frame.pack()
        self.press_entry = ttk.Spinbox(press_input_frame, from_=0.1, to=100.0, increment=0.1, textvariable=self.press_var, width=8)
        self.press_entry.pack(side=tk.LEFT)
        ttk.Label(press_input_frame, text=" atm").pack(side=tk.LEFT)
        
        # Panel Info Partikel
        info_frame = ttk.LabelFrame(control_frame, text="🔍 Info Partikel (Klik Atom di Layar)")
        info_frame.pack(fill=tk.X, pady=(15, 5))
        self.info_label = ttk.Label(info_frame, text="Belum ada atom yang dipilih.", font=('Arial', 9), justify=tk.LEFT)
        self.info_label.pack(anchor=tk.W, padx=5, pady=5)
        
        # Panel Log Jurnal
        log_frame = ttk.LabelFrame(control_frame, text="📝 Log Jurnal Aktivitas")
        log_frame.pack(fill=tk.BOTH, expand=True, pady=(5, 0))
        self.log_text = tk.Text(log_frame, height=10, width=35, state=tk.DISABLED, font=('Consolas', 8), wrap=tk.WORD)
        self.log_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        ttk.Button(control_frame, text="Hapus Semua Partikel", command=self.clear_lab).pack(fill=tk.X, pady=5)
        
        self.log_event("Simulator Laboratorium Diaktifkan.")
        self.update()

    def log_event(self, text):
        now = datetime.datetime.now().strftime("%H:%M:%S")
        msg = f"[{now}] {text}\n"
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, msg)
        
        # Pembatas memori GUI (Maksimal 100 baris)
        lines = int(self.log_text.index('end-1c').split('.')[0])
        if lines > 100:
            self.log_text.delete('1.0', f'{lines - 100 + 1}.0')
            
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)

    def on_canvas_click(self, event):
        x, y = event.x, event.y
        closest_p = None
        min_dist = 30 
        for p in self.particles:
            dist = math.hypot(p.x - x, p.y - y)
            if dist <= min_dist + p.radius:
                min_dist = dist
                closest_p = p
                
        if closest_p:
            self.selected_particle = closest_p
            self.log_event(f"Menyorot molekul: {closest_p.label}")
        else:
            # Jika klik di area kosong, tambahkan atom baru di koordinat mouse
            symbol = self.selected_atom_var.get()
            self.add_atom(symbol, x, y)

    def add_atom(self, symbol, x=None, y=None):
        try:
            atom_data = get_atom_data(symbol)
            if x is None:
                x = random.randint(50, 750)
            if y is None:
                y = random.randint(50, 550)
            p = Particle(self.canvas, [atom_data], x, y)
            self.particles.append(p)
            self.log_event(f"➕ Atom ditambahkan: {symbol}")
            if len(self.particles) > self.max_particles:
                oldest = self.particles.pop(0)
                self.canvas.delete(oldest.id)
                self.canvas.delete(oldest.text_id)
        except Exception as e:
            from chemistry import MOLECULE_ATOMS_BY_LABEL, get_molecule_atoms
            import tkinter.messagebox as messagebox
            
            matched_label = None
            for label in MOLECULE_ATOMS_BY_LABEL.keys():
                if label.startswith(symbol + " ") or label == symbol:
                    matched_label = label
                    break
                    
            if matched_label:
                atoms = get_molecule_atoms(matched_label)
                if x is None:
                    x = random.randint(50, 750)
                if y is None:
                    y = random.randint(50, 550)
                p = Particle(self.canvas, atoms, x, y, molecule_name=matched_label)
                self.particles.append(p)
                self.log_event(f"➕ Molekul ditambahkan: {matched_label}")
                if len(self.particles) > self.max_particles:
                    oldest = self.particles.pop(0)
                    self.canvas.delete(oldest.id)
                    self.canvas.delete(oldest.text_id)
            else:
                messagebox.showerror("Error", f"Data atom/molekul {symbol} tidak ditemukan!")

    def clear_lab(self):
        self.canvas.delete("all")
        self.chamber_rect = self.canvas.create_rectangle(50, 50, 750, 550, outline="red", dash=(4, 4), width=2)
        self.particles = []
        self.selected_particle = None
        self.log_event("Wadah dikosongkan.")

    def check_collisions(self, current_temp):
        grid = {}
        cell_size = 40
        for p in self.particles:
            min_col = int((p.x - p.radius) // cell_size)
            max_col = int((p.x + p.radius) // cell_size)
            min_row = int((p.y - p.radius) // cell_size)
            max_row = int((p.y + p.radius) // cell_size)
            
            for row in range(min_row, max_row + 1):
                for col in range(min_col, max_col + 1):
                    cell = (row, col)
                    if cell not in grid: grid[cell] = []
                    grid[cell].append(p)
                    
        to_remove = set()
        to_add = []
        checked_pairs = set()
        
        for cell, cell_particles in grid.items():
            for i in range(len(cell_particles)):
                p1 = cell_particles[i]
                for j in range(i+1, len(cell_particles)):
                    p2 = cell_particles[j]
                    if p1 in to_remove or p2 in to_remove: continue
                    
                    pair_id = (id(p1), id(p2)) if id(p1) < id(p2) else (id(p2), id(p1))
                    if pair_id in checked_pairs: continue
                    checked_pairs.add(pair_id)
                    
                    dx, dy = p1.x - p2.x, p1.y - p2.y
                    if math.hypot(dx, dy) < (p1.radius + p2.radius):
                        # Selalu cek Reaksi Kompleks terlebih dahulu berdasarkan label partikel
                        complex_products = check_complex_reaction([p1.label, p2.label], current_temp)
                        if complex_products:
                            self.log_event(f"💥 REAKSI: {p1.label} + {p2.label} -> {', '.join(complex_products)}")
                            to_remove.update([p1, p2])
                            for prod in complex_products:
                                new_atoms = get_molecule_atoms(prod)
                                new_p = Particle(self.canvas, new_atoms, (p1.x+p2.x)/2, (p1.y+p2.y)/2, molecule_name=prod)
                                to_add.append(new_p)
                        elif p1.molecule_name is None and p2.molecule_name is None:
                            # Jika tidak ada reaksi kompleks, dan keduanya adalah atom tunggal, coba sintesis ikatan dasar
                            combined_atoms = p1.atom_data + p2.atom_data
                            molecule_name = can_bond(combined_atoms, current_temp)
                            if molecule_name:
                                self.log_event(f"🔄 SINTESIS: {p1.label} + {p2.label} -> {molecule_name}")
                                to_remove.update([p1, p2])
                                new_atoms = get_molecule_atoms(molecule_name)
                                new_p = Particle(self.canvas, new_atoms, (p1.x+p2.x)/2, (p1.y+p2.y)/2, molecule_name=molecule_name)
                                to_add.append(new_p)
                            else:
                                # Fisika Momentum Elastis Nyata
                                dist = math.hypot(dx, dy)
                                if dist == 0:
                                    dist = 0.1
                                    dx, dy = random.uniform(-0.1, 0.1), random.uniform(-0.1, 0.1)
                                    
                                nx = dx / dist
                                ny = dy / dist
                                dvx = p1.vx - p2.vx
                                dvy = p1.vy - p2.vy
                                v_norm = dvx * nx + dvy * ny
                                
                                if v_norm < 0: # Hanya bereaksi jika saling mendekat
                                    m1 = sum(a.mass for a in p1.atom_data)
                                    m2 = sum(a.mass for a in p2.atom_data)
                                    impulse = -(1 + 1.0) * v_norm / (1/m1 + 1/m2)
                                    
                                    p1.vx += (impulse * nx) / m1
                                    p1.vy += (impulse * ny) / m1
                                    p2.vx -= (impulse * nx) / m2
                                    p2.vy -= (impulse * ny) / m2
                                
                                # Dorongan tolakan elastis agar tidak lengket (Overlap Separation)
                                overlap = (p1.radius + p2.radius) - dist + 1
                                if overlap > 0:
                                    p1.x += nx * (overlap / 2)
                                    p1.y += ny * (overlap / 2)
                                    p2.x -= nx * (overlap / 2)
                                    p2.y -= ny * (overlap / 2)
                            
        for p in to_remove:
            self.canvas.delete(p.id)
            self.canvas.delete(p.text_id)
            if p in self.particles: self.particles.remove(p)
        self.particles.extend(to_add)
            
    def update(self):
        width = self.canvas.winfo_width()
        height = self.canvas.winfo_height()
        
        if width > 1 and height > 1:
            pressure = self.press_var.get()
            temp = self.temp_var.get()
            
            scale_factor = 1.0 / math.sqrt(pressure)
            box_w = width * scale_factor
            box_h = height * scale_factor
            
            cx, cy = width / 2, height / 2
            min_x = cx - box_w / 2
            max_x = cx + box_w / 2
            min_y = cy - box_h / 2
            max_y = cy + box_h / 2
            
            self.canvas.coords(self.chamber_rect, min_x, min_y, max_x, max_y)
            
            # Info Partikel
            if self.selected_particle and self.selected_particle in self.particles:
                p = self.selected_particle
                info = (
                    f"Nama Kimia: {p.label}\n"
                    f"Fase Fisik: {p.state.upper()}\n"
                    f"Titik Beku Dinamis: {p.current_mp:.1f} °C\n"
                    f"Titik Didih Dinamis: {p.current_bp:.1f} °C\n"
                )
                self.info_label.config(text=info)
            else:
                self.selected_particle = None
                self.info_label.config(text="Belum ada atom yang dipilih.")
            
            # Kinetik
            t_kelvin = temp + 273.15
            temp_factor = math.sqrt(t_kelvin / 298.15) if t_kelvin > 0 else 0
            
            for p in self.particles:
                p.move(min_x, min_y, max_x, max_y, temp_factor, temp, pressure)
                
            self.check_collisions(temp)
            
        self.root.after(16, self.update) # ~60 FPS

if __name__ == "__main__":
    root = tk.Tk()
    app = LabSimulation(root)
    root.mainloop()
