# FinGear AI

FinGear AI is an AI-powered personal finance intelligence website based on a Financial Digital Twin. It is designed for a final-year engineering project demonstration: current financial health, future baseline forecasting, goal planning, what-if simulation, and context-aware AI explanations.

## Product Loop

Real financial data -> Financial Digital Twin -> Current health -> Future forecast -> Goals -> What-if decision -> Simulated future -> AI explanation -> Recommendation

## Features

- Real multi-page React application with client-side routing
- Dark futuristic FinTech application shell
- Local email registration/login with an optional seeded sample account
- Dashboard executive overview
- Pseudo-3D Financial Digital Twin visualization
- Financial profile editor
- Transactions, budget, investments, debt and goals pages
- Explainable Financial Health Score
- Baseline forecast page with honest non-ML labelling
- Flagship What-if Decision Lab and scenario history
- AI Copilot workspace with financial context
- AI insights, reports, timeline, settings and security pages
- PostgreSQL-ready schema and Docker setup

## Tech Stack

- Frontend: React, Vite, React Router, Recharts, Lucide React
- Backend: FastAPI, Python, Pydantic, Uvicorn
- AI: OpenAI Python SDK, optional through `OPENAI_API_KEY`
- ML architecture: replaceable baseline forecasting interface, future scikit-learn support
- Database target: PostgreSQL
- Optional containers: Docker Compose

## Folder Structure

```text
backend/
  app/
    api/          Modular REST routes
    core/         Config and JWT/password helpers
    database/     PostgreSQL status and schema
    ml/           Replaceable ML interfaces
    repositories/ Local in-memory repository
    schemas/      Pydantic models
    services/     Financial calculations, simulation, copilot
frontend/
  src/
    components/   Layout, UI and chart components
    context/      Auth and finance data providers
    lib/          API client, sample profile, formatting
    pages/        Dedicated route pages
```

## Environment

Backend: copy `backend/.env.example` to `backend/.env`.

```text
DATABASE_URL=postgresql://fingear:fingear_dev_password@localhost:5432/fingear_ai
JWT_SECRET=replace-with-a-long-random-secret
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/api/auth/google/callback
FRONTEND_ORIGIN=http://127.0.0.1:5173
PUBLIC_APP_URL=http://127.0.0.1:5173
```

Frontend can use:

```text
VITE_API_URL=http://127.0.0.1:8000/api
```

Do not commit real API keys.

Google login remains enabled in local development when `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/api/auth/google/callback` are configured in `backend/.env`.

## Run Locally

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

Seeded local credentials:

```text
student@fingear.ai
student123
```

Google login uses the localhost backend callback in development and redirects back to `http://127.0.0.1:5173/dashboard` after the backend creates the app session.

## API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/google/status`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `GET /api/dashboard`
- `GET /api/profile`
- `PUT /api/profile`
- `GET /api/transactions`
- `POST /api/transactions`
- `GET /api/budget`
- `GET /api/health`
- `GET /api/forecast`
- `GET /api/goals`
- `POST /api/goals`
- `GET /api/investments`
- `GET /api/debt`
- `POST /api/simulator/run`
- `GET /api/simulator/history`
- `POST /api/copilot/chat`
- `GET /api/insights`
- `GET /api/timeline`
- `GET /api/reports`
- `GET /api/settings`
- `GET /api/settings/security`

## PostgreSQL

The intended persistent schema is in:

```text
backend/app/database/schema.sql
```

Tables include users, financial profiles, transactions, budgets, goals, investments, debts, health scores, forecasts, simulations, copilot conversations, notifications and financial events. Each financial entity belongs to a user.

PostgreSQL models and SQLAlchemy have been integrated. The application gracefully falls back to in-memory state for UI demonstrations if the database is unreachable or `DATABASE_URL` is unset, to ensure the demo always runs smoothly.

## Docker

Optional:

```powershell
docker compose up --build
```

This starts PostgreSQL, backend and frontend containers. Local development without Docker is still recommended while building.

## AI Configuration

The Copilot reads current profile, health score, goals and forecast context before calling the LLM. If `OPENAI_API_KEY` is missing or the API fails, the app returns a local rule-based explanation instead of breaking.

## ML Configuration

Forecasting is now powered by trained Machine Learning models (Random Forest). The `ForecastEngine` dynamically blends machine learning output with baseline projections. The Health Score Engine uses a dual system combining a rule-based explainability layer with an ML prediction overlay.

The models have been trained on synthetic financial data to demonstrate architecture readiness. 

To retrain the models:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements-ml.txt
python scripts/train_models.py
```

## Research Contribution

FinGear AI demonstrates:

- Explainable financial health assessment
- Behavioral financial analytics
- Predictive ML-based forecasting
- Large Language Model based financial assistance
- What-if financial decision simulation
- Digital Twin based personal finance decision support

## Limitations

- Bank integration is not implemented.
- PDF export is marked planned.
- AI responses are educational analysis, not guaranteed financial advice.

## Future Scope

Bank account integration, automatic transaction categorization, fraud detection, alternative credit scoring, insurance planning, retirement planning, advanced investment intelligence and agentic financial workflows.
