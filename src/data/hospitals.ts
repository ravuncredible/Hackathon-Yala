// Shared hospital mock data used as fallback when Supabase is unavailable

export interface Hospital {
  id: string;
  hospital_name: string;
  lat: number;
  lng: number;
  bed_empty: number;
  icu_empty: number;
  er_status: string;
  ventilator_ready: number;
  or_available: number;
  ct_scan_ready: boolean;
  blood_a: number;
  blood_b: number;
  blood_o: number;
  blood_ab: number;
  surgeon_count: number;
  doctor_on_duty: number;
  last_updated: string;
}

export interface TriagePatient {
  id: string;
  tag_id: string;
  triage_color: string;
  status: string;
  chief_complaint: string;
  assigned_hospital: string;
  heart_rate: number;
  spo2: number;
  gcs: number;
  created_at: string;
  confirmed_by: string;
}

export interface HospitalBasic {
  id: string;
  hospital_name: string;
  bed_empty: number;
  icu_empty: number;
  or_available: number;
}

export const MOCK_HOSPITALS: Hospital[] = [
  {
    id: 'mock-a', hospital_name: 'โรงพยาบาลยะลา', lat: 6.5481, lng: 101.2768,
    bed_empty: 15, icu_empty: 3, er_status: 'Normal', ventilator_ready: 5,
    or_available: 3, ct_scan_ready: true,
    blood_a: 45, blood_b: 30, blood_o: 60, blood_ab: 15,
    surgeon_count: 2, doctor_on_duty: 8, last_updated: new Date().toISOString()
  }
  // ซ่อนโรงพยาบาลเบตงชั่วคราว
];

export const MOCK_HOSPITALS_MAP: Record<string, Hospital> = {
  'A': MOCK_HOSPITALS[0]
};

export const MOCK_HOSPITALS_BASIC: HospitalBasic[] = MOCK_HOSPITALS.map(h => ({
  id: h.id,
  hospital_name: h.hospital_name,
  bed_empty: h.bed_empty,
  icu_empty: h.icu_empty,
  or_available: h.or_available,
}));

// Hospital key to Thai name fragment for Supabase queries
export const HOSPITAL_KEY_MAP: Record<string, string> = {
  'A': 'ยะลา'
};
