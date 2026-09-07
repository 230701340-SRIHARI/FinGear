import { Activity, Calendar, Check, CheckCircle2, CircleDollarSign, CreditCard, FileText, FileUp, Goal as GoalIcon, HelpCircle, Landmark, LineChart, MoreVertical, Pencil, Play, Plus, PlusCircle, RefreshCw, RotateCcw, ShieldAlert, SlidersHorizontal, Sparkles, Trash, Trash2, TrendingDown, TrendingUp, UploadCloud, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AllocationChart, NetWorthChart } from "../components/charts";
import { Badge, Button, Card, ConfirmModal, EmptyState, Field, MetricCard, NumberInput, PageHeader, Progress, QuickLinks } from "../components/ui";
import { useFinance } from "../context/FinanceContext";
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
  return { label: "Want", tone: "warning" };
}


export function Transactions() {
  const { 
    transactions, 
    recurring, 
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
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
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

  const recurringPresets = [
    { name: "House Rent", amount: 16000, category: "Rent", type: "expense", day_of_month: 1 },
    { name: "WiFi Broadband", amount: 999, category: "Utilities", type: "expense", day_of_month: 5 },
    { name: "Electricity Bill", amount: 1500, category: "Utilities", type: "expense", day_of_month: 10 },
    { name: "Index Fund SIP", amount: 5000, category: "Mutual Funds", type: "savings", day_of_month: 1 },
    { name: "Mandatory Loan EMI", amount: 8500, category: "Mandatory EMI", type: "expense", day_of_month: 5 },
  ];

  async function handleAddPreset(p) {
    await addRecurringTransaction(p);
    setRecurringFeedback(`✓ Added recurring commitment "${p.name}" (₹${p.amount.toLocaleString("en-IN")}/mo)!`);
    setTimeout(() => setRecurringFeedback(""), 5000);
  }

  async function handleProcessRecurring() {
    setProcessingRecurring(true);
    try {
      await processRecurring();
      setRecurringFeedback("✓ All due recurring commitments for this month verified and generated in your ledger!");
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
    setRecurringFeedback(`✓ Recurring commitment "${recurringForm.name}" created successfully!`);
    setTimeout(() => setRecurringFeedback(""), 5000);
    setRecurringForm({ name: "", amount: 16000, category: "Rent", type: "expense", day_of_month: 1 });
  }

  async function handleToggleRecurring(r) {
    await updateRecurringTransaction(r.id, { is_active: !r.is_active });
  }

  async function handleDeleteRecurring(id) {
    await deleteRecurringTransaction(id);
    setRecurringFeedback("✓ Recurring commitment removed.");
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

  // Form State
  const [form, setForm] = useState({
    amount: 1500,
    type: "expense",
    category: "Groceries",
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const activeRows = useMemo(() => {
    return (transactions.transactions || []).filter((txn) =>
      `${txn.description || ""} ${txn.category || ""}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [transactions.transactions, query]);

  const deletedRows = useMemo(() => {
    return deletedList.filter((txn) =>
      `${txn.description || ""} ${txn.category || ""}`.toLowerCase().includes(query.toLowerCase())
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
      setShowForm(false);
      setIncomePromptOpen(true);
    } else {
      await addTransaction(payload);
      resetForm();
    }
  }

  function resetForm() {
    setForm({
      amount: 1500,
      type: "expense",
      category: "Food",
      date: new Date().toISOString().slice(0, 10),
      description: "",
    });
    setAttachedBill(null);
    setShowForm(false);
    setIncomePromptOpen(false);
    setPendingIncomeForm(null);
  }

  async function handleIncomeChoice(addToSuite, applyToAllMonths) {
    if (!pendingIncomeForm) return;
    
    // Save transaction first
    await addTransaction(pendingIncomeForm);
    
    // Update profile monthly income suite if requested
    if (addToSuite) {
      await updateIncomeSuite(pendingIncomeForm.amount, applyToAllMonths);
    }
    
    resetForm();
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
        eyebrow="Transactions & Expense Tracker"
        title="Financial Transaction Management"
        subtitle="Manual expense inputs, PDF bill attachments, 60-day recovery trash bin, income suite updates & multi-phase anomaly detection."
        actions={
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Badge tone="ai">🤖 ML Anomaly Ensemble Active</Badge>
            <Button onClick={() => setShowForm(true)}>
              <Plus size={17} /> Add Transaction
            </Button>
          </div>
        }
      />

      <section className="metric-grid">
        <MetricCard icon={<Landmark />} label="Total Income" value={currency(transactions.summary.income)} detail="Tracked credit flows" tone="success" />
        <MetricCard icon={<CreditCard />} label="Total Expenses" value={currency(transactions.summary.expenses)} detail="Tracked debit flows" tone="warning" />
        <MetricCard icon={<Activity />} label="Net Monthly Surplus" value={currency(transactions.summary.net)} detail="Income minus expenses" tone="info" />
      </section>

      {/* Tabs for Active, Recurring, and Deleted */}
      <div className="tab-buttons" style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button
          className={`btn ${activeTab === "active" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("active")}
        >
          <CreditCard size={16} /> Active Ledger ({transactions.transactions?.length || 0})
        </button>
        <button
          className={`btn ${activeTab === "recurring" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("recurring")}
        >
          <Calendar size={16} /> Recurring Subscriptions & Bills ({recurring?.recurring?.length || 0})
        </button>
        <button
          className={`btn ${activeTab === "deleted" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("deleted")}
        >
          <RotateCcw size={16} /> Trash Bin (60-Day Recovery) ({deletedList.length})
        </button>
      </div>

      {recurringFeedback && (
        <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid var(--accent-success)", color: "var(--accent-success)", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", fontWeight: "600" }}>
          {recurringFeedback}
        </div>
      )}

      {activeTab === "active" ? (
        <Card>
          <div className="table-toolbar">
            <input
              placeholder="Search by description or category..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Badge tone="info">{activeRows.length} records</Badge>
          </div>

          {activeRows.length ? (
            <div className="data-table">
              {activeRows.map((txn) => (
                <article key={txn.id} className={txn.anomaly_flag ? "anomaly-row" : ""}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{txn.date}</span>
                  <div>
                    <strong>{txn.description}</strong>
                    {txn.bill_url && (
                      <a
                        href={txn.bill_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginLeft: "10px", fontSize: "12px", color: "var(--accent)" }}
                      >
                        <FileText size={13} /> Bill attached
                      </a>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{txn.category}</span>
                    <Badge tone={getCategoryTag(txn.category, txn.type).tone}>
                      {getCategoryTag(txn.category, txn.type).label}
                    </Badge>
                  </div>
                  <Badge tone={txn.type === "income" ? "success" : "warning"}>{txn.type}</Badge>
                  <b>{currency(txn.amount)}</b>

                  {/* Anomaly Badge & Action Controls */}
                  {txn.anomaly_flag && (
                    <Badge tone="danger" title={`Anomaly Score: ${((txn.anomaly_score || 0) * 100).toFixed(1)}%`}>
                      ⚠ Anomaly
                    </Badge>
                  )}

                  {txn.anomaly_flag && !txn.acknowledged ? (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className="icon-button"
                        style={{ color: "var(--accent-success)", border: "1px solid var(--accent-success)", borderRadius: "50%", width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                        title="Verify as Normal Transaction (Trains Model with this Data)"
                        onClick={() => acknowledgeAnomaly(txn.id)}
                      >
                        ✓
                      </button>
                      <button
                        className="icon-button"
                        style={{ color: "#f59e0b", border: "1px solid #f59e0b", borderRadius: "50%", width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                        title="Exclude from Model Training (Keeps in ledger, ignores for ML)"
                        onClick={() => excludeAnomaly(txn.id)}
                      >
                        ⊘
                      </button>
                      <button
                        className="icon-button"
                        style={{ color: "var(--accent-danger)", border: "1px solid var(--accent-danger)", borderRadius: "50%", width: "28px", height: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                        title="Remove Transaction (Prevents Model Pollution)"
                        onClick={() => setDeletingId(txn.id)}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="icon-button"
                      style={{ color: "var(--accent-danger)" }}
                      title="Delete Transaction"
                      onClick={() => setDeletingId(txn.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No active transactions" detail="Use the Add Transaction button to log your income and expenses." />
          )}
        </Card>
      ) : (
        /* Trash Bin 60-Day Window Tab */
        <Card>
          <div className="table-toolbar">
            <input
              placeholder="Search deleted transactions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Badge tone="warning">60-Day Auto-Purge Window</Badge>
          </div>

          {loadingDeleted ? (
            <p className="muted" style={{ padding: "16px" }}>Loading deleted transactions...</p>
          ) : deletedRows.length ? (
            <div className="data-table">
              {deletedRows.map((txn) => (
                <article key={txn.id} style={{ opacity: 0.85 }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Deleted: {txn.deleted_at ? new Date(txn.deleted_at).toLocaleDateString() : "Recently"}
                  </span>
                  <strong>{txn.description}</strong>
                  <span>{txn.category}</span>
                  <Badge tone={txn.type === "income" ? "success" : "warning"}>{txn.type}</Badge>
                  <b>{currency(txn.amount)}</b>
                  <Button
                    variant="secondary"
                    style={{ padding: "4px 10px", fontSize: "12px" }}
                    onClick={() => handleRestore(txn.id)}
                  >
                    <RotateCcw size={13} /> Restore
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Trash bin empty" detail="No transactions have been deleted in the last 60 days." />
          )}
        </Card>
      )}

      {/* Recurring Tab */}
      {activeTab === "recurring" && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px", marginBottom: "18px" }}>
            <div>
              <div className="section-title" style={{ margin: "0 0 6px" }}><Calendar /> Automated Monthly Outflows & Standing Instructions</div>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>
                Commitments like house rent, utility bills, and SIPs configured here are automatically logged each month on their due date—no manual re-entry required.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Button variant="secondary" onClick={handleProcessRecurring} disabled={processingRecurring}>
                <RefreshCw size={15} className={processingRecurring ? "spin" : ""} /> {processingRecurring ? "Processing..." : "Process Due Now"}
              </Button>
              <Button onClick={() => setShowRecurringModal(true)}>
                <Plus size={16} /> Add Recurring Commitment
              </Button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "12px 16px", borderRadius: "10px", marginBottom: "18px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
              Quick Templates (One-Click Setup):
            </span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {recurringPresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ border: "1px dashed var(--border-color)", fontSize: "12px" }}
                  onClick={() => handleAddPreset(preset)}
                >
                  + {preset.name} ({currency(preset.amount)} / {preset.day_of_month}st)
                </button>
              ))}
            </div>
          </div>

          {/* Recurring Items List */}
          {recurring?.recurring?.length ? (
            <div className="data-table">
              {recurring.recurring.map((item) => (
                <article key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                  <div>
                    <strong style={{ fontSize: "15px", display: "block" }}>{item.name}</strong>
                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                      Due on the {item.day_of_month}th of every month • {item.last_processed_date ? `Processed for ${item.last_processed_date}` : "Pending this cycle"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Badge tone={item.type === "savings" ? "success" : "info"}>{item.category}</Badge>
                    <b style={{ fontSize: "15px" }}>{currency(item.amount)}/mo</b>
                    <button
                      type="button"
                      className={`btn btn-sm ${item.is_active ? "btn-secondary" : "btn-ghost"}`}
                      style={{ fontSize: "12px" }}
                      onClick={() => handleToggleRecurring(item)}
                      title="Click to pause or resume"
                    >
                      {item.is_active ? "Active" : "Paused"}
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRecurring(item.id)} title="Delete recurring commitment">
                      <Trash2 size={15} color="var(--accent-danger)" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No recurring commitments configured"
              detail="Add house rent, internet, electricity bills, or monthly SIPs above to enable automatic monthly ledger tracking."
            />
          )}
        </Card>
      )}

      {/* Form Modal: Add Transaction with PDF Upload */}
      {showForm && (
        <Card className="modal-card">
          <div className="section-title"><PlusCircle /> Add Transaction Record</div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <Field label="Amount (₹)">
              <NumberInput min="1" value={form.amount} onChange={(val) => setForm({ ...form, amount: val })} required />
            </Field>

            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </Field>

            <Field label="Category (Mutually Exclusive Buckets)">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {form.type === "income" ? (
                  <optgroup label="Income Sources">
                    <option value="Salary">Salary</option>
                    <option value="Freelance">Freelance Payment</option>
                    <option value="Business">Business Income</option>
                    <option value="Rent Received">Rent Received</option>
                    <option value="Interest">Interest</option>
                    <option value="Bonus">Bonus</option>
                    <option value="Income">General Income</option>
                  </optgroup>
                ) : (
                  <>
                    <optgroup label="Needs (Fixed & Essential Outflows)">
                      <option value="Groceries">Groceries & Essentials</option>
                      <option value="Rent">Rent / Housing</option>
                      <option value="Utilities">Utilities & WiFi</option>
                      <option value="Transport">Fuel / Public Transport</option>
                      <option value="Healthcare">Healthcare & Medicines</option>
                      <option value="Insurance">Insurance Premium</option>
                      <option value="Education">Education & Tuition</option>
                      <option value="Mandatory EMI">Mandatory Loan EMI</option>
                    </optgroup>
                    <optgroup label="Wants (Discretionary Spending)">
                      <option value="Dining">Dining Out & Delivery</option>
                      <option value="Shopping">Shopping & Fashion</option>
                      <option value="Entertainment">Entertainment & OTT</option>
                      <option value="Travel">Travel & Hobbies</option>
                      <option value="Lifestyle">Lifestyle & Upgrades</option>
                      <option value="Other">Other Want</option>
                    </optgroup>
                    <optgroup label="Savings, Reserves & Wealth Building">
                      <option value="Emergency Fund">🛡️ Emergency Fund (Builds Runway & Reserve)</option>
                      <option value="Fixed Deposit">🏦 Fixed Deposit (FD)</option>
                      <option value="Mutual Funds">📈 Mutual Funds / SIP</option>
                      <option value="Stocks">📊 Stocks & Direct Equity</option>
                      <option value="Gold">🥇 Gold Holdings</option>
                      <option value="Provident Fund">🏛️ Provident Fund (PPF / EPF)</option>
                      <option value="Extra Loan Repayment">💳 Extra Loan Principal Repayment</option>
                    </optgroup>
                  </>
                )}
              </select>
            </Field>

            <Field label="Date">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </Field>

            <Field label="Description">
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. D-Mart Groceries, Salary..." required />
            </Field>

            {/* File Upload for Bill / Receipt */}
            <Field label="Attach Bill / Receipt (PDF or Image)">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input type="file" accept="application/pdf,image/*" onChange={handleFileUpload} disabled={fileUploading} />
                {fileUploading && <span style={{ fontSize: "12px", color: "var(--accent)" }}>Uploading...</span>}
              </div>
              {attachedBill && (
                <div style={{ fontSize: "12px", color: "var(--accent-success)", marginTop: "4px" }}>
                  ✓ {attachedBill.name} attached successfully!
                </div>
              )}
            </Field>

            <div className="form-actions form-wide">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit">Save Transaction</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Income Suite Interactive Prompts */}
      {incomePromptOpen && pendingIncomeForm && (
        <Card className="modal-card" glow>
          <div className="section-title"><Sparkles /> Income Suite Update</div>
          <p style={{ margin: "12px 0 20px" }}>
            You entered an income transaction of <strong>{currency(pendingIncomeForm.amount)}</strong> ({pendingIncomeForm.description}).
          </p>
          <p style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-primary)" }}>
            Do you want to add this to the monthly income suite?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <Button
                variant="primary"
                onClick={() => {
                  const applyAll = window.confirm("Add to ALL future months? Click OK for 'All Months', or Cancel for 'Present Month Only'.");
                  handleIncomeChoice(true, applyAll);
                }}
              >
                Yes, Add to Monthly Income Suite
              </Button>

              <Button variant="secondary" onClick={() => handleIncomeChoice(false, false)}>
                No, Record Only as Single Transaction
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Add Recurring Commitment Modal */}
      {showRecurringModal && (
        <Card className="modal-card" glow>
          <div className="section-title"><Calendar /> Set Automated Recurring Commitment</div>
          <p style={{ margin: "6px 0 16px", fontSize: "14px", color: "var(--text-muted)" }}>
            Monthly commitments (e.g. house rent, WiFi, electricity, SIPs, EMIs) are automatically logged into your financial ledger every month on your specified day.
          </p>
          <form className="form-grid" onSubmit={handleRecurringSubmit}>
            <Field label="Commitment Name">
              <input
                required
                placeholder="E.g. House Rent, Airtel Fiber, Nifty 50 SIP"
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
                <optgroup label="Needs (Fixed Living Commitments)">
                  <option value="Rent">Rent / Housing</option>
                  <option value="Utilities">Utilities, Electricity & WiFi</option>
                  <option value="Mandatory EMI">Mandatory Loan EMI</option>
                  <option value="Insurance">Insurance Premium</option>
                  <option value="Groceries">Scheduled Grocery / Milk Subscription</option>
                  <option value="Education">Education & School Fee</option>
                  <option value="Transport">Monthly Metro / Fuel Pass</option>
                </optgroup>
                <optgroup label="Wants (Monthly Subscriptions)">
                  <option value="Entertainment">OTT & Entertainment (Netflix/Spotify)</option>
                  <option value="Lifestyle">Gym & Fitness Membership</option>
                  <option value="Dining">Meal / Tiffin Subscription</option>
                  <option value="Other">Other Subscription</option>
                </optgroup>
                <optgroup label="Savings & Automated Investments">
                  <option value="Mutual Funds">Mutual Fund SIP (Systematic Investment)</option>
                  <option value="Emergency Fund">Emergency Reserve Monthly Contribution</option>
                  <option value="Fixed Deposit">Recurring Deposit (RD) / FD</option>
                  <option value="Stocks">Automated Stock Basket</option>
                  <option value="Provident Fund">PPF / Voluntary PF</option>
                </optgroup>
              </select>
            </Field>

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
              <Button type="submit">
                Save Recurring Commitment
              </Button>
            </div>
          </form>
        </Card>
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
  const { budget, updateBudgets, recurring } = useFinance();
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
          <div className="section-title"><Sparkles /> Income Tier Benchmark: Tier {tier.tier} — {tier.name} ({tier.range})</div>
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
          <div className="section-title"><ShieldAlert /> AI Budget Coach</div>
          <p className="recommendation">{budget.coach?.message || "All tracked categories are within budget limits."}</p>
          <p className="muted" style={{ fontSize: "13px", lineHeight: "1.5" }}>
            Budgets sync directly with your live transaction ledger. Whenever you log an expense, the actual spending for that category updates immediately.
          </p>
        </Card>
      </section>

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
        {goals.analysis.length ? goals.analysis.map((goal) => {
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
                        setForm(goal);
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
                  What is Happening Now (Current Reality)
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
                  What Will Happen (Projection Outcome)
                </div>
                {isOnTrack ? (
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-primary)" }}>
                    🎉 <strong>Right on Schedule:</strong> At your current contribution pace, you will fully achieve this goal in <strong>{goal.expected_months || goal.target_months} months</strong>, meeting your deadline comfortably.
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-primary)" }}>
                    ⚠️ <strong>Timeline Delay:</strong> At your current contribution of {currency(goal.monthly_contribution)}/mo, this goal will take <strong>{goal.expected_months} months</strong> to reach {currency(goal.target_amount)} — which is <strong>{delayMonths} months later</strong> than your intended target date of {goal.target_date}.
                  </p>
                )}
              </div>

              {/* SECTION 3: STRATEGIC ACTION PATHS (DISTINCT OPTIONS) */}
              {!isOnTrack && (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
                    Choose a Clear Strategy to Reach Your Goal:
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
                        <strong style={{ fontSize: "13px", color: "var(--text-muted)" }}>Path C: Realistic Timeline Extension (₹0 Extra)</strong>
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
        <Card className="modal-card" style={{ maxWidth: "600px", width: "100%" }}>
          <div className="section-title" style={{ marginBottom: "8px" }}>
            {editingGoalName ? "Edit Financial Goal" : "Create New Financial Goal"}
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
                {["Custom","Emergency","Education","Vehicle","Home","Travel","Investment","Retirement"].map((item) => (
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

export function Investments() {
  const { investments, forecast, profile } = useFinance();
  return (
    <>
      <PageHeader eyebrow="Investments" title="Portfolio & Asset Overview" subtitle="Projection based on your tracked mutual funds, FDs, stocks, gold, and liquid emergency reserves." />
      <section className="metric-grid">
        <MetricCard icon={<WalletCards />} label="Total Investments" value={currency(investments.total)} detail="Asset portfolio" tone="success" />
        <MetricCard icon={<ShieldAlert />} label="Emergency Reserve" value={currency(profile?.emergency_fund || 0)} detail={`${((profile?.emergency_fund || 0) / Math.max(1, (profile?.emergency_target || 200000)) * 100).toFixed(0)}% of target`} tone="info" />
        <MetricCard icon={<TrendingUp />} label="Monthly Contribution" value={currency(investments.monthly_contribution)} detail="Recurring SIP" tone="info" />
        <MetricCard icon={<Activity />} label="Estimated Return" value={`${investments.estimated_return || 8}%`} detail="Assumption only" tone="ai" />
      </section>
      <section className="grid-2">
        <Card><div className="section-title">Asset allocation</div><AllocationChart data={investments.allocation} /></Card>
        <Card><div className="section-title">Growth projection</div><NetWorthChart data={forecast.months} /></Card>
      </section>
      <Card>
        <div className="data-table">
          {Object.entries(
            investments.items.reduce((acc, item) => {
              const category = item.asset_class || "Other";
              if (!acc[category]) acc[category] = [];
              acc[category].push(item);
              return acc;
            }, {})
          ).map(([category, items]) => (
            <div key={category} style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>{category}</h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {items.map((item) => (
                  <article key={item.name} style={{ border: 'none', padding: '8px 0', borderBottom: '1px solid var(--border-color)', borderRadius: 0 }}>
                    <strong>{item.name}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>{item.asset_class}</span>
                    <b>{currency(item.value)}</b>
                    <span>{currency(item.monthly_contribution)}/mo</span>
                    <Badge tone="info">{item.expected_return}% assumed</Badge>
                  </article>
                ))}
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

export function Debt() {
  const { debt } = useFinance();
  const payoff = useMemo(() => `${debt.debt_free_months || 0} months`, [debt]);

  return (
    <>
      <PageHeader eyebrow="Debt Management" title="Liabilities & EMI Payoff Control" subtitle="Track loan obligations, interest burdens, and tailored accelerated payoff recommendations." />
      <section className="metric-grid">
        <MetricCard icon={<CreditCard />} label="Total Debt" value={currency(debt.total)} detail="Outstanding balance" tone="warning" />
        <MetricCard icon={<Calendar />} label="Monthly EMI" value={currency(debt.monthly_emi)} detail="Total monthly outflow" tone="info" />
        <MetricCard icon={<Activity />} label="Debt-to-Income" value={percent(debt.debt_to_income)} detail="Safer range is below 30%" tone="success" />
        <MetricCard icon={<GoalIcon />} label="Est. Debt Free" value={payoff} detail="Based on current schedule" tone="ai" />
      </section>

      {/* Individual Debt Cards with In-Line Payoff Recommendations */}
      <section className="debt-card-grid">
        {debt.items.map((item) => {
          const extraEmiEstimate = Math.round(item.emi * 0.2) || 2000;
          const interestSavingsEstimate = Math.round(item.outstanding * (item.interest_rate / 100) * 0.4);
          const monthsSavedEstimate = Math.min(item.remaining_months - 2, Math.max(2, Math.round(item.remaining_months * 0.25)));

          return (
            <div key={item.name} className="debt-card-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{item.name}</strong>
                <Badge tone="warning">{item.remaining_months} months remaining</Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px', margin: '6px 0' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Outstanding</span>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{currency(item.outstanding)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Monthly EMI</span>
                  <strong style={{ fontSize: '16px', color: 'var(--accent)' }}>{currency(item.emi)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Interest Rate</span>
                  <span>{item.interest_rate}% p.a.</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Estimated Interest</span>
                  <span>{currency(Math.round(item.outstanding * (item.interest_rate / 100)))}</span>
                </div>
              </div>

              {/* In-Line Tailored Payoff Suggestion directly under each debt */}
              <div className="recommendation" style={{ marginTop: '8px', fontSize: '13px' }}>
                <strong>Payoff Strategy:</strong> Increasing monthly EMI by <strong>{currency(extraEmiEstimate)}</strong> saves approx. <strong>{currency(interestSavingsEstimate)}</strong> in interest and cuts tenure by <strong>{monthsSavedEstimate} months</strong>.
              </div>
            </div>
          );
        })}
      </section>

      <QuickLinks links={[
        { to: '/simulator', icon: CircleDollarSign, label: 'Simulator', detail: 'Test new loan scenarios' },
        { to: '/health', icon: Activity, label: 'Health Score', detail: 'See debt burden impact' },
        { to: '/budget', icon: SlidersHorizontal, label: 'Budget', detail: 'Free cash for payments' },
      ]} />
    </>
  );
}
