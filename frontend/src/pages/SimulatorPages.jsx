import { Activity, ArrowRight, Calculator, Copy, Goal, History, LineChart, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { ScenarioBars } from "../components/charts";
import { Badge, Button, Card, ConfirmModal, Field, MetricCard, PageHeader, QuickLinks } from "../components/ui";
import { useFinance } from "../context/FinanceContext";
import { currency } from "../lib/format";

const scenarioTypes = ["Salary Change", "Expense Change", "New Loan", "Vehicle Purchase", "Home Purchase", "Increase SIP", "Reduce Spending", "Change Investment Return", "Change Retirement Age", "Multi-Factor Adjustment"];

export function Simulator() {
  const { profile, runSimulation } = useFinance();
  const [scenario, setScenario] = useState({ name: "Increase salary and SIP", scenario_type: "Salary Change", income_change: 10000, expense_change: 3000, extra_monthly_investment: 5000, new_monthly_loan_payment: 0, investment_return_change: 0 });
  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setProcessing(true);
    setResult(await runSimulation(scenario));
    setProcessing(false);
  }

  function handleTypeChange(type) {
    const defaults = {
      income_change: 0,
      expense_change: 0,
      extra_monthly_investment: 0,
      new_monthly_loan_payment: 0,
      investment_return_change: 0,
    };
    setScenario({ ...scenario, scenario_type: type, ...defaults });
  }

  const isCustom = scenario.scenario_type === "Multi-Factor Adjustment";
  const showIncome = isCustom || scenario.scenario_type === "Salary Change";
  const showExpense = isCustom || scenario.scenario_type === "Expense Change" || scenario.scenario_type === "Reduce Spending";
  const showInvestment = isCustom || scenario.scenario_type === "Increase SIP";
  const showEMI = isCustom || ["New Loan", "Vehicle Purchase", "Home Purchase"].includes(scenario.scenario_type);

  const expenses = profile.monthly_expenses.reduce((sum, item) => sum + item.amount, 0);
  const cashFlow = profile.monthly_income - expenses - profile.monthly_debt_payment;
  const chart = result ? [
    { label: "Health", current: result.base_score, simulated: result.simulated_score },
    { label: "Cash flow", current: Math.round(result.base_cash_flow / 1000), simulated: Math.round(result.simulated_cash_flow / 1000) },
    { label: "Net worth", current: Math.round(result.baseline_net_worth / 10000), simulated: Math.round(result.projected_net_worth / 10000) },
  ] : [];

  return (
    <>
      <PageHeader eyebrow="Financial Decision Lab" title="Test financial decisions before making them" subtitle="The simulator clones your digital twin, applies scenario changes, recalculates health, forecast and goals, and never mutates the real profile." />
      <section className="simulator-grid">
        <Card>
          <div className="section-title"><Calculator /> Scenario builder</div>
          <form onSubmit={submit} className="form-grid">
            <Field label="Scenario name"><input value={scenario.name} onChange={(e) => setScenario({ ...scenario, name: e.target.value })} /></Field>
            <Field label="Scenario type">
              <select value={scenario.scenario_type} onChange={(e) => handleTypeChange(e.target.value)}>
                {scenarioTypes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            {showIncome && <Field label="Income change"><input type="number" value={scenario.income_change === 0 ? "" : scenario.income_change} onChange={(e) => setScenario({ ...scenario, income_change: Number(e.target.value) })} /></Field>}
            {showExpense && <Field label="Expense change"><input type="number" value={scenario.expense_change === 0 ? "" : scenario.expense_change} onChange={(e) => setScenario({ ...scenario, expense_change: Number(e.target.value) })} /></Field>}
            {showInvestment && <Field label="Extra investment"><input type="number" value={scenario.extra_monthly_investment === 0 ? "" : scenario.extra_monthly_investment} onChange={(e) => setScenario({ ...scenario, extra_monthly_investment: Number(e.target.value) })} /></Field>}
            {showEMI && <Field label="New EMI"><input type="number" value={scenario.new_monthly_loan_payment === 0 ? "" : scenario.new_monthly_loan_payment} onChange={(e) => setScenario({ ...scenario, new_monthly_loan_payment: Number(e.target.value) })} /></Field>}
            <Button disabled={processing}><Sparkles size={17} /> {processing ? "Simulating..." : "Run Simulation"}</Button>
          </form>
        </Card>
        <Card glow>
          <div className="section-title"><Activity /> Baseline</div>
          <div className="baseline-list"><span>Salary: {currency(profile.monthly_income)}</span><span>Expenses: {currency(expenses)}</span><span>Savings capacity: {currency(cashFlow)}</span><span>Debt EMI: {currency(profile.monthly_debt_payment)}</span></div>
        </Card>
      </section>
      {result && (
        <>
          <section className="metric-grid">
            <MetricCard icon={<Activity />} label="Financial Health" value={`${result.base_score} → ${result.simulated_score}`} detail={`${result.score_delta > 0 ? "+" : ""}${result.score_delta} points`} tone={result.score_delta >= 0 ? "success" : "warning"} />
            <MetricCard icon={<Calculator />} label="Monthly Cash Flow" value={`${currency(result.base_cash_flow)} → ${currency(result.simulated_cash_flow)}`} detail={currency(result.cash_flow_delta)} tone="info" />
            <MetricCard icon={<ArrowRight />} label="Projected Net Worth" value={currency(result.projected_net_worth)} detail="12 month simulated state" tone="ai" />
          </section>
          <section className="grid-2">
            <Card><div className="section-title">Current vs simulated state</div><ScenarioBars data={chart} /></Card>
            <Card glow><div className="section-title">Decision recommendation</div><p className="recommendation">{result.recommendation}</p><div className="state-list">{result.goals?.map((goal) => <span key={goal.name}>{goal.name}: {goal.achievement_probability}% achievable</span>)}</div></Card>
          </section>
        </>
      )}
      <QuickLinks links={[
        { to: '/health', icon: Activity, label: 'Health Score', detail: 'Current financial health' },
        { to: '/goals', icon: Goal, label: 'Goals', detail: 'Check goal impact' },
        { to: '/forecast', icon: LineChart, label: 'Forecast', detail: 'See projected net worth' },
      ]} />
    </>
  );
}

export function ScenarioHistory() {
  const { scenarioHistory, deleteSimulation } = useFinance();
  const [deletingId, setDeletingId] = useState(null);

  async function handleDeleteConfirm() {
    if (deletingId) {
      await deleteSimulation(deletingId);
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Scenario History" title="Saved decision simulations" subtitle="View, duplicate, delete and compare prior what-if runs." />
      <Card>
        {scenarioHistory.history?.length ? (
          <div className="data-table">
            {scenarioHistory.history.map((item) => (
              <article key={item.id}>
                <History size={17} />
                <strong>{item.name}</strong>
                <span>{item.date}</span>
                <span>{item.result}</span>
                <Badge tone="ai">{item.score}</Badge>
                <div className="row-actions">
                  <Button
                    variant="ghost"
                    style={{ color: "var(--accent-danger)" }}
                    onClick={() => setDeletingId(item.id)}
                  >
                    <Trash2 size={15} /> Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ padding: "20px", textAlign: "center" }}>No saved simulation history yet.</p>
        )}
      </Card>

      <ConfirmModal
        isOpen={Boolean(deletingId)}
        title="Delete Simulation Record"
        message="Are you sure you want to delete this simulation from your history?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
      />
    </>
  );
}
