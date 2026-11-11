// Screen crash guard (DESIGN-v14 §1): one broken tab shows a message + Reload instead of a blank page. Resets when resetKey (the tab) changes.
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { resetKey: string; children: ReactNode }
interface State { failed: boolean; key: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, key: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Screen crashed", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flag warn" role="alert">
        <strong>Something broke on this tab.</strong>
        <div><button type="button" className="k-btn" onClick={() => window.location.reload()}>Reload</button></div>
      </div>
    );
  }
}
