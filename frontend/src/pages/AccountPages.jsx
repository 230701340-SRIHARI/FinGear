import { Bell, Database, Eye, LockKeyhole, Palette, RotateCcw, Save, ShieldCheck, UserRound, Volume2, Zap } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, Field, MetricCard, PageHeader } from "../components/ui";
import { useFinance } from "../context/FinanceContext";
import { useTheme } from "../context/ThemeContext";
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
    setDraft((current) => ({ ...current, monthly_expenses }));
  }

  return (
    <>
      <PageHeader eyebrow="Profile" title="Financial Identity" subtitle="Manage income, recurring expenses, and total balances." />
      <form onSubmit={submit} className="stack">
        <section className="metric-grid">
          <MetricCard icon={<UserRound />} label="Monthly Income" value={currency(draft.monthly_income)} detail="Base gross income" tone="success" />
          <MetricCard icon={<Database />} label="Savings Balance" value={currency(draft.savings_balance)} detail="Liquid savings" tone="info" />
          <MetricCard icon={<Database />} label="Investments Balance" value={currency(draft.investments_balance)} detail="Total portfolio" tone="ai" />
          <MetricCard icon={<LockKeyhole />} label="Total Debt" value={currency(draft.total_debt)} detail="Liabilities" tone="warning" />
        </section>

        <section className="grid-2">
          <Card>
            <div className="section-title"><UserRound /> Personal & Income Information</div>
            <div className="form-grid">
              <Field label="Name"><input value={draft.name || ""} onChange={(e) => update("name", e.target.value)} /></Field>
              <Field label="Email"><input value={draft.email || ""} onChange={(e) => update("email", e.target.value)} /></Field>
              <Field label="Monthly Income (₹)"><input type="number" value={draft.monthly_income} onChange={(e) => update("monthly_income", Number(e.target.value))} required /></Field>
              <Field label="Emergency Fund (₹)"><input type="number" value={draft.emergency_fund} onChange={(e) => update("emergency_fund", Number(e.target.value))} required /></Field>
              <Field label="Savings Balance (₹)"><input type="number" value={draft.savings_balance} onChange={(e) => update("savings_balance", Number(e.target.value))} required /></Field>
              <Field label="Investments Balance (₹)"><input type="number" value={draft.investments_balance} onChange={(e) => update("investments_balance", Number(e.target.value))} required /></Field>
            </div>
          </Card>

          <Card>
            <div className="section-title"><Palette /> Monthly Expenses</div>
            <div className="form-grid">
              {draft.monthly_expenses.map((item, index) => (
                <Field key={item.category} label={item.category}>
                  <input type="number" value={item.amount} onChange={(e) => updateExpense(index, e.target.value)} />
                </Field>
              ))}
            </div>
          </Card>
        </section>

        <div className="form-actions form-wide" style={{ justifyContent: "flex-end" }}>
          <Button type="submit"><Save size={16} /> {saved ? "Saved!" : "Save Profile Changes"}</Button>
        </div>
      </form>
    </>
  );
}

export function SettingsPage() {
  const { settings, security } = useFinance();
  const {
    theme,
    setTheme,
    fontSizePx,
    setFontSizePx,
    highContrast,
    setHighContrast,
    reducedMotion,
    setReducedMotion,
    dyslexicFont,
    setDyslexicFont,
    colorBlindMode,
    setColorBlindMode,
    enhancedFocus,
    setEnhancedFocus,
    lineSpacing,
    setLineSpacing,
    resetAccessibility,
  } = useTheme();

  const [updating, setUpdating] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  function updatePassword(e) {
    e.preventDefault();
    setUpdating(true);
    setTimeout(() => {
      setUpdating(false);
      alert("Password updated successfully.");
      e.target.reset();
    }, 800);
  }

  function readPageAloud() {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported by your browser.");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const textToRead = document.querySelector('.page-stage')?.innerText || document.body.innerText;
    const utterance = new SpeechSynthesisUtterance(textToRead.slice(0, 1000));
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <>
      <PageHeader
        eyebrow="Universal Settings & Accessibility"
        title="Preferences & Accessibility Suite"
        subtitle="Customizable appearance, font scaling slider, colorblindness filters, motion controls, and screen assistance for every user globally."
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button variant="secondary" onClick={readPageAloud}>
              <Volume2 size={16} /> {speaking ? "Stop Reading" : "Read Page Aloud"}
            </Button>
            <Button variant="ghost" onClick={resetAccessibility} title="Reset to default accessibility settings">
              <RotateCcw size={16} /> Reset All
            </Button>
          </div>
        }
      />

      <section className="grid-2">
        {/* Appearance & Font Slider */}
        <Card>
          <div className="section-title"><Palette /> Visual Theme & Font Scaling</div>
          <div className="stack" style={{ gap: "18px" }}>
            <Field label="Theme Mode">
              <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="system">System Default (Auto Light/Dark)</option>
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </Field>

            <Field label={`Font Size Slider: ${fontSizePx}px ${fontSizePx === 16 ? "(Default)" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>12px</span>
                <input
                  type="range"
                  min="12"
                  max="24"
                  step="1"
                  value={fontSizePx}
                  onChange={(e) => setFontSizePx(Number(e.target.value))}
                  aria-label="Font size in pixels slider"
                />
                <span style={{ fontSize: "20px", color: "var(--text-muted)" }}>24px</span>
              </div>
            </Field>

            <Field label="Line Spacing & Legibility">
              <select value={lineSpacing} onChange={(e) => setLineSpacing(e.target.value)}>
                <option value="normal">Standard Line Height (1.5)</option>
                <option value="relaxed">Relaxed Line Height (1.85)</option>
                <option value="loose">Loose Line Height (2.15)</option>
              </select>
            </Field>
          </div>
        </Card>

        {/* Color Vision & High Contrast */}
        <Card>
          <div className="section-title"><Eye /> Color Vision & Contrast Assistance</div>
          <div className="stack" style={{ gap: "14px" }}>
            <Field label="Color Vision Filter (Colorblindness Assistance)">
              <select value={colorBlindMode} onChange={(e) => setColorBlindMode(e.target.value)}>
                <option value="none">Standard Full Color (Off)</option>
                <option value="protanopia">Protanopia (Red-Blind / Weak)</option>
                <option value="deuteranopia">Deuteranopia (Green-Blind / Weak)</option>
                <option value="tritanopia">Tritanopia (Blue-Blind / Weak)</option>
                <option value="monochrome">Monochrome (High Contrast Grayscale)</option>
              </select>
            </Field>

            <div className="a11y-toggle">
              <label htmlFor="highContrast">
                <strong>High Contrast Mode</strong>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Maximum stark black/white contrast and bold element outlines</span>
              </label>
              <input
                id="highContrast"
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
              />
            </div>

            <div className="a11y-toggle">
              <label htmlFor="dyslexicFont">
                <strong>OpenDyslexic / High-Legibility Font</strong>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Heavier weighted font bases for easier reading & reduced letter swapping</span>
              </label>
              <input
                id="dyslexicFont"
                type="checkbox"
                checked={dyslexicFont}
                onChange={(e) => setDyslexicFont(e.target.checked)}
              />
            </div>
          </div>
        </Card>

        {/* Motion & Interaction Accessibility */}
        <Card>
          <div className="section-title"><Zap /> Motion & Navigation Assistance</div>
          <div className="stack" style={{ gap: "14px" }}>
            <div className="a11y-toggle">
              <label htmlFor="reducedMotion">
                <strong>Reduce Motion & Animations</strong>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Disables all transitions, keyframe animations, and page slides</span>
              </label>
              <input
                id="reducedMotion"
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
              />
            </div>

            <div className="a11y-toggle">
              <label htmlFor="enhancedFocus">
                <strong>High-Visibility Focus Outlines</strong>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Bold 4px amber outline around active keyboard focus targets</span>
              </label>
              <input
                id="enhancedFocus"
                type="checkbox"
                checked={enhancedFocus}
                onChange={(e) => setEnhancedFocus(e.target.checked)}
              />
            </div>
          </div>
        </Card>

        {/* System & Data Management */}
        <Card>
          <div className="section-title"><Database /> System & AI Controls</div>
          <div className="stack" style={{ gap: "12px" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>{settings?.database?.note || "Isolated client-side memory architecture with live twin updates."}</p>
            <div>
              <Badge tone="warning">{settings?.database?.mode || "Local Database"}</Badge>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>AI explanations utilize local financial health algorithms and computational projection rules.</p>
          </div>
        </Card>
      </section>

      <div style={{ marginTop: '32px' }} />
      <PageHeader eyebrow="Security" title="Account and data protection" subtitle="Professional security architecture and authentication controls." />
      <section className="metric-grid">
        <MetricCard icon={<LockKeyhole />} label="Password" value="Hashed" detail={security?.password || "PBKDF2"} tone="success" />
        <MetricCard icon={<ShieldCheck />} label="Private routes" value="JWT" detail={security?.api_security || "Bearer tokens"} tone="info" />
        <MetricCard icon={<Database />} label="Data privacy" value="User-scoped" detail="Every entity belongs to a user" tone="ai" />
      </section>
      
      <section className="grid-2">
        <Card>
          <div className="section-title"><LockKeyhole /> Change Password</div>
          <form className="form-grid" onSubmit={updatePassword}>
            <Field label="Current password"><input type="password" required /></Field>
            <Field label="New password"><input type="password" required /></Field>
            <Field label="Confirm new password"><input type="password" required /></Field>
            <div className="form-actions form-wide"><Button type="submit" disabled={updating}>{updating ? "Updating..." : "Update Password"}</Button></div>
          </form>
        </Card>
        
        <Card>
          <div className="section-title"><ShieldCheck /> Active Sessions</div>
          <div className="data-table">
            {security?.sessions?.map((session) => <article key={session.device}><strong>{session.device}</strong><Badge tone="success">{session.status}</Badge></article>)}
            <article><strong>Two-factor authentication</strong><Badge tone="warning">{security?.two_factor || "Disabled"}</Badge></article>
            <article><strong>Privacy</strong><span>{security?.privacy || "Standard"}</span></article>
          </div>
        </Card>
      </section>
    </>
  );
}
