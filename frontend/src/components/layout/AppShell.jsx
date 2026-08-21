import { Bell, Menu, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFinance } from "../../context/FinanceContext";
import { Button, Badge } from "../ui";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { error, loading, refresh } = useFinance();

  return (
    <div className="product-shell">
      <Sidebar mobileOpen={open} onClose={() => setOpen(false)} />
      <div className="workspace">
        <header className="top-nav">
          <button className="icon-button mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div className="search-box">
            <Search size={17} />
            <span>Search financial modules, scenarios, insights...</span>
          </div>
          <div className="top-actions">
            <Badge tone="success">Local Account</Badge>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <Button variant="ghost" onClick={refresh} disabled={loading}>
              <RefreshCw size={16} /> Sync
            </Button>
            <div className="user-chip">
              <span>{user?.name?.slice(0, 1) || "U"}</span>
              <div>
                <strong>{user?.name || "User"}</strong>
                <small>Authenticated user</small>
              </div>
            </div>
            <Button variant="ghost" onClick={logout}>Logout</Button>
          </div>
        </header>

        {error && <div className="global-error"><Sparkles size={16} /> {error}</div>}

        <section className="page-stage">
          <Outlet />
        </section>
      </div>
      {open && <button className="drawer-scrim" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button>}
    </div>
  );
}
