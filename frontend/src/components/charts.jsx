import { memo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { currency } from "../lib/format";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#eab308", "#06b6d4", "#8b5cf6", "#ec4899"];

const ASSET_CLASS_COLORS = {
  "mutual funds": "#3b82f6",          // Primary Blue
  "stocks": "#10b981",                // Emerald Green
  "stocks & equities": "#10b981",
  "equity": "#10b981",
  "fixed deposits & pf": "#f59e0b",   // Warm Amber
  "fixed deposits": "#f59e0b",
  "fixed deposit": "#f59e0b",
  "fd & debt": "#f59e0b",
  "fd": "#f59e0b",
  "debt": "#f59e0b",
  "gold & precious metals": "#eab308",// Golden Yellow
  "gold": "#eab308",
  "cash & liquid": "#06b6d4",         // Cyan Teal
  "cash": "#06b6d4",
  "liquid": "#06b6d4",
  "crypto & alternatives": "#8b5cf6", // Purple
  "crypto": "#8b5cf6",
  "real estate": "#ec4899",           // Pink
};

export function getAssetColor(name, index = 0) {
  if (!name) return COLORS[index % COLORS.length];
  const normalized = String(name).toLowerCase().trim();
  for (const [key, color] of Object.entries(ASSET_CLASS_COLORS)) {
    if (normalized === key || normalized.includes(key) || key.includes(normalized)) {
      return color;
    }
  }
  return COLORS[index % COLORS.length];
}

function useChartColors() {
  const isDark = document.documentElement.classList.contains("dark");
  return {
    grid: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    axis: isDark ? "#94a3b8" : "#6b7280",
    tooltip: {
      background: isDark ? "#1e293b" : "#ffffff",
      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
      color: isDark ? "#f1f5f9" : "#111827",
      borderRadius: "12px",
      boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.4)" : "0 4px 16px rgba(0,0,0,0.08)",
    },
    radialBg: isDark ? "#1e293b" : "#e5e7eb",
  };
}

export const NetWorthChart = memo(function NetWorthChart({ data = [] }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.32} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.04} />
          </linearGradient>
          <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.16} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis dataKey="month" stroke={c.axis} tick={{ fontSize: 12 }} />
        <YAxis stroke={c.axis} tick={{ fontSize: 12 }} tickFormatter={(v) => currency(v, true)} />
        <Tooltip contentStyle={c.tooltip} formatter={(v) => currency(v)} />
        <ReferenceLine y={0} stroke={c.axis} strokeDasharray="3 3" opacity={0.35} />
        <Legend
          payload={[
            { value: "Net worth", type: "line", id: "net_worth", color: "#3b82f6" },
            { value: "Savings", type: "line", id: "savings", color: "#10b981" },
          ]}
        />
        {/* Render Savings first so it renders in the background */}
        <Area
          type="monotone"
          dataKey="savings"
          name="Savings"
          stroke="#10b981"
          fill="url(#savingsGrad)"
          strokeWidth={2}
        />
        {/* Render Net Worth second so its blue line and area are painted on top */}
        <Area
          type="monotone"
          dataKey="net_worth"
          name="Net worth"
          stroke="#3b82f6"
          fill="url(#netWorthGrad)"
          strokeWidth={2.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

export const IncomeExpenseChart = memo(function IncomeExpenseChart({ data = [] }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis dataKey="month" stroke={c.axis} tick={{ fontSize: 12 }} />
        <YAxis stroke={c.axis} tick={{ fontSize: 12 }} tickFormatter={(v) => currency(v, true)} />
        <Tooltip contentStyle={c.tooltip} formatter={(v) => currency(v)} />
        <Legend />
        <Bar dataKey="income" name="Income" fill="#3b82f6" radius={[6, 6, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
});

export const AllocationChart = memo(function AllocationChart({ data = [] }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={270}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={4}>
          {data.map((entry, index) => (
            <Cell key={entry.name || index} fill={getAssetColor(entry.name, index)} />
          ))}
        </Pie>
        <Tooltip contentStyle={c.tooltip} formatter={(v) => currency(v)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
});

export const HealthTrendChart = memo(function HealthTrendChart({ data = [] }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis dataKey="month" stroke={c.axis} tick={{ fontSize: 12 }} />
        <YAxis stroke={c.axis} tick={{ fontSize: 12 }} domain={[0, 100]} />
        <Tooltip contentStyle={c.tooltip} />
        <Line type="monotone" dataKey="score" name="Score" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: "#8b5cf6" }} />
      </LineChart>
    </ResponsiveContainer>
  );
});

export const ScoreRadial = memo(function ScoreRadial({ value = 0 }) {
  const c = useChartColors();
  const fillColor = value >= 70 ? "#10b981" : value >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadialBarChart innerRadius="68%" outerRadius="100%" data={[{ value, fill: fillColor }]} startAngle={90} endAngle={-270}>
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar dataKey="value" cornerRadius={12} background={{ fill: c.radialBg }} angleAxisId={0} />
        <text x="50%" y="49%" textAnchor="middle" dominantBaseline="middle" className="radial-number">
          {value}
        </text>
        <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" className="radial-label">
          / 100
        </text>
      </RadialBarChart>
    </ResponsiveContainer>
  );
});

export const ScenarioBars = memo(function ScenarioBars({ data = [], result = null }) {
  const c = useChartColors();
  const [activeTab, setActiveTab] = useState("all");

  const healthCurrent = result?.base_score ?? data?.find((d) => d.type === "score" || d.label?.includes("Health"))?.current ?? 0;
  const healthSim = result?.simulated_score ?? data?.find((d) => d.type === "score" || d.label?.includes("Health"))?.simulated ?? 0;
  const healthDelta = healthSim - healthCurrent;

  const cashCurrent = result?.base_cash_flow ?? data?.find((d) => d.label?.includes("Cash"))?.rawCurrent ?? 0;
  const cashSim = result?.simulated_cash_flow ?? data?.find((d) => d.label?.includes("Cash"))?.rawSimulated ?? 0;
  const cashDelta = cashSim - cashCurrent;

  const netCurrent = result?.baseline_net_worth ?? data?.find((d) => d.label?.includes("Net"))?.rawCurrent ?? 0;
  const netSim = result?.projected_net_worth ?? data?.find((d) => d.label?.includes("Net"))?.rawSimulated ?? 0;
  const netDelta = netSim - netCurrent;

  const healthData = [
    { name: "Health Score", Current: healthCurrent, Simulated: healthSim }
  ];

  const cashData = [
    { name: "Monthly Cash Flow", Current: Math.round(cashCurrent), Simulated: Math.round(cashSim) }
  ];

  const netData = [
    { name: "Net Worth", "Current Baseline": Math.round(netCurrent), "12m Projected": Math.round(netSim) }
  ];

  const tabs = [
    { id: "all", label: "Overview" },
    { id: "health", label: "Health Score (0-100)" },
    { id: "cashflow", label: "Cash Flow (₹)" },
    { id: "networth", label: "Net Worth (₹)" },
  ];

  return (
    <div style={{ width: "100%" }}>
      {/* Metric Segmented Control */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: isActive ? 600 : 500,
                background: isActive ? "rgba(59, 130, 246, 0.18)" : "rgba(255, 255, 255, 0.04)",
                color: isActive ? "var(--accent, #3b82f6)" : "var(--text-muted, #94a3b8)",
                border: isActive ? "1px solid var(--accent, #3b82f6)" : "1px solid var(--border-color, rgba(255,255,255,0.08))",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "all" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", minHeight: "240px", justifyContent: "center" }}>
          {/* Health Score Row */}
          <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Financial Health</span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: healthDelta >= 0 ? "var(--accent-success)" : "var(--accent-warning)" }}>
                {healthDelta > 0 ? `+${healthDelta}` : healthDelta} pts
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ flex: 1, height: "14px", background: "rgba(255,255,255,0.06)", borderRadius: "7px", overflow: "hidden", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, Math.max(0, healthCurrent))}%`, background: "#94a3b8", opacity: 0.5, borderRadius: "7px" }} />
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, Math.max(0, healthSim))}%`, background: "#3b82f6", opacity: 0.85, borderRadius: "7px" }} />
              </div>
              <span style={{ fontSize: "12px", fontFamily: "monospace", minWidth: "90px", textAlign: "right" }}>
                {healthCurrent} → <strong style={{ color: "#3b82f6" }}>{healthSim}</strong> pts
              </span>
            </div>
          </div>

          {/* Monthly Cash Flow Row */}
          <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Monthly Cash Flow</span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: cashDelta >= 0 ? "var(--accent-success)" : "var(--accent-warning)" }}>
                {cashDelta > 0 ? `+${currency(cashDelta)}/mo` : cashDelta === 0 ? "No change" : `${currency(cashDelta)}/mo`}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "var(--text-muted)" }}>Current: <strong style={{ color: cashCurrent >= 0 ? "var(--text-primary)" : "var(--accent-warning)" }}>{currency(cashCurrent)}</strong></span>
              <span>Simulated: <strong style={{ color: cashSim >= 0 ? "var(--accent-success)" : "var(--accent-warning)" }}>{currency(cashSim)}</strong></span>
            </div>
          </div>

          {/* Net Worth Row */}
          <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>12-Month Net Worth</span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: netDelta >= 0 ? "var(--accent-success)" : "var(--accent-warning)" }}>
                {netDelta > 0 ? `+${currency(netDelta)}` : netDelta === 0 ? "Baseline maintained" : currency(netDelta)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "var(--text-muted)" }}>Baseline: <strong>{currency(netCurrent)}</strong></span>
              <span>Projected: <strong style={{ color: "var(--accent)" }}>{currency(netSim)}</strong></span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "health" && (
        <div style={{ height: "240px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={healthData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
              <XAxis dataKey="name" stroke={c.axis} tick={{ fontSize: 12 }} />
              <YAxis stroke={c.axis} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v} pts`} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={c.tooltip} formatter={(val) => [`${val} pts`]} />
              <Legend />
              <Bar dataKey="Current" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={60} />
              <Bar dataKey="Simulated" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === "cashflow" && (
        <div style={{ height: "240px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
              <XAxis dataKey="name" stroke={c.axis} tick={{ fontSize: 12 }} />
              <YAxis stroke={c.axis} tickFormatter={(v) => currency(v, true)} tick={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke={c.axis} strokeDasharray="3 3" />
              <Tooltip contentStyle={c.tooltip} formatter={(val) => [currency(val)]} />
              <Legend />
              <Bar dataKey="Current" fill="#94a3b8" maxBarSize={60} />
              <Bar dataKey="Simulated" fill="#3b82f6" maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === "networth" && (
        <div style={{ height: "240px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={netData} margin={{ top: 20, right: 30, left: 25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
              <XAxis dataKey="name" stroke={c.axis} tick={{ fontSize: 12 }} />
              <YAxis stroke={c.axis} tickFormatter={(v) => currency(v, true)} tick={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke={c.axis} strokeDasharray="3 3" />
              <Tooltip contentStyle={c.tooltip} formatter={(val, name) => [currency(val), name]} />
              <Legend />
              <Bar dataKey="Current Baseline" fill="#94a3b8" maxBarSize={60} />
              <Bar dataKey="12m Projected" fill="#3b82f6" maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});
