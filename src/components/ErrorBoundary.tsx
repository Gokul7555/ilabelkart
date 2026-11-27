import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ErrorState } from './ui';

/** Keeps one broken screen from blanking the whole app. Reset by changing `resetKey` (e.g. route). */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Screen error', error, info.componentStack); }
  componentDidUpdate(prev: { resetKey?: string }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (this.state.error) {
      return (
        <div className="container"><div className="card">
          <ErrorState title="This screen couldn't load" onRetry={() => this.setState({ error: null })} />
          <div className="xs muted" style={{ textAlign: 'center', paddingBottom: 16 }}>If it keeps happening, use “Reset demo data” in the user menu.</div>
        </div></div>
      );
    }
    return this.props.children;
  }
}
