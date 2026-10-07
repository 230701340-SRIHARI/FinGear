import { Activity, ArrowRight, Calculator, Calendar, Check, CheckCircle2, ChevronDown, ChevronUp, CircleDollarSign, Clock, CreditCard, FileText, FileUp, Filter, Goal as GoalIcon, HelpCircle, History, Info, Landmark, LineChart, MoreVertical, Pencil, Play, Plus, PlusCircle, Receipt, RefreshCw, RotateCcw, ShieldAlert, SlidersHorizontal, Sparkles, Trash, Trash2, TrendingDown, TrendingUp, UploadCloud, WalletCards, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AllocationChart, NetWorthChart, getAssetColor } from "../components/charts";
import { Badge, Button, Card, ConfirmModal, EmptyState, Field, MetricCard, NumberInput, PageHeader, Progress, QuickLinks } from "../components/ui";
import { useFinance } from "../context/FinanceContext";
import { canonicalCategory } from "../lib/categories";
import { currency, percent } from "../lib/format";

function defaultTargetDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 2);
  return date.toISOString().slice(0, 10);
}

const NEEDS_SET = new Set([
  "Housing", "Rent", "Groceries", "Utilities", "Healthcare", "Medicines",
  "Insurance", "Insurance Premium", "Education", "Transport", "Fuel", "Mandatory EMI", "EMI", "Bills"
]);
const SAVINGS_SET = new Set([
  "Investment", "Savings", "Emergency Fund", "FD", "Fixed Deposit",
  "SIP", "Mutual Funds", "Stocks", "Equity", "Gold", "PPF", "NPS",
  "Provident Fund", "Retirement", "Extra Loan Repayment", "Extra Debt Prepayment"
]);

function getCategoryTag(category, type) {
  if (type === "income") return { label: "Income", tone: "success" };
  if (SAVINGS_SET.has(category)) return { label: "Savings", tone: "success" };
  if (NEEDS_SET.has(category)) return { label: "Need", tone: "info" };
  if (canonicalCategory(category) === "Food & Dining") return { label: "Food & Dining", tone: "info" };
  return { label: "Want", tone: "warning" };
}


export function Transactions() {
  const {
    transactions,
    recurring,
    profile,
    debt,
    addTransaction,
    deleteTransaction,
    restoreTransaction,
    updateIncomeSuite,
    uploadBill,
    fetchDeletedTransactions,
    acknowledgeAnomaly,
    excludeAnomaly,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    processRecurring,
  } = useFinance();

  const [activeTab, setActiveTab] = useState("active"); // "active" | "recurring" | "deleted"
  const [showQuickAdd, setShowQuickAdd] = useState(true);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState(null);

  // Recurring State
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringFeedback, setRecurringFeedback] = useState("");
  const [processingRecurring, setProcessingRecurring] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    name: "",
    amount: 16000,
    category: "Rent",
    type: "expense",
    day_of_month: 1,
  });

  async function handleProcessRecurring() {
    setProcessingRecurring(true);
    try {
      await processRecurring();
      setRecurringFeedback("Due recurring commitments for this cycle verified and logged.");
      setTimeout(() => setRecurringFeedback(""), 5000);
    } finally {
      setProcessingRecurring(false);
    }
  }

  async function handleRecurringSubmit(e) {
    e.preventDefault();
    if (!recurringForm.name || !recurringForm.amount) return;
    await addRecurringTransaction({
      ...recurringForm,
      amount: Number(recurringForm.amount),
      day_of_month: Number(recurringForm.day_of_month),
    });
    setShowRecurringModal(false);
    setRecurringFeedback(`Recurring commitment "${recurringForm.name}" created.`);
    setTimeout(() => setRecurringFeedback(""), 5000);
    setRecurringForm({ name: "", amount: 16000, category: "Rent", type: "expense", day_of_month: 1 });
  }

  async function handleToggleRecurring(r) {
    await updateRecurringTransaction(r.id, { is_active: !r.is_active });
  }

  async function handleDeleteRecurring(id) {
    await deleteRecurringTransaction(id);
    setRecurringFeedback("Recurring commitment removed.");
    setTimeout(() => setRecurringFeedback(""), 4000);
  }

  // Deleted transactions list
  const [deletedList, setDeletedList] = useState([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  // Bill upload state
  const [fileUploading, setFileUploading] = useState(false);
  const [attachedBill, setAttachedBill] = useState(null);

  // Income Suite Modals State
  const [incomePromptOpen, setIncomePromptOpen] = useState(false);
  const [pendingIncomeForm, setPendingIncomeForm] = useState(null);

  // Anomaly alert: shown immediately after a flagged transaction is saved
  const [anomalyAlert, setAnomalyAlert] = useState(null); // { id, amount, category }

  // Form State
  const [form, setForm] = useState({
    amount: 1500,
    type: "expense",
    category: "Groceries",
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });

  // Unique categories in ledger for filter dropdown
  const categoriesList = useMemo(() => {
    const set = new Set();
    (transactions.transactions || []).forEach((t) => {
      if (t.category) set.add(canonicalCategory(t.category));
    });
    return Array.from(set).sort();
  }, [transactions.transactions]);

  // Strip legacy (Auto-Recurring) from description string
  const cleanDescription = (desc = "") => {
    return desc.replace(/\s*\(Auto-Recurring\)/gi, "").replace(/\(Auto-Recurring\)/gi, "").trim();
  };

  const activeRows = useMemo(() => {
    return (transactions.transactions || []).filter((txn) => {
      const desc = cleanDescription(txn.description || "");
      const cat = txn.category || "";
      const matchesQuery = !query || `${desc} ${cat}`.toLowerCase().includes(query.toLowerCase());
      const matchesType = filterType === "all" || txn.type === filterType;
      const matchesCategory = filterCategory === "all" || canonicalCategory(txn.category) === filterCategory;
      return matchesQuery && matchesType && matchesCategory;
    });
  }, [transactions.transactions, query, filterType, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(activeRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return activeRows.slice(start, start + pageSize);
  }, [activeRows, page, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, filterType, filterCategory, pageSize]);

  const deletedRows = useMemo(() => {
    return deletedList.filter((txn) =>
      `${cleanDescription(txn.description || "")} ${txn.category || ""}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [deletedList, query]);

  const loadDeleted = async () => {
    setLoadingDeleted(true);
    const items = await fetchDeletedTransactions();
    setDeletedList(items);
    setLoadingDeleted(false);
  };

  useEffect(() => {
    if (activeTab === "deleted") {
      loadDeleted();
    }
  }, [activeTab]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (showRecurringModal) setShowRecurringModal(false);
        if (incomePromptOpen) setIncomePromptOpen(false);
        if (anomalyAlert) setAnomalyAlert(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showRecurringModal, incomePromptOpen, anomalyAlert]);

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileUploading(true);
    try {
      const res = await uploadBill(file);
      setAttachedBill({ url: res.bill_url, name: res.filename || file.name });
    } catch (err) {
      alert("Failed to upload file: " + err.message);
    } finally {
      setFileUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      ...form,
      amount: Number(form.amount),
      bill_url: attachedBill ? attachedBill.url : null,
    };

    if (form.type === "income") {
      setPendingIncomeForm(payload);
      setIncomePromptOpen(true);
    } else {
      const created = await addTransaction(payload);
      resetForm();
      // Show inline anomaly alert if the AI flagged this transaction
      if (created?.anomaly_flag) {
        setAnomalyAlert({
          id: created.id,
          amount: created.amount,
          category: created.category,
          score: created.anomaly_score,
        });
      }
    }
  }

  function resetForm() {
    setForm({
      amount: 1500,
      type: "expense",
      category: "Groceries",
      date: new Date().toISOString().slice(0, 10),
      description: "",
    });
    setAttachedBill(null);
    setIncomePromptOpen(false);
    setPendingIncomeForm(null);
  }

  async function handleIncomeChoice(addToSuite, applyToAllMonths) {
    if (!pendingIncomeForm) return;
    const created = await addTransaction(pendingIncomeForm);
    if (addToSuite) {
      await updateIncomeSuite(pendingIncomeForm.amount, applyToAllMonths);
    }
    resetForm();
    // Income transactions are never flagged as anomalies by the model, but guard anyway
    if (created?.anomaly_flag) {
      setAnomalyAlert({
        id: created.id,
        amount: created.amount,
        category: created.category,
        score: created.anomaly_score,
      });
    }
  }

  async function handleDeleteConfirm() {
    if (deletingId) {
      await deleteTransaction(deletingId);
      setDeletingId(null);
      if (activeTab === "deleted") {
        loadDeleted();
      }
    }
  }

  async function handleRestore(txnId) {
    await restoreTransaction(txnId);
    await loadDeleted();
  }

  return (
    <>
      <PageHeader
        eyebrow="Financial Ledger"
        title="Transactions & Outflow Management"
        subtitle="Chronological record of verified credit inflows, expense debits, and automated standing commitments."
        actions={
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Button
              variant={showQuickAdd ? "secondary" : "primary"}
              onClick={() => setShowQuickAdd((prev) => !prev)}
            >
              {showQuickAdd ? "Hide Entry Panel" : "+ Log Transaction"}
            </Button>
          </div>
        }
      />

      {/* Unified Institutional Summary Strip (No 3 Floating Cards) */}
      <div className="ledger-summary-strip">
        <div className="ledger-summary-col">
          <span className="ledger-summary-label">Total Inflows (Tracked)</span>
          <span className="ledger-summary-val ledger-inflow">{currency(transactions.summary?.income || 0)}</span>
          <span className="ledger-summary-sub">
            {profile?.monthly_income && !transactions.summary?.income
              ? `Profile salary: ${currency(profile.monthly_income)}/mo`
              : "Recorded credit transactions"}
          </span>
        </div>
        <div className="ledger-summary-col">
          <span className="ledger-summary-label">Total Outflows</span>
          <span className="ledger-summary-val ledger-outflow">{currency(transactions.summary?.expenses || 0)}</span>
          <span className="ledger-summary-sub">Recorded debit transactions</span>
        </div>
        <div className="ledger-summary-col">
          <span className="ledger-summary-label">Net Monthly Cash Flow</span>
          <span className={`ledger-summary-val ${(transactions.summary?.net || 0) >= 0 ? "ledger-inflow" : "ledger-outflow"}`}>
            {currency(transactions.summary?.net || 0)}
          </span>
          <span className="ledger-summary-sub">
            {(transactions.summary?.net || 0) >= 0 ? "Surplus balance" : "Deficit balance"}
          </span>
        </div>
        <div className="ledger-summary-col">
          <span className="ledger-summary-label">Ledger Volume</span>
          <span className="ledger-summary-val">{transactions.transactions?.length || 0}</span>
          <span className="ledger-summary-sub">Total active records</span>
        </div>
      </div>

      {/* TOP-DOCKED: Direct Add Transaction Area */}
      {showQuickAdd && (
        <div className="ledger-quick-add">
          <div className="ledger-quick-add-header">
            <span className="ledger-quick-add-title">Log New Transaction Record</span>
            <Button variant="ghost" size="sm" onClick={() => setShowQuickAdd(false)}>
              Close
            </Button>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <Field label="Amount (₹)">
              <NumberInput min="1" value={form.amount} onChange={(val) => setForm({ ...form, amount: val })} required />
            </Field>

            <Field label="Flow Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="expense">Expense (Debit)</option>
                <option value="income">Income (Credit)</option>
              </select>
            </Field>

            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {form.type === "income" ? (
                  <optgroup label="Income Sources">
                    <option value="Salary">Salary / Payroll</option>
                    <option value="Freelance">Freelance Payment</option>
                    <option value="Business">Business Revenue</option>
                    <option value="Rent Received">Rental Income</option>
                    <option value="Interest">Interest & Dividends</option>
                    <option value="Bonus">Bonus & Incentives</option>
                    <option value="Income">General Inflow</option>
                  </optgroup>
                ) : (
                  <>
                    <optgroup label="Essential Needs">
                      <option value="Rent">Rent / Housing</option>
                      <option value="Mandatory EMI">Home / Vehicle / Personal Loan EMI</option>
                      <option value="Groceries">Groceries & Household Supplies</option>
                      <option value="Utilities">Utilities, Electricity & WiFi</option>
                      <option value="Transport">Fuel & Public Transport</option>
                      <option value="Healthcare">Healthcare & Pharmacy</option>
                      <option value="Insurance">Insurance Premiums</option>
                      <option value="Education">Education & Tuition</option>
                    </optgroup>
                    <optgroup label="Discretionary Wants">
                      <option value="Dining">Dining Out & Delivery</option>
                      <option value="Shopping">Shopping & Apparel</option>
                      <option value="Entertainment">Entertainment & Subscriptions</option>
                      <option value="Travel">Travel & Lodging</option>
                      <option value="Lifestyle">Gym & Personal Care</option>
                      <option value="Other">Other Want</option>
                    </optgroup>
                    <optgroup label="Reserves & Wealth Building">
                      <option value="Mutual Funds">Mutual Funds / SIP</option>
                      <option value="Fixed Deposit">Fixed Deposit (FD) / RD</option>
                      <option value="Stocks">Direct Equity & Stocks</option>
                      <option value="Emergency Fund">Emergency Reserve Contribution</option>
                      <option value="Gold">Gold & Bullion</option>
                      <option value="Provident Fund">PPF / EPF Contribution</option>
                      <option value="Extra Loan Repayment">Loan Principal Prepayment</option>
                    </optgroup>
                  </>
                )}
              </select>
            </Field>

            <Field label="Date">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </Field>

            <Field label="Description">
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="E.g. Grocery Store, Salary Credit, Office Rent..."
                required
              />
            </Field>

            <Field label="Attach Invoice / Receipt (PDF or Image)">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input type="file" accept="application/pdf,image/*" onChange={handleFileUpload} disabled={fileUploading} />
                {fileUploading && <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Uploading...</span>}
              </div>
              {attachedBill && (
                <div style={{ fontSize: "12px", color: "var(--accent-success)", marginTop: "4px" }}>
                  Attached: {attachedBill.name}
                </div>
              )}
            </Field>

            <div className="form-actions form-wide" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <Button type="button" variant="ghost" onClick={resetForm}>
                Reset
              </Button>
              <Button type="submit" variant="primary">
                Save to Ledger
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Anomaly Alert Banner ─────────────────────────────────────────── */}
      {anomalyAlert && (
        <div style={{
          background: "rgba(255, 140, 0, 0.08)",
          border: "1px solid var(--accent-warning)",
          borderLeft: "4px solid var(--accent-warning)",
          borderRadius: "8px",
          padding: "14px 18px",
          margin: "12px 0",
          display: "flex",
          alignItems: "flex-start",
          gap: "14px",
          flexWrap: "wrap",
        }}>
          <ShieldAlert size={22} style={{ color: "var(--accent-warning)", flexShrink: 0, marginTop: "2px" }} />
          <div style={{ flex: 1, minWidth: "220px" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--accent-warning)", marginBottom: "4px" }}>
              ⚠ Anomaly Detected
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-primary)", marginBottom: "6px" }}>
              This <strong>{anomalyAlert.category}</strong> transaction of{" "}
              <strong>₹{Number(anomalyAlert.amount).toLocaleString("en-IN")}</strong> looks unusual compared
              to your spending history
              {anomalyAlert.score ? ` (confidence: ${(anomalyAlert.score * 100).toFixed(0)}%)` : ""}.
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              <strong>Accept</strong> — It's a genuine expense, train the model to recognise this pattern.
              &nbsp;|&nbsp;
              <strong>Discard</strong> — Exclude from model training (transaction stays in your ledger).
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0, alignItems: "center" }}>
            <button
              className="btn btn-sm"
              style={{ background: "var(--accent-success)", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
              onClick={async () => { await acknowledgeAnomaly(anomalyAlert.id); setAnomalyAlert(null); }}
            >
              ✓ Accept
            </button>
            <button
              className="btn btn-sm"
              style={{ background: "var(--accent-warning)", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
              onClick={async () => { await excludeAnomaly(anomalyAlert.id); setAnomalyAlert(null); }}
            >
              ✕ Discard
            </button>
            <button
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
              title="Dismiss"
              onClick={() => setAnomalyAlert(null)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Tabs for Active, Recurring, and Deleted */}
      <div className="tab-buttons" style={{ display: "flex", gap: "8px", marginBottom: "0", flexWrap: "wrap" }}>
        <button
          className={`btn ${activeTab === "active" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("active")}
        >
          Active Ledger ({transactions.transactions?.length || 0})
        </button>
        <button
          className={`btn ${activeTab === "recurring" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("recurring")}
        >
          Recurring Commitments ({recurring?.recurring?.length || 0})
        </button>
        <button
          className={`btn ${activeTab === "deleted" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("deleted")}
        >
          Recovery Trash Bin ({deletedList.length})
        </button>
      </div>

      {recurringFeedback && (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-color)", borderLeft: "3px solid var(--accent-success)", color: "var(--text-primary)", padding: "10px 14px", borderRadius: "4px", margin: "14px 0", fontSize: "13px" }}>
          {recurringFeedback}
        </div>
      )}

      {activeTab === "active" && (
        <>
          {/* Table Toolbar & Filters */}
          <div className="ledger-toolbar" style={{ marginTop: "12px" }}>
            <div className="ledger-toolbar-search">
              <input
                placeholder="Search description or category..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="ledger-toolbar-filters">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ width: "auto", minWidth: "120px" }}
              >
                <option value="all">All Types</option>
                <option value="expense">Expenses</option>
                <option value="income">Inflows</option>
                <option value="savings">Savings</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{ width: "auto", minWidth: "140px" }}
              >
                <option value="all">All Categories</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{ width: "auto", minWidth: "110px" }}
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>

          {/* High-Density Ledger Table */}
          <div className="ledger-table-container">
            {paginatedRows.length ? (
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th style={{ width: "110px" }}>Date</th>
                    <th>Description</th>
                    <th style={{ width: "160px" }}>Category</th>
                    <th style={{ width: "110px" }}>Type</th>
                    <th style={{ width: "130px", textAlign: "right" }}>Amount</th>
                    <th style={{ width: "110px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((txn) => {
                    const isRec = Boolean(txn.is_recurring || (txn.description || "").includes("(Auto-Recurring)"));
                    const descClean = cleanDescription(txn.description || "");
                    const isCredit = txn.type === "income";
                    const isAnomaly = Boolean(txn.anomaly_flag && !txn.acknowledged);

                    return (
                      <tr key={txn.id} className={txn.anomaly_flag ? "anomaly-row" : ""}>
                        <td style={{ color: "var(--text-muted)", fontSize: "12px", fontFamily: "monospace" }}>
                          {txn.date}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                            <span style={{ fontWeight: 600 }}>{descClean}</span>
                            {isAnomaly && <Badge tone="danger">Anomaly{txn.anomaly_score ? ` · ${(txn.anomaly_score * 100).toFixed(0)}%` : ""}</Badge>}
                            {isRec && <span className="rec-tag">Recurring</span>}
                            {txn.bill_url && (
                              <a
                                href={txn.bill_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: "11px", color: "var(--accent-ai)", textDecoration: "underline", marginLeft: "4px" }}
                              >
                                [Receipt]
                              </a>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }} title={txn.category}>{canonicalCategory(txn.category)}</span>
                        </td>
                        <td>
                          <Badge tone={getCategoryTag(txn.category, txn.type).tone}>
                            {getCategoryTag(txn.category, txn.type).label}
                          </Badge>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className={`ledger-amount ${isCredit ? "ledger-inflow" : "ledger-outflow"}`}>
                            {isCredit ? "+" : "-"}{currency(txn.amount)}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {isAnomaly ? (
                            <div style={{ display: "inline-flex", gap: "4px" }}>
                              <button
                                className="icon-button"
                                style={{ color: "var(--accent-success)" }}
                                title="Acknowledge as Normal"
                                onClick={() => acknowledgeAnomaly(txn.id)}
                              >
                                Accept
                              </button>
                              <button
                                className="icon-button"
                                style={{ color: "var(--accent-warning)" }}
                                title="Exclude from training"
                                onClick={() => excludeAnomaly(txn.id)}
                              >
                                Exclude
                              </button>
                              <button
                                className="icon-button"
                                style={{ color: "var(--accent-danger)" }}
                                title="Delete"
                                onClick={() => setDeletingId(txn.id)}
                              >
                                Delete
                              </button>
                            </div>
                          ) : (
                            <button
                              className="icon-button"
                              style={{ color: "var(--text-muted)" }}
                              title="Delete Transaction"
                              onClick={() => setDeletingId(txn.id)}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                No transactions match the selected criteria.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {activeRows.length > 0 && (
            <div className="ledger-pagination">
              <span>
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, activeRows.length)} of {activeRows.length} entries
              </span>
              <div className="ledger-pagination-controls">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Deleted / Trash Bin Tab */}
      {activeTab === "deleted" && (
        <Card style={{ marginTop: "12px" }}>
          <div className="ledger-toolbar" style={{ border: "none", padding: "0 0 14px" }}>
            <input
              placeholder="Search deleted records..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: "300px" }}
            />
            <Badge tone="warning">60-Day Recovery Window</Badge>
          </div>

          {loadingDeleted ? (
            <p className="muted" style={{ padding: "16px 0", fontSize: "13px" }}>Loading trash bin...</p>
          ) : deletedRows.length ? (
            <table className="ledger-table" style={{ border: "1px solid var(--border-color)", borderRadius: "4px" }}>
              <thead>
                <tr>
                  <th style={{ width: "120px" }}>Deleted Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {deletedRows.map((txn) => (
                  <tr key={txn.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                      {txn.deleted_at ? String(txn.deleted_at).slice(0, 10) : "Recently"}
                    </td>
                    <td style={{ fontWeight: 600 }}>{cleanDescription(txn.description)}</td>
                    <td>{txn.category}</td>
                    <td><Badge tone={txn.type === "income" ? "success" : "warning"}>{txn.type}</Badge></td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{currency(txn.amount)}</td>
                    <td style={{ textAlign: "center" }}>
                      <Button variant="secondary" size="sm" onClick={() => handleRestore(txn.id)}>
                        Restore
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Trash bin empty" detail="No transactions have been deleted within the last 60 days." />
          )}
        </Card>
      )}

      {/* Recurring Tab: Clean, No Quick Templates */}
      {activeTab === "recurring" && (
        <Card style={{ marginTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px", marginBottom: "16px" }}>
            <div>
              <div className="section-title" style={{ margin: "0 0 4px" }}>Standing Recurring Commitments</div>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
                Standing commitments (rent, utilities, loans, SIPs) configured here are recorded each month on their due day.
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Button variant="secondary" onClick={handleProcessRecurring} disabled={processingRecurring}>
                {processingRecurring ? "Processing..." : "Process Due Cycle"}
              </Button>
              <Button onClick={() => setShowRecurringModal(true)}>
                + New Commitment
              </Button>
            </div>
          </div>

          {recurring?.recurring?.length ? (
            <table className="ledger-table" style={{ border: "1px solid var(--border-color)", borderRadius: "4px" }}>
              <thead>
                <tr>
                  <th>Commitment Name</th>
                  <th>Category</th>
                  <th>Monthly Day</th>
                  <th style={{ textAlign: "right" }}>Monthly Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recurring.recurring.map((item) => {
                  const linkedDebt = item.debt_id ? (debt?.items || []).find((d) => String(d.id) === String(item.debt_id)) : null;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <strong style={{ fontSize: "14px" }}>{item.name}</strong>
                          {item.debt_id && (
                            <Badge tone="warning" title="Synchronized with Debt Hub">Loan Commitment</Badge>
                          )}
                        </div>
                        {item.debt_id && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            {linkedDebt?.lender && <span>{linkedDebt.lender} • </span>}
                            <span>Bal: {currency(linkedDebt?.outstanding ?? 0)}</span>
                            {linkedDebt?.remaining_months != null && <span>• {linkedDebt.remaining_months}m left</span>}
                            <Link to="/debt" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "2px" }}>
                              Manage in Debt Hub <ArrowRight size={11} />
                            </Link>
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge tone={item.debt_id ? "warning" : item.type === "savings" ? "success" : "info"}>{item.category}</Badge>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                        Day {item.day_of_month} of month
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {currency(item.amount)}/mo
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-sm ${item.is_active ? "btn-secondary" : "btn-ghost"}`}
                          onClick={() => handleToggleRecurring(item)}
                          title={item.debt_id ? (item.is_active ? "Pause monthly loan auto-deduct" : "Activate monthly loan auto-deduct") : (item.is_active ? "Pause commitment" : "Activate commitment")}
                        >
                          {item.is_active ? "Active" : "Paused"}
                        </button>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="icon-button"
                          style={{ color: "var(--accent-danger)" }}
                          onClick={() => handleDeleteRecurring(item.id)}
                          title={item.debt_id ? "Remove recurring commitment (unlinks auto-deduct from loan)" : "Delete commitment"}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title="No recurring commitments configured"
              detail="Standing outflows like housing rent, home loans, utilities, or mutual fund SIPs can be registered above."
            />
          )}
        </Card>
      )}

      {/* Income Suite Interactive Prompts */}
      {incomePromptOpen && pendingIncomeForm && (
        <div className="modal-backdrop" onClick={() => setIncomePromptOpen(false)}>
          <Card className="modal-card" style={{ maxWidth: "520px", width: "100%", position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <div className="section-title" style={{ margin: 0 }}>Income Suite Update</div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIncomePromptOpen(false)}
                title="Close"
                style={{ padding: "4px" }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: "10px 0 16px", fontSize: "14px" }}>
              Recorded an income inflow of <strong>{currency(pendingIncomeForm.amount)}</strong> ({cleanDescription(pendingIncomeForm.description)}).
            </p>
            <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
              Update baseline monthly income in your financial profile?
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <Button
                variant="primary"
                onClick={() => {
                  const applyAll = window.confirm("Add to all future months? Click OK for All Months, or Cancel for Present Month Only.");
                  handleIncomeChoice(true, applyAll);
                }}
              >
                Update Profile Baseline
              </Button>
              <Button variant="secondary" onClick={() => handleIncomeChoice(false, false)}>
                Record Transaction Only
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Recurring Commitment Modal */}
      {showRecurringModal && (
        <div className="modal-backdrop" onClick={() => setShowRecurringModal(false)}>
          <Card
            className="modal-card"
            style={{ maxWidth: "580px", width: "100%", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
              <div className="section-title" style={{ margin: 0 }}>Configure Standing Recurring Commitment</div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowRecurringModal(false)}
                title="Close"
                style={{ padding: "6px" }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: "4px 0 14px", fontSize: "13px", color: "var(--text-muted)" }}>
              Standing commitments (rent, utilities, loans, SIPs) are automatically logged into your ledger on their scheduled monthly day.
            </p>
            <form className="form-grid" onSubmit={handleRecurringSubmit}>
              <Field label="Commitment Name">
                <input
                  required
                  placeholder="E.g. Apartment Rent, Home Loan EMI, WiFi, SIP..."
                  value={recurringForm.name}
                  onChange={(e) => setRecurringForm({ ...recurringForm, name: e.target.value })}
                />
              </Field>

              <Field label="Monthly Amount (₹)">
                <NumberInput
                  min="1"
                  required
                  placeholder="16000"
                  value={recurringForm.amount}
                  onChange={(val) => setRecurringForm({ ...recurringForm, amount: val })}
                />
              </Field>

              <Field label="Category">
                <select
                  value={recurringForm.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    const isSavings = ["Mutual Funds", "Emergency Fund", "Fixed Deposit", "Stocks", "Gold", "Provident Fund", "Extra Loan Repayment"].includes(cat);
                    setRecurringForm({ ...recurringForm, category: cat, type: isSavings ? "savings" : "expense" });
                  }}
                >
                  <optgroup label="Fixed Living Commitments">
                    <option value="Rent">Rent / Housing</option>
                    <option value="Mandatory EMI">Home Loan / Vehicle Loan / Personal EMI</option>
                    <option value="Utilities">Utilities & WiFi Broadband</option>
                    <option value="Insurance">Insurance Premiums</option>
                    <option value="Groceries">Scheduled Grocery / Essentials</option>
                    <option value="Education">Education & Tuition Fee</option>
                    <option value="Transport">Monthly Transport Pass / Fuel</option>
                  </optgroup>
                  <optgroup label="Monthly Discretionary Subscriptions">
                    <option value="Entertainment">Streaming & Media Subscriptions</option>
                    <option value="Lifestyle">Gym & Fitness Memberships</option>
                    <option value="Dining">Meal / Tiffin Subscriptions</option>
                    <option value="Other">Other Subscription</option>
                  </optgroup>
                  <optgroup label="Automated Wealth & Savings">
                    <option value="Mutual Funds">Mutual Fund SIP</option>
                    <option value="Emergency Fund">Emergency Reserve Allocation</option>
                    <option value="Fixed Deposit">Recurring Deposit (RD) / FD</option>
                    <option value="Stocks">Automated Stock Plan</option>
                    <option value="Provident Fund">PPF / Voluntary PF</option>
                  </optgroup>
                </select>
              </Field>

              {recurringForm.category === "Mandatory EMI" && (
                <div className="form-wide" style={{ fontSize: "12px", color: "var(--accent-warning)", background: "rgba(245, 158, 11, 0.08)", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(245, 158, 11, 0.2)", marginBottom: "4px" }}>
                  💡 Tip: Loans configured in <strong>Debt & Loans</strong> automatically synchronize here with full tenure and balance tracking.
                </div>
              )}

              <Field label="Day of Month (1 - 28)">
                <NumberInput
                  min="1"
                  max="28"
                  required
                  value={recurringForm.day_of_month}
                  onChange={(val) => setRecurringForm({ ...recurringForm, day_of_month: Math.min(28, Math.max(1, Number(val) || 1)) })}
                />
              </Field>

              <div className="form-actions form-wide" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <Button type="button" variant="ghost" onClick={() => setShowRecurringModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Commitment
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction record? It will be moved to the 60-day recovery trash bin."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
      />
    </>
  );
}


export function Budget() {
  const { budget, updateBudgets, recurring, profile, debt } = useFinance();
  const tier = budget.tier_info || {};
  const [editing, setEditing] = useState(false);
  const [draftItems, setDraftItems] = useState(budget.items || []);
  const [newCat, setNewCat] = useState("");
  const [newAmount, setNewAmount] = useState(5000);
  const [saving, setSaving] = useState(false);

  const recurringMap = useMemo(() => {
    const map = {};
    for (const r of recurring?.recurring || []) {
      if (r.is_active) {
        map[r.category] = (map[r.category] || 0) + (Number(r.amount) || 0);
      }
    }
    return map;
  }, [recurring]);

  useEffect(() => {
    setDraftItems(budget.items || []);
  }, [budget.items]);

  function handleDraftChange(index, value) {
    const updated = [...draftItems];
    updated[index] = { ...updated[index], planned: Number(value) };
    setDraftItems(updated);
  }

  function handleAddCategory(e) {
    e.preventDefault();
    if (!newCat.trim()) return;
    setDraftItems([...draftItems, { category: newCat.trim(), planned: Number(newAmount), actual: 0 }]);
    setNewCat("");
    setNewAmount(5000);
  }

  function handleRemoveDraftItem(index) {
    const updated = draftItems.filter((_, i) => i !== index);
    setDraftItems(updated);
  }

  async function handleSaveBudgets() {
    setSaving(true);
    try {
      await updateBudgets(draftItems);
      setEditing(false);
    } catch (err) {
      alert("Failed to save budgets: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const items = budget.items || [];
  const plannedTotal = budget.planned || items.reduce((acc, i) => acc + (Number(i.planned) || 0), 0);
  const actualTotal = budget.actual || items.reduce((acc, i) => acc + (Number(i.actual) || 0), 0);
  const remaining = Math.max(0, (budget.income || 0) - actualTotal);

  return (
    <>
      <PageHeader
        eyebrow="Budget"
        title="Monthly Budget Control & Tier Benchmarks"
        subtitle="Planned vs actual category spending benchmarked against your verified transactions and income tier."
        actions={
          <Button variant={editing ? "secondary" : "primary"} onClick={() => { setEditing(!editing); setDraftItems(items); }}>
            <Pencil size={15} /> {editing ? "Cancel Editing" : "Customize Budgets"}
          </Button>
        }
      />
      <section className="metric-grid">
        <MetricCard icon={<Landmark />} label="Monthly Income" value={currency(budget.income)} detail={`Tier ${tier.tier || 1}: ${tier.name || 'Baseline'}`} tone="success" />
        <MetricCard icon={<SlidersHorizontal />} label="Planned Expenses" value={currency(plannedTotal)} detail="Monthly budget ceiling" tone="info" />
        <MetricCard icon={<CreditCard />} label="Actual Spent" value={currency(actualTotal)} detail={`${items.length} active categories tracked`} tone={actualTotal > plannedTotal ? "danger" : "info"} />
        <MetricCard icon={<WalletCards />} label="Remaining Cash Flow" value={currency(remaining)} detail="Unallocated monthly income" tone="ai" />
      </section>

      {/* 5-Tier Income & Budget Recommendation Card */}
      {tier.tier && (
        <Card glow style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div className="section-title"><Sparkles /> Income Tier Benchmark: Tier {tier.tier} — {tier.name} ({tier.range})</div>
            {tier.lifestyle_badge && (
              <Badge tone={tier.lifestyle_preference === "Frugal" ? "success" : tier.lifestyle_preference === "Experience-focused" ? "ai" : "info"}>
                Lifestyle: {tier.lifestyle_badge}
              </Badge>
            )}
          </div>
          <p className="muted" style={{ margin: "6px 0 16px" }}>{tier.details}</p>
          <div className="metric-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            <div style={{ padding: "12px", background: "var(--surface-hover)", borderRadius: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Needs Target ({tier.needs_pct}%)</span>
              <strong style={{ fontSize: "18px", color: "var(--text-primary)" }}>{currency(tier.needs_amount)}</strong>
            </div>
            <div style={{ padding: "12px", background: "var(--surface-hover)", borderRadius: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Wants Target ({tier.wants_pct}%)</span>
              <strong style={{ fontSize: "18px", color: "var(--accent)" }}>{currency(tier.wants_amount)}</strong>
            </div>
            <div style={{ padding: "12px", background: "var(--surface-hover)", borderRadius: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Savings Target ({tier.savings_pct}%)</span>
              <strong style={{ fontSize: "18px", color: "var(--accent-success)" }}>{currency(tier.savings_amount)}</strong>
            </div>
          </div>
          <div className="recommendation" style={{ marginTop: "14px" }}>
            <strong>Strategic Focus:</strong> {tier.focus}
          </div>
        </Card>
      )}

      {/* Edit Budget Form Card */}
      {editing && (
        <Card style={{ marginBottom: "24px", border: "1px solid var(--accent)" }}>
          <div className="section-title"><Pencil /> Edit Category Budget Limits</div>
          <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
            {draftItems.map((item, idx) => (
              <div key={item.category} style={{ display: "grid", gridTemplateColumns: "180px 1fr 40px", alignItems: "center", gap: "12px" }}>
                <strong>{item.category}</strong>
                <NumberInput
                  value={item.planned}
                  onChange={(val) => handleDraftChange(idx, val)}
                  min="0"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveDraftItem(idx)}
                  className="icon-button danger"
                  title="Remove category"
                  style={{ padding: "6px" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddCategory} style={{ display: "flex", gap: "10px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border-color)", alignItems: "flex-end" }}>
            <Field label="Add Category" style={{ flex: 1 }}>
              <input
                placeholder="e.g. Subscriptions, Gym, Fuel"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
              />
            </Field>
            <Field label="Planned Limit" style={{ width: "160px" }}>
              <NumberInput
                value={newAmount}
                onChange={(val) => setNewAmount(val)}
                min="100"
              />
            </Field>
            <Button type="submit" variant="secondary" style={{ height: "42px" }}><Plus size={16} /> Add</Button>
          </form>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSaveBudgets} disabled={saving}>
              {saving ? "Saving Changes..." : "Save Budget Limits"}
            </Button>
          </div>
        </Card>
      )}

      <section className="grid-2">
        <Card>
          <div className="section-title"><SlidersHorizontal /> Category Budgets</div>
          {items.length ? (
            <div className="budget-list">{items.map((item) => {
              const planned = Number(item.planned) || 0;
              const actual = Number(item.actual) || 0;
              const pct = planned > 0 ? (actual / planned) * 100 : (actual > 0 ? 100 : 0);
              const tag = getCategoryTag(item.category, "expense");
              const isOver = actual > planned && planned > 0;
              return (
                <article key={item.category} style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <strong>{item.category}</strong>
                      <Badge tone={tag.tone}>{tag.label}</Badge>
                      {recurringMap[item.category] && (
                        <Badge tone="info" title="Automatic recurring commitments logged in this category">
                          Auto: {currency(recurringMap[item.category])}/mo
                        </Badge>
                      )}
                      {isOver && <Badge tone="danger">Over by {currency(actual - planned)}</Badge>}
                    </div>
                    <span style={{ fontWeight: 600, color: isOver ? "var(--accent-danger)" : "inherit" }}>
                      {currency(actual)} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>/ {currency(planned)}</span>
                    </span>
                  </div>
                  <Progress value={pct} tone={pct > 100 ? "danger" : pct > 80 ? "warning" : "success"} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "11px", color: "var(--text-muted)" }}>
                    <span>{pct.toFixed(0)}% utilized</span>
                    <span>{actual <= planned ? `${currency(planned - actual)} available` : `Exceeded limit`}</span>
                  </div>
                </article>
              );
            })}</div>
          ) : (
            <EmptyState title="No category budgets set" detail="Click 'Customize Budgets' above to configure planned limits." />
          )}
        </Card>

        <Card glow>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
            <div className="section-title" style={{ margin: 0 }}><ShieldAlert /> AI Budget Coach</div>
            <div style={{ display: "flex", gap: "6px" }}>
              <Badge tone="info">Lifestyle: {budget.coach?.lifestyle || profile?.lifestyle_preference || 'Balanced'}</Badge>
              {profile?.primary_financial_goal && <Badge tone="ai">Goal: {profile.primary_financial_goal}</Badge>}
            </div>
          </div>
          <p className="recommendation">{budget.coach?.message || "All tracked categories are within budget limits."}</p>
          <p className="muted" style={{ fontSize: "13px", lineHeight: "1.5" }}>
            Budgets sync directly with your live transaction ledger. Whenever you log an expense, the actual spending for that category updates immediately.
          </p>
        </Card>
      </section>

      {/* Active Loan Servicing & Debt Commitments */}
      {(() => {
        const activeDebts = (debt?.items || []).filter((d) => d.status !== "paid_off");
        if (!activeDebts.length) return null;
        const totalEmi = activeDebts.reduce((sum, d) => sum + (Number(d.emi) || 0), 0);
        const income = Number(profile?.monthly_income) || 1;
        const dtiPct = Math.round((totalEmi / income) * 100);

        return (
          <Card style={{ marginTop: "20px" }}>
            <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CreditCard size={18} /> Active Debt Service Obligations ({currency(totalEmi)}/mo • {dtiPct}% of Income)
              </span>
              <Link to="/debt">
                <Button variant="secondary" size="sm" style={{ fontSize: "12px" }}>
                  Manage Loan Obligations <ArrowRight size={13} />
                </Button>
              </Link>
            </div>
            <p className="muted" style={{ fontSize: "12px", margin: "4px 0 12px" }}>
              Monthly debt installments are non-discretionary contractual cash flows factored into your fixed commitments envelope before discretionary wants are allocated.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
              {activeDebts.map((d) => (
                <div key={d.id} style={{ padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "4px", background: "var(--bg-elevated)", display: "grid", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>{d.name}</strong>
                    <Badge tone={d.is_secured ? "info" : "warning"}>{d.is_secured ? "Secured" : "Unsecured"}</Badge>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {d.lender ? `${d.lender} • ` : ""}{d.loan_type || "Loan"} • Day {d.emi_day || 5}
                  </span>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginTop: "4px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Monthly EMI:</span>
                    <strong style={{ color: "var(--accent)" }}>{currency(d.emi)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      <QuickLinks links={[
        { to: '/transactions', icon: Landmark, label: 'Transactions', detail: 'See actual spending data' },
        { to: '/goals', icon: GoalIcon, label: 'Goals', detail: 'Align budget with goals' },
        { to: '/simulator', icon: CircleDollarSign, label: 'Simulator', detail: 'Test spending changes' },
      ]} />
    </>
  );
}

const GOAL_PRESETS = [
  { name: "Emergency Safety Buffer", goal_type: "Emergency", target_amount: 150000, monthly_contribution: 12500, months: 12 },
  { name: "Vehicle Down Payment", goal_type: "Vehicle", target_amount: 250000, monthly_contribution: 10500, months: 24 },
  { name: "Vacation & Travel", goal_type: "Travel", target_amount: 60000, monthly_contribution: 10000, months: 6 },
  { name: "Home Down Payment", goal_type: "Home", target_amount: 1200000, monthly_contribution: 25000, months: 48 },
  { name: "Higher Education / Skills", goal_type: "Education", target_amount: 350000, monthly_contribution: 19500, months: 18 },
];

export function Goals() {
  const navigate = useNavigate();
  const { goals, addGoal, updateGoal, deleteGoal } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [activeMenuGoal, setActiveMenuGoal] = useState(null);
  const [deletingGoalName, setDeletingGoalName] = useState(null);
  const [editingGoalName, setEditingGoalName] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    target_amount: 150000,
    current_amount: 0,
    monthly_contribution: 10000,
    target_date: defaultTargetDate(),
    goal_type: "Custom",
  });

  function applyPreset(preset) {
    const d = new Date();
    d.setMonth(d.getMonth() + preset.months);
    setForm({
      name: preset.name,
      goal_type: preset.goal_type,
      target_amount: preset.target_amount,
      current_amount: 0,
      monthly_contribution: preset.monthly_contribution,
      target_date: d.toISOString().slice(0, 10),
    });
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validateGoal() {
    if (form.name.trim().length < 2) return "Goal name must be at least 2 characters.";
    if (!Number.isFinite(form.target_amount) || form.target_amount <= 0) return "Target amount must be greater than 0.";
    if (!Number.isFinite(form.current_amount) || form.current_amount < 0) return "Current amount cannot be negative.";
    if (form.current_amount > form.target_amount) return "Current amount cannot exceed target amount.";
    if (!Number.isFinite(form.monthly_contribution) || form.monthly_contribution < 0) return "Monthly contribution cannot be negative.";
    if (!form.target_date) return "Choose a target date.";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${form.target_date}T00:00:00`);
    if (Number.isNaN(target.getTime()) || target <= today) return "Target date must be in the future.";
    return "";
  }

  async function submit(event) {
    event.preventDefault();
    const validation = validateGoal();
    if (validation) {
      setFormError(validation);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (editingGoalName) {
        await updateGoal(editingGoalName, {
          ...form,
          name: form.name.trim(),
        });
      } else {
        await addGoal({
          ...form,
          name: form.name.trim(),
        });
      }
      setShowForm(false);
      setEditingGoalName(null);
      setForm({
        name: "",
        target_amount: 150000,
        current_amount: 0,
        monthly_contribution: 10000,
        target_date: defaultTargetDate(),
        goal_type: "Custom",
      });
    } catch (error) {
      setFormError(error.message || "Could not create this goal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (deletingGoalName) {
      await deleteGoal(deletingGoalName);
      setDeletingGoalName(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Goals"
        title="Goal Planning & Feasibility Intelligence"
        subtitle="Transparent financial trajectory engine: Understand exactly what is happening now, what will happen at your current pace, and how to reach your targets."
        actions={
          <Button onClick={() => {
            setForm({ name: "", target_amount: 150000, current_amount: 0, monthly_contribution: 10000, target_date: defaultTargetDate(), goal_type: "Custom" });
            setEditingGoalName(null);
            setShowForm(true);
          }}>
            <Plus size={17} /> Create Goal
          </Button>
        }
      />

      <section className="goal-planner-grid">
        {(goals?.analysis || []).length ? (goals.analysis || []).map((goal) => {
          const deficit = goal.monthly_deficit ?? Math.max(0, (goal.required_monthly || 0) - (goal.planned_monthly || 0));
          const projected = goal.projected_amount_at_deadline ?? Math.min(goal.target_amount, goal.current_amount + ((goal.monthly_contribution || 0) * (goal.target_months || 12)));
          const shortfall = goal.shortfall ?? Math.max(0, goal.target_amount - projected);
          const delayMonths = goal.delay_months ?? Math.max(0, (goal.expected_months || goal.target_months || 12) - (goal.target_months || 12));
          const isOnTrack = goal.achievement_probability >= 70;

          const pathASip = Math.round(deficit);
          const pathBSip = Math.round(deficit * 0.5);
          const pathBCut = Math.round(deficit * 0.5);

          return (
            <Card key={goal.name} style={{ position: "relative" }}>
              {/* Top Right 3-Dot Action Menu */}
              <div style={{ position: "absolute", top: "16px", right: "16px" }} className="card-header-actions">
                <button
                  className="icon-button"
                  aria-label="Goal Options"
                  onClick={() => setActiveMenuGoal(activeMenuGoal === goal.name ? null : goal.name)}
                >
                  <MoreVertical size={18} />
                </button>
                {activeMenuGoal === goal.name && (
                  <div className="dropdown-menu">
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setForm({
                          name: goal.name || "",
                          target_amount: goal.target_amount || 0,
                          current_amount: goal.current_amount || 0,
                          monthly_contribution: goal.monthly_contribution || 0,
                          target_date: goal.target_date || defaultTargetDate(),
                          goal_type: goal.goal_type || "Custom",
                        });
                        setEditingGoalName(goal.name);
                        setShowForm(true);
                        setActiveMenuGoal(null);
                      }}
                    >
                      <Pencil size={14} /> Edit Goal
                    </button>
                    <button
                      className="dropdown-item danger"
                      onClick={() => {
                        setDeletingGoalName(goal.name);
                        setActiveMenuGoal(null);
                      }}
                    >
                      <Trash2 size={14} /> Delete Goal
                    </button>
                  </div>
                )}
              </div>

              <div className="goal-head" style={{ paddingRight: "40px" }}>
                <div>
                  <Badge tone={isOnTrack ? "success" : "warning"}>
                    {isOnTrack ? "On Track" : "Needs Attention"}
                  </Badge>
                  <h2 style={{ margin: "6px 0 2px" }}>{goal.name}</h2>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Target Date: {goal.target_date}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong style={{ fontSize: "22px", color: isOnTrack ? "var(--accent-success)" : "var(--accent-warning)" }}>
                    {goal.achievement_probability}%
                  </strong>
                  <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)" }}>Feasibility</span>
                </div>
              </div>

              <Progress value={goal.achievement_probability} tone={isOnTrack ? "success" : "warning"} />

              {/* SECTION 1: WHAT IS HAPPENING NOW */}
              <div style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "12px 14px",
                margin: "14px 0 10px"
              }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)", marginBottom: "8px" }}>
                  Current:
                </div>
                <div className="grid-3" style={{ gap: "10px", fontSize: "12px" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block" }}>Target Amount</span>
                    <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>{currency(goal.target_amount)}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block" }}>Saved So Far</span>
                    <strong style={{ fontSize: "14px", color: "var(--accent-success)" }}>{currency(goal.current_amount)}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block" }}>Monthly Contribution</span>
                    <strong style={{ fontSize: "14px", color: "var(--accent)" }}>{currency(goal.monthly_contribution)}/mo</strong>
                  </div>
                </div>
                <p style={{ margin: "10px 0 0", fontSize: "12px", color: "var(--text-secondary)", borderTop: "1px solid var(--border-color)", paddingTop: "8px" }}>
                  At your current rate of <strong>{currency(goal.monthly_contribution)}/mo</strong>, you will reach <strong>{currency(projected)}</strong> by your target date of {goal.target_date}
                  {shortfall > 0 ? ` (shortfall of ${currency(shortfall)}).` : ` (100% funded).`}
                </p>
              </div>

              {/* SECTION 2: WHAT WILL HAPPEN */}
              <div style={{
                background: isOnTrack ? "rgba(16, 185, 129, 0.05)" : "rgba(245, 158, 11, 0.06)",
                border: `1px solid ${isOnTrack ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.25)"}`,
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "14px"
              }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: isOnTrack ? "var(--accent-success)" : "var(--accent-warning)", marginBottom: "6px" }}>
                  Projection:
                </div>
                {isOnTrack ? (
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-primary)" }}>
                    <strong>Right on Schedule:</strong> At your current contribution pace, you will fully achieve this goal in <strong>{goal.expected_months || goal.target_months} months</strong>, meeting your deadline comfortably.
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-primary)" }}>
                    <strong>Timeline Delay:</strong> At your current contribution of {currency(goal.monthly_contribution)}/mo, this goal will take <strong>{goal.expected_months} months</strong> to reach {currency(goal.target_amount)} — which is <strong>{delayMonths} months later</strong> than your intended target date of {goal.target_date}.
                  </p>
                )}
              </div>

              {/* SECTION 3: STRATEGIC ACTION PATHS (DISTINCT OPTIONS) */}
              {!isOnTrack && (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
                    Choose a Strategy:
                  </div>

                  <div className="option-grid" style={{ display: "grid", gap: "10px" }}>
                    {/* PATH A: Full Catch-up */}
                    <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      <div>
                        <strong style={{ fontSize: "13px", color: "var(--accent)" }}>Path A: Full Target Catch-Up</strong>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                          Increase monthly saving by <strong>+{currency(pathASip)}/mo</strong> (Total: {currency(goal.required_monthly)}/mo) to finish exactly on time by {goal.target_date}.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        style={{ flexShrink: 0 }}
                        onClick={() => navigate('/simulator', {
                          state: {
                            target_goal_name: goal.name,
                            scenario: {
                              name: `Accelerate ${goal.name}`,
                              scenario_type: "Increase SIP",
                              target_goal_name: goal.name,
                              extra_monthly_investment: pathASip,
                              income_change: 0,
                              expense_change: 0,
                              new_monthly_loan_payment: 0
                            }
                          }
                        })}
                      >
                        <Play size={13} /> Test Path A
                      </Button>
                    </div>

                    {/* PATH B: Balanced 50/50 */}
                    <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      <div>
                        <strong style={{ fontSize: "13px", color: "var(--accent-success)" }}>Path B: Balanced 50/50 Strategy</strong>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                          Boost SIP by <strong>+{currency(pathBSip)}/mo</strong> and trim non-essential wants by <strong>-{currency(pathBCut)}/mo</strong> without needing new income.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        style={{ flexShrink: 0 }}
                        onClick={() => navigate('/simulator', {
                          state: {
                            target_goal_name: goal.name,
                            scenario: {
                              name: `Balanced Diet for ${goal.name}`,
                              scenario_type: "Multi-Factor Adjustment",
                              target_goal_name: goal.name,
                              extra_monthly_investment: pathBSip,
                              expense_change: -pathBCut,
                              income_change: 0,
                              new_monthly_loan_payment: 0
                            }
                          }
                        })}
                      >
                        <Play size={13} /> Test Path B
                      </Button>
                    </div>

                    {/* PATH C: Timeline Realignment */}
                    <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      <div>
                        <strong style={{ fontSize: "13px", color: "var(--text-muted)" }}>Path C: Timeline Extension (₹0 Extra)</strong>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                          Keep your current <strong>{currency(goal.monthly_contribution)}/mo</strong> contribution. Extend target horizon by {delayMonths} months to finish safely without cash strain.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        style={{ flexShrink: 0 }}
                        onClick={() => {
                          setForm(goal);
                          setEditingGoalName(goal.name);
                          setShowForm(true);
                        }}
                      >
                        Adjust Date
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        }) : (
          <EmptyState title="No financial goals yet" detail="Create your first goal to calculate feasibility and milestones." />
        )}
      </section>

      {showForm && (
        <div className="modal-backdrop" onClick={() => { setShowForm(false); setEditingGoalName(null); }}>
          <div
            className="modal-wrapper"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px", width: "100%", position: "relative" }}
          >
            <Card className="modal-card" style={{ width: "100%" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div className="section-title" style={{ margin: 0 }}>
                  {editingGoalName ? "Edit Financial Goal" : "Create New Financial Goal"}
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => { setShowForm(false); setEditingGoalName(null); }}
                  title="Close"
                  style={{ padding: "6px" }}
                >
                  ✕
                </button>
              </div>

              {!editingGoalName && (
                <div style={{ marginBottom: "16px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Quick Templates with Tailored Indian Benchmarks:
                  </span>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {GOAL_PRESETS.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="secondary"
                        type="button"
                        style={{ fontSize: "11px", padding: "4px 10px", height: "auto" }}
                        onClick={() => applyPreset(preset)}
                      >
                        {preset.name} ({currency(preset.target_amount)})
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <form className="form-grid" onSubmit={submit}>
                <Field label="Goal name">
                  <input
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="Emergency fund, Bike, MBA, Vacation..."
                    required
                  />
                </Field>
                <Field label="Goal type">
                  <select value={form.goal_type} onChange={(event) => update("goal_type", event.target.value)}>
                    {["Custom", "Emergency", "Education", "Vehicle", "Home", "Travel", "Investment", "Retirement"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Target amount">
                  <NumberInput min="1" value={form.target_amount} onChange={(val) => update("target_amount", val)} required />
                </Field>
                <Field label="Current amount saved">
                  <NumberInput min="0" value={form.current_amount} onChange={(val) => update("current_amount", val)} required />
                </Field>
                <Field label="Monthly contribution">
                  <NumberInput min="0" value={form.monthly_contribution} onChange={(val) => update("monthly_contribution", val)} required />
                </Field>
                <Field label="Target deadline">
                  <input
                    type="date"
                    value={form.target_date}
                    onInput={(event) => update("target_date", event.currentTarget.value)}
                    onChange={(event) => update("target_date", event.currentTarget.value)}
                    required
                  />
                </Field>
                {formError && <div className="inline-error form-wide">{formError}</div>}
                <div className="form-actions form-wide" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
                  <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditingGoalName(null); }} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : editingGoalName ? "Update Goal" : "Save Goal"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletingGoalName}
        title="Delete Financial Goal"
        message={`Are you sure you want to delete the goal "${deletingGoalName}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingGoalName(null)}
      />

      <QuickLinks links={[
        { to: '/forecast', icon: LineChart, label: 'Forecast', detail: 'See if goals fit your forecast' },
        { to: '/simulator', icon: CircleDollarSign, label: 'Simulator', detail: 'Test goal-related changes' },
        { to: '/health', icon: Activity, label: 'Health Score', detail: 'Impact on financial health' },
      ]} />
    </>
  );
}

function getInvestmentFlow(item) {
  if (item.flow_label && item.holding_type && (!item.monthly_contribution || item.monthly_contribution === 0)) {
    return {
      label: item.flow_label,
      value: item.holding_type,
      isRecurring: false,
    };
  }
  const ac = (item.asset_class || "").toLowerCase();
  const contrib = Number(item.monthly_contribution) || 0;

  if (ac.includes("fixed deposit") || ac === "fd") {
    return {
      label: item.flow_label || "Deposit Type",
      value: item.holding_type || "Term Deposit (Fixed)",
      isRecurring: false,
    };
  }
  if (ac.includes("gold")) {
    return {
      label: item.flow_label || "Holding Type",
      value: item.holding_type || "SGB / Bullion Asset",
      isRecurring: false,
    };
  }
  if (ac.includes("provident") || ac.includes("ppf") || ac.includes("epf")) {
    return contrib > 0
      ? { label: item.flow_label || "Monthly Contribution", value: `${currency(contrib)}/mo`, isRecurring: true }
      : { label: "Holding Type", value: item.holding_type || "Retirement Corpus", isRecurring: false };
  }
  if (ac.includes("mutual fund")) {
    return contrib > 0
      ? { label: item.flow_label || "Monthly SIP", value: `${currency(contrib)}/mo`, isRecurring: true }
      : { label: "Holding Type", value: item.holding_type || "Lump-sum Holding", isRecurring: false };
  }
  if (ac.includes("stock") || ac.includes("equity")) {
    return contrib > 0
      ? { label: item.flow_label || "Recurring Inflow", value: `${currency(contrib)}/mo`, isRecurring: true }
      : { label: "Holding Type", value: item.holding_type || "Direct Equity (Lump-sum)", isRecurring: false };
  }

  // Generic fallback
  if (contrib > 0) {
    return {
      label: item.flow_label || "Monthly Inflow",
      value: `${currency(contrib)}/mo`,
      isRecurring: true,
    };
  }
  return {
    label: item.flow_label || "Investment Mode",
    value: item.holding_type || "Lump-sum Holding",
    isRecurring: false,
  };
}

export function Investments() {
  const { investments, forecast, profile } = useFinance();
  const [allocView, setAllocView] = useState("current");
  const riskProfile = investments?.risk_profile || { appetite: profile?.risk_appetite || "Moderate" };

  const currentAllocation = investments?.allocation || [];
  const recommendedAllocation = investments?.recommended_allocation || [];

  const displayedAllocation = allocView === "recommended"
    ? (investments?.recommended_allocation || currentAllocation)
    : currentAllocation;

  const totalCurrentValue = useMemo(() => {
    return currentAllocation.reduce((sum, it) => sum + (Number(it.value) || 0), 0);
  }, [currentAllocation]);

  const totalRecommendedValue = useMemo(() => {
    return recommendedAllocation.reduce((sum, it) => sum + (Number(it.value) || 0), 0);
  }, [recommendedAllocation]);

  const allocationTableRows = useMemo(() => {
    return currentAllocation.map((cur, index) => {
      const rec = recommendedAllocation.find(
        (r) => r.name?.toLowerCase() === cur.name?.toLowerCase()
      ) || {};

      const curVal = Number(cur.value) || 0;
      const curPct = cur.pct != null ? Number(cur.pct) : (totalCurrentValue > 0 ? (curVal / totalCurrentValue) * 100 : 0);
      const recVal = Number(rec.value) || 0;
      const recPct = rec.pct != null ? Number(rec.pct) : (totalRecommendedValue > 0 ? (recVal / totalRecommendedValue) * 100 : 0);
      const drift = Number((curPct - recPct).toFixed(1));

      return {
        name: cur.name,
        color: getAssetColor(cur.name, index),
        currentValue: curVal,
        currentPct: Number(curPct.toFixed(1)),
        targetValue: recVal,
        targetPct: Number(recPct.toFixed(1)),
        drift,
      };
    });
  }, [currentAllocation, recommendedAllocation, totalCurrentValue, totalRecommendedValue]);

  const emergencyRunway = useMemo(() => {
    const ef = Number(profile?.emergency_fund) || 0;
    const savings = Number(profile?.savings_balance) || 0;
    // Canonical liquid reserves = max(emergency_fund, savings_balance)
    const liquidReserves = Math.max(ef, savings);
    const expList = profile?.detailed_expenses?.length ? profile.detailed_expenses : (profile?.monthly_expenses || []);
    let expTotal = expList.reduce((acc, item) => acc + (Number(item?.amount) || 0), 0);
    if (expTotal <= 0 && Number(profile?.monthly_income) > 0) {
      expTotal = Number(profile.monthly_income) * 0.70;
    }
    const debtEmi = Number(profile?.monthly_debt_payment) || 0;
    const monthlyBurn = Math.max(expTotal + debtEmi, 1);
    return (liquidReserves / monthlyBurn).toFixed(1);
  }, [profile]);

  return (
    <>
      <PageHeader
        eyebrow="Investments & Wealth Compounding"
        title="Portfolio & Asset Overview"
        subtitle="Dynamic risk-calibrated asset allocations and rebalancing tailored to your risk appetite and primary goal."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Badge tone={riskProfile.appetite === "Aggressive" ? "ai" : riskProfile.appetite === "Conservative" ? "warning" : "info"}>
              Risk Appetite: {riskProfile.appetite}
            </Badge>
            {profile?.primary_financial_goal && (
              <Badge tone="success">
                Goal: {profile.primary_financial_goal}
              </Badge>
            )}
          </div>
        }
      />
      <section className="metric-grid">
        <MetricCard icon={<WalletCards />} label="Total Investments" value={currency(investments.total)} detail="Asset portfolio" tone="success" />
        <MetricCard icon={<ShieldAlert />} label="Emergency Reserve" value={currency(profile?.emergency_fund || 0)} detail={`${emergencyRunway} mos runway · ${((profile?.emergency_fund || 0) / Math.max(1, (profile?.emergency_target || 200000)) * 100).toFixed(0)}% of target`} tone={Number(emergencyRunway) >= 6.0 ? "success" : (Number(emergencyRunway) >= 3.0 ? "info" : "warning")} />
        <MetricCard icon={<TrendingUp />} label="Monthly Contribution" value={currency(investments.monthly_contribution)} detail="Active SIP & Inflows" tone="info" />
        <MetricCard icon={<Activity />} label="Estimated Return" value={`${investments.estimated_return || 11.5}% p.a.`} detail={`${riskProfile.appetite} risk posture`} tone="ai" />
      </section>

      {/* Risk Strategy & Rebalancing Card */}
      <Card glow style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div className="section-title" style={{ marginBottom: "4px" }}><Sparkles /> Strategy: {riskProfile.strategy || "Balanced Growth & Managed Volatility"}</div>
            <p className="muted" style={{ margin: "4px 0 10px", fontSize: "14px" }}>{riskProfile.description || "Maintains an optimal blend of growth assets and defensive ballast."}</p>
          </div>
          <Badge tone="ai" style={{ fontSize: "12px" }}>
            {riskProfile.equity_target_pct ? `${riskProfile.equity_target_pct}% Growth / ${100 - riskProfile.equity_target_pct}% Defensive` : "Dynamic Target"}
          </Badge>
        </div>
        {investments.rebalancing_advice && (
          <div className="recommendation" style={{ marginTop: "10px" }}>
            <strong>AI Rebalancing Guidance:</strong> {investments.rebalancing_advice}
          </div>
        )}
      </Card>

      <section className="grid-2">
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
            <div className="section-title" style={{ margin: 0 }}>Asset allocation</div>
            <div style={{ display: "flex", gap: "6px" }}>
              <Button
                variant={allocView === "current" ? "primary" : "secondary"}
                onClick={() => setAllocView("current")}
                style={{ padding: "4px 8px", fontSize: "11px" }}
              >
                Current Portfolio
              </Button>
              <Button
                variant={allocView === "recommended" ? "primary" : "secondary"}
                onClick={() => setAllocView("recommended")}
                style={{ padding: "4px 8px", fontSize: "11px" }}
              >
                Recommended Target ({riskProfile.appetite})
              </Button>
            </div>
          </div>
          <p className="muted" style={{ fontSize: "12px", marginBottom: "8px" }}>
            {allocView === "current" ? "Actual distribution of your tracked holdings." : `Target optimal distribution for a ${riskProfile.appetite} investor.`}
          </p>
          <AllocationChart data={displayedAllocation} />

          {/* Asset Allocation Breakdown Table */}
          <div style={{ marginTop: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Asset Class</th>
                    <th style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: allocView === 'current' ? 'var(--accent)' : 'var(--text-secondary)',
                      background: allocView === 'current' ? 'rgba(59, 130, 246, 0.06)' : 'transparent'
                    }}>
                      Current {allocView === 'current' ? '●' : ''}
                    </th>
                    <th style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: allocView === 'recommended' ? 'var(--accent)' : 'var(--text-secondary)',
                      background: allocView === 'recommended' ? 'rgba(59, 130, 246, 0.06)' : 'transparent'
                    }}>
                      Target ({riskProfile.appetite}) {allocView === 'recommended' ? '●' : ''}
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Drift
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allocationTableRows.map((row) => {
                    let driftTone = '#10b981';
                    let driftBg = 'rgba(16, 185, 129, 0.1)';
                    let driftText = 'Balanced';
                    if (row.drift > 2.0) {
                      driftTone = '#f59e0b';
                      driftBg = 'rgba(245, 158, 11, 0.1)';
                      driftText = `+${row.drift}% (Over)`;
                    } else if (row.drift < -2.0) {
                      driftTone = '#3b82f6';
                      driftBg = 'rgba(59, 130, 246, 0.1)';
                      driftText = `${row.drift}% (Under)`;
                    }

                    return (
                      <tr key={row.name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: row.color,
                            display: 'inline-block',
                            boxShadow: `0 0 6px ${row.color}88`,
                            flexShrink: 0
                          }} />
                          <strong style={{ color: 'var(--text-primary)', fontSize: '12px' }}>{row.name}</strong>
                        </td>
                        <td style={{
                          padding: '8px 10px',
                          textAlign: 'right',
                          background: allocView === 'current' ? 'rgba(59, 130, 246, 0.04)' : 'transparent'
                        }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                            {currency(row.currentValue)}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {row.currentPct}%
                          </span>
                        </td>
                        <td style={{
                          padding: '8px 10px',
                          textAlign: 'right',
                          background: allocView === 'recommended' ? 'rgba(59, 130, 246, 0.04)' : 'transparent'
                        }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                            {currency(row.targetValue)}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {row.targetPct}%
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: driftTone,
                            padding: '2px 5px',
                            borderRadius: '4px',
                            background: driftBg,
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>
                            {driftText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--surface-hover)', fontWeight: 600, fontSize: '12px' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--text-primary)' }}>Total</td>
                    <td style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      background: allocView === 'current' ? 'rgba(59, 130, 246, 0.06)' : 'transparent'
                    }}>
                      <span style={{ color: 'var(--text-primary)', display: 'block' }}>{currency(totalCurrentValue)}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>100%</span>
                    </td>
                    <td style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      background: allocView === 'recommended' ? 'rgba(59, 130, 246, 0.06)' : 'transparent'
                    }}>
                      <span style={{ color: 'var(--text-primary)', display: 'block' }}>{currency(totalRecommendedValue)}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>100%</span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
                      Balanced
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </Card>
        <Card>
          <div className="section-title"><TrendingUp /> Growth Projection (24 Months)</div>
          <p className="muted" style={{ fontSize: "12px", margin: "-4px 0 12px" }}>
            Model assumptions: Modeled from monthly investable surplus additions ({currency(investments.monthly_contribution || 5000)}/mo) combined with an estimated {investments.estimated_return || 11.5}% p.a. diversified compounding yield.
          </p>
          <NetWorthChart data={forecast.months} />
        </Card>
      </section>
      <Card>
        <div className="section-title"><WalletCards /> Tracked Investment Holdings</div>
        <p className="muted" style={{ fontSize: "12px", margin: "-4px 0 16px" }}>
          Itemized breakdown of your portfolio with distinct current valuations, holding types, and active monthly SIP or recurring commitments.
        </p>
        <div>
          {Object.entries(
            investments.items.reduce((acc, item) => {
              const category = item.asset_class || "Other";
              if (!acc[category]) acc[category] = [];
              acc[category].push(item);
              return acc;
            }, {})
          ).map(([category, items]) => (
            <div key={category} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{category}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Total Balance: {currency(items.reduce((sum, i) => sum + (i.value || 0), 0))}
                </span>
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {items.map((item) => {
                  const flow = getInvestmentFlow(item);
                  return (
                    <div key={item.name} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--surface-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <strong style={{ fontSize: '14px', display: 'block', color: 'var(--text-primary)' }}>{item.name}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Asset Class: {item.asset_class}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Current Value</span>
                        <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{currency(item.value)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{flow.label}</span>
                        {flow.isRecurring ? (
                          <strong style={{ fontSize: '14px', color: 'var(--accent)' }}>{flow.value}</strong>
                        ) : (
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{flow.value}</span>
                        )}
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Expected Return</span>
                        <Badge tone="info">{item.expected_return}% p.a.</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <QuickLinks links={[
        { to: '/goals', icon: GoalIcon, label: 'Goals', detail: 'See goal feasibility' },
        { to: '/simulator', icon: CircleDollarSign, label: 'Simulator', detail: 'Test investment changes' },
        { to: '/forecast', icon: LineChart, label: 'Forecast', detail: 'Long-term net worth path' },
      ]} />
    </>
  );
}

function calculateStandardEmi(principal, annualRate, tenureMonths) {
  const p = Number(principal) || 0;
  const r = (Number(annualRate) || 0) / 1200;
  const n = Number(tenureMonths) || 1;
  if (p <= 0 || n <= 0) return 0;
  if (r === 0) return Math.round(p / n);
  const emi = p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
}

function computeMonthsBetween(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 0) return 1;
  return Math.max(1, Math.round(diffDays / 30.4375));
}

function addMonthsToDate(startDateStr, months) {
  if (!startDateStr) return "";
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return "";
  const m = Number(months) || 0;
  const target = new Date(d);
  target.setMonth(target.getMonth() + m);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const day = String(target.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function deriveLoanTimeline(startDateStr, endDateStr, fallbackTenure = 12) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const start = startDateStr ? new Date(startDateStr) : today;
  const end = endDateStr ? new Date(endDateStr) : null;

  let totalTenure = Number(fallbackTenure) || 12;
  if (startDateStr && endDateStr) {
    totalTenure = computeMonthsBetween(startDateStr, endDateStr);
  }

  let elapsed = 0;
  let remaining = totalTenure;

  if (start > today) {
    elapsed = 0;
    remaining = totalTenure;
  } else {
    elapsed = Math.min(totalTenure, computeMonthsBetween(startDateStr, todayStr));
    if (end && today >= end) {
      remaining = 0;
      elapsed = totalTenure;
    } else {
      remaining = Math.max(0, totalTenure - elapsed);
    }
  }

  return { totalTenure, elapsed, remaining };
}

function getMonthsDifference(startDateStr) {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr);
  const now = new Date();
  if (isNaN(start.getTime())) return 0;
  const diffYears = now.getFullYear() - start.getFullYear();
  const diffMonths = now.getMonth() - start.getMonth();
  return Math.max(0, diffYears * 12 + diffMonths);
}

function getProjectedEndDate(remainingMonths) {
  const months = Number(remainingMonths) || 0;
  const target = new Date();
  target.setMonth(target.getMonth() + months);
  return target.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatReadableDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function getOrdinal(n) {
  const num = Number(n) || 0;
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return `${num}st`;
  }
  if (j === 2 && k !== 12) {
    return `${num}nd`;
  }
  if (j === 3 && k !== 13) {
    return `${num}rd`;
  }
  return `${num}th`;
}

function generateAmortizationPreview(outstanding, annualRate, emi, maxMonths = 360) {
  let bal = Math.round(Number(outstanding) || 0);
  if (bal <= 0) return [];

  const rate = Number(annualRate) || 0;
  const r = rate / 1200;
  let monthlyEmi = Math.round(Number(emi) || 0);

  // If monthly EMI cannot cover monthly interest, ensure a minimum viable payment to guarantee amortization
  const minInterest = Math.round(bal * r);
  if (monthlyEmi <= minInterest) {
    monthlyEmi = calculateStandardEmi(bal, rate, 12) || (minInterest + 1000);
  }

  const rows = [];
  const maxCount = Math.max(1, Math.min(480, Number(maxMonths) || 360));

  const today = new Date();
  const baseYear = today.getFullYear();
  const baseMonth = today.getMonth();

  for (let i = 1; i <= maxCount && bal > 0; i++) {
    const interest = Math.round(bal * r);
    let principal = Math.max(1, monthlyEmi - interest);
    let currentEmi = monthlyEmi;

    const rowDate = new Date(baseYear, baseMonth + i, 1);
    const monthName = rowDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    const fullMonthName = rowDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const ordinal = getOrdinal(i);

    // Final month payoff check: when remaining balance is within monthly principal capacity
    if (bal <= principal || (bal + interest) <= monthlyEmi) {
      principal = bal;
      currentEmi = principal + interest;
      const startBal = bal;
      bal = 0;

      rows.push({
        month: i,
        ordinal,
        monthName,
        fullMonthName,
        label: `${ordinal} Month (${monthName})`,
        startBal,
        emi: currentEmi,
        interest,
        principal,
        endBal: 0,
        isFinal: true,
      });
      break;
    }

    const startBal = bal;
    const endBal = Math.max(0, bal - principal);
    bal = endBal;

    rows.push({
      month: i,
      ordinal,
      monthName,
      fullMonthName,
      label: `${ordinal} Month (${monthName})`,
      startBal,
      emi: currentEmi,
      interest,
      principal,
      endBal,
      isFinal: false,
    });
  }
  return rows;
}

export function Debt() {
  const { debt, transactions, addDebt, updateDebt, deleteDebt, payDebtEmi, prepayDebt, processMonthlyDebts } = useFinance();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Pay Monthly EMI state
  const [payEmiTarget, setPayEmiTarget] = useState(null);
  const [payEmiAmount, setPayEmiAmount] = useState(0);
  const [payingEmi, setPayingEmi] = useState(false);

  // Prepayment state
  const [prepayTarget, setPrepayTarget] = useState(null);
  const [prepayAmount, setPrepayAmount] = useState(10000);
  const [prepayStrategy, setPrepayStrategy] = useState("reduce_tenure");
  const [prepaying, setPrepaying] = useState(false);

  // Amortization modal state
  const [activeAmortization, setActiveAmortization] = useState(null);

  // Transaction Ledger state
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactionLoanFilter, setTransactionLoanFilter] = useState("all");
  const [transactionSearch, setTransactionSearch] = useState("");

  // General processing & toast state
  const [savingDebt, setSavingDebt] = useState(false);
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState("");

  // Close modals on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (prepayTarget) setPrepayTarget(null);
        if (activeAmortization) setActiveAmortization(null);
        if (payEmiTarget) setPayEmiTarget(null);
        if (showAddModal) { setShowAddModal(false); setEditingId(null); }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prepayTarget, activeAmortization, payEmiTarget, showAddModal]);

  const currentYearMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, []);

  const [debtForm, setDebtForm] = useState({
    name: "",
    loan_type: "Personal Loan",
    lender: "",
    account_number: "",
    principal: 500000,
    outstanding: 400000,
    interest_rate: 10.5,
    interest_type: "Floating",
    total_tenure_months: 36,
    tenure_elapsed_months: 12,
    remaining_months: 24,
    emi: 16250,
    start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    end_date: addMonthsToDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), 36),
    emi_day: 5,
    is_secured: false,
    collateral: "",
    prepayment_penalty_pct: 0.0,
    linked_account: "",
    notes: "",
    auto_deduct: true,
  });

  const items = debt?.items || [];
  const payoff = useMemo(() => `${debt?.debt_free_months || 0} months`, [debt]);

  // Loan Transactions filtering
  const allTxns = useMemo(() => transactions?.transactions || [], [transactions]);

  const debtTransactions = useMemo(() => {
    return allTxns.filter((t) => {
      const cat = (t.category || "").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      return (
        cat.includes("emi") ||
        cat.includes("loan") ||
        cat.includes("debt") ||
        cat === "mandatory emi" ||
        cat === "extra loan repayment" ||
        cat === "extra debt prepayment" ||
        desc.includes("loan emi") ||
        desc.includes("prepayment") ||
        desc.includes("principal prepayment") ||
        items.some((item) => item.name && desc.toLowerCase().includes(item.name.toLowerCase()))
      );
    });
  }, [allTxns, items]);

  const filteredTransactions = useMemo(() => {
    let list = debtTransactions;
    if (transactionLoanFilter !== "all") {
      const filterTerm = transactionLoanFilter.toLowerCase();
      list = list.filter((t) => {
        const desc = (t.description || "").toLowerCase();
        const cat = (t.category || "").toLowerCase();
        return desc.includes(filterTerm) || cat.includes(filterTerm);
      });
    }
    if (transactionSearch.trim()) {
      const q = transactionSearch.toLowerCase().trim();
      list = list.filter((t) => {
        const desc = (t.description || "").toLowerCase();
        const cat = (t.category || "").toLowerCase();
        return desc.includes(q) || cat.includes(q) || String(t.amount || "").includes(q);
      });
    }
    return list;
  }, [debtTransactions, transactionLoanFilter, transactionSearch]);

  const totalDebtPaid = useMemo(() => {
    return debtTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [debtTransactions]);

  const totalPrincipalPrepaid = useMemo(() => {
    return debtTransactions
      .filter((t) => (t.category || "").toLowerCase().includes("prepayment") || (t.category || "").toLowerCase().includes("extra"))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [debtTransactions]);

  // Open Add Loan Modal with initial calculations
  function openAddModal() {
    setEditingId(null);
    const defPrincipal = 500000;
    const defRate = 10.5;
    const defTenure = 36;
    const startDt = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endDt = addMonthsToDate(startDt, defTenure);
    const { elapsed, remaining, totalTenure } = deriveLoanTimeline(startDt, endDt, defTenure);
    const defEmi = calculateStandardEmi(defPrincipal, defRate, totalTenure);

    setDebtForm({
      name: "",
      loan_type: "Personal Loan",
      lender: "",
      account_number: "",
      principal: defPrincipal,
      outstanding: Math.round(defPrincipal * 0.72),
      interest_rate: defRate,
      interest_type: "Floating",
      total_tenure_months: totalTenure,
      tenure_elapsed_months: elapsed,
      remaining_months: remaining,
      emi: defEmi,
      start_date: startDt,
      end_date: endDt,
      emi_day: 5,
      is_secured: false,
      collateral: "",
      prepayment_penalty_pct: 0.0,
      linked_account: "",
      notes: "",
      auto_deduct: true,
    });
    setShowAddModal(true);
  }

  // Open Edit Loan Modal
  function handleStartEdit(item) {
    setEditingId(item.id);
    const total = Number(item.total_tenure_months) || (Number(item.tenure_elapsed_months || 0) + Number(item.remaining_months || 12)) || 12;
    const startDt = item.start_date || new Date().toISOString().slice(0, 10);
    const endDt = item.end_date || addMonthsToDate(startDt, total);
    const { elapsed, remaining, totalTenure } = deriveLoanTimeline(startDt, endDt, total);

    setDebtForm({
      name: item.name || "",
      loan_type: item.loan_type || "Personal Loan",
      lender: item.lender || "",
      account_number: item.account_number || "",
      principal: item.principal || 0,
      outstanding: item.outstanding || 0,
      interest_rate: item.interest_rate || 10.0,
      interest_type: item.interest_type || "Floating",
      total_tenure_months: totalTenure,
      tenure_elapsed_months: elapsed,
      remaining_months: remaining,
      emi: item.emi || 0,
      start_date: startDt,
      end_date: endDt,
      emi_day: item.emi_day || 5,
      is_secured: Boolean(item.is_secured),
      collateral: item.collateral || "",
      prepayment_penalty_pct: Number(item.prepayment_penalty_pct) || 0.0,
      linked_account: item.linked_account || "",
      notes: item.notes || "",
      auto_deduct: item.auto_deduct !== false,
    });
    setShowAddModal(true);
  }

  // Handle auto-calculating EMI in form
  function handleAutoCalculateEmi() {
    const calc = calculateStandardEmi(debtForm.principal, debtForm.interest_rate, debtForm.total_tenure_months);
    if (calc > 0) {
      setDebtForm((prev) => ({ ...prev, emi: calc }));
      setFeedbackToast(`Calculated standard monthly EMI: ${currency(calc)}`);
      setTimeout(() => setFeedbackToast(""), 3500);
    }
  }

  // Handle start date change
  function handleStartDateChange(dateVal) {
    const startDt = dateVal;
    let endDt = debtForm.end_date;
    let total = Number(debtForm.total_tenure_months) || 12;

    if (endDt && new Date(endDt) > new Date(startDt)) {
      total = computeMonthsBetween(startDt, endDt);
    } else {
      endDt = addMonthsToDate(startDt, total);
    }

    const { elapsed, remaining, totalTenure } = deriveLoanTimeline(startDt, endDt, total);
    const calcEmi = calculateStandardEmi(debtForm.principal, debtForm.interest_rate, totalTenure);

    setDebtForm((prev) => ({
      ...prev,
      start_date: startDt,
      end_date: endDt,
      total_tenure_months: totalTenure,
      tenure_elapsed_months: elapsed,
      remaining_months: remaining,
      emi: calcEmi > 0 ? calcEmi : prev.emi,
    }));
  }

  // Handle end date change
  function handleEndDateChange(dateVal) {
    const endDt = dateVal;
    const startDt = debtForm.start_date || new Date().toISOString().slice(0, 10);
    const totalTenure = computeMonthsBetween(startDt, endDt);
    const { elapsed, remaining } = deriveLoanTimeline(startDt, endDt, totalTenure);
    const calcEmi = calculateStandardEmi(debtForm.principal, debtForm.interest_rate, totalTenure);

    setDebtForm((prev) => ({
      ...prev,
      end_date: endDt,
      total_tenure_months: totalTenure,
      tenure_elapsed_months: elapsed,
      remaining_months: remaining,
      emi: calcEmi > 0 ? calcEmi : prev.emi,
    }));
  }

  // Handle total tenure change
  function handleTotalTenureChange(totalMonths) {
    const total = Math.max(1, Number(totalMonths) || 1);
    const startDt = debtForm.start_date || new Date().toISOString().slice(0, 10);
    const endDt = addMonthsToDate(startDt, total);
    const { elapsed, remaining, totalTenure } = deriveLoanTimeline(startDt, endDt, total);
    const calcEmi = calculateStandardEmi(debtForm.principal, debtForm.interest_rate, totalTenure);

    setDebtForm((prev) => ({
      ...prev,
      total_tenure_months: totalTenure,
      end_date: endDt,
      tenure_elapsed_months: elapsed,
      remaining_months: remaining,
      emi: calcEmi > 0 ? calcEmi : prev.emi,
    }));
  }

  // Submit Add or Edit Loan
  async function handleSaveDebt(e) {
    e.preventDefault();
    if (!debtForm.name.trim()) return;
    setSavingDebt(true);
    try {
      const payload = {
        name: debtForm.name.trim(),
        loan_type: debtForm.loan_type,
        lender: debtForm.lender.trim(),
        account_number: debtForm.account_number.trim(),
        principal: Number(debtForm.principal) || 0,
        outstanding: Number(debtForm.outstanding) || Number(debtForm.principal) || 0,
        interest_rate: Number(debtForm.interest_rate) || 0,
        interest_type: debtForm.interest_type,
        total_tenure_months: Number(debtForm.total_tenure_months) || 12,
        tenure_elapsed_months: Number(debtForm.tenure_elapsed_months) || 0,
        remaining_months: Number(debtForm.remaining_months) || 12,
        emi: Number(debtForm.emi) || 0,
        start_date: debtForm.start_date,
        end_date: debtForm.end_date || addMonthsToDate(debtForm.start_date, debtForm.total_tenure_months),
        emi_day: Number(debtForm.emi_day) || 5,
        is_secured: Boolean(debtForm.is_secured),
        collateral: debtForm.collateral.trim(),
        prepayment_penalty_pct: Number(debtForm.prepayment_penalty_pct) || 0.0,
        linked_account: debtForm.linked_account.trim(),
        notes: debtForm.notes.trim(),
        auto_deduct: Boolean(debtForm.auto_deduct),
        status: Number(debtForm.outstanding) <= 0 ? "paid_off" : "active",
      };

      if (editingId) {
        await updateDebt(editingId, payload);
        setFeedbackToast(`Updated "${debtForm.name.trim()}" successfully!`);
      } else {
        await addDebt(payload);
        setFeedbackToast(`Added "${debtForm.name.trim()}" successfully! Liabilities and loan schedule updated.`);
      }
      setShowAddModal(false);
      setEditingId(null);
      setTimeout(() => setFeedbackToast(""), 4000);
    } catch (err) {
      alert("Failed to save loan: " + err.message);
    } finally {
      setSavingDebt(false);
    }
  }

  // Open Pay Monthly EMI modal
  function openPayEmiModal(item) {
    setPayEmiTarget(item);
    setPayEmiAmount(Number(item.emi) || 0);
  }

  // Execute Pay Monthly EMI
  async function handleExecutePayEmi(e) {
    e.preventDefault();
    if (!payEmiTarget || Number(payEmiAmount) <= 0) return;
    setPayingEmi(true);
    try {
      const res = await payDebtEmi(payEmiTarget.id, {
        amount: Number(payEmiAmount),
        date: new Date().toISOString().slice(0, 10),
      });
      const receipt = res?.receipt || {};
      setFeedbackToast(
        `Recorded ${currency(payEmiAmount)} EMI payment for "${payEmiTarget.name}"! Principal reduced by ${currency(receipt.principal_reduction || 0)} (Interest: ${currency(receipt.interest_portion || 0)}).`
      );
      setPayEmiTarget(null);
      setTimeout(() => setFeedbackToast(""), 5000);
    } catch (err) {
      alert("Failed to record EMI payment: " + err.message);
    } finally {
      setPayingEmi(false);
    }
  }

  // Execute Principal Prepayment
  async function handlePrepay(e) {
    e.preventDefault();
    if (!prepayTarget || Number(prepayAmount) <= 0) return;
    setPrepaying(true);
    try {
      const validAmount = Math.min(Number(prepayAmount), Number(prepayTarget.outstanding));
      await prepayDebt(prepayTarget.id, validAmount, prepayStrategy);
      const stratMsg = prepayStrategy === "reduce_tenure" ? "shortened remaining loan tenure" : "recalculated lower monthly EMI";
      setFeedbackToast(`Applied ${currency(validAmount)} prepayment to "${prepayTarget.name}" and ${stratMsg}!`);
      setPrepayTarget(null);
      setTimeout(() => setFeedbackToast(""), 5000);
    } catch (err) {
      alert("Failed to apply prepayment: " + err.message);
    } finally {
      setPrepaying(false);
    }
  }

  // Trigger manual run of monthly auto-processing
  async function handleProcessMonthly() {
    setAutoProcessing(true);
    try {
      const res = await processMonthlyDebts();
      const count = res?.processed?.length || 0;
      if (count > 0) {
        setFeedbackToast(`Auto-processed ${count} scheduled monthly loan EMI payments!`);
      } else {
        setFeedbackToast("All active loans are already up-to-date for the current month!");
      }
      setTimeout(() => setFeedbackToast(""), 4500);
    } catch (err) {
      alert("Failed to process monthly debts: " + err.message);
    } finally {
      setAutoProcessing(false);
    }
  }

  // Delete Loan
  async function handleDelete(item) {
    if (!window.confirm(`Are you sure you want to remove "${item.name}"? This will update your total liabilities.`)) return;
    try {
      await deleteDebt(item.id);
      setFeedbackToast(`Removed "${item.name}". Total liabilities updated.`);
      setTimeout(() => setFeedbackToast(""), 4000);
    } catch (err) {
      alert("Failed to delete debt: " + err.message);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Debt & Loan Management"
        title="Loan Obligations & Monthly EMI Control"
        subtitle="Manage loan tenures, record scheduled monthly EMI payments, and automate monthly balance progression."
        actions={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <Button
              variant={showTransactions ? "primary" : "secondary"}
              onClick={() => setShowTransactions((prev) => !prev)}
              title="Toggle Debt & EMI Payment Ledger"
            >
              <Receipt size={16} />
              {showTransactions ? "Hide Payment History" : "View Payment History"}
              {debtTransactions.length > 0 && (
                <span
                  style={{
                    marginLeft: "6px",
                    background: showTransactions ? "rgba(255,255,255,0.25)" : "var(--accent)",
                    color: "#fff",
                    borderRadius: "10px",
                    padding: "1px 8px",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {debtTransactions.length}
                </span>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleProcessMonthly}
              disabled={autoProcessing}
              title="Check and advance monthly loan EMIs due this month"
            >
              <RefreshCw size={14} className={autoProcessing ? "spin" : ""} /> {autoProcessing ? "Processing..." : "Run Monthly Rollover"}
            </Button>
            <Button onClick={openAddModal}>
              <Plus size={16} /> Add Loan / Liability
            </Button>
          </div>
        }
      />

      {feedbackToast && (
        <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid var(--accent-success)", color: "var(--accent-success)", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle2 size={18} /> {feedbackToast}
        </div>
      )}

      {/* Top Metric Cards */}
      <section className="metric-grid">
        <MetricCard icon={<CreditCard />} label="Total Outstanding Debt" value={currency(debt?.total || 0)} detail="Active liability balance" tone="warning" />
        <MetricCard icon={<Calendar />} label="Total Monthly Outflow" value={currency(debt?.monthly_emi || 0)} detail="Scheduled monthly EMIs" tone="info" />
        <MetricCard icon={<Activity />} label="Debt-to-Income (DTI)" value={percent(debt?.debt_to_income || 0)} detail="Safer range is below 30%" tone={debt?.debt_to_income > 0.4 ? "danger" : "success"} />
        <MetricCard icon={<GoalIcon />} label="Estimated Debt-Free" value={payoff} detail="Based on active repayment schedule" tone="ai" />
      </section>

      {/* ─── 1. LOANS SECTION AT THE TOP (User requirement: display loans in the top) ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "24px 0 14px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Landmark size={20} color="var(--accent)" /> Active Loans & Liabilities
          </h2>
          <Badge tone={items.length > 0 ? "info" : "neutral"}>
            {items.length} {items.length === 1 ? "Obligation" : "Obligations"}
          </Badge>
        </div>
        {items.length > 0 && (
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>

          </span>
        )}
      </div>

      {items.length > 0 ? (
        <section className="debt-card-grid">
          {items.map((item) => {
            const elapsed = Number(item.tenure_elapsed_months) || 0;
            const remaining = Number(item.remaining_months) || 0;
            const totalTenure = Number(item.total_tenure_months) || (elapsed + remaining) || 12;
            const tenurePct = totalTenure > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalTenure) * 100))) : 0;
            const payoffDateStr = getProjectedEndDate(remaining);
            const isPaidThisMonth = item.last_payment_date === currentYearMonth;
            const isPaidOff = item.status === "paid_off" || Number(item.outstanding) <= 0;

            const extraEmiEstimate = Math.round((Number(item.emi) || 0) * 0.2) || 2000;
            const interestSavingsEstimate = Math.round((Number(item.outstanding) || 0) * ((Number(item.interest_rate) || 10) / 100) * 0.4);
            const monthsSavedEstimate = Math.min(Math.max(1, remaining - 2), Math.max(2, Math.round(remaining * 0.25)));

            const loanPaymentCount = debtTransactions.filter((t) => {
              const d = (t.description || "").toLowerCase();
              return d.includes(item.name.toLowerCase());
            }).length;

            return (
              <div key={item.id || item.name} className="debt-card-item" style={{ border: isPaidOff ? "1px solid var(--accent-success)" : "1px solid var(--border-color)" }}>
                {/* Card Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "18px", color: "var(--text-primary)" }}>{item.name}</strong>
                      <Badge tone="info">{item.loan_type || "Personal Loan"}</Badge>
                      <Badge tone={item.is_secured ? "info" : "warning"}>{item.is_secured ? "Secured" : "Unsecured"}</Badge>
                      <Badge tone="ai">{item.interest_type || "Floating"}</Badge>
                      {item.lender && <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>• {item.lender}</span>}
                      {item.account_number && <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono, monospace)" }}>• Ref: {item.account_number}</span>}
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px", display: "block" }}>
                      Disbursed {formatReadableDate(item.start_date)} • EMI Due: {item.emi_day || 5}th of every month {item.linked_account ? `• Debit from: ${item.linked_account}` : ""}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isPaidOff ? (
                      <Badge tone="success">Fully Paid Off</Badge>
                    ) : isPaidThisMonth ? (
                      <Badge tone="success">✓ EMI Paid for {currentMonthName.split(' ')[0]}</Badge>
                    ) : (
                      <Badge tone="warning">Upcoming EMI</Badge>
                    )}
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleStartEdit(item)}
                      title="Edit Loan Details"
                      style={{ padding: "6px" }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => handleDelete(item)}
                      title="Delete Loan Record"
                      style={{ padding: "6px" }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Tenure Counters */}
                <div style={{ margin: "14px 0 8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>
                    <span>
                      <strong style={{ color: "var(--text-primary)" }}>{elapsed} of {totalTenure} EMIs Paid</strong> ({tenurePct}% completed)
                    </span>
                    <span>
                      <strong style={{ color: "var(--accent)" }}>{remaining} months remaining</strong> (Finishes {payoffDateStr})
                    </span>
                  </div>
                  <Progress value={tenurePct} tone={isPaidOff ? "success" : "info"} />
                </div>

                {/* Metric Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "10px", fontSize: "14px", margin: "12px 0", background: "var(--surface-hover)", padding: "12px", borderRadius: "8px" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "11px", display: "block" }}>Outstanding Balance</span>
                    <strong style={{ fontSize: "16px", color: isPaidOff ? "var(--accent-success)" : "var(--text-primary)" }}>
                      {currency(item.outstanding)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "11px", display: "block" }}>Monthly EMI</span>
                    <strong style={{ fontSize: "16px", color: "var(--accent)" }}>{currency(item.emi)}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "11px", display: "block" }}>Original Principal</span>
                    <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>{currency(item.principal || item.outstanding)}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "11px", display: "block" }}>Interest Rate</span>
                    <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>{item.interest_rate}% {item.interest_type || "Floating"}</strong>
                  </div>
                </div>

                {/* Collateral & Terms Badges */}
                {(item.collateral || item.notes || item.prepayment_penalty_pct !== undefined) && (
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "12px", color: "var(--text-muted)", padding: "4px 0 8px" }}>
                    {item.collateral && <span><strong>Collateral:</strong> {item.collateral}</span>}
                    {item.prepayment_penalty_pct !== undefined && <span><strong>Prepayment:</strong> {item.prepayment_penalty_pct > 0 ? `${item.prepayment_penalty_pct}% fee` : "0% Foreclosure Penalty"}</span>}
                    {item.notes && <span><strong>Notes:</strong> {item.notes}</span>}
                  </div>
                )}

                {/* In-Line Tailored Payoff Suggestion */}
                {!isPaidOff && (
                  <div className="recommendation" style={{ marginTop: "8px", fontSize: "12px" }}>
                    <strong>Payoff Optimization:</strong> Adding <strong>{currency(extraEmiEstimate)}</strong> to your monthly installment saves approx. <strong>{currency(interestSavingsEstimate)}</strong> in total interest and cuts your repayment by <strong>{monthsSavedEstimate} months</strong>.
                  </div>
                )}

                {/* Actions Toolbar */}
                {!isPaidOff && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap", alignItems: "center" }}>
                    <Button
                      variant="primary"
                      onClick={() => openPayEmiModal(item)}
                      style={{ background: "var(--accent-success)", borderColor: "var(--accent-success)", fontSize: "13px", padding: "6px 14px" }}
                    >
                      <CreditCard size={15} /> Pay Monthly EMI ({currency(item.emi)})
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setPrepayTarget(item);
                        setPrepayAmount(Math.min(25000, Number(item.outstanding) || 25000));
                        setPrepayStrategy("reduce_tenure");
                      }}
                      style={{ fontSize: "13px", padding: "6px 14px" }}
                    >
                      <CircleDollarSign size={15} /> Prepay Principal
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setActiveAmortization(item)}
                      style={{ fontSize: "13px", padding: "6px 12px" }}
                    >
                      <SlidersHorizontal size={14} /> Schedule
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setTransactionLoanFilter(item.name);
                        setShowTransactions(true);
                      }}
                      style={{ fontSize: "13px", padding: "6px 12px" }}
                      title="View payment records for this loan"
                    >
                      <History size={14} /> Payments ({loanPaymentCount})
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ) : (
        <Card>
          <EmptyState
            title="No active loan or debt obligations"
            detail="You are currently debt-free! If you want to track a personal loan, home loan, vehicle loan, education loan, or credit card EMI, click 'Add Loan / Liability' above to monitor monthly EMIs and interest savings."
          />
        </Card>
      )}

      {/* ─── 2. TRANSACTION LIST & PAYMENT HISTORY (User requirement: appears on click of button) ─── */}
      {showTransactions && (
        <Card style={{ marginTop: "24px", marginBottom: "24px", border: "1px solid var(--accent)", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div className="section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Receipt color="var(--accent)" /> Debt Servicing & Payment History
              </div>
              <span style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px", display: "block" }}>
                Complete audit trail of all regular monthly EMI installments and extra principal prepayments logged into your ledger.
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Button variant="ghost" size="sm" onClick={() => setShowTransactions(false)}>
                <X size={15} /> Close History
              </Button>
            </div>
          </div>

          {/* Ledger Summary Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", background: "var(--surface-hover)", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border-color)", marginBottom: "16px" }}>
            <div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Total Debt Outflow</span>
              <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>{currency(totalDebtPaid)}</strong>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Principal Prepayments</span>
              <strong style={{ fontSize: "16px", color: "var(--accent-success)" }}>{currency(totalPrincipalPrepaid)}</strong>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Payments Logged</span>
              <strong style={{ fontSize: "16px", color: "var(--accent)" }}>{debtTransactions.length} Transactions</strong>
            </div>
          </div>

          {/* Filter Chips & Search */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", marginRight: "4px" }}>Filter Loan:</span>
              <button
                type="button"
                onClick={() => setTransactionLoanFilter("all")}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: transactionLoanFilter === "all" ? "1px solid var(--accent)" : "1px solid var(--border-color)",
                  background: transactionLoanFilter === "all" ? "var(--accent)" : "var(--bg-surface)",
                  color: transactionLoanFilter === "all" ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                All Loans ({debtTransactions.length})
              </button>
              {items.map((loan) => {
                const count = debtTransactions.filter((t) => (t.description || "").toLowerCase().includes(loan.name.toLowerCase())).length;
                const isSel = transactionLoanFilter === loan.name;
                return (
                  <button
                    key={loan.id || loan.name}
                    type="button"
                    onClick={() => setTransactionLoanFilter(isSel ? "all" : loan.name)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "12px",
                      fontWeight: 600,
                      borderRadius: "6px",
                      border: isSel ? "1px solid var(--accent)" : "1px solid var(--border-color)",
                      background: isSel ? "var(--accent)" : "var(--bg-surface)",
                      color: isSel ? "#fff" : "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    {loan.name} ({count})
                  </button>
                );
              })}
            </div>

            <div style={{ minWidth: "200px" }}>
              <input
                placeholder="Search payments..."
                value={transactionSearch}
                onChange={(e) => setTransactionSearch(e.target.value)}
                style={{ width: "100%", padding: "6px 12px", fontSize: "12px" }}
              />
            </div>
          </div>

          {/* Transactions Table */}
          {filteredTransactions.length > 0 ? (
            <div style={{ overflowX: "auto", maxHeight: "420px", overflowY: "auto", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-surface)" }}>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                    <th style={{ padding: "10px 14px" }}>Date</th>
                    <th style={{ padding: "10px 14px" }}>Description</th>
                    <th style={{ padding: "10px 14px" }}>Classification</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const isPrepay = (tx.category || "").toLowerCase().includes("prepayment") || (tx.category || "").toLowerCase().includes("extra");
                    return (
                      <tr key={tx.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                          {formatReadableDate(tx.date)}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <strong style={{ color: "var(--text-primary)" }}>{tx.description}</strong>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <Badge tone={isPrepay ? "ai" : "success"}>
                            {tx.category || (isPrepay ? "Principal Prepayment" : "Mandatory EMI")}
                          </Badge>
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "var(--accent-success)" }}>
                          {currency(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)" }}>
              <p style={{ margin: 0, fontSize: "14px" }}>
                No debt transactions found{transactionLoanFilter !== "all" ? ` for "${transactionLoanFilter}"` : ""}.
              </p>
              <span style={{ fontSize: "12px", marginTop: "4px", display: "block" }}>
                Whenever you record a scheduled monthly EMI or make an extra principal prepayment, it is automatically logged here.
              </span>
            </div>
          )}
        </Card>
      )}

      {/* ─── 3. AUTOMATIC MONTHLY PROGRESS BANNER ─── */}
      <Card style={{ marginBottom: "20px", background: "linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(16, 185, 129, 0.05))", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(59, 130, 246, 0.1)", color: "var(--accent)" }}>
              <Clock size={20} />
            </div>
            <div>
              <strong style={{ fontSize: "14px", color: "var(--text-primary)", display: "block" }}>
                Automatic Monthly Progression Active for {currentMonthName}
              </strong>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Loans with auto-deduct enabled automatically deduct their monthly EMI on their designated due date (1st–28th) and advance remaining tenure.
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleProcessMonthly} disabled={autoProcessing} style={{ fontSize: "12px" }}>
            <RefreshCw size={13} className={autoProcessing ? "spin" : ""} /> Check Monthly Status
          </Button>
        </div>
      </Card>

      <QuickLinks links={[
        { to: '/simulator', icon: CircleDollarSign, label: 'Simulator', detail: 'Test new loan payoff scenarios' },
        { to: '/health', icon: Activity, label: 'Health Score', detail: 'See debt burden impact' },
        { to: '/budget', icon: SlidersHorizontal, label: 'Budget', detail: 'Manage monthly cash flow' },
      ]} />

      {/* ─── 4. MODALS (All rendered inside .modal-backdrop for immediate popup overlay) ─── */}

      {/* Add / Edit Loan Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => { setShowAddModal(false); setEditingId(null); }}>
          <Card
            className="modal-card"
            style={{ maxWidth: "840px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
              <div className="section-title" style={{ margin: 0 }}>
                <CreditCard /> {editingId ? "Edit Loan Details & Repayment Schedule" : "Add Loan / Debt Obligation"}
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => { setShowAddModal(false); setEditingId(null); }}
                title="Close"
                style={{ padding: "6px" }}
              >
                <X size={18} />
              </button>
            </div>
            <p className="muted" style={{ margin: "0 0 16px", fontSize: "13px" }}>
              Configure your loan parameters. Enter how long the loan has been going, its total tenure, and monthly EMI. The system will track remaining tenure and auto-update every month.
            </p>

            <form onSubmit={handleSaveDebt} style={{ display: "grid", gap: "16px" }}>
              {/* 1. Loan Overview & Institution */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <Field label="Loan / Debt Name">
                  <input
                    required
                    placeholder="e.g. HDFC Home Loan, SBI Car Loan"
                    value={debtForm.name}
                    onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })}
                  />
                </Field>

                <Field label="Loan Category">
                  <select
                    value={debtForm.loan_type}
                    onChange={(e) => setDebtForm({ ...debtForm, loan_type: e.target.value })}
                  >
                    <option value="Personal Loan">Personal Loan</option>
                    <option value="Home Loan">Home Loan / Mortgage</option>
                    <option value="Car / Vehicle Loan">Car / Vehicle Loan</option>
                    <option value="Education Loan">Education Loan</option>
                    <option value="Credit Card EMI">Credit Card EMI</option>
                    <option value="Gold Loan">Gold Loan</option>
                    <option value="Business Loan">Business Loan</option>
                    <option value="Loan Against Property">Loan Against Property (LAP)</option>
                    <option value="Consumer Durable / BNPL">Consumer Durable / BNPL</option>
                  </select>
                </Field>

                <Field label="Lender / Bank Institution">
                  <input
                    placeholder="e.g. State Bank of India, HDFC Bank, ICICI, Bajaj"
                    value={debtForm.lender}
                    onChange={(e) => setDebtForm({ ...debtForm, lender: e.target.value })}
                  />
                </Field>

                <Field label="Loan Account / Ref # (Optional)">
                  <input
                    placeholder="e.g. SBIN-HL-8842 / Masked Ref"
                    value={debtForm.account_number}
                    onChange={(e) => setDebtForm({ ...debtForm, account_number: e.target.value })}
                  />
                </Field>
              </div>

              {/* 2. Financial Amounts & Interest Rate Structure */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                <Field label="Original Principal Amount (₹)">
                  <NumberInput
                    required
                    min="1000"
                    value={debtForm.principal}
                    onChange={(val) => {
                      const p = Number(val) || 0;
                      const emi = calculateStandardEmi(p, debtForm.interest_rate, debtForm.total_tenure_months);
                      setDebtForm({ ...debtForm, principal: p, emi: emi > 0 ? emi : debtForm.emi });
                    }}
                  />
                </Field>

                <Field label="Annual Interest Rate (% p.a.)">
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={debtForm.interest_rate}
                    onChange={(e) => {
                      const rate = Number(e.target.value) || 0;
                      const emi = calculateStandardEmi(debtForm.principal, rate, debtForm.total_tenure_months);
                      setDebtForm({ ...debtForm, interest_rate: rate, emi: emi > 0 ? emi : debtForm.emi });
                    }}
                  />
                </Field>

                <Field label="Interest Rate Type">
                  <select
                    value={debtForm.interest_type}
                    onChange={(e) => setDebtForm({ ...debtForm, interest_type: e.target.value })}
                  >
                    <option value="Floating">Floating (Repo / Benchmark Linked)</option>
                    <option value="Fixed">Fixed Rate</option>
                  </select>
                </Field>

                <Field label="Current Outstanding Balance (₹)">
                  <NumberInput
                    required
                    min="0"
                    value={debtForm.outstanding}
                    onChange={(val) => setDebtForm({ ...debtForm, outstanding: val })}
                  />
                </Field>
              </div>

              {/* 3. Tenure & Timeline */}
              <div style={{ background: "var(--surface-hover)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border-color)", display: "grid", gap: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <strong style={{ fontSize: "14px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Clock size={16} color="var(--accent)" /> Loan Tenure & Timeline Tracking
                  </strong>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", marginRight: "2px" }}>Tenure Presets:</span>
                    {[6, 12, 24, 36, 60, 84, 120, 180, 240].map((m) => {
                      const isSelected = Number(debtForm.total_tenure_months) === m;
                      const label = m < 12 ? `${m}m` : `${m / 12}y`;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleTotalTenureChange(m)}
                          style={{
                            padding: "3px 9px",
                            fontSize: "11px",
                            fontWeight: 600,
                            borderRadius: "6px",
                            border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border-color)",
                            background: isSelected ? "var(--accent)" : "var(--bg-surface)",
                            color: isSelected ? "#fff" : "var(--text-secondary)",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                  <Field label="Loan Start Date">
                    <input
                      type="date"
                      required
                      value={debtForm.start_date}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                  </Field>

                  <Field label="Loan End Date (Payoff Date)">
                    <input
                      type="date"
                      required
                      value={debtForm.end_date}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                    />
                  </Field>

                  <Field label="Total Loan Tenure (Months)">
                    <input
                      type="number"
                      min="1"
                      required
                      value={debtForm.total_tenure_months}
                      onChange={(e) => handleTotalTenureChange(e.target.value)}
                    />
                  </Field>
                </div>

                <div style={{ background: "var(--bg-surface)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-color)", display: "grid", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", fontSize: "12px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <Badge tone="info">
                        Elapsed: {debtForm.tenure_elapsed_months} months ({debtForm.tenure_elapsed_months} EMIs already paid)
                      </Badge>
                      <Badge tone="warning">
                        Remaining: {debtForm.remaining_months} months (Est. payoff: {formatReadableDate(debtForm.end_date) || getProjectedEndDate(debtForm.remaining_months)})
                      </Badge>
                    </div>
                    <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                      {debtForm.total_tenure_months > 0
                        ? `${Math.min(100, Math.round(((debtForm.tenure_elapsed_months || 0) / debtForm.total_tenure_months) * 100))}% elapsed`
                        : "0%"}
                    </span>
                  </div>
                  <Progress
                    value={debtForm.total_tenure_months > 0 ? ((debtForm.tenure_elapsed_months || 0) / debtForm.total_tenure_months) * 100 : 0}
                    tone={debtForm.remaining_months === 0 ? "success" : "info"}
                  />
                </div>
              </div>

              {/* 4. Collateral & Security Details */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", background: "var(--surface-hover)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={debtForm.is_secured}
                      onChange={(e) => setDebtForm({ ...debtForm, is_secured: e.target.checked })}
                      style={{ width: "18px", height: "18px", accentColor: "var(--accent)" }}
                    />
                    Secured Loan (Backed by Collateral / Asset)
                  </label>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {debtForm.is_secured ? "Collateral pledge reduces lender risk and interest spread." : "Unsecured borrowing (clean line of credit, higher default risk weighting)."}
                  </span>
                </div>

                {debtForm.is_secured && (
                  <Field label="Collateral / Asset Description">
                    <input
                      placeholder="e.g. Residential Apartment Flat 402, Vehicle RC, Gold 22K"
                      value={debtForm.collateral}
                      onChange={(e) => setDebtForm({ ...debtForm, collateral: e.target.value })}
                    />
                  </Field>
                )}

                <Field label="Prepayment / Foreclosure Fee (% or 0)">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={debtForm.prepayment_penalty_pct}
                    onChange={(e) => setDebtForm({ ...debtForm, prepayment_penalty_pct: e.target.value })}
                    placeholder="0.0% (RBI mandates 0% on floating retail loans)"
                  />
                </Field>
              </div>

              {/* 5. Monthly EMI, Servicing & Automation */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", alignItems: "flex-end" }}>
                <Field label="Monthly EMI (₹)">
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                      <NumberInput
                        required
                        min="100"
                        value={debtForm.emi}
                        onChange={(val) => setDebtForm({ ...debtForm, emi: val })}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAutoCalculateEmi}
                      title="Calculate exact standard EMI from principal, rate & tenure"
                      style={{
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        minHeight: "44px",
                        height: "44px",
                        padding: "0 14px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        fontSize: "13px",
                        fontWeight: 600
                      }}
                    >
                      <Calculator size={15} /> Auto-Calculate
                    </button>
                  </div>
                </Field>

                <Field label="EMI Due Day of Month (1 - 28)">
                  <NumberInput
                    min="1"
                    max="28"
                    required
                    value={debtForm.emi_day}
                    onChange={(val) => setDebtForm({ ...debtForm, emi_day: Math.min(28, Math.max(1, Number(val) || 5)) })}
                  />
                </Field>

                <Field label="Linked Bank Account for EMI Debit">
                  <input
                    placeholder="e.g. Salary Account - HDFC (XXXX-9120)"
                    value={debtForm.linked_account}
                    onChange={(e) => setDebtForm({ ...debtForm, linked_account: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Notes / Tax Benefit Purpose (Optional)">
                <input
                  placeholder="e.g. Tax exemption under Sec 24(b) / 80E, joint borrower, repo rate linked"
                  value={debtForm.notes}
                  onChange={(e) => setDebtForm({ ...debtForm, notes: e.target.value })}
                />
              </Field>

              <div style={{ paddingBottom: "6px" }}>
                <label style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  userSelect: "none",
                  lineHeight: "1.4"
                }}>
                  <input
                    type="checkbox"
                    checked={debtForm.auto_deduct}
                    onChange={(e) => setDebtForm({ ...debtForm, auto_deduct: e.target.checked })}
                    style={{
                      width: "18px",
                      height: "18px",
                      minHeight: "18px",
                      maxHeight: "18px",
                      accentColor: "var(--accent)",
                      cursor: "pointer",
                      margin: 0,
                      flexShrink: 0
                    }}
                  />
                  <span>Automatically update tenure & log monthly EMI on due date (NACH / e-Mandate)</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <Button type="button" variant="ghost" onClick={() => { setShowAddModal(false); setEditingId(null); }} disabled={savingDebt}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingDebt}>
                  {savingDebt ? "Saving..." : editingId ? "Update Loan" : "Save Loan Obligation"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Pay Monthly EMI Modal */}
      {payEmiTarget && (
        <div className="modal-backdrop" onClick={() => setPayEmiTarget(null)}>
          <Card
            className="modal-card"
            style={{ maxWidth: "640px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
              <div className="section-title" style={{ margin: 0 }}>
                <CreditCard color="var(--accent-success)" /> Record Scheduled Monthly EMI Payment: {payEmiTarget.name}
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setPayEmiTarget(null)}
                title="Close"
                style={{ padding: "6px" }}
              >
                <X size={18} />
              </button>
            </div>
            <p className="muted" style={{ margin: "4px 0 16px", fontSize: "13px" }}>
              Record this month's loan installment. FinGear calculates the exact interest and principal repayment breakdown, updates your remaining balance, and logs the payment into your expense ledger.
            </p>

            <form onSubmit={handleExecutePayEmi} style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", background: "var(--surface-hover)", padding: "14px", borderRadius: "8px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Billing Cycle</span>
                  <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>{currentMonthName}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Due Day</span>
                  <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>{payEmiTarget.emi_day || 5}th of Month</strong>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Current Balance</span>
                  <strong style={{ fontSize: "14px", color: "var(--accent-warning)" }}>{currency(payEmiTarget.outstanding)}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Interest Portion</span>
                  <strong style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                    {currency(Math.round(payEmiTarget.outstanding * ((payEmiTarget.interest_rate || 10) / 1200)))}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Principal Repaid</span>
                  <strong style={{ fontSize: "14px", color: "var(--accent-success)" }}>
                    {currency(Math.max(0, Math.round(payEmiAmount - (payEmiTarget.outstanding * ((payEmiTarget.interest_rate || 10) / 1200)))))}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>New Balance After Pay</span>
                  <strong style={{ fontSize: "14px", color: "var(--accent)" }}>
                    {currency(Math.max(0, Math.round(payEmiTarget.outstanding - Math.max(0, payEmiAmount - (payEmiTarget.outstanding * ((payEmiTarget.interest_rate || 10) / 1200))))))}
                  </strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <Field label="Monthly EMI Amount (₹)" style={{ minWidth: "200px" }}>
                  <NumberInput
                    required
                    min="1"
                    value={payEmiAmount}
                    onChange={(val) => setPayEmiAmount(val)}
                  />
                </Field>

                <Button type="submit" disabled={payingEmi} style={{ background: "var(--accent-success)", borderColor: "var(--accent-success)" }}>
                  {payingEmi ? "Processing Payment..." : `Confirm & Pay ${currency(payEmiAmount)}`}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setPayEmiTarget(null)} disabled={payingEmi}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Prepayment Modal */}
      {prepayTarget && (
        <div className="modal-backdrop" onClick={() => setPrepayTarget(null)}>
          <Card
            className="modal-card"
            style={{ maxWidth: "620px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
              <div>
                <div className="section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <CircleDollarSign color="var(--accent)" /> Extra Principal Prepayment
                </div>
                <span style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px", display: "block" }}>
                  Loan: <strong style={{ color: "var(--text-primary)" }}>{prepayTarget.name}</strong> • Current Outstanding: <strong style={{ color: "var(--accent-warning)" }}>{currency(prepayTarget.outstanding)}</strong>
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setPrepayTarget(null)}
                title="Close"
                style={{ padding: "6px" }}
              >
                <X size={18} />
              </button>
            </div>

            <p className="muted" style={{ margin: "4px 0 14px", fontSize: "13px" }}>
              Make a lump-sum payment straight towards your principal. Choose between accelerating payoff to finish months earlier or lowering subsequent monthly installments.
            </p>

            {/* Quick Presets */}
            <div style={{ marginBottom: "14px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", fontWeight: 600 }}>
                Quick Prepayment Presets:
              </span>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[10000, 25000, 50000, 100000].map((amt) => {
                  if (amt > prepayTarget.outstanding) return null;
                  return (
                    <button
                      key={amt}
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPrepayAmount(amt)}
                      style={{
                        fontSize: "12px",
                        padding: "4px 10px",
                        borderColor: prepayAmount === amt ? "var(--accent)" : undefined,
                        background: prepayAmount === amt ? "rgba(59, 130, 246, 0.15)" : undefined,
                        fontWeight: prepayAmount === amt ? 700 : 500,
                      }}
                    >
                      +{currency(amt)}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPrepayAmount(prepayTarget.outstanding)}
                  style={{
                    fontSize: "12px",
                    padding: "4px 10px",
                    color: "var(--accent-success)",
                    borderColor: prepayAmount === prepayTarget.outstanding ? "var(--accent-success)" : undefined,
                    fontWeight: 600,
                  }}
                >
                  Full Payoff ({currency(prepayTarget.outstanding)})
                </button>
              </div>
            </div>

            <form onSubmit={handlePrepay} style={{ display: "grid", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                <Field label="Prepayment Amount (₹)">
                  <NumberInput
                    required
                    value={prepayAmount}
                    onChange={(val) => setPrepayAmount(Math.min(prepayTarget.outstanding, Math.max(1, Number(val) || 0)))}
                    min="100"
                    max={prepayTarget.outstanding}
                  />
                </Field>

                <Field label="Prepayment Strategy">
                  <select
                    value={prepayStrategy}
                    onChange={(e) => setPrepayStrategy(e.target.value)}
                  >
                    <option value="reduce_tenure">Reduce Loan Tenure (Keep EMI same — Finish early)</option>
                    <option value="reduce_emi">Reduce Monthly EMI (Keep tenure same — Lower monthly cash burden)</option>
                  </select>
                </Field>
              </div>

              {/* Projected Payoff Impact Banner */}
              {(() => {
                const amt = Number(prepayAmount) || 0;
                const newBal = Math.max(0, prepayTarget.outstanding - amt);
                const rate = Number(prepayTarget.interest_rate) || 10;
                const remaining = Number(prepayTarget.remaining_months) || 12;
                const emi = Number(prepayTarget.emi) || 0;

                let estMonthsSaved = 0;
                let newEmi = emi;
                if (prepayStrategy === "reduce_tenure" && prepayTarget.outstanding > 0) {
                  const ratio = newBal / prepayTarget.outstanding;
                  const newMonths = Math.max(1, Math.round(remaining * ratio));
                  estMonthsSaved = Math.max(0, remaining - newMonths);
                } else if (prepayStrategy === "reduce_emi" && remaining > 0) {
                  const r = (rate / 100) / 12;
                  if (r > 0) {
                    newEmi = Math.round(newBal * (r * Math.pow(1 + r, remaining)) / (Math.pow(1 + r, remaining) - 1));
                  } else {
                    newEmi = Math.round(newBal / remaining);
                  }
                }
                const estInterestSaved = Math.round(amt * (rate / 100) * (remaining / 24));

                return (
                  <div style={{ background: "var(--surface-hover)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-color)", display: "grid", gap: "8px", fontSize: "13px" }}>
                    <strong style={{ color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Sparkles size={15} color="var(--accent)" /> Projected Payoff Impact
                    </strong>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", marginTop: "2px" }}>
                      <div>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>New Outstanding</span>
                        <strong style={{ fontSize: "14px", color: newBal === 0 ? "var(--accent-success)" : "var(--text-primary)" }}>
                          {currency(newBal)} {newBal === 0 && "(₹0 Debt Free!)"}
                        </strong>
                      </div>
                      {prepayStrategy === "reduce_tenure" ? (
                        <div>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Tenure Saved</span>
                          <strong style={{ fontSize: "14px", color: "var(--accent-success)" }}>
                            ~{estMonthsSaved} months earlier
                          </strong>
                        </div>
                      ) : (
                        <div>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>New Monthly EMI</span>
                          <strong style={{ fontSize: "14px", color: "var(--accent-success)" }}>
                            {currency(newEmi)}/mo
                          </strong>
                        </div>
                      )}
                      <div>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Est. Interest Saved</span>
                        <strong style={{ fontSize: "14px", color: "var(--accent)" }}>
                          ~{currency(estInterestSaved)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <Button type="button" variant="ghost" onClick={() => setPrepayTarget(null)} disabled={prepaying}>
                  Cancel
                </Button>
                <Button type="submit" disabled={prepaying || Number(prepayAmount) <= 0}>
                  {prepaying ? "Applying Prepayment..." : `Prepay ${currency(prepayAmount)} Principal`}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Amortization Schedule Modal */}
      {activeAmortization && (() => {
        const schedule = generateAmortizationPreview(
          activeAmortization.outstanding,
          activeAmortization.interest_rate,
          activeAmortization.emi,
          360
        );
        const totalInterest = schedule.reduce((sum, r) => sum + r.interest, 0);
        const totalOutflow = schedule.reduce((sum, r) => sum + r.emi, 0);
        const finalRow = schedule[schedule.length - 1];

        return (
          <div className="modal-backdrop" onClick={() => setActiveAmortization(null)}>
            <Card
              className="modal-card"
              style={{ maxWidth: "880px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <div className="section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <SlidersHorizontal /> Full Repayment Amortization Schedule
                  </div>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px", display: "block" }}>
                    Loan: <strong style={{ color: "var(--text-primary)" }}>{activeAmortization.name}</strong> • Current Balance: <strong style={{ color: "var(--accent-warning)" }}>{currency(activeAmortization.outstanding)}</strong> @ {activeAmortization.interest_rate}% p.a.
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setActiveAmortization(null)}
                  title="Close Schedule"
                  style={{ padding: "6px" }}
                >
                  <X size={18} />
                </button>
              </div>
              <p className="muted" style={{ fontSize: "12px", margin: "0 0 14px" }}>
                Complete month-by-month principal vs interest reduction schedule until final <strong>₹0 zero-balance payoff</strong> based on current outstanding balance of {currency(activeAmortization.outstanding)} at {activeAmortization.interest_rate}% p.a.
              </p>

              {/* Schedule Summary Banner */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", padding: "12px 14px", background: "var(--surface-hover)", borderRadius: "8px", border: "1px solid var(--border-color)", marginBottom: "14px", fontSize: "12px" }}>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Total Remaining Installments</span>
                  <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>{schedule.length} Months</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Total Remaining Interest</span>
                  <strong style={{ fontSize: "14px", color: "var(--accent)" }}>{currency(totalInterest)}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Total Repayment Outflow</span>
                  <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>{currency(totalOutflow)}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Final Payoff Date (Zero Balance)</span>
                  <strong style={{ fontSize: "14px", color: "var(--accent-success)" }}>
                    {finalRow?.monthName || "Paid Off"}
                  </strong>
                </div>
              </div>

              <div style={{ overflowX: "auto", maxHeight: "420px", overflowY: "auto", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg-surface)" }}>
                    <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                      <th style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>Installment / Month</th>
                      <th style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>Starting Balance</th>
                      <th style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>Monthly EMI</th>
                      <th style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>Interest Paid</th>
                      <th style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>Principal Repaid</th>
                      <th style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>Ending Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
                          No remaining installments — this loan obligation is fully paid off!
                        </td>
                      </tr>
                    ) : (
                      schedule.map((row) => (
                        <tr
                          key={row.month}
                          style={{
                            borderBottom: "1px solid var(--border-color)",
                            background: row.isFinal ? "rgba(16, 185, 129, 0.08)" : undefined
                          }}
                        >
                          <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                            <strong style={{ color: "var(--text-primary)" }}>{row.ordinal} Month</strong>
                            <span style={{ color: "var(--text-muted)", fontSize: "12px", marginLeft: "6px" }}>
                              ({row.monthName})
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px" }}>{currency(row.startBal)}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600 }}>{currency(row.emi)}</td>
                          <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{currency(row.interest)}</td>
                          <td style={{ padding: "10px 14px", color: "var(--accent-success)", fontWeight: 600 }}>{currency(row.principal)}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                            {row.isFinal ? (
                              <Badge tone="success">₹0 (Paid Off)</Badge>
                            ) : (
                              <span style={{ color: "var(--text-primary)" }}>{currency(row.endBal)}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
                <Button variant="secondary" onClick={() => setActiveAmortization(null)}>
                  Close Schedule
                </Button>
              </div>
            </Card>
          </div>
        );
      })()}
    </>
  );
}
