from datetime import date
from sqlalchemy import Column, String, Float, Integer, ForeignKey, Date, JSON, DateTime, Boolean
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class SchemaMigration(Base):
    __tablename__ = "schema_migrations"
    version = Column(Integer, primary_key=True)
    description = Column(String, nullable=False)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    profile = relationship("FinancialProfile", back_populates="user", uselist=False)
    transactions = relationship("Transaction", back_populates="user")
    budgets = relationship("Budget", back_populates="user")
    goals = relationship("Goal", back_populates="user")
    investments = relationship("Investment", back_populates="user")
    debts = relationship("Debt", back_populates="user")

class FinancialProfile(Base):
    __tablename__ = "financial_profiles"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    occupation = Column(String, nullable=True)
    financial_experience = Column(String, default="Beginner")
    income_type = Column(String, default="Salaried")  # Salaried, Freelance, Business
    dependents = Column(Integer, default=0)
    salary_day = Column(Integer, default=1)
    credit_score = Column(Integer, default=750)
    risk_appetite = Column(String, default="Moderate")
    lifestyle_preference = Column(String, default="Balanced")  # Frugal, Balanced, Experience-focused
    primary_financial_goal = Column(String, default="Wealth Creation")
    monthly_income_tier = Column(Integer, default=3)  # Tier 1 to Tier 5
    
    currency = Column(String, default="INR")
    monthly_income = Column(Float, nullable=False, default=0.0)
    other_income = Column(Float, default=0.0)
    savings_balance = Column(Float, nullable=False, default=0.0)
    investments_balance = Column(Float, nullable=False, default=0.0)
    emergency_fund = Column(Float, nullable=False, default=0.0)
    emergency_target = Column(Float, default=0.0)
    total_debt = Column(Float, nullable=False, default=0.0)
    monthly_debt_payment = Column(Float, nullable=False, default=0.0)

    # Detailed asset portfolio values
    mutual_funds = Column(Float, default=0.0)
    stocks = Column(Float, default=0.0)
    fixed_deposits = Column(Float, default=0.0)
    gold = Column(Float, default=0.0)
    provident_fund = Column(Float, default=0.0)
    real_estate_value = Column(Float, default=0.0)
    crypto_value = Column(Float, default=0.0)

    # Dynamic 50:30:20 tracking
    adaptive_needs_ratio = Column(Float, default=50.0)
    adaptive_wants_ratio = Column(Float, default=30.0)
    adaptive_savings_ratio = Column(Float, default=20.0)
    target_needs_ratio = Column(Float, default=50.0)
    target_wants_ratio = Column(Float, default=30.0)
    target_savings_ratio = Column(Float, default=20.0)

    detailed_expenses = Column(JSON, default=list)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user = relationship("User", back_populates="profile")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    transaction_date = Column(Date, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)
    type = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    anomaly_flag = Column(Boolean, default=False)
    anomaly_score = Column(Float, default=0.0)
    anomaly_acknowledged = Column(Boolean, default=False)
    model_training_excluded = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    user = relationship("User", back_populates="transactions")
    bills = relationship("TransactionBill", back_populates="transaction", cascade="all, delete-orphan")

class IncomeAdjustment(Base):
    __tablename__ = "income_adjustments"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(String, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Float, nullable=False)
    scope = Column(String, nullable=False)  # present_month or all_months
    effective_month = Column(String(7), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reversed_at = Column(DateTime(timezone=True), nullable=True)

class TransactionBill(Base):
    __tablename__ = "transaction_bills"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id = Column(String, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String, nullable=False)
    storage_key = Column(String, nullable=False)
    mime_type = Column(String, default="application/pdf")
    file_size = Column(Integer, nullable=False)
    checksum = Column(String, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    transaction = relationship("Transaction", back_populates="bills")

class AnomalyFeedback(Base):
    __tablename__ = "anomaly_feedback"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id = Column(String, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    decision = Column(String, nullable=False)  # confirmed_normal or excluded
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AIModelWeight(Base):
    __tablename__ = "ai_model_weights"
    user_key = Column(String, primary_key=True)
    forecast_weights = Column(JSON, nullable=True)
    category_weights = Column(JSON, nullable=True)
    rf_model_state = Column(JSON, nullable=True)  # serialized trained random forest parameters/feature importances
    arima_params = Column(JSON, nullable=True)  # fitted ARIMA orders, trend, residuals
    training_sample_count = Column(Integer, default=0)
    baseline_spend_mean = Column(Float, default=0.0)
    baseline_spend_std = Column(Float, default=0.0)
    last_trained_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class HealthScoreHistory(Base):
    __tablename__ = "health_score_history"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False)
    pillar_scores = Column(JSON, nullable=False)  # savings, debt, emergency, budget_adherence, resilience
    adaptive_ratio_snapshot = Column(JSON, nullable=True)  # actual vs target vs stepping ratios
    salary_slab_tier = Column(Integer, default=3)
    ai_commentary = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ExpenseForecastHistory(Base):
    __tablename__ = "expense_forecast_history"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    forecast_date = Column(Date, nullable=False)
    predicted_amount = Column(Float, nullable=False)
    actual_amount = Column(Float, nullable=True)
    model_used = Column(String, nullable=False)  # statistical_rule_7d, user_random_forest, arima_hybrid
    confidence_interval_low = Column(Float, nullable=True)
    confidence_interval_high = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AITrainingFeedback(Base):
    __tablename__ = "ai_training_feedback"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_key = Column(String, nullable=False)
    transaction_key = Column(String, nullable=False)
    decision = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Budget(Base):
    __tablename__ = "budgets"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False)
    planned = Column(Float, nullable=False)
    actual = Column(Float, nullable=False, default=0.0)
    period_month = Column(String(7), nullable=True)
    
    user = relationship("User", back_populates="budgets")

class Goal(Base):
    __tablename__ = "goals"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    goal_type = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, nullable=False)
    monthly_contribution = Column(Float, default=0.0)
    target_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="goals")

class Investment(Base):
    __tablename__ = "investments"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    asset_class = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    monthly_contribution = Column(Float, nullable=False)
    expected_return = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="investments")

class Debt(Base):
    __tablename__ = "debts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    principal = Column(Float, nullable=False)
    outstanding = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False)
    emi = Column(Float, nullable=False)
    remaining_months = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="debts")

class HealthScore(Base):
    __tablename__ = "health_scores"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False)
    explanation = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Forecast(Base):
    __tablename__ = "forecasts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mode = Column(String, nullable=False)
    horizon_months = Column(Integer, nullable=False)
    forecast = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Simulation(Base):
    __tablename__ = "simulations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scenario = Column(JSON, nullable=False)
    result = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CopilotConversation(Base):
    __tablename__ = "copilot_conversations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    severity = Column(String, nullable=False)
    title = Column(String, nullable=False)
    detail = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FinancialEvent(Base):
    __tablename__ = "financial_events"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_date = Column(Date, nullable=False)
    title = Column(String, nullable=False)
    value = Column(String, nullable=False)
    type = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
