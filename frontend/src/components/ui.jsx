import { Loader2 } from "lucide-react";
import { cx } from "../lib/format";

export function Card({ className, children, glow = false }) {
  return <section className={cx("glass-card", glow && "glow-card", className)}>{children}</section>;
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button className={cx("btn", `btn-${variant}`, className)} {...props}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "info" }) {
  return <span className={cx("badge", `badge-${tone}`)}>{children}</span>;
}

export function MetricCard({ icon, label, value, detail, tone = "info" }) {
  return (
    <Card className={cx("metric-card", `metric-${tone}`)}>
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </Card>
  );
}

export function Progress({ value, tone = "success" }) {
  return (
    <div className="progress">
      <span className={`progress-fill progress-${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Skeleton({ rows = 3 }) {
  return (
    <div className="skeleton-stack">
      {Array.from({ length: rows }).map((_, index) => (
        <span className="skeleton" key={index} />
      ))}
    </div>
  );
}

export function EmptyState({ title, detail, action }) {
  return (
    <Card className="empty-state">
      <strong>{title}</strong>
      <p>{detail}</p>
      {action}
    </Card>
  );
}

export function LoadingState({ label = "Loading financial model" }) {
  return (
    <div className="loading-state">
      <Loader2 className="spin" size={18} />
      {label}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
