import { Activity, AlertTriangle, BrainCircuit, CheckCircle2, CircleDollarSign, Cpu, CreditCard, Database, Home, Layers, LineChart, Receipt, RotateCcw, Shield, ShoppingBag, Sparkles, TrendingUp, Utensils, Zap } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, ConfirmModal, EmptyState, MetricCard, PageHeader, Progress, QuickLinks } from "../components/ui";
import { ProgressiveMLArchitecture } from "../components/ProgressiveMLArchitecture";
import { useFinance } from "../context/FinanceContext";
import { currency } from "../lib/format";

const UNIVERSE_META = {
  FOOD: { label: "Food & Dining", Icon: Utensils, color: "var(--accent-success)" },
  DINING: { label: "Dining", Icon: Utensils, color: "var(--accent-warning)" },
  RENT: { label: "Rent", Icon: Home, color: "var(--accent-info)" },
  EMI: { label: "EMI", Icon: CreditCard, color: "var(--accent-danger)" },
  MANDATORY_EMI: { label: "Mandatory EMI", Icon: CreditCard, color: "var(--accent-danger)" },
  SHOPPING: { label: "Shopping & Entertainment", Icon: ShoppingBag, color: "var(--accent-warning)" },
  OTHERS: { label: "Bills & Other", Icon: Receipt, color: "var(--accent)" },
  GROCERIES: { label: "Groceries", Icon: Utensils, color: "var(--accent-success)" },
  UTILITIES: { label: "Utilities", Icon: Receipt, color: "var(--accent)" },
  TRANSPORT: { label: "Transport", Icon: Layers, color: "var(--accent-info)" },
  HEALTHCARE: { label: "Healthcare", Icon: Shield, color: "var(--accent-danger)" },
  INSURANCE: { label: "Insurance", Icon: Shield, color: "var(--accent-info)" },
  EDUCATION: { label: "Education", Icon: Layers, color: "var(--accent-info)" },
  ENTERTAINMENT: { label: "Entertainment", Icon: ShoppingBag, color: "var(--accent-warning)" },
  TRAVEL: { label: "Travel", Icon: Layers, color: "var(--accent-warning)" },
  LIFESTYLE: { label: "Lifestyle", Icon: Sparkles, color: "var(--accent-warning)" },
  INVESTMENT: { label: "Investment", Icon: CircleDollarSign, color: "var(--accent-success)" },
};

function getUniverseMeta(key, info) {
  if (!key) return { label: "Other", Icon: Layers, color: "var(--text-muted)" };

  const raw = String(key).trim();
  const cleanKey = raw.replace(/^CATEGORY_/i, "").trim();
  const upperKey = cleanKey.toUpperCase();

  if (UNIVERSE_META[raw]) return UNIVERSE_META[raw];
  if (UNIVERSE_META[cleanKey]) return UNIVERSE_META[cleanKey];
  if (UNIVERSE_META[upperKey]) return UNIVERSE_META[upperKey];

  if (info?.display_name) {
    return {
      label: info.display_name,
      Icon: Layers,
      color: "var(--accent-info)",
    };
  }

  const formattedLabel = cleanKey
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(w => {
      const u = w.toUpperCase();
      if (["EMI", "OTT", "FD", "SIP", "PPF", "NPS", "EPF", "GST", "UPI"].includes(u)) return u;
      return u.charAt(0) + u.slice(1).toLowerCase();
    })
    .join(" ") || cleanKey;

  return {
    label: formattedLabel,
    Icon: Layers,
    color: "var(--accent-info)",
  };
}

export function AiInsights() {
  const { aiStatus, aiForecast, aiAnomalies, acknowledgeAnomaly, resetAI, forecast } = useFinance();
  const [showReset, setShowReset] = useState(false);
  const [acknowledging, setAcknowledging] = useState(null);

  async function handleAcknowledge(txnId) {
    setAcknowledging(txnId);
    await acknowledgeAnomaly(txnId);
    setAcknowledging(null);
  }

  async function handleReset() {
    await resetAI();
    setShowReset(false);
  }

  const effectiveTomorrowSpend = aiForecast?.predicted_tomorrow ?? (forecast?.predicted_tomorrow ?? forecast?.daily_predictions?.[0]?.predicted_spend);
  const effectiveMaturityDays = aiForecast?.data_maturity_days ?? (forecast?.metrics?.data_maturity_days ?? (forecast?.assumptions?.days_trained || 0));
  const effectiveModelType = aiForecast?.model_type || forecast?.model_type || (effectiveMaturityDays >= 7 ? "user_random_forest" : "statistical_rule_7d");
  const forecastReady = Boolean(aiForecast && aiForecast.status !== "learning");
  const anomalyList = aiAnomalies?.anomalies || [];

  return (
    <>
      <PageHeader
        title="AI Intelligence Center"
        subtitle="Continuous online learning, expense forecasting, and category-isolated anomaly detection — all running on device."
        actions={
          <Button variant="ghost" onClick={() => setShowReset(true)}>
            <RotateCcw size={16} /> Factory Reset
          </Button>
        }
      />

      {/* ── KPI Overview ─────────────────────────────────────────────── */}
      <section className="metric-grid">
        <MetricCard
          icon={<TrendingUp />}
          label="Tomorrow's Predicted Spend"
          value={effectiveTomorrowSpend != null ? currency(effectiveTomorrowSpend) : "—"}
          detail={aiForecast?.status_message || "Initializing..."}
          tone={forecastReady ? "success" : "warning"}
        />
        <MetricCard
          icon={<LineChart />}
          label="Projected Monthly Total"
          value={forecastReady && aiForecast.projected_monthly_total != null ? currency(aiForecast.projected_monthly_total) : "—"}
          detail={forecastReady ? `Confidence: ${aiForecast.confidence}%` : "Learning..."}
          tone="info"
        />
        <MetricCard
          icon={<AlertTriangle />}
          label="Active Anomalies"
          value={`${anomalyList.length}`}
          detail={anomalyList.length ? "Review flagged transactions" : "No anomalies detected"}
          tone={anomalyList.length ? "danger" : "success"}
        />
        <MetricCard
          icon={<Cpu />}
          label="AI Data Maturity"
          value={aiForecast ? `${aiForecast.data_maturity_days} days` : "—"}
          detail={aiForecast?.days_until_ready > 0 ? `${aiForecast.days_until_ready} more days needed` : "Ready for inference"}
          tone="ai"
        />
      </section>

      {/* ── Expense Forecast Panel ───────────────────────────────────── */}
      <Card glow>
        <div className="section-title"><Sparkles /> Expense Forecasting Brain</div>
        {!aiForecast ? (
          <EmptyState title="Forecast engine initializing" detail="Add expense transactions to start training the model." />
        ) : aiForecast.status === "learning" ? (
          <div className="ai-learning-banner">
            <BrainCircuit size={28} />
            <div>
              <strong>Learning your spending patterns...</strong>
              <p className="muted">{aiForecast.status_message}</p>
              <Progress value={(aiForecast.data_maturity_days / 7) * 100} tone="ai" />
              <small className="muted">{aiForecast.data_maturity_days}/7 days of data collected</small>
            </div>
          </div>
        ) : (
          <div className="ai-forecast-grid">
            <div className="ai-forecast-item">
              <span className="ai-forecast-label">Predicted Tomorrow</span>
              <strong className="ai-forecast-value">{currency(aiForecast.predicted_tomorrow)}</strong>
            </div>
            <div className="ai-forecast-item">
              <span className="ai-forecast-label">Projected Monthly Total</span>
              <strong className="ai-forecast-value">{currency(aiForecast.projected_monthly_total)}</strong>
            </div>
            <div className="ai-forecast-item">
              <span className="ai-forecast-label">Projected Savings</span>
              <strong className="ai-forecast-value" style={{ color: aiForecast.projected_savings >= 0 ? "var(--accent-success)" : "var(--accent-danger)" }}>
                {currency(aiForecast.projected_savings)}
              </strong>
            </div>
            <div className="ai-forecast-item">
              <span className="ai-forecast-label">Model Status</span>
              <Badge tone={aiForecast.status === "training" ? "success" : "info"}>
                {aiForecast.status === "training" ? "Online Training Active" : "Inference Mode"}
              </Badge>
            </div>
            <div className="ai-forecast-item">
              <span className="ai-forecast-label">Confidence</span>
              <Progress value={aiForecast.confidence} tone={aiForecast.confidence >= 70 ? "success" : "warning"} />
              <small className="muted">{aiForecast.confidence}%</small>
            </div>
            <div className="ai-forecast-item">
              <span className="ai-forecast-label">Architecture</span>
              <strong className="ai-forecast-value" style={{ fontSize: "14px" }}>
                {aiForecast.data_maturity_days >= 7 ? "Random Forest " : "Statistical Baseline"}
              </strong>
              <small className="muted">
                {aiForecast.data_maturity_days >= 7 ? "Dynamic user-trained" : "EWMA + Day-of-week seasonality + Payday lift"}
              </small>
            </div>
          </div>
        )}
      </Card>

      {/* ── Progressive ML Architecture Card ─────────────────────────── */}
      <Card glow>
        <ProgressiveMLArchitecture
          dataMaturityDays={effectiveMaturityDays}
          activeModel={effectiveModelType}
          featureImportances={aiForecast?.feature_importances || forecast?.feature_importances || {}}
          architecture={aiForecast?.architecture || forecast?.architecture}
          defaultExpandedFeatures={true}
        />
      </Card>

      {/* ── Anomaly Detection Panel ──────────────────────────────────── */}
      <Card>
        <div className="section-title"><Shield /> Category-Isolated Anomaly Detection</div>

        {/* Per-category data maturity */}
        {aiStatus?.anomaly_detection && (
          <div className="ai-universe-grid">
            {Object.entries(aiStatus.anomaly_detection).map(([key, info]) => {
              const meta = getUniverseMeta(key, info);
              const IconComp = meta.Icon || Layers;
              return (
                <div key={key} className="ai-universe-card">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <IconComp size={18} style={{ color: meta.color }} />
                    <strong>{meta.label}</strong>
                    <Badge tone={info.phase === 1 ? "success" : "info"}>{info.phase === 1 ? "Active" : "Learning"}</Badge>
                  </div>
                  <div style={{ display: "grid", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", marginTop: "8px" }}>
                    <span>{info.transaction_count} transactions · {info.unique_days} unique days</span>
                    {info.days_until_phase1 > 0 && (
                      <span>{info.days_until_phase1} more days for pattern maturity</span>
                    )}
                    {info.phase === 1 && <span>Ensemble Model: Active · 17 parameters</span>}
                  </div>
                  <Progress
                    value={Math.min((info.unique_days / 8) * 100, 100)}
                    tone={info.phase === 1 ? "success" : "warning"}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Flagged Anomalies ────────────────────────────────────────── */}
      <Card>
        <div className="section-title"><AlertTriangle /> Flagged Anomalous Transactions</div>
        {anomalyList.length ? (
          <div className="anomaly-list">
            {anomalyList.map((item) => {
              const txn = item.transaction;
              const anom = item.anomaly;
              return (
                <div key={txn.id} className="anomaly-card">
                  <div className="anomaly-card-header">
                    <div>
                      <strong>{txn.description}</strong>
                      <span className="muted" style={{ marginLeft: "8px" }}>{txn.date}</span>
                    </div>
                    <Badge tone="danger">{currency(txn.amount)}</Badge>
                  </div>
                  <div className="anomaly-card-details">
                    <span><strong>Category:</strong> {txn.category} → {getUniverseMeta(anom.universe).label}</span>
                    <span><strong>Score:</strong> {(anom.score * 100).toFixed(1)}%</span>
                    {anom.phase === 1 && (
                      <>
                        <span><strong>K-Means:</strong> {(anom.kmeans_score * 100).toFixed(1)}%</span>
                        <span><strong>Autoencoder:</strong> {(anom.autoencoder_score * 100).toFixed(1)}%</span>
                      </>
                    )}
                  </div>
                  <p className="muted" style={{ fontSize: "13px", margin: "6px 0" }}>{anom.reason}</p>
                  <Button
                    variant="secondary"
                    onClick={() => handleAcknowledge(txn.id)}
                    disabled={acknowledging === txn.id}
                  >
                    <CheckCircle2 size={15} />
                    {acknowledging === txn.id ? "Updating model..." : "Acknowledge — This is normal"}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No anomalies detected"
            detail="The ensemble detector has not flagged any transactions. Add more transactions to improve detection accuracy."
          />
        )}
      </Card>

      <QuickLinks links={[
        { to: "/transactions", icon: Activity, label: "Transactions", detail: "Add data to train models" },
        { to: "/forecast", icon: LineChart, label: "Forecast", detail: "Macro financial projection" },
        { to: "/insights", icon: Zap, label: "Insights", detail: "AI-generated insights" },
        { to: "/health", icon: Activity, label: "Health Score", detail: "Current financial health" },
      ]} />

      <ConfirmModal
        isOpen={showReset}
        title="Factory Reset AI Engine"
        message="This will delete all trained AI weights and reset the forecast and anomaly detection models to defaults. Your transaction data will NOT be deleted. This cannot be undone."
        onConfirm={handleReset}
        onCancel={() => setShowReset(false)}
      />
    </>
  );
}
