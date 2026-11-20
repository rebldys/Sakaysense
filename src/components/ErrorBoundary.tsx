import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SakaySense ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      let parsedDetail: { error?: string; operationType?: string; path?: string } | null = null;
      try {
        parsedDetail = JSON.parse(this.state.message);
      } catch {
        parsedDetail = null;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h1 className="text-lg font-bold text-[#0F1E36]">SakaySense Runtime Error</h1>
                <p className="text-sm text-slate-600 mt-1">
                  {parsedDetail?.error
                    ? `Firestore ${parsedDetail.operationType} on "${parsedDetail.path}": ${parsedDetail.error}`
                    : this.state.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F1E36] hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
