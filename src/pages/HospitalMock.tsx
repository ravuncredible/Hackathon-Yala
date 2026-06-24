import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Activity, Droplet, ArrowLeft, Bed, Thermometer,
  UserCheck, Stethoscope, Users, MonitorCheck,
  AlertTriangle, Clock
} from 'lucide-react';
import { MOCK_HOSPITALS_MAP, HOSPITAL_KEY_MAP, type Hospital } from '../data/hospitals';
import { TRIAGE_COLORS, type TriageColorKey } from '../data/triageColors';
import ThemeToggle from '../components/ThemeToggle';

type HospitalData = Hospital;

interface IncomingPatient {
  id: string;
  tag_id: string;
  triage_color: string;
  status: string;
  chief_complaint: string;
  heart_rate: number;
  spo2: number;
  gcs: number;
  created_at: string;
}

export default function HospitalMock() {
  const { id } = useParams<{ id: string }>();
  const hospitalKey = id?.toUpperCase() || 'A';

  const [data, setData] = useState<HospitalData>(MOCK_HOSPITALS_MAP[hospitalKey] || MOCK_HOSPITALS_MAP['A']);
  const [loading, setLoading] = useState(true);
  const [incoming, setIncoming] = useState<IncomingPatient[]>([]);

  const hospitalIdRef = useRef(data.id);

  useEffect(() => {
    hospitalIdRef.current = data.id;
  }, [data.id]);

  useEffect(() => {
    fetchHospitalData();
    fetchIncomingPatients();

    const channel = supabase
      .channel(`incoming-${hospitalKey}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'triage_patients' }, (payload) => {
          if (payload.new.assigned_hospital === hospitalIdRef.current) {
            setIncoming(current => [payload.new as IncomingPatient, ...current]);
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'triage_patients' }, (payload) => {
          if (payload.new.assigned_hospital === hospitalIdRef.current) {
            setIncoming(current => current.map(p => p.id === payload.new.id ? { ...p, ...payload.new } as IncomingPatient : p));
          }
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hospitalKey]);

  async function fetchHospitalData() {
    setLoading(true);
    const hospitalName = HOSPITAL_KEY_MAP[hospitalKey] || HOSPITAL_KEY_MAP['A'];
    const { data: supaData, error } = await supabase.from('hospitals').select('*').ilike('hospital_name', `%${hospitalName}%`).single();

    if (supaData && !error) setData(supaData as HospitalData);
    else setData(MOCK_HOSPITALS_MAP[hospitalKey] || MOCK_HOSPITALS_MAP['A']);
    setLoading(false);
  }

  async function fetchIncomingPatients() {
    const hospitalName = HOSPITAL_KEY_MAP[hospitalKey] || HOSPITAL_KEY_MAP['A'];
    const { data: hospitalData } = await supabase.from('hospitals').select('id').ilike('hospital_name', `%${hospitalName}%`).single();

    if (hospitalData) {
      const { data: patients } = await supabase.from('triage_patients').select('*').eq('assigned_hospital', hospitalData.id).in('status', ['Pending', 'En Route']).order('created_at', { ascending: false });
      if (patients) setIncoming(patients as IncomingPatient[]);
    }
  }

  async function updateData(field: keyof HospitalData, newValue: number | string | boolean) {
    setData(prev => ({ ...prev, [field]: newValue }));
    if (data.id && !data.id.startsWith('mock')) {
      await supabase.from('hospitals').update({ [field]: newValue, last_updated: new Date().toISOString() }).eq('id', data.id);
    }
  }

  async function markPatientArrived(patientId: string) {
    await supabase.from('triage_patients').update({ status: 'Arrived', updated_at: new Date().toISOString() }).eq('id', patientId);
    setIncoming(current => current.filter(p => p.id !== patientId));
  }

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white flex items-center justify-center font-bold">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 transition-colors">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="flex items-center text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-800 dark:hover:text-blue-300 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <ArrowLeft className="w-4 h-4 mr-2" /> กลับหน้าหลัก
          </Link>
          <ThemeToggle />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
          <h1 className="text-3xl font-bold mb-2 flex items-center text-slate-800 dark:text-white">
            <Activity className="w-8 h-8 mr-3 text-blue-600 dark:text-blue-500" />
            {data.hospital_name}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">Agent: ระบบจำลองการอัปเดต Operational Data สู่ศูนย์บัญชาการ</p>

          {incoming.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-500/30 p-4 mb-6 shadow-sm">
              <h2 className="text-sm font-bold text-red-600 dark:text-red-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 animate-pulse" /> ผู้ป่วยกำลังมาถึง ({incoming.length} ราย)
              </h2>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2">
                {incoming.map(p => {
                  const cfg = TRIAGE_COLORS[p.triage_color as TriageColorKey] || TRIAGE_COLORS.Green;
                  return (
                    <div key={p.id} className={`flex items-center justify-between bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-sm`}>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`${cfg.badge} text-white text-xs px-2 py-0.5 rounded font-bold shadow-sm`}>{cfg.emoji} {cfg.label}</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs">{p.tag_id}</span>
                        {p.chief_complaint && <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">— {p.chief_complaint}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 px-2 py-1 rounded">
                          {p.heart_rate && <span>HR:{p.heart_rate}</span>}
                          {p.spo2 && <span>SpO2:{p.spo2}%</span>}
                        </div>
                        <button onClick={() => markPatientArrived(p.id)} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded font-bold transition active:scale-95 shadow-sm">
                          ถึงแล้ว ✓
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-xl border border-slate-200 dark:border-slate-600 col-span-1 md:col-span-2 shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-blue-700 dark:text-blue-400 border-b border-slate-200 dark:border-slate-600 pb-2">1. ความจุและสถานะเตียง</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center"><Bed className="w-4 h-4 mr-1"/> เตียงว่างทั่วไป</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => updateData('bed_empty', Math.max(0, data.bed_empty - 1))} className="bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-white dark:border-transparent hover:bg-slate-200 dark:hover:bg-slate-600 w-12 h-12 rounded-lg font-bold text-xl transition active:scale-95 shadow-sm">-</button>
                    <span className="text-4xl font-bold text-slate-800 dark:text-white w-12 text-center">{data.bed_empty}</span>
                    <button onClick={() => updateData('bed_empty', data.bed_empty + 1)} className="bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-white dark:border-transparent hover:bg-slate-200 dark:hover:bg-slate-600 w-12 h-12 rounded-lg font-bold text-xl transition active:scale-95 shadow-sm">+</button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center"><Activity className="w-4 h-4 mr-1"/> เตียง ICU ว่าง</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => updateData('icu_empty', Math.max(0, data.icu_empty - 1))} className="bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-white dark:border-transparent hover:bg-slate-200 dark:hover:bg-slate-600 w-12 h-12 rounded-lg font-bold text-xl transition active:scale-95 shadow-sm">-</button>
                    <span className="text-4xl font-bold text-slate-800 dark:text-white w-12 text-center">{data.icu_empty}</span>
                    <button onClick={() => updateData('icu_empty', data.icu_empty + 1)} className="bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-white dark:border-transparent hover:bg-slate-200 dark:hover:bg-slate-600 w-12 h-12 rounded-lg font-bold text-xl transition active:scale-95 shadow-sm">+</button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">สถานะ ER (ER Status)</span>
                  <div className="flex flex-col gap-2 w-full mt-1">
                    {['Normal', 'Busy', 'Critical'].map(status => (
                      <button key={status} onClick={() => updateData('er_status', status)}
                        className={`py-2 px-3 rounded-lg text-sm font-bold transition active:scale-95 border ${data.er_status === status ? (status === 'Critical' ? 'bg-red-600 text-white border-transparent shadow-md' : status === 'Busy' ? 'bg-yellow-500 text-white border-transparent shadow-md' : 'bg-green-600 text-white border-transparent shadow-md') : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-700'}`}>
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-purple-700 dark:text-purple-400 border-b border-slate-200 dark:border-slate-600 pb-2">2. เครื่องมือและห้องผ่าตัด</h2>
              <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl mb-3 border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center"><Thermometer className="w-4 h-4 mr-2 text-purple-500"/> เครื่องช่วยหายใจ</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateData('ventilator_ready', Math.max(0, data.ventilator_ready - 1))} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-transparent dark:bg-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 w-10 h-10 rounded-lg font-bold transition active:scale-95">-</button>
                  <span className="text-2xl font-bold w-10 text-center text-slate-800 dark:text-white">{data.ventilator_ready}</span>
                  <button onClick={() => updateData('ventilator_ready', data.ventilator_ready + 1)} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-transparent dark:bg-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 w-10 h-10 rounded-lg font-bold transition active:scale-95">+</button>
                </div>
              </div>
              <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl mb-3 border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center"><Stethoscope className="w-4 h-4 mr-2 text-blue-500"/> ห้องผ่าตัดว่าง (OR)</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateData('or_available', Math.max(0, data.or_available - 1))} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-transparent dark:bg-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 w-10 h-10 rounded-lg font-bold transition active:scale-95">-</button>
                  <span className={`text-2xl font-bold w-10 text-center ${data.or_available === 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>{data.or_available}</span>
                  <button onClick={() => updateData('or_available', data.or_available + 1)} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-transparent dark:bg-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 w-10 h-10 rounded-lg font-bold transition active:scale-95">+</button>
                </div>
              </div>
              <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center"><MonitorCheck className="w-4 h-4 mr-2 text-indigo-500"/> CT Scan</span>
                <button onClick={() => updateData('ct_scan_ready', !data.ct_scan_ready)}
                  className={`px-6 py-2.5 rounded-lg font-bold text-sm transition active:scale-95 shadow-sm ${data.ct_scan_ready ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                  {data.ct_scan_ready ? 'พร้อม ✓' : 'ไม่พร้อม ✕'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
                <h2 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400 border-b border-slate-200 dark:border-slate-600 pb-2">3. คลังเลือด</h2>
                <div className="space-y-3">
                  {[
                    { key: 'blood_a' as const, label: 'กรุ๊ป A', color: 'text-red-600 dark:text-red-300' },
                    { key: 'blood_b' as const, label: 'กรุ๊ป B', color: 'text-blue-600 dark:text-blue-300' },
                    { key: 'blood_o' as const, label: 'กรุ๊ป O', color: 'text-green-600 dark:text-green-300' },
                    { key: 'blood_ab' as const, label: 'กรุ๊ป AB', color: 'text-purple-600 dark:text-purple-300' },
                  ].map(blood => (
                    <div key={blood.key} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className={`text-sm font-bold flex items-center ${blood.color}`}>
                        <Droplet className="w-4 h-4 mr-2"/> {blood.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateData(blood.key, Math.max(0, data[blood.key] - 5))} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-transparent dark:bg-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 w-10 h-10 rounded-lg font-bold text-sm transition active:scale-95">-5</button>
                        <span className={`text-xl font-bold w-12 text-center ${data[blood.key] <= 10 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>
                          {data[blood.key]}
                        </span>
                        <button onClick={() => updateData(blood.key, data[blood.key] + 5)} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-transparent dark:bg-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 w-10 h-10 rounded-lg font-bold text-sm transition active:scale-95">+5</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
                <h2 className="text-xl font-bold mb-4 text-green-600 dark:text-green-400 border-b border-slate-200 dark:border-slate-600 pb-2">4. บุคลากร</h2>
                <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-3 shadow-sm">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center"><UserCheck className="w-4 h-4 mr-2 text-green-600 dark:text-green-500"/> ศัลยแพทย์แสตนด์บาย</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateData('surgeon_count', Math.max(0, data.surgeon_count - 1))} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-transparent dark:bg-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 w-10 h-10 rounded-lg font-bold transition active:scale-95">-</button>
                    <span className="text-2xl font-bold w-10 text-center text-slate-800 dark:text-white">{data.surgeon_count}</span>
                    <button onClick={() => updateData('surgeon_count', data.surgeon_count + 1)} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-transparent dark:bg-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 w-10 h-10 rounded-lg font-bold transition active:scale-95">+</button>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center"><Users className="w-4 h-4 mr-2 text-cyan-600 dark:text-cyan-500"/> แพทย์เวรปฏิบัติงาน</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateData('doctor_on_duty', Math.max(0, data.doctor_on_duty - 1))} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-transparent dark:bg-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 w-10 h-10 rounded-lg font-bold transition active:scale-95">-</button>
                    <span className="text-2xl font-bold w-10 text-center text-slate-800 dark:text-white">{data.doctor_on_duty}</span>
                    <button onClick={() => updateData('doctor_on_duty', data.doctor_on_duty + 1)} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-transparent dark:bg-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 w-10 h-10 rounded-lg font-bold transition active:scale-95">+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm font-medium text-slate-600 dark:text-slate-500 bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700">
            <Clock className="w-4 h-4" />
            ✅ อัปเดตล่าสุด: {data.last_updated ? new Date(data.last_updated).toLocaleTimeString('th-TH') : new Date().toLocaleTimeString('th-TH')}
            <span className="text-slate-300 dark:text-slate-600 mx-2">|</span>
            ข้อมูลชุดนี้ดึงเฉพาะ Operational Data โดยไม่ละเมิด PDPA
          </div>
        </div>
      </div>
    </div>
  );
}
