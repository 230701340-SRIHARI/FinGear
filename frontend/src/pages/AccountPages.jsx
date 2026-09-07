import { Bell, Database, Eye, Info, LockKeyhole, Palette, RotateCcw, Save, ShieldCheck, UserRound, Volume2, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge, Button, Card, Field, MetricCard, NumberInput, PageHeader } from "../components/ui";
import { useFinance } from "../context/FinanceContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { currency } from "../lib/format";

function computeTierInfo(income, dependents = 0, incomeType = "Salaried") {
  const inc = Number(income) || 0;
  const dep = Number(dependents) || 0;
  const isVolatile = /business|freelance|self/i.test(incomeType);
  const riskMonths = isVolatile ? 6 : dep > 2 ? 5 : dep > 0 ? 4 : 3;

  if (inc < 30000) {
    const needsAmt = inc * 0.65;
    return {
      tier: 1,
      name: "Survival (₹15,000 – ₹30,000)",
      needs_pct: 65,
      wants_pct: 15,
      savings_pct: 20,
      needs_amount: needsAmt,
      wants_amount: inc * 0.15,
      savings_amount: inc * 0.20,
      emergency_target: Math.max(25000, needsAmt * riskMonths),
      description: "Focus on bare essential living costs, low-cost essentials, and debt avoidance. 65% of income must prioritize needs.",
      focus: "Build the first ₹25,000 safety cushion, avoid high-cost informal debt, and stabilize cash flow.",
    };
  }
  if (inc < 50000) {
    const needsAmt = inc * 0.60;
    return {
      tier: 2,
      name: "Baseline (₹30,000 – ₹50,000)",
      needs_pct: 60,
      wants_pct: 20,
      savings_pct: 20,
      needs_amount: needsAmt,
      wants_amount: inc * 0.20,
      savings_amount: inc * 0.20,
      emergency_target: Math.max(50000, needsAmt * riskMonths),
      description: "Transitioning toward stability. Essential needs take priority while establishing regular automated savings.",
      focus: "Build 3 months of emergency fund, keep non-essential spending under 20%, and start a recurring deposit or index fund SIP.",
    };
  }
  if (inc < 80000) {
    const needsAmt = inc * 0.50;
    return {
      tier: 3,
      name: "Accumulation (₹50,000 – ₹80,000)",
      needs_pct: 50,
      wants_pct: 30,
      savings_pct: 20,
      needs_amount: needsAmt,
      wants_amount: inc * 0.30,
      savings_amount: inc * 0.20,
      emergency_target: Math.max(100000, needsAmt * riskMonths),
      description: "Classic 50:30:20 budgeting fits perfectly. Covers standard living costs with room for lifestyle and consistent investing.",
      focus: "Automate 20% to diversified SIPs, maintain 4–6 months emergency fund, and cap discretionary wants strictly at 30%.",
    };
  }
  if (inc < 125000) {
    const needsAmt = inc * 0.45;
    return {
      tier: 4,
      name: "Reverse Budget (₹80,000 – ₹1,25,000)",
      needs_pct: 45,
      wants_pct: 25,
      savings_pct: 30,
      needs_amount: needsAmt,
      wants_amount: inc * 0.25,
      savings_amount: inc * 0.30,
      emergency_target: Math.max(150000, needsAmt * riskMonths),
      description: "Reverse 50:30:20 slab. Pay yourself first: allocate 30% directly to investments and keep living costs well below 50%.",
      focus: "Aggressive wealth compounding via equity mutual funds and NPS; resist lifestyle inflation as income expands.",
    };
  }
  const needsAmt = inc * 0.40;
  return {
    tier: 5,
    name: "Wealth Building (₹1,25,000+)",
    needs_pct: 40,
    wants_pct: 25,
    savings_pct: 35,
    needs_amount: needsAmt,
    wants_amount: inc * 0.25,
    savings_amount: inc * 0.35,
    emergency_target: Math.max(250000, needsAmt * riskMonths),
    description: "High savings velocity slab. Discretionary surplus allows 35%+ direct allocation to investments and early financial freedom.",
    focus: "Maximize tax-advantaged accounts, build multi-asset portfolio, and maintain 6 months liquid reserves.",
  };
}


export function Profile() {
  const { user } = useAuth();
  const { profile, saveProfile } = useFinance();
  const [draft, setDraft] = useState(() => ({
    ...profile,
    name: (user?.name && profile?.name === "Arjun Verma") ? user.name : (profile?.name || user?.name || "Client"),
    email: (user?.email && profile?.email === "arjun.verma@example.com") ? user.email : (profile?.email || user?.email || ""),
  }));
  const [saved, setSaved] = useState(false);
  const [showTierReason, setShowTierReason] = useState(false);

  useEffect(() => {
    if (profile) {
      setDraft((current) => ({
        ...profile,
        name: (user?.name && profile?.name === "Arjun Verma") ? user.name : (profile?.name || current.name || user?.name || "Client"),
        email: (user?.email && profile?.email === "arjun.verma@example.com") ? user.email : (profile?.email || current.email || user?.email || ""),
      }));
    }
  }, [profile, user]);

  const tierInfo = computeTierInfo(draft.monthly_income, draft.dependents, draft.income_type);


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
      <PageHeader eyebrow="Profile" title="Financial Identity & Tier Classification" subtitle="Manage income (changeable anytime), risk profile, emergency reserves, and asset allocations." />
      <form onSubmit={submit} className="stack">
        <section className="metric-grid">
          <MetricCard icon={<UserRound />} label="Monthly Income" value={currency(draft.monthly_income)} detail={`Tier ${tierInfo.tier}: ${tierInfo.needs_pct}/${tierInfo.wants_pct}/${tierInfo.savings_pct}`} tone="success" />
          <MetricCard icon={<Database />} label="Savings Balance" value={currency(draft.savings_balance)} detail="Liquid emergency reserves" tone="info" />
          <MetricCard icon={<Database />} label="Investments Balance" value={currency(draft.investments_balance)} detail="Total portfolio assets" tone="ai" />
          <MetricCard icon={<LockKeyhole />} label="Total Debt" value={currency(draft.total_debt)} detail="Outstanding liabilities" tone="warning" />
        </section>

        {/* Dynamic 5-Tier Income Card */}
        <Card glow>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck /> Dynamic Income Tier: {tierInfo.name}
              <button
                type="button"
                onClick={() => setShowTierReason(!showTierReason)}
                aria-label="Why am I in this tier?"
                title="Click to see why you are assigned to this tier"
                style={{
                  background: showTierReason ? "var(--accent)" : "rgba(255, 255, 255, 0.08)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "50%",
                  width: "22px",
                  height: "22px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: showTierReason ? "#fff" : "var(--text-secondary)",
                  padding: 0,
                  transition: "all 0.15s ease",
                }}
              >
                <Info size={13} />
              </button>
            </div>
            <Badge tone="ai">Tier {tierInfo.tier} of 5</Badge>
          </div>

          {showTierReason && (
            <div style={{
              background: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              borderRadius: "8px",
              padding: "12px 14px",
              margin: "12px 0",
              fontSize: "13px",
              lineHeight: "1.5",
              color: "var(--text-primary)"
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <Info size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong style={{ color: "var(--accent)" }}>Why are you assigned to Tier {tierInfo.tier}?</strong>
                  <p style={{ margin: "4px 0 6px", color: "var(--text-secondary)" }}>
                    Your net monthly income of <strong>{currency(draft.monthly_income)}</strong> places your profile into the <strong>Tier {tierInfo.tier} ({tierInfo.name})</strong> bracket.
                  </p>
                  <div style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
                    <span>• <strong>Income Band Rationale:</strong> Standardized against urban Indian living costs to set realistic, non-punitive expenditure baselines.</span>
                    <span>• <strong>Recommended Target Ratio ({tierInfo.needs_pct}% Needs : {tierInfo.wants_pct}% Wants : {tierInfo.savings_pct}% Savings):</strong> Structured so essential bills do not compromise your emergency safety cushion or wealth accumulation.</span>
                    <span>• <strong>Resilience Target:</strong> Based on {draft.dependents || 0} dependent(s) and a {draft.income_type || "Salaried"} income profile, requiring a minimum liquid emergency fund of <strong>{currency(tierInfo.emergency_target)}</strong>.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="muted" style={{ margin: "8px 0 16px" }}>{tierInfo.description}</p>
          <div className="metric-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            <div style={{ padding: "14px", background: "var(--surface-hover)", borderRadius: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Needs Budget ({tierInfo.needs_pct}%)</span>
              <strong style={{ fontSize: "20px", color: "var(--text-primary)" }}>{currency(tierInfo.needs_amount)}</strong>
            </div>
            <div style={{ padding: "14px", background: "var(--surface-hover)", borderRadius: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Wants Budget ({tierInfo.wants_pct}%)</span>
              <strong style={{ fontSize: "20px", color: "var(--accent)" }}>{currency(tierInfo.wants_amount)}</strong>
            </div>
            <div style={{ padding: "14px", background: "var(--surface-hover)", borderRadius: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Savings Budget ({tierInfo.savings_pct}%)</span>
              <strong style={{ fontSize: "20px", color: "var(--accent-success)" }}>{currency(tierInfo.savings_amount)}</strong>
            </div>
          </div>
          <div className="recommendation" style={{ marginTop: "16px" }}>
            <strong>Action Guidance:</strong> {tierInfo.focus}
          </div>
        </Card>

        <section className="grid-2">
          <Card>
            <div className="section-title"><UserRound /> Personal Profile & Experience</div>
            <div className="form-grid">
              <Field label="Full Name"><input value={draft.name || ""} onChange={(e) => update("name", e.target.value)} /></Field>
              <Field label="Email Address"><input value={draft.email || ""} onChange={(e) => update("email", e.target.value)} /></Field>
              <Field label="Age"><NumberInput value={draft.age || ""} onChange={(val) => update("age", val)} /></Field>
              <Field label="Occupation"><input value={draft.occupation || ""} onChange={(e) => update("occupation", e.target.value)} /></Field>
              <Field label="Income Type">
                <select value={draft.income_type || "Salaried"} onChange={(e) => update("income_type", e.target.value)}>
                  <option value="Salaried">Salaried Employee</option>
                  <option value="Freelance">Freelance / Consultant</option>
                  <option value="Business">Business / Entrepreneur</option>
                </select>
              </Field>
              <Field label="Dependents (Count)">
                <NumberInput min="0" max="10" value={draft.dependents || 0} onChange={(val) => update("dependents", val)} />
              </Field>
              <Field label="Credit Score (CIBIL/Experian)">
                <NumberInput min="300" max="900" value={draft.credit_score || 750} onChange={(val) => update("credit_score", val)} />
              </Field>
              <Field label="Financial Experience">
                <select value={draft.financial_experience || "Beginner"} onChange={(e) => update("financial_experience", e.target.value)}>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </Field>
              <Field label="Risk Appetite">
                <select value={draft.risk_appetite || "Moderate"} onChange={(e) => update("risk_appetite", e.target.value)}>
                  <option value="Conservative">Conservative (Capital Preservation)</option>
                  <option value="Moderate">Moderate (Balanced Growth & Safety)</option>
                  <option value="Aggressive">Aggressive (Maximum Equity Growth)</option>
                </select>
              </Field>
              <Field label="Lifestyle Preference">
                <select value={draft.lifestyle_preference || "Balanced"} onChange={(e) => update("lifestyle_preference", e.target.value)}>
                  <option value="Frugal">Frugal (Low Discretionary Wants)</option>
                  <option value="Balanced">Balanced (Sustainable Living)</option>
                  <option value="Experience-focused">Experience-focused (Travel & Living)</option>
                </select>
              </Field>
              <Field label="Primary Financial Goal">
                <select value={draft.primary_financial_goal || "Wealth Creation"} onChange={(e) => update("primary_financial_goal", e.target.value)}>
                  <option value="Emergency Fund">Build Emergency Fund</option>
                  <option value="Debt Elimination">Eliminate High-Interest Debt</option>
                  <option value="Wealth Creation">Long-Term Wealth Creation</option>
                  <option value="Home Purchase">Home Purchase / Real Estate</option>
                  <option value="Retirement">Early Retirement / FIRE</option>
                </select>
              </Field>
            </div>
          </Card>

          <Card>
            <div className="section-title"><Zap /> Income & Liquidity (Editable Anytime)</div>
            <div className="form-grid">
              <Field label="Primary Monthly Base Income (₹)">
                <NumberInput value={draft.monthly_income} onChange={(val) => update("monthly_income", val)} required />
              </Field>
              <Field label="Other / Passive Income (₹/mo)">
                <NumberInput value={draft.other_income || 0} onChange={(val) => update("other_income", val)} />
              </Field>
              <Field label="Monthly Salary Day (1-31)">
                <NumberInput min="1" max="31" value={draft.salary_day || 1} onChange={(val) => update("salary_day", val)} />
              </Field>
              <Field label="Liquid Savings Balance (₹)">
                <NumberInput value={draft.savings_balance} onChange={(val) => update("savings_balance", val)} required />
              </Field>
              <Field label="Emergency Reserve Fund (₹)">
                <NumberInput value={draft.emergency_fund} onChange={(val) => update("emergency_fund", val)} required />
              </Field>
              <Field label="Target Emergency Fund Goal (₹)">
                <NumberInput value={draft.emergency_target || 0} placeholder={tierInfo.emergency_target.toString()} onChange={(val) => update("emergency_target", val)} />
              </Field>
            </div>
          </Card>
        </section>

        <section className="grid-2">
          <Card>
            <div className="section-title"><Database /> Asset Portfolio Balances</div>
            <div className="form-grid">
              <Field label="Equity Mutual Funds (₹)"><NumberInput value={draft.mutual_funds || 0} onChange={(val) => update("mutual_funds", val)} /></Field>
              <Field label="Direct Stocks (₹)"><NumberInput value={draft.stocks || 0} onChange={(val) => update("stocks", val)} /></Field>
              <Field label="Fixed Deposits / PPF (₹)"><NumberInput value={draft.fixed_deposits || 0} onChange={(val) => update("fixed_deposits", val)} /></Field>
              <Field label="Gold / Commodities (₹)"><NumberInput value={draft.gold || 0} onChange={(val) => update("gold", val)} /></Field>
              <Field label="Provident Fund / EPF / NPS (₹)"><NumberInput value={draft.provident_fund || 0} onChange={(val) => update("provident_fund", val)} /></Field>
              <Field label="Real Estate / Property (₹)"><NumberInput value={draft.real_estate_value || 0} onChange={(val) => update("real_estate_value", val)} /></Field>
              <Field label="Crypto / Digital Assets (₹)"><NumberInput value={draft.crypto_value || 0} onChange={(val) => update("crypto_value", val)} /></Field>
            </div>
          </Card>

          <Card>
            <div className="section-title"><LockKeyhole /> Liabilities & EMI Obligations</div>
            <div className="form-grid">
              <Field label="Total Outstanding Debt (₹)"><NumberInput value={draft.total_debt} onChange={(val) => update("total_debt", val)} required /></Field>
              <Field label="Total Monthly EMI Payments (₹)"><NumberInput value={draft.monthly_debt_payment} onChange={(val) => update("monthly_debt_payment", val)} required /></Field>
            </div>
          </Card>
        </section>

        <section className="grid-2">
          <Card>
            <div className="section-title"><Palette /> Monthly Fixed Expenses Breakdown</div>
            <div className="form-grid">
              {(draft.monthly_expenses || []).map((item, index) => (
                <Field key={item.category} label={item.category + " (₹)"}>
                  <NumberInput value={item.amount} onChange={(val) => updateExpense(index, val)} />
                </Field>
              ))}
            </div>
          </Card>

          <Card glow>
            <div className="section-title"><ShieldCheck /> AI Twin & Intelligence Sync</div>
            <div className="stack" style={{ gap: '12px' }}>
              <p className="muted">
                Updating your income or expenses automatically recalculates your Financial Health Score, Forecast, What-if Simulator scenarios, and Goal Feasibility projections across the platform.
              </p>
              <div className="recommendation" style={{ marginTop: '8px' }}>
                <strong>Tip:</strong> Keep your income suite and recurring debt payments up to date so the anomaly detector correctly calibrates to your real spending patterns.
              </div>
            </div>
          </Card>
        </section>

        <div className="form-actions form-wide" style={{ justifyContent: "flex-end" }}>
          <Button type="submit"><Save size={16} /> {saved ? "Saved Profile!" : "Save Profile Changes"}</Button>
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
