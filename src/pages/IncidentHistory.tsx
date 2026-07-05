import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Search, Filter, Calendar, Phone, Activity, Car, FileText, Download, Loader2 } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import IncidentDetailsModal from '../components/IncidentDetailsModal';

type Incident = {
  id: string;
  name: string;
  caller_name: string;
  caller_phone: string;
  location_text: string;
  triage_level: string;
  assigned_unit_id: string;
  status: string;
  created_at: string;
};

type RescueUnit = {
  id: string;
  name: string;
};

export default function IncidentHistory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialUnitId = searchParams.get('unitId') || 'all';
  const isRescueMode = !!searchParams.get('unitId');

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [units, setUnits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>(initialUnitId);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    // Fetch units for mapping ID to Name
    const { data: unitsData } = await supabase.from('rescue_units').select('id, name');
    if (unitsData) {
      const unitMap: Record<string, string> = {};
      unitsData.forEach(u => unitMap[u.id] = u.name);
      setUnits(unitMap);
    }

    // Fetch history incidents
    const { data: incidentsData, error } = await supabase
      .from('incidents')
      .select('*')
      .in('status', ['resolved', 'cancelled'])
      .order('created_at', { ascending: false });
    
    if (incidentsData) {
      setIncidents(incidentsData);
    }
    setLoading(false);
  }

  // Derived state: filtered incidents
  const filteredIncidents = incidents.filter(inc => {
    // Search
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = 
      (inc.caller_phone && inc.caller_phone.includes(searchLower)) ||
      (inc.name && inc.name.toLowerCase().includes(searchLower)) ||
      (inc.caller_name && inc.caller_name.toLowerCase().includes(searchLower));
    
    // Status
    const matchStatus = filterStatus === 'all' || inc.status === filterStatus;
    
    // Unit
    const matchUnit = filterUnit === 'all' || inc.assigned_unit_id === filterUnit;

    // Date Range (simple string comparison works for ISO dates usually, but let's be careful)
    let matchDate = true;
    if (dateFrom || dateTo) {
      const incDate = inc.created_at ? new Date(inc.created_at) : null;
      if (incDate) {
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (incDate < from) matchDate = false;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (incDate > to) matchDate = false;
        }
      }
    }

    return matchSearch && matchStatus && matchUnit && matchDate;
  });

  const getTriageBadge = (level: string) => {
    switch (level) {
      case 'Red': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold border border-red-200">🔴 แดง</span>;
      case 'Yellow': return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold border border-yellow-200">🟡 เหลือง</span>;
      case 'Green': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold border border-green-200">🟢 เขียว</span>;
      case 'White': return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">⚪ ทั่วไป</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">{level}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'resolved') return <span className="text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"/> จบงานแล้ว</span>;
    if (status === 'cancelled') return <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"/> ยกเลิก</span>;
    return <span className="text-slate-500">{status}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-900 bg-slate-100 dark:bg-slate-700 p-2 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-500" /> ประวัติการแจ้งเหตุ (Incident History)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">รายงานเคสย้อนหลังทั้งหมดของศูนย์ปฏิบัติการ</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Filters Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">ค้นหา</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="เบอร์โทร, ชื่อผู้แจ้ง, รายละเอียดเคส..." 
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          
          <div className="w-40">
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">วันที่ (ตั้งแต่)</label>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium" />
          </div>
          <div className="w-40">
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">วันที่ (ถึง)</label>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium" />
          </div>

          <div className="w-48">
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">สถานะเคส</label>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium">
              <option value="all">ทั้งหมด (All)</option>
              <option value="resolved">จบงานแล้ว (Resolved)</option>
              <option value="cancelled">ยกเลิก (Cancelled)</option>
            </select>
          </div>

          {!isRescueMode && (
            <div className="w-48">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">หน่วยกู้ภัยที่รับผิดชอบ</label>
              <select value={filterUnit} onChange={e=>setFilterUnit(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium">
                <option value="all">ทุกหน่วย (All)</option>
                {Object.entries(units).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-500/5 border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto styled-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">วันเวลาที่รับแจ้ง</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">รายละเอียดเคส</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">ผู้แจ้ง / เบอร์โทร</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">ระดับความรุนแรง</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">หน่วยที่รับผิดชอบ</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">สถานะ</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                      ไม่พบประวัติที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map(inc => (
                    <tr key={inc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 align-top">
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {inc.created_at ? new Date(inc.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3"/> {inc.created_at ? new Date(inc.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.' : ''}
                        </div>
                      </td>
                      <td className="p-4 align-top max-w-[250px]">
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                          {inc.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 truncate" title={inc.location_text}>
                          📍 {inc.location_text || 'ไม่ได้ระบุสถานที่'}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {inc.caller_name || 'ไม่ระบุชื่อ'}
                        </div>
                        {inc.caller_phone && (
                          <div className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1">
                            <Phone className="w-3 h-3"/> {inc.caller_phone}
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-top">
                        {getTriageBadge(inc.triage_level)}
                      </td>
                      <td className="p-4 align-top">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-indigo-400" />
                          {units[inc.assigned_unit_id] || 'ไม่ทราบหน่วย'}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        {getStatusBadge(inc.status)}
                      </td>
                      <td className="p-4 align-top text-center">
                        <button 
                          onClick={() => setSelectedIncident(inc)}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors group relative inline-flex items-center justify-center"
                          title="ดูรายละเอียด"
                        >
                          <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center text-sm">
            <div className="font-bold text-slate-500">
              แสดงทั้งหมด <span className="text-indigo-600 dark:text-indigo-400">{filteredIncidents.length}</span> รายการ
            </div>
            {/* Optional Export Button for future */}
            {/* <button className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-50">
              <Download className="w-3 h-3"/> Export CSV
            </button> */}
          </div>
        </div>

      </main>

      {/* Incident Details Modal */}
      {selectedIncident && (
        <IncidentDetailsModal 
          incident={selectedIncident} 
          unitName={units[selectedIncident.assigned_unit_id]}
          onClose={() => setSelectedIncident(null)} 
        />
      )}

    </div>
  );
}
