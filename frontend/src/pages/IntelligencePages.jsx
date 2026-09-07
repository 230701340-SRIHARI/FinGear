import { Activity, Bot, BrainCircuit, CircleDollarSign, Compass, Cpu, FileText, Goal, LineChart, MessageSquare, ShieldAlert, Sparkles, SlidersHorizontal, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { HealthTrendChart, NetWorthChart, ScoreRadial } from "../components/charts";
import { Badge, Button, Card, EmptyState, Field, MetricCard, PageHeader, Progress, QuickLinks } from "../components/ui";
import { useFinance } from "../context/FinanceContext";
import { currency } from "../lib/format";

export function Health() {
  const { health, profile } = useFinance();
  const conf = health?.data_confidence || {};
  const tier = health?.tier_info || {};
  const caps = health?.cap_applied;
  const riskFlags = health?.risk_flags || [];

  return (
    <>
      <PageHeader 
        eyebrow="Financial Health Network Framework" 
        title="Financial Health Assessment" 
        subtitle="Transparent, adaptive scoring powered by real transactions, income tier targets, and liquidity guardrails — not a black-box ML score." 
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Badge tone="ai">🏛️ {health?.method || "Explainable Financial Health Model"}</Badge>
            <Badge tone={conf.score >= 80 ? "success" : conf.score >= 50 ? "info" : "warning"}>
              {conf.badge || "Confidence: 85%"}
            </Badge>
            <Badge tone="info">Tier {tier.tier || 1}: {tier.name || "Baseline"}</Badge>
          </div>
        }
      />

      {/* Safety Cap Notice */}
      {caps && (
        <Card style={{ marginBottom: "16px", border: "1px solid var(--accent-warning)", background: "rgba(245, 158, 11, 0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldAlert size={22} style={{ color: "var(--accent-warning)", flexShrink: 0 }} />
            <div>
              <strong style={{ color: "var(--accent-warning)" }}>Safety Cap Active: {caps}</strong>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                Your final score is safeguarded by financial health guardrails to prevent overestimating health under critical deficits or extreme debt loads.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Risk Flags */}
      {riskFlags.length > 0 && (
        <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
          {riskFlags.map((flag) => (
            <Card key={flag.code} style={{ border: "1px solid var(--accent-danger)", background: "rgba(239, 68, 68, 0.07)", padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldAlert size={18} style={{ color: "var(--accent-danger)", flexShrink: 0 }} />
                <div>
                  <strong style={{ color: "var(--accent-danger)", fontSize: "14px" }}>{flag.label}</strong>
                  <span style={{ marginLeft: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>{flag.message}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <section className="grid-2">
        <Card glow>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: '8px' }}>
            <Badge tone="ai">Score: {health?.score || 0}/100</Badge>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Raw: {health?.raw_score ?? health?.score}/100</span>
          </div>
          <ScoreRadial value={health?.score || 0} />
          <h2 style={{ marginTop: "12px", marginBottom: "4px" }}>{health?.grade}</h2>
          <p className="muted" style={{ fontSize: "13px", margin: "0 0 10px" }}>{health?.grade_meaning}</p>
          <p>{health?.why}</p>
        </Card>

        <Card>
          <div className="section-title"><BrainCircuit /> Adaptive Intelligence & Data Confidence</div>
          
          {/* Data Confidence Box */}
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Data Confidence Level</span>
              <Badge tone={conf.score >= 80 ? "success" : conf.score >= 50 ? "info" : "warning"}>
                {conf.score || 75}% · {conf.level || "Moderate confidence"}
              </Badge>
            </div>
            <Progress value={conf.score || 75} tone={conf.score >= 80 ? "success" : conf.score >= 50 ? "info" : "warning"} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "10px", fontSize: "11px", color: "var(--text-muted)" }}>
              <span>History: {conf.breakdown?.history_completeness ?? 60}%</span>
              <span>Categorised: {conf.breakdown?.categorisation_completeness ?? 85}%</span>
              <span>Income Verified: {conf.breakdown?.income_verification ?? 80}%</span>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
              Note: Health score is not reduced for incomplete records. Separate confidence badge ensures transparency.
            </p>
          </div>

          <div className="section-title" style={{ fontSize: "14px", marginBottom: "6px" }}>Core Financial Guidance</div>
          <p className="recommendation" style={{ margin: 0 }}>
            {health?.suggestions?.[0] || "Maintain current savings velocity and log daily expenses."}
          </p>
          {health?.suggestions?.[1] && (
            <p className="recommendation" style={{ margin: "8px 0 0", background: "rgba(255, 255, 255, 0.03)" }}>
              {health.suggestions[1]}
            </p>
          )}
        </Card>
      </section>

      {/* 5-Tier Adaptive Budget Pulse */}
      {health?.adaptive_ratio && (
        <Card glow style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <div className="section-title" style={{ margin: 0 }}>
              <Compass /> Tier {health.adaptive_ratio.tier} ({health.adaptive_ratio.tier_name}) Budget Targets vs Actuals
            </div>
            {health.adaptive_ratio.is_adapted ? (
              <Badge tone="ai">Stepping Rule Active (5% Income Max Reduction/Mo)</Badge>
            ) : (
              <Badge tone="success">Tier Target Aligned</Badge>
            )}
          </div>

          <div className="grid-3" style={{ gap: '14px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Fixed Needs (Rent, Bills, EMI)</span>
                <strong>{health.adaptive_ratio.actual_needs_pct}% / {health.adaptive_ratio.ideal_needs_pct}%</strong>
              </div>
              <Progress value={(health.adaptive_ratio.actual_needs_pct / Math.max(health.adaptive_ratio.ideal_needs_pct, 1)) * 100} tone={health.adaptive_ratio.actual_needs_pct <= health.adaptive_ratio.ideal_needs_pct ? "success" : "warning"} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>Spent: {currency(health.adaptive_ratio.needs_amount)}</span>
                <span>Tier Target: {health.adaptive_ratio.ideal_needs_pct}%</span>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Discretionary Wants (Dining, OTT, Shopping)</span>
                <strong style={{ color: health.adaptive_ratio.actual_wants_pct > health.adaptive_ratio.ideal_wants_pct ? 'var(--accent-warning)' : 'inherit' }}>
                  {health.adaptive_ratio.actual_wants_pct}% / {health.adaptive_ratio.ideal_wants_pct}%
                </strong>
              </div>
              <Progress value={(health.adaptive_ratio.actual_wants_pct / Math.max(health.adaptive_ratio.ideal_wants_pct, 1)) * 100} tone={health.adaptive_ratio.actual_wants_pct <= health.adaptive_ratio.ideal_wants_pct ? "success" : "warning"} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>Spent: {currency(health.adaptive_ratio.wants_amount)}</span>
                <span>Tier Target: {health.adaptive_ratio.ideal_wants_pct}%</span>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Savings & Wealth Building</span>
                <strong style={{ color: 'var(--accent-success)' }}>{health.adaptive_ratio.actual_savings_pct}% / {health.adaptive_ratio.ideal_savings_pct}%</strong>
              </div>
              <Progress value={(health.adaptive_ratio.actual_savings_pct / Math.max(health.adaptive_ratio.ideal_savings_pct, 1)) * 100} tone="success" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>Capacity: {currency(health.adaptive_ratio.savings_amount)}</span>
                <span>Tier Target: {health.adaptive_ratio.ideal_savings_pct}%</span>
              </div>
            </div>
          </div>

          <div className="recommendation" style={{ margin: 0, fontSize: '13px' }}>
            <strong>Action Guidance:</strong> {health.adaptive_ratio.adaptation_message}
          </div>
        </Card>
      )}

      {/* 5 Core Components Breakdown */}
      <Card style={{ marginTop: '16px' }}>
        <div className="section-title" style={{ marginBottom: "16px" }}>
          <Activity /> 5 Core Outcome Dimensions (0–100 Weighted Breakdown)
        </div>
        <div className="health-components" style={{ display: "grid", gap: "16px" }}>
          {(health?.components || []).map((item) => (
            <article key={item.label || item.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 100px", alignItems: "center", gap: "16px", padding: "12px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>{item.label}</strong>
                  <Badge tone="info">{item.weight_pct}% weight · Max {item.max_points} pts</Badge>
                </div>
                <span style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{item.reason}</span>
              </div>
              <div>
                <Progress value={item.value} tone={item.value >= 75 ? "success" : item.value >= 50 ? "info" : "warning"} />
              </div>
              <div style={{ textAlign: "right" }}>
                <b style={{ fontSize: "16px", color: item.value >= 75 ? "var(--accent-success)" : item.value >= 50 ? "var(--text-primary)" : "var(--accent-warning)" }}>
                  {item.contribution ?? item.value}
                </b>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>/{item.max_points} pts ({item.value}%)</span>
              </div>
            </article>
          ))}
        </div>
      </Card>

      <QuickLinks links={[
        { to: '/forecast', icon: LineChart, label: 'Forecast', detail: 'See future trajectory' },
        { to: '/simulator', icon: CircleDollarSign, label: 'Simulator', detail: 'Test ways to improve score' },
        { to: '/goals', icon: Goal, label: 'Goals', detail: 'Check goal feasibility' },
        { to: '/budget', icon: SlidersHorizontal, label: 'Budget', detail: 'Control spending habits' },
      ]} />
    </>
  );
}


export function Forecast() {
  const { forecast, fetchForecast } = useFinance();
  const [period, setPeriod] = useState(24);

  useEffect(() => {
    fetchForecast(period);
  }, [period]);

  return (
    <>
      <PageHeader 
        eyebrow="Predictive analytics" 
        title="Financial Forecast" 
        subtitle="Projected financial trajectory generated by Machine Learning models (ARIMA & Random Forest)." 
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Badge tone="ai">🤖 {forecast.mode || "ML Forecast Model"}</Badge>
            <Badge tone="info">Confidence: {forecast.confidence || 90}%</Badge>
            <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
              {[6,12,24,36,60].map((m) => <option value={m} key={m}>{m} months</option>)}
            </select>
          </div>
        } 
      />
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="section-title" style={{ margin: 0 }}>Projected Net Worth</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Badge tone="ai">Model Version: {forecast.model_version || "ARIMA(1,1,1)"}</Badge>
            <Badge tone="info">Forecast starts from {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</Badge>
          </div>
        </div>
        <NetWorthChart data={forecast.months || []} />
      </Card>
      <Card>
        <div className="section-title">Forecast assumptions & ML Model parameters</div>
        <div className="state-list">
          {Object.entries(forecast.assumptions || {}).map(([key, value]) => (
            <span key={key}>{key.replaceAll("_", " ")}: {String(value)}</span>
          ))}
        </div>
      </Card>
      <QuickLinks links={[
        { to: '/health', icon: Activity, label: 'Health Score', detail: 'Current financial health' },
        { to: '/simulator', icon: CircleDollarSign, label: 'Simulator', detail: 'Test different scenarios' },
        { to: '/goals', icon: Goal, label: 'Goals', detail: 'Goal achievement analysis' },
      ]} />
    </>
  );
}

export function Copilot() {
  const { profile, copilotContext, askCopilot } = useFinance();
  const [question, setQuestion] = useState("Can I increase my SIP by ₹5,000?");
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setThinking(true);
    const result = await askCopilot(question);
    setMessages((current) => [...current, { role: "user", text: question }, { role: "assistant", text: result.answer, source: result.source }]);
    setThinking(false);
  }

  return (
    <>
      <PageHeader 
        eyebrow="AI workspace" 
        title="AI Financial Copilot" 
        subtitle="Answers use the current financial context and local ML calculations. It does not invent numbers." 
        actions={<Badge tone="ai">🤖 LLM + ML Twin Active</Badge>}
      />
      <section className="copilot-layout">
        <Card><div className="section-title"><MessageSquare /> Conversation history</div>{copilotContext.conversations?.length ? copilotContext.conversations.map((item) => <p key={item.id}>{item.question}</p>) : <p className="muted">No conversations yet.</p>}</Card>
        <Card className="chat-panel" glow>
          <div className="message-list">{messages.length ? messages.map((message, index) => <div key={index} className={`message ${message.role}`}><Badge tone={message.role === "assistant" ? "ai" : "info"}>{message.source || message.role}</Badge><p>{message.text}</p></div>) : <EmptyState title="Ask a financial question" detail="Example: How can I optimize my monthly savings rate?" />}{thinking && <div className="message assistant thinking">AI is reading your profile and assumptions...</div>}</div>
          <form onSubmit={submit} className="copilot-input"><input value={question} onChange={(e) => setQuestion(e.target.value)} /><Button><Bot size={17} /> Ask</Button></form>
        </Card>
        <Card><div className="section-title"><BrainCircuit /> Current profile context</div><div className="state-list"><span>Income: {currency(profile.monthly_income)}</span><span>Expenses: {currency(profile.monthly_expenses.reduce((s, i) => s + i.amount, 0))}</span><span>Savings: {currency(profile.savings_balance)}</span><span>Debt: {currency(profile.total_debt)}</span><span>Active goals: {profile.goals.length}</span><span>Forecast: Positive baseline</span></div></Card>
      </section>
    </>
  );
}

export function Insights() {
  const { insights } = useFinance();
  
  const sortedInsights = [...(insights.insights || [])].sort((a, b) => {
    const priority = { risk: 1, danger: 1, warning: 2, info: 3, success: 4 };
    return (priority[a.severity] || 5) - (priority[b.severity] || 5);
  });

  return (
    <>
      <PageHeader 
        eyebrow="AI Insights" 
        title="Automated financial intelligence center" 
        subtitle="Risks, opportunities and behavior changes generated from your financial twin." 
        actions={<Badge tone="ai">🤖 Anomaly & Insight Brain</Badge>}
      />
      <section className="insight-grid">
        {sortedInsights.map((item) => (
          <Card key={item.title}>
            <Badge tone={item.severity === "risk" ? "danger" : item.severity}>{item.severity}</Badge>
            <h2 style={{ fontSize: '17px', fontWeight: 600, margin: '12px 0 8px', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>{item.title}</h2>
            <div style={{ display: 'grid', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <p><strong>Reason:</strong> {item.reason}</p>
              <p><strong>Impact:</strong> {item.impact}</p>
              <p style={{ marginTop: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', color: 'var(--text-primary)' }}><strong>Action:</strong> {item.action}</p>
            </div>
          </Card>
        ))}
      </section>
    </>
  );
}

export function Timeline() {
  const { timeline } = useFinance();
  return (
    <>
      <PageHeader eyebrow="Financial Timeline" title="Chronological financial event stream" subtitle="A history layer for your personal finance operating system." />
      <Card><div className="timeline">{timeline.events?.map((event) => <article key={`${event.period}-${event.title}`}><Badge tone="info">{event.period}</Badge><strong>{event.title}</strong><span>{event.value}</span><small>{event.type}</small></article>)}</div></Card>
    </>
  );
}

export function Reports() {
  const { reports } = useFinance();
  return (
    <>
      <PageHeader eyebrow="Reports" title="Professional financial reports" subtitle="PDF export is marked planned until implementation is added." />
      <section className="report-grid">{reports.reports?.map((report) => <Card key={report.name}><FileText /><h2>{report.name}</h2><Badge tone={report.status === "Ready" ? "success" : "warning"}>{report.status}</Badge><p>{report.summary}</p><Button variant={report.status === "Ready" ? "secondary" : "ghost"} disabled={report.status !== "Ready"}>View report</Button></Card>)}</section>
    </>
  );
}
