import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-8 transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 max-w-md text-center space-y-4 shadow-xl">
        <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-yellow-600 dark:text-yellow-500" />
        </div>
        <h1 className="text-5xl font-black text-slate-800 dark:text-white">404</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">ไม่พบหน้าที่คุณต้องการ หรือลิงก์อาจเสียหาย</p>
        <Link
          to="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg mt-4"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}
