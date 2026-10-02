import { Activity, ArrowRight, BrainCircuit, CircleDollarSign, Compass, Cpu, CreditCard, Gauge, Goal, IndianRupee, Landmark, LineChart, Network, PieChart, Plus, ShieldCheck, SlidersHorizontal, Sparkles, Target, TrendingUp, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AllocationChart, HealthTrendChart, IncomeExpenseChart, NetWorthChart } from "../components/charts";
import { Badge, Button, Card, MetricCard, NumberInput, PageHeader, Progress, QuickLinks } from "../components/ui";
import { useFinance } from "../context/FinanceContext";
import { useAuth } from "../context/AuthContext";
import { currency, percent } from "../lib/format";
import { demoProfile } from "../lib/demoProfile";

export function Dashboard() {
  const { user } = useAuth();
  const { dashboard, health, loading, aiForecast, aiAnomalies, addTransaction, profile } = useFinance();
  const kpis = useMemo(() => {
    const baseKpis = dashboard?.kpis ? [...dashboard.kpis] : [];

    // Dynamically calculate live runway from the active profile
    // ensuring 0ms instantaneous reactivity whenever reserves, expenses, or debt change
    const ef = Number(profile?.emergency_fund) || 0;
    const expList = profile?.detailed_expenses?.length ? profile.detailed_expenses : (profile?.monthly_expenses || []);
    let expTotal = expList.reduce((acc, item) => acc + (Number(item?.amount) || 0), 0);
    if (expTotal <= 0 && Number(profile?.monthly_income) > 0) {
      expTotal = Number(profile.monthly_income) * 0.70;
    }
    const debtEmi = Number(profile?.monthly_debt_payment) || 0;
    const monthlyBurn = Math.max(expTotal + debtEmi, 1);
    const liveRunwayMonths = (ef / monthlyBurn).toFixed(1);

    const runwayTone = Number(liveRunwayMonths) >= 6.0 ? "success" : (Number(liveRunwayMonths) >= 3.0 ? "info" : "warning");
    const runwayDetail = Number(liveRunwayMonths) >= 6.0 ? "Target reached (6+ mos)" : (Number(liveRunwayMonths) >= 3.0 ? "Target is 6 months" : "Below 3-mo benchmark");

    const runwayKpi = {
      label: "Emergency runway",
      value: `${liveRunwayMonths} months`,
      detail: runwayDetail,
      tone: runwayTone,
    };

    const runwayIdx = baseKpis.findIndex((k) => k.label?.toLowerCase().includes("runway"));
    if (runwayIdx >= 0) {
      baseKpis[runwayIdx] = runwayKpi;
    } else if (baseKpis.length > 0) {
      baseKpis.splice(4, 0, runwayKpi);
    }
    return baseKpis;
  }, [dashboard?.kpis, profile]);
  const charts = dashboard?.charts || {};
  const forecastReady = aiForecast && aiForecast.status !== "learning";
  const adaptive = health?.adaptive_ratio || dashboard?.health?.adaptive_ratio;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let salutation = "Good morning";
    if (hour >= 12 && hour < 17) {
      salutation = "Good afternoon";
    } else if (hour >= 17 || hour < 5) {
      salutation = "Good evening";
    }
    const name = (user?.name || profile?.name || "").trim().split(" ")[0];
    return name ? `${salutation}, ${name}` : salutation;
  }, [user?.name, profile?.name]);

  const [quickLogType, setQuickLogType] = useState("expense"); // "expense" | "savings" | "income"
  const [quickLog, setQuickLog] = useState({ amount: "", description: "", category: "Food" });
  const [logging, setLogging] = useState(false);
  const [logToast, setLogToast] = useState("");

  async function handleQuickLog(e) {
    e.preventDefault();
    if (!quickLog.amount || !quickLog.description) return;
    setLogging(true);
    const numAmount = Number(quickLog.amount);
    const cat = quickLog.category;
    const txnType = quickLogType === "income" ? "income" : (quickLogType === "savings" ? "savings" : "expense");

    await addTransaction({
      description: quickLog.description,
      amount: numAmount,
      category: cat,
      type: txnType,
      date: new Date().toISOString().split("T")[0]
    });

    if (cat === "Emergency Fund") {
      setLogToast(`✓ ₹${numAmount.toLocaleString("en-IN")} added directly to your Emergency Fund! Overall reserve and runway increased.`);
    } else if (cat === "Fixed Deposit" || cat === "FD") {
      setLogToast(`✓ ₹${numAmount.toLocaleString("en-IN")} added to Fixed Deposits (FD)! Overall savings balance updated.`);
    } else if (cat === "Mutual Funds" || cat === "SIP") {
      setLogToast(`✓ ₹${numAmount.toLocaleString("en-IN")} invested in Mutual Funds / SIP! Investment portfolio updated.`);
    } else if (cat === "Stocks") {
      setLogToast(`✓ ₹${numAmount.toLocaleString("en-IN")} allocated to Stocks & Equity!`);
    } else if (cat === "Gold") {
      setLogToast(`✓ ₹${numAmount.toLocaleString("en-IN")} allocated to Gold holdings!`);
    } else if (cat === "Provident Fund") {
      setLogToast(`✓ ₹${numAmount.toLocaleString("en-IN")} contributed to Provident Fund (PPF/EPF)!`);
    } else if (cat === "Extra Loan Repayment") {
      setLogToast(`✓ ₹${numAmount.toLocaleString("en-IN")} extra principal payment logged! Total debt reduced.`);
    } else {
      setLogToast(`✓ ₹${numAmount.toLocaleString("en-IN")} logged successfully under ${cat}.`);
    }

    setTimeout(() => setLogToast(""), 6000);
    setQuickLog({ amount: "", description: "", category: quickLogType === "savings" ? "Emergency Fund" : (quickLogType === "income" ? "Salary" : "Groceries") });
    setLogging(false);
  }

  const kpiCards = useMemo(() => kpis.map((kpi) => (
    <MetricCard key={kpi.label} icon={<Gauge />} label={kpi.label} value={kpi.value} detail={kpi.detail} tone={kpi.tone} />
  )), [kpis]);

  return (
    <>
      <PageHeader
        eyebrow="Executive overview"
        title={greeting}
        subtitle={dashboard?.status || "Your financial system is stable."}
        actions={<Link to="/simulator"><Button><Sparkles size={17} /> Open Decision Lab</Button></Link>}
      />

      <section className="hero-grid">
        <Card className="hero-card" glow>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
            <Badge tone="success">Twin Status: Live</Badge>
            {(health?.data_confidence || dashboard?.health?.data_confidence) && (
              <Badge tone={(health?.data_confidence || dashboard?.health?.data_confidence)?.score >= 80 ? "success" : "info"}>
                {(health?.data_confidence || dashboard?.health?.data_confidence)?.badge || "Confidence: 85%"}
              </Badge>
            )}
          </div>
          <h2>Financial Health {health?.score ?? dashboard?.health?.score ?? 72}/100</h2>
          <p style={{ margin: "4px 0 8px", fontSize: "14px", fontWeight: "600", color: (health?.score ?? dashboard?.health?.score ?? 72) >= 80 ? "var(--accent-success)" : "var(--accent-warning)" }}>
            {health?.grade || dashboard?.health?.grade || "Financially Healthy"}
          </p>
          <p>Explainable Financial Health Network framework calculated from your verified transactions, income tier, and resilience guardrails.</p>
          <div className="hero-actions">
            <Link to="/financial-twin"><Button variant="secondary">View Twin <ArrowRight size={16} /></Button></Link>
            <Link to="/health"><Button variant="ghost">Explain Score</Button></Link>
          </div>
        </Card>
        <Card className="ai-brief">
          <div className="section-title"><BrainCircuit /> AI Financial Brief <Badge tone="ai">{dashboard?.ai_brief?.confidence ?? 65}% confidence</Badge></div>
          <div className="brief-columns">
            <div>
              <strong>Positive</strong>
              {(dashboard?.ai_brief?.positive && dashboard.ai_brief.positive.length > 0) ? (
                dashboard.ai_brief.positive.map((item) => <p key={item}>+ {item}</p>)
              ) : (
                <p className="muted" style={{ fontSize: "13px" }}>Analyzing financial health signals...</p>
              )}
            </div>
            <div>
              <strong>Needs attention</strong>
              {(dashboard?.ai_brief?.attention && dashboard.ai_brief.attention.length > 0) ? (
                dashboard.ai_brief.attention.map((item) => <p key={item}>! {item}</p>)
              ) : (
                <p className="muted" style={{ fontSize: "13px" }}>No immediate risk items detected</p>
              )}
            </div>
          </div>
          <p className="recommendation">{dashboard?.ai_brief?.recommendation || "Maintain positive cash flow and log daily transactions."}</p>
        </Card>
      </section>

      <section className="metric-grid six">
        {kpiCards}
        <MetricCard
          icon={<Cpu />}
          label="AI Predicted Spend"
          value={forecastReady ? currency(aiForecast.predicted_tomorrow) : "Learning..."}
          detail={forecastReady ? `${aiForecast.confidence}% confidence` : aiForecast?.status_message || "Collecting data"}
          tone="ai"
        />
      </section>

      <Card glow>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div className="section-title" style={{ margin: 0 }}><Plus /> Quick Transaction Log</div>
          {/* Mode Switcher */}
          <div style={{ display: "flex", gap: "6px", background: "var(--bg-card)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <button
              type="button"
              className={`btn btn-sm ${quickLogType === "expense" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setQuickLogType("expense");
                setQuickLog((q) => ({ ...q, category: "Groceries" }));
              }}
            >
              Expense (Needs/Wants)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${quickLogType === "savings" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setQuickLogType("savings");
                setQuickLog((q) => ({ ...q, category: "Emergency Fund" }));
              }}
            >
              Savings & Investments
            </button>
            <button
              type="button"
              className={`btn btn-sm ${quickLogType === "income" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setQuickLogType("income");
                setQuickLog((q) => ({ ...q, category: "Salary" }));
              }}
            >
              Income
            </button>
          </div>
        </div>

        {logToast && (
          <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid var(--accent-success)", color: "var(--accent-success)", padding: "10px 14px", borderRadius: "8px", marginBottom: "14px", fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>{logToast}</span>
          </div>
        )}

        <form onSubmit={handleQuickLog} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label className="field">
              <span>Description</span>
              <input required placeholder={quickLogType === "savings" ? "E.g. Monthly Emergency reserve top-up, SIP" : "E.g. D-Mart Groceries, House Rent"} value={quickLog.description} onChange={(e) => setQuickLog({ ...quickLog, description: e.target.value })} />
            </label>
          </div>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label className="field">
              <span>Amount (₹)</span>
              <NumberInput required placeholder="0" value={quickLog.amount} onChange={(val) => setQuickLog({ ...quickLog, amount: val })} />
            </label>
          </div>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <label className="field">
              <span>Category</span>
              <select value={quickLog.category} onChange={(e) => setQuickLog({ ...quickLog, category: e.target.value })}>
                {quickLogType === "savings" ? (
                  <optgroup label="Savings, Reserves & Investments">
                    <option value="Emergency Fund">Emergency Fund (Builds Runway & Reserve)</option>
                    <option value="Fixed Deposit">Fixed Deposit (FD)</option>
                    <option value="Mutual Funds">Mutual Funds / SIP</option>
                    <option value="Stocks">Stocks & Direct Equity</option>
                    <option value="Gold">Gold / Sovereign Gold Bonds</option>
                    <option value="Provident Fund">Provident Fund (PPF / EPF)</option>
                    <option value="Extra Loan Repayment">Extra Loan Principal Repayment</option>
                  </optgroup>
                ) : quickLogType === "income" ? (
                  <optgroup label="Income Inflows">
                    <option value="Salary">Salary Inflow</option>
                    <option value="Freelance">Freelance / Consulting</option>
                    <option value="Business">Business Revenue</option>
                    <option value="Bonus">Incentive / Bonus</option>
                    <option value="Interest">Interest & Dividend</option>
                    <option value="Other Income">Other Inflow</option>
                  </optgroup>
                ) : (
                  <>
                    <optgroup label="Needs (Fixed & Essential Outflows)">
                      <option value="Groceries">Groceries & Daily Essentials</option>
                      <option value="Rent">Rent / Housing</option>
                      <option value="Utilities">Utilities, Electricity & WiFi</option>
                      <option value="Transport">Fuel & Public Transport</option>
                      <option value="Healthcare">Healthcare & Medicines</option>
                      <option value="Insurance">Insurance Premium</option>
                      <option value="Mandatory EMI">Mandatory Loan EMI</option>
                      <option value="Education">Education & Tuition</option>
                    </optgroup>
                    <optgroup label="Wants (Discretionary Outflows)">
                      <option value="Dining">Dining Out & Food Delivery</option>
                      <option value="Shopping">Shopping & Fashion</option>
                      <option value="Entertainment">Entertainment & Streaming</option>
                      <option value="Travel">Travel & Weekend Getaways</option>
                      <option value="Lifestyle">Lifestyle & Personal Care</option>
                      <option value="Other">Other Want</option>
                    </optgroup>
                  </>
                )}
              </select>
            </label>
          </div>
          <Button disabled={logging} style={{ marginBottom: "2px" }}>
            {logging ? "Saving..." : (quickLogType === "savings" ? "Log Savings / Asset" : (quickLogType === "income" ? "Log Income" : "Log Expense"))}
          </Button>
        </form>
      </Card>


      {adaptive && (
        <Card glow className="adaptive-pulse-card" style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "18px", fontWeight: "bold", color: "var(--text-primary)" }}>
                  <Compass size={18} style={{ marginRight: "6px", verticalAlign: "middle", color: "var(--accent-primary)" }} />
                  Dynamic 50:30:20 Pulse
                </span>
                <Badge tone="info">Tier {adaptive.tier}: {adaptive.tier_name}</Badge>
                {adaptive.is_adapted ? (
                  <Badge tone="ai">Stepping Rule Active</Badge>
                ) : (
                  <Badge tone="success">Slab Target Aligned</Badge>
                )}
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
                Dynamically calibrated to your salary tier and actual spending velocity.
              </p>
            </div>
            <Link to="/profile">
              <Button variant="ghost" style={{ fontSize: "12px", padding: "6px 12px" }}>
                Adjust Income Slab →
              </Button>
            </Link>
          </div>

          <div className="grid-3" style={{ gap: "16px", marginBottom: "16px" }}>
            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Needs (Fixed)</span>
                <strong style={{ fontSize: "14px", color: adaptive.actual_needs_pct > adaptive.ideal_needs_pct ? "var(--accent-warning)" : "var(--text-primary)" }}>
                  {adaptive.actual_needs_pct}% / {adaptive.ideal_needs_pct}%
                </strong>
              </div>
              <Progress value={(adaptive.actual_needs_pct / Math.max(adaptive.ideal_needs_pct, 1)) * 100} tone={adaptive.actual_needs_pct <= adaptive.ideal_needs_pct ? "success" : "warning"} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
                <span>Spent: {currency(adaptive.needs_amount)}</span>
                <span>Slab Target: {adaptive.ideal_needs_pct}%{adaptive.recommended_needs_amount ? ` (${currency(adaptive.recommended_needs_amount)})` : ""}</span>
              </div>
            </div>

            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Wants (Discretionary)</span>
                <strong style={{ fontSize: "14px", color: adaptive.actual_wants_pct > adaptive.ideal_wants_pct ? "var(--accent-warning)" : "var(--text-primary)" }}>
                  {adaptive.actual_wants_pct}% / {adaptive.ideal_wants_pct}%
                </strong>
              </div>
              <Progress value={(adaptive.actual_wants_pct / Math.max(adaptive.ideal_wants_pct, 1)) * 100} tone={adaptive.actual_wants_pct <= adaptive.ideal_wants_pct ? "success" : "warning"} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
                <span>Spent: {currency(adaptive.wants_amount)}</span>
                <span>Slab Target: {adaptive.ideal_wants_pct}%{adaptive.recommended_wants_amount ? ` (${currency(adaptive.recommended_wants_amount)})` : ""}</span>
              </div>
            </div>

            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Savings & Surplus</span>
                <strong style={{ fontSize: "14px", color: "var(--accent-success)" }}>{adaptive.actual_savings_pct}% / {adaptive.ideal_savings_pct}%</strong>
              </div>
              <Progress value={(adaptive.actual_savings_pct / Math.max(adaptive.ideal_savings_pct, 1)) * 100} tone="success" />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
                <span>Capacity: {currency(adaptive.savings_amount)}</span>
                <span>Slab Target: {adaptive.ideal_savings_pct}%{adaptive.recommended_savings_amount ? ` (${currency(adaptive.recommended_savings_amount)})` : ""}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div className="recommendation" style={{ margin: 0, fontSize: "13px" }}>
              <strong>Rule Strategy:</strong> {adaptive.adaptation_message}
            </div>
          </div>
        </Card>
      )}

      <section className="grid-2">
        <Card><div className="section-title"><TrendingUp /> Net worth timeline</div><NetWorthChart data={charts.net_worth || []} /></Card>
        <Card><div className="section-title"><Activity /> Income vs expenses</div><IncomeExpenseChart data={charts.income_expense || []} /></Card>
        <Card><div className="section-title"><WalletCards /> Asset allocation</div><AllocationChart data={charts.asset_allocation || []} /></Card>
        <Card><div className="section-title"><ShieldCheck /> Financial health trend</div><HealthTrendChart data={charts.health_trend || []} /></Card>
      </section>

      <QuickLinks links={[
        { to: '/health', icon: Activity, label: 'Health Score', detail: 'View detailed breakdown' },
        { to: '/forecast', icon: LineChart, label: 'Forecast', detail: 'See projected trajectory' },
        { to: '/ai', icon: Cpu, label: 'AI Engine', detail: 'Forecasting & anomaly detection' },
        { to: '/goals', icon: Goal, label: 'Goals', detail: 'Track goal progress' },
        { to: '/simulator', icon: CircleDollarSign, label: 'Simulator', detail: 'Test financial decisions' },
      ]} />

      {loading && <div className="loading-overlay">Recalculating financial twin...</div>}
    </>
  );
}

export function FinancialTwin() {
  const { profile, health, goals, debt } = useFinance();
  const totalIncome = (Number(profile?.monthly_income) || 0) + (Number(profile?.other_income) || 0);
  const expensesList = profile?.detailed_expenses?.length ? profile.detailed_expenses : (profile?.monthly_expenses || []);
  const expenses = useMemo(() => expensesList.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0), [expensesList]);

  const activeDebts = useMemo(() => (debt?.items || []).filter((d) => d.status !== "paid_off"), [debt?.items]);
  const totalDebt = Number(debt?.total ?? profile?.total_debt ?? 0);
  const debtPayment = Number(debt?.monthly_emi ?? profile?.monthly_debt_payment ?? 0);
  const tangibleAssets = (Number(profile?.savings_balance) || 0)
    + (Number(profile?.emergency_fund) || 0)
    + (Number(profile?.investments_balance) || 0)
    + (Number(profile?.mutual_funds) || 0)
    + (Number(profile?.stocks) || 0)
    + (Number(profile?.fixed_deposits) || 0)
    + (Number(profile?.provident_fund) || 0)
    + (Number(profile?.real_estate_value) || 0)
    + (Number(profile?.gold) || 0)
    + (Number(profile?.crypto_value) || 0);
  const cashFlow = totalIncome - expenses - debtPayment;
  const dtiRatio = totalIncome > 0 ? debtPayment / totalIncome : 0;

  const nodes = useMemo(() => [
    { label: "Income", value: currency(totalIncome), trend: profile?.income_type ? `${profile.income_type} inflow` : "+ steady", x: 50, y: 16, tone: "success" },
    { label: "Assets", value: currency(tangibleAssets), trend: "Savings & Portfolio", x: 22, y: 44, tone: "info" },
    { label: "Liabilities / Debt", value: currency(totalDebt), trend: activeDebts.length > 0 ? `${activeDebts.length} active loan${activeDebts.length === 1 ? '' : 's'} (${percent(dtiRatio)} DTI)` : "0 debt balance", x: 78, y: 44, tone: totalDebt > 0 ? "warning" : "success" },
    { label: "Net Cash Flow", value: currency(cashFlow), trend: cashFlow >= 0 ? "+ monthly surplus" : "deficit pace", x: 50, y: 56, tone: "ai" },
    { label: "Goals", value: `${(profile?.goals || []).length} active`, trend: `${goals?.analysis?.[0]?.achievement_probability || 65}% achievable`, x: 32, y: 82, tone: "success" },
    { label: "Future State", value: "24 months", trend: "Baseline projection", x: 68, y: 82, tone: "info" },
  ], [profile, totalIncome, tangibleAssets, totalDebt, activeDebts, dtiRatio, cashFlow, goals]);

  return (
    <>
      <PageHeader eyebrow="Your Financial Digital Twin" title="Live computational model of your financial condition" subtitle="Changes made in simulations do not affect your real financial profile." />
      <section className="twin-header-grid">
        <MetricCard icon={<ShieldCheck />} label="Twin health" value={health?.grade || "Good"} detail="Model stable" tone="success" />
        <MetricCard icon={<Activity />} label="Last recalculated" value="2 sec ago" detail="Local demo sync" tone="info" />
        <MetricCard icon={<Gauge />} label="Model completeness" value={activeDebts.length > 0 ? "98%" : "94%"} detail="Profile, goals, debt, budget connected" tone="ai" />
      </section>
      
      <Card className="twin-visual">
        <div className="twin-grid-bg" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="twin-lines">
          {/* Foundational Capital & Solvency Triangle: Income (50, 16) -> Assets (22, 44) -> Debt (78, 44) -> Income */}
          <path d="M50 16 L22 44 L78 44 Z" className="twin-triangle" />
          
          {/* Operational Engine Convergence to Cash Flow (50, 56) */}
          <path d="M50 16 L50 56" className="twin-flow-income" />
          <path d="M22 44 L50 56" className="twin-flow-asset" />
          <path d="M78 44 L50 56" className="twin-flow-debt" />
          
          {/* Forward Allocations: Cash Flow -> Goals & Future State */}
          <path d="M50 56 L32 82 M50 56 L68 82" className="twin-flow-allocations" />
          
          {/* Coordinate Joint Markers */}
          <circle cx="50" cy="16" r="1.5" className="twin-joint" />
          <circle cx="22" cy="44" r="1.5" className="twin-joint" />
          <circle cx="78" cy="44" r="1.5" className="twin-joint" />
          <circle cx="50" cy="56" r="1.8" className="twin-joint" />
          <circle cx="32" cy="82" r="1.5" className="twin-joint" />
          <circle cx="68" cy="82" r="1.5" className="twin-joint" />
        </svg>
        {nodes.map((node) => (
          <div className={`twin-node ${node.tone}`} key={node.label} style={{ left: `${node.x}%`, top: `${node.y}%` }}>
            <strong>{node.label}</strong>
            <span>{node.value}</span>
            <small>{node.trend}</small>
          </div>
        ))}
      </Card>

      {/* Twin Loan & Liabilities Portfolio Breakdown */}
      {activeDebts.length > 0 && (
        <Card style={{ marginTop: "20px" }}>
          <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CreditCard size={18} /> Active Loan & Liability Engine ({activeDebts.length} Tracked)
            </span>
            <Link to="/debt">
              <Button variant="secondary" size="sm" style={{ fontSize: "12px" }}>
                Manage in Debt Hub <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", marginTop: "14px" }}>
            {activeDebts.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  padding: "14px",
                  background: "var(--bg-elevated)",
                  display: "grid",
                  gap: "8px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <div>
                    <strong style={{ fontSize: "14px", color: "var(--text-primary)", display: "block" }}>{item.name}</strong>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {item.lender ? `${item.lender} • ` : ""}{item.loan_type || "Loan"}
                      {item.account_number ? ` • Ref: ${item.account_number}` : ""}
                    </span>
                  </div>
                  <Badge tone={item.is_secured ? "info" : "warning"}>
                    {item.is_secured ? "Secured" : "Unsecured"}
                  </Badge>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Outstanding Balance:</span>
                  <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono, monospace)" }}>
                    {currency(item.outstanding)}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--text-muted)" }}>
                  <span>EMI: {currency(item.emi)}/mo (Day {item.emi_day || 5})</span>
                  <span>{item.interest_rate}% {item.interest_type || "Floating"}</span>
                </div>
                {item.collateral && (
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", borderTop: "1px solid var(--border-color)", paddingTop: "6px" }}>
                    Collateral: {item.collateral}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <section className="grid-2" style={{ marginTop: "20px" }}>
        <Card><div className="section-title"><Network /> How your twin works</div><div className="flow-line"><span>Profile Data</span><span>Financial State</span><span>Health Engine</span><span>Forecast Engine</span><span>Goal Engine</span><span>Decision Simulator</span><span>AI Copilot</span></div></Card>
        <Card><div className="section-title"><Landmark /> Financial state</div><div className="state-list">{["Income", "Expenses", "Savings", "Assets", "Investments", "Debt", "Goals", "Emergency Fund"].map((item) => <span key={item}>{item}</span>)}</div></Card>
      </section>
      <QuickLinks links={[
        { to: '/debt', icon: CreditCard, label: 'Debt & Loans', detail: 'Manage loan commitments' },
        { to: '/health', icon: Activity, label: 'Health Assessment', detail: 'See what drives your score' },
        { to: '/simulator', icon: CircleDollarSign, label: 'Simulator', detail: 'Test changes to your twin' },
        { to: '/copilot', icon: BrainCircuit, label: 'AI Copilot', detail: 'Ask questions about your data' },
      ]} />
    </>
  );
}

export function MyMoney() {
  const { profile, transactions, budget, debt } = useFinance();

  const { expensesList, sourceLabel } = useMemo(() => {
    if (profile?.detailed_expenses && profile.detailed_expenses.length > 0) {
      return { expensesList: profile.detailed_expenses, sourceLabel: "Financial Profile" };
    }
    if (profile?.monthly_expenses && profile.monthly_expenses.length > 0) {
      return { expensesList: profile.monthly_expenses, sourceLabel: "Monthly Expenses" };
    }
    if (transactions?.summary?.by_category && transactions.summary.by_category.length > 0) {
      return {
        expensesList: transactions.summary.by_category.map((c) => ({
          category: c.category,
          amount: c.amount,
        })),
        sourceLabel: "Logged Transactions"
      };
    }
    if (budget?.items && budget.items.length > 0) {
      return {
        expensesList: budget.items.map((b) => ({
          category: b.category,
          amount: b.actual || b.planned || 0,
        })),
        sourceLabel: "Active Budget"
      };
    }
    return {
      expensesList: demoProfile.detailed_expenses || demoProfile.monthly_expenses || [],
      sourceLabel: "Benchmark Baseline"
    };
  }, [profile?.detailed_expenses, profile?.monthly_expenses, transactions?.summary?.by_category, budget?.items]);

  const totalExpenses = useMemo(() => {
    return expensesList.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
  }, [expensesList]);

  const monthlyIncome = (Number(profile?.monthly_income) || 0) + (Number(profile?.other_income) || 0);
  const monthlyDebt = Number(debt?.monthly_emi ?? profile?.monthly_debt_payment ?? 0);
  const netSurplus = monthlyIncome - totalExpenses - monthlyDebt;

  return (
    <>
      <PageHeader eyebrow="My Money" title="Unified financial state" subtitle="One operating view for income, expenses, savings, debt and goals." />
      <section className="metric-grid">
        <MetricCard icon={<IndianRupee />} label="Monthly Income" value={currency(monthlyIncome)} detail="Inflows" tone="success" />
        <MetricCard icon={<Activity />} label="Monthly Expenses" value={currency(totalExpenses)} detail="Tracked burn" tone="warning" />
        <MetricCard icon={<CreditCard />} label="Debt Commitments" value={currency(monthlyDebt)} detail="Monthly EMI" tone={monthlyDebt > 0 ? "warning" : "success"} />
        <MetricCard icon={<TrendingUp />} label="Net Cash Flow" value={currency(netSurplus)} detail={netSurplus >= 0 ? "Monthly surplus" : "Deficit pace"} tone={netSurplus >= 0 ? "success" : "danger"} />
      </section>

      <Card>
        <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Compass size={18} /> Money Map & Expense Allocation
          </span>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Badge tone="info">{sourceLabel}</Badge>
            <Badge tone="ai">{currency(totalExpenses)}/mo</Badge>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px", marginTop: "16px" }}>
          {expensesList.map((item) => {
            const name = item?.category || item?.name || "Expense";
            const amt = Number(item?.amount) || 0;
            const pct = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0;
            return (
              <div
                key={name}
                style={{
                  background: "var(--bg-elevated, rgba(255, 255, 255, 0.03))",
                  border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                  borderRadius: "10px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>{name}</strong>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--accent-primary, #3b82f6)" }}>
                    {currency(amt)}
                  </span>
                </div>
                <Progress value={pct} tone={pct > 30 ? "warning" : "info"} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)" }}>
                  <span>{pct}% of monthly burn</span>
                  <span>{monthlyIncome > 0 ? `${Math.round((amt / monthlyIncome) * 100)}% of income` : ""}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Category allocations calibrated with your financial twin profile and transactions.
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <Link to="/budget">
              <Button variant="secondary" size="sm" style={{ fontSize: "12px" }}>
                <SlidersHorizontal size={14} /> Adjust Budget
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="ghost" size="sm" style={{ fontSize: "12px" }}>
                Edit In Profile →
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <QuickLinks links={[
        { to: '/budget', icon: SlidersHorizontal, label: 'Budget', detail: 'Category-level spending' },
        { to: '/transactions', icon: IndianRupee, label: 'Transactions', detail: 'Income & expense records' },
        { to: '/goals', icon: Goal, label: 'Goals', detail: 'Financial goal planner' },
        { to: '/investments', icon: PieChart, label: 'Investments', detail: 'Portfolio overview' },
        { to: '/debt', icon: CreditCard, label: 'Debt', detail: 'EMI & payoff tracker' },
      ]} />
    </>
  );
}

export function Help() {
  return (
    <>
      <PageHeader eyebrow="Help" title="User Guide & FAQ" subtitle="Learn how to get the most out of FinGear AI." />
      <section className="grid-2">
        <Card>
          <div className="section-title">Getting Started</div>
          <div style={{ display: 'grid', gap: '16px' }}>
            <p><strong>1. Complete your profile</strong><br/>Head to the Profile section and fill in your current financial details. FinGear AI uses this data to generate your initial financial twin.</p>
            <p><strong>2. Review your forecast</strong><br/>Check the Financial Forecast page to see a projection based on your current inputs.</p>
            <p><strong>3. Use the Simulator</strong><br/>Before making major financial decisions (e.g. taking a loan, changing jobs), test them in the What-if Simulator.</p>
          </div>
        </Card>
        <Card>
          <div className="section-title">Frequently Asked Questions</div>
          <div style={{ display: 'grid', gap: '16px' }}>
            <p><strong>Are my details secure?</strong><br/>Yes, all profile data is stored securely. Passwords are hashed, and sessions are encrypted.</p>
            <p><strong>How accurate is the forecast?</strong><br/>The forecast relies on your accurate input. The model applies statistical projections but actual results depend on real-world factors.</p>
            <p><strong>Can I export my data?</strong><br/>Reporting is available, and PDF exports are on the roadmap for future updates.</p>
          </div>
        </Card>
      </section>
    </>
  );
}
