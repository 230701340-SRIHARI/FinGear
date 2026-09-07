import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
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

export function NumberInput({
  value,
  onChange,
  placeholder = "0",
  min,
  max,
  step,
  className = "",
  required = false,
  ...props
}) {
  const [localVal, setLocalVal] = useState(
    value === undefined || value === null ? "" : String(value)
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(value === undefined || value === null ? "" : String(value));
    }
  }, [value, isFocused]);

  return (
    <input
      type="number"
      className={className}
      value={isFocused ? localVal : (value === undefined || value === null ? "" : String(value))}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      required={required}
      onFocus={(e) => {
        setIsFocused(true);
        e.target.select();
      }}
      onBlur={(e) => {
        setIsFocused(false);
        const parsed = localVal === "" ? 0 : Number(localVal) || 0;
        if (onChange) onChange(parsed, e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setLocalVal(raw);
        const parsed = raw === "" ? 0 : Number(raw) || 0;
        if (onChange) onChange(parsed, e);
      }}
      {...props}
    />
  );
}

export function QuickLinks({ links = [] }) {
  return (
    <div className="quick-links">
      {links.map((link) => (
        <Link key={link.to} to={link.to} className="quick-link">
          {link.icon && <link.icon size={16} />}
          <div>
            <strong>{link.label}</strong>
            {link.detail && <span>{link.detail}</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function ConfirmModal({ isOpen, title = "Confirm Action", message = "Are you sure you want to delete this item?", onConfirm, onCancel, confirmText = "Delete" }) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <Card className="modal-card confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "var(--text-primary)" }}>{title}</h3>
        <p style={{ margin: "0 0 20px", fontSize: "14px", color: "var(--text-secondary)" }}>{message}</p>
        <div className="form-actions" style={{ justifyContent: "flex-end", gap: "10px" }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" style={{ background: "var(--accent-danger)", borderColor: "var(--accent-danger)" }} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
}

