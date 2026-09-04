from datetime import date
from sqlalchemy import Column, String, Float, Integer, ForeignKey, Date, JSON, DateTime
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid

Base = declarative_base()

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
    currency = Column(String, default="INR")
    monthly_income = Column(Float, nullable=False, default=0.0)
    savings_balance = Column(Float, nullable=False, default=0.0)
    investments_balance = Column(Float, nullable=False, default=0.0)
    emergency_fund = Column(Float, nullable=False, default=0.0)
    total_debt = Column(Float, nullable=False, default=0.0)
    monthly_debt_payment = Column(Float, nullable=False, default=0.0)
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
    
    user = relationship("User", back_populates="transactions")

class Budget(Base):
    __tablename__ = "budgets"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False)
    planned = Column(Float, nullable=False)
    actual = Column(Float, nullable=False, default=0.0)
    
    user = relationship("User", back_populates="budgets")

class Goal(Base):
    __tablename__ = "goals"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    goal_type = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, nullable=False)
    target_date = Column(Date)
    
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
