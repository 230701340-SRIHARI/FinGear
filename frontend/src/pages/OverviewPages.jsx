import { Activity, ArrowRight, BrainCircuit, CircleDollarSign, CreditCard, Gauge, Goal, IndianRupee, Landmark, LineChart, Network, PieChart, ShieldCheck, SlidersHorizontal, Sparkles, TrendingUp, WalletCards } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AllocationChart, HealthTrendChart, IncomeExpenseChart, NetWorthChart } from "../components/charts";
import { Badge, Button, Card, MetricCard, PageHeader, Progress, QuickLinks } from "../components/ui";
import { useFinance } from "../context/FinanceContext";
import { currency } from "../lib/format";

export function Dashboard() {
  const { dashboard, health, loading } = useFinance();
  const kpis = dashboard?.kpis || [];
  const charts = dashboard?.charts || {};

  const kpiCards = useMemo(() => kpis.map((kpi) => (
    <MetricCard key={kpi.label} icon={<Gauge />} label={kpi.label} value={kpi.value} detail={kpi.detail} tone={kpi.tone} />
  )), [kpis]);

  return (
    <>
      <PageHeader
        eyebrow="Executive overview"
        title={dashboard?.greeting || "Good morning, Student"}
        subtitle={dashboard?.status || "Your financial system is stable."}
        actions={<Link to="/simulator"><Button><Sparkles size={17} /> Open Decision Lab</Button></Link>}
      />

      <section className="hero-grid">
        <Card className="hero-card" glow>
          <Badge tone="success">Twin Status: Live</Badge>
          <h2>Financial Health {health?.score || dashboard?.health?.score || 72}/100</h2>
          <p>Current state, predictive state and decision intelligence are connected through your computational financial profile.</p>
          <div className="hero-actions">
            <Link to="/financial-twin"><Button variant="secondary">View Twin <ArrowRight size={16} /></Button></Link>
            <Link to="/health"><Button variant="ghost">Explain Score</Button></Link>
          </div>
        </Card>
        <Card className="ai-brief">
          <div className="section-title"><BrainCircuit /> AI Financial Brief <Badge tone="ai">{dashboard?.ai_brief?.confidence || 84}% confidence</Badge></div>
          <div className="brief-columns">
            <div><strong>Positive</strong>{(dashboard?.ai_brief?.positive || []).map((item) => <p key={item}>+ {item}</p>)}</div>
            <div><strong>Needs attention</strong>{(dashboard?.ai_brief?.attention || []).map((item) => <p key={item}>! {item}</p>)}</div>
          </div>
          <p className="recommendation">{dashboard?.ai_brief?.recommendation}</p>
        </Card>
      </section>

      <section className="metric-grid six">
        {kpiCards}
      </section>

      <section className="grid-2">
        <Card><div className="section-title"><TrendingUp /> Net worth timeline</div><NetWorthChart data={charts.net_worth || []} /></Card>
        <Card><div className="section-title"><Activity /> Income vs expenses</div><IncomeExpenseChart data={charts.income_expense || []} /></Card>
        <Card><div className="section-title"><WalletCards /> Asset allocation</div><AllocationChart data={charts.asset_allocation || []} /></Card>
        <Card><div className="section-title"><ShieldCheck /> Financial health trend</div><HealthTrendChart data={charts.health_trend || []} /></Card>
      </section>

      <QuickLinks links={[
        { to: '/health', icon: Activity, label: 'Health Score', detail: 'View detailed breakdown' },
        { to: '/forecast', icon: LineChart, label: 'Forecast', detail: 'See projected trajectory' },
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
