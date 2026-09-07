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
  recurring: { recurring: [] },
};

export function FinanceProvider({ children }) {
  const { token, user } = useAuth();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [
        rawProfile,
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
        recurring,
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
        api.recurringTransactions().catch(() => ({ recurring: [] })),
      ]);

      const profile = {
        ...rawProfile,
        name: (user?.name && rawProfile?.name === "Arjun Verma") ? user.name : (rawProfile?.name || user?.name || "Client"),
        email: (user?.email && rawProfile?.email === "arjun.verma@example.com") ? user.email : (rawProfile?.email || user?.email || ""),
      };

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
        recurring,
      });
    } catch (err) {
      console.error("Finance refresh error:", err);
      const msg = String(err?.message || err).toLowerCase();
      if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("token")) {
        setError("Session expired or unauthorized. Please log in again.");
      } else {
        setError("Backend unavailable. Local sample data remains visible.");
      }
      setData((current) => ({
        ...current,
        profile: {
          ...(current.profile || demoProfile),
          name: user?.name || current.profile?.name || "Client",
          email: user?.email || current.profile?.email || "",
        },
      }));
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(profile) {
    const payload = {
      ...profile,
      name: (user?.name && profile.name === "Arjun Verma") ? user.name : (profile.name || user?.name || "Client"),
      email: (user?.email && profile.email === "arjun.verma@example.com") ? user.email : (profile.email || user?.email || ""),
    };
    const updated = await api.updateProfile(payload);
    setData((current) => ({ ...current, profile: updated }));
    await refresh();
  }

  async function addTransaction(transaction) {
    // 1. Instant optimistic asset & ledger update for 0ms reactivity
    const amount = Number(transaction.amount) || 0;
    const cat = transaction.category;
    setData((current) => {
      const prof = { ...(current.profile || demoProfile) };
      if (cat === "Emergency Fund") {
        prof.emergency_fund = (prof.emergency_fund || 0) + amount;
        prof.savings_balance = (prof.savings_balance || 0) + amount;
      } else if (cat === "Fixed Deposit" || cat === "FD") {
        prof.fixed_deposits = (prof.fixed_deposits || 0) + amount;
        prof.savings_balance = (prof.savings_balance || 0) + amount;
      } else if (cat === "Mutual Funds" || cat === "SIP") {
        prof.mutual_funds = (prof.mutual_funds || 0) + amount;
        prof.investments_balance = (prof.investments_balance || 0) + amount;
      } else if (cat === "Stocks" || cat === "Equity") {
        prof.stocks = (prof.stocks || 0) + amount;
        prof.investments_balance = (prof.investments_balance || 0) + amount;
      } else if (cat === "Gold") {
        prof.gold = (prof.gold || 0) + amount;
        prof.investments_balance = (prof.investments_balance || 0) + amount;
      } else if (cat === "Provident Fund" || cat === "PPF" || cat === "EPF") {
        prof.provident_fund = (prof.provident_fund || 0) + amount;
        prof.investments_balance = (prof.investments_balance || 0) + amount;
      } else if (cat === "Extra Loan Repayment" || cat === "Extra Debt Prepayment") {
        prof.total_debt = Math.max(0, (prof.total_debt || 0) - amount);
      } else if (cat === "Savings") {
        prof.savings_balance = (prof.savings_balance || 0) + amount;
        prof.emergency_fund = (prof.emergency_fund || 0) + amount;
      }
      const newTxns = [
        { id: "temp-" + Date.now(), ...transaction, amount },
        ...(current.transactions?.transactions || [])
      ];
      return {
        ...current,
        profile: prof,
        transactions: {
          ...current.transactions,
          transactions: newTxns
        }
      };
    });

    // 2. Persist to backend and synchronize
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

  async function updateBudgets(items) {
    setError("");
    try {
      await api.updateBudgets(items);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not update budgets.");
    }
  }

  async function addRecurringTransaction(item) {
    setError("");
    try {
      await api.createRecurringTransaction(item);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not create recurring transaction.");
    }
  }

  async function updateRecurringTransaction(id, item) {
    setError("");
    try {
      await api.updateRecurringTransaction(id, item);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not update recurring transaction.");
    }
  }

  async function deleteRecurringTransaction(id) {
    setError("");
    try {
      await api.deleteRecurringTransaction(id);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not delete recurring transaction.");
    }
  }

  async function processRecurring() {
    try {
      await api.processRecurringTransactions();
      await refresh();
    } catch (err) {
      console.error("Failed to process recurring transactions:", err);
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

  async function addDebt(debt) {
    setError("");
    try {
      await api.addDebt(debt);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not add debt obligation.");
      throw err;
    }
  }

  async function updateDebt(id, debt) {
    setError("");
    try {
      await api.updateDebt(id, debt);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not update debt obligation.");
      throw err;
    }
  }

  async function deleteDebt(id) {
    setError("");
    try {
      await api.deleteDebt(id);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not delete debt obligation.");
      throw err;
    }
  }

  async function prepayDebt(id, amount) {
    setError("");
    try {
      const res = await api.prepayDebt(id, amount);
      await refresh();
      return res;
    } catch (err) {
      setError(err.message || "Could not apply debt prepayment.");
      throw err;
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
      updateBudgets,
      uploadBill,
      fetchDeletedTransactions,
      deleteSimulation,
      addGoal,
      updateGoal,
      deleteGoal,
      addDebt,
      updateDebt,
      deleteDebt,
      prepayDebt,
      fetchForecast,
      runSimulation,
      askCopilot,
      acknowledgeAnomaly,
      excludeAnomaly,
      resetAI,
      addRecurringTransaction,
      updateRecurringTransaction,
      deleteRecurringTransaction,
      processRecurring,
    }),
    [data, loading, error]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  return useContext(FinanceContext);
}
