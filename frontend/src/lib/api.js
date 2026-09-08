export const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export function apiUrl(path) {
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}

function authHeaders(tokenOverride) {
  const token = tokenOverride || localStorage.getItem("fingear_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const { authToken, ...fetchOptions } = options;
  const response = await fetch(apiUrl(path), {
    credentials: "same-origin",
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(authToken),
      ...(fetchOptions.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }

  return response.json();
}

const get = (path, options) => request(path, options);
const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });
const put = (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) });

export const api = {
  auth: {
    login: (payload) => post("/auth/login", payload),
    register: (payload) => post("/auth/register", payload),
    me: (token) => get("/auth/me", token ? { authToken: token } : undefined),
    googleStatus: () => get("/auth/google/status"),
  },
  dashboard: () => get("/dashboard"),
  profile: () => get("/profile"),
  updateProfile: (profile) => put("/profile", profile),
  transactions: () => get("/transactions"),
  createTransaction: (transaction) => post("/transactions", transaction),
  deleteTransaction: (id) => request(`/transactions/${encodeURIComponent(id)}`, { method: "DELETE" }),
  deletedTransactions: () => get("/transactions/deleted/list"),
  restoreTransaction: (id) => post(`/transactions/${encodeURIComponent(id)}/restore`),
  updateIncomeSuite: (payload) => post("/transactions/income-suite", payload),
  recurringTransactions: () => get("/transactions/recurring"),
  createRecurringTransaction: (item) => post("/transactions/recurring", item),
  updateRecurringTransaction: (id, item) => put(`/transactions/recurring/${encodeURIComponent(id)}`, item),
  deleteRecurringTransaction: (id) => request(`/transactions/recurring/${encodeURIComponent(id)}`, { method: "DELETE" }),
  processRecurringTransactions: () => post("/transactions/recurring/process"),
  uploadBill: async (formData) => {
    const token = localStorage.getItem("fingear_token");
    const response = await fetch(apiUrl("/transactions/upload-bill"), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) throw new Error("File upload failed");
    return response.json();
  },
  uploadTransactionBill: async (transactionId, formData) => {
    const token = localStorage.getItem("fingear_token");
    const response = await fetch(apiUrl(`/transactions/${encodeURIComponent(transactionId)}/bill`), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) throw new Error("Transaction bill upload failed");
    return response.json();
  },
  getTransactionBill: (transactionId) => get(`/transactions/${encodeURIComponent(transactionId)}/bill`),
  deleteTransactionBill: (transactionId) => request(`/transactions/${encodeURIComponent(transactionId)}/bill`, { method: "DELETE" }),
  budget: () => get("/budget"),
  updateBudgets: (items) => post("/budget", { items }),
  health: () => get("/health"),
  forecast: (period = 24) => get(`/forecast?period=${period}`),
  goals: () => get("/goals"),
  createGoal: (goal) => post("/goals", goal),
  updateGoal: (goalName, goal) => put(`/goals/${encodeURIComponent(goalName)}`, goal),
  deleteGoal: (goalName) => request(`/goals/${encodeURIComponent(goalName)}`, { method: "DELETE" }),
  investments: () => get("/investments"),
  debt: () => get("/debt"),
  addDebt: (payload) => post("/debt", payload),
  updateDebt: (id, payload) => put(`/debt/${id}`, payload),
  deleteDebt: (id) => request(`/debt/${id}`, { method: "DELETE" }),
  payDebtEmi: (id, payload = {}) => post(`/debt/${id}/pay-emi`, payload),
  prepayDebt: (id, amount, strategy = "reduce_tenure") => post(`/debt/${id}/prepay`, { amount, strategy }),
  processMonthlyDebts: () => post("/debt/process-monthly"),
  simulate: (profile, scenario) => post("/simulator/run", { profile, scenario }),
  simulationHistory: () => get("/simulator/history"),
  deleteSimulation: (id) => request(`/simulator/history/${encodeURIComponent(id)}`, { method: "DELETE" }),
  copilot: (question, profile) => post("/copilot/chat", { question, profile }),
  copilotContext: () => get("/copilot/context"),
  insights: () => get("/insights"),
  timeline: () => get("/timeline"),
  reports: () => get("/reports"),
  settings: () => get("/settings"),
  security: () => get("/settings/security"),
  ai: {
    status: () => get("/ai/status"),
    forecast: () => get("/ai/forecast"),
    anomalies: () => get("/ai/anomalies"),
    acknowledge: (txnId) => post(`/ai/anomalies/${encodeURIComponent(txnId)}/acknowledge`),
    exclude: (txnId) => post(`/ai/anomalies/${encodeURIComponent(txnId)}/exclude`),
    weights: () => get("/ai/weights"),
    reset: () => request("/ai/reset", { method: "POST" }),
  },
};
