import {
  Activity,
  BadgeHelp,
  Banknote,
  BarChart3,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarClock,
  ChartNoAxesCombined,
  ChevronLeft,
  CircleDollarSign,
  CreditCard,
  FileText,
  Fingerprint,
  Gauge,
  Goal,
  History,
  Landmark,
  LineChart,
  LockKeyhole,
  PieChart,
  ReceiptText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  WalletCards,
  WalletMinimal,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cx } from "../../lib/format";

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
      { to: "/settings/security", label: "Security", icon: LockKeyhole },
      { to: "/help", label: "Help", icon: BadgeHelp },
    ],
  },
];

export function Sidebar({ mobileOpen, onClose }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={cx("side-nav", collapsed && "collapsed", mobileOpen && "mobile-open")}>
      <div className="brand-block">
        <div className="brand-orb"><Landmark size={22} /></div>
        <div>
          <strong>FinGear AI</strong>
          <span>AI Financial Intelligence</span>
        </div>
        <button className="collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label="Collapse sidebar">
          <ChevronLeft size={17} />
        </button>
      </div>

      <nav className="nav-groups">
        {groups.map((group) => (
          <section key={group.label}>
            <p>{group.label}</p>
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={onClose} title={collapsed ? item.label : undefined}>
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </section>
        ))}
      </nav>

      <div className="twin-status">
        <div><ShieldCheck size={17} /> <strong>Financial Twin Status</strong></div>
        <span><i /> Live</span>
        <small>Last synchronized: just now</small>
      </div>
    </aside>
  );
}
