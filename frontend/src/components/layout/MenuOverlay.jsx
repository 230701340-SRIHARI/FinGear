import { NavLink } from "react-router-dom";
import {
  Activity, BadgeHelp, Bot, BrainCircuit, CalendarClock,
  ChartNoAxesCombined, CircleDollarSign, Cpu, CreditCard, FileText,
  Gauge, Goal, History, Landmark, LineChart, PieChart,
  ReceiptText, Settings, SlidersHorizontal, UserRound, WalletMinimal
} from "lucide-react";

const groups = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: Gauge },
      { to: "/financial-twin", label: "Financial Twin", icon: BrainCircuit },
      { to: "/my-money", label: "My Money", icon: WalletMinimal },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/health", label: "Financial Health", icon: Activity },
      { to: "/forecast", label: "Forecast", icon: LineChart },
      { to: "/ai", label: "AI Engine", icon: Cpu },
      { to: "/insights", label: "AI Insights", icon: ChartNoAxesCombined },
      { to: "/copilot", label: "AI Copilot", icon: Bot },
    ],
  },
  {
    label: "Planning",
    items: [
      { to: "/goals", label: "Goals", icon: Goal },
      { to: "/budget", label: "Budget", icon: SlidersHorizontal },
      { to: "/investments", label: "Investments", icon: PieChart },
      { to: "/debt", label: "Debt", icon: CreditCard },
    ],
  },
  {
    label: "Decision Lab",
    items: [
      { to: "/simulator", label: "What-if Simulator", icon: CircleDollarSign },
      { to: "/simulator/history", label: "Scenario History", icon: History },
    ],
  },
  {
    label: "Analytics",
    items: [
      { to: "/reports", label: "Reports", icon: FileText },
      { to: "/timeline", label: "Financial Timeline", icon: CalendarClock },
      { to: "/transactions", label: "Transactions", icon: ReceiptText },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/profile", label: "Profile", icon: UserRound },
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/help", label: "Help", icon: BadgeHelp },
    ],
  },
];

export function MenuOverlay({ onClose }) {
  return (
    <div className="menu-overlay" onClick={onClose}>
      <div className="menu-grid" onClick={e => e.stopPropagation()}>
        {groups.map((group) => (
          <section key={group.label} className="menu-group">
            <p>{group.label}</p>
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} end onClick={onClose} className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
