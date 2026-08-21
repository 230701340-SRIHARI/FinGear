import { Activity, Bot, BrainCircuit, FileText, LineChart, MessageSquare, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { HealthTrendChart, NetWorthChart, ScoreRadial } from "../components/charts";
import { Badge, Button, Card, EmptyState, Field, MetricCard, PageHeader, Progress } from "../components/ui";
import { useFinance } from "../context/FinanceContext";
import { currency } from "../lib/format";

export function Health() {
  const { health, profile } = useFinance();
  return (
    <>
      <PageHeader eyebrow="Explainable AI" title="Financial Health Assessment" subtitle="Transparent component-level scoring instead of opaque black-box output." />
      <section className="grid-2">
        <Card glow><ScoreRadial value={health?.score || 0} /><h2>{health?.grade}</h2><p>{health?.why}</p></Card>
        <Card><div className="section-title"><BrainCircuit /> Why this score?</div><p className="recommendation">{health?.suggestions?.[0]}</p><p>Current emergency fund: {currency(profile.emergency_fund)}. Recommended target: around {currency((profile.monthly_expenses.reduce((s, i) => s + i.amount, 0) + profile.monthly_debt_payment) * 6)}.</p></Card>
      </section>
      <Card>
        <div className="health-components">{(health?.components || []).map((item) => <article key={item.label}><div><strong>{item.label}</strong><span>{item.reason}</span></div><b>{item.value}/100</b><Progress value={item.value} tone={item.value >= 70 ? "success" : "warning"} /></article>)}</div>
      </Card>
    </>
  );
}

export function Forecast() {
  const { forecast } = useFinance();
  const [period, setPeriod] = useState(24);
  return (
    <>
      <PageHeader eyebrow="Predictive analytics" title="Financial Forecast" subtitle="Projected financial trajectory based on current behavior. Current output is labelled baseline projection, not trained ML." actions={<select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>{[6,12,24,36,60].map((m) => <option key={m}>{m}</option>)}</select>} />
      <section className="metric-grid">
        <MetricCard icon={<LineChart />} label="Model" value={forecast.mode} detail={forecast.model_version || "baseline-v1"} tone="info" />
        <MetricCard icon={<Activity />} label="Confidence" value={`${forecast.confidence || 84}%`} detail="Assumption confidence" tone="ai" />
        <MetricCard icon={<ShieldAlert />} label="ML metrics" value="Pending" detail={forecast.metrics?.note || "No trained dataset yet"} tone="warning" />
      </section>
      <Card><NetWorthChart data={forecast.months?.slice(0, period) || []} /></Card>
      <Card><div className="section-title">Forecast assumptions</div><div className="state-list">{Object.entries(forecast.assumptions || {}).map(([key, value]) => <span key={key}>{key.replaceAll("_", " ")}: {value}</span>)}</div></Card>
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
      <PageHeader eyebrow="AI workspace" title="AI Financial Copilot" subtitle="Answers use the current financial context and local calculations. It does not invent numbers." />
      <section className="copilot-layout">
        <Card><div className="section-title"><MessageSquare /> Conversation history</div>{copilotContext.conversations?.length ? copilotContext.conversations.map((item) => <p key={item.id}>{item.question}</p>) : <p className="muted">No conversations yet.</p>}</Card>
        <Card className="chat-panel" glow>
          <div className="message-list">{messages.length ? messages.map((message, index) => <div key={index} className={`message ${message.role}`}><Badge tone={message.role === "assistant" ? "ai" : "info"}>{message.source || message.role}</Badge><p>{message.text}</p></div>) : <EmptyState title="Ask a financial question" detail="Example: Can I afford a ₹15 lakh car?" />}{thinking && <div className="message assistant thinking">AI is reading your profile and assumptions...</div>}</div>
          <form onSubmit={submit} className="copilot-input"><input value={question} onChange={(e) => setQuestion(e.target.value)} /><Button><Bot size={17} /> Ask</Button></form>
        </Card>
        <Card><div className="section-title"><BrainCircuit /> Current profile context</div><div className="state-list"><span>Income: {currency(profile.monthly_income)}</span><span>Expenses: {currency(profile.monthly_expenses.reduce((s, i) => s + i.amount, 0))}</span><span>Savings: {currency(profile.savings_balance)}</span><span>Debt: {currency(profile.total_debt)}</span><span>Active goals: {profile.goals.length}</span><span>Forecast: Positive baseline</span></div></Card>
      </section>
    </>
  );
}

export function Insights() {
  const { insights } = useFinance();
  return (
    <>
      <PageHeader eyebrow="AI Insights" title="Automated financial intelligence center" subtitle="Risks, opportunities and behavior changes generated from your financial twin." />
      <section className="insight-grid">{insights.insights?.map((item) => <Card key={item.title}><Badge tone={item.severity === "risk" ? "danger" : item.severity}>{item.severity}</Badge><h2>{item.title}</h2><p><strong>Reason:</strong> {item.reason}</p><p><strong>Impact:</strong> {item.impact}</p><p><strong>Action:</strong> {item.action}</p></Card>)}</section>
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
