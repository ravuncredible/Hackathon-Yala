import React from 'react';
import { 
  X, MapPin, PhoneCall, User, HeartPulse, Activity, 
  Clock, ShieldAlert, FileText, CheckCircle, Car 
} from 'lucide-react';

type Incident = {
  id: string;
  name: string;
  type?: string;
  location_text?: string | null;
  lat?: number | null;
  lng?: number | null;
  patient_age?: number | null;
  patient_gender?: string | null;
  patient_condition?: string | null;
  caller_name?: string | null;
  caller_phone?: string | null;
  is_caller_with_patient?: boolean | null;
  triage_level?: string | null;
  assigned_unit_id?: string | null;
  estimated_casualties?: number | null;
  triage_checklist?: string | null;
  status?: string | null;
  created_at: string;
};

interface IncidentDetailsModalProps {
  incident: Incident;
  unitName?: string;
  onClose: () => void;
}

const TRIAGE_COLORS: Record<string, { bg: string, text: string, border: string, label: string }> = {
  'Red 1': { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500', label: 'วิกฤต (Red 1)' },
  'Red 2': { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500', label: 'วิกฤต (Red 2)' },
  'Yellow': { bg: 'bg-yellow-400', text: 'text-yellow-900', border: 'border-yellow-400', label: 'เร่งด่วน (Yellow)' },
  'Green': { bg: 'bg-green-500', text: 'text-white', border: 'border-green-500', label: 'ไม่รุนแรง (Green)' },
  'White': { bg: 'bg-slate-200', text: 'text-slate-800', border: 'border-slate-300', label: 'ทั่วไป (White)' },
  'Black': { bg: 'bg-slate-800', text: 'text-white', border: 'border-slate-800', label: 'เสียชีวิต (Black)' },
};

export default function IncidentDetailsModal({ incident, unitName, onClose }: IncidentDetailsModalProps) {
  const colorConfig = TRIAGE_COLORS[incident.triage_level || 'Green'] || TRIAGE_COLORS['Green'];
  const timeString = new Date(incident.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  const dateString = new Date(incident.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative z-10 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className={`p-5 flex justify-between items-start border-b ${colorConfig.bg} ${colorConfig.text}`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded shadow-sm">
                {incident.type}
              </span>
              <span className="text-sm font-bold opacity-90 flex items-center gap-1">
                <Clock className="w-4 h-4" /> {dateString} เวลา {timeString}
              </span>
            </div>
            <h2 className="text-xl font-black">{incident.name}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto styled-scrollbar space-y-6">
          
          {/* Status & Triage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-1"><Activity className="w-4 h-4"/> ระดับความรุนแรง</div>
              <div className={`text-base font-black flex items-center gap-2 ${colorConfig.text === 'text-white' ? colorConfig.bg.replace('bg-', 'text-') : colorConfig.text}`}>
                <div className={`w-3 h-3 rounded-full ${colorConfig.bg}`}></div>
                {colorConfig.label}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-1"><ShieldAlert className="w-4 h-4"/> สถานะเคส</div>
              <div className="text-base font-black text-slate-700 dark:text-slate-300">
                {incident.status === 'active' ? 'กำลังดำเนินการ' : incident.status === 'resolved' ? 'จบงานแล้ว' : 'ยกเลิก'}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-2"><MapPin className="w-4 h-4 text-indigo-500"/> สถานที่เกิดเหตุ</div>
            <div className="text-base font-bold text-slate-800 dark:text-slate-200">{incident.location_text || 'ไม่ได้ระบุสถานที่'}</div>
            {incident.lat && incident.lng && (
              <div className="text-xs font-mono text-slate-400 mt-1">พิกัด: {incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Info */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                <User className="w-4 h-4 text-cyan-500"/> ข้อมูลผู้ป่วย
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 font-medium">เพศ:</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{incident.patient_gender || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 font-medium">อายุ:</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{incident.patient_age ? `${incident.patient_age} ปี` : '-'}</span>
                </div>
                {(incident.estimated_casualties ?? 0) > 1 && (
                  <div className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                    <span className="text-sm text-red-600 dark:text-red-400 font-bold">จำนวนผู้บาดเจ็บ (ประเมิน):</span>
                    <span className="text-sm font-black text-red-600 dark:text-red-400">{incident.estimated_casualties} ราย</span>
                  </div>
                )}
                <div>
                  <span className="text-sm text-slate-500 font-medium block mb-1">โรคประจำตัว / อาการเบื้องต้น:</span>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                    {incident.patient_condition || '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Caller Info */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                <PhoneCall className="w-4 h-4 text-green-500"/> ข้อมูลผู้แจ้ง
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 font-medium">ชื่อผู้แจ้ง:</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{incident.caller_name || 'ไม่ระบุ'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 font-medium">เบอร์โทรติดต่อ:</span>
                  <span className="text-sm font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">{incident.caller_phone || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 font-medium">อยู่กับผู้ป่วยหรือไม่:</span>
                  <span className={`text-sm font-bold ${incident.is_caller_with_patient ? 'text-green-600' : 'text-slate-500'}`}>
                    {incident.is_caller_with_patient ? 'ใช่ (อยู่ด้วย)' : 'ไม่ใช่'}
                  </span>
                </div>
                <div className="pt-2">
                  <span className="text-sm text-slate-500 font-medium block mb-1">หน่วยที่รับผิดชอบ:</span>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                    <Car className="w-4 h-4 text-indigo-500" />
                    {unitName || incident.assigned_unit_id || 'ไม่ได้ระบุ'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Triage Checklist */}
          {incident.triage_checklist && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100 dark:border-red-800/50">
              <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2 mb-2">
                <HeartPulse className="w-4 h-4"/> สรุปการประเมิน (Triage Checklist)
              </h3>
              <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 text-sm font-black text-slate-800 dark:text-slate-200 leading-relaxed shadow-sm">
                {incident.triage_checklist.split('\n').map((line, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1 last:mb-0">
                    <CheckCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
