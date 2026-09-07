from pydantic import BaseModel, Field


class ExpenseItem(BaseModel):
    category: str
    amount: float = Field(ge=0)


class Goal(BaseModel):
    name: str = Field(min_length=2)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(ge=0)
    target_months: int = Field(gt=0)
    goal_type: str = "Custom"
    target_date: str | None = None
    monthly_contribution: float = Field(default=0, ge=0)


class GoalCreate(BaseModel):
    name: str = Field(min_length=2)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(ge=0)
    monthly_contribution: float = Field(ge=0)
    target_date: str
    goal_type: str = "Custom"


class AdaptiveRatioInfo(BaseModel):
    tier: int
    tier_name: str
    income: float
    ideal_needs_pct: float
    ideal_wants_pct: float
    ideal_savings_pct: float
    actual_needs_pct: float = 0
    actual_wants_pct: float = 0
    actual_savings_pct: float = 0
    adaptive_needs_pct: float
    adaptive_wants_pct: float
    adaptive_savings_pct: float
    needs_amount: float = 0
    wants_amount: float = 0
    savings_amount: float = 0
    emergency_target: float = 0
    is_adapted: bool = False
    adaptation_message: str = ""


class FinancialProfile(BaseModel):
    name: str = "New User"
    email: str | None = None
    age: int | None = Field(default=25, ge=13, le=100)
    occupation: str | None = ""
    currency: str = "INR"
    financial_experience: str = "Beginner"
    income_type: str = "Salaried"
    monthly_income: float = Field(default=0, ge=0)
    other_income: float = Field(default=0, ge=0)
    monthly_expenses: list[ExpenseItem] = Field(default_factory=list)
    savings_balance: float = Field(default=0, ge=0)
    investments_balance: float = Field(default=0, ge=0)
    mutual_funds: float = Field(default=0, ge=0)
    stocks: float = Field(default=0, ge=0)
    fixed_deposits: float = Field(default=0, ge=0)
    gold: float = Field(default=0, ge=0)
    provident_fund: float = Field(default=0, ge=0)
    real_estate_value: float = Field(default=0, ge=0)
    crypto_value: float = Field(default=0, ge=0)
    total_debt: float = Field(default=0, ge=0)
    monthly_debt_payment: float = Field(default=0, ge=0)
    emergency_fund: float = Field(default=0, ge=0)
    emergency_target: float = Field(default=0, ge=0)
    dependents: int = Field(default=0, ge=0)
    salary_day: int = Field(default=1, ge=1, le=31)
    credit_score: int | None = Field(default=750, ge=300, le=900)
    risk_appetite: str = "Moderate"
    lifestyle_preference: str = "Balanced"
    primary_financial_goal: str = "Wealth Creation"
    monthly_income_tier: int = 3
    adaptive_needs_ratio: float | None = None
    adaptive_wants_ratio: float | None = None
    adaptive_savings_ratio: float | None = None
    target_needs_ratio: float | None = None
    target_wants_ratio: float | None = None
    target_savings_ratio: float | None = None
    monthly_income_history: dict[str, float] = Field(default_factory=dict)
    detailed_expenses: list[ExpenseItem] = Field(default_factory=list)
    goals: list[Goal] = Field(default_factory=list)


class Scenario(BaseModel):
    name: str = "Custom Scenario"
    scenario_type: str = "Custom Scenario"
    income_change: float = 0
    expense_change: float = 0
    extra_monthly_investment: float = 0
    new_monthly_loan_payment: float = 0
    investment_return_change: float = 0
    target_goal_name: str | None = None


class SimulationRequest(BaseModel):
    profile: FinancialProfile
    scenario: Scenario


class CopilotRequest(BaseModel):
    question: str
    profile: FinancialProfile


class UserCreate(BaseModel):
    name: str = Field(min_length=2)
    email: str
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class Transaction(BaseModel):
    id: str | None = None
    date: str
    description: str
    category: str
    type: str = Field(pattern="^(income|expense)$")
    amount: float = Field(gt=0)
    bill_url: str | None = None
    deleted_at: str | None = None


class BudgetItem(BaseModel):
    category: str
    planned: float = Field(ge=0)
    actual: float = Field(ge=0)


class InvestmentItem(BaseModel):
    name: str
    asset_class: str
    value: float = Field(ge=0)
    monthly_contribution: float = Field(ge=0)
    expected_return: float = 8


class DebtItem(BaseModel):
    name: str
    principal: float = Field(ge=0)
    outstanding: float = Field(ge=0)
    interest_rate: float = Field(ge=0)
    emi: float = Field(ge=0)
    remaining_months: int = Field(ge=0)
