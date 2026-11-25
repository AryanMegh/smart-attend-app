import React from "react";

/** Last line of defence: a crash in any page shows a recoverable screen instead of a blank page. */
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[SmartAttend] UI crash:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
            Your attendance data is safe. Reload the page; if it happens again, clear the site data / hard-refresh (Ctrl+Shift+R) and tell your admin.
          </p>
          <pre style={{ textAlign: "left", fontSize: 11, background: "#f4f4f5", padding: 10, borderRadius: 8, overflow: "auto", maxHeight: 120 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 14, padding: "10px 18px", borderRadius: 10, border: 0, background: "#16a34a", color: "#fff", fontSize: 14 }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
