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
  goals: { goals: [], analysis: [] },
  investments: { items: [], allocation: [], total: 0, monthly_contribution: 0 },
  debt: { items: [], total: 0, monthly_emi: 0, debt_to_income: 0 },
  insights: { insights: [] },
  timeline: { events: [] },
  reports: { reports: [] },
  settings: null,
  security: null,
  scenarioHistory: { history: [] },
  copilotContext: { conversations: [] },
  aiStatus: null,
  aiForecast: null,
  aiAnomalies: { anomalies: [], count: 0 },
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
        aiStatus,
        aiForecast,
        aiAnomalies,
      ] = await Promise.all([
        api.profile().catch(() => demoProfile),
        api.dashboard().catch(() => null),
        api.transactions().catch(() => ({ transactions: [], summary: { income: 0, expenses: 0, net: 0 } })),
        api.budget().catch(() => ({ items: [], coach: {}, income: 0, planned: 0, actual: 0, remaining: 0 })),
        api.health().catch(() => null),
        api.forecast(24).catch(() => ({ months: [], mode: "Baseline projection", assumptions: {}, metrics: {} })),
        api.goals().catch(() => ({ goals: [], analysis: [] })),
        api.investments().catch(() => ({ items: [], allocation: [], total: 0, monthly_contribution: 0 })),
        api.debt().catch(() => ({ items: [], total: 0, monthly_emi: 0, debt_to_income: 0 })),
        api.insights().catch(() => ({ insights: [] })),
        api.timeline().catch(() => ({ events: [] })),
        api.reports().catch(() => ({ reports: [] })),
        api.settings().catch(() => null),
        api.security().catch(() => null),
        api.simulationHistory().catch(() => ({ history: [] })),
        api.copilotContext().catch(() => ({ conversations: [] })),
        api.ai.status().catch(() => null),
        api.ai.forecast().catch(() => null),
        api.ai.anomalies().catch(() => ({ anomalies: [], count: 0 })),
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
        aiStatus,
        aiForecast,
        aiAnomalies,
      });
    } catch (err) {
      console.error("Finance refresh error:", err);
      const msg = String(err?.message || err).toLowerCase();
      if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("token")) {
        setError("Session expired or unauthorized. Please log in again.");
      } else {
        setError("Backend unavailable. Local sample data remains visible.");
      }
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

  async function updateGoal(goalName, goal) {
    setError("");
    const updated = await api.updateGoal(goalName, goal);
    setData((current) => ({
      ...current,
      goals: { goals: updated.goals, analysis: updated.analysis },
      profile: { ...current.profile, goals: updated.goals },
    }));
    await refresh();
    return updated;
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

  async function acknowledgeAnomaly(txnId) {
    setError("");
    try {
      await api.ai.acknowledge(txnId);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not acknowledge anomaly.");
    }
  }

  async function excludeAnomaly(txnId) {
    setError("");
    try {
      await api.ai.exclude(txnId);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not exclude anomaly.");
    }
  }

  async function resetAI() {
    setError("");
    try {
      await api.ai.reset();
      await refresh();
    } catch (err) {
      setError(err.message || "Could not reset AI engine.");
    }
  }

  async function restoreTransaction(id) {
    setError("");
    try {
      await api.restoreTransaction(id);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not restore this transaction.");
    }
  }

  async function updateIncomeSuite(amount, applyToAllMonths) {
    setError("");
    try {
      await api.updateIncomeSuite({ amount, apply_to_all_months: applyToAllMonths });
      await refresh();
    } catch (err) {
      setError(err.message || "Could not update income suite.");
    }
  }

  async function uploadBill(file) {
    const formData = new FormData();
    formData.append("file", file);
    return api.uploadBill(formData);
  }

  async function fetchDeletedTransactions() {
    try {
      const res = await api.deletedTransactions();
      return res.deleted_transactions || [];
    } catch {
      return [];
    }
  }

  useEffect(() => {
    refresh();
  }, [token]);

  const value = useMemo(
    () => ({
      ...data,
      loading,
      error,
      refresh,
      saveProfile,
      addTransaction,
      deleteTransaction,
      restoreTransaction,
      updateIncomeSuite,
      uploadBill,
      fetchDeletedTransactions,
      deleteSimulation,
      addGoal,
      updateGoal,
      deleteGoal,
      fetchForecast,
      runSimulation,
      askCopilot,
      acknowledgeAnomaly,
      excludeAnomaly,
      resetAI,
    }),
    [data, loading, error]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  return useContext(FinanceContext);
}
