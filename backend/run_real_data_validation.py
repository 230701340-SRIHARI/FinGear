#!/usr/bin/env python3
"""Reproducible, temporally separated validation on public real transaction data."""

from __future__ import annotations

import hashlib
import json
import math
import platform
import time
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import (
    auc,
    average_precision_score,
    matthews_corrcoef,
    precision_recall_curve,
    roc_auc_score,
)

from app.ml.ai_engine.anomaly_detector import AnomalyEnsembleManager
from app.ml.forecasting import UserRandomForestForecaster


BACKEND_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BACKEND_DIR / "validation_results"
CACHE_DIR = OUTPUT_DIR / "real_data_cache"
FRAUD_PARQUET_URL = "https://data.openml.org/datasets/0000/1597/dataset_1597.pq"
RETAIL_CSV_URL = "https://archive.ics.uci.edu/static/public/352/data.csv"
EXPECTED_FRAUD_ROWS = 284_807
EXPECTED_RETAIL_ROWS = 541_909
EXPECTED_DATA_HASHES = {
    "fraud": "b7efcb35a428bbe22347a05d2437d9177bab07ce61e51214a17bec584ad9496d",
    "retail": "a2f79bbdd4463df6db8a3f5a50b9c980ae8f645a370bf5e2c0d6097f9e817b05",
}
CHUNK_SIZE = 8 * 1024 * 1024


def get_content_length(url: str) -> int | None:
    request = urllib.request.Request(url, method="HEAD")
    with urllib.request.urlopen(request, timeout=60) as response:
        value = response.headers.get("Content-Length")
    return int(value) if value is not None else None


def download_in_ranges(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    expected_length = get_content_length(url)
    if expected_length is not None and destination.exists() and destination.stat().st_size == expected_length:
        return
    if expected_length is None and destination.exists() and destination.stat().st_size > 0:
        return

    temporary = destination.with_suffix(destination.suffix + ".partial")
    temporary.unlink(missing_ok=True)
    if expected_length is None:
        request = urllib.request.Request(url, headers={"User-Agent": "FinGearResearchValidation/1.0"})
        with urllib.request.urlopen(request, timeout=120) as response, temporary.open("wb") as output:
            while block := response.read(1024 * 1024):
                output.write(block)
        if temporary.stat().st_size == 0:
            raise RuntimeError(f"Empty download for {url}")
        temporary.replace(destination)
        return

    with temporary.open("wb") as output:
        for start in range(0, expected_length, CHUNK_SIZE):
            end = min(start + CHUNK_SIZE, expected_length) - 1
            request = urllib.request.Request(
                url,
                headers={"Range": f"bytes={start}-{end}", "User-Agent": "FinGearResearchValidation/1.0"},
            )
            with urllib.request.urlopen(request, timeout=120) as response:
                content_range = response.headers.get("Content-Range", "")
                expected_range = f"bytes {start}-{end}/{expected_length}"
                if response.status != 206 or content_range != expected_range:
                    raise RuntimeError(
                        f"Unexpected range response for {url}: "
                        f"status={response.status}, Content-Range={content_range!r}"
                    )
                payload = response.read()
            if len(payload) != end - start + 1:
                raise RuntimeError(f"Incomplete download for {url} at byte range {start}-{end}")
            output.write(payload)

    if temporary.stat().st_size != expected_length:
        raise RuntimeError(f"Downloaded size mismatch for {destination}")
    temporary.replace(destination)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def wilson_interval(successes: int, trials: int, z: float = 1.96) -> tuple[float, float]:
    if trials == 0:
        return 0.0, 0.0
    proportion = successes / trials
    denominator = 1 + z * z / trials
    center = (proportion + z * z / (2 * trials)) / denominator
    margin = z * math.sqrt(
        proportion * (1 - proportion) / trials + z * z / (4 * trials * trials)
    ) / denominator
    return max(0.0, center - margin), min(1.0, center + margin)


def transaction_record(row: Any, origin: datetime) -> dict[str, Any]:
    timestamp = origin + timedelta(seconds=float(row.Time))
    return {
        "date": timestamp,
        "amount": float(row.Amount),
        "category": "Other",
        "type": "expense",
    }


def evaluate_fraud_dataset(path: Path) -> dict[str, Any]:
    frame = pd.read_parquet(path, columns=["Time", "Amount", "Class"])
    if len(frame) != EXPECTED_FRAUD_ROWS:
        raise RuntimeError(f"Expected {EXPECTED_FRAUD_ROWS} fraud rows, found {len(frame)}")
    frame["Class"] = frame["Class"].astype(int)
    if frame["Class"].nunique() != 2 or not frame["Time"].is_monotonic_increasing:
        raise RuntimeError("Fraud data labels or chronological ordering do not match expectations")

    origin = datetime(2013, 9, 1)
    fold_starts = [int(len(frame) * fraction) for fraction in (0.50, 0.60, 0.70, 0.80, 0.90)]
    labels: list[int] = []
    predictions: list[int] = []
    scores: list[float] = []
    phases: set[int] = set()
    latencies_ms: list[float] = []
    fold_summaries: list[dict[str, int]] = []

    for fold_index, start in enumerate(fold_starts, start=1):
        stop = int(len(frame) * (0.50 + fold_index * 0.10))
        train = frame.iloc[:start]
        test = frame.iloc[start:stop]
        manager = AnomalyEnsembleManager()
        history = [
            transaction_record(row, origin)
            for row in train.itertuples(index=False)
        ]
        manager.train_all(history)

        fold_tp = fold_fp = fold_tn = fold_fn = 0
        for row in test.itertuples(index=False):
            record = transaction_record(row, origin)
            started = time.perf_counter()
            result = manager.detect(record)
            latencies_ms.append((time.perf_counter() - started) * 1000)
            actual = int(row.Class)
            predicted = int(result.is_anomaly)
            labels.append(actual)
            predictions.append(predicted)
            scores.append(float(result.score))
            phases.add(result.phase)
            if actual and predicted:
                fold_tp += 1
            elif not actual and predicted:
                fold_fp += 1
            elif not actual and not predicted:
                fold_tn += 1
            else:
                fold_fn += 1

        fold_summaries.append(
            {
                "fold": fold_index,
                "train_rows": len(train),
                "test_rows": len(test),
                "test_fraud": int(test["Class"].sum()),
                "tp": fold_tp,
                "fp": fold_fp,
                "tn": fold_tn,
                "fn": fold_fn,
            }
        )

    y_true = np.asarray(labels, dtype=np.int8)
    y_pred = np.asarray(predictions, dtype=np.int8)
    score_array = np.asarray(scores, dtype=float)
    tp = int(np.sum((y_true == 1) & (y_pred == 1)))
    fp = int(np.sum((y_true == 0) & (y_pred == 1)))
    tn = int(np.sum((y_true == 0) & (y_pred == 0)))
    fn = int(np.sum((y_true == 1) & (y_pred == 0)))
    positives = tp + fn
    negatives = tn + fp
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / positives if positives else 0.0
    specificity = tn / negatives if negatives else 0.0
    pr_precision, pr_recall, _ = precision_recall_curve(y_true, score_array)

    return {
        "dataset": {
            "name": "Credit Card Fraud Detection (Worldline/ULB)",
            "rows": len(frame),
            "fraud_rows": int(frame["Class"].sum()),
            "fraud_prevalence_percent": float(frame["Class"].mean() * 100),
            "evaluated_rows": len(y_true),
            "evaluated_fraud_rows": int(y_true.sum()),
            "evaluated_prevalence_percent": float(y_true.mean() * 100),
            "temporal_folds": fold_summaries,
        },
        "protocol": {
            "split": "Five expanding-window temporal folds; each test fold is the next 10% of ordered records.",
            "training_labels_used": False,
            "fixed_detector_threshold": "Existing detector threshold; no tuning on holdout data.",
            "detector_phases": sorted(phases),
            "input_features": "Amount and elapsed transaction time mapped to existing amount/date fields; one Other category.",
            "ignored_source_features": "PCA features V1-V28 are unavailable to the production detector and were not used.",
        },
        "metrics": {
            "tp": tp,
            "fp": fp,
            "tn": tn,
            "fn": fn,
            "accuracy_percent": 100 * (tp + tn) / len(y_true),
            "precision_percent": 100 * precision,
            "precision_95ci_percent": [100 * value for value in wilson_interval(tp, tp + fp)],
            "recall_percent": 100 * recall,
            "recall_95ci_percent": [100 * value for value in wilson_interval(tp, positives)],
            "specificity_percent": 100 * specificity,
            "false_positive_rate_percent": 100 * (fp / negatives if negatives else 0),
            "f1": 2 * precision * recall / (precision + recall) if precision + recall else 0,
            "balanced_accuracy_percent": 50 * (recall + specificity),
            "mcc": float(matthews_corrcoef(y_true, y_pred)),
            "roc_auc": float(roc_auc_score(y_true, score_array)),
            "pr_auc_trapezoidal": float(auc(pr_recall, pr_precision)),
            "average_precision": float(average_precision_score(y_true, score_array)),
            "unique_score_count": int(np.unique(score_array).size),
            "score_saturated_at_one_percent": 100 * float(np.mean(score_array >= 1.0)),
            "no_alert_baseline_accuracy_percent": 100 * float(np.mean(y_true == 0)),
            "no_alert_baseline_recall_percent": 0.0,
            "mean_inference_latency_ms": float(np.mean(latencies_ms)),
        },
    }


def evaluate_retail_forecasting(path: Path) -> dict[str, Any]:
    frame = pd.read_csv(path, encoding="ISO-8859-1")
    if len(frame) != EXPECTED_RETAIL_ROWS:
        raise RuntimeError(f"Expected {EXPECTED_RETAIL_ROWS} retail rows, found {len(frame)}")

    frame["InvoiceDate"] = pd.to_datetime(
        frame["InvoiceDate"], format="%m/%d/%Y %H:%M", errors="coerce"
    )
    valid = frame.dropna(subset=["InvoiceDate", "Quantity", "UnitPrice"]).copy()
    valid["line_value"] = valid["Quantity"] * valid["UnitPrice"]
    daily = valid.groupby(valid["InvoiceDate"].dt.normalize())["line_value"].sum().sort_index()
    calendar = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
    daily = daily.reindex(calendar, fill_value=0.0).astype(float)

    test_start = max(30, int(len(daily) * 0.80))
    forecaster = UserRandomForestForecaster(salary_day=1)
    predictions: list[float] = []
    actuals: list[float] = []
    previous_day: list[float] = []
    previous_week: list[float] = []
    latencies_ms: list[float] = []

    for index in range(test_start, len(daily)):
        training = daily.iloc[:index]
        target_date = daily.index[index].date()
        started = time.perf_counter()
        prediction, _, _ = forecaster.train_and_predict(training, target_date=target_date)
        latencies_ms.append((time.perf_counter() - started) * 1000)
        predictions.append(float(prediction))
        actuals.append(float(daily.iloc[index]))
        previous_day.append(float(daily.iloc[index - 1]))
        previous_week.append(float(daily.iloc[index - 7]))

    actual = np.asarray(actuals)
    prediction_array = np.asarray(predictions)

    def error_metrics(estimate: np.ndarray) -> dict[str, float]:
        errors = actual - estimate
        denominator = float(np.sum(np.abs(actual)))
        return {
            "mae_gbp": float(np.mean(np.abs(errors))),
            "rmse_gbp": float(np.sqrt(np.mean(errors**2))),
            "wape_percent": 100 * float(np.sum(np.abs(errors))) / denominator if denominator else 0.0,
        }

    model_metrics = error_metrics(prediction_array)
    previous_day_metrics = error_metrics(np.asarray(previous_day))
    previous_week_metrics = error_metrics(np.asarray(previous_week))
    return {
        "dataset": {
            "name": "UCI Online Retail",
            "source_rows": len(frame),
            "usable_rows": len(valid),
            "daily_observations": len(daily),
            "first_date": str(daily.index.min().date()),
            "last_date": str(daily.index.max().date()),
            "target_definition": "Daily net line value in GBP (Quantity × UnitPrice); negative cancellation/return lines retained; zero-activity calendar days set to zero.",
            "evaluated_days": len(actual),
        },
        "protocol": {
            "split": "Chronological expanding-window one-day-ahead walk-forward; final 20% of calendar days held out.",
            "minimum_history_days": test_start,
            "baselines": "Previous calendar day and same weekday one week earlier.",
        },
        "metrics": {
            "random_forest": model_metrics,
            "previous_day_baseline": previous_day_metrics,
            "weekly_seasonal_baseline": previous_week_metrics,
            "mae_skill_vs_previous_day_percent": 100
            * (1 - model_metrics["mae_gbp"] / previous_day_metrics["mae_gbp"])
            if previous_day_metrics["mae_gbp"]
            else 0.0,
            "mae_skill_vs_weekly_baseline_percent": 100
            * (1 - model_metrics["mae_gbp"] / previous_week_metrics["mae_gbp"])
            if previous_week_metrics["mae_gbp"]
            else 0.0,
            "mean_inference_latency_ms": float(np.mean(latencies_ms)),
        },
    }


def render_report(results: dict[str, Any], checksums: dict[str, str]) -> str:
    fraud = results["fraud"]
    fm = fraud["metrics"]
    retail = results["retail"]
    rm = retail["metrics"]
    rfm = rm["random_forest"]
    code_hashes = results["code_sha256"]
    return f"""# FinGear Real-Data Validation Report

Generated: {datetime.now().astimezone().isoformat()}
Runtime: Python {platform.python_version()} / {platform.platform()}

## Research-use statement

This report evaluates only the existing anomaly detector's cold-start behavior and the existing daily Random Forest forecaster on two cited public datasets. It is a reproducible benchmark, not evidence of production readiness, causal impact, or generalization to other populations. The financial-health scoring, budgeting rules, debt guardrails, investment-return estimator, and goal-feasibility estimator have no independent real-world outcome labels in these datasets and are therefore **not empirically validated here**.

## Sources and data integrity

1. **Credit Card Fraud Detection (Worldline/ULB)**, 284,807 card transactions from September 2013, 492 labeled frauds. OpenML dataset 1597; source describes two days, anonymized PCA inputs V1-V28, Time and Amount. Public listing and citation: Andrea Dal Pozzolo, Olivier Caelen, Reid A. Johnson, Gianluca Bontempi, “Calibrating Probability with Undersampling for Unbalanced Classification,” IEEE CIDM, 2015. [OpenML dataset record](https://www.openml.org/d/1597). SHA-256: `{checksums['fraud']}`.
2. **UCI Online Retail**, 541,909 invoice-line records for one UK online retailer, 2010-12-01 to 2011-12-09. [UCI dataset 352](https://doi.org/10.24432/C5BW33); Chen, Sain & Guo (2012), DOI [10.1057/dbm.2012.17](https://doi.org/10.1057/dbm.2012.17). SHA-256: `{checksums['retail']}`.

The first dataset contains real card transactions with fraud labels. The second contains real retail sales and cancellations, not household spending. Neither is a representative sample of FinGear users.

Dataset hashes are pinned to the downloaded versions. Evaluated source-file SHA-256: anomaly detector `{code_hashes['anomaly_detector']}`, forecasting module `{code_hashes['forecasting']}`, validation harness `{code_hashes['validation_harness']}`.

## Fraud/anomaly detector

**Protocol.** The input records are ordered by the source Time field. Five forward-chaining folds use the first 50%, 60%, 70%, 80%, and 90% of records for training and the immediately following 10% for testing. The detector's existing threshold is held fixed; labels are not used in training or threshold selection. The public dataset provides two days only, so the current detector remains in phase(s) {fraud['protocol']['detector_phases']}; its mature (8+ unique day) K-means/autoencoder path is not tested. To fit the existing API, Amount and elapsed Time are mapped to amount and date, with all records assigned the same `Other` category. The highly informative anonymized PCA features V1-V28 are intentionally not used because the product detector does not consume them.

| Metric | Result |
|---|---:|
| Out-of-fold transactions | {fraud['dataset']['evaluated_rows']:,} |
| Fraud prevalence in evaluated subset | {fraud['dataset']['evaluated_prevalence_percent']:.4f}% |
| TP / FP / TN / FN | {fm['tp']:,} / {fm['fp']:,} / {fm['tn']:,} / {fm['fn']:,} |
| Accuracy | {fm['accuracy_percent']:.4f}% |
| No-alert accuracy baseline | {fm['no_alert_baseline_accuracy_percent']:.4f}% |
| Precision (Wilson 95% CI) | {fm['precision_percent']:.2f}% ({fm['precision_95ci_percent'][0]:.2f}–{fm['precision_95ci_percent'][1]:.2f}%) |
| Recall (Wilson 95% CI) | {fm['recall_percent']:.2f}% ({fm['recall_95ci_percent'][0]:.2f}–{fm['recall_95ci_percent'][1]:.2f}%) |
| Specificity / false-positive rate | {fm['specificity_percent']:.4f}% / {fm['false_positive_rate_percent']:.4f}% |
| F1 / balanced accuracy / MCC | {fm['f1']:.4f} / {fm['balanced_accuracy_percent']:.4f}% / {fm['mcc']:.4f} |
| ROC-AUC / trapezoidal PR-AUC / average precision | {fm['roc_auc']:.4f} / {fm['pr_auc_trapezoidal']:.4f} / {fm['average_precision']:.4f} |
| Mean detector latency | {fm['mean_inference_latency_ms']:.4f} ms/transaction |

The fold-level counts and protocol are preserved in the JSON output. With severe class imbalance, accuracy is reported only alongside the no-alert baseline, recall, precision, PR-AUC, and confusion matrix. Confidence intervals shown are Wilson binomial intervals; they do not account for dependence between transactions or temporal folds.

The phase-0 score is capped at 1.0, producing tied high scores: {fm['unique_score_count']:,} unique score values were observed and {fm['score_saturated_at_one_percent']:.2f}% of held-out scores saturated at 1. This makes ranking metrics sensitive to ties; the trapezoidal PR area and non-interpolated average precision are both shown and should not be conflated.

## Forecasting module on real retail sales

**Protocol.** Daily net GBP sales are aggregated as Quantity × UnitPrice, retaining negative cancellation/return lines; calendar dates without transactions are zero-filled. An expanding-window, one-day-ahead walk-forward evaluates the final 20% of the daily series. The same FinGear Random Forest forecaster is compared with previous-day and same-weekday-last-week baselines. Its configured salary-day feature remains set to day 1, although payroll is not represented in this retailer dataset. This tests the forecasting implementation on retail revenue, **not personal expenses**.

| Metric | FinGear Random Forest | Previous-day baseline | Weekly seasonal baseline |
|---|---:|---:|---:|
| MAE (GBP/day) | {rfm['mae_gbp']:.2f} | {rm['previous_day_baseline']['mae_gbp']:.2f} | {rm['weekly_seasonal_baseline']['mae_gbp']:.2f} |
| RMSE (GBP/day) | {rfm['rmse_gbp']:.2f} | {rm['previous_day_baseline']['rmse_gbp']:.2f} | {rm['weekly_seasonal_baseline']['rmse_gbp']:.2f} |
| WAPE | {rfm['wape_percent']:.2f}% | {rm['previous_day_baseline']['wape_percent']:.2f}% | {rm['weekly_seasonal_baseline']['wape_percent']:.2f}% |

FinGear MAE skill vs previous-day baseline: {rm['mae_skill_vs_previous_day_percent']:.2f}%; vs weekly baseline: {rm['mae_skill_vs_weekly_baseline_percent']:.2f}%. A negative skill means the model is worse than that baseline.

## Scope limitations and next research steps

- The fraud benchmark has only two days of data and cannot exercise FinGear's mature detector; this evaluation is limited to its cold-start amount-median rule. Its source's V1-V28 PCA features are omitted, so this is not a full-feature state-of-the-art fraud comparison.
- The fraud labels are extremely imbalanced, and the dataset is historical and specific to one anonymized European cardholder sample. Results do not establish current fraud performance, cross-bank generalization, or acceptable financial false-negative cost.
- Online Retail is one retailer's sales history. Its net sales series is only a real-world time-series proxy for the personal-spending forecaster.
- The finance-health and auxiliary output values are deterministic/model outputs, not accuracy measurements. Real, consented, representative financial profiles with independently measured outcomes and an approved protocol are required to validate those modules.
- A publication should report dataset version and hashes, folds, all confusion counts, both threshold-independent and threshold-specific metrics, uncertainty, baseline comparisons, and these domain limits. Avoid describing these results as validation on real user expenses or as deployment readiness.

## Reproduction

From `backend`, install the optional ML dependencies with `pip install -r requirements-ml.txt`, then run `python run_real_data_validation.py`. It downloads the public source files into `validation_results/real_data_cache`, verifies available transfer lengths and expected row counts, then rewrites this report, `real_data_metrics.json`, `final_research_validation_report.txt`, and `accuracy_results.txt`.
"""


def main() -> None:
    fraud_path = CACHE_DIR / "creditcard.parquet"
    retail_path = CACHE_DIR / "online_retail.csv"
    download_in_ranges(FRAUD_PARQUET_URL, fraud_path)
    download_in_ranges(RETAIL_CSV_URL, retail_path)

    fraud_results = evaluate_fraud_dataset(fraud_path)
    retail_results = evaluate_retail_forecasting(retail_path)
    checksums = {"fraud": sha256(fraud_path), "retail": sha256(retail_path)}
    if checksums != EXPECTED_DATA_HASHES:
        raise RuntimeError(
            "Downloaded dataset hashes differ from the pinned research data version: "
            f"{checksums}"
        )
    code_hashes = {
        "anomaly_detector": sha256(BACKEND_DIR / "app" / "ml" / "ai_engine" / "anomaly_detector.py"),
        "forecasting": sha256(BACKEND_DIR / "app" / "ml" / "forecasting.py"),
        "validation_harness": sha256(Path(__file__)),
    }
    results = {
        "generated_at": datetime.now().astimezone().isoformat(),
        "environment": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit_learn": __import__("sklearn").__version__,
        },
        "code_sha256": code_hashes,
        "fraud": fraud_results,
        "retail": retail_results,
        "sources": {
            "fraud_url": "https://www.openml.org/d/1597",
            "retail_url": "https://doi.org/10.24432/C5BW33",
        },
    }
    report = render_report(results, checksums)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "real_data_metrics.json").write_text(
        json.dumps({"checksums_sha256": checksums, **results}, indent=2),
        encoding="utf-8",
    )
    (OUTPUT_DIR / "real_data_research_validation_report.md").write_text(report, encoding="utf-8")
    (OUTPUT_DIR / "final_research_validation_report.txt").write_text(report, encoding="utf-8")
    (BACKEND_DIR / "accuracy_results.txt").write_text(report, encoding="utf-8")
    print(report)
    print(f"\nSaved report: {OUTPUT_DIR / 'real_data_research_validation_report.md'}")
    print(f"Saved combined report: {OUTPUT_DIR / 'final_research_validation_report.txt'}")
    print(f"Saved metrics: {OUTPUT_DIR / 'real_data_metrics.json'}")
    print(f"Updated summary: {BACKEND_DIR / 'accuracy_results.txt'}")


if __name__ == "__main__":
    main()
