import { Activity, Calendar, CircleDollarSign, CreditCard, Goal as GoalIcon, Landmark, LineChart, MoreVertical, Pencil, Plus, ShieldAlert, SlidersHorizontal, Trash2, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { AllocationChart, NetWorthChart } from "../components/charts";
import { Badge, Button, Card, ConfirmModal, EmptyState, Field, MetricCard, PageHeader, Progress, QuickLinks } from "../components/ui";
import { useFinance } from "../context/FinanceContext";
import { currency, percent } from "../lib/format";

function defaultTargetDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 2);
  return date.toISOString().slice(0, 10);
}

export function Transactions() {
  const { transactions, addTransaction, deleteTransaction } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ amount: 1000, type: "expense", category: "Food", date: "2026-08-20", description: "" });
  const rows = transactions.transactions.filter((txn) => `${txn.description} ${txn.category}`.toLowerCase().includes(query.toLowerCase()));

  async function submit(event) {
    event.preventDefault();
    await addTransaction(form);
    setShowForm(false);
  }

  async function handleDeleteConfirm() {
    if (deletingId) {
      await deleteTransaction(deletingId);
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Transactions" title="Financial transaction management" subtitle="Search, filter and review income and expense flows." actions={<Button onClick={() => setShowForm(true)}><Plus size={17} /> Add Transaction</Button>} />
      <section className="metric-grid">
        <MetricCard icon={<Landmark />} label="Income" value={currency(transactions.summary.income)} detail="This month" tone="success" />
        <MetricCard icon={<CreditCard />} label="Expenses" value={currency(transactions.summary.expenses)} detail="This month" tone="warning" />
        <MetricCard icon={<Activity />} label="Net" value={currency(transactions.summary.net)} detail="Income minus expenses" tone="info" />
      </section>
      <Card>
        <div className="table-toolbar"><input placeholder="Search transactions..." value={query} onChange={(event) => setQuery(event.target.value)} /><Badge tone="info">{rows.length} records</Badge></div>
        {rows.length ? (
          <div className="data-table">
            {rows.map((txn) => (
              <article key={txn.id}>
                <span>{txn.date}</span>
                <strong>{txn.description}</strong>
                <span>{txn.category}</span>
                <Badge tone={txn.type === "income" ? "success" : "warning"}>{txn.type}</Badge>
                <b>{currency(txn.amount)}</b>
                <button
                  className="icon-button"
                  style={{ color: "var(--accent-danger)" }}
                  title="Delete Transaction"
                  onClick={() => setDeletingId(txn.id)}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No transactions yet" detail="Add income or expense records to power your financial twin." />
        )}
      </Card>

      {showForm && (
        <Card className="modal-card">
          <form className="form-grid" onSubmit={submit}>
            <Field label="Amount"><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
            <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>expense</option><option>income</option></select></Field>
            <Field label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{["Housing","Food","Transport","Utilities","Shopping","Healthcare","Education","Entertainment","Investment","Debt","Other"].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Description"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></Field>
            <div className="form-actions"><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit">Save</Button></div>
          </form>
        </Card>
      )}

      <ConfirmModal
        isOpen={Boolean(deletingId)}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction record?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
      />
    </>
  );
}

export function Budget() {
  const { budget } = useFinance();
  return (
    <>
      <PageHeader eyebrow="Budget" title="Monthly budget control" subtitle="Planned vs actual category spending with AI coaching." />
      <section className="metric-grid">
        <MetricCard icon={<Landmark />} label="Income" value={currency(budget.income)} detail="Monthly" tone="success" />
        <MetricCard icon={<SlidersHorizontal />} label="Planned expenses" value={currency(budget.planned)} detail="Budgeted" tone="info" />
        <MetricCard icon={<WalletCards />} label="Remaining" value={currency(budget.remaining)} detail="After planned expenses" tone="ai" />
      </section>
      <section className="grid-2">
        <Card>
          <div className="section-title"><SlidersHorizontal /> Category budgets</div>
          <div className="budget-list">{budget.items.map((item) => {
            const value = item.planned ? (item.actual / item.planned) * 100 : 0;
            return <article key={item.category}><div><strong>{item.category}</strong><span>{currency(item.actual)} / {currency(item.planned)}</span></div><Progress value={value} tone={value > 100 ? "danger" : "success"} /></article>;
          })}</div>
        </Card>
        <Card glow><div className="section-title"><ShieldAlert /> AI Budget Coach</div><p className="recommendation">{budget.coach?.message}</p><p className="muted">Budget editing is available in the architecture; persistence uses the demo repository until PostgreSQL is connected.</p></Card>
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
  const { goals, addGoal, deleteGoal } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [activeMenuGoal, setActiveMenuGoal] = useState(null);
  const [deletingGoalName, setDeletingGoalName] = useState(null);
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
      await addGoal({
        ...form,
        name: form.name.trim(),
      });
      setShowForm(false);
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
      <PageHeader eyebrow="Goals" title="Goal planning system" subtitle="Probability, gap analysis and action options for each financial goal." actions={<Button onClick={() => { setForm({ name: "", target_amount: 100000, current_amount: 0, monthly_contribution: 5000, target_date: defaultTargetDate(), goal_type: "Custom" }); setShowForm(true); }}><Plus size={17} /> Create Goal</Button>} />
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
              <span><strong>Gap:</strong> {currency(Math.max(goal.target_amount - goal.current_amount, 0))}</span>
            </div>

            <div className="option-grid">
              <span>Option A: increase savings by {currency(Math.max(goal.required_monthly - goal.available_monthly, 0))}/mo</span>
              <span>Option B: extend deadline</span>
              <span>Option C: reduce target amount</span>
            </div>
          </Card>
        )) : <EmptyState title="No financial goals yet" detail="Create a goal to calculate feasibility." />}
      </section>

      {showForm && (
        <Card className="modal-card">
          <form className="form-grid" onSubmit={submit}>
            <Field label="Goal name"><input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Emergency fund, Bike, MBA..." required /></Field>
            <Field label="Goal type"><select value={form.goal_type} onChange={(event) => update("goal_type", event.target.value)}>{["Custom","Emergency","Education","Vehicle","Home","Travel","Investment","Retirement"].map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Target amount"><input type="number" min="1" value={form.target_amount} onChange={(event) => update("target_amount", Number(event.target.value))} required /></Field>
            <Field label="Current amount"><input type="number" min="0" value={form.current_amount} onChange={(event) => update("current_amount", Number(event.target.value))} required /></Field>
            <Field label="Monthly contribution"><input type="number" min="0" value={form.monthly_contribution} onChange={(event) => update("monthly_contribution", Number(event.target.value))} required /></Field>
            <Field label="Target date"><input type="date" value={form.target_date} onInput={(event) => update("target_date", event.currentTarget.value)} onChange={(event) => update("target_date", event.currentTarget.value)} required /></Field>
            {formError && <div className="inline-error form-wide">{formError}</div>}
            <div className="form-actions form-wide"><Button type="button" variant="ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Creating..." : "Save Goal"}</Button></div>
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
