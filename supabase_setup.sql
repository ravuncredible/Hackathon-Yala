-- ============================================================
-- Disaster Medical Command — Supabase Setup Script
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. DROP existing tables (if re-running)
DROP TABLE IF EXISTS triage_patients CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS rescue_units CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;

-- 2. CREATE hospitals table
CREATE TABLE hospitals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_name text NOT NULL,
  lat float8 NOT NULL DEFAULT 0,
  lng float8 NOT NULL DEFAULT 0,

  -- Capacity & Bed Status
  bed_empty int4 NOT NULL DEFAULT 0,
  icu_empty int4 NOT NULL DEFAULT 0,
  er_status text NOT NULL DEFAULT 'Normal' CHECK (er_status IN ('Normal', 'Busy', 'Critical')),

  -- Equipment & Facilities
  ventilator_ready int4 NOT NULL DEFAULT 0,
  or_available int4 NOT NULL DEFAULT 0,
  ct_scan_ready boolean NOT NULL DEFAULT true,

  -- Blood Bank (by type, unit count)
  blood_a int4 NOT NULL DEFAULT 0,
  blood_b int4 NOT NULL DEFAULT 0,
  blood_o int4 NOT NULL DEFAULT 0,
  blood_ab int4 NOT NULL DEFAULT 0,

  -- Staffing
  surgeon_count int4 NOT NULL DEFAULT 0,
  doctor_on_duty int4 NOT NULL DEFAULT 0,

  -- Metadata
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 3. CREATE rescue_units table (NEW - for tracking ambulances and foundation units)
CREATE TABLE rescue_units (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'foundation' CHECK (type IN ('hospital_ambulance', 'foundation')),
  status text NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'En Route', 'Arrived', 'Busy', 'Returning')),
  lat float8 NOT NULL DEFAULT 0,
  lng float8 NOT NULL DEFAULT 0,
  hospital_id uuid REFERENCES hospitals(id), -- If it's a hospital ambulance
  
  -- Metadata
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 4. CREATE incidents table (MODIFIED - to support Narinthorn Dispatch Form)
CREATE TABLE incidents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other' CHECK (type IN ('flood', 'accident', 'fire', 'explosion', 'other')),
  location_text text,
  lat float8,
  lng float8,
  
  -- Patient Info
  patient_age int4,
  patient_gender text,
  patient_condition text, -- Underlying disease
  
  -- Caller Info
  caller_name text,
  caller_phone text,
  is_caller_with_patient boolean DEFAULT true,
  
  -- Dispatch Info
  triage_level text CHECK (triage_level IN ('Red', 'Yellow', 'Green', 'White')),
  assigned_unit_id uuid REFERENCES rescue_units(id),
  estimated_casualties int4,
  
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled')),
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. CREATE triage_patients table
CREATE TABLE triage_patients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id text UNIQUE NOT NULL,
  
  -- Triage Classification
  triage_color text NOT NULL DEFAULT 'Green' CHECK (triage_color IN ('Red', 'Yellow', 'Green')),
  ai_suggested_color text CHECK (ai_suggested_color IN ('Red', 'Yellow', 'Green')),
  
  -- Vital Signs
  heart_rate int4,
  blood_pressure text,
  spo2 int4,
  respiratory_rate int4,
  gcs int4 CHECK (gcs >= 3 AND gcs <= 15),
  
  -- Clinical Info
  chief_complaint text,
  notes text,
  
  -- Assignment
  assigned_hospital uuid REFERENCES hospitals(id),
  incident_id uuid REFERENCES incidents(id), -- Link to specific incident
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'En Route', 'Arrived', 'Treated')),
  
  -- Metadata
  confirmed_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. SEED hospital data
INSERT INTO hospitals (
  hospital_name, lat, lng,
  bed_empty, icu_empty, er_status,
  ventilator_ready, or_available, ct_scan_ready,
  blood_a, blood_b, blood_o, blood_ab,
  surgeon_count, doctor_on_duty,
  last_updated
) VALUES
(
  'โรงพยาบาลยะลา', 6.5481, 101.2768,
  15, 3, 'Normal',
  5, 3, true,
  45, 30, 60, 15,
  2, 8,
  now()
),
(
  'โรงพยาบาลเบตง', 5.7725, 101.0706,
  5, 0, 'Busy',
  2, 0, true,
  12, 8, 20, 5,
  1, 4,
  now()
);

-- 7. SEED rescue_units data
INSERT INTO rescue_units (name, type, status, lat, lng) VALUES
('กู้ภัยแม่กอเหนี่ยวยะลา 01', 'foundation', 'Available', 6.5300, 101.2700),
('กู้ภัยแม่กอเหนี่ยวยะลา 02', 'foundation', 'Busy', 6.5350, 101.2800),
('รถพยาบาลยะลา EMS-1', 'hospital_ambulance', 'Available', 6.5442, 101.2725),
('กู้ภัยเบตง 04', 'foundation', 'Available', 5.7600, 101.0800);

-- 8. Enable Row Level Security (allow public read/write for demo)
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescue_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Allow anon to read
CREATE POLICY "Allow public read hospitals" ON hospitals FOR SELECT USING (true);
CREATE POLICY "Allow public read rescue_units" ON rescue_units FOR SELECT USING (true);
CREATE POLICY "Allow public read triage" ON triage_patients FOR SELECT USING (true);
CREATE POLICY "Allow public read incidents" ON incidents FOR SELECT USING (true);

-- Allow anon to insert
CREATE POLICY "Allow public insert hospitals" ON hospitals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert rescue_units" ON rescue_units FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert triage" ON triage_patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert incidents" ON incidents FOR INSERT WITH CHECK (true);

-- Allow anon to update
CREATE POLICY "Allow public update hospitals" ON hospitals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public update rescue_units" ON rescue_units FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public update triage" ON triage_patients FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public update incidents" ON incidents FOR UPDATE USING (true) WITH CHECK (true);

-- Allow anon to delete (for demo cleanup)
CREATE POLICY "Allow public delete triage" ON triage_patients FOR DELETE USING (true);
CREATE POLICY "Allow public delete incidents" ON incidents FOR DELETE USING (true);
CREATE POLICY "Allow public delete rescue_units" ON rescue_units FOR DELETE USING (true);

-- 9. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE hospitals;
ALTER PUBLICATION supabase_realtime ADD TABLE rescue_units;
ALTER PUBLICATION supabase_realtime ADD TABLE triage_patients;
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;

-- 10. Create indexes for performance
CREATE INDEX idx_triage_status ON triage_patients(status);
CREATE INDEX idx_triage_hospital ON triage_patients(assigned_hospital);
CREATE INDEX idx_triage_color ON triage_patients(triage_color);
CREATE INDEX idx_incident_status ON incidents(status);
CREATE INDEX idx_rescue_units_status ON rescue_units(status);

-- ============================================================
-- DONE!
-- ============================================================
