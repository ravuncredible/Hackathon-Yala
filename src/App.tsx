import { HashRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Activity, AlertTriangle, Plus, Clock, Siren, PhoneCall, Truck } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import RescueDashboard from './pages/RescueDashboard';
import HospitalMock from './pages/HospitalMock';
import IncidentCreate from './pages/IncidentCreate';
import NotFound from './pages/NotFound';
import NarinthornCommand from './pages/NarinthornCommand';
import IncidentHistory from './pages/IncidentHistory';
import ThemeToggle from './components/ThemeToggle';

function Home() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 text-slate-900 dark:text-slate-100 p-4 transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Hero Section */}
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-red-200 dark:shadow-red-900/30">
          <Siren className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 bg-clip-text text-transparent tracking-tighter drop-shadow-sm">
          Disaster Medical
        </h1>
        <h2 className="text-xl md:text-2xl font-bold text-slate-700 dark:text-slate-300 mb-2">
          Integrated Dispatch System
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm max-w-md mx-auto leading-relaxed">
          ระบบเชื่อมโยงศูนย์สั่งการนรินทรกับเครือข่ายกู้ภัย
          <br className="hidden md:block" />
          เพื่อลดเวลาประสานงานและส่งข้อมูลแบบ Real-time
        </p>
      </div>

      <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-widest">
        กรุณาเลือกบทบาทการใช้งาน
      </h3>

      {/* Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mb-8">
        
        {/* Narinthorn Command Center */}
        <button 
          onClick={() => navigate('/narinthorn')}
          className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-8 rounded-3xl border-2 border-white/50 dark:border-slate-700/50 hover:border-red-500 dark:hover:border-red-500 transition-all duration-300 cursor-pointer flex flex-col items-center group shadow-xl hover:shadow-2xl hover:shadow-red-500/20 hover:-translate-y-2 active:scale-95 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-bl-[100px] -z-0"></div>
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10 shadow-inner">
            <PhoneCall className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 relative z-10">ศูนย์สั่งการนรินทร</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center font-medium relative z-10">
            รับแจ้งเหตุจากประชาชน กรอกฟอร์ม Triage และสั่งการหน่วยกู้ภัย
          </p>
        </button>

        {/* Rescue Unit */}
        <button 
          onClick={() => navigate('/rescue')}
          className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-8 rounded-3xl border-2 border-white/50 dark:border-slate-700/50 hover:border-cyan-500 dark:hover:border-cyan-500 transition-all duration-300 cursor-pointer flex flex-col items-center group shadow-xl hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-2 active:scale-95 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-100 dark:bg-cyan-900/20 rounded-bl-[100px] -z-0"></div>
          <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/40 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10 shadow-inner">
            <Truck className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 relative z-10">หน่วยกู้ภัย (ภาคสนาม)</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center font-medium relative z-10">
            รับเคสจากนรินทร แจ้งสถานะรถ และอัปเดตอาการผู้ป่วย
          </p>
        </button>

      </div>

      {/* Secondary Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
        <Link to="/hospital/A" className="bg-white/60 dark:bg-slate-800/60 backdrop-blur p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-all flex items-center gap-4 group">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">โรงพยาบาลยะลา</h3>
            <p className="text-slate-400 text-xs">ระบบหลังบ้าน รพ.</p>
          </div>
        </Link>
        <Link to="/incident/new" className="bg-white/60 dark:bg-slate-800/60 backdrop-blur p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 transition-all flex items-center gap-4 group">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">สร้างเหตุภัยพิบัติ (เก่า)</h3>
            <p className="text-slate-400 text-xs">แอปรายงานสำหรับประชาชน</p>
          </div>
        </Link>
      </div>

      {/* Footer tag */}
      <p className="mt-8 text-xs text-slate-400 dark:text-slate-600 font-medium">
        Yala Hackathon 2026 — Disaster Theme 🏥
      </p>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/narinthorn" element={<NarinthornCommand />} />
          <Route path="/rescue" element={<RescueDashboard />} />
          <Route path="/history" element={<IncidentHistory />} />
          <Route path="/incident/new" element={<IncidentCreate />} />
          <Route path="/hospital/:id" element={<HospitalMock />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

