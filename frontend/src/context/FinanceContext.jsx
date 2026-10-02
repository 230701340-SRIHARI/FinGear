import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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

  const userRef = useRef(user);
  userRef.current = user;

  const dataRef = useRef(data);
  dataRef.current = data;

  const refresh = useCallback(async (scope = "all") => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      // Tier 1: Core financial state (instant UI readiness)
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
        api.recurringTransactions().catch(() => ({ recurring: [] })),
      ]);

      const currentUser = userRef.current;
      const profile = {
        ...rawProfile,
        name: (currentUser?.name && rawProfile?.name === "Arjun Verma") ? currentUser.name : (rawProfile?.name || currentUser?.name || "Client"),
        email: (currentUser?.email && rawProfile?.email === "arjun.verma@example.com") ? currentUser.email : (rawProfile?.email || currentUser?.email || ""),
      };

      setData((current) => ({
        ...current,
        profile,
        dashboard,
        transactions,
        budget,
        health,
        forecast,
        goals,
        investments,
        debt,
        recurring,
      }));

      // Immediate readiness for user
      setLoading(false);

      // Tier 2: Secondary / background intelligence (lazy, non-blocking)
      if (scope === "all") {
        Promise.all([
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
        ]).then(([
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
        ]) => {
          setData((current) => ({
            ...current,
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
          }));
        });
      }
    } catch (err) {
      console.error("Finance refresh error:", err);
      const msg = String(err?.message || err).toLowerCase();
      if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("token")) {
        setError("Session expired or unauthorized. Please log in again.");
      } else {
        setError("Backend unavailable. Local sample data remains visible.");
      }
      const currentUser = userRef.current;
      setData((current) => ({
        ...current,
        profile: {
          ...(current.profile || demoProfile),
          name: currentUser?.name || current.profile?.name || "Client",
          email: currentUser?.email || current.profile?.email || "",
        },
      }));
      setLoading(false);
    }
  }, [token]);

  const saveProfile = useCallback(async (profile) => {
    const currentUser = userRef.current;
    const payload = {
      ...profile,
      name: (currentUser?.name && profile.name === "Arjun Verma") ? currentUser.name : (profile.name || currentUser?.name || "Client"),
      email: (currentUser?.email && profile.email === "arjun.verma@example.com") ? currentUser.email : (profile.email || currentUser?.email || ""),
    };
    try {
      const updated = await api.updateProfile(payload);
      setData((current) => ({ ...current, profile: updated || payload }));
    } catch {
      setData((current) => ({ ...current, profile: payload }));
    }
    await refresh();
  }, [refresh]);

  const addTransaction = useCallback(async (transaction) => {
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

      // Optimistically update dashboard KPIs so runway and net worth update with 0ms latency
      let updatedDashboard = current.dashboard;
      if (updatedDashboard?.kpis) {
        const expList = prof.detailed_expenses?.length ? prof.detailed_expenses : (prof.monthly_expenses || []);
        let expTotal = expList.reduce((acc, item) => acc + (Number(item?.amount) || 0), 0);
        if (expTotal <= 0 && Number(prof.monthly_income) > 0) {
          expTotal = Number(prof.monthly_income) * 0.70;
        }
        const debtEmi = Number(prof.monthly_debt_payment) || 0;
        const burn = Math.max(expTotal + debtEmi, 1);
        const runway = (Number(prof.emergency_fund || 0) / burn).toFixed(1);
        const runwayTone = Number(runway) >= 6.0 ? "success" : (Number(runway) >= 3.0 ? "info" : "warning");
        const runwayDetail = Number(runway) >= 6.0 ? "Target reached (6+ mos)" : (Number(runway) >= 3.0 ? "Target is 6 months" : "Below 3-mo benchmark");

        const updatedKpis = updatedDashboard.kpis.map((kpi) => {
          if (kpi.label?.toLowerCase().includes("runway")) {
            return { ...kpi, value: `${runway} months`, detail: runwayDetail, tone: runwayTone };
          }
          return kpi;
        });
        updatedDashboard = { ...updatedDashboard, kpis: updatedKpis };
      }

      return {
        ...current,
        profile: prof,
        dashboard: updatedDashboard,
        transactions: {
          ...current.transactions,
          transactions: newTxns
        }
      };
    });

    // 2. Persist to backend and synchronize
    const created = await api.createTransaction(transaction);
    await refresh("core");
    return created; // caller can inspect created.anomaly_flag
  }, [refresh]);

  const deleteTransaction = useCallback(async (id) => {
    setError("");
    try {
      await api.deleteTransaction(id);
      await refresh("core");
    } catch (err) {
      setError(err.message || "Could not delete this transaction.");
    }
  }, [refresh]);

  const deleteSimulation = useCallback(async (id) => {
    setError("");
    try {
      await api.deleteSimulation(id);
      await refresh("core");
    } catch (err) {
      setError(err.message || "Could not delete this simulation.");
    }
  }, [refresh]);

  const addGoal = useCallback(async (goal) => {
    setError("");
    const created = await api.createGoal(goal);
    setData((current) => ({
      ...current,
      goals: { goals: created.goals, analysis: created.analysis },
      profile: { ...current.profile, goals: created.goals },
    }));
    await refresh("core");
    return created;
  }, [refresh]);

  const updateGoal = useCallback(async (goalName, goal) => {
    setError("");
    const updated = await api.updateGoal(goalName, goal);
    setData((current) => ({
      ...current,
      goals: { goals: updated.goals, analysis: updated.analysis },
      profile: { ...current.profile, goals: updated.goals },
    }));
    await refresh("core");
    return updated;
  }, [refresh]);

  const deleteGoal = useCallback(async (goalName) => {
    setError("");
    try {
      const result = await api.deleteGoal(goalName);
      setData((current) => ({
        ...current,
        goals: { goals: result.goals, analysis: result.analysis },
        profile: { ...current.profile, goals: result.goals },
      }));
      await refresh("core");
    } catch (err) {
      setError(err.message || "Could not delete this goal.");
    }
  }, [refresh]);

  const fetchForecast = useCallback(async (period) => {
    try {
      const forecastData = await api.forecast(period);
      setData((current) => ({
        ...current,
        forecast: forecastData
      }));
    } catch (err) {
      console.error("Failed to fetch forecast:", err);
    }
  }, []);

  const runSimulation = useCallback(async (scenario) => {
    const result = await api.simulate(dataRef.current.profile, scenario);
    await refresh();
    return result;
  }, [refresh]);

  const askCopilot = useCallback(async (question) => {
    return api.copilot(question, dataRef.current.profile);
  }, []);

  const acknowledgeAnomaly = useCallback(async (txnId) => {
    setError("");
    try {
      await api.ai.acknowledge(txnId);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not acknowledge anomaly.");
    }
  }, [refresh]);

  const excludeAnomaly = useCallback(async (txnId) => {
    setError("");
    try {
      await api.ai.exclude(txnId);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not exclude anomaly.");
    }
  }, [refresh]);

  const resetAI = useCallback(async () => {
    setError("");
    try {
      await api.ai.reset();
      await refresh();
    } catch (err) {
      setError(err.message || "Could not reset AI engine.");
    }
  }, [refresh]);

  const restoreTransaction = useCallback(async (id) => {
    setError("");
    try {
      await api.restoreTransaction(id);
      await refresh("core");
    } catch (err) {
      setError(err.message || "Could not restore this transaction.");
    }
  }, [refresh]);

  const updateIncomeSuite = useCallback(async (amount, applyToAllMonths) => {
    setError("");
    try {
      await api.updateIncomeSuite({ amount, apply_to_all_months: applyToAllMonths });
      await refresh("core");
    } catch (err) {
      setError(err.message || "Could not update income suite.");
    }
  }, [refresh]);

  const updateBudgets = useCallback(async (items) => {
    setError("");
    try {
      await api.updateBudgets(items);
      await refresh("core");
    } catch (err) {
      setError(err.message || "Could not update budgets.");
    }
  }, [refresh]);

  const addRecurringTransaction = useCallback(async (item) => {
    setError("");
    try {
      await api.createRecurringTransaction(item);
      await refresh("core");
    } catch (err) {
      setError(err.message || "Could not create recurring transaction.");
    }
  }, [refresh]);

  const updateRecurringTransaction = useCallback(async (id, item) => {
    setError("");
    try {
      await api.updateRecurringTransaction(id, item);
      await refresh("core");
    } catch (err) {
      setError(err.message || "Could not update recurring transaction.");
    }
  }, [refresh]);

  const deleteRecurringTransaction = useCallback(async (id) => {
    setError("");
    try {
      await api.deleteRecurringTransaction(id);
      await refresh("core");
    } catch (err) {
      setError(err.message || "Could not delete recurring transaction.");
    }
  }, [refresh]);

  const processRecurring = useCallback(async () => {
    try {
      await api.processRecurringTransactions();
      await refresh("core");
    } catch (err) {
      console.error("Failed to process recurring transactions:", err);
    }
  }, [refresh]);

  const uploadBill = useCallback(async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.uploadBill(formData);
  }, []);

  const fetchDeletedTransactions = useCallback(async () => {
    try {
      const res = await api.deletedTransactions();
      return res.deleted_transactions || [];
    } catch {
      return [];
    }
  }, []);

  const addDebt = useCallback(async (debt) => {
    setError("");
    try {
      await api.addDebt(debt);
      await refresh("core");
    } catch (err) {
      setError(err.message || "Could not add debt obligation.");
      throw err;
    }
  }, [refresh]);

  const updateDebt = useCallback(async (id, debt) => {
    setError("");
    try {
      await api.updateDebt(id, debt);
      await refresh("core");
    } catch (err) {
      setError(err.message || "Could not update debt obligation.");
      throw err;
    }
  }, [refresh]);

  const deleteDebt = useCallback(async (id) => {
    setError("");
    try {
      await api.deleteDebt(id);
      await refresh("core");
    } catch (err) {
      setError(err.message || "Could not delete debt obligation.");
      throw err;
    }
  }, [refresh]);

  const payDebtEmi = useCallback(async (id, payload = {}) => {
    setError("");
    try {
      const res = await api.payDebtEmi(id, payload);
      await refresh("core");
      return res;
    } catch (err) {
      setError(err.message || "Could not record monthly EMI payment.");
      throw err;
    }
  }, [refresh]);

  const prepayDebt = useCallback(async (id, amount, strategy = "reduce_tenure") => {
    setError("");
    try {
      const res = await api.prepayDebt(id, amount, strategy);
      await refresh("core");
      return res;
    } catch (err) {
      setError(err.message || "Could not apply debt prepayment.");
      throw err;
    }
  }, [refresh]);

  const processMonthlyDebts = useCallback(async () => {
    try {
      const res = await api.processMonthlyDebts();
      await refresh("core");
      return res;
    } catch (err) {
      console.error("Failed to process monthly debts:", err);
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
      payDebtEmi,
      prepayDebt,
      processMonthlyDebts,
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
    [
      data,
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
      payDebtEmi,
      prepayDebt,
      processMonthlyDebts,
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
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  return useContext(FinanceContext);
}
