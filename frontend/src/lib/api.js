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
  budget: () => get("/budget"),
  health: () => get("/health"),
  forecast: (period = 24) => get(`/forecast?period=${period}`),
  goals: () => get("/goals"),
  createGoal: (goal) => post("/goals", goal),
  deleteGoal: (goalName) => request(`/goals/${encodeURIComponent(goalName)}`, { method: "DELETE" }),
  investments: () => get("/investments"),
  debt: () => get("/debt"),
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
};
