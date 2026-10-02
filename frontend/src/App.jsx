import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { useAuth } from "./context/AuthContext";

const PageFallback = () => (
  <div className="loading-overlay" style={{ minHeight: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
    Loading view...
  </div>
);

// Auth pages
const Login = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.Login })));
const Register = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.Register })));
const ForgotPassword = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.ForgotPassword })));
const OAuthCallback = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.OAuthCallback })));

// Overview pages
const Dashboard = lazy(() => import("./pages/OverviewPages").then((m) => ({ default: m.Dashboard })));
const FinancialTwin = lazy(() => import("./pages/OverviewPages").then((m) => ({ default: m.FinancialTwin })));
const Help = lazy(() => import("./pages/OverviewPages").then((m) => ({ default: m.Help })));
const MyMoney = lazy(() => import("./pages/OverviewPages").then((m) => ({ default: m.MyMoney })));

// Account pages
const Profile = lazy(() => import("./pages/AccountPages").then((m) => ({ default: m.Profile })));
const SettingsPage = lazy(() => import("./pages/AccountPages").then((m) => ({ default: m.SettingsPage })));

// Money pages
const Transactions = lazy(() => import("./pages/MoneyPages").then((m) => ({ default: m.Transactions })));
const Budget = lazy(() => import("./pages/MoneyPages").then((m) => ({ default: m.Budget })));
const Goals = lazy(() => import("./pages/MoneyPages").then((m) => ({ default: m.Goals })));
const Investments = lazy(() => import("./pages/MoneyPages").then((m) => ({ default: m.Investments })));
const Debt = lazy(() => import("./pages/MoneyPages").then((m) => ({ default: m.Debt })));

// Intelligence pages
const Health = lazy(() => import("./pages/IntelligencePages").then((m) => ({ default: m.Health })));
const Forecast = lazy(() => import("./pages/IntelligencePages").then((m) => ({ default: m.Forecast })));
const Copilot = lazy(() => import("./pages/IntelligencePages").then((m) => ({ default: m.Copilot })));
const Insights = lazy(() => import("./pages/IntelligencePages").then((m) => ({ default: m.Insights })));
const Timeline = lazy(() => import("./pages/IntelligencePages").then((m) => ({ default: m.Timeline })));
const Reports = lazy(() => import("./pages/IntelligencePages").then((m) => ({ default: m.Reports })));

// Simulator & AI
const Simulator = lazy(() => import("./pages/SimulatorPages").then((m) => ({ default: m.Simulator })));
const ScenarioHistory = lazy(() => import("./pages/SimulatorPages").then((m) => ({ default: m.ScenarioHistory })));
const AiInsights = lazy(() => import("./pages/AiInsightsPage").then((m) => ({ default: m.AiInsights })));

function ProtectedRoute() {
  const { authReady, isAuthenticated } = useAuth();
  if (!authReady) return <div className="loading-overlay">Checking secure session...</div>;
  return isAuthenticated ? <AppShell /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/financial-twin" element={<FinancialTwin />} />
          <Route path="/my-money" element={<MyMoney />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/health" element={<Health />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/debt" element={<Debt />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/simulator/history" element={<ScenarioHistory />} />
          <Route path="/copilot" element={<Copilot />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/ai" element={<AiInsights />} />
          <Route path="/help" element={<Help />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
