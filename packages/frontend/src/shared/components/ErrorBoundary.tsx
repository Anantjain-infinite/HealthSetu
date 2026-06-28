/**
 * @file src/shared/components/ErrorBoundary.tsx
 * @description React class-based error boundary.
 * Catches JavaScript errors in the component tree below it,
 * logs them, and displays a fallback UI instead of a blank screen.
 *
 * Wrap top-level route components with this to prevent one feature's
 * error from crashing the entire application.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children:  ReactNode;
  /** Optional custom fallback — defaults to the built-in error card */
  fallback?: ReactNode;
}

interface State {
  hasError:   boolean;
  error:      Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // In production you'd send this to an error monitoring service (Sentry etc.)
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-4">
              <AlertTriangle className="text-red-500" size={28} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              An unexpected error occurred. Your data is safe — please try refreshing.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-gray-50 text-gray-600 rounded-lg p-3 mb-6 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="
                  flex items-center gap-2 px-4 py-2 rounded-lg
                  bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  transition-colors
                "
              >
                <RefreshCw size={14} />
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="
                  px-4 py-2 rounded-lg border border-gray-300
                  text-gray-700 text-sm font-medium hover:bg-gray-50
                  focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
                  transition-colors
                "
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
