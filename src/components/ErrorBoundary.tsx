import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-8">
          <div className="bg-slate-800 rounded-xl border border-red-500/30 p-8 max-w-md text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
            <h2 className="text-xl font-bold text-red-400">เกิดข้อผิดพลาด</h2>
            <p className="text-slate-400 text-sm">
              {this.state.error?.message || 'Something went wrong'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition active:scale-95"
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
