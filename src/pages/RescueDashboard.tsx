import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  ShieldAlert, AlertTriangle, CheckCircle, ArrowLeft,
  Bed, Activity, Thermometer, UserCheck, Droplet,
  Stethoscope, Users, MonitorCheck, Syringe, Clock, Truck,
  Heart, Wind, Droplets, Brain, Send, Scan, Loader2,
  ClipboardList, Plus, Minus, MapPin, Map as MapIcon, 
  FileText
} from 'lucide-react';
import { MOCK_HOSPITALS, type Hospital, type TriagePatient } from '../data/hospitals';
import { TRIAGE_COLORS, type TriageColorKey } from '../data/triageColors';
import ThemeToggle from '../components/ThemeToggle';

// --- Shared Types & Helpers ---
type TriageColor = 'Red' | 'Yellow' | 'Green' | null;

interface VitalSigns {
  heart_rate: string;
  blood_pressure_sys: string;
  blood_pressure_dia: string;
  spo2: string;
  respiratory_rate: string;
  gcs: string;
}

const QUICK_SYMPTOMS = ['หมดสติ', 'เสียเลือดมาก', 'หายใจลำบาก', 'กระดูกหัก', 'แผลถลอก', 'ปวดท้องรุนแรง'];

const createMarkerIcon = (erStatus: string) => {
  const color = erStatus === 'Critical' ? '#ef4444' : erStatus === 'Busy' ? '#eab308' : '#22c55e';
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:4px solid white;box-shadow:0 4px 12px ${color}88;animation:pulse 2s infinite;display:flex;align-items:center;justify-content:center"><span style="color:white;font-weight:bold;font-size:14px">H</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createAmbulanceIcon = (status: string) => {
  const color = status === 'En Route' ? '#3b82f6' : '#94a3b8';
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v5c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const MOCK_AMBULANCES = [
  { id: 'amb-1', name: 'กู้ภัยยะลา 01', lat: 6.5300, lng: 101.2700, status: 'En Route' },
  { id: 'amb-2', name: 'กู้ภัยเบตง 04', lat: 5.7600, lng: 101.0800, status: 'Standby' },
  { id: 'amb-3', name: 'รถพยาบาลยะลา 02', lat: 6.5500, lng: 101.2900, status: 'En Route' },
];

function generateTagId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TRG-${ts}-${rand}`;
}

function calculateTriageColor(vitals: VitalSigns): TriageColor {
  const hr = parseInt(vitals.heart_rate);
  const spo2 = parseInt(vitals.spo2);
  const rr = parseInt(vitals.respiratory_rate);
  const gcs = parseInt(vitals.gcs);
  const sysBP = parseInt(vitals.blood_pressure_sys);

  if (isNaN(hr) || isNaN(spo2) || isNaN(rr) || isNaN(gcs)) return null;
  if (hr > 120 || hr < 50 || spo2 < 90 || gcs <= 8 || rr > 30 || rr < 10 || (!isNaN(sysBP) && sysBP < 90)) return 'Red';
  if ((hr >= 100 && hr <= 120) || (spo2 >= 90 && spo2 <= 94) || (gcs >= 9 && gcs <= 12) || (rr >= 24 && rr <= 30) || (!isNaN(sysBP) && sysBP >= 90 && sysBP < 100)) return 'Yellow';
  return 'Green';
}

function validateVitals(vitals: VitalSigns): string | null {
  const hr = parseInt(vitals.heart_rate);
  if (vitals.heart_rate && (isNaN(hr) || hr < 0 || hr > 300)) return 'Heart Rate 0-300 BPM';
  const spo2 = parseInt(vitals.spo2);
  if (vitals.spo2 && (isNaN(spo2) || spo2 < 0 || spo2 > 100)) return 'SpO2 0-100%';
  const rr = parseInt(vitals.respiratory_rate);
  if (vitals.respiratory_rate && (isNaN(rr) || rr < 0 || rr > 80)) return 'Resp Rate 0-80';
  const gcs = parseInt(vitals.gcs);
  if (vitals.gcs && (isNaN(gcs) || gcs < 3 || gcs > 15)) return 'GCS 3-15';
  return null;
}

function BloodBadge({ label, count }: { label: string; count: number }) {
  const color = count <= 10 ? 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-500/15' : count <= 25 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-500/15' : 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-500/15';
  return (
    <div className={`${color} px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border border-black/5 dark:border-white/5`}>
      <span className="text-[10px] opacity-70">{label}</span> {count}u
    </div>
  );
}

function VitalsStepper({ label, icon: Icon, value, onChange, min = 0, max = 300, step = 1, placeholder }: any) {
  const numValue = parseInt(value);
  const handleDec = () => { if (value === '') onChange(placeholder); else if (!isNaN(numValue) && numValue > min) onChange(String(numValue - step)); };
  const handleInc = () => { if (value === '') onChange(placeholder); else if (!isNaN(numValue) && numValue < max) onChange(String(numValue + step)); };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
      <label className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 font-semibold">
        <Icon className="w-4 h-4 text-slate-700 dark:text-slate-300" /> {label}
      </label>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={handleDec} className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition active:scale-95"><Minus className="w-5 h-5" /></button>
        <input type="number" min={min} max={max} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-lg font-bold text-center focus:outline-none focus:border-cyan-500 transition text-slate-900 dark:text-white" />
        <button type="button" onClick={handleInc} className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition active:scale-95"><Plus className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

// --- Main Component ---
export default function RescueDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'triage'>('triage');
  
  // Dashboard State
  const [hospitals, setHospitals] = useState<Hospital[]>(MOCK_HOSPITALS);
  const [triagePatients, setTriagePatients] = useState<TriagePatient[]>([]);
  const [loadingMap, setLoadingMap] = useState(true);

  // Triage Form State
  const [tagId, setTagId] = useState(generateTagId());
  const [vitals, setVitals] = useState<VitalSigns>({ heart_rate: '', blood_pressure_sys: '', blood_pressure_dia: '', spo2: '', respiratory_rate: '', gcs: '' });
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [aiColor, setAiColor] = useState<TriageColor>(null);
  const [selectedColor, setSelectedColor] = useState<TriageColor>(null);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [aiRecommendedHospital, setAiRecommendedHospital] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Data Fetching & Realtime
  useEffect(() => {
    fetchHospitals();
    fetchTriagePatients();

    const hospitalChannel = supabase.channel('hospital-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, (payload) => {
        if (payload.eventType === 'UPDATE') setHospitals(current => current.map(h => h.id === payload.new.id ? { ...h, ...payload.new } as Hospital : h));
      }).subscribe();

    const triageChannel = supabase.channel('triage-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'triage_patients' }, (payload) => {
        if (payload.eventType === 'INSERT') setTriagePatients(current => [payload.new as TriagePatient, ...current]);
        else if (payload.eventType === 'UPDATE') setTriagePatients(current => current.map(p => p.id === payload.new.id ? { ...p, ...payload.new } as TriagePatient : p));
        else if (payload.eventType === 'DELETE') setTriagePatients(current => current.filter(p => p.id !== payload.old.id));
      }).subscribe();

    return () => { supabase.removeChannel(hospitalChannel); supabase.removeChannel(triageChannel); };
  }, []);

  async function fetchHospitals() {
    setLoadingMap(true);
    const { data, error } = await supabase.from('hospitals').select('*');
    if (data && !error && data.length > 0) setHospitals(data as Hospital[]);
    setLoadingMap(false);
  }

  async function fetchTriagePatients() {
    const { data } = await supabase.from('triage_patients').select('*').in('status', ['Pending', 'En Route']).order('created_at', { ascending: false });
    if (data) setTriagePatients(data as TriagePatient[]);
  }

  // Triage Logic
  const recalculateAI = useCallback(() => {
    setAiColor(calculateTriageColor(vitals));
    setValidationError(null);
  }, [vitals]);

  useEffect(() => { recalculateAI(); }, [recalculateAI]);

  function handleNewScan() {
    setTagId(generateTagId());
    setVitals({ heart_rate: '', blood_pressure_sys: '', blood_pressure_dia: '', spo2: '', respiratory_rate: '', gcs: '' });
    setChiefComplaint('');
    setAiColor(null);
    setSelectedColor(null);
    setSelectedHospital('');
    setAiRecommendedHospital(null);
    setSubmitted(false);
    setValidationError(null);
  }

  function handleVitalChange(field: keyof VitalSigns, value: string) {
    setVitals(prev => ({ ...prev, [field]: value }));
  }

  function recommendHospital() {
    if (!selectedColor && !aiColor) return alert("กรุณาเลือกระดับความเร่งด่วนก่อน");
    const severity = selectedColor || aiColor;
    let bestHosp: Hospital | null = null;
    let bestScore = -1;

    for (const h of hospitals) {
      let score = 0;
      if (severity === 'Red' && h.icu_empty > 0) score += 50;
      if (severity === 'Red' && h.or_available > 0) score += 30;
      score += h.bed_empty * 2;
      if (score > bestScore) { bestScore = score; bestHosp = h; }
    }

    if (bestHosp) {
      setSelectedHospital(bestHosp.id);
      setAiRecommendedHospital(bestHosp.id);
      setAiReasoning(severity === 'Red' 
        ? `แนะนำ ${bestHosp.hospital_name} เนื่องจากมี ICU ว่าง (${bestHosp.icu_empty}) และพร้อมรับเคสวิกฤต`
        : `แนะนำ ${bestHosp.hospital_name} เนื่องจากมีเตียงว่างเพียงพอ (${bestHosp.bed_empty}) ไม่ต้องรอคิว`);
    }
  }

  async function handleSubmit() {
    if (!selectedColor || !selectedHospital) return;
    const error = validateVitals(vitals);
    if (error) return setValidationError(error);

    setSubmitting(true);
    const payload = {
      tag_id: tagId,
      triage_color: selectedColor,
      ai_suggested_color: aiColor,
      heart_rate: parseInt(vitals.heart_rate) || null,
      blood_pressure: vitals.blood_pressure_sys && vitals.blood_pressure_dia ? `${vitals.blood_pressure_sys}/${vitals.blood_pressure_dia}` : null,
      spo2: parseInt(vitals.spo2) || null,
      respiratory_rate: parseInt(vitals.respiratory_rate) || null,
      gcs: parseInt(vitals.gcs) || null,
      chief_complaint: chiefComplaint || null,
      assigned_hospital: selectedHospital,
      status: 'En Route',
      confirmed_by: 'EMS First Responder',
    };

    const { error: insertError } = await supabase.from('triage_patients').insert(payload);
    if (insertError) alert('Error: ' + insertError.message);
    else {
      setSubmitted(true);
      // Auto switch back to dashboard tab after 2 seconds to see the result
      setTimeout(() => setActiveTab('dashboard'), 2000);
    }
    setSubmitting(false);
  }

  const triageSummary = {
    Red: triagePatients.filter(p => p.triage_color === 'Red').length,
    Yellow: triagePatients.filter(p => p.triage_color === 'Yellow').length,
    Green: triagePatients.filter(p => p.triage_color === 'Green').length,
  };

  // --- Sub-Components for Readability ---

  const DashboardView = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Map Section (Expanded) */}
      <div className="flex-1 relative z-0 min-h-[40vh]">
        {loadingMap && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 z-10 flex items-center justify-center backdrop-blur-sm">
            <span className="flex items-center gap-2 font-bold"><Loader2 className="animate-spin"/> กำลังโหลด...</span>
          </div>
        )}
        <MapContainer center={[6.15, 101.17]} zoom={9} className="w-full h-full z-0" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles" />
          {hospitals.map(h => (
            <Marker key={h.id} position={[h.lat, h.lng]} icon={createMarkerIcon(h.er_status)}>
              <Popup className="custom-popup">
                <div className="font-sans min-w-[200px]">
                  <h3 className="font-bold text-base border-b border-slate-200 dark:border-slate-600 pb-1 mb-1 text-blue-600 dark:text-blue-400">{h.hospital_name}</h3>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="font-semibold">ER:</div><div className={`font-bold ${h.er_status==='Critical'?'text-red-500':'text-green-500'}`}>{h.er_status}</div>
                    <div className="font-semibold">เตียง/ICU:</div><div>{h.bed_empty} / {h.icu_empty}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          {MOCK_AMBULANCES.map(amb => (
            <Marker key={amb.id} position={[amb.lat, amb.lng]} icon={createAmbulanceIcon(amb.status)}>
              <Popup className="custom-popup"><div className="font-bold text-xs">{amb.name}</div></Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Bottom Panel (Scrollable area for Stats & Cases) */}
      <div className="h-[35vh] md:h-[30vh] overflow-y-auto bg-slate-100 dark:bg-slate-800 shrink-0 border-t border-slate-200 dark:border-slate-700 flex flex-col styled-scrollbar">
        
        {/* Stats Section */}
        <div className="p-2 md:p-3 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5"><Activity className="w-4 h-4"/> สถานะโรงพยาบาล</h2>
            <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Live
            </span>
          </div>
          
          <div className="flex overflow-x-auto pb-1 gap-3 snap-x styled-scrollbar">
            {hospitals.map(h => (
              <div key={h.id} className="min-w-[260px] w-[80vw] md:w-[280px] snap-center bg-white dark:bg-slate-700/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm flex-shrink-0">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-blue-700 dark:text-blue-300 text-sm truncate">{h.hospital_name}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${h.er_status==='Critical'?'bg-red-100 text-red-600':'bg-green-100 text-green-600'}`}>{h.er_status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded p-1.5 text-center">
                    <p className="text-[9px] text-slate-500">เตียงว่าง</p><p className="font-bold">{h.bed_empty}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded p-1.5 text-center">
                    <p className="text-[9px] text-slate-500">ICU</p><p className={`font-bold ${h.icu_empty===0?'text-red-500':''}`}>{h.icu_empty}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded p-1.5 text-center">
                    <p className="text-[9px] text-slate-500">OR ว่าง</p><p className="font-bold">{h.or_available}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incoming Patients Section */}
        <div className="p-2 md:p-3 pt-0 shrink-0">
          <div className="flex items-center justify-between mb-2 border-t border-slate-200 dark:border-slate-700 pt-2">
            <h2 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5"><Truck className="w-4 h-4"/> เคสกำลังนำส่ง (Active Cases)</h2>
            <span className="text-[10px] text-slate-500 font-bold">{triagePatients.length} เคส</span>
          </div>

          <div className="space-y-2">
            {triagePatients.length === 0 ? (
              <div className="text-center p-4 text-xs text-slate-400 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                ไม่มีเคสกำลังนำส่ง
              </div>
            ) : (
              triagePatients.map(p => {
                const colorConfig = TRIAGE_COLORS[(p.triage_color as TriageColorKey) || 'Green'];
                const timeString = new Date(p.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                return (
                  <div key={p.id} className="bg-white dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold text-white shadow-sm ${colorConfig.bgSolid}`}>
                          {colorConfig.emoji} {colorConfig.label}
                        </span>
                        <span className="font-mono font-bold text-sm text-slate-700 dark:text-slate-200">{p.tag_id}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3"/> {timeString}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-1">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {p.chief_complaint ? `อาการ: ${p.chief_complaint}` : 'ไม่ได้ระบุอาการหลัก'}
                        {p.heart_rate && ` • HR: ${p.heart_rate}`}
                        {p.spo2 && ` • SpO2: ${p.spo2}%`}
                      </div>
                      <div className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded flex items-center gap-1">
                        <MapPin className="w-3 h-3"/> {hospitals.find(h => h.id === p.assigned_hospital)?.hospital_name || 'ไม่ระบุ รพ.'}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const TriageView = () => (
    <div className="h-full overflow-y-auto p-4 space-y-5 bg-white dark:bg-slate-900 pb-24">
      {submitted ? (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-green-200 dark:border-green-500/30 p-6 text-center space-y-4 animate-in">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-green-600 dark:text-green-400">ส่งตัวเรียบร้อย!</h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 inline-block font-mono text-lg font-bold border border-slate-200 dark:border-slate-700">{tagId}</div>
          <button onClick={handleNewScan} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-xl font-bold active:scale-95">สแกนเคสต่อไป</button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tag ID:</span>
            </div>
            <span className="font-mono text-base font-bold text-cyan-600 dark:text-cyan-300">{tagId}</span>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-orange-500"/> อาการเบื้องต้น</h3>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SYMPTOMS.map(sym => (
                <button key={sym} onClick={() => setChiefComplaint(sym)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${chiefComplaint===sym?'bg-cyan-100 border-cyan-500 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300':'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}>
                  {sym}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold flex items-center gap-1"><Activity className="w-4 h-4 text-red-500"/> สัญญาณชีพ</h3>
            {validationError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded font-semibold">{validationError}</div>}
            <div className="grid grid-cols-2 gap-2">
              <VitalsStepper label="HR" icon={Heart} value={vitals.heart_rate} onChange={(v: string) => handleVitalChange('heart_rate', v)} min={0} max={300} step={5} placeholder="80" />
              <VitalsStepper label="SpO2" icon={Droplets} value={vitals.spo2} onChange={(v: string) => handleVitalChange('spo2', v)} min={0} max={100} step={1} placeholder="98" />
              <VitalsStepper label="RR" icon={Wind} value={vitals.respiratory_rate} onChange={(v: string) => handleVitalChange('respiratory_rate', v)} min={0} max={80} step={2} placeholder="20" />
              <VitalsStepper label="GCS" icon={Brain} value={vitals.gcs} onChange={(v: string) => handleVitalChange('gcs', v)} min={3} max={15} step={1} placeholder="15" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <h3 className="text-sm font-bold">ประเมินสี</h3>
              {aiColor && <span className={`text-[10px] px-2 py-0.5 rounded font-bold text-white ${TRIAGE_COLORS[aiColor].bgSolid}`}>AI: {TRIAGE_COLORS[aiColor].label}</span>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['Red','Yellow','Green'] as const).map(c => {
                const isSel = selectedColor === c;
                return (
                  <button key={c} onClick={()=>setSelectedColor(c)} className={`py-3 rounded-xl border-2 flex flex-col items-center transition ${isSel ? TRIAGE_COLORS[c].border + ' ' + TRIAGE_COLORS[c].bgLight : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
                    <span className="text-2xl">{TRIAGE_COLORS[c].emoji}</span>
                    <span className={`text-xs font-bold mt-1 ${isSel ? TRIAGE_COLORS[c].text : 'text-slate-500'}`}>{TRIAGE_COLORS[c].label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-1"><MapPin className="w-4 h-4 text-indigo-500"/> ปลายทาง</h3>
              <button onClick={recommendHospital} className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-1 rounded font-bold flex items-center gap-1">
                <Brain className="w-3 h-3"/> AI หาจุดส่ง
              </button>
            </div>
            {aiReasoning && <div className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded border-l-2 border-indigo-500">{aiReasoning}</div>}
            <select value={selectedHospital} onChange={e=>setSelectedHospital(e.target.value)} className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-3 font-semibold focus:border-cyan-500">
              <option value="">— เลือก รพ. —</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.hospital_name} (เตียงว่าง {h.bed_empty})</option>)}
            </select>
            <button onClick={handleSubmit} disabled={!selectedColor || !selectedHospital || submitting} className={`w-full py-3 rounded-xl text-base font-bold flex justify-center items-center gap-2 transition ${(!selectedColor||!selectedHospital)?'bg-slate-200 dark:bg-slate-700 text-slate-400':'bg-cyan-600 text-white active:scale-95'}`}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Send className="w-5 h-5"/> ยืนยันส่งตัว</>}
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-3 flex justify-between items-center z-20 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 p-1.5 md:p-2 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="bg-red-100 dark:bg-red-900/30 p-1.5 md:p-2 rounded-lg">
            <ShieldAlert className="w-5 h-5 md:w-6 md:h-6 text-red-600 dark:text-red-500" />
          </div>
          <div>
            <h1 className="text-sm md:text-lg font-bold leading-none">Rescue Command</h1>
            {triageSummary.Red + triageSummary.Yellow > 0 && (
              <p className="text-[10px] md:text-xs text-red-500 font-bold mt-1">🔴 Incoming Critical!</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleNewScan} className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 p-2 rounded-lg font-bold"><Scan className="w-5 h-5" /></button>
          <ThemeToggle />
        </div>
      </header>

      {/* Tab Navigation (Responsive for all screens) */}
      <div className="flex bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10 flex-shrink-0 shadow-sm relative">
        <button onClick={()=>setActiveTab('triage')} className={`flex-1 py-3 md:py-4 text-sm md:text-base font-bold flex items-center justify-center gap-2 border-b-2 transition ${activeTab==='triage'?'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-900/10':'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
          <FileText className="w-4 h-4 md:w-5 md:h-5"/> ประเมินผู้ป่วย (Triage)
        </button>
        <button onClick={()=>setActiveTab('dashboard')} className={`flex-1 py-3 md:py-4 text-sm md:text-base font-bold flex items-center justify-center gap-2 border-b-2 transition ${activeTab==='dashboard'?'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10':'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
          <MapIcon className="w-4 h-4 md:w-5 md:h-5"/> แผนที่ & สถานะ รพ.
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-slate-100 dark:bg-slate-900">
        {/* Tab View */}
        <div className="w-full h-full relative">
          <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'triage' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <div className="max-w-3xl mx-auto h-full shadow-xl bg-white dark:bg-slate-900">
              <TriageView />
            </div>
          </div>
          <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'dashboard' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <div className="max-w-6xl mx-auto h-full shadow-xl bg-white dark:bg-slate-900 flex flex-col">
              <DashboardView />
            </div>
          </div>
        </div>
      </div>
      <style>{`html.dark .map-tiles { filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7); }`}</style>
    </div>
  );
}
