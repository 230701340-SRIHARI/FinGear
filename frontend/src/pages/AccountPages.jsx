import { Bell, Database, LockKeyhole, Palette, Save, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, Field, MetricCard, PageHeader } from "../components/ui";
import { useFinance } from "../context/FinanceContext";
import { currency } from "../lib/format";

export function Profile() {
  const { profile, saveProfile } = useFinance();
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);

  async function submit(event) {
    event.preventDefault();
    await saveProfile(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateExpense(index, amount) {
    const monthly_expenses = draft.monthly_expenses.map((item, i) => i === index ? { ...item, amount: Number(amount) } : item);
    setDraft({ ...draft, monthly_expenses });
  }

  return (
    <>
      <PageHeader eyebrow="Profile" title="Financial profile management" subtitle="This profile is the single source of truth for your Financial Digital Twin." actions={saved && <Badge tone="success">Saved</Badge>} />
      <form onSubmit={submit} className="profile-sections">
        <Card>
          <div className="section-title"><UserRound /> Personal information</div>
          <div className="form-grid">
            <Field label="Name"><input value={draft.name} onChange={(e) => update("name", e.target.value)} /></Field>
            <Field label="Email"><input value={draft.email || ""} onChange={(e) => update("email", e.target.value)} /></Field>
            <Field label="Age"><input type="number" value={draft.age || ""} onChange={(e) => update("age", Number(e.target.value))} /></Field>
            <Field label="Occupation"><input value={draft.occupation || ""} onChange={(e) => update("occupation", e.target.value)} /></Field>
            <Field label="Currency"><select value={draft.currency} onChange={(e) => update("currency", e.target.value)}><option>INR</option><option>USD</option><option>EUR</option></select></Field>
            <Field label="Financial experience"><select value={draft.financial_experience} onChange={(e) => update("financial_experience", e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></Field>
          </div>
        </Card>
        <Card><div className="section-title">Income and savings</div><div className="form-grid"><Field label="Salary"><input type="number" value={draft.monthly_income} onChange={(e) => update("monthly_income", Number(e.target.value))} /></Field><Field label="Other income"><input type="number" value={draft.other_income || 0} onChange={(e) => update("other_income", Number(e.target.value))} /></Field><Field label="Savings balance"><input type="number" value={draft.savings_balance} onChange={(e) => update("savings_balance", Number(e.target.value))} /></Field><Field label="Emergency fund"><input type="number" value={draft.emergency_fund} onChange={(e) => update("emergency_fund", Number(e.target.value))} /></Field></div></Card>
        <Card><div className="section-title">Expenses</div><div className="form-grid">{draft.monthly_expenses.map((item, index) => <Field label={item.category} key={item.category}><input type="number" value={item.amount} onChange={(e) => updateExpense(index, e.target.value)} /></Field>)}</div></Card>
        <Card><div className="section-title">Debt and investments</div><div className="form-grid"><Field label="Total debt"><input type="number" value={draft.total_debt} onChange={(e) => update("total_debt", Number(e.target.value))} /></Field><Field label="Monthly EMI"><input type="number" value={draft.monthly_debt_payment} onChange={(e) => update("monthly_debt_payment", Number(e.target.value))} /></Field><Field label="Mutual funds"><input type="number" value={draft.mutual_funds || 0} onChange={(e) => update("mutual_funds", Number(e.target.value))} /></Field><Field label="Stocks"><input type="number" value={draft.stocks || 0} onChange={(e) => update("stocks", Number(e.target.value))} /></Field><Field label="FD"><input type="number" value={draft.fixed_deposits || 0} onChange={(e) => update("fixed_deposits", Number(e.target.value))} /></Field><Field label="Gold"><input type="number" value={draft.gold || 0} onChange={(e) => update("gold", Number(e.target.value))} /></Field></div></Card>
        <div className="sticky-save"><Button><Save size={17} /> Save Profile</Button></div>
      </form>
    </>
  );
}

export function SettingsPage() {
  const { settings } = useFinance();
  return (
    <>
      <PageHeader eyebrow="Settings" title="Application preferences" subtitle="Dark futuristic mode is the primary aesthetic. Light mode is available as a planned preference." />
      <section className="grid-2">
        <Card><div className="section-title"><Palette /> Appearance</div><div className="state-list"><span>Theme: {settings?.appearance?.theme}</span><span>Light mode: {settings?.appearance?.light_mode}</span></div></Card>
        <Card><div className="section-title"><Bell /> Notifications</div><div className="state-list"><span>Budget alerts enabled</span><span>Goal alerts enabled</span><span>AI insights enabled</span></div></Card>
        <Card><div className="section-title"><Database /> Data Management</div><p>{settings?.database?.note}</p><Badge tone="warning">{settings?.database?.mode}</Badge></Card>
        <Card><div className="section-title"><ShieldCheck /> AI Preferences</div><p>AI-generated explanations are based on stored profile and model assumptions. FinGear AI provides educational analysis and does not guarantee outcomes.</p></Card>
      </section>
    </>
  );
}

export function SecurityPage() {
  const { security } = useFinance();
  return (
    <>
      <PageHeader eyebrow="Security" title="Account and data protection" subtitle="Professional security architecture for the final-year project demonstration." />
      <section className="metric-grid">
        <MetricCard icon={<LockKeyhole />} label="Password" value="Hashed" detail={security?.password || "PBKDF2"} tone="success" />
        <MetricCard icon={<ShieldCheck />} label="Private routes" value="JWT" detail={security?.api_security || "Bearer tokens"} tone="info" />
        <MetricCard icon={<Database />} label="Data privacy" value="User-scoped" detail="Every entity belongs to a user" tone="ai" />
      </section>
      <Card><div className="data-table">{security?.sessions?.map((session) => <article key={session.device}><strong>{session.device}</strong><Badge tone="success">{session.status}</Badge></article>)}<article><strong>Two-factor authentication</strong><Badge tone="warning">{security?.two_factor}</Badge></article><article><strong>Privacy</strong><span>{security?.privacy}</span></article></div></Card>
    </>
  );
}
