import { Activity, Calendar, CreditCard, Goal as GoalIcon, Landmark, Plus, ShieldAlert, SlidersHorizontal, TrendingUp, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { AllocationChart, NetWorthChart } from "../components/charts";
import { Badge, Button, Card, EmptyState, Field, MetricCard, PageHeader, Progress } from "../components/ui";
import { useFinance } from "../context/FinanceContext";
import { currency, percent } from "../lib/format";

function defaultTargetDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 2);
  return date.toISOString().slice(0, 10);
}

export function Transactions() {
  const { transactions, addTransaction } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ amount: 1000, type: "expense", category: "Food", date: "2026-08-20", description: "" });
  const rows = transactions.transactions.filter((txn) => `${txn.description} ${txn.category}`.toLowerCase().includes(query.toLowerCase()));

  async function submit(event) {
    event.preventDefault();
    await addTransaction(form);
    setShowForm(false);
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
        {rows.length ? <div className="data-table">{rows.map((txn) => <article key={txn.id}><span>{txn.date}</span><strong>{txn.description}</strong><span>{txn.category}</span><Badge tone={txn.type === "income" ? "success" : "warning"}>{txn.type}</Badge><b>{currency(txn.amount)}</b></article>)}</div> : <EmptyState title="No transactions yet" detail="Add income or expense records to power your financial twin." />}
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
    </>
  );
}

export function Goals() {
  const { goals, addGoal } = useFinance();
  const [showForm, setShowForm] = useState(false);
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

  return (
    <>
      <PageHeader eyebrow="Goals" title="Goal planning system" subtitle="Probability, gap analysis and action options for each financial goal." actions={<Button onClick={() => setShowForm(true)}><Plus size={17} /> Create Goal</Button>} />
      <section className="goal-planner-grid">
        {goals.analysis.length ? goals.analysis.map((goal) => (
          <Card key={goal.name}>
            <div className="goal-head"><div><Badge tone={goal.achievement_probability >= 70 ? "success" : "warning"}>{goal.status}</Badge><h2>{goal.name}</h2></div><strong>{goal.achievement_probability}%</strong></div>
            <Progress value={goal.achievement_probability} tone={goal.achievement_probability >= 70 ? "success" : "warning"} />
            <div className="goal-details"><span>Target: {currency(goal.target_amount)}</span><span>Current: {currency(goal.current_amount)}</span><span>Gap: {currency(goal.gap)}</span><span>Required monthly: {currency(goal.required_monthly)}</span><span>Planned monthly: {currency(goal.planned_monthly)}</span><span>Available monthly: {currency(goal.available_monthly)}</span><span>Target date: {goal.target_date || "Not set"}</span><span>Expected months: {goal.expected_months || "Not feasible"}</span></div>
            <div className="option-grid"><span>Option A: increase savings by {currency(Math.max(goal.required_monthly - goal.available_monthly, 0))}/month</span><span>Option B: extend deadline</span><span>Option C: reduce target amount</span></div>
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
      <Card><div className="data-table">{investments.items.map((item) => <article key={item.name}><strong>{item.name}</strong><span>{item.asset_class}</span><b>{currency(item.value)}</b><span>{currency(item.monthly_contribution)}/mo</span><Badge tone="info">{item.expected_return}% assumed</Badge></article>)}</div></Card>
    </>
  );
}

export function Debt() {
  const { debt } = useFinance();
  const payoff = useMemo(() => `${debt.debt_free_months || 0} months`, [debt]);
  return (
    <>
      <PageHeader eyebrow="Debt" title="Debt management" subtitle="Track EMI burden, payoff runway and accelerated payment impact." />
      <section className="metric-grid">
        <MetricCard icon={<CreditCard />} label="Total debt" value={currency(debt.total)} detail="Outstanding" tone="warning" />
        <MetricCard icon={<Calendar />} label="Monthly EMI" value={currency(debt.monthly_emi)} detail="Committed payment" tone="info" />
        <MetricCard icon={<Activity />} label="Debt-to-income" value={percent(debt.debt_to_income)} detail="Low risk under 20%" tone="success" />
        <MetricCard icon={<GoalIcon />} label="Debt-free date" value={payoff} detail="Estimated" tone="ai" />
      </section>
      <section className="grid-2">
        <Card><div className="data-table">{debt.items.map((item) => <article key={item.name}><strong>{item.name}</strong><span>Outstanding {currency(item.outstanding)}</span><span>{item.interest_rate}% interest</span><b>{currency(item.emi)} EMI</b><Badge tone="warning">{item.remaining_months} months</Badge></article>)}</div></Card>
        <Card glow><div className="section-title">Payoff simulation</div><p>Increasing EMI by {currency(debt.simulation?.extra_emi || 2000)} may save around {currency(debt.simulation?.interest_saved_estimate || 0)} and reduce tenure by {debt.simulation?.months_saved || 0} months.</p></Card>
      </section>
    </>
  );
}
