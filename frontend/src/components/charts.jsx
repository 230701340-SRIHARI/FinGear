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
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { currency } from "../lib/format";

const COLORS = ["#2dd4bf", "#38bdf8", "#a78bfa", "#fbbf24", "#34d399", "#fb7185"];

export function NetWorthChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.16)" />
        <XAxis dataKey="month" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" tickFormatter={(v) => currency(v, true)} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => currency(v)} />
        <Legend />
        <Area type="monotone" dataKey="net_worth" name="Net worth" stroke="#2dd4bf" fill="rgba(45,212,191,.24)" />
        <Area type="monotone" dataKey="savings" name="Savings" stroke="#38bdf8" fill="rgba(56,189,248,.16)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function IncomeExpenseChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.16)" />
        <XAxis dataKey="month" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" tickFormatter={(v) => currency(v, true)} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => currency(v)} />
        <Legend />
        <Bar dataKey="income" fill="#2dd4bf" radius={[8, 8, 0, 0]} />
        <Bar dataKey="expenses" fill="#f59e0b" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AllocationChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={3}>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => currency(v)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function HealthTrendChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.16)" />
        <XAxis dataKey="month" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" domain={[0, 100]} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={3} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ScoreRadial({ value = 0 }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadialBarChart innerRadius="68%" outerRadius="100%" data={[{ value, fill: "#2dd4bf" }]} startAngle={90} endAngle={-270}>
        <RadialBar dataKey="value" cornerRadius={12} background />
        <text x="50%" y="49%" textAnchor="middle" dominantBaseline="middle" className="radial-number">
          {value}
        </text>
        <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" className="radial-label">
          / 100
        </text>
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

export function ScenarioBars({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.16)" />
        <XAxis dataKey="label" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        <Bar dataKey="current" fill="#64748b" radius={[8, 8, 0, 0]} />
        <Bar dataKey="simulated" fill="#2dd4bf" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const tooltipStyle = {
  background: "#08111f",
  border: "1px solid rgba(148,163,184,.24)",
  borderRadius: "8px",
  color: "#e5f4ff",
};
