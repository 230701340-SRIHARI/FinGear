def empty_evaluation_metrics() -> dict:
    return {
        "MAE": None,
        "RMSE": None,
        "R2": None,
        "status": "Model evaluation will be available after a real training dataset is connected.",
    }
