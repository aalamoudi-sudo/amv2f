import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '../components/shared/StateBlocks';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: ''
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Application error boundary captured an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-command-bg p-6" dir="rtl" lang="ar">
          <div className="w-full max-w-xl">
            <ErrorState
              title="حدث خطأ في واجهة التشغيل"
              message={this.state.message || 'أعد تحميل التطبيق أو راجع سجل الأخطاء.'}
              action={
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="command-button border-command-severity-critical/70 bg-command-severity-critical/10 text-command-severity-critical"
                >
                  إعادة تحميل
                </button>
              }
            />
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
