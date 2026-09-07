CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'INR',
  name TEXT,
  email TEXT,
  age INTEGER DEFAULT 25,
  occupation TEXT DEFAULT '',
  financial_experience TEXT DEFAULT 'Beginner',
  income_type TEXT DEFAULT 'Salaried',
  monthly_income NUMERIC NOT NULL DEFAULT 0,
  other_income NUMERIC NOT NULL DEFAULT 0,
  savings_balance NUMERIC NOT NULL DEFAULT 0,
  investments_balance NUMERIC NOT NULL DEFAULT 0,
  mutual_funds NUMERIC NOT NULL DEFAULT 0,
  stocks NUMERIC NOT NULL DEFAULT 0,
  fixed_deposits NUMERIC NOT NULL DEFAULT 0,
  gold NUMERIC NOT NULL DEFAULT 0,
  provident_fund NUMERIC NOT NULL DEFAULT 0,
  real_estate_value NUMERIC NOT NULL DEFAULT 0,
  crypto_value NUMERIC NOT NULL DEFAULT 0,
  emergency_fund NUMERIC NOT NULL DEFAULT 0,
  emergency_target NUMERIC NOT NULL DEFAULT 0,
  total_debt NUMERIC NOT NULL DEFAULT 0,
  monthly_debt_payment NUMERIC NOT NULL DEFAULT 0,
  dependents INTEGER DEFAULT 0,
  salary_day INTEGER DEFAULT 1,
  credit_score INTEGER DEFAULT 750,
  risk_appetite TEXT DEFAULT 'Moderate',
  lifestyle_preference TEXT DEFAULT 'Balanced',
  primary_financial_goal TEXT DEFAULT 'Wealth Creation',
  monthly_income_tier INTEGER DEFAULT 3,
  adaptive_needs_ratio NUMERIC DEFAULT 50.0,
  adaptive_wants_ratio NUMERIC DEFAULT 30.0,
  adaptive_savings_ratio NUMERIC DEFAULT 20.0,
  target_needs_ratio NUMERIC DEFAULT 50.0,
  target_wants_ratio NUMERIC DEFAULT 30.0,
  target_savings_ratio NUMERIC DEFAULT 20.0,
  monthly_income_history JSONB DEFAULT '{}',
  detailed_expenses JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  anomaly_flag BOOLEAN DEFAULT FALSE,
  anomaly_score NUMERIC DEFAULT 0,
  anomaly_acknowledged BOOLEAN DEFAULT FALSE,
  model_training_excluded BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS income_adjustments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('present_month', 'all_months')),
  effective_month VARCHAR(7) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reversed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS transaction_bills (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size INTEGER NOT NULL,
  checksum TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS anomaly_feedback (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('confirmed_normal', 'excluded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_model_weights (
  user_key TEXT PRIMARY KEY,
  forecast_weights JSONB DEFAULT '{}',
  category_weights JSONB DEFAULT '{}',
  rf_model_state JSONB,
  arima_params JSONB,
  training_sample_count INTEGER DEFAULT 0,
  baseline_spend_mean NUMERIC DEFAULT 0,
  baseline_spend_std NUMERIC DEFAULT 0,
  last_trained_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_training_feedback (
  id UUID PRIMARY KEY,
  user_key TEXT NOT NULL,
  transaction_key TEXT NOT NULL,
  decision TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_score_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  pillar_scores JSONB NOT NULL DEFAULT '{}',
  adaptive_ratio_snapshot JSONB,
  salary_slab_tier INTEGER NOT NULL DEFAULT 3,
  ai_commentary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_forecast_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL DEFAULT CURRENT_DATE,
  predicted_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC,
  model_used TEXT NOT NULL DEFAULT 'statistical_rule_7d',
  confidence_interval_low NUMERIC,
  confidence_interval_high NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  planned NUMERIC NOT NULL,
  actual NUMERIC NOT NULL DEFAULT 0,
  period_month VARCHAR(7)
);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL,
  monthly_contribution NUMERIC DEFAULT 0,
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  value NUMERIC NOT NULL,
  monthly_contribution NUMERIC NOT NULL,
  expected_return NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  principal NUMERIC NOT NULL,
  outstanding NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL,
  emi NUMERIC NOT NULL,
  remaining_months INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_scores (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  explanation JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forecasts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  horizon_months INTEGER NOT NULL,
  forecast JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS simulations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS copilot_conversations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  value TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW effective_monthly_income AS
SELECT 
  fp.user_id,
  fp.monthly_income + COALESCE(SUM(ia.amount), 0) AS total_effective_income
FROM financial_profiles fp
LEFT JOIN income_adjustments ia ON fp.user_id = ia.user_id AND ia.reversed_at IS NULL
GROUP BY fp.user_id, fp.monthly_income;
