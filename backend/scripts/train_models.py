import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def generate_synthetic_data(num_samples=1000):
    np.random.seed(42)
    income = np.random.normal(60000, 20000, num_samples)
    expenses = income * np.random.uniform(0.4, 0.9, num_samples)
    savings_balance = np.random.normal(100000, 50000, num_samples)
    investments_balance = np.random.normal(50000, 30000, num_samples)
    debt = np.random.normal(20000, 15000, num_samples)
    
    # Existing Targets
    target_net_worth_12m = savings_balance + investments_balance - debt + (income - expenses) * 12 * np.random.uniform(0.8, 1.2, num_samples)
    
    savings_rate = (income - expenses) / income
    target_health_score = np.clip(
        (savings_rate * 100) + (savings_balance / (expenses + 1) * 10) - (debt / (income + 1) * 10), 0, 100
    )

    # New Targets
    # Expense prediction: Next month's expenses might be slightly higher/lower based on income/debt pressure
    target_expense = expenses * np.random.uniform(0.95, 1.15, num_samples) + (debt * 0.05)
    
    # Investment Return prediction: Based on how much they invest (larger balance -> better diversification -> steadier higher return)
    target_investment_return = np.clip(np.random.normal(8, 3, num_samples) + (investments_balance / 200000), 2, 18)
    
    # Goal Feasibility (probability 0 to 1)
    target_goal_feasibility = np.clip(savings_rate * 1.5 + np.random.uniform(-0.2, 0.2, num_samples), 0, 1)

    df = pd.DataFrame({
        'income': income,
        'expenses': expenses,
        'savings_balance': savings_balance,
        'investments_balance': investments_balance,
        'debt': debt,
        'target_net_worth_12m': target_net_worth_12m,
        'target_health_score': target_health_score,
        'target_expense': target_expense,
        'target_investment_return': target_investment_return,
        'target_goal_feasibility': target_goal_feasibility
    })
    
    return df

def train_and_save_models():
    print("Generating synthetic data...")
    df = generate_synthetic_data(5000)
    
    X = df[['income', 'expenses', 'savings_balance', 'investments_balance', 'debt']]
    models_dir = os.path.join(os.path.dirname(__file__), '../app/ml/models')
    os.makedirs(models_dir, exist_ok=True)

    targets = {
        'forecast': 'target_net_worth_12m',
        'health': 'target_health_score',
        'expense': 'target_expense',
        'investment': 'target_investment_return',
        'goal': 'target_goal_feasibility'
    }

    for name, target_col in targets.items():
        y = df[target_col]
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        metrics = {
            'MAE': mean_absolute_error(y_test, y_pred),
            'RMSE': np.sqrt(mean_squared_error(y_test, y_pred)),
            'R2': r2_score(y_test, y_pred)
        }
        
        print(f"{name.capitalize()} Model Metrics: {metrics}")
        
        model_path = os.path.join(models_dir, f'{name}_model.pkl')
        with open(model_path, 'wb') as f:
            pickle.dump({'model': model, 'metrics': metrics, 'version': 'RandomForest-v1'}, f)
            
    print(f"Random Forest models saved to {models_dir}")
    train_arima_model(models_dir)


def train_arima_model(models_dir):
    print("Training ARIMA Time-Series Model...")
    try:
        from statsmodels.tsa.arima.model import ARIMA
        np.random.seed(42)
        history_length = 48
        t = np.arange(history_length)
        trend = 150000 + 3500 * t
        seasonal = 4000 * np.sin(2 * np.pi * t / 12) + 2000 * np.cos(2 * np.pi * t / 6)
        noise = np.random.normal(0, 2500, history_length)
        series = trend + seasonal + noise
        
        model = ARIMA(series, order=(1, 1, 1))
        model_fit = model.fit()
        
        fitted_vals = model_fit.fittedvalues
        mae = float(mean_absolute_error(series[1:], fitted_vals[1:]))
        rmse = float(np.sqrt(mean_squared_error(series[1:], fitted_vals[1:])))
        r2 = float(r2_score(series[1:], fitted_vals[1:]))
        
        metrics = {
            'AIC': float(model_fit.aic),
            'BIC': float(model_fit.bic),
            'MAE': round(mae, 2),
            'RMSE': round(rmse, 2),
            'R2': round(r2, 4),
            'order': (1, 1, 1)
        }
        
        print(f"ARIMA Model Metrics: {metrics}")
        arima_path = os.path.join(models_dir, 'arima_forecast_model.pkl')
        with open(arima_path, 'wb') as f:
            pickle.dump({
                'model_fit': model_fit,
                'params': model_fit.params.to_dict() if hasattr(model_fit.params, 'to_dict') else list(model_fit.params),
                'metrics': metrics,
                'version': 'ARIMA(1,1,1)',
                'sample_series': series.tolist()
            }, f)
        print(f"ARIMA model successfully saved to {arima_path}")
    except Exception as e:
        print(f"Error training ARIMA model: {e}")


if __name__ == "__main__":
    train_and_save_models()
