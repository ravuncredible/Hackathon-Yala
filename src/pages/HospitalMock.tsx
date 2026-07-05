import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Activity, Droplet, ArrowLeft, Bed, Thermometer,
  UserCheck, Stethoscope, Users, MonitorCheck,
  AlertTriangle, Clock, Brain, Siren
} from 'lucide-react';
import { MOCK_HOSPITALS_MAP, HOSPITAL_KEY_MAP, type Hospital } from '../data/hospitals';
import { TRIAGE_COLORS, type TriageColorKey } from '../data/triageColors';
import ThemeToggle from '../components/ThemeToggle';
import { predictResources, getUrgencyStyles } from '../lib/aiPrediction';

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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-black text-slate-900 dark:text-slate-100 p-4 md:p-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-white/40 dark:border-slate-700/50 shadow-lg">
          <Link to="/" className="flex items-center text-blue-600 dark:text-blue-400 font-bold hover:text-blue-800 dark:hover:text-blue-300 bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-xl shadow-sm border border-blue-100 dark:border-blue-900/30 hover:shadow-md transition-all">
            <ArrowLeft className="w-5 h-5 mr-2" /> กลับหน้าหลัก
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <h2 className="text-sm font-black text-slate-800 dark:text-white leading-tight">ER DASHBOARD</h2>
              <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Emergency Room Active Monitor</p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl p-6 md:p-8 border border-white/50 dark:border-slate-700/50 shadow-2xl relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
          
          <h1 className="text-3xl md:text-4xl font-black mb-2 flex items-center text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">
            <Activity className="w-10 h-10 mr-3 text-blue-600 dark:text-blue-400" />
            {data.hospital_name}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium border-b border-slate-200/50 dark:border-slate-700/50 pb-4">ระบบรับข้อมูลผู้ป่วยล่วงหน้าแบบ Real-time และคาดการณ์ทรัพยากรด้วย AI</p>

          {/* === INCOMING PATIENTS MEGA PANEL === */}
          {(() => {
            const incomingSummary = {
              red: incoming.filter(p => p.triage_color === 'Red').length,
              yellow: incoming.filter(p => p.triage_color === 'Yellow').length,
              green: incoming.filter(p => p.triage_color === 'Green').length,
              total: incoming.length,
            };
            const prediction = predictResources(incomingSummary);
            const styles = getUrgencyStyles(prediction.urgency_level);

            return incoming.length > 0 ? (
              <div className={`${styles.bg} ${styles.border} rounded-3xl border-2 p-6 md:p-8 mb-8 shadow-2xl ${styles.glow} relative overflow-hidden group`}>
                <div className={`absolute top-0 left-0 w-1 h-full ${styles.lineBg}`}></div>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <h2 className="text-2xl md:text-3xl font-black text-red-600 dark:text-red-400 flex items-center gap-3">
                    <Siren className="w-8 h-8 animate-pulse" /> 🚨 แจ้งเตือน: ผู้ป่วยกำลังมาถึง!
                  </h2>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${styles.badge} shadow-sm`}>
                    {styles.label}
                  </span>
                </div>

                {/* Big Summary Numbers */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl p-4 text-center border border-slate-200 dark:border-slate-700 shadow-md transform hover:-translate-y-1 transition-transform">
                    <p className="text-sm font-bold text-slate-500 mb-1 tracking-wide">รวมทั้งหมด</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <p className="text-5xl font-black text-slate-800 dark:text-white">{incomingSummary.total}</p>
                      <p className="text-xs text-slate-400 font-bold">ราย</p>
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-3 text-center border border-red-200 dark:border-red-800 shadow-sm">
                    <p className="text-xs font-bold text-red-500 mb-1">🔴 วิกฤต</p>
                    <p className="text-3xl font-black text-red-700 dark:text-red-300">{incomingSummary.red}</p>
                    <p className="text-[10px] text-red-400 font-semibold">ราย</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-3 text-center border border-yellow-200 dark:border-yellow-800 shadow-sm">
                    <p className="text-xs font-bold text-yellow-600 mb-1">🟡 เร่งด่วน</p>
                    <p className="text-3xl font-black text-yellow-700 dark:text-yellow-300">{incomingSummary.yellow}</p>
                    <p className="text-[10px] text-yellow-400 font-semibold">ราย</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-3 text-center border border-green-200 dark:border-green-800 shadow-sm">
                    <p className="text-xs font-bold text-green-600 mb-1">🟢 ไม่รุนแรง</p>
                    <p className="text-3xl font-black text-green-700 dark:text-green-300">{incomingSummary.green}</p>
                    <p className="text-[10px] text-green-400 font-semibold">ราย</p>
                  </div>
                </div>

                {/* AI Resource Prediction */}
                <div className="bg-white/80 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50 mb-4">
                  <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3 text-indigo-700 dark:text-indigo-400">
                    <Brain className="w-4 h-4" /> 🤖 AI แนะนำ: ทรัพยากรที่ต้องเตรียม
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-center border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] text-slate-500 font-bold">🛏️ เตียง ICU</p>
                      <p className={`text-xl font-black ${prediction.prediction.icu_beds > data.icu_empty ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>{prediction.prediction.icu_beds}</p>
                      <p className="text-[9px] text-slate-400">ต้องการ / มี {data.icu_empty}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-center border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] text-slate-500 font-bold">🔪 ห้องผ่าตัด</p>
                      <p className={`text-xl font-black ${prediction.prediction.or_rooms > data.or_available ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>{prediction.prediction.or_rooms}</p>
                      <p className="text-[9px] text-slate-400">ต้องการ / มี {data.or_available}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-center border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] text-slate-500 font-bold">🫁 เครื่องช่วยหายใจ</p>
                      <p className={`text-xl font-black ${prediction.prediction.ventilators > data.ventilator_ready ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>{prediction.prediction.ventilators}</p>
                      <p className="text-[9px] text-slate-400">ต้องการ / มี {data.ventilator_ready}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5 text-center border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] text-slate-500 font-bold">🩸 เลือดที่ต้องใช้</p>
                      <p className="text-xl font-black text-slate-800 dark:text-white">{prediction.prediction.blood_o_units + prediction.prediction.blood_a_units + prediction.prediction.blood_b_units}</p>
                      <p className="text-[9px] text-slate-400">ยูนิต (เน้นกรุ๊ป O)</p>
                    </div>
                  </div>
                  {/* AI Reasoning */}
                  <div className="space-y-1">
                    {prediction.reasoning.map((r, i) => (
                      <p key={i} className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-start gap-1.5">
                        <span className="text-indigo-500 mt-0.5 shrink-0">▸</span> {r}
                      </p>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2 text-right">ความมั่นใจ AI: {prediction.confidence}% • อ้างอิง: Medical Triage Statistics</p>
                </div>

                {/* Patient List */}
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-orange-500" /> รายชื่อผู้ป่วยขาเข้า
                </h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {incoming.map(p => {
                    const cfg = TRIAGE_COLORS[p.triage_color as TriageColorKey] || TRIAGE_COLORS.Green;
                    return (
                      <div key={p.id} className="flex items-center justify-between bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 shadow-sm">
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
            ) : (
              <div className="bg-green-50/50 dark:bg-green-900/10 rounded-3xl border-2 border-green-200/50 dark:border-green-800/50 p-8 mb-8 text-center backdrop-blur-sm">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Activity className="w-10 h-10 text-green-500 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-black text-green-700 dark:text-green-400 mb-2">สถานะปกติ</h2>
                <p className="text-green-600/80 dark:text-green-500/80 font-medium text-lg">ยังไม่มีผู้ป่วยถูกส่งตัวมาจากจุดเกิดเหตุ (ER Standby)</p>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 col-span-1 lg:col-span-2 shadow-sm backdrop-blur-sm">
              <h2 className="text-2xl font-black mb-6 text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-xl text-blue-600 dark:text-blue-400"><Bed className="w-6 h-6"/></span>
                ความจุและสถานะเตียง
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 tracking-wide uppercase">เตียงว่างทั่วไป</span>
                  <div className="flex items-center gap-6">
                    <button onClick={() => updateData('bed_empty', Math.max(0, data.bed_empty - 1))} className="bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 w-12 h-12 rounded-xl font-bold text-2xl transition-all active:scale-90 hover:scale-110 flex items-center justify-center shadow-sm">-</button>
                    <span className="text-5xl font-black text-slate-800 dark:text-white w-16 text-center tabular-nums">{data.bed_empty}</span>
                    <button onClick={() => updateData('bed_empty', data.bed_empty + 1)} className="bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 w-12 h-12 rounded-xl font-bold text-2xl transition-all active:scale-90 hover:scale-110 flex items-center justify-center shadow-sm">+</button>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl flex flex-col items-center justify-center border border-red-100 dark:border-red-900/30 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <span className="text-sm font-bold text-red-500 dark:text-red-400 mb-4 tracking-wide uppercase flex items-center gap-1.5"><Activity className="w-4 h-4"/> เตียง ICU ว่าง</span>
                  <div className="flex items-center gap-6">
                    <button onClick={() => updateData('icu_empty', Math.max(0, data.icu_empty - 1))} className="bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/50 w-12 h-12 rounded-xl font-bold text-2xl transition-all active:scale-90 hover:scale-110 flex items-center justify-center shadow-sm">-</button>
                    <span className="text-5xl font-black text-slate-800 dark:text-white w-16 text-center tabular-nums">{data.icu_empty}</span>
                    <button onClick={() => updateData('icu_empty', data.icu_empty + 1)} className="bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/50 w-12 h-12 rounded-xl font-bold text-2xl transition-all active:scale-90 hover:scale-110 flex items-center justify-center shadow-sm">+</button>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 tracking-wide uppercase">สถานะ ER (ER Status)</span>
                  <div className="flex flex-col gap-2 w-full mt-1">
                    {['Normal', 'Busy', 'Critical'].map(status => (
                      <button key={status} onClick={() => updateData('er_status', status)}
                        className={`py-2.5 px-4 rounded-xl text-sm font-bold transition-all active:scale-95 border-2 ${data.er_status === status ? (status === 'Critical' ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/30' : status === 'Busy' ? 'bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/30' : 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30') : 'bg-transparent text-slate-500 border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'}`}>
                        {status.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
              <h2 className="text-xl font-black mb-6 text-purple-700 dark:text-purple-400 flex items-center gap-2">
                <span className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-xl text-purple-600 dark:text-purple-400"><Stethoscope className="w-5 h-5"/></span>
                เครื่องมือและห้องผ่าตัด
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md hover:-translate-y-0.5 transition-transform">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center"><Thermometer className="w-5 h-5 mr-3 text-purple-500"/> เครื่องช่วยหายใจ</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateData('ventilator_ready', Math.max(0, data.ventilator_ready - 1))} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 w-10 h-10 rounded-xl font-bold transition-all active:scale-95 hover:scale-110 flex items-center justify-center">-</button>
                    <span className="text-3xl font-black w-12 text-center text-slate-800 dark:text-white tabular-nums">{data.ventilator_ready}</span>
                    <button onClick={() => updateData('ventilator_ready', data.ventilator_ready + 1)} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 w-10 h-10 rounded-xl font-bold transition-all active:scale-95 hover:scale-110 flex items-center justify-center">+</button>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md hover:-translate-y-0.5 transition-transform">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center"><Stethoscope className="w-5 h-5 mr-3 text-blue-500"/> ห้องผ่าตัดว่าง (OR)</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateData('or_available', Math.max(0, data.or_available - 1))} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 w-10 h-10 rounded-xl font-bold transition-all active:scale-95 hover:scale-110 flex items-center justify-center">-</button>
                    <span className={`text-3xl font-black w-12 text-center tabular-nums ${data.or_available === 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>{data.or_available}</span>
                    <button onClick={() => updateData('or_available', data.or_available + 1)} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 w-10 h-10 rounded-xl font-bold transition-all active:scale-95 hover:scale-110 flex items-center justify-center">+</button>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md hover:-translate-y-0.5 transition-transform">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center"><MonitorCheck className="w-5 h-5 mr-3 text-indigo-500"/> CT Scan</span>
                  <button onClick={() => updateData('ct_scan_ready', !data.ct_scan_ready)}
                    className={`px-8 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md ${data.ct_scan_ready ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30' : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'}`}>
                    {data.ct_scan_ready ? 'พร้อม ✓' : 'ไม่พร้อม ✕'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6 lg:gap-8">
              <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                <h2 className="text-xl font-black mb-6 text-red-600 dark:text-red-400 flex items-center gap-2">
                  <span className="bg-red-100 dark:bg-red-900/50 p-2 rounded-xl text-red-600 dark:text-red-400"><Droplet className="w-5 h-5"/></span>
                  คลังเลือด
                </h2>
                <div className="space-y-4">
                  {[
                    { key: 'blood_a' as const, label: 'กรุ๊ป A', color: 'text-red-600 dark:text-red-400' },
                    { key: 'blood_b' as const, label: 'กรุ๊ป B', color: 'text-blue-600 dark:text-blue-400' },
                    { key: 'blood_o' as const, label: 'กรุ๊ป O', color: 'text-green-600 dark:text-green-400' },
                    { key: 'blood_ab' as const, label: 'กรุ๊ป AB', color: 'text-purple-600 dark:text-purple-400' },
                  ].map(blood => (
                    <div key={blood.key} className="flex justify-between items-center bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                      <span className={`text-sm font-bold flex items-center ${blood.color} tracking-wide`}>
                        <Droplet className="w-5 h-5 mr-3"/> {blood.label}
                      </span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateData(blood.key, Math.max(0, data[blood.key] - 5))} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 w-10 h-10 rounded-xl font-bold text-sm transition-all active:scale-95 hover:scale-110 flex items-center justify-center">-5</button>
                        <span className={`text-3xl font-black w-14 text-center tabular-nums ${data[blood.key] <= 10 ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-slate-800 dark:text-white'}`}>
                          {data[blood.key]}
                        </span>
                        <button onClick={() => updateData(blood.key, data[blood.key] + 5)} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 w-10 h-10 rounded-xl font-bold text-sm transition-all active:scale-95 hover:scale-110 flex items-center justify-center">+5</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                <h2 className="text-xl font-black mb-6 text-green-600 dark:text-green-400 flex items-center gap-2">
                  <span className="bg-green-100 dark:bg-green-900/50 p-2 rounded-xl text-green-600 dark:text-green-400"><UserCheck className="w-5 h-5"/></span>
                  บุคลากร
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md hover:-translate-y-0.5 transition-transform">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center"><UserCheck className="w-5 h-5 mr-3 text-green-500"/> ศัลยแพทย์สแตนด์บาย</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateData('surgeon_count', Math.max(0, data.surgeon_count - 1))} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 w-10 h-10 rounded-xl font-bold transition-all active:scale-95 hover:scale-110 flex items-center justify-center">-</button>
                      <span className="text-3xl font-black w-12 text-center text-slate-800 dark:text-white tabular-nums">{data.surgeon_count}</span>
                      <button onClick={() => updateData('surgeon_count', data.surgeon_count + 1)} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 w-10 h-10 rounded-xl font-bold transition-all active:scale-95 hover:scale-110 flex items-center justify-center">+</button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md hover:-translate-y-0.5 transition-transform">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center"><Users className="w-5 h-5 mr-3 text-cyan-500"/> แพทย์เวรปฏิบัติงาน</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateData('doctor_on_duty', Math.max(0, data.doctor_on_duty - 1))} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 w-10 h-10 rounded-xl font-bold transition-all active:scale-95 hover:scale-110 flex items-center justify-center">-</button>
                      <span className="text-3xl font-black w-12 text-center text-slate-800 dark:text-white tabular-nums">{data.doctor_on_duty}</span>
                      <button onClick={() => updateData('doctor_on_duty', data.doctor_on_duty + 1)} className="bg-slate-100 border border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 w-10 h-10 rounded-xl font-bold transition-all active:scale-95 hover:scale-110 flex items-center justify-center">+</button>
                    </div>
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
