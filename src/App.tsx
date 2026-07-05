import { HashRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Activity, AlertTriangle, Plus, Clock, Siren, PhoneCall, Truck } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import RescueDashboard from './pages/RescueDashboard';
import HospitalMock from './pages/HospitalMock';
import IncidentCreate from './pages/IncidentCreate';
import NotFound from './pages/NotFound';
import NarinthornCommand from './pages/NarinthornCommand';
import IncidentHistory from './pages/IncidentHistory';

function Home() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F19] relative overflow-hidden text-slate-100 p-4 transition-colors font-sans selection:bg-indigo-500/30">
      
      {/* Impeccable Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]"></div>
        <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[150px] mix-blend-screen animate-[pulse_10s_ease-in-out_infinite_reverse]"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[100px] mix-blend-screen animate-[pulse_12s_ease-in-out_infinite]"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiLz4KPHBhdGggZD0iTTAgMEw4IDhaTTAgOEw4IDBaIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B0F19]/50 to-[#0B0F19]"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        {/* Hero Section */}
        <div className="mb-14 text-center transform hover:scale-105 transition-transform duration-500 cursor-default">
          <div className="relative w-24 h-24 mx-auto mb-8 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-3xl rotate-3 group-hover:rotate-6 transition-transform duration-300 opacity-70 blur-lg"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-3xl -rotate-3 group-hover:-rotate-6 transition-transform duration-300 opacity-70 blur-lg"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-rose-400 to-red-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-500/50 border border-white/20 backdrop-blur-xl">
              <Siren className="w-12 h-12 text-white drop-shadow-md group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-300 tracking-widest uppercase">System Online</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 drop-shadow-lg">
              Disaster 
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400 drop-shadow-lg ml-3">
              Medical
            </span>
          </h1>
          <h2 className="text-xl md:text-3xl font-bold text-slate-300/80 mb-4 tracking-wide font-light">
            Integrated Dispatch System
          </h2>
          <p className="text-slate-400 font-medium text-sm md:text-base max-w-lg mx-auto leading-relaxed">
            ระบบเชื่อมโยงศูนย์สั่งการนรินทรกับเครือข่ายกู้ภัยแบบบูรณาการ
            <br className="hidden md:block" />
            ลดเวลาประสานงาน ทะลวงขีดจำกัดด้วยข้อมูล Real-time
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-10 px-4">
          
          {/* Narinthorn Command Center */}
          <button 
            onClick={() => navigate('/narinthorn')}
            className="group relative bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 hover:border-rose-500/50 backdrop-blur-2xl p-8 rounded-[2rem] transition-all duration-500 cursor-pointer flex flex-col items-center shadow-2xl hover:shadow-rose-500/20 hover:-translate-y-2 overflow-hidden text-left md:text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-rose-500/30 transition-all duration-500 relative z-10 shadow-inner">
              <PhoneCall className="w-10 h-10 text-rose-400 group-hover:text-rose-300 transition-colors" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3 relative z-10 tracking-wide">ศูนย์สั่งการนรินทร</h3>
            <p className="text-slate-400 text-sm font-medium relative z-10 leading-relaxed max-w-[250px]">
              รับแจ้งเหตุจากประชาชน ประเมินสถานการณ์ (Triage) และสั่งการหน่วยกู้ภัยด้วยความแม่นยำสูง
            </p>
          </button>

          {/* Rescue Unit */}
          <button 
            onClick={() => navigate('/rescue')}
            className="group relative bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 hover:border-cyan-500/50 backdrop-blur-2xl p-8 rounded-[2rem] transition-all duration-500 cursor-pointer flex flex-col items-center shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-2 overflow-hidden text-left md:text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-cyan-500/30 transition-all duration-500 relative z-10 shadow-inner">
              <Truck className="w-10 h-10 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3 relative z-10 tracking-wide">หน่วยกู้ภัย (ภาคสนาม)</h3>
            <p className="text-slate-400 text-sm font-medium relative z-10 leading-relaxed max-w-[250px]">
              รับภารกิจจากศูนย์ฯ แจ้งสถานะความพร้อม และอัปเดตอาการผู้ป่วยส่งตรงถึงห้องฉุกเฉิน
            </p>
          </button>

        </div>

        {/* Secondary Roles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full px-4 mb-10">
          <Link to="/hospital/A" className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-indigo-500/40 backdrop-blur-xl p-5 rounded-2xl transition-all duration-300 flex items-center gap-5 shadow-lg">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all border border-indigo-500/20">
              <Activity className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-200 group-hover:text-white transition-colors">ระบบจัดการโรงพยาบาล</h3>
              <p className="text-slate-500 text-xs font-medium mt-0.5">ER Monitor & Resource Prediction</p>
            </div>
          </Link>
          <Link to="/incident/new" className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-amber-500/40 backdrop-blur-xl p-5 rounded-2xl transition-all duration-300 flex items-center gap-5 shadow-lg">
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500/20 transition-all border border-amber-500/20">
              <Plus className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-200 group-hover:text-white transition-colors">แอปรายงานเหตุภัยพิบัติ</h3>
              <p className="text-slate-500 text-xs font-medium mt-0.5">ระบบรับแจ้งเหตุฉุกเฉินสำหรับประชาชน</p>
            </div>
          </Link>
        </div>

        {/* Footer tag */}
        <div className="flex flex-col items-center gap-2 text-slate-500/60 font-medium text-xs tracking-wider">
          <p>YALA HACKATHON 2026</p>
          <div className="w-12 h-px bg-slate-700/50"></div>
          <p>POWERED BY IMPRESSIVE DESIGN</p>
        </div>
      </div>
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

