from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    BigInteger,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


def uuid_default() -> uuid.UUID:
    return uuid.uuid4()


Money = Numeric(19, 4)


class SchemaMigration(Base):
    __tablename__ = "schema_migrations"

    version = Column(Text, primary_key=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    name = Column(Text, nullable=False)
    email = Column(Text, unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    profile = relationship("FinancialProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    income_adjustments = relationship("IncomeAdjustment", back_populates="user", cascade="all, delete-orphan")
    transaction_bills = relationship("TransactionBill", back_populates="user", cascade="all, delete-orphan")
    anomaly_feedback = relationship("AnomalyFeedback", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    investments = relationship("Investment", back_populates="user", cascade="all, delete-orphan")
    debts = relationship("Debt", back_populates="user", cascade="all, delete-orphan")


class FinancialProfile(Base):
    __tablename__ = "financial_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    age = Column(Integer)
    occupation = Column(Text)
    currency = Column(String(3), nullable=False, default="INR")
    financial_experience = Column(Text, nullable=False, default="Beginner")
    monthly_income = Column(Money, nullable=False, default=0)
    other_income = Column(Money, nullable=False, default=0)
    savings_balance = Column(Money, nullable=False, default=0)
    investments_balance = Column(Money, nullable=False, default=0)
    emergency_fund = Column(Money, nullable=False, default=0)
    total_debt = Column(Money, nullable=False, default=0)
    monthly_debt_payment = Column(Money, nullable=False, default=0)
    mutual_funds = Column(Money, nullable=False, default=0)
    stocks = Column(Money, nullable=False, default=0)
    fixed_deposits = Column(Money, nullable=False, default=0)
    gold = Column(Money, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="profile")


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("type IN ('income', 'expense')", name="ck_transactions_type"),
        CheckConstraint("amount > 0", name="ck_transactions_amount_positive"),
        CheckConstraint("anomaly_score IS NULL OR (anomaly_score >= 0 AND anomaly_score <= 1)", name="ck_transactions_anomaly_score"),
        CheckConstraint("NOT anomaly_acknowledged OR NOT anomaly_flag", name="ck_transactions_acknowledged"),
        CheckConstraint("NOT model_training_excluded OR deleted_at IS NOT NULL OR anomaly_flag", name="ck_transactions_excluded"),
        Index("ix_transactions_user_date", "user_id", "transaction_date"),
        Index("ix_transactions_user_type", "user_id", "type", postgresql_where=text("deleted_at IS NULL")),
        Index("ix_transactions_category", "user_id", "category", postgresql_where=text("deleted_at IS NULL")),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    transaction_date = Column(Date, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(Text, nullable=False)
    type = Column(String(16), nullable=False)
    amount = Column(Money, nullable=False)
    anomaly_flag = Column(Boolean, nullable=False, default=False)
    anomaly_score = Column(Numeric(8, 6))
    anomaly_acknowledged = Column(Boolean, nullable=False, default=False)
    model_training_excluded = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="transactions")
    income_adjustment = relationship("IncomeAdjustment", back_populates="transaction", uselist=False, cascade="all, delete-orphan")
    bills = relationship("TransactionBill", back_populates="transaction", cascade="all, delete-orphan")
    anomaly_feedback = relationship("AnomalyFeedback", back_populates="transaction", cascade="all, delete-orphan")


class IncomeAdjustment(Base):
    __tablename__ = "income_adjustments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_income_adjustments_amount_positive"),
        CheckConstraint("scope IN ('present_month', 'all_months')", name="ck_income_adjustments_scope"),
        Index("ix_income_adjustments_user_month", "user_id", "effective_month"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, unique=True)
    amount = Column(Money, nullable=False)
    scope = Column(String(20), nullable=False)
    effective_month = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reversed_at = Column(DateTime(timezone=True))

    user = relationship("User", back_populates="income_adjustments")
    transaction = relationship("Transaction", back_populates="income_adjustment")


class TransactionBill(Base):
    __tablename__ = "transaction_bills"
    __table_args__ = (
        CheckConstraint("mime_type = 'application/pdf'", name="ck_transaction_bills_pdf"),
        CheckConstraint("file_size > 0 AND file_size <= 10485760", name="ck_transaction_bills_size"),
        Index("ix_bills_transaction", "transaction_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(Text, nullable=False)
    storage_key = Column(Text, nullable=False, unique=True)
    mime_type = Column(String(64), nullable=False, default="application/pdf")
    file_size = Column(BigInteger, nullable=False)
    checksum = Column(String(128))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True))

    transaction = relationship("Transaction", back_populates="bills")
    user = relationship("User", back_populates="transaction_bills")


class AnomalyFeedback(Base):
    __tablename__ = "anomaly_feedback"
    __table_args__ = (Index("ix_anomaly_feedback_transaction", "transaction_id", "created_at"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    decision = Column(String(32), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    transaction = relationship("Transaction", back_populates="anomaly_feedback")
    user = relationship("User", back_populates="anomaly_feedback")


class AIModelWeights(Base):
    __tablename__ = "ai_model_weights"

    user_key = Column(Text, primary_key=True)
    forecast_weights = Column(JSON, nullable=False, default=list)
    category_weights = Column(JSON, nullable=False, default=dict)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AITrainingFeedback(Base):
    __tablename__ = "ai_training_feedback"

    user_key = Column(Text, primary_key=True)
    transaction_key = Column(Text, primary_key=True)
    decision = Column(String(32), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (UniqueConstraint("user_id", "category", "period_month"), Index("ix_budgets_user_month", "user_id", "period_month"))

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category = Column(Text, nullable=False)
    planned = Column(Money, nullable=False, default=0)
    actual = Column(Money, nullable=False, default=0)
    period_month = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="budgets")


class Goal(Base):
    __tablename__ = "goals"
    __table_args__ = (CheckConstraint("current_amount <= target_amount", name="ck_goals_current_lte_target"), Index("ix_goals_user", "user_id"))

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    goal_type = Column(Text, nullable=False, default="Custom")
    target_amount = Column(Money, nullable=False)
    current_amount = Column(Money, nullable=False, default=0)
    monthly_contribution = Column(Money, nullable=False, default=0)
    target_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="goals")


class Investment(Base):
    __tablename__ = "investments"
    __table_args__ = (Index("ix_investments_user", "user_id"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    asset_class = Column(Text, nullable=False)
    value = Column(Money, nullable=False, default=0)
    monthly_contribution = Column(Money, nullable=False, default=0)
    expected_return = Column(Numeric(8, 4), nullable=False, default=8)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="investments")


class Debt(Base):
    __tablename__ = "debts"
    __table_args__ = (Index("ix_debts_user", "user_id"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    principal = Column(Money, nullable=False, default=0)
    outstanding = Column(Money, nullable=False, default=0)
    interest_rate = Column(Numeric(8, 4), nullable=False, default=0)
    emi = Column(Money, nullable=False, default=0)
    remaining_months = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="debts")


class HealthScore(Base):
    __tablename__ = "health_scores"
    __table_args__ = (Index("ix_health_scores_user_created", "user_id", "created_at"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    score = Column(Numeric(8, 4), nullable=False)
    explanation = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Forecast(Base):
    __tablename__ = "forecasts"
    __table_args__ = (Index("ix_forecasts_user_created", "user_id", "created_at"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mode = Column(Text, nullable=False)
    horizon_months = Column(Integer, nullable=False)
    forecast = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Simulation(Base):
    __tablename__ = "simulations"
    __table_args__ = (Index("ix_simulations_user_created", "user_id", "created_at"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scenario = Column(JSON, nullable=False)
    result = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CopilotConversation(Base):
    __tablename__ = "copilot_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_created", "user_id", "created_at"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    severity = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    detail = Column(Text, nullable=False)
    read_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class FinancialEvent(Base):
    __tablename__ = "financial_events"
    __table_args__ = (Index("ix_events_user_date", "user_id", "event_date"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_default)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_date = Column(Date, nullable=False)
    title = Column(Text, nullable=False)
    value = Column(Text, nullable=False)
    type = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)