import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  AlertTriangle, MapPin, Users, Flame, CloudRain,
  Car, Zap, Plus, ArrowLeft, Loader2, CheckCircle
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { saveToOfflineQueue } from '../lib/offlineSync';

const INCIDENT_TYPES = [
  { id: 'flood', label: 'น้ำท่วม', icon: CloudRain, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { id: 'accident', label: 'อุบัติเหตุหมู่', icon: Car, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  { id: 'fire', label: 'ไฟไหม้', icon: Flame, color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
  { id: 'explosion', label: 'ระเบิด/เหตุรุนแรง', icon: Zap, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
  { id: 'other', label: 'อื่นๆ', icon: AlertTriangle, color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
];

export default function IncidentCreate() {
  const navigate = useNavigate();
  const [incidentName, setIncidentName] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [location, setLocation] = useState('');
  const [estimatedCasualties, setEstimatedCasualties] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  function getCurrentLocation() {
    if (!navigator.geolocation) return alert('GPS ไม่พร้อมใช้งานบนอุปกรณ์นี้');
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setGettingLocation(false);
      },
      () => {
        alert('ไม่สามารถดึงพิกัด GPS ได้');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit() {
    if (!incidentName || !incidentType) return;
    setSubmitting(true);

    const payload = {
      name: incidentName,
      type: incidentType,
      location_text: location || null,
      lat: gpsCoords?.lat || null,
      lng: gpsCoords?.lng || null,
      estimated_casualties: parseInt(estimatedCasualties) || null,
      status: 'active',
      created_by: 'EMS First Responder',
    };

    if (isOffline) {
      const localId = `local-${Date.now().toString(36)}`;
      saveToOfflineQueue('incidents', { ...payload, id: localId });
      setCreatedId(localId);
      setCreated(true);
      setTimeout(() => navigate(`/rescue?incident=${localId}&name=${encodeURIComponent(incidentName)}&type=${incidentType}`), 1500);
      setSubmitting(false);
      return;
    }

    try {
      const { data, error } = await supabase.from('incidents').insert(payload).select('id').single();

      if (error) {
        console.warn('Supabase insert error (table may not exist):', error.message);
        const localId = `local-${Date.now().toString(36)}`;
        saveToOfflineQueue('incidents', { ...payload, id: localId });
        setCreatedId(localId);
        setCreated(true);
        setTimeout(() => navigate(`/rescue?incident=${localId}&name=${encodeURIComponent(incidentName)}&type=${incidentType}`), 1500);
      } else if (data) {
        setCreatedId(data.id);
        setCreated(true);
        setTimeout(() => navigate(`/rescue?incident=${data.id}&name=${encodeURIComponent(incidentName)}&type=${incidentType}`), 1500);
      }
    } catch (e) {
      console.warn('Network error, saving to offline queue', e);
      const localId = `local-${Date.now().toString(36)}`;
      saveToOfflineQueue('incidents', { ...payload, id: localId });
      setCreatedId(localId);
      setCreated(true);
      setTimeout(() => navigate(`/rescue?incident=${localId}&name=${encodeURIComponent(incidentName)}&type=${incidentType}`), 1500);
    }
    setSubmitting(false);
  }

  if (created) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 max-w-md w-full text-center space-y-4 animate-in">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">สร้างเหตุการณ์สำเร็จ!</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">{incidentName}</p>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 font-mono text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            ID: {createdId?.substring(0, 8)}... {isOffline && <span className="text-orange-500 font-sans text-xs ml-2">(Offline)</span>}
          </div>
          <p className="text-xs text-slate-400">กำลังเปิดหน้า Triage...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 p-2 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-500" /> สร้างเหตุการณ์ใหม่
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">รายงานเหตุภัยพิบัติจากหน้างาน</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6 pb-24">
        {/* Incident Name */}
        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-orange-500" /> ชื่อเหตุการณ์ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={incidentName}
            onChange={(e) => setIncidentName(e.target.value)}
            placeholder="เช่น น้ำท่วมใหญ่อ.เมืองยะลา, รถบัสคว่ำ ถ.สาย410"
            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-cyan-500 transition placeholder:text-slate-400"
          />
        </div>

        {/* Incident Type */}
        <div className="space-y-2">
          <label className="text-sm font-bold">ประเภทเหตุการณ์ <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-2">
            {INCIDENT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = incidentType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setIncidentType(type.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm transition active:scale-95 ${
                    isSelected
                      ? type.color + ' border-current shadow-md'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-indigo-500" /> สถานที่เกิดเหตุ
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="เช่น ถ.สิโรรส ต.สะเตง"
              className="flex-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-cyan-500 transition placeholder:text-slate-400"
            />
            <button
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl font-bold text-sm transition active:scale-95 flex items-center gap-1 shrink-0 shadow-md"
            >
              {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              GPS
            </button>
          </div>
          {gpsCoords && (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              ✅ ได้พิกัด: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* Estimated Casualties */}
        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-1.5">
            <Users className="w-4 h-4 text-red-500" /> จำนวนผู้บาดเจ็บโดยประมาณ
          </label>
          <input
            type="number"
            value={estimatedCasualties}
            onChange={(e) => setEstimatedCasualties(e.target.value)}
            placeholder="เช่น 40"
            min={0}
            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-cyan-500 transition placeholder:text-slate-400"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!incidentName || !incidentType || submitting}
          className={`w-full py-4 rounded-xl text-base font-bold flex justify-center items-center gap-2 transition shadow-lg ${
            !incidentName || !incidentType
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white active:scale-95'
          }`}
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <AlertTriangle className="w-5 h-5" />
              🚨 สร้างเหตุการณ์ & เริ่ม Triage
            </>
          )}
        </button>
      </div>
    </div>
  );
}
