import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import {
  ShieldAlert, ArrowLeft, Activity, Droplet, Clock, Truck,
  MapPin, Loader2, PhoneCall, ChevronUp, ChevronDown, CheckCircle, XCircle, FileText, Settings
} from 'lucide-react';
import { MOCK_HOSPITALS, type Hospital } from '../data/hospitals';
import { TRIAGE_COLORS, type TriageColorKey } from '../data/triageColors';
import IncidentDetailsModal from '../components/IncidentDetailsModal';

// --- Types ---
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

type Incident = {
  id: string;
  name: string;
  type?: string;
  patient_age: number | null;
  patient_gender: string | null;
  patient_condition: string | null;
  caller_name: string | null;
  caller_phone: string | null;
  is_caller_with_patient?: boolean;
  triage_level: string | null;
  location_text: string | null;
  triage_checklist?: string | null;
  lat: number | null;
  lng: number | null;
  assigned_unit_id?: string;
  estimated_casualties?: number;
  status?: string;
  created_at: string;
};

// --- Icons & Helpers ---
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
  const color = status === 'En Route' ? '#f59e0b' : status === 'Available' ? '#22c55e' : status === 'Busy' ? '#ef4444' : '#94a3b8';
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v5c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const createIncidentIcon = (triageLevel: string | null) => {
  const color = triageLevel === 'Red' ? '#ef4444' : triageLevel === 'Yellow' ? '#eab308' : triageLevel === 'Green' ? '#22c55e' : '#cbd5e1';
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};border:2px solid white;box-shadow:0 4px 8px rgba(0,0,0,0.3);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;animation:bounce 2s infinite"><div style="width:8px;height:8px;background:white;border-radius:50%;transform:rotate(45deg)"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};

const MOCK_AMBULANCES = [
  { id: 'amb-1', name: 'กู้ภัยยะลา 01', lat: 6.5300, lng: 101.2700, status: 'En Route' },
  { id: 'amb-2', name: 'กู้ภัยยะลา 02', lat: 6.5400, lng: 101.2800, status: 'Standby' },
];

function BloodBadge({ label, count }: { label: string; count: number }) {
  const isCritical = count <= 10;
  const color = isCritical 
    ? 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
    : count <= 25 
      ? 'text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
      : 'text-slate-700 bg-slate-50 dark:text-slate-300 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
      
  return (
    <div className={`${color} flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border shadow-sm transition-all`}>
      <div className="flex items-center gap-1 mb-0.5">
        <Droplet className={`w-3 h-3 ${isCritical ? 'text-red-500 animate-pulse' : 'text-red-500/80'}`} fill="currentColor" />
        <span className="text-[10px] font-bold">กรุ๊ป {label}</span>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-sm font-black">{count}</span>
        <span className="text-[9px] font-medium opacity-70">ยูนิต</span>
      </div>
    </div>
  );
}

function IncidentTitle({ name }: { name: string }) {
  const match = name.match(/^\[(.*?)\] แจ้งเหตุ: (.*?)(?: \[V\/S: (.*?)\])?$/);
  if (!match) {
    return <h3 className="font-black text-base text-slate-800 dark:text-white leading-tight">{name}</h3>;
  }
  
  const type = match[1];
  const symptoms = match[2];
  const vitalsStr = match[3];

  return (
    <div className="flex flex-col gap-2.5 my-1">
      <div className="flex flex-col gap-1">
        <h3 className="font-black text-lg text-slate-900 dark:text-white leading-snug break-words">
          <span className="text-slate-400 dark:text-slate-500 font-bold mr-2 text-sm">[{type}]</span>
          {symptoms}
        </h3>
      </div>
      {vitalsStr && (
        <div className="bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60 rounded-lg p-3">
          <div className="text-xs font-black text-slate-400 mb-2.5 uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-red-500" /> สัญญาณชีพ
          </div>
          <div className="flex flex-wrap gap-1.5">
            {vitalsStr.split(', ').map((vital, i) => {
              const parts = vital.split('=');
              if (parts.length === 1) {
                 return <span key={i} className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold px-2.5 py-1.5 rounded shadow-sm border border-slate-200/50 dark:border-slate-700/50">{vital}</span>
              }
              const k = parts[0];
              const v = parts.slice(1).join('=');
              return (
                <div key={i} className="flex bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded shadow-sm overflow-hidden">
                  <span className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-bold px-2 py-1.5 border-r border-slate-200/50 dark:border-slate-700/50">{k}</span>
                  <span className="text-slate-800 dark:text-slate-200 text-sm font-black px-2.5 py-1.5">{v}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Component ---
export default function RescueDashboard() {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState<Hospital[]>(MOCK_HOSPITALS);
  const [rescueUnits, setRescueUnits] = useState<RescueUnit[]>([]);
  const [myUnitId, setMyUnitId] = useState<string>('');
  const [assignedIncidents, setAssignedIncidents] = useState<Incident[]>([]);

  const [loadingMap, setLoadingMap] = useState(true);
  const [hospitalPanelOpen, setHospitalPanelOpen] = useState(false);

  // Resizable Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(450);
  const [isDragging, setIsDragging] = useState(false);
  
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Max Vehicles Modal State
  const [maxVehicleModal, setMaxVehicleModal] = useState<{isOpen: boolean, unitName: string, maxVal: string}>({
    isOpen: false, unitName: '', maxVal: ''
  });

  // Confirm Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    type: 'success' | 'danger';
    onConfirm: () => void;
  }>({
    isOpen: false, title: '', message: '', confirmText: '', type: 'success', onConfirm: () => {}
  });

  const openConfirm = (title: string, message: string, confirmText: string, type: 'success' | 'danger', onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, confirmText, type, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  // Data Fetching & Realtime
  useEffect(() => {
    fetchHospitals();
    fetchRescueUnits();

    const hospitalChannel = supabase.channel('hospital-changes-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, (payload) => {
        if (payload.eventType === 'UPDATE') setHospitals(current => current.map(h => h.id === payload.new.id ? { ...h, ...payload.new } as Hospital : h));
      }).subscribe();

    const incidentChannel = supabase.channel('incident-changes-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
         fetchAssignedIncidents(myUnitId);
      }).subscribe();

    const rescueUnitsChannel = supabase.channel('rescue-units-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rescue_units' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setRescueUnits(prev => prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } as RescueUnit : u));
        }
      }).subscribe();

    return () => { 
      supabase.removeChannel(hospitalChannel); 
      supabase.removeChannel(incidentChannel);
      supabase.removeChannel(rescueUnitsChannel);
    };
  }, [myUnitId]);

  async function fetchHospitals() {
    setLoadingMap(true);
    // Filter out Betong hospital for now to focus on Yala
    const { data, error } = await supabase.from('hospitals').select('*').neq('hospital_name', 'โรงพยาบาลเบตง');
    if (data && !error && data.length > 0) setHospitals(data as Hospital[]);
    setLoadingMap(false);
  }

  async function fetchRescueUnits() {
    const { data } = await supabase.from('rescue_units').select('*');
    if (data) setRescueUnits(data as RescueUnit[]);
  }

  const fetchAssignedIncidents = useCallback(async (unitId: string) => {
    if (!unitId) { setAssignedIncidents([]); return; }
    const { data } = await supabase.from('incidents').select('*').eq('assigned_unit_id', unitId).eq('status', 'active').order('created_at', { ascending: false });
    if (data) setAssignedIncidents(data as Incident[]);
  }, []);

  useEffect(() => {
    fetchAssignedIncidents(myUnitId);
  }, [myUnitId, fetchAssignedIncidents]);

  async function handleUpdateMyStatus(newStatus: string) {
    if (!myUnitId) return;
    await supabase.from('rescue_units').update({ status: newStatus }).eq('id', myUnitId);
    setRescueUnits(prev => prev.map(u => u.id === myUnitId ? { ...u, status: newStatus } : u));
  }

  async function handleUpdateVehicles(delta: number) {
    if (!myUnitId) return;
    const unit = rescueUnits.find(u => u.id === myUnitId);
    if (!unit) return;
    const currentAvailable = unit.available_vehicles || 0;
    const newAvailable = Math.max(0, Math.min(unit.total_vehicles || 10, currentAvailable + delta));
    await supabase.from('rescue_units').update({ available_vehicles: newAvailable }).eq('id', myUnitId);
    setRescueUnits(prev => prev.map(u => u.id === myUnitId ? { ...u, available_vehicles: newAvailable } : u));
  }

  function handleOpenMaxVehicleModal() {
    const unit = rescueUnits.find(u => u.id === myUnitId);
    if (!unit) return;
    setMaxVehicleModal({ isOpen: true, unitName: unit.name, maxVal: (unit.total_vehicles || 10).toString() });
  }

  async function handleSaveMaxVehicles() {
    const unit = rescueUnits.find(u => u.id === myUnitId);
    if (!unit) return;
    const newMax = parseInt(maxVehicleModal.maxVal);
    if (isNaN(newMax) || newMax < 0) {
      alert("กรุณากรอกตัวเลขที่ถูกต้อง");
      return;
    }
    const currentAvailable = unit.available_vehicles || 0;
    // ensure available isn't greater than new max
    const newAvailable = Math.min(currentAvailable, newMax);
    await supabase.from('rescue_units').update({ total_vehicles: newMax, available_vehicles: newAvailable }).eq('id', myUnitId);
    setRescueUnits(prev => prev.map(u => u.id === myUnitId ? { ...u, total_vehicles: newMax, available_vehicles: newAvailable } : u));
    setMaxVehicleModal({ isOpen: false, unitName: '', maxVal: '' });
  }

  async function handleUpdateIncidentStatus(incidentId: string, newStatus: string) {
    const { error } = await supabase.from('incidents').update({ status: newStatus }).eq('id', incidentId);
    if (error) {
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    } else {
      // Remove from the local list so it feels responsive instantly
      setAssignedIncidents(prev => prev.filter(inc => inc.id !== incidentId));
      // Optionally update unit status back to 'Available' when case is closed
      if (newStatus === 'resolved' || newStatus === 'cancelled') {
        handleUpdateMyStatus('Available');
      }
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors">
      
      {/* Floating Header Island */}
      <div className="p-3 md:p-4 z-20 flex-shrink-0">
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-2.5 px-4 md:px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 rounded-3xl shadow-xl shadow-cyan-500/5 transition-all">
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
            <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-900 bg-white dark:bg-slate-800 p-2 md:p-2.5 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-2 md:p-2.5 rounded-xl shadow-lg shadow-cyan-500/30 text-white">
              <ShieldAlert className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg md:text-xl font-black leading-none bg-gradient-to-r from-cyan-600 to-blue-500 bg-clip-text text-transparent drop-shadow-sm">ศูนย์ประสานงานกู้ภัย</h1>
              <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                Rescue Coordinator Dashboard
              </p>
            </div>
          
            {/* Mobile Only: Select Unit */}
            <div className="md:hidden flex items-center gap-2">
              <select value={myUnitId} onChange={e=>setMyUnitId(e.target.value)} className="text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-cyan-500 w-28 truncate text-slate-700 dark:text-slate-200 shadow-sm outline-none">
                <option value="">เลือกหน่วย..</option>
                {rescueUnits.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <button onClick={() => {
              if (!myUnitId) { alert("กรุณาเลือกประจำการหน่วยกู้ภัยก่อนดูประวัติ"); return; }
              navigate(`/history?unitId=${myUnitId}`);
            }} className="text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 p-2.5 px-4 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 text-sm font-bold shadow-sm border border-slate-200 dark:border-slate-700 whitespace-nowrap">
              ประวัติรับเคส
            </button>
            
            {/* Desktop Unit Selector & Status Toggle */}
            <div className="hidden md:flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
              <span className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-wider">ประจำการ:</span>
              <select value={myUnitId} onChange={e=>setMyUnitId(e.target.value)} className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-cyan-500 text-cyan-700 dark:text-cyan-400 cursor-pointer w-48 truncate outline-none">
                <option value="">— เลือกหน่วยของท่าน —</option>
                {rescueUnits.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {myUnitId && (() => {
                const myUnit = rescueUnits.find(u=>u.id===myUnitId);
                return (
                  <>
                    {(myUnit?.total_vehicles !== undefined) && (
                      <div className="flex bg-slate-100 dark:bg-slate-900/50 rounded-xl p-1 shadow-inner ml-2 gap-1 border border-slate-200/50 dark:border-slate-700/50 items-center px-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">รถว่าง:</span>
                        <button onClick={()=>handleUpdateVehicles(-1)} className="w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-cyan-600 hover:border-cyan-400 font-black">-</button>
                        <span className="text-sm font-black text-cyan-600 dark:text-cyan-400 w-8 text-center">{myUnit.available_vehicles || 0}/{myUnit.total_vehicles}</span>
                        <button onClick={()=>handleUpdateVehicles(1)} className="w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-cyan-600 hover:border-cyan-400 font-black">+</button>
                        <button onClick={handleOpenMaxVehicleModal} className="w-5 h-5 ml-1 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title="ตั้งค่าจำนวนรถสูงสุด"><Settings className="w-3.5 h-3.5"/></button>
                      </div>
                    )}
                    <div className="flex bg-slate-100 dark:bg-slate-900/50 rounded-xl p-1 shadow-inner ml-2 gap-1 border border-slate-200/50 dark:border-slate-700/50">
                      <button onClick={()=>handleUpdateMyStatus('Available')} className={`px-4 py-2 text-sm font-black rounded-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 ${myUnit?.status==='Available'?'bg-gradient-to-r from-green-500 to-green-400 text-white shadow-lg shadow-green-500/40 ring-2 ring-green-200 dark:ring-green-900':'text-slate-500 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-700'}`}>ว่าง</button>
                      <button onClick={()=>handleUpdateMyStatus('En Route')} className={`px-4 py-2 text-sm font-black rounded-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 ${myUnit?.status==='En Route'?'bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-lg shadow-amber-500/40 ring-2 ring-amber-200 dark:ring-amber-900':'text-slate-500 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-700'}`}>ออกเหตุ</button>
                      <button onClick={()=>handleUpdateMyStatus('Busy')} className={`px-4 py-2 text-sm font-black rounded-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 ${myUnit?.status==='Busy'?'bg-gradient-to-r from-red-500 to-rose-400 text-white shadow-lg shadow-red-500/40 ring-2 ring-red-200 dark:ring-red-900':'text-slate-500 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-700'}`}>ติดพัน</button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </header>
      </div>

      {/* Main Content Split */}
      <div 
        className="flex-1 flex flex-col md:flex-row overflow-hidden relative px-3 md:px-4 pb-3 md:pb-4 gap-3 md:gap-4"
        onMouseMove={(e) => {
          if (isDragging) {
            const newWidth = Math.max(350, Math.min(800, e.clientX));
            setSidebarWidth(newWidth);
          }
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        
        {/* Left Panel: Assigned Incidents */}
        <div 
          style={{ width: window.innerWidth >= 768 ? sidebarWidth : '100%' }}
          className="w-full md:w-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 flex flex-col z-10 shadow-2xl shrink-0 overflow-y-auto styled-scrollbar relative rounded-3xl"
        >
          {/* Drag Handle */}
          <div 
            className="hidden md:block absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 dark:hover:bg-cyan-600 transition-colors z-20"
            onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
          />
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              <h2 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                <Truck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> งานที่ได้รับมอบหมาย
              </h2>
              <span className="text-xs bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 px-3 py-1.5 rounded-full font-bold shadow-sm">
                {assignedIncidents.length} งานใหม่
              </span>
            </div>

            <div className="flex-1 space-y-3">
              {!myUnitId ? (
                <div className="flex flex-col items-center justify-center h-40 text-center p-6 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700/50">
                  <span className="text-2xl mb-2">⚠️</span>
                  <span className="font-bold">กรุณาเลือกประจำการหน่วยด้านบน</span>
                  <span className="text-xs mt-1 opacity-80">เพื่อดูงานที่ได้รับมอบหมายจากนรินทร</span>
                </div>
              ) : assignedIncidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center p-6 text-sm text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <CheckCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <span className="font-bold text-slate-400">ไม่มีเคสที่ได้รับมอบหมาย</span>
                </div>
              ) : (
                assignedIncidents.map(inc => {
                  const colorConfig = TRIAGE_COLORS[(inc.triage_level as TriageColorKey)] || TRIAGE_COLORS['Green'];
                  const timeString = new Date(inc.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={inc.id} className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-5 rounded-3xl border-2 shadow-lg flex flex-col gap-3 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:${colorConfig.glow} active:scale-[0.98] ${colorConfig.border}`}>
                      
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2.5 py-1 rounded font-black text-white shadow-sm uppercase tracking-wider ${colorConfig.bgSolid}`}>
                            {colorConfig.emoji} {colorConfig.label}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5"/> {timeString}
                        </span>
                      </div>
                      
                      <IncidentTitle name={inc.name} />
                      
                      {/* Details Grid */}
                      <div className="grid grid-cols-1 gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl mt-1 border border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest"><MapPin className="w-3.5 h-3.5 text-indigo-500"/> สถานที่เกิดเหตุ</span>
                          <span className="text-base font-bold text-slate-900 dark:text-slate-100">{inc.location_text || 'ไม่ระบุพิกัด'}</span>
                        </div>
                        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div>
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest"><PhoneCall className="w-3.5 h-3.5 text-green-500"/> ข้อมูลผู้แจ้ง</span>
                            <span className="text-base font-bold text-slate-900 dark:text-slate-100">{inc.caller_phone} {inc.caller_name ? `(${inc.caller_name})` : ''}</span>
                          </div>
                        </div>
                      </div>

                      {/* Patient Info */}
                      <div className="text-sm text-slate-700 dark:text-slate-300 font-medium px-1 mt-1">
                        <span className="font-black text-slate-900 dark:text-slate-100">ผู้ป่วย:</span> {inc.patient_gender} {inc.patient_age ? `${inc.patient_age} ปี` : ''} 
                        {inc.patient_condition && <span className="block mt-1.5 text-red-600 dark:text-red-400"><span className="font-black">โรคประจำตัว:</span> {inc.patient_condition}</span>}
                      </div>

                      {/* Triage Checklist */}
                      {inc.triage_checklist && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-800/50 mt-1">
                          <span className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1.5 mb-1 tracking-widest"><Activity className="w-3.5 h-3.5"/> สรุปอาการ (Triage Checklist)</span>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{inc.triage_checklist}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button 
                          onClick={() => setSelectedIncident(inc)}
                          className="flex-1 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-xl text-sm font-black transition-all duration-300 flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-95"
                        >
                          <FileText className="w-5 h-5"/> รายละเอียด
                        </button>
                        <button 
                          onClick={() => openConfirm('จบงาน', 'ยืนยันว่าจบงาน (ผู้ป่วยถึงโรงพยาบาลแล้ว) ใช่หรือไม่?', 'ยืนยันจบงาน', 'success', () => handleUpdateIncidentStatus(inc.id, 'resolved'))}
                          className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-400 text-white hover:from-green-600 hover:to-green-500 rounded-xl text-sm font-black transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-green-500/40 hover:-translate-y-1 active:scale-95"
                        >
                          <CheckCircle className="w-5 h-5" /> จบงาน
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Map & Hospital Stats */}
        <div className="flex-1 flex flex-col relative z-0 min-h-0 bg-slate-200 dark:bg-slate-900">
          
          <div className="flex-1 relative">
            {loadingMap && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
              </div>
            )}
            
            <MapContainer center={[6.54, 101.28]} zoom={12} className="w-full h-full" zoomControl={true}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles" />
              
              {/* Hospitals */}
              {hospitals.map(h => (
                <Marker key={`${h.id}-${h.er_status}`} position={[h.lat, h.lng]} icon={createMarkerIcon(h.er_status)}>
                  <Tooltip direction="top" offset={[0, -20]} opacity={1} className="custom-tooltip">
                    <div className="font-sans min-w-[200px]">
                      <h3 className="font-bold text-base border-b border-slate-200 dark:border-slate-600 pb-1 mb-1 text-blue-600 dark:text-blue-400">{h.hospital_name}</h3>
                      <div className="grid grid-cols-2 gap-1 text-xs mb-1">
                        <div className="font-semibold">ER:</div><div className={`font-bold ${h.er_status==='Critical'?'text-red-500':'text-green-500'}`}>{h.er_status}</div>
                        <div className="font-semibold">เตียง/ICU:</div><div>{h.bed_empty} / {h.icu_empty}</div>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500 mt-1 mb-0.5">คลังเลือด (ยูนิต):</div>
                      <div className="grid grid-cols-4 gap-1">
                        <BloodBadge label="A" count={h.blood_a} />
                        <BloodBadge label="B" count={h.blood_b} />
                        <BloodBadge label="O" count={h.blood_o} />
                        <BloodBadge label="AB" count={h.blood_ab} />
                      </div>
                    </div>
                  </Tooltip>
                </Marker>
              ))}

              {/* Rescue Units (Mock + Real) */}
              {rescueUnits.concat(MOCK_AMBULANCES as any)
                .filter(amb => myUnitId ? amb.id === myUnitId : true)
                .map((amb, index) => {
                // Offset ambulances slightly radially to prevent overlapping with hospitals
                const radius = 0.0015;
                const angle = index * (Math.PI / 2); // spread them out if multiple
                const latOffset = radius * Math.cos(angle);
                const lngOffset = radius * Math.sin(angle);
                const displayLat = amb.lat + latOffset;
                const displayLng = amb.lng + lngOffset;

                return (
                  <Marker key={`${amb.id}-${amb.status}`} position={[displayLat, displayLng]} icon={createAmbulanceIcon(amb.status)}>
                    <Popup className="custom-popup"><div className="font-bold text-xs">{amb.name}</div></Popup>
                  </Marker>
                );
              })}

              {/* Incidents Markers */}
              {assignedIncidents.map(inc => {
                if (inc.lat && inc.lng) {
                  return (
                    <Marker key={inc.id} position={[inc.lat, inc.lng]} icon={createIncidentIcon(inc.triage_level)}>
                      <Popup className="custom-popup">
                        <div className="font-bold text-sm text-slate-800">{inc.location_text || 'จุดเกิดเหตุ'}</div>
                        <div className="text-xs text-slate-500 mt-1 truncate max-w-[150px]">{inc.name}</div>
                      </Popup>
                    </Marker>
                  );
                }
                return null;
              })}
            </MapContainer>

            {/* Floating Toggle Button */}
            <button
              onClick={() => setHospitalPanelOpen(prev => !prev)}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-6 py-3 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:border-cyan-400 dark:hover:border-cyan-500 transition-all duration-300 active:scale-95 group"
            >
              <Activity className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span className="text-sm font-black">สถานะโรงพยาบาล</span>
              {hospitals.some(h => h.er_status === 'Critical') && (
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" />
              )}
              {hospitalPanelOpen
                ? <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                : <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
              }
            </button>
          </div>

          {/* Bottom Panel - Collapsible */}
          <div
            className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-col styled-scrollbar shrink-0 overflow-hidden shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.1)]"
            style={{
              maxHeight: hospitalPanelOpen ? '50vh' : '0px',
              transition: 'max-height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div className="overflow-y-auto styled-scrollbar p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-black text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-600 dark:text-cyan-400"/> ภาพรวมสถานะโรงพยาบาล
                </h2>
                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold shadow-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Data Live
                </span>
              </div>
              
              <div className="flex overflow-x-auto pb-2 gap-4 snap-x styled-scrollbar">
                {hospitals.map(h => (
                  <div key={h.id} className="min-w-[280px] w-[80vw] md:w-[320px] snap-center bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0 transition-transform hover:-translate-y-1">
                    <div className="flex justify-between items-center mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h3 className="font-black text-blue-700 dark:text-blue-400 text-base truncate pr-2">{h.hospital_name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-md font-bold shadow-sm uppercase tracking-wide ${h.er_status==='Critical'?'bg-red-500 text-white':'bg-green-500 text-white'}`}>{h.er_status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-2 text-center shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">เตียงว่าง</p>
                        <p className="text-lg font-black text-slate-700 dark:text-slate-200">{h.bed_empty}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-2 text-center shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">ICU</p>
                        <p className={`text-lg font-black ${h.icu_empty===0?'text-red-500':'text-slate-700 dark:text-slate-200'}`}>{h.icu_empty}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-2 text-center shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">OR ว่าง</p>
                        <p className="text-lg font-black text-slate-700 dark:text-slate-200">{h.or_available}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                      <BloodBadge label="A" count={h.blood_a} />
                      <BloodBadge label="B" count={h.blood_b} />
                      <BloodBadge label="O" count={h.blood_o} />
                      <BloodBadge label="AB" count={h.blood_ab} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Custom Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeConfirm}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-700 transform transition-all duration-200 scale-100">
            <h3 className={`text-xl font-black mb-2 flex items-center gap-2 ${confirmDialog.type === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>
              {confirmDialog.type === 'danger' ? <ShieldAlert className="w-6 h-6" /> : <CheckCircle className="w-6 h-6 text-green-500" />}
              {confirmDialog.title}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-6 mt-3 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={closeConfirm}
                className="flex-1 py-2.5 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors shadow-sm"
              >
                ย้อนกลับ
              </button>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  closeConfirm();
                }}
                className={`flex-1 py-2.5 rounded-lg font-bold text-white transition-all shadow-md ${
                  confirmDialog.type === 'danger' 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' 
                    : 'bg-green-600 hover:bg-green-700 shadow-green-600/30'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Details Modal */}
      {selectedIncident && (
        <IncidentDetailsModal 
          incident={selectedIncident} 
          unitName={rescueUnits.find(u => u.id === selectedIncident.assigned_unit_id)?.name}
          onClose={() => setSelectedIncident(null)} 
        />
      )}

      {/* Max Vehicles Modal */}
      {maxVehicleModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMaxVehicleModal({...maxVehicleModal, isOpen: false})}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-700 transform transition-all duration-200 scale-100 flex flex-col items-center">
            
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <Settings className="w-6 h-6 animate-[spin_3s_linear_infinite]" />
            </div>
            
            <h3 className="text-xl font-black mb-1 text-slate-800 dark:text-white text-center">
              ตั้งค่ารถกู้ภัยสูงสุด
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-6 text-center">
              {maxVehicleModal.unitName}
            </p>
            
            <div className="w-full mb-6">
              <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest text-center">ระบุจำนวนรถกู้ภัยทั้งหมดที่มี</label>
              <input 
                type="number" 
                min="0"
                value={maxVehicleModal.maxVal} 
                onChange={(e) => setMaxVehicleModal({...maxVehicleModal, maxVal: e.target.value})} 
                className="w-full bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-3xl font-black text-center text-indigo-600 dark:text-indigo-400 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setMaxVehicleModal({...maxVehicleModal, isOpen: false})}
                className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors shadow-sm"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSaveMaxVehicles}
                className="flex-1 py-3.5 rounded-xl font-bold text-white transition-all shadow-lg shadow-indigo-500/30 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`html.dark .map-tiles { filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7); }`}</style>
    </div>
  );
}
