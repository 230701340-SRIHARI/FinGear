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
  "SIP", "Mutual Funds", "Stocks", "PPF", "NPS", "Retirement",
  "Extra Loan Repayment", "Extra Debt Prepayment"
]);

function getCategoryTag(category, type) {
  if (type === "income") return { label: "Income", tone: "success" };
  if (SAVINGS_SET.has(category)) return { label: "Savings", tone: "success" };
  if (NEEDS_SET.has(category)) return { label: "Need", tone: "info" };
  return { label: "Want", tone: "warning" };
}


export function Transactions() {
  const { transactions, addTransaction, deleteTransaction, restoreTransaction, updateIncomeSuite, uploadBill, fetchDeletedTransactions, acknowledgeAnomaly, excludeAnomaly } = useFinance();
  
  const [activeTab, setActiveTab] = useState("active"); // "active" | "deleted"
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  
  // Deleted transactions list
  const [deletedList, setDeletedList] = useState([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  // Bill upload state
  const [fileUploading, setFileUploading] = useState(false);
  const [attachedBill, setAttachedBill] = useState(null); // { url, name }

  // Income Suite Modals State
  const [incomePromptOpen, setIncomePromptOpen] = useState(false);
  const [pendingIncomeForm, setPendingIncomeForm] = useState(null);

  // Form State
  const [form, setForm] = useState({
    amount: 1500,
    type: "expense",
    category: "Food",
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

      {/* Tabs for Active vs Deleted */}
      <div className="tab-buttons" style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <button
          className={`btn ${activeTab === "active" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("active")}
        >
          <CreditCard size={16} /> Active Transactions ({transactions.transactions?.length || 0})
        </button>
        <button
          className={`btn ${activeTab === "deleted" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("deleted")}
        >
          <RotateCcw size={16} /> Trash Bin (60-Day Recovery) ({deletedList.length})
        </button>
      </div>

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
                      <option value="Groceries">Groceries</option>
                      <option value="Rent">Rent / Housing</option>
                      <option value="Utilities">Utilities & Bills</option>
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
                    <optgroup label="Savings / Wealth Building">
                      <option value="SIP">Mutual Funds / SIP</option>
                      <option value="Savings">Emergency Fund / FD</option>
                      <option value="Investment">Stocks / PPF / NPS</option>
                      <option value="Extra Loan Repayment">Extra Loan Principal Payment</option>
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
  const { budget } = useFinance();
  const tier = budget.tier_info || {};

  return (
    <>
      <PageHeader eyebrow="Budget" title="Monthly Budget Control & Tier Benchmarks" subtitle="Planned vs actual category spending benchmarked against your income tier." />
      <section className="metric-grid">
        <MetricCard icon={<Landmark />} label="Monthly Income" value={currency(budget.income)} detail={`Tier ${tier.tier || 1}: ${tier.name || 'Baseline'}`} tone="success" />
        <MetricCard icon={<SlidersHorizontal />} label="Planned Expenses" value={currency(budget.planned)} detail="Budgeted total" tone="info" />
        <MetricCard icon={<WalletCards />} label="Remaining Surplus" value={currency(budget.remaining)} detail="After planned expenses" tone="ai" />
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

      <section className="grid-2">
        <Card>
          <div className="section-title"><SlidersHorizontal /> Category Budgets</div>
          <div className="budget-list">{budget.items.map((item) => {
            const value = item.planned ? (item.actual / item.planned) * 100 : 0;
            const tag = getCategoryTag(item.category, "expense");
            return (
              <article key={item.category}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <strong>{item.category}</strong>
                    <Badge tone={tag.tone}>{tag.label}</Badge>
                  </div>
                  <span>{currency(item.actual)} / {currency(item.planned)}</span>
                </div>
                <Progress value={value} tone={value > 100 ? "danger" : "success"} />
              </article>
            );
          })}</div>
        </Card>
        <Card glow><div className="section-title"><ShieldAlert /> AI Budget Coach</div><p className="recommendation">{budget.coach?.message}</p><p className="muted">Budget editing is available in the architecture; changes dynamically sync across all intelligence components.</p></Card>
      </section>
      <QuickLinks links={[
        { to: '/transactions', icon: Landmark, label: 'Transactions', detail: 'See actual spending data' },
        { to: '/goals', icon: GoalIcon, label: 'Goals', detail: 'Align budget with goals' },
        { to: '/simulator', icon: CircleDollarSign, label: 'Simulator', detail: 'Test spending changes' },
      ]} />
    </>
  );
}

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
    target_amount: 100000,
    current_amount: 0,
    monthly_contribution: 5000,
    target_date: defaultTargetDate(),
    goal_type: "Custom",
  });

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
        target_amount: 100000,
        current_amount: 0,
        monthly_contribution: 5000,
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
      <PageHeader eyebrow="Goals" title="Goal planning system" subtitle="Probability, gap analysis and action options for each financial goal." actions={<Button onClick={() => { setForm({ name: "", target_amount: 100000, current_amount: 0, monthly_contribution: 5000, target_date: defaultTargetDate(), goal_type: "Custom" }); setEditingGoalName(null); setShowForm(true); }}><Plus size={17} /> Create Goal</Button>} />
      <section className="goal-planner-grid">
        {goals.analysis.length ? goals.analysis.map((goal) => (
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
                <Badge tone={goal.achievement_probability >= 70 ? "success" : "warning"}>{goal.status}</Badge>
                <h2>{goal.name}</h2>
              </div>
              <strong>{goal.achievement_probability}%</strong>
            </div>

            <Progress value={goal.achievement_probability} tone={goal.achievement_probability >= 70 ? "success" : "warning"} />

            <div className="goal-details">
              <span><strong>Target:</strong> {currency(goal.target_amount)}</span>
              <span><strong>Current:</strong> {currency(goal.current_amount)}</span>
              <span><strong>Monthly saving:</strong> {currency(goal.monthly_contribution)}</span>
              <span><strong>Expected completion:</strong> {goal.expected_months ? `${goal.expected_months} months` : "N/A"}</span>
              <span><strong>Gap:</strong> {currency(Math.max(goal.target_amount - goal.current_amount, 0))}</span>
            </div>

            {goal.achievement_probability < 70 && (
              <div className="option-grid">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Option A: Aggressive Savings (Increase SIP by {currency(goal.required_monthly - goal.planned_monthly)}/mo)</span>
                  <Button variant="ghost" onClick={() => navigate('/simulator', { state: { target_goal_name: goal.name, scenario: { name: `Fund ${goal.name}`, scenario_type: "Increase SIP", extra_monthly_investment: goal.required_monthly - goal.planned_monthly, income_change: 0, expense_change: 0, new_monthly_loan_payment: 0 } } })}><Play size={14} /> Simulate</Button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Option B: Expense Diet (Cut spending by {currency(goal.required_monthly - goal.planned_monthly)}/mo)</span>
                  <Button variant="ghost" onClick={() => navigate('/simulator', { state: { target_goal_name: goal.name, scenario: { name: `Cut expenses for ${goal.name}`, scenario_type: "Reduce Spending", expense_change: -(goal.required_monthly - goal.planned_monthly), income_change: 0, extra_monthly_investment: 0, new_monthly_loan_payment: 0 } } })}><Play size={14} /> Simulate</Button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Option C: Side Hustle (Increase income by {currency(goal.required_monthly - goal.planned_monthly)}/mo)</span>
                  <Button variant="ghost" onClick={() => navigate('/simulator', { state: { target_goal_name: goal.name, scenario: { name: `Increase income for ${goal.name}`, scenario_type: "Salary Change", income_change: goal.required_monthly - goal.planned_monthly, expense_change: 0, extra_monthly_investment: 0, new_monthly_loan_payment: 0 } } })}><Play size={14} /> Simulate</Button>
                </div>
              </div>
            )}
          </Card>
        )) : <EmptyState title="No financial goals yet" detail="Create a goal to calculate feasibility." />}
      </section>

      {showForm && (
        <Card className="modal-card">
          <form className="form-grid" onSubmit={submit}>
            <Field label="Goal name"><input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Emergency fund, Bike, MBA..." required /></Field>
            <Field label="Goal type"><select value={form.goal_type} onChange={(event) => update("goal_type", event.target.value)}>{["Custom","Emergency","Education","Vehicle","Home","Travel","Investment","Retirement"].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Target amount"><NumberInput min="1" value={form.target_amount} onChange={(val) => update("target_amount", val)} required /></Field>
            <Field label="Current amount"><NumberInput min="0" value={form.current_amount} onChange={(val) => update("current_amount", val)} required /></Field>
            <Field label="Monthly contribution"><NumberInput min="0" value={form.monthly_contribution} onChange={(val) => update("monthly_contribution", val)} required /></Field>
            <Field label="Target date"><input type="date" value={form.target_date} onInput={(event) => update("target_date", event.currentTarget.value)} onChange={(event) => update("target_date", event.currentTarget.value)} required /></Field>
            {formError && <div className="inline-error form-wide">{formError}</div>}
            <div className="form-actions form-wide"><Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditingGoalName(null); }} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : editingGoalName ? "Update Goal" : "Save Goal"}</Button></div>
          </form>
        </Card>
      )}

      {/* In-Website Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingGoalName)}
        title="Delete Financial Goal"
        message={`Are you sure you want to delete "${deletingGoalName}"? This action cannot be undone.`}
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
  const { investments, forecast } = useFinance();
  return (
    <>
      <PageHeader eyebrow="Investments" title="Portfolio overview" subtitle="Projection, not guaranteed return." />
      <section className="metric-grid">
        <MetricCard icon={<WalletCards />} label="Total investments" value={currency(investments.total)} detail="Current value" tone="success" />
        <MetricCard icon={<TrendingUp />} label="Monthly contribution" value={currency(investments.monthly_contribution)} detail="Recurring" tone="info" />
        <MetricCard icon={<Activity />} label="Estimated return" value={`${investments.estimated_return || 8}%`} detail="Assumption only" tone="ai" />
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
