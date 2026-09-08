import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button, Card } from "./ui";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/dashboard";
  };

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px 20px", maxWidth: "600px", margin: "40px auto", textAlign: "center" }}>
          <Card glow style={{ padding: "32px 24px" }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              color: "var(--accent-danger, #ef4444)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <AlertTriangle size={28} />
            </div>
            <h2 style={{ marginBottom: "8px", fontSize: "20px" }}>Something went wrong loading this section</h2>
            <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "14px", marginBottom: "20px" }}>
              {this.state.error?.message || "An unexpected error occurred while rendering this page."}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Button onClick={this.handleReload} variant="secondary">
                <RefreshCw size={16} /> Reload Page
              </Button>
              <Button onClick={this.handleReset}>
                <Home size={16} /> Back to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
