CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version)
VALUES ('001_complete_financial_schema')
ON CONFLICT (version) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER CHECK (age IS NULL OR age BETWEEN 13 AND 100),
  occupation TEXT,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  financial_experience TEXT NOT NULL DEFAULT 'Beginner',
  monthly_income NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (monthly_income >= 0),
  other_income NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (other_income >= 0),
  savings_balance NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (savings_balance >= 0),
  investments_balance NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (investments_balance >= 0),
  emergency_fund NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (emergency_fund >= 0),
  total_debt NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (total_debt >= 0),
  monthly_debt_payment NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (monthly_debt_payment >= 0),
  mutual_funds NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (mutual_funds >= 0),
  stocks NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (stocks >= 0),
  fixed_deposits NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (fixed_deposits >= 0),
  gold NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (gold >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
  anomaly_flag BOOLEAN NOT NULL DEFAULT FALSE,
  anomaly_score NUMERIC(8, 6) CHECK (anomaly_score IS NULL OR anomaly_score BETWEEN 0 AND 1),
  anomaly_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  model_training_excluded BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT anomaly_acknowledged OR NOT anomaly_flag),
  CHECK (NOT model_training_excluded OR deleted_at IS NOT NULL OR anomaly_flag)
);

CREATE TABLE IF NOT EXISTS income_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  amount NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
  scope TEXT NOT NULL CHECK (scope IN ('present_month', 'all_months')),
  effective_month DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reversed_at TIMESTAMPTZ,
  CHECK (effective_month = date_trunc('month', effective_month)::date)
);

CREATE TABLE IF NOT EXISTS transaction_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf' CHECK (mime_type = 'application/pdf'),
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  checksum TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS anomaly_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('confirmed_normal', 'excluded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_model_weights (
  user_key TEXT PRIMARY KEY,
  forecast_weights JSONB NOT NULL DEFAULT '[]'::jsonb,
  category_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_training_feedback (
  user_key TEXT NOT NULL,
  transaction_key TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('confirmed_normal', 'excluded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_key, transaction_key)
);

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  planned NUMERIC(19, 4) NOT NULL CHECK (planned >= 0),
  actual NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (actual >= 0),
  period_month DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, period_month),
  CHECK (period_month = date_trunc('month', period_month)::date)
);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'Custom',
  target_amount NUMERIC(19, 4) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  monthly_contribution NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (monthly_contribution >= 0),
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (current_amount <= target_amount)
);

CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  value NUMERIC(19, 4) NOT NULL CHECK (value >= 0),
  monthly_contribution NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (monthly_contribution >= 0),
  expected_return NUMERIC(8, 4) NOT NULL DEFAULT 8 CHECK (expected_return >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  principal NUMERIC(19, 4) NOT NULL CHECK (principal >= 0),
  outstanding NUMERIC(19, 4) NOT NULL CHECK (outstanding >= 0),
  interest_rate NUMERIC(8, 4) NOT NULL CHECK (interest_rate >= 0),
  emi NUMERIC(19, 4) NOT NULL CHECK (emi >= 0),
  remaining_months INTEGER NOT NULL CHECK (remaining_months >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score NUMERIC(8, 4) NOT NULL CHECK (score BETWEEN 0 AND 100),
  explanation JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  horizon_months INTEGER NOT NULL CHECK (horizon_months > 0),
  forecast JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS copilot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  value TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS ix_transactions_user_type ON transactions(user_id, type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_transactions_active ON transactions(user_id, transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_transactions_deleted ON transactions(user_id, deleted_at DESC) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_transactions_category ON transactions(user_id, category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_income_adjustments_user_month ON income_adjustments(user_id, effective_month) WHERE reversed_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_bills_transaction ON transaction_bills(transaction_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_anomaly_feedback_transaction ON anomaly_feedback(transaction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_ai_model_weights_updated ON ai_model_weights(updated_at DESC);
CREATE INDEX IF NOT EXISTS ix_ai_training_feedback_user ON ai_training_feedback(user_key, decision);
CREATE INDEX IF NOT EXISTS ix_budgets_user_month ON budgets(user_id, period_month);
CREATE INDEX IF NOT EXISTS ix_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS ix_investments_user ON investments(user_id);
CREATE INDEX IF NOT EXISTS ix_debts_user ON debts(user_id);
CREATE INDEX IF NOT EXISTS ix_health_scores_user_created ON health_scores(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_forecasts_user_created ON forecasts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_simulations_user_created ON simulations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_events_user_date ON financial_events(user_id, event_date DESC);

CREATE OR REPLACE VIEW effective_monthly_income AS
SELECT
  p.user_id,
  month_bucket.month_start,
  p.monthly_income + COALESCE(SUM(
    CASE
      WHEN ia.scope = 'all_months' THEN ia.amount
      WHEN ia.scope = 'present_month' AND ia.effective_month = month_bucket.month_start THEN ia.amount
      ELSE 0
    END
  ) FILTER (WHERE ia.reversed_at IS NULL), 0) AS monthly_income
FROM financial_profiles p
CROSS JOIN LATERAL (
  SELECT generate_series(
    date_trunc('month', CURRENT_DATE)::date,
    (date_trunc('month', CURRENT_DATE) + INTERVAL '24 months')::date,
    INTERVAL '1 month'
  )::date AS month_start
) month_bucket
LEFT JOIN income_adjustments ia ON ia.user_id = p.user_id
GROUP BY p.user_id, p.monthly_income, month_bucket.month_start;