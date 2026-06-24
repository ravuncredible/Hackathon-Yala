import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ShieldAlert, Activity } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import RescueDashboard from './pages/RescueDashboard';
import HospitalMock from './pages/HospitalMock';
import NotFound from './pages/NotFound';
import ThemeToggle from './components/ThemeToggle';

function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <h1 className="text-4xl md:text-5xl font-black mb-4 text-blue-700 dark:text-blue-400 text-center tracking-tight">Yala Hackathon</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-10 font-semibold text-center text-lg max-w-xl">
        National Medical Resource Exchange & Command System
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Rescue Dashboard */}
        <Link to="/rescue" className="bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-500 transition-all cursor-pointer flex flex-col items-center group shadow-xl hover:shadow-2xl hover:-translate-y-1">
          <div className="w-20 h-20 bg-cyan-100 dark:bg-cyan-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
            <ShieldAlert className="w-10 h-10 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center">Rescue Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 text-center text-sm font-medium">รวมหน้าศูนย์บัญชาการ (แผนที่) และหน้าประเมินผู้ป่วย (AI Triage) สำหรับกู้ภัย</p>
        </Link>

        {/* Hospital Agents */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-700 flex flex-col items-center shadow-xl hover:shadow-2xl transition-all">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <Activity className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center">Hospital Agents</h2>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-8 text-sm font-medium">ระบบจำลองการอัปเดตข้อมูลเตียงและทรัพยากรจากฝั่งโรงพยาบาล</p>
          <div className="flex gap-4 w-full">
            <Link to="/hospital/A" className="flex-1 text-center bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700 dark:bg-slate-700 dark:text-white dark:hover:bg-blue-600 py-3 rounded-xl font-bold transition active:scale-95 shadow-sm border border-slate-200 dark:border-transparent">รพ.ยะลา</Link>
            <Link to="/hospital/B" className="flex-1 text-center bg-slate-100 text-slate-700 hover:bg-green-100 hover:text-green-700 dark:bg-slate-700 dark:text-white dark:hover:bg-green-600 py-3 rounded-xl font-bold transition active:scale-95 shadow-sm border border-slate-200 dark:border-transparent">รพ.เบตง</Link>
          </div>
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
          <Route path="/rescue" element={<RescueDashboard />} />
          <Route path="/hospital/:id" element={<HospitalMock />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
