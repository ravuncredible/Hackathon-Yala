import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  PhoneCall, MapPin, Users, HeartPulse, Send, AlertTriangle,
  Clock, ShieldAlert, ArrowLeft, Loader2, Target, Car, CheckCircle, Activity, Search, ChevronDown, X
} from 'lucide-react';
import { TRIAGE_COLORS, type TriageColorKey } from '../data/triageColors';
import { MOCK_HOSPITALS } from '../data/hospitals'; // Used for hospitals since it's already there

type RescueUnit = {
  id: string;
  name: string;
  type: string;
  status: string;
  lat: number;
  lng: number;
  total_vehicles?: number;
  available_vehicles?: number;
};

type IncidentStats = {
  total: number;
  active: number;
  avgResponseMins: number;
};

const createAmbulanceIcon = (status: string) => {
  const color = status === 'En Route' ? '#f59e0b' : status === 'Available' ? '#22c55e' : status === 'Busy' ? '#ef4444' : '#3b82f6';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v5c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const createHospitalIcon = () => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:white;border:3px solid #ef4444;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const createIncidentIcon = () => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="width:32px;height:32px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;animation:pulse 2s infinite;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

export default function NarinthornCommand() {
  const navigate = useNavigate();

  // Map / Data State
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [rescueUnits, setRescueUnits] = useState<RescueUnit[]>([]);
  const [stats, setStats] = useState<IncidentStats>({ total: 0, active: 0, avgResponseMins: 12 });
  const [loading, setLoading] = useState(true);

  // Resizable Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(580);
  const [isDragging, setIsDragging] = useState(false);
  const [isPickingLocation, setIsPickingLocation] = useState(false);

  // Disaster Mode State
  const [isDisasterMode, setIsDisasterMode] = useState(false);
  const [incidentType, setIncidentType] = useState('EMS ทั่วไป');
  const [isCustomIncident, setIsCustomIncident] = useState(false);
  const [customIncidentText, setCustomIncidentText] = useState('');
  const [estimatedCasualties, setEstimatedCasualties] = useState('');

  // Form State
  const [callerName, setCallerName] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [isCallerWithPatient, setIsCallerWithPatient] = useState(true);
  const [locationText, setLocationText] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [incidentCoords, setIncidentCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('ชาย');
  const [patientCondition, setPatientCondition] = useState('');
  const [symptoms, setSymptoms] = useState('');
  
  const [triageLevel, setTriageLevel] = useState<TriageColorKey | 'White' | null>(null);
  const [notificationModal, setNotificationModal] = useState<{type: 'success'|'error', message: string, details?: string} | null>(null);
  
  // Triage Checklist State
  const [cprNeeded, setCprNeeded] = useState(false);
  const [red2Symptoms, setRed2Symptoms] = useState<string[]>([]);
  const [red3Symptoms, setRed3Symptoms] = useState<string[]>([]);
  const [red4Symptoms, setRed4Symptoms] = useState<string[]>([]);

  // Vital Signs State
  const [unitLevel, setUnitLevel] = useState('FR'); // FR, BLS, ALS
  const [vsBp, setVsBp] = useState('');
  const [vsP, setVsP] = useState('');
  const [vsRr, setVsRr] = useState('');
  const [vsBt, setVsBt] = useState('');
  const [vsO2Sat, setVsO2Sat] = useState('');
  const [vsDtx, setVsDtx] = useState('');
  const [vsGcsE, setVsGcsE] = useState('');
  const [vsGcsV, setVsGcsV] = useState('');
  const [vsGcsM, setVsGcsM] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isReported, setIsReported] = useState(false);
  
  useEffect(() => {
    const isRed = cprNeeded || red2Symptoms.length >= 1 || red3Symptoms.length >= 2 || red4Symptoms.length >= 1;
    if (isRed) {
      setTriageLevel('Red');
    } else if (triageLevel === 'Red') {
      setTriageLevel(null);
    }
  }, [cprNeeded, red2Symptoms, red3Symptoms, red4Symptoms]);

  const [assignedUnitId, setAssignedUnitId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();

    // Subscribe to unit and incident updates
    const channel = supabase.channel('narinthorn-command-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rescue_units' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setRescueUnits(prev => prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } as RescueUnit : u));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    setLoading(true);
    // Fetch units
    const { data: units } = await supabase.from('rescue_units').select('*');
    if (units) setRescueUnits(units as RescueUnit[]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.toISOString();

    const { count: activeCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', startOfToday);
    const { count: totalCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday);
    
    setStats({
      total: totalCount || 0,
      active: activeCount || 0,
      avgResponseMins: 8.5
    });
    setLoading(false);
  }

  // Auto-complete fetch
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (locationText.length >= 3 && showSuggestions) {
        setIsFetchingSuggestions(true);
        try {
          const LONGDO_KEY = 'ba39df924f5914dfeeb3e351d1585020';
          const res = await fetch(`https://search.longdo.com/mapsearch/json/search?keyword=${encodeURIComponent(locationText)}&key=${LONGDO_KEY}&limit=8`);
          const data = await res.json();
          setLocationSuggestions(data?.data || (Array.isArray(data) ? data : []));
        } catch (e) {
          console.error(e);
        } finally {
          setIsFetchingSuggestions(false);
        }
      } else {
        setLocationSuggestions([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [locationText, showSuggestions]);

  const handleSetLocationToCenter = () => {
    setIsPickingLocation(!isPickingLocation);
  };

  const handleSearchLocation = async () => {
    if (!locationText.trim()) return;
    setIsSearching(true);
    try {
      const LONGDO_KEY = 'ba39df924f5914dfeeb3e351d1585020';
      const res = await fetch(`https://search.longdo.com/mapsearch/json/search?keyword=${encodeURIComponent(locationText)}&key=${LONGDO_KEY}&limit=1`);
      const data = await res.json();
      const results = data?.data || (Array.isArray(data) ? data : []);
      if (results && results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        setIncidentCoords({ lat, lng });
        if (mapRef) {
          mapRef.flyTo([lat, lng], 15);
        }
      } else {
        alert('ไม่พบสถานที่นี้ กรุณาลองค้นหาใหม่ หรือเลื่อนหมุดบนแผนที่');
      }
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการค้นหาสถานที่');
    } finally {
      setIsSearching(false);
    }
  };

  // Haversine formula for distance
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async function handleDispatch() {
    if (!callerPhone || !triageLevel || !assignedUnitId) {
      alert("กรุณากรอกเบอร์โทร, ระดับความรุนแรง และเลือกหน่วยที่ต้องการสั่งการ");
      return;
    }

    setSubmitting(true);
    
    // Format V/S to string
    const vsArr = [];
    if(vsBp) vsArr.push(`BP=${vsBp}`);
    if(vsP) vsArr.push(`P=${vsP}`);
    if(vsRr) vsArr.push(`RR=${vsRr}`);
    if(vsBt) vsArr.push(`BT=${vsBt}`);
    if(vsO2Sat) vsArr.push(`O2Sat=${vsO2Sat}`);
    if(vsDtx) vsArr.push(`DTX=${vsDtx}`);
    if(vsGcsE || vsGcsV || vsGcsM) vsArr.push(`GCS(E${vsGcsE} V${vsGcsV} M${vsGcsM})`);
    const vsString = vsArr.length > 0 ? ` [V/S: ${vsArr.join(', ')}]` : '';

    const finalIncidentType = isCustomIncident && customIncidentText ? customIncidentText : incidentType;
    const isEmsType = finalIncidentType === 'EMS ทั่วไป' || (!isDisasterMode && finalIncidentType === 'EMS ทั่วไป');

    const checklistItems = [
      cprNeeded ? 'ผู้ป่วยหมดสติ ไม่หายใจ / หายใจเฮือก (ต้องทำ CPR ทันที)' : null,
      ...red2Symptoms,
      ...red3Symptoms,
      ...red4Symptoms
    ].filter(Boolean);
    const checklistStr = checklistItems.length > 0 ? checklistItems.join(', ') : null;

    const payload = {
      name: `[${finalIncidentType}] แจ้งเหตุ: ${symptoms || 'ไม่ระบุอาการ'}${isEmsType ? vsString : ''}`,
      type: isDisasterMode ? 'mass_casualty' : 'other',
      location_text: locationText,
      lat: incidentCoords?.lat || null,
      lng: incidentCoords?.lng || null,
      patient_age: (patientAge && !isDisasterMode) ? parseInt(patientAge) : null,
      patient_gender: !isDisasterMode ? patientGender : null,
      patient_condition: !isDisasterMode ? patientCondition : null,
      caller_name: callerName,
      caller_phone: callerPhone,
      is_caller_with_patient: isCallerWithPatient,
      triage_level: triageLevel,
      assigned_unit_id: assignedUnitId,
      estimated_casualties: estimatedCasualties ? parseInt(estimatedCasualties) : null,
      triage_checklist: checklistStr,
      status: 'active',
      created_by: 'Narinthorn Dispatcher'
    };

    const { error } = await supabase.from('incidents').insert(payload);
    
    if (error) {
      console.error("Insert Error:", error, "Payload:", payload);
      setNotificationModal({
        type: 'error',
        message: 'ไม่สามารถบันทึกข้อมูลได้',
        details: `${error.message}\n${error.details || ''}\n${error.hint || ''}`
      });
    } else {
      // Update unit status to 'En Route' automatically and decrement available vehicles
      const unit = rescueUnits.find(u => u.id === assignedUnitId);
      if (unit && unit.available_vehicles !== undefined && unit.available_vehicles > 0) {
        await supabase.from('rescue_units').update({ 
          status: 'En Route',
          available_vehicles: unit.available_vehicles - 1 
        }).eq('id', assignedUnitId);
      } else {
        await supabase.from('rescue_units').update({ status: 'En Route' }).eq('id', assignedUnitId);
      }
      
      setNotificationModal({
        type: 'success',
        message: 'ข้อมูลถูกส่งไปยังหน่วยกู้ภัยเรียบร้อยแล้ว'
      });
      // Reset form
      setCallerName(''); setCallerPhone(''); setLocationText(''); setIncidentCoords(null);
      setPatientAge(''); setPatientCondition(''); setSymptoms(''); setTriageLevel(null); setAssignedUnitId('');
      fetchData(); // refresh stats
    }
    setSubmitting(false);
  }

  function MapController() {
    const map = useMapEvents({
      click(e) {
        if (isPickingLocation) {
          setIncidentCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
          setLocationText(`พิกัด: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
          setIsPickingLocation(false);
        }
      }
    });
    useEffect(() => { setMapRef(map); }, [map]);
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors">
      
      {/* Header */}
      <div className="bg-slate-900/5 dark:bg-slate-900/50 backdrop-blur-3xl border-b border-white/20 dark:border-slate-700/50 shadow-sm z-[1000] sticky top-0">
        <header className="p-3 md:p-4 flex flex-col md:flex-row justify-between items-start md:items-center max-w-[1920px] mx-auto">
          <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-0">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 via-rose-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
              <PhoneCall className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-red-600 to-rose-500 bg-clip-text text-transparent">Narinthorn Command</h1>
              <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5 flex items-center gap-1.5 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                ศูนย์สั่งการ รพ.ยะลา
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center gap-4 bg-white/50 dark:bg-slate-800/50 px-5 py-2 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">เคสวันนี้</span>
                <span className="text-base font-black text-slate-800 dark:text-slate-200 leading-none">{stats.total}</span>
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-red-400 uppercase tracking-wider">กำลังดำเนินการ</span>
                <span className="text-base font-black text-red-500 leading-none animate-pulse">{stats.active}</span>
              </div>
            </div>
            
            <button onClick={() => navigate('/history')} className="text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 p-2.5 px-4 rounded-xl transition-all hover:shadow-md active:scale-95 flex items-center gap-2 text-sm font-bold shadow-sm border border-slate-200 dark:border-slate-700">
              ประวัติ
            </button>
          </div>
        </header>
      </div>

      {/* Main Content Split (Floating layout) */}
      <div 
        className="flex-1 flex overflow-hidden relative px-3 md:px-4 pb-3 md:pb-4 gap-3 md:gap-4"
        onMouseMove={(e) => {
          if (isDragging) {
            const newWidth = Math.max(350, Math.min(800, e.clientX));
            setSidebarWidth(newWidth);
          }
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        
        {/* Left Panel: Dispatch Form */}
        <div 
          style={{ width: sidebarWidth }} 
          className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 flex flex-col z-10 shadow-2xl shrink-0 overflow-y-auto styled-scrollbar relative rounded-3xl"
        >
          {/* Drag Handle */}
          <div 
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-400 dark:hover:bg-indigo-600 transition-colors z-20"
            onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
          />

          <div className="p-5 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h2 className="font-bold text-xl flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-500" /> รับแจ้งเหตุ (Dispatch Form)
              </h2>
            </div>

            {/* Caller Info */}
            <section className="space-y-3">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><PhoneCall className="w-4 h-4"/> ข้อมูลผู้แจ้ง</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">ชื่อผู้แจ้ง</label>
                  <input type="text" placeholder="ระบุชื่อ (ถ้ามี)" value={callerName} onChange={e=>setCallerName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-inner transition-all outline-none" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
                  <input type="tel" placeholder="08X-XXX-XXXX" value={callerPhone} onChange={e=>setCallerPhone(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-inner transition-all outline-none font-medium" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <input type="checkbox" checked={isCallerWithPatient} onChange={e=>setIsCallerWithPatient(e.target.checked)} className="w-4 h-4 rounded text-red-600 focus:ring-red-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">ผู้แจ้งอยู่กับผู้ป่วยหรือไม่</span>
              </label>
            </section>

            {/* INCIDENT TYPE */}
            <section className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Target className="w-4 h-4"/> ประเภทเหตุการณ์</h3>
              <div className="flex gap-2 flex-wrap">
                {['EMS ทั่วไป', 'อุบัติเหตุหมู่ (MCI)', 'ระเบิด (Bombing)', 'น้ำท่วม (Flood)', 'ไฟไหม้ (Fire)', 'อื่นๆ (ระบุเอง)'].map(type => (
                  <button 
                    key={type} onClick={() => { 
                      if (type === 'อื่นๆ (ระบุเอง)') {
                        setIsCustomIncident(true);
                      } else {
                        setIsCustomIncident(false);
                        setIncidentType(type); 
                        if(type !== 'EMS ทั่วไป') {
                          setIsDisasterMode(true); 
                        } else {
                          setIsDisasterMode(false);
                          setEstimatedCasualties('');
                        }
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${(isCustomIncident && type === 'อื่นๆ (ระบุเอง)') || (!isCustomIncident && incidentType === type) ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {isCustomIncident && (
                <div className="mt-3">
                  <input type="text" value={customIncidentText} onChange={e=>setCustomIncidentText(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-base focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600 font-bold text-indigo-600 dark:text-indigo-400" placeholder="โปรดระบุประเภทเหตุการณ์..." />
                </div>
              )}
              
              {isDisasterMode && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg mt-3 shadow-sm">
                  <label className="block text-sm font-bold text-red-700 dark:text-red-400 mb-2">ประเมินจำนวนผู้บาดเจ็บ (คน)</label>
                  <input type="number" value={estimatedCasualties} onChange={e=>setEstimatedCasualties(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded p-3 text-base text-red-600 font-bold" placeholder="เช่น 20" />
                </div>
              )}
            </section>

            {/* Patient Info (HIDDEN IF MCI) */}
            {!isDisasterMode && (
              <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Users className="w-4 h-4"/> ข้อมูลผู้ป่วย</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">อายุ</label>
                  <input type="number" value={patientAge} onChange={e=>setPatientAge(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-base focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600" placeholder="ปี" />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">เพศ</label>
                  <select value={patientGender} onChange={e=>setPatientGender(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-base focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600">
                    <option>ชาย</option><option>หญิง</option><option>ไม่ระบุ</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">โรคประจำตัว</label>
                  <input type="text" value={patientCondition} onChange={e=>setPatientCondition(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-base focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600" placeholder="เช่น เบาหวาน, ความดัน" />
                </div>
                <div className="col-span-4">
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">อาการแรกรับ / การบาดเจ็บ</label>
                  <input type="text" value={symptoms} onChange={e=>setSymptoms(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-base focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600" placeholder="เช่น หายใจไม่ออก, เลือดออกมาก" />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['อุบัติเหตุจราจร', 'พลัดตกหกล้ม', 'หายใจหอบเหนื่อย', 'หมดสติ', 'เจ็บหน้าอก', 'ชัก', 'หญิงคลอด'].map(tag => (
                      <button 
                        key={tag} 
                        onClick={(e) => { e.preventDefault(); setSymptoms(prev => prev ? `${prev}, ${tag}` : tag); }} 
                        className="text-xs bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-indigo-900/50 dark:text-slate-400 dark:hover:text-indigo-300 px-2.5 py-1.5 rounded-md transition-colors font-semibold shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            )}

            {/* Vital Signs (HIDDEN IF MCI) */}
            {!isDisasterMode && (
            <details className="group space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <summary className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center justify-between cursor-pointer list-none select-none">
                <div className="flex items-center gap-1.5"><Activity className="w-4 h-4"/> สัญญาณชีพ (Vital Signs) & การประสานงาน <span className="text-[10px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded ml-2">Optional</span></div>
                <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
              </summary>
              
              <div className="mt-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">ระดับหน่วยที่ออกรับเหตุ:</span>
                  <div className="flex gap-4">
                    {['FR', 'BLS', 'ALS'].map(lvl => (
                      <label key={lvl} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={unitLevel === lvl} onChange={() => setUnitLevel(lvl)} className="text-blue-600 w-4 h-4" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{lvl}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">BP (mmHg)</label>
                    <input type="text" value={vsBp} onChange={e=>setVsBp(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-center font-semibold" placeholder="120/80" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">P (/min)</label>
                    <input type="number" value={vsP} onChange={e=>setVsP(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-center font-semibold" placeholder="80" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">RR (/min)</label>
                    <input type="number" value={vsRr} onChange={e=>setVsRr(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-center font-semibold" placeholder="20" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">BT (°C)</label>
                    <input type="number" step="0.1" value={vsBt} onChange={e=>setVsBt(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-center font-semibold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600" placeholder="37" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">O2Sat (%)</label>
                    <input type="number" value={vsO2Sat} onChange={e=>setVsO2Sat(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-center font-semibold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600" placeholder="98" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">DTX (mg/dL)</label>
                    <input type="number" value={vsDtx} onChange={e=>setVsDtx(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-center font-semibold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600" placeholder="100" />
                  </div>
                  <div className="col-span-4 flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">GCS (E)</label>
                      <input type="number" value={vsGcsE} onChange={e=>setVsGcsE(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-center font-semibold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600" placeholder="4" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">(V)</label>
                      <input type="number" value={vsGcsV} onChange={e=>setVsGcsV(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-center font-semibold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600" placeholder="5" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">(M)</label>
                      <input type="number" value={vsGcsM} onChange={e=>setVsGcsM(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-center font-semibold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600" placeholder="6" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-6 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isJoined} onChange={e=>setIsJoined(e.target.checked)} className="rounded border-slate-300 text-blue-600 w-4 h-4 focus:ring-blue-500" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">ว.4 ร่วม</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isReported} onChange={e=>setIsReported(e.target.checked)} className="rounded border-slate-300 text-blue-600 w-4 h-4 focus:ring-blue-500" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">รายงานแพทย์</span>
                  </label>
                </div>
              </div>
            </details>
            )}

            {/* Location */}
            <section className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> สถานที่เกิดเหตุ <span className="text-[10px] text-slate-400 font-medium ml-1 lowercase">(จุดที่ผู้ป่วยอยู่ หรือเกิดอุบัติเหตุ)</span></h3>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={locationText} 
                    onChange={e => {
                      setLocationText(e.target.value);
                      setShowSuggestions(true);
                    }} 
                    onFocus={() => { if(locationText.length >= 3) setShowSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); handleSearchLocation(); setShowSuggestions(false);}}} 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all hover:border-slate-300 dark:hover:border-slate-600" 
                    placeholder="พิมพ์ชื่อสถานที่เพื่อค้นหา..." 
                  />
                  {showSuggestions && (locationSuggestions.length > 0 || isFetchingSuggestions) && (
                    <div className="absolute z-[1000] top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {isFetchingSuggestions ? (
                        <div className="p-3 text-sm text-center text-slate-500">กำลังค้นหา...</div>
                      ) : (
                        locationSuggestions.map((place, i) => (
                          <div 
                            key={i} 
                            className="p-2 border-b last:border-b-0 border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer text-sm"
                            onClick={() => {
                              const lat = parseFloat(place.lat);
                              const lng = parseFloat(place.lon);
                              setLocationText(place.name + (place.address ? ` (${place.address})` : ''));
                              setIncidentCoords({ lat, lng });
                              setShowSuggestions(false);
                              if (mapRef) mapRef.flyTo([lat, lng], 16);
                            }}
                          >
                            {place.name} {place.address && <span className="text-xs text-slate-400">({place.address})</span>}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button onClick={(e)=>{e.preventDefault(); handleSearchLocation(); setShowSuggestions(false);}} disabled={isSearching} className="bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-3 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4" />} ค้นหา
                </button>
                <button onClick={(e)=>{e.preventDefault(); handleSetLocationToCenter();}} className={`px-3 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors whitespace-nowrap shadow-sm border ${isPickingLocation ? 'bg-indigo-600 text-white border-indigo-700 animate-pulse' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'}`}>
                  <Target className="w-4 h-4" /> {isPickingLocation ? 'คลิกบนแผนที่...' : '📍 กำหนดจุดเกิดเหตุ'}
                </button>
                {incidentCoords && (
                  <button onClick={(e)=>{e.preventDefault(); setIncidentCoords(null);}} className="bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-3 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors whitespace-nowrap shadow-sm border border-red-200 dark:border-red-800">
                    <X className="w-4 h-4" /> ยกเลิก
                  </button>
                )}
              </div>
            </section>

            {/* Triage Checklist */}
            <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><HeartPulse className="w-4 h-4"/> แบบประเมินคัดกรอง (Triage Checklist) <span className="text-red-500">*</span></h3>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4 shadow-sm">
                {/* Group A */}
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={cprNeeded} onChange={e=>setCprNeeded(e.target.checked)} className="rounded border-red-300 text-red-600 focus:ring-red-500 w-4 h-4" />
                    <span className="text-sm font-bold text-red-700 dark:text-red-400">ผู้ป่วยหมดสติ ไม่หายใจ / หายใจเฮือก (ต้องทำ CPR ทันที)</span>
                  </label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Group B */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">แดง 2: อาการหายใจ (ติ๊ก 1 ข้อ = แดง)</p>
                    {[
                      'ต้องลุกนั่ง/พิงผนังเพื่อหายใจ',
                      'พูดได้เพียงประโยคสั้นๆ',
                      'หายใจมีเสียงดัง',
                      'หายใจเร็ว แรง ลึก',
                      'ซีดและเหงื่อท่วมตัว'
                    ].map(sym => (
                      <label key={sym} className="flex items-center gap-2.5 cursor-pointer py-1">
                        <input type="checkbox" checked={red2Symptoms.includes(sym)} onChange={e => {
                          if(e.target.checked) setRed2Symptoms(p=>[...p, sym]);
                          else setRed2Symptoms(p=>p.filter(s=>s!==sym));
                        }} className="rounded border-slate-300 text-cyan-600 w-4 h-4" />
                        <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{sym}</span>
                      </label>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {/* Group C */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">แดง 3: อาการช็อก (ติ๊ก 2 ข้อ = แดง)</p>
                      {['เหงื่อท่วมตัว', 'ซีดและผิวเย็น', 'หมดสติชั่ววูบ/เกือบหมดสติ'].map(sym => (
                        <label key={sym} className="flex items-center gap-2.5 cursor-pointer py-1">
                          <input type="checkbox" checked={red3Symptoms.includes(sym)} onChange={e => {
                            if(e.target.checked) setRed3Symptoms(p=>[...p, sym]);
                            else setRed3Symptoms(p=>p.filter(s=>s!==sym));
                          }} className="rounded border-slate-300 text-cyan-600 w-4 h-4" />
                          <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{sym}</span>
                        </label>
                      ))}
                    </div>

                    {/* Group D */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">แดง 4: ทางสมอง (ติ๊ก 1 ข้อ = แดง)</p>
                      {['ระดับความรู้สึกตัวลดลง', 'ตอบเวลา/สถานที่/บุคคล ไม่ถูกต้อง'].map(sym => (
                        <label key={sym} className="flex items-center gap-2.5 cursor-pointer py-1">
                          <input type="checkbox" checked={red4Symptoms.includes(sym)} onChange={e => {
                            if(e.target.checked) setRed4Symptoms(p=>[...p, sym]);
                            else setRed4Symptoms(p=>p.filter(s=>s!==sym));
                          }} className="rounded border-slate-300 text-cyan-600 w-4 h-4" />
                          <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{sym}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-3 mt-3">
                {['Red', 'Yellow', 'Green', 'White'].map(color => {
                  const isSel = triageLevel === color;
                  const config = color === 'White' 
                    ? { bgLight: 'bg-white', border: 'border-slate-300', text: 'text-slate-700', label: 'ทั่วไป', emoji: '⚪' }
                    : TRIAGE_COLORS[color as TriageColorKey];
                  
                  return (
                    <button key={color} onClick={()=>setTriageLevel(color as any)} className={`py-3 rounded-xl border-2 flex flex-col items-center transition-all ${isSel ? config.border + ' ' + config.bgLight + ' shadow-md scale-105' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-70'}`}>
                      <span className="text-2xl mb-1.5">{config.emoji}</span>
                      <span className={`text-xs font-bold ${isSel ? config.text : 'text-slate-500'}`}>{config.label}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Dispatch Action */}
            <section className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 -mx-5 px-5 pb-5">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mt-4">สั่งการหน่วย (Dispatch) <span className="text-red-500">*</span></h3>
              
              <div className="space-y-2 max-h-48 overflow-y-auto styled-scrollbar pr-1">
                {rescueUnits.map(unit => {
                  const isSel = assignedUnitId === unit.id;
                  const isAvail = unit.status === 'Available';
                  
                  let distanceStr = '';
                  if (incidentCoords && unit.lat && unit.lng) {
                    const dist = calculateDistance(incidentCoords.lat, incidentCoords.lng, unit.lat, unit.lng);
                    const eta = Math.round(dist * 2); // rough estimate: 2 mins per km in city
                    distanceStr = `ห่าง ${dist.toFixed(1)} กม. (~${eta} นาที)`;
                  }

                  return (
                    <button 
                      key={unit.id} 
                      onClick={()=>setAssignedUnitId(unit.id)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between ${isSel ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${unit.type === 'hospital_ambulance' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                          <Car className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                            {unit.name}
                            {isSel && <CheckCircle className="w-3.5 h-3.5 text-red-500" />}
                          </div>
                          <div className="text-xs font-medium mt-0.5 flex gap-2">
                            <span className={isAvail ? 'text-green-600' : 'text-amber-600'}>● {unit.status}</span>
                            {(unit.total_vehicles !== undefined && unit.available_vehicles !== undefined) && (
                              <span className="text-slate-500 font-bold ml-1">
                                (ว่าง {unit.available_vehicles}/{unit.total_vehicles} คัน)
                              </span>
                            )}
                            {distanceStr && <span className="text-slate-400">| {distanceStr}</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <button 
                onClick={handleDispatch} 
                disabled={submitting || !callerPhone || !triageLevel || !assignedUnitId}
                className={`w-full py-4 rounded-xl text-base font-black flex justify-center items-center gap-2 transition-all shadow-lg mt-4 ${submitting || !callerPhone || !triageLevel || !assignedUnitId ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white active:scale-95 hover:shadow-red-500/30'}`}
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Send className="w-5 h-5"/> สั่งการออกเหตุทันที</>}
              </button>
            </section>

          </div>
        </div>

        {/* Right Panel: Map */}
        <div className="flex-1 relative bg-slate-200 dark:bg-slate-800 z-0 h-[400px] md:h-auto rounded-3xl overflow-hidden border border-white/50 dark:border-slate-700/50 shadow-inner">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
          )}
          
          {/* Map Center Crosshair (for picking location) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] pointer-events-none">
            <Target className="w-6 h-6 text-indigo-600 drop-shadow-md" />
          </div>
          
          {/* Map Overlay Stats */}
          <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 pointer-events-none">
            
            {/* SURGE CAPACITY ALERT */}
            {isDisasterMode && (
              <div className="pointer-events-auto bg-red-500/90 backdrop-blur text-white px-5 py-3 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.5)] border-2 border-white/20 flex flex-col items-center max-w-[320px] text-center animate-bounce mb-2">
                <div className="flex items-center gap-2 font-black text-sm">
                  <AlertTriangle className="w-5 h-5" /> อุบัติภัยหมู่ (Disaster Mode)
                </div>
                <p className="text-xs font-medium mt-1">⚠️ แจ้งเตือน: แนะนำให้กระจายผู้ป่วยสีเขียว/เหลืองไปยัง รพ.รอบนอก เพื่อลดความแออัดที่ รพ.ศูนย์</p>
              </div>
            )}

            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-slate-600 shadow-lg pointer-events-auto w-48">
              <h3 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1"><Activity className="w-3 h-3"/> สถานะหน่วยกู้ภัย</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-green-600 font-semibold">● ว่าง (Available)</span><span className="font-bold">{rescueUnits.filter(u=>u.status==='Available').length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-amber-500 font-semibold">● ออกเหตุ (En Route)</span><span className="font-bold">{rescueUnits.filter(u=>u.status==='En Route').length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-red-500 font-semibold">● ติดพัน (Busy)</span><span className="font-bold">{rescueUnits.filter(u=>u.status==='Busy').length}</span></div>
              </div>
            </div>
          </div>

          <MapContainer center={[6.54, 101.28]} zoom={12} className={`w-full h-full ${isPickingLocation ? 'cursor-crosshair' : ''}`} zoomControl={true}>
            <MapController />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles" />
            
            {/* Incident Marker (if picked) */}
            {incidentCoords && (
              <Marker position={[incidentCoords.lat, incidentCoords.lng]} icon={createIncidentIcon()}>
                <Popup>
                  <div className="font-bold text-red-600">📍 จุดเกิดเหตุ</div>
                </Popup>
              </Marker>
            )}

            {/* Hospitals */}
            {MOCK_HOSPITALS.map(h => (
              <Marker key={h.id} position={[h.lat, h.lng]} icon={createHospitalIcon()}>
                <Tooltip direction="top" offset={[0, -15]} opacity={1} className="custom-tooltip">
                  <div className="font-sans min-w-[150px]">
                    <h3 className="font-bold text-sm border-b border-slate-200 pb-1 mb-1 text-blue-600">{h.hospital_name}</h3>
                    <div className="grid grid-cols-2 gap-1 text-[10px] mb-1">
                      <div className="font-semibold text-slate-600">ER:</div><div className={`font-bold ${h.er_status==='Critical'?'text-red-500':'text-green-500'}`}>{h.er_status}</div>
                      <div className="font-semibold text-slate-600">เตียง/ICU:</div><div>{h.bed_empty} / {h.icu_empty}</div>
                    </div>
                  </div>
                </Tooltip>
              </Marker>
            ))}

            {/* Rescue Units */}
            {rescueUnits.map((unit, index) => {
              // Offset ambulances slightly radially to prevent overlapping with hospitals
              const radius = 0.0015;
              const angle = index * (Math.PI / 2); // spread them out if multiple
              const latOffset = radius * Math.cos(angle);
              const lngOffset = radius * Math.sin(angle);
              const displayLat = unit.lat + latOffset;
              const displayLng = unit.lng + lngOffset;

              // Draw line if selected and incident exists
              const isSelected = assignedUnitId === unit.id;
              return (
                <React.Fragment key={`${unit.id}-${unit.status}`}>
                  <Marker position={[displayLat, displayLng]} icon={createAmbulanceIcon(unit.status)}>
                    <Popup>
                      <div className="font-bold mb-1">{unit.name}</div>
                      <div className="text-xs">สถานะ: {unit.status}</div>
                    </Popup>
                  </Marker>
                  {isSelected && incidentCoords && (
                    <Polyline 
                      positions={[[displayLat, displayLng], [incidentCoords.lat, incidentCoords.lng]]}
                      color="#ef4444"
                      dashArray="5, 10"
                      weight={3}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </MapContainer>
        </div>

      </div>

      {/* Notification Modal */}
      {notificationModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              {notificationModal.type === 'success' ? (
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <CheckCircle className="w-8 h-8" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              )}
              <h3 className={`text-xl font-black mb-2 ${notificationModal.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {notificationModal.type === 'success' ? 'สำเร็จ!' : 'เกิดข้อผิดพลาด'}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 font-bold mb-1">
                {notificationModal.message}
              </p>
              {notificationModal.details && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 mb-4 whitespace-pre-line font-medium bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg w-full text-left">
                  {notificationModal.details}
                </p>
              )}
              <button 
                onClick={() => setNotificationModal(null)}
                className="mt-5 w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl font-black transition-colors shadow-sm"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`html.dark .map-tiles { filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7); }`}</style>
    </div>
  );
}
