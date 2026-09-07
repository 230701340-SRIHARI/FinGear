# FINGEAR AI
## Canonical Project Draft for Future AI Assistance and Development

**Project title:** FINGEAR AI: An Explainable Financial Digital Twin for Personalized Financial Wellness, Forecasting and Decision Support

**Purpose of this document:** This is the authoritative textual context for the FinGear AI final-year project. Give this document together with the repository to any future AI or developer. It explains the intended product, the completed Phase 1 scope, the Phase 2 scope, the business rules, the analytics design, and the relationship to the current codebase.

---

## 1. Project Vision

FINGEAR AI is a personal-finance intelligence platform built around the concept of an **Explainable Financial Digital Twin**. A Financial Digital Twin is a continuously updated digital representation of a person's financial situation, behaviour, risks, goals, and likely future financial outcomes.

The system is not only an expense tracker. Its purpose is to connect a user's financial profile, income, categorized transactions, savings, debts, emergency fund, spending behaviour, anomalies, financial-health indicators, forecasts, goals, investments, and decision scenarios into one coherent financial model.

The product should help a user answer questions such as:

- Is my present financial position healthy?
- Am I spending according to an allocation that is realistic for my income level?
- Which expenses are essential, discretionary, or wealth-building?
- How many months of essential spending can my emergency fund cover?
- Is my debt level safe relative to my income?
- Is a transaction unusual compared with my normal behaviour?
- What is my likely expenditure and cash-flow pressure in the coming days or months?
- Am I on track for my financial goals?
- What may happen if income, expenses, debt, investments, or financial priorities change?
- What action should I take next, and why?

The system must remain **explainable**. A user must not receive an unexplained score, forecast, alert, or recommendation. Every analytical result must expose its primary inputs, confidence level, limitations, and a practical next action.

---

## 2. Product Principles

1. **Personalized, not generic.** Financial recommendations must adapt to the user's income tier, obligations, household context, debt, emergency reserves, goals, and observed financial behaviour.
2. **Explainable by default.** Rule-based calculations should be used for core high-impact results such as financial health. Machine learning should be used where pattern recognition adds value, such as anomaly detection and forecasting.
3. **One source of truth.** PostgreSQL-backed, user-scoped financial records are the source for all dashboard, health, forecast, planning, Digital Twin, and recommendation outputs.
4. **Human control over AI.** Anomalies are flags, not automatic deletion decisions. Users can confirm a transaction as normal or exclude it from future learning.
5. **Gradual improvement, not unrealistic punishment.** If a user's financial allocation is far from the target, the system should propose achievable monthly movement rather than demanding immediate compliance.
6. **Education and decision support, not regulated advice.** The product provides educational financial analysis and decision support. It must not claim guaranteed returns, credit approval, tax certainty, or regulated investment advice.
7. **Data confidence is separate from financial health.** Incomplete data lowers confidence in an insight; it must not by itself lower a user's health score.

---

## 3. Technology and Repository Context

### 3.1 Intended technology stack

- **Frontend:** React, Vite, React Router, Recharts, Lucide React.
- **Backend:** Python, FastAPI, Pydantic, Uvicorn.
- **Database:** PostgreSQL 16 with user-scoped relational data and numeric monetary values.
- **Authentication:** Password hashing and JWT sessions; optional Google OAuth.
- **Analytics:** Rule-based financial engine, statistical baseline forecasting, per-user ARIMA forecasting after adequate history, anomaly detection, optional OpenAI-backed Copilot with a local fallback.
- **Deployment:** Docker Compose for PostgreSQL, backend, and frontend; local development is also supported.

### 3.2 Important interpretation of the current repository

The repository includes a working React/FastAPI application, an in-memory demonstration repository, a PostgreSQL schema, ML modules, and a Docker configuration. For all project documentation, presentation, review, and future planning, **assume that PostgreSQL has been fully integrated and is the active persistent repository**.

The current code may retain in-memory demonstration paths or partial implementations. Treat this document as the canonical desired system specification. Do not remove existing working functionality merely because it overlaps with the specification. If implementation work is requested, migrate or extend safely toward the specification while preserving user-visible flows.

### 3.3 Key code locations

| Responsibility | Current location |
|---|---|
| React routes | `frontend/src/App.jsx` |
| Application shell and navigation | `frontend/src/components/layout/` |
| API client | `frontend/src/lib/api.js` |
| Auth state | `frontend/src/context/AuthContext.jsx` |
| Financial data state | `frontend/src/context/FinanceContext.jsx` |
| Main financial pages | `frontend/src/pages/` |
| FastAPI entry point | `backend/app/main.py` |
| Feature API routes | `backend/app/api/` |
| Pydantic financial schemas | `backend/app/schemas/finance.py` |
| Financial scoring and scenario logic | `backend/app/services/finance_engine.py` |
| Dashboard and service aggregation | `backend/app/services/financial_service.py` |
| AI engine and anomaly logic | `backend/app/ml/ai_engine/` |
| Forecasting module | `backend/app/ml/forecasting.py` and related services |
| PostgreSQL schema and models | `backend/app/database/` |

---

# PART A: PHASE 1 - COMPLETED CORE SYSTEM

## 4. Phase 1 Scope

Phase 1 is the completed foundation of FINGEAR AI. It includes the following six modules:

1. User login management.
2. Financial profile management with user-tier categorization.
3. Transaction and expense tracking.
4. Spending anomaly detection.
5. Explainable financial health scoring.
6. Personalized financial forecasting.

The Phase 1 modules are connected. Transaction activity updates category totals, health scoring, anomalies, forecasts, dashboard indicators, and the Financial Digital Twin state. No module should be designed as an isolated feature.

---

## 5. Module 1 - User Login Management

### 5.1 Purpose

The login system establishes a secure identity for every user and guarantees that all financial records, forecasts, scores, feedback, attachments, and later Digital Twin results are user scoped.

### 5.2 Required functions

- User registration with name, email, and password.
- Secure password hashing.
- Login using email and password.
- JWT access token generation and validation.
- Authenticated `/me` endpoint for the current user.
- Logout that clears local session state.
- Optional Google OAuth where environment credentials are available.
- Session error handling and protected frontend routes.

### 5.3 Data requirements

The `users` table/entity contains at least:

- `id`
- `name`
- `email` (unique, normalized)
- `password_hash`
- `created_at`
- optional OAuth provider identity fields
- account status and audit timestamps where appropriate

### 5.4 Security requirements

- Never store plain-text passwords.
- Require authentication for all financial endpoints.
- Enforce user ownership at query level; a user must never access another user's records by changing an ID in a URL.
- Validate all input with Pydantic or equivalent schemas.
- Do not expose secrets, tokens, bill contents, database URLs, or API keys in frontend code or logs.

---

## 6. Module 2 - Financial Profile Management and Income-Tier Categorization

### 6.1 Purpose

The financial profile creates the initial state of the user's Financial Digital Twin. It contains the financial context required to interpret transactions correctly. Income is treated as changeable, not as a value fixed during onboarding.

### 6.2 Profile fields

The profile should include:

- Name and email.
- Age, occupation, currency, and financial experience level.
- Net monthly income and other income.
- Income stability: stable salaried, variable income, self-employed, or other relevant classification.
- Dependents or household responsibility where available.
- Monthly essential expenses.
- Savings balance and liquid emergency-fund amount.
- Investment balance and allocation summary.
- Debt balance, mandatory monthly EMI, interest rate, and debt type.
- Insurance or protection information where available.
- Goals and target dates.
- Income-tier classification and allocation targets.

### 6.3 Rolling income definition

Use the rolling average of the most recent three closed months of **net monthly income** where history exists. Net income means income available after tax and statutory deductions. If fewer than three closed months are available, use the latest declared income and mark analytical confidence as provisional.

### 6.4 Income tiers and adaptive allocation targets

FINGEAR AI does not apply one universal 50:30:20 rule. It adjusts Needs, Wants, and Savings/Wealth Building targets to a user's income tier.

| Tier | Monthly net income | Needs | Wants | Savings / wealth building | Design intention |
|---|---:|---:|---:|---:|---|
| Survival | Rs. 15,000 - Rs. 30,000 | 65% | 15% | 20% | Recognize high fixed-cost pressure and first build emergency stability. |
| Baseline | Rs. 30,000 - Rs. 50,000 | 50% | 30% | 20% | Apply the conventional 50:30:20 baseline. |
| Accumulation | Rs. 50,000 - Rs. 80,000 | 45% | 25% | 30% | Increase wealth-building capacity as fixed costs need not rise proportionally. |
| Reverse Budget | Rs. 80,000 - Rs. 1,25,000 | 40% | 20% | 40% | Prevent lifestyle inflation and prioritize compounding. |
| Wealth Building | Rs. 1,25,000 and above | 35% | 15% | 50% | Make savings and investment the dominant allocation. |

### 6.5 Adaptive improvement path

The system must not instruct an over-spending user to change overnight. It calculates excess spending and recommends a gradual movement:

```text
ExcessWantsAmount = max(0, ActualWants - WantsTargetAmount)
RecommendedMonthlyWantsReduction = min(ExcessWantsAmount / 3, 0.05 x Income)
RequiredSavingIncrease = max(0, TargetMonthlySaving - ActualMonthlySaving)
```

Example: A user earning Rs. 50,000 belongs to the Accumulation tier (45/25/30). If Wants are Rs. 30,000, wants are 60% rather than 25%. The system should recommend a staged reduction, for example Rs. 2,500 per month, and direct the released amount to emergency reserves, debt reduction, or investments.

---

## 7. Module 3 - Transaction and Expense Tracking

### 7.1 Purpose

Transactions are the operational core of FINGEAR AI. Every meaningful financial result must derive from the same validated transaction ledger rather than from separate static values in different modules.

### 7.2 Required transaction functions

- Add income and expense transactions manually.
- Capture date, description, category, type, amount, optional notes, and recurrence information.
- Support dropdown-based categories and textual descriptions.
- Support PDF bill upload, download, and deletion for user reference.
- Accept only PDF bills and validate file type and size.
- Require a clear confirmation prompt before deleting a transaction.
- Soft-delete transactions instead of permanently deleting them immediately.
- Display transactions deleted within the last sixty days in a separate Recently Deleted area.
- Restore a recently deleted transaction on user action.
- Remove expired deleted records after the sixty-day recovery period according to the retention policy.
- Show transaction-level category, date, amount, bill status, anomaly status, and action controls.
- Place **Dashboard first** and **Transactions immediately below Dashboard** in the primary navigation.

### 7.3 Income transaction handling

When a user records an income transaction, ask:

1. **Do you want to add this to the monthly income suite?**
2. If yes: **Should this apply only to the present month or to all future months?**

The choices have different meanings:

- `present_month`: Use for a one-time bonus, freelance payment, unusual income, refund, or temporary adjustment.
- `all_months`: Use for a sustained salary or recurring-income change.
- `not included`: Record the transaction but do not modify the declared recurring monthly-income baseline.

### 7.4 Required category taxonomy

Every transaction must have one mutually exclusive top-level classification. This is essential for the adaptive allocation, score and forecast logic.

| Bucket | Typical categories | Rule |
|---|---|---|
| Income | Salary, freelance income, business income, interest, rent received, bonus | Incoming cash flow. |
| Needs | Rent, groceries, utilities, medicine, health care, education, insurance, fuel, public transport, mandatory EMI | Essential, contractual, or non-discretionary expenditure. |
| Wants | Dining out, entertainment, OTT subscriptions, shopping, travel, hobbies, premium upgrades | Discretionary lifestyle expenditure. |
| Savings / wealth building | Emergency-fund transfers, fixed deposits, SIPs, mutual funds, stocks, PPF/NPS, retirement contribution, extra loan principal payment | Allocation toward resilience, investing, or long-term wealth. |

**Important rule:** Mandatory EMI belongs to Needs because it is a current obligation. Only voluntary extra principal repayment belongs to Savings/Wealth Building. This avoids giving a high savings score merely because a user carries a large compulsory loan.

### 7.5 Cross-module integration

When a transaction is created, updated, restored, deleted, or classified differently, refresh:

- Monthly income and expense summaries.
- Needs/Wants/Savings allocation.
- Budget actuals.
- Dashboard KPIs and charts.
- Health-score components and risk flags.
- Anomaly analysis.
- Forecast training data and next projections.
- Goal-planning feasibility and scenario baseline when those modules are enabled.
- Timeline and Digital Twin financial-event history.

---

## 8. Module 4 - Spending Anomaly Detection

### 8.1 Purpose

An anomaly is a transaction that differs materially from the user's usual financial behaviour. It is not automatically fraudulent, invalid, or deleted. It may be a genuine medical expense, travel cost, repair, seasonal purchase, or a temporary lifestyle change.

### 8.2 Detection workflow

1. A new transaction is written to the validated ledger.
2. The anomaly service evaluates the amount, category, transaction time, historical category distribution, recurrence, and recent behavioural pattern.
3. During the sparse-data period, use robust statistical thresholds and rule checks.
4. With sufficient history, use an online or persisted user-specific model to improve personalization.
5. If abnormal, store `anomaly_flag`, `anomaly_score`, reason fields, and model version.
6. Display the flag directly in the transaction list and in AI Insights.

### 8.3 Required user controls

For each flagged transaction, display both actions inline in the transaction module:

- **Confirm / plus action:** The user verifies that the transaction is normal. Mark it as acknowledged and allow it to contribute to future model training.
- **Exclude / trash action:** Keep the transaction in the ledger but permanently exclude it from anomaly-model training. This is for unusual but valid transactions that should not become the new normal.

The UI should never silently remove a transaction through anomaly detection.

### 8.4 Explainability requirements

The anomaly result should show understandable reasons, for example:

- "Food spending is 2.7 times your usual transaction amount."
- "This is your first transaction in the Travel category."
- "The amount is outside your typical range for this day of the month."

### 8.5 Privacy and learning

Anomaly feedback must be stored per user. One user's feedback must never affect another user's anomaly model. Excluded records should remain visible in the transaction history but must not be used for training.

---

## 9. Module 5 - Explainable Financial Health Score

### 9.1 Purpose

The Financial Health Score represents the user's present ability to manage current obligations, absorb shocks, control debt, build future readiness, and maintain disciplined financial behaviour. It is an educational wellness score, **not** a credit score or investment-suitability certificate.

### 9.2 Why the score is rule-based

The core score uses transparent, adaptive rules rather than a black-box machine-learning model. This makes the output auditable and easy to explain. ML is used around the score for forecasting and anomaly detection, not as a replacement for the score's decision logic.

### 9.3 Core variables

Use the most recent three closed months where possible:

```text
I   = average net monthly income
NE  = average monthly Needs expenditure
WA  = average monthly Wants expenditure
SV  = average monthly Savings / wealth-building contribution
EMI = mandatory monthly debt payment
OD  = total outstanding debt
EF  = liquid emergency fund
NT, WT, ST = the Needs, Wants, Savings targets for the user's income tier
```

### 9.4 Final formula

```text
Financial Health Score =
  0.30 x Spending Sustainability
+ 0.25 x Emergency Resilience
+ 0.20 x Debt Manageability
+ 0.15 x Future Readiness
+ 0.10 x Payment Discipline and Protection
```

The final score is bounded from 0 to 100.

### 9.5 Component A - Spending Sustainability (30%)

```text
N = NE / I
W = WA / I
S = SV / I

NeedsFit   = min(100, 100 x NT / N)
WantsFit   = min(100, 100 x WT / W)
SavingsFit = min(100, 100 x S / ST)

AllocationFit =
  0.25 x NeedsFit
+ 0.30 x WantsFit
+ 0.45 x SavingsFit

MonthlySurplus = I - NE - WA
SurplusFit = min(100, 100 x max(MonthlySurplus, 0) / (ST x I))

Spending Sustainability =
  0.75 x AllocationFit
+ 0.25 x SurplusFit
```

Savings receives the strongest allocation weight because it creates resilience and future capacity. No fit score can exceed 100.

### 9.6 Component B - Emergency Resilience (25%)

Only liquid and quickly accessible funds count: cash, bank savings, liquid funds and short-term deposits. Equity, gold and locked retirement assets do not count toward the emergency fund.

```text
EssentialMonthlyOutflow = NE

EmergencyTarget = EssentialMonthlyOutflow x RiskAdjustedMonths
EmergencyResilience = min(100, 100 x EF / EmergencyTarget)
```

Suggested `RiskAdjustedMonths`:

- 3 months: stable salaried user without dependents.
- 4 to 5 months: variable income or dependents.
- 6 months: self-employed user, sole earner, or high income volatility.
- Survival tier: EmergencyTarget must not be lower than Rs. 25,000.

### 9.7 Component C - Debt Manageability (20%)

```text
EMIRatio = EMI / I
DebtToAnnualIncome = OD / (12 x I)

EMIScore = min(100, max(0, 100 x (0.40 - EMIRatio) / 0.25))
OutstandingDebtScore = min(100, max(0, 100 x (1.50 - DebtToAnnualIncome)))

DebtManageability =
  0.70 x EMIScore
+ 0.30 x OutstandingDebtScore
```

Interpretation:

- EMI at or below 15% of income gives the best EMI subscore.
- EMI at 40% of income or above gives an EMI subscore of zero and triggers a serious debt-risk cap.
- If payment history exists, missed payments should also create a risk flag.

### 9.8 Component D - Future Readiness (15%)

```text
TargetMonthlySaving = ST x I
SavingTargetAchievement = min(100, 100 x SV / TargetMonthlySaving)

GoalFeasibility = average active-goal achievement probability
InvestmentConsistency = 100 x (months with contribution in last 3 months / 3)

FutureReadiness =
  0.50 x SavingTargetAchievement
+ 0.30 x GoalFeasibility
+ 0.20 x InvestmentConsistency
```

If no goal exists, do not penalize the user. Redistribute the goal-feasibility weight proportionally to savings achievement and investment consistency, and show that the goal context is absent.

### 9.9 Component E - Payment Discipline and Protection (10%)

```text
PaymentScore = 100 x OnTimeBillsAndEMIs / TotalDueBillsAndEMIs

PlanningScore =
  100 if budget, emergency target and at least one goal are active
   65 if any two are active
   30 otherwise

ProtectionScore =
  100 if essential insurance / coverage details are recorded
   50 if information is unknown
    0 if user records no coverage

PaymentDisciplineProtection =
  0.60 x PaymentScore
+ 0.25 x PlanningScore
+ 0.15 x ProtectionScore
```

### 9.10 Score grades and guardrails

| Score | Grade | Meaning |
|---:|---|---|
| 80-100 | Financially Healthy | Strong current stability, resilience, debt control and future progress. |
| 60-79 | Stable, Improving | Generally sound, but one or more areas need improvement. |
| 40-59 | Needs Attention | Material cash-flow, savings, debt or planning weakness. |
| 0-39 | Financially Vulnerable | Immediate affordability or resilience concern. |

Apply these hard guardrails:

```text
Negative monthly surplus              => score cannot exceed 59
EMI >= 40% of income                  => score cannot exceed 49
Emergency fund below 1 month          => High Resilience Risk flag
Missed EMI/bill in last 90 days       => High Payment Risk flag
High-interest unsecured debt          => High Debt Risk flag
Less than 30 days of data             => Provisional score and low confidence
```

### 9.11 Data confidence

Data confidence is separate from health score:

```text
DataConfidence =
  0.40 x TransactionHistoryCompleteness
+ 0.40 x CategorizationCompleteness
+ 0.20 x IncomeVerificationCompleteness
```

| Confidence | Display |
|---:|---|
| 80-100% | High confidence |
| 50-79% | Moderate confidence |
| Below 50% | Provisional insight |

### 9.12 Required score explanation format

The UI and Copilot should use direct, specific messages. Example:

> Your health score is 68, classified as Stable, Improving. Your debt burden is manageable and savings are progressing, but your emergency fund covers only 2.1 months of essential expenses. Your Wants spending is 37% against the 25% target for your income tier. Reducing discretionary spending by Rs. 2,500 per month would improve emergency coverage and move you toward the target allocation.

---

## 10. Module 6 - Unified Personalized Forecasting

### 10.1 Purpose

FINGEAR AI must use one shared Forecast Service. The dashboard, forecast page, health-risk projections, goal planner, Copilot, simulator and Digital Twin must not use different uncoordinated forecasting rules.

### 10.2 Forecast lifecycle

1. **Cold start / first seven days:** Use a transparent statistical and rule-based baseline. Combine declared profile data, categorized transactions, recent averages and smoothing. Clearly label the result as baseline/provisional.
2. **Data accumulation:** Store categorized, validated, user-specific transaction history. Exclude transactions the user has opted out of model training.
3. **Personal model readiness:** Once sufficient clean history is available, fit and persist a user-specific ARIMA model. Select the order through an automatic model-selection approach and evaluate forecast error.
4. **Continuous refresh:** Retrain or update according to a defined schedule or meaningful new data threshold. Store model version, training window, confidence, accuracy measures and generated forecast values.
5. **Shared consumption:** Every feature requests projections from this same Forecast Service.

### 10.3 Forecast outputs

The service should return:

- Next-day expected expenditure where appropriate.
- Seven-day and monthly category-level expense forecast.
- Total projected expense.
- Projected cash flow.
- Forecasted savings capacity.
- Forecasted emergency-fund change where applicable.
- Confidence level and model type: baseline or user-specific ARIMA.
- Explanation of important contributors and visible assumptions.
- Error metrics such as MAE, MAPE or equivalent when actual outcomes become available.

### 10.4 Forecast limitations

The forecast is a probabilistic estimate based on known history. It must explicitly state that one-time emergencies, job changes, market shocks and unrecorded transactions can make future outcomes differ from predictions.

---

## 11. Phase 1 Database Model - Assumed Completed PostgreSQL Integration

### 11.1 Core entities

The fully integrated PostgreSQL design includes at least these user-scoped entities:

- `users`
- `financial_profiles`
- `income_history`
- `transactions`
- `transaction_attachments`
- `transaction_categories`
- `transaction_bucket_mappings`
- `deleted_transactions` or soft-delete metadata in `transactions`
- `budgets`
- `goals`
- `investments`
- `debts`
- `health_scores`
- `health_score_components`
- `forecast_runs`
- `forecast_values`
- `anomaly_feedback`
- `model_state` or user-specific model-weight records
- `copilot_conversations`
- `financial_events`
- `notifications`

### 11.2 Data rules

- Store money in PostgreSQL `NUMERIC`, not floating-point columns.
- Index user ID and relevant dates on all ledger and analytical tables.
- Use foreign keys and non-null constraints where appropriate.
- Preserve soft-deletion timestamps and audit metadata.
- Store bill metadata and protected storage references; never expose an attachment without authorization.
- Store anomalies, feedback and model-training-exclusion decisions separately from the original transaction so the ledger remains historically accurate.
- Persist forecasts and health-score history so trends can be shown over time.

---

# PART B: PHASE 2 - FUTURE EXPANSION OF THE COMPLETE FINGEAR AI SYSTEM

## 12. Phase 2 Scope

Phase 2 completes the decision-support and Digital Twin capabilities using the Phase 1 data foundation. The Phase 2 modules are:

1. Goal and budget planning.
2. AI Copilot.
3. What-If Simulator.
4. Completion of the Financial Digital Twin.
5. Stock and investment advisory and management.

Phase 2 must consume the shared profile, transaction, health, anomaly and forecast services. It must not invent a separate financial state.

---

## 13. Module 7 - Goal and Budget Planning

### 13.1 Goal planning

Users can create named goals such as emergency fund, education, vehicle purchase, travel, home down payment, retirement or custom goals. A goal contains:

- Name and goal type.
- Target amount.
- Current amount.
- Target date or target months.
- Planned monthly contribution.
- Priority and flexibility level.
- Relationship to a mental account or investment basket where applicable.

The goal engine must calculate:

```text
GoalGap = max(TargetAmount - CurrentAmount, 0)
RequiredMonthlyContribution = GoalGap / RemainingMonths
ExpectedMonths = GoalGap / PlannedMonthlyContribution
AchievementProbability = function of contribution capacity, forecast cash flow, risk and consistency
```

Goal recommendations must respect emergency-fund and debt priorities. A user with negative cash flow or a severe emergency-fund gap should not be encouraged to invest aggressively for low-priority goals.

### 13.2 Budget planning

The budget must be transaction driven. `actual` spending must be calculated from active categorized transactions rather than static seed values. Budgets should:

- Use the appropriate income-tier Needs/Wants/Savings targets.
- Offer category-level planned limits.
- Compare plan, actual, forecast and remaining amount.
- Highlight overspending early, not only after month end.
- Suggest gradual adjustments.
- Respect recurring obligations and seasonal patterns.

---

## 14. Module 8 - AI Copilot

### 14.1 Purpose

The Copilot is a conversational interface for explaining FINGEAR AI's structured results. It does not replace the financial engine or generate unsupported financial facts.

### 14.2 Required context for every answer

Before answering, the Copilot should receive a curated user context that may include:

- Current profile and income tier.
- Recent transaction summary.
- Needs/Wants/Savings allocation.
- Latest financial health score, components, flags and confidence.
- Current emergency-fund coverage.
- Debt burden.
- Active goals and feasibility.
- Forecast outputs, model type and confidence.
- Recent anomaly alerts and user feedback.
- Relevant scenario results if the user is discussing a simulation.

### 14.3 Required response behaviour

- Use clear, educational language.
- Cite the user's own numbers when available.
- Explain the reason behind each recommendation.
- State uncertainty and model confidence.
- Avoid certainty about markets, returns, tax outcome, credit approval or regulation.
- Escalate sensitive decisions to a qualified financial professional where appropriate.
- Respect privacy and never expose one user's information to another.

---

## 15. Module 9 - What-If Simulator

### 15.1 Purpose

The simulator lets users explore the financial effect of possible decisions before they act.

### 15.2 Supported scenarios

- Salary increase or reduction.
- One-time income change.
- Rent or other essential-expense change.
- Lifestyle-expense increase or reduction.
- New EMI or loan repayment.
- Extra debt repayment.
- Additional monthly investment.
- Change in investment return assumption.
- Goal contribution change.
- Combined custom scenario.

### 15.3 Required outputs

Every scenario compares baseline and simulated results:

- Financial-health score and score delta.
- Cash-flow delta.
- Allocation against the income-tier target.
- Forecasted net worth, savings and investments.
- Emergency-fund runway.
- Debt burden.
- Goal timeline and probability changes.
- Key risk flags.
- Explainable recommendation: positive, manageable, caution, or high risk.

The simulator must use the common Forecast Service and same health-score rules. It must not use separate unexplained formulas.

---

## 16. Module 10 - Complete Financial Digital Twin

### 16.1 Definition in FINGEAR AI

The Financial Digital Twin is the continuously refreshed, explainable representation of the user's financial life. It is not merely a dashboard visualization.

### 16.2 Twin state

The Twin should represent:

- Identity and profile context.
- Income tier and income stability.
- Current assets, liabilities, cash flow and emergency runway.
- Categorized financial behaviour.
- Health-score history and risk flags.
- Forecast trajectory and confidence.
- Goals, priorities and expected feasibility.
- Investment risk profile and allocation.
- Anomalies and model feedback.
- Financial timeline and significant life or money events.
- Simulated alternate future states.

### 16.3 Twin capabilities

- Present-state visualization.
- Historical trend analysis.
- Forecast of likely future state.
- Comparison of baseline and simulated future states.
- Context-aware recommendations.
- Explanation of state changes: for example, "Your runway fell because housing costs increased and savings contributions declined."

---

## 17. Module 11 - Stock and Investment Advisory and Management

### 17.1 Purpose

This module supports educational, goal-aware investment planning. It must not present guaranteed returns or imply regulated execution services unless those legal and technical capabilities are actually implemented.

### 17.2 Inputs

- User age, income tier and income stability.
- Existing savings and investments.
- Emergency-fund status.
- Debt and EMI burden.
- Financial experience and risk tolerance.
- Goal amount, priority and time horizon.
- Investment contribution capacity.
- Asset allocation and concentration risk.
- Market and product data only from approved, reliable sources.

### 17.3 Functions

- Record mutual funds, stocks, deposits, gold and other investment holdings.
- Show asset allocation and diversification.
- Estimate expected return, volatility and goal suitability with explicit assumptions.
- Identify concentration or mismatch between risk and goal horizon.
- Create goal-specific investment baskets or mental accounts.
- Recommend contribution allocations after emergency and debt priorities are satisfied.
- Support rebalancing suggestions with transparent reasons.
- Provide portfolio simulation for the What-If module.

### 17.4 Future ML and optimization options

- Goal-based portfolio optimization.
- Mental-account portfolio allocation.
- Reinforcement-learning research model for dynamic portfolio optimization.
- Explainable risk and allocation models.

Any advanced model must be clearly labelled experimental and must be evaluated for fairness, robustness, cost assumptions and explainability before user-facing deployment.

---

## 18. End-to-End System Flow

```text
User registration and login
        -> Financial profile creation
        -> Income-tier categorization
        -> Transaction recording and bill reference
        -> Needs/Wants/Savings classification
        -> PostgreSQL financial ledger
        -> Anomaly detection and user feedback
        -> Financial health score and risk flags
        -> Baseline or per-user ARIMA forecast
        -> Financial Digital Twin state update
        -> Budget and goal planning
        -> AI Copilot explanation
        -> What-If simulation
        -> Investment and portfolio decision support
```

---

## 19. API and UI Expectations

### 19.1 Existing/expected backend domains

- `/api/auth`
- `/api/profile`
- `/api/dashboard`
- `/api/transactions`
- `/api/budget`
- `/api/health`
- `/api/forecast`
- `/api/goals`
- `/api/investments`
- `/api/debt`
- `/api/simulator`
- `/api/copilot`
- `/api/insights`
- `/api/timeline`
- `/api/reports`
- `/api/settings`
- `/api/ai` for anomaly and model state

### 19.2 Required health response shape

```json
{
  "score": 68,
  "grade": "Stable, Improving",
  "confidence": "moderate",
  "income_tier": "Accumulation",
  "target_ratio": {"needs": 45, "wants": 25, "savings": 30},
  "actual_ratio": {"needs": 48, "wants": 37, "savings": 15},
  "components": [
    {"label": "Spending sustainability", "score": 61, "weight": 30, "reason": "Wants are above the tier target."},
    {"label": "Emergency resilience", "score": 52, "weight": 25, "reason": "Liquid reserve covers 2.1 months."}
  ],
  "risk_flags": ["High Resilience Risk"],
  "recommendations": ["Reduce discretionary spending by Rs. 2,500 per month."]
}
```

### 19.3 Required forecast response shape

```json
{
  "model_type": "user_arima",
  "confidence": "moderate",
  "training_window_days": 120,
  "forecast_horizon_days": 30,
  "projected_expense": 42000,
  "projected_cash_flow": 8000,
  "category_forecast": [],
  "metrics": {"mae": 1200, "mape": 8.4},
  "assumptions": ["Forecast excludes unrecorded exceptional expenses."]
}
```

### 19.4 Required transaction UI signals

- Easy visible Income/Expense selector.
- Category dropdown and NWS bucket display.
- Bill attachment control and PDF status.
- Soft-delete confirmation.
- Recently Deleted restore action.
- Anomaly badge.
- Inline confirm-normal action.
- Inline exclude-from-learning action.
- Clear income-scope prompt.

---

## 20. Testing and Acceptance Criteria

### 20.1 Functional tests

- Register/login securely and prohibit cross-user data access.
- Create and update a profile; recalculate tier on income change.
- Enter income with present-month and all-months scope.
- Add, delete, restore and expire transactions correctly.
- Upload only valid PDF bills within configured size limits.
- Recalculate dashboard, budget, health and forecast after transaction changes.
- Verify that mandatory EMI maps to Needs and extra principal repayment maps to Savings.
- Flag abnormal transactions and persist confirm/exclude feedback.
- Produce baseline forecasts for new users and personalized forecast status for users with sufficient history.
- Return component-level health explanations and apply guardrail caps.

### 20.2 Non-functional tests

- Validate schema inputs and error messages.
- Verify database persistence after application restart.
- Check user ownership in every API query.
- Test responsive layout and accessibility labels.
- Check that explanation text is understandable and never exposes confidential system prompts or credentials.
- Test forecast error monitoring with held-out transaction periods.
- Test health-score calculations with known numeric fixtures.

---

## 21. Known Constraints and Honest Project Boundaries

- User-entered transaction data may be incomplete or miscategorized.
- An initial forecast is less reliable until enough personal history exists.
- A financial health score is not a credit score.
- Recommendations are educational; they are not guaranteed financial, investment, tax, insurance or legal advice.
- Investment functions require explicit suitability, risk, explainability and regulatory safeguards.
- Bank-account integration is outside the assumed core unless separately implemented.
- The system must state forecast confidence and data confidence rather than creating false certainty.

---

## 22. Reference-Paper Alignment

The research foundation includes WONGA as the base paper for expense tracking, classification and ARIMA expense forecasting. The other reference papers support Digital Twin concepts, robo-advisory, explainable AI, LLM financial assistance, portfolio optimization, reinforcement learning and responsible AI financial planning.

| Research theme | FINGEAR AI use |
|---|---|
| WONGA | Transaction intelligence, automated classification, ARIMA-based forecasting foundation. |
| Automatic time-series forecasting | Automatic ARIMA selection and forecasting methodology. |
| Digital Twin robo-advisory | Personalised Digital Twin architecture. |
| Financial Doppelgangers | Continuous feedback, resilience and explainability principles. |
| XAI in finance | Transparent score, reasons, risk flags and explainable ML outputs. |
| LLM finance | Grounded AI Copilot and financial explanation interface. |
| Mental-account portfolio theory | Goal-specific investment planning. |
| Reinforcement learning | Future adaptive goal-based portfolio optimization. |
| Robo-advisor research | Responsible personalization, auditability and user safeguards. |

---

## 23. Instructions for Future AI Agents

When assisting with this repository:

1. Treat this document as the intended final system scope.
2. Treat Phase 1 as implemented for reports, presentations and academic explanations unless the user explicitly asks for a code-gap audit.
3. Treat PostgreSQL integration as complete for project documentation and design assumptions.
4. Do not describe Phase 2 as complete unless the user explicitly asks for a full-product conceptual report; otherwise identify it as future scope.
5. Preserve the explainable rule-based financial health-score design. Do not replace it with a black-box ML health score.
6. Keep the forecasting service unified across all consumers.
7. Preserve user control over anomaly feedback and data deletion recovery.
8. Never classify mandatory EMI as voluntary savings.
9. Never penalize a user's health score solely because information is missing; use a separate confidence indicator.
10. Make all new financial advice cautious, explainable and non-guaranteed.

---

## 24. One-Sentence Project Summary

FINGEAR AI is an explainable, PostgreSQL-backed Financial Digital Twin that transforms a user's profile and transaction behaviour into income-aware budgeting, financial-health scoring, anomaly alerts, personalized forecasts, goal planning, simulations, conversational guidance and responsible investment decision support.
