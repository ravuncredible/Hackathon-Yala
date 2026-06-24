-- ============================================================
-- Disaster Medical Command — Supabase Setup Script
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. DROP existing tables (if re-running)
DROP TABLE IF EXISTS triage_patients CASCADE;
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

-- 3. CREATE triage_patients table
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
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'En Route', 'Arrived', 'Treated')),
  
  -- Metadata
  confirmed_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. SEED hospital data
INSERT INTO hospitals (
  hospital_name, lat, lng,
  bed_empty, icu_empty, er_status,
  ventilator_ready, or_available, ct_scan_ready,
  blood_a, blood_b, blood_o, blood_ab,
  surgeon_count, doctor_on_duty,
  last_updated
) VALUES
(
  'โรงพยาบาลยะลา', 6.5446, 101.2826,
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

-- 5. Enable Row Level Security (allow public read/write for demo)
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_patients ENABLE ROW LEVEL SECURITY;

-- Allow anon to read
CREATE POLICY "Allow public read hospitals" ON hospitals FOR SELECT USING (true);
CREATE POLICY "Allow public read triage" ON triage_patients FOR SELECT USING (true);

-- Allow anon to insert
CREATE POLICY "Allow public insert hospitals" ON hospitals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert triage" ON triage_patients FOR INSERT WITH CHECK (true);

-- Allow anon to update
CREATE POLICY "Allow public update hospitals" ON hospitals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public update triage" ON triage_patients FOR UPDATE USING (true) WITH CHECK (true);

-- Allow anon to delete (for demo cleanup)
CREATE POLICY "Allow public delete triage" ON triage_patients FOR DELETE USING (true);

-- 6. Enable Realtime
-- NOTE: You also need to enable Realtime in Supabase Dashboard:
--   Database → Replication → Enable for 'hospitals' and 'triage_patients'
ALTER PUBLICATION supabase_realtime ADD TABLE hospitals;
ALTER PUBLICATION supabase_realtime ADD TABLE triage_patients;

-- 7. Create indexes for performance
CREATE INDEX idx_triage_status ON triage_patients(status);
CREATE INDEX idx_triage_hospital ON triage_patients(assigned_hospital);
CREATE INDEX idx_triage_color ON triage_patients(triage_color);

-- ============================================================
-- DONE! ตรวจสอบว่า tables สร้างสำเร็จใน Table Editor
-- ============================================================
