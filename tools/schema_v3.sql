-- ============================================================
-- Lab Fisika Kimia 2D — Skema Database v3 (usulan perbaikan)
-- Jalankan dengan: sqlite3 chemistry_v3.db < schema_v3.sql
-- ============================================================
PRAGMA foreign_keys = ON;   -- WAJIB tiap koneksi; SQLite mematikannya secara default

-- 1) Tabel unsur (sebelumnya tidak ada di SQLite) ---------------
CREATE TABLE Elements (
  atomic_number INTEGER PRIMARY KEY CHECK (atomic_number BETWEEN 1 AND 118),
  symbol        TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  atomic_mass   REAL NOT NULL CHECK (atomic_mass > 0),
  category      TEXT NOT NULL CHECK (category IN
                ('nonmetal','noble_gas','halogen','alkali_metal','alkaline_earth',
                 'metalloid','post_transition','lanthanide','actinide','transition_metal')),
  valence       INTEGER            -- valensi umum untuk gambar ikatan (H1,O2,N3,C4,...)
);

-- 2) Molekul -----------------------------------------------------
CREATE TABLE Molecules (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  label              TEXT NOT NULL UNIQUE,        -- rumus tampilan, mis. 'H2SO4'
  name               TEXT,
  -- fisik (semua suhu dalam °C di DB; konversi ke Kelvin di kode)
  melting_point_c    REAL,
  boiling_point_c    REAL,
  hvap_kj_mol        REAL CHECK (hvap_kj_mol IS NULL OR hvap_kj_mol > 0),  -- BARU: pengganti 30 kJ/mol global
  density            REAL,
  heat_capacity      REAL,                         -- J/(mol·K)
  enthalpy_formation REAL,                         -- kJ/mol (ΔHf°)
  molar_mass         REAL NOT NULL CHECK (molar_mass > 0),
  -- asam/basa (enum Inggris, huruf besar, konsisten)
  acid_base_type     TEXT NOT NULL DEFAULT 'NEUTRAL'
                     CHECK (acid_base_type IN ('ACID','BASE','NEUTRAL','AMPHOTERIC')),
  acid_base_strength TEXT NOT NULL DEFAULT 'NONE'
                     CHECK (acid_base_strength IN ('STRONG','MODERATE','WEAK','NONE')),
  ionization_factor  REAL CHECK (ionization_factor IS NULL OR ionization_factor BETWEEN 0 AND 1),
  h_count            INTEGER NOT NULL DEFAULT 0 CHECK (h_count  >= 0),  -- BARU: H+ yang bisa dilepas / molekul
  oh_count           INTEGER NOT NULL DEFAULT 0 CHECK (oh_count >= 0),  -- BARU: OH- yang bisa dilepas / molekul
  pka1               REAL,
  pka2               REAL,
  bond_type          TEXT CHECK (bond_type IN ('COVALENT','IONIC','METALLIC')),
  charge             INTEGER NOT NULL DEFAULT 0,
  is_intermediate    INTEGER NOT NULL DEFAULT 0 CHECK (is_intermediate IN (0,1)),  -- BARU: radikal perantara (CH2, NH2, SF3...)
  -- PubChem
  pubchem_cid        INTEGER,
  iupac_name         TEXT,
  exact_mass         REAL,
  complexity         REAL,
  isomeric_smiles    TEXT,
  CHECK (boiling_point_c IS NULL OR melting_point_c IS NULL OR boiling_point_c > melting_point_c),
  CHECK ((acid_base_type = 'NEUTRAL') = (acid_base_strength = 'NONE')),
  CHECK (acid_base_type <> 'ACID' OR h_count  > 0),
  CHECK (acid_base_type <> 'BASE' OR oh_count > 0)
);
-- molecular_weight dihapus: duplikat molar_mass.

CREATE TABLE MoleculeAtoms (
  molecule_id INTEGER NOT NULL REFERENCES Molecules(id) ON DELETE CASCADE,
  atom_symbol TEXT    NOT NULL REFERENCES Elements(symbol),
  atom_count  INTEGER NOT NULL CHECK (atom_count > 0),
  PRIMARY KEY (molecule_id, atom_symbol)
) WITHOUT ROWID;

-- 3) Reaksi ------------------------------------------------------
CREATE TABLE Reactions (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  mechanism_group       TEXT,            -- BARU: nama jalur bertahap, mis. 'sintesis_metana'
  step_no               INTEGER,         -- BARU: urutan langkah dalam jalur
  min_temp_c            REAL NOT NULL DEFAULT 25.0,
  catalyst_id           INTEGER REFERENCES Molecules(id),  -- sebelumnya TEXT bebas
  min_temp_catalyzed_c  REAL,
  ea_kj_mol             REAL CHECK (ea_kj_mol IS NULL OR ea_kj_mol > 0),   -- BARU: energi aktivasi (default kode: 50)
  delta_h_kj            REAL,            -- NULL = hitung dari ΔHf (lihat view v_reaction_dh)
  is_reversible         INTEGER NOT NULL DEFAULT 0 CHECK (is_reversible IN (0,1)),  -- BARU
  CHECK (catalyst_id IS NULL OR min_temp_catalyzed_c IS NOT NULL),
  CHECK (min_temp_catalyzed_c IS NULL OR min_temp_catalyzed_c <= min_temp_c)
);
-- is_exothermic dihapus: turunan dari tanda ΔH (view v_reaction_dh). Default -50 dihapus.

CREATE TABLE ReactionReactants (
  reaction_id INTEGER NOT NULL REFERENCES Reactions(id) ON DELETE CASCADE,
  molecule_id INTEGER NOT NULL REFERENCES Molecules(id),
  coefficient INTEGER NOT NULL DEFAULT 1 CHECK (coefficient > 0),
  PRIMARY KEY (reaction_id, molecule_id)
) WITHOUT ROWID;

CREATE TABLE ReactionProducts (
  reaction_id INTEGER NOT NULL REFERENCES Reactions(id) ON DELETE CASCADE,
  molecule_id INTEGER NOT NULL REFERENCES Molecules(id),   -- sebelumnya 'product_id' (tidak konsisten)
  coefficient INTEGER NOT NULL DEFAULT 1 CHECK (coefficient > 0),
  PRIMARY KEY (reaction_id, molecule_id)
) WITHOUT ROWID;

CREATE INDEX idx_ma_symbol     ON MoleculeAtoms(atom_symbol);
CREATE INDEX idx_rr_molecule   ON ReactionReactants(molecule_id);
CREATE INDEX idx_rp_molecule   ON ReactionProducts(molecule_id);
CREATE INDEX idx_rx_group      ON Reactions(mechanism_group, step_no);

-- 4) View perhitungan -------------------------------------------
-- ΔH dihitung dari ΔHf; dipakai jika delta_h_kj kosong
CREATE VIEW v_reaction_dh AS
SELECT r.id AS reaction_id,
       r.delta_h_kj AS dh_manual,
       (SELECT SUM(rp.coefficient * m.enthalpy_formation) FROM ReactionProducts  rp JOIN Molecules m ON m.id = rp.molecule_id WHERE rp.reaction_id = r.id)
     - (SELECT SUM(rr.coefficient * m.enthalpy_formation) FROM ReactionReactants rr JOIN Molecules m ON m.id = rr.molecule_id WHERE rr.reaction_id = r.id) AS dh_computed,
       COALESCE(r.delta_h_kj,
         (SELECT SUM(rp.coefficient * m.enthalpy_formation) FROM ReactionProducts  rp JOIN Molecules m ON m.id = rp.molecule_id WHERE rp.reaction_id = r.id)
       - (SELECT SUM(rr.coefficient * m.enthalpy_formation) FROM ReactionReactants rr JOIN Molecules m ON m.id = rr.molecule_id WHERE rr.reaction_id = r.id)) AS dh_effective
FROM Reactions r;

-- 5) View validasi: SEMUA harus mengembalikan 0 baris ------------
CREATE VIEW v_check_atom_balance AS
WITH side AS (
  SELECT rr.reaction_id, ma.atom_symbol, -rr.coefficient * ma.atom_count AS n
    FROM ReactionReactants rr JOIN MoleculeAtoms ma ON ma.molecule_id = rr.molecule_id
  UNION ALL
  SELECT rp.reaction_id, ma.atom_symbol,  rp.coefficient * ma.atom_count
    FROM ReactionProducts  rp JOIN MoleculeAtoms ma ON ma.molecule_id = rp.molecule_id)
SELECT reaction_id, atom_symbol, SUM(n) AS selisih
FROM side GROUP BY reaction_id, atom_symbol HAVING SUM(n) <> 0;

CREATE VIEW v_check_charge_balance AS
SELECT r.id AS reaction_id,
       COALESCE((SELECT SUM(rp.coefficient*m.charge) FROM ReactionProducts  rp JOIN Molecules m ON m.id=rp.molecule_id WHERE rp.reaction_id=r.id),0)
     - COALESCE((SELECT SUM(rr.coefficient*m.charge) FROM ReactionReactants rr JOIN Molecules m ON m.id=rr.molecule_id WHERE rr.reaction_id=r.id),0) AS selisih_muatan
FROM Reactions r WHERE selisih_muatan <> 0;

CREATE VIEW v_check_mass_balance AS   -- Lavoisier berdasarkan molar_mass tersimpan
SELECT r.id AS reaction_id,
       (SELECT SUM(rp.coefficient*m.molar_mass) FROM ReactionProducts  rp JOIN Molecules m ON m.id=rp.molecule_id WHERE rp.reaction_id=r.id)
     - (SELECT SUM(rr.coefficient*m.molar_mass) FROM ReactionReactants rr JOIN Molecules m ON m.id=rr.molecule_id WHERE rr.reaction_id=r.id) AS selisih_massa
FROM Reactions r WHERE ABS(selisih_massa) > 0.05;

CREATE VIEW v_check_molar_mass AS      -- molar_mass harus = Σ massa atom
SELECT m.id AS molecule_id, m.label, m.molar_mass,
       SUM(ma.atom_count * e.atomic_mass) AS massa_hitung
FROM Molecules m JOIN MoleculeAtoms ma ON ma.molecule_id = m.id JOIN Elements e ON e.symbol = ma.atom_symbol
GROUP BY m.id HAVING ABS(m.molar_mass - SUM(ma.atom_count * e.atomic_mass)) > 0.05;

CREATE VIEW v_check_incomplete_reaction AS   -- reaksi tanpa reaktan / produk
SELECT r.id AS reaction_id FROM Reactions r
WHERE NOT EXISTS (SELECT 1 FROM ReactionReactants WHERE reaction_id=r.id)
   OR NOT EXISTS (SELECT 1 FROM ReactionProducts  WHERE reaction_id=r.id);

CREATE VIEW v_check_molecule_without_atoms AS
SELECT m.id AS molecule_id, m.label FROM Molecules m
WHERE NOT EXISTS (SELECT 1 FROM MoleculeAtoms WHERE molecule_id=m.id);
