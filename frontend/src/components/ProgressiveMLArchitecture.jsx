import React, { useState } from "react";
import { 
  BrainCircuit, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  Sliders,
  Activity
} from "lucide-react";
import { Badge } from "./ui";

const DEFAULT_INPUT_FEATURES = [
  {
    key: "rolling_3d_mean",
    name: "3-Day Rolling Mean",
    description: "Short-term expense momentum",
    tag: "Lag & Trend"
  },
  {
    key: "rolling_7d_mean",
    name: "7-Day Rolling Mean",
    description: "Weekly baseline expenditure average",
    tag: "Baseline"
  },
  {
    key: "rolling_7d_std",
    name: "7-Day Volatility (Std)",
    description: "Spending variance and dispersion envelope",
    tag: "Risk / Volatility"
  },
  {
    key: "day_of_week",
    name: "Day of Week",
    description: "Weekly cyclicity index (0=Monday to 6=Sunday)",
    tag: "Calendar"
  },
  {
    key: "day_of_month",
    name: "Day of Month",
    description: "Billing and recurring payment monthly phase (1–31)",
    tag: "Calendar"
  },
  {
    key: "is_weekend",
    name: "Weekend Indicator",
    description: "Discretionary leisure & recreational surge flag",
    tag: "Behavioral"
  },
  {
    key: "days_since_salary",
    name: "Days Since Salary",
    description: "Payday liquidity decay factor and replenish cycle",
    tag: "Cashflow"
  },
  {
    key: "prev_day_spend",
    name: "Previous Day Spend",
    description: "Autoregressive Lag-1 expenditure impulse",
    tag: "Lag & Trend"
  }
];

export function ProgressiveMLArchitecture({
  dataMaturityDays = 0,
  activeModel = "statistical_rule_7d",
  featureImportances = {},
  architecture = null,
  showTitle = true,
  defaultExpandedFeatures = true,
}) {
  const [featuresExpanded, setFeaturesExpanded] = useState(defaultExpandedFeatures);

  const days = Number(dataMaturityDays) || 0;
  const isRfActive = days >= 7 || activeModel === "user_random_forest";

  const tiers = [
    {
      id: "statistical",
      label: "Limited Data",
      model: "Statistical Baseline",
      condition: "< 7 Expense Days",
      summary: "Exponential moving averages, day-of-week seasonality & salary proximity.",
      // Active only if RF is NOT yet ready
      isActive: !isRfActive,
      // Completed (greyed green check) once RF takes over
      isCompleted: isRfActive,
      badgeText: !isRfActive ? "Active Engine" : "Matured",
      badgeTone: !isRfActive ? "warning" : "success"
    },
    {
      id: "random_forest",
      label: "≥ 7 Expense Days",
      model: "User-specific Random Forest",
      condition: "≥ 7 Expense Days",
      summary: "Dynamic ensemble regressor uniquely trained on personal spending patterns.",
      // Active only if RF IS ready
      isActive: isRfActive,
      isCompleted: isRfActive,
      badgeText: isRfActive ? "Active Engine" : `${Math.max(0, 7 - days)}d to auto-train`,
      badgeTone: isRfActive ? "ai" : "info"
    },
    {
      id: "arima",
      label: "Established Time Series",
      model: "ARIMA-supported Forecasting",
      condition: "Multi-month Horizon (12–60m)",
      summary: "ARIMA(1,1,1) autoregressive integrated moving average trend modeling blended with cash flow.",
      // ARIMA is never "active" in the same sense — it's a static horizon layer, not a real-time engine toggle
      isActive: false,
      isCompleted: true,
      badgeText: "Horizon Twin",
      badgeTone: "info"
    }
  ];

  const features = architecture?.input_features?.length
    ? architecture.input_features.map((f) => ({
        ...f,
        importance: featureImportances?.[f.key] ?? f.importance ?? 0,
      }))
    : DEFAULT_INPUT_FEATURES.map((f) => ({
        ...f,
        importance: featureImportances?.[f.key] ?? 0,
      }));

  return (
    <div className="progressive-ml-container">
      {showTitle && (
        <div className="progressive-ml-header">
          <div className="progressive-ml-title">
            <BrainCircuit size={20} className="text-ai" />
            <span>Progressive ML Architecture</span>
          </div>
          <Badge tone={isRfActive ? "ai" : "warning"}>
            {isRfActive ? "Tier 2: Random Forest Active" : "Tier 1: Statistical Baseline"}
          </Badge>
        </div>
      )}

      {/* ── 3 Architecture Tiers ────────────────────────────────────── */}
      <div className="progressive-ml-tiers">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={[
              "progressive-ml-tier-card",
              tier.isActive ? "tier-active" : "",
              tier.isCompleted && !tier.isActive ? "tier-completed" : "",
            ].filter(Boolean).join(" ")}
          >
            <div className="tier-header-row">
              <div className="tier-selector">
                {tier.isActive ? (
                  <Activity size={18} className="tier-icon-active" />
                ) : tier.isCompleted ? (
                  <CheckCircle2 size={18} className="tier-icon-checked" />
                ) : (
                  <Circle size={18} className="tier-icon-pending" />
                )}
                <span className="tier-label">{tier.label}</span>
                <span className="tier-arrow">➔</span>
                <span className="tier-model-name">{tier.model}</span>
              </div>
              <div className="tier-badges">
                <span className="tier-condition-pill">{tier.condition}</span>
                <Badge tone={tier.badgeTone}>{tier.badgeText}</Badge>
              </div>
            </div>
            <p className="tier-summary-text">{tier.summary}</p>
          </div>
        ))}
      </div>

      {/* ── Input Features Section ──────────────────────────────────── */}
      <div className="progressive-ml-features-section">
        <button
          type="button"
          className="progressive-ml-features-toggle"
          onClick={() => setFeaturesExpanded(!featuresExpanded)}
          aria-expanded={featuresExpanded}
        >
          <div className="features-toggle-left">
            <Sliders size={16} />
            <span className="features-toggle-title">Input Features</span>
            <span className="features-count-chip">{features.length} engineered signals</span>
          </div>
          <div className="features-toggle-right">
            <span className="features-toggle-hint">
              {featuresExpanded ? "Collapse" : "Expand"}
            </span>
            {featuresExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {featuresExpanded && (
          <div className="progressive-ml-features-grid">
            {features.map((feat) => (
              <div key={feat.key} className="feature-item-card">
                <div className="feature-item-top">
                  {/* Only show the human-readable tag, NOT the raw key */}
                  {feat.tag && <span className="feature-tag">{feat.tag}</span>}
                </div>
                <strong className="feature-name">{feat.name}</strong>
                <p className="feature-desc">{feat.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgressiveMLArchitecture;
