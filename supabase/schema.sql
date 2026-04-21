-- Table patients
CREATE TABLE patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  date_naissance DATE,
  telephone VARCHAR(20) NOT NULL,
  telephone_whatsapp VARCHAR(20),
  email VARCHAR(150),
  adresse TEXT,
  ville VARCHAR(100),
  sexe VARCHAR(10),
  groupe_sanguin VARCHAR(5),
  allergies TEXT,
  antecedents_medicaux TEXT,
  antecedents_dentaires TEXT,
  notes_generales TEXT,
  photo_url TEXT,
  actif BOOLEAN DEFAULT TRUE,
  mot_de_passe_temp VARCHAR(255)
);

CREATE TABLE rendez_vous (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  date_rdv TIMESTAMP NOT NULL,
  duree_minutes INTEGER DEFAULT 30,
  motif VARCHAR(200),
  statut VARCHAR(20) DEFAULT 'planifie',
  notes TEXT,
  rappel_envoye BOOLEAN DEFAULT FALSE
);

CREATE TABLE actes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  rendez_vous_id UUID REFERENCES rendez_vous(id),
  date_acte DATE NOT NULL,
  type_acte VARCHAR(200) NOT NULL,
  description TEXT,
  dent_numero VARCHAR(10),
  montant_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  montant_paye DECIMAL(10,2) NOT NULL DEFAULT 0,
  statut_paiement VARCHAR(20) DEFAULT 'non_paye'
);

CREATE TABLE paiements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  acte_id UUID REFERENCES actes(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  montant DECIMAL(10,2) NOT NULL,
  date_paiement DATE NOT NULL,
  mode_paiement VARCHAR(50),
  notes TEXT
);

CREATE TABLE utilisateurs (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  nom VARCHAR(100),
  prenom VARCHAR(100),
  role VARCHAR(20) DEFAULT 'dentiste',
  telephone VARCHAR(20),
  photo_url TEXT
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE rendez_vous ENABLE ROW LEVEL SECURITY;
ALTER TABLE actes ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read patients" ON patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write patients" ON patients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read rendez_vous" ON rendez_vous FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write rendez_vous" ON rendez_vous FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read actes" ON actes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write actes" ON actes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read paiements" ON paiements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write paiements" ON paiements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read utilisateurs" ON utilisateurs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write utilisateurs" ON utilisateurs FOR ALL TO authenticated USING (true) WITH CHECK (true);
