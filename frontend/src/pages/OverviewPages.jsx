import { Activity, ArrowRight, BrainCircuit, CircleDollarSign, Compass, Cpu, CreditCard, Gauge, Goal, IndianRupee, Landmark, LineChart, Network, PieChart, Plus, ShieldCheck, SlidersHorizontal, Sparkles, Target, TrendingUp, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AllocationChart, HealthTrendChart, IncomeExpenseChart, NetWorthChart } from "../components/charts";
import { Badge, Button, Card, MetricCard, NumberInput, PageHeader, Progress, QuickLinks } from "../components/ui";
import { useFinance } from "../context/FinanceContext";
import { useAuth } from "../context/AuthContext";
import { currency } from "../lib/format";

export function Dashboard() {
  const { user } = useAuth();
  const { dashboard, health, loading, aiForecast, aiAnomalies, addTransaction, profile } = useFinance();
  const kpis = dashboard?.kpis || [];
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
  const { profile, health, goals } = useFinance();
  const expenses = useMemo(() => profile.monthly_expenses.reduce((sum, item) => sum + item.amount, 0), [profile.monthly_expenses]);
  const nodes = useMemo(() => [
    { label: "Income", value: currency(profile.monthly_income), trend: "+ stable", x: 50, y: 18, tone: "success" },
    { label: "Assets", value: currency(profile.savings_balance + profile.investments_balance), trend: "+8.4% projected", x: 28, y: 42, tone: "info" },
    { label: "Debt", value: currency(profile.total_debt), trend: "7% income burden", x: 72, y: 42, tone: "warning" },
    { label: "Cash Flow", value: currency(profile.monthly_income - expenses - profile.monthly_debt_payment), trend: "Decision capacity", x: 50, y: 55, tone: "ai" },
    { label: "Goals", value: `${profile.goals.length} active`, trend: `${goals.analysis?.[0]?.achievement_probability || 65}% achievable`, x: 34, y: 76, tone: "success" },
    { label: "Future State", value: "24 months", trend: "Baseline projection", x: 66, y: 76, tone: "info" },
  ], [profile, expenses, goals]);

  return (
    <>
      <PageHeader eyebrow="Your Financial Digital Twin" title="Live computational model of your financial condition" subtitle="Changes made in simulations do not affect your real financial profile." />
      <section className="twin-header-grid">
        <MetricCard icon={<ShieldCheck />} label="Twin health" value={health?.grade || "Good"} detail="Model stable" tone="success" />
        <MetricCard icon={<Activity />} label="Last recalculated" value="2 sec ago" detail="Local demo sync" tone="info" />
        <MetricCard icon={<Gauge />} label="Model completeness" value="94%" detail="Profile, goals, debt, budget connected" tone="ai" />
      </section>
      <Card className="twin-visual" glow>
        <div className="twin-grid-bg" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="twin-lines">
          <path d="M50 20 L28 42 L50 55 L34 76 M50 20 L72 42 L50 55 L66 76" />
        </svg>
        {nodes.map((node) => (
          <div className={`twin-node ${node.tone}`} key={node.label} style={{ left: `${node.x}%`, top: `${node.y}%` }}>
            <strong>{node.label}</strong>
            <span>{node.value}</span>
            <small>{node.trend}</small>
          </div>
        ))}
      </Card>
      <section className="grid-2">
        <Card><div className="section-title"><Network /> How your twin works</div><div className="flow-line"><span>Profile Data</span><span>Financial State</span><span>Health Engine</span><span>Forecast Engine</span><span>Goal Engine</span><span>Decision Simulator</span><span>AI Copilot</span></div></Card>
        <Card><div className="section-title"><Landmark /> Financial state</div><div className="state-list">{["Income", "Expenses", "Savings", "Assets", "Investments", "Debt", "Goals", "Emergency Fund"].map((item) => <span key={item}>{item}</span>)}</div></Card>
      </section>
      <QuickLinks links={[
        { to: '/health', icon: Activity, label: 'Health Assessment', detail: 'See what drives your score' },
        { to: '/simulator', icon: CircleDollarSign, label: 'Simulator', detail: 'Test changes to your twin' },
        { to: '/copilot', icon: BrainCircuit, label: 'AI Copilot', detail: 'Ask questions about your data' },
      ]} />
    </>
  );
}

export function MyMoney() {
  const { profile, transactions } = useFinance();
  return (
    <>
      <PageHeader eyebrow="My Money" title="Unified financial state" subtitle="One operating view for income, expenses, savings, debt and goals." />
      <section className="metric-grid">
        <MetricCard icon={<IndianRupee />} label="Income" value={currency(profile.monthly_income)} detail="Monthly" tone="success" />
        <MetricCard icon={<Activity />} label="Expenses" value={currency(transactions.summary?.expenses || 0)} detail="This month" tone="warning" />
        <MetricCard icon={<WalletCards />} label="Investments" value={currency(profile.investments_balance)} detail="Current portfolio" tone="info" />
        <MetricCard icon={<Goal />} label="Goals" value={profile.goals.length} detail="Active plans" tone="ai" />
      </section>
      <Card><div className="section-title">Money map</div><div className="state-list large">{profile.monthly_expenses.map((item) => <span key={item.category}>{item.category}: {currency(item.amount)}</span>)}</div></Card>
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
