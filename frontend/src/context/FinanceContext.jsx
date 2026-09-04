import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { demoProfile } from "../lib/demoProfile";
import { useAuth } from "./AuthContext";

const FinanceContext = createContext(null);

const initialData = {
  profile: demoProfile,
  dashboard: null,
  transactions: { transactions: [], summary: { income: 0, expenses: 0, net: 0, by_category: [] } },
  budget: { items: [], coach: {}, income: 0, planned: 0, actual: 0, remaining: 0 },
  health: null,
  forecast: { months: [], mode: "Baseline projection", assumptions: {}, metrics: {} },
  goals: { goals: demoProfile.goals, analysis: [] },
  investments: { items: [], allocation: [], total: 0, monthly_contribution: 0 },
  debt: { items: [], total: 0, monthly_emi: 0, debt_to_income: 0 },
  insights: { insights: [
    {"severity": "success", "title": "Savings rate improved", "reason": "Current savings rate is 32%.", "impact": "More goal capacity", "action": "Keep automated savings active."},
    {"severity": "warning", "title": "Emergency fund below target", "reason": "Runway is 3.1 months.", "impact": "Reduced shock absorption", "action": "Prioritize emergency savings."},
    {"severity": "info", "title": "Investment consistency detected", "reason": "Monthly contributions are stable.", "impact": "Better long-term compounding", "action": "Review allocation quarterly."}
  ]},
  timeline: { events: [
    {"period": "This Month", "title": "Started car fund", "value": "₹12,000", "type": "Goal Creation"},
    {"period": "Last Month", "title": "Increased SIP", "value": "₹5,000", "type": "Investment"}
  ]},
  reports: { reports: [
    {"name": "Monthly Financial Report", "status": "Ready", "summary": "Income, expenses, cash flow and score breakdown."},
    {"name": "Financial Health Report", "status": "Ready", "summary": "Explainable component-level health assessment."},
    {"name": "Forecast Report", "status": "Ready", "summary": "Baseline projection using current behavior assumptions."},
    {"name": "PDF Export", "status": "Planned", "summary": "Export is documented as future work."}
  ]},
  settings: null,
  security: null,
  scenarioHistory: { history: [
    {"id": "1", "name": "Increase salary and SIP", "date": "Oct 12", "result": "Net worth +12%", "score": "+4"}
  ]},
  copilotContext: { conversations: [] },
};

export function FinanceProvider({ children }) {
  const { token } = useAuth();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [
        profile,
        dashboard,
        transactions,
        budget,
        health,
        forecast,
        goals,
        investments,
        debt,
        insights,
        timeline,
        reports,
        settings,
        security,
        scenarioHistory,
        copilotContext,
      ] = await Promise.all([
        api.profile(),
        api.dashboard(),
        api.transactions(),
        api.budget(),
        api.health(),
        api.forecast(24),
        api.goals(),
        api.investments(),
        api.debt(),
        api.insights(),
        api.timeline(),
        api.reports(),
        api.settings(),
        api.security(),
        api.simulationHistory(),
        api.copilotContext(),
      ]);
      setData({
        profile,
        dashboard,
        transactions,
        budget,
        health,
        forecast,
        goals,
        investments,
        debt,
        insights,
        timeline,
        reports,
        settings,
        security,
        scenarioHistory,
        copilotContext,
      });
    } catch {
      setError("Backend unavailable. Local sample data remains visible.");
      setData((current) => ({ ...current, profile: current.profile || demoProfile }));
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(profile) {
    const updated = await api.updateProfile(profile);
    setData((current) => ({ ...current, profile: updated }));
    await refresh();
  }

  async function addTransaction(transaction) {
    await api.createTransaction(transaction);
    await refresh();
  }

  async function deleteTransaction(id) {
    setError("");
    try {
      await api.deleteTransaction(id);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not delete this transaction.");
    }
  }

  async function deleteSimulation(id) {
    setError("");
    try {
      await api.deleteSimulation(id);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not delete this simulation.");
    }
  }

  async function addGoal(goal) {
    setError("");
    const created = await api.createGoal(goal);
    setData((current) => ({
      ...current,
      goals: { goals: created.goals, analysis: created.analysis },
      profile: { ...current.profile, goals: created.goals },
    }));
    await refresh();
    return created;
  }

  async function deleteGoal(goalName) {
    setError("");
    try {
      const result = await api.deleteGoal(goalName);
      setData((current) => ({
        ...current,
        goals: { goals: result.goals, analysis: result.analysis },
        profile: { ...current.profile, goals: result.goals },
      }));
      await refresh();
    } catch (err) {
      setError(err.message || "Could not delete this goal.");
    }
  }

  async function fetchForecast(period) {
    try {
      const forecastData = await api.forecast(period);
      setData((current) => ({
        ...current,
        forecast: forecastData
      }));
    } catch (err) {
      console.error("Failed to fetch forecast:", err);
    }
  }

  async function runSimulation(scenario) {
    const result = await api.simulate(data.profile, scenario);
    await refresh();
    return result;
  }

  async function askCopilot(question) {
    return api.copilot(question, data.profile);
  }

  useEffect(() => {
    refresh();
  }, [token]);

  const value = useMemo(
    () => ({ ...data, loading, error, refresh, saveProfile, addTransaction, deleteTransaction, deleteSimulation, addGoal, deleteGoal, fetchForecast, runSimulation, askCopilot }),
    [data, loading, error]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  return useContext(FinanceContext);
}
