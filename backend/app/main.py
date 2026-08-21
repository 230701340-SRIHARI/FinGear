from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, budget, copilot, dashboard, debt, forecast, goals, health, insights, investments, profile, reports, routes, settings as settings_api, simulator, timeline, transactions
from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(budget.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(forecast.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(investments.router, prefix="/api")
app.include_router(debt.router, prefix="/api")
app.include_router(simulator.router, prefix="/api")
app.include_router(copilot.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(timeline.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")


@app.get("/")
def root() -> dict:
    return {"message": "FinGear AI backend is running"}
