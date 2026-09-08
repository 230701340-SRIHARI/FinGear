import { LogOut, Menu, Search, Sparkles, X, Landmark, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFinance } from "../../context/FinanceContext";
import { MenuOverlay } from "./MenuOverlay";
import { ErrorBoundary } from "../ErrorBoundary";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/financial-twin": "Financial Twin",
  "/my-money": "My Money",
  "/profile": "Profile",
  "/transactions": "Transactions",
  "/budget": "Budget",
  "/health": "Financial Health",
  "/forecast": "Forecast",
  "/goals": "Goals",
  "/investments": "Investments",
  "/debt": "Debt",
  "/simulator": "What-if Simulator",
  "/simulator/history": "Scenario History",
  "/copilot": "AI Copilot",
  "/insights": "AI Insights",
  "/timeline": "Financial Timeline",
  "/reports": "Reports",
  "/settings": "Settings",
  "/help": "Help",
};

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { error } = useFinance();
  const location = useLocation();
  const currentPage = PAGE_TITLES[location.pathname] || "Dashboard";

  return (
    <div className="product-shell">
      <header className="top-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle Menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/" className="brand-line" style={{ textDecoration: 'none' }}>
            <div className="brand-orb"><Landmark size={18} /></div>
            <span style={{ display: 'inline-block' }}>FinGear</span>
          </Link>
          <div className="page-breadcrumb">
            <ChevronRight size={14} />
            <strong>{currentPage}</strong>
          </div>
        </div>
        
        <div className="search-box">
          <Search size={16} />
          <input type="text" placeholder="Search modules…" style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: 0, minHeight: 'auto', outline: 'none', color: 'inherit', flex: 1 }} />
        </div>
        
        <div className="top-actions">
          <Link to="/profile" className="user-chip" style={{ textDecoration: 'none', cursor: 'pointer' }} title="View Profile">
            <span>{user?.name?.slice(0, 1) || "U"}</span>
            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{user?.name || "User"}</strong>
          </Link>
          <button className="icon-button" aria-label="Logout" onClick={logout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {menuOpen && <MenuOverlay onClose={() => setMenuOpen(false)} />}

      {error && <div className="global-error"><Sparkles size={16} /> {error}</div>}

      {/* Hidden SVG Filters for Color Blindness Accessibility */}
      <svg style={{ display: 'none' }} aria-hidden="true">
        <filter id="protanopia-filter">
          <feColorMatrix type="matrix" values="0.56667, 0.43333, 0.00000, 0, 0   0.55833, 0.44167, 0.00000, 0, 0   0.00000, 0.24167, 0.75833, 0, 0   0, 0, 0, 1, 0" />
        </filter>
        <filter id="deuteranopia-filter">
          <feColorMatrix type="matrix" values="0.625, 0.375, 0.0, 0, 0   0.7, 0.3, 0.0, 0, 0   0.0, 0.3, 0.7, 0, 0   0, 0, 0, 1, 0" />
        </filter>
        <filter id="tritanopia-filter">
          <feColorMatrix type="matrix" values="0.95, 0.05, 0.0, 0, 0   0.0, 0.433, 0.567, 0, 0   0.0, 0.475, 0.525, 0, 0   0, 0, 0, 1, 0" />
        </filter>
      </svg>

      <section className="page-stage">
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </section>
    </div>
  );
}
