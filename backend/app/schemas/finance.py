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


class FinancialProfile(BaseModel):
    name: str = "Student Profile"
    email: str | None = None
    age: int | None = Field(default=None, ge=13, le=100)
    occupation: str | None = None
    currency: str = "INR"
    financial_experience: str = "Beginner"
    monthly_income: float = Field(gt=0)
    monthly_expenses: list[ExpenseItem]
    savings_balance: float = Field(ge=0)
    investments_balance: float = Field(ge=0)
    total_debt: float = Field(ge=0)
    monthly_debt_payment: float = Field(ge=0)
    emergency_fund: float = Field(ge=0)
    other_income: float = Field(default=0, ge=0)
    mutual_funds: float = Field(default=0, ge=0)
    stocks: float = Field(default=0, ge=0)
    fixed_deposits: float = Field(default=0, ge=0)
    gold: float = Field(default=0, ge=0)
    goals: list[Goal] = Field(default_factory=list)


class Scenario(BaseModel):
    name: str = "Custom Scenario"
    scenario_type: str = "Custom Scenario"
    income_change: float = 0
    expense_change: float = 0
    extra_monthly_investment: float = 0
    new_monthly_loan_payment: float = 0
    investment_return_change: float = 0


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
