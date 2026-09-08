import { Activity, ArrowRight, Calculator, Copy, Goal, History, LineChart, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ScenarioBars } from "../components/charts";
import { Badge, Button, Card, ConfirmModal, Field, MetricCard, NumberInput, PageHeader, QuickLinks } from "../components/ui";
import { useFinance } from "../context/FinanceContext";
import { currency } from "../lib/format";

const scenarioTypes = ["Salary Change", "Expense Change", "New Loan", "Vehicle Purchase", "Home Purchase", "Increase SIP", "Reduce Spending", "Change Investment Return", "Change Retirement Age", "Multi-Factor Adjustment"];

export function Simulator() {
  const { profile, runSimulation, goals } = useFinance();
  const location = useLocation();
  const [scenario, setScenario] = useState(
    location.state?.scenario || { name: "", scenario_type: "Salary Change", income_change: 10000, expense_change: 3000, extra_monthly_investment: 5000, new_monthly_loan_payment: 0, investment_return_change: 0 }
  );
  const [targetGoalName, setTargetGoalName] = useState(
    location.state?.target_goal_name || location.state?.scenario?.target_goal_name || ""
  );
  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (location.state?.scenario) {
      setScenario(location.state.scenario);
      const tgt = location.state.target_goal_name || location.state.scenario.target_goal_name;
      if (tgt) {
        setTargetGoalName(tgt);
      }
      window.history.replaceState({}, document.title); // Clear state so refresh doesn't hold it forever
    }
  }, [location.state]);

  async function submit(event) {
    event.preventDefault();
    setProcessing(true);
    const payload = {
      ...scenario,
      target_goal_name: targetGoalName || scenario.target_goal_name || null,
      name: scenario.name?.trim() || `${scenario.scenario_type} Simulation`
    };
    setResult(await runSimulation(payload));
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

  const expList = (profile?.detailed_expenses?.length ? profile.detailed_expenses : (profile?.monthly_expenses || []));
  const expenses = expList.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
  const cashFlow = (Number(profile?.monthly_income) || 0) - expenses - (Number(profile?.monthly_debt_payment) || 0);
  const chart = result ? [
    { label: "Health", current: result.base_score, simulated: result.simulated_score },
    { label: "Cash flow", current: Math.round(result.base_cash_flow / 1000), simulated: Math.round(result.simulated_cash_flow / 1000) },
    { label: "Net worth", current: Math.round(result.baseline_net_worth / 10000), simulated: Math.round(result.projected_net_worth / 10000) },
  ] : [];

  const activeTargetName = targetGoalName || scenario.target_goal_name || goals?.analysis?.[0]?.name;
  let targetGoalImpact = null;
  if (result && activeTargetName) {
    const baseGoal = goals?.analysis?.find(g => (g.name || "").toLowerCase() === activeTargetName.toLowerCase());
    const simGoal = result.goals?.find(g => (g.name || "").toLowerCase() === activeTargetName.toLowerCase());
    if (baseGoal && simGoal) {
      const probDiff = simGoal.achievement_probability - baseGoal.achievement_probability;
      const baseMo = baseGoal.expected_months || baseGoal.target_months;
      const simMo = simGoal.expected_months || simGoal.target_months;
      const timeDiff = simMo - baseMo;
      targetGoalImpact = {
        name: baseGoal.name,
        baseProb: baseGoal.achievement_probability,
        simProb: simGoal.achievement_probability,
        probDiff,
        baseExpected: baseMo,
        simExpected: simMo,
        timeDiff
      };
    }
  }

  return (
    <>
      <PageHeader eyebrow="Financial Decision Lab" title="Test financial decisions before making them" subtitle="The simulator clones your digital twin, applies scenario changes, recalculates health, forecast and goals, and never mutates the real profile." />
      <section className="simulator-grid">
        <Card>
          <div className="section-title"><Calculator /> Scenario builder</div>
          <form onSubmit={submit} className="form-grid">
            <Field label="Scenario name"><input value={scenario.name} onChange={(e) => setScenario({ ...scenario, name: e.target.value })} placeholder="e.g. Salary hike or purchase planning" /></Field>
            <Field label="Scenario type">
              <select value={scenario.scenario_type} onChange={(e) => handleTypeChange(e.target.value)}>
                {scenarioTypes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Target Goal (Strategy Direction)">
              <select 
                value={targetGoalName} 
                onChange={(e) => {
                  setTargetGoalName(e.target.value);
                  setScenario({ ...scenario, target_goal_name: e.target.value });
                }}
              >
                <option value="">-- Auto: Primary Active Goal --</option>
                {(goals?.analysis || profile?.goals || []).map((g) => (
                  <option key={g.name} value={g.name}>{g.name} (Target: {currency(g.target_amount)})</option>
                ))}
              </select>
            </Field>
            {showIncome && <Field label="Income change"><NumberInput value={scenario.income_change} onChange={(val) => setScenario({ ...scenario, income_change: val })} /></Field>}
            {showExpense && <Field label="Expense change"><NumberInput value={scenario.expense_change} onChange={(val) => setScenario({ ...scenario, expense_change: val })} /></Field>}
            {showInvestment && <Field label="Extra investment"><NumberInput value={scenario.extra_monthly_investment} onChange={(val) => setScenario({ ...scenario, extra_monthly_investment: val })} /></Field>}
            {showEMI && <Field label="New EMI"><NumberInput value={scenario.new_monthly_loan_payment} onChange={(val) => setScenario({ ...scenario, new_monthly_loan_payment: val })} /></Field>}
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
          
          {targetGoalImpact && (
            <Card glow style={{ marginBottom: '24px', border: '1px solid var(--accent-success)' }}>
              <div className="section-title"><Goal /> Impact on Goal: {targetGoalImpact.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '14px' }}>
                 <div style={{ background: 'var(--surface-hover)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                   <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Achievement Probability</div>
                   <div style={{ fontSize: '22px', fontWeight: 'bold', color: targetGoalImpact.simProb >= targetGoalImpact.baseProb ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                     {targetGoalImpact.baseProb}% → {targetGoalImpact.simProb}%
                   </div>
                   <div style={{ fontSize: '12px', marginTop: '4px', color: targetGoalImpact.probDiff >= 0 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                     {targetGoalImpact.probDiff > 0 ? `+${targetGoalImpact.probDiff}% feasibility boost` : targetGoalImpact.probDiff === 0 ? "Maintained feasibility" : `${targetGoalImpact.probDiff}% feasibility drop`}
                   </div>
                 </div>
                 <div style={{ background: 'var(--surface-hover)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                   <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Estimated Time to Reach</div>
                   <div style={{ fontSize: '22px', fontWeight: 'bold', color: targetGoalImpact.timeDiff <= 0 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                     {targetGoalImpact.baseExpected} mo → {targetGoalImpact.simExpected} mo
                   </div>
                   <div style={{ fontSize: '12px', marginTop: '4px', color: targetGoalImpact.timeDiff <= 0 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                     {targetGoalImpact.timeDiff < 0 ? `${Math.abs(targetGoalImpact.timeDiff)} months faster!` : targetGoalImpact.timeDiff === 0 ? "Target timeline maintained" : `Delayed by ${targetGoalImpact.timeDiff} months`}
                   </div>
                 </div>
              </div>
            </Card>
          )}

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
        {scenarioHistory?.history?.length ? (
          <div className="data-table">
            {(scenarioHistory?.history || []).map((item) => (
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
