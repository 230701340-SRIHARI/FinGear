import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { useAuth } from "./context/AuthContext";
import { Login, Register, ForgotPassword, OAuthCallback } from "./pages/AuthPages";
import { Dashboard, FinancialTwin, Help, MyMoney } from "./pages/OverviewPages";
import { Profile, SettingsPage } from "./pages/AccountPages";
import { Transactions, Budget, Goals, Investments, Debt } from "./pages/MoneyPages";
import { Health, Forecast, Copilot, Insights, Timeline, Reports } from "./pages/IntelligencePages";
import { Simulator, ScenarioHistory } from "./pages/SimulatorPages";

function ProtectedRoute() {
  const { authReady, isAuthenticated } = useAuth();
  if (!authReady) return <div className="loading-overlay">Checking secure session...</div>;
  return isAuthenticated ? <AppShell /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
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
        <Route path="/help" element={<Help />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
