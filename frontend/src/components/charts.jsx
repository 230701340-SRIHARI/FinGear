import { memo } from "react";
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
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis dataKey="month" stroke={c.axis} tick={{ fontSize: 12 }} />
        <YAxis stroke={c.axis} tick={{ fontSize: 12 }} tickFormatter={(v) => currency(v, true)} />
        <Tooltip contentStyle={c.tooltip} formatter={(v) => currency(v)} />
        <Legend />
        <Area type="monotone" dataKey="net_worth" name="Net worth" stroke="#3b82f6" fill="rgba(59,130,246,0.15)" strokeWidth={2} />
        <Area type="monotone" dataKey="savings" name="Savings" stroke="#10b981" fill="rgba(16,185,129,0.12)" strokeWidth={2} />
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

export const ScenarioBars = memo(function ScenarioBars({ data }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis dataKey="label" stroke={c.axis} tick={{ fontSize: 12 }} />
        <YAxis stroke={c.axis} tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={c.tooltip} />
        <Legend />
        <Bar dataKey="current" name="Current" fill="#94a3b8" radius={[6, 6, 0, 0]} />
        <Bar dataKey="simulated" name="Simulated" fill="#3b82f6" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
});
