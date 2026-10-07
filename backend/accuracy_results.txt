# FinGear Real-Data Validation Report

Generated: 2026-10-04T13:29:14.210518+05:30
Runtime: Python 3.11.9 / Windows-10-10.0.26200-SP0

## Research-use statement

This report evaluates only the existing anomaly detector's cold-start behavior and the existing daily Random Forest forecaster on two cited public datasets. It is a reproducible benchmark, not evidence of production readiness, causal impact, or generalization to other populations. The financial-health scoring, budgeting rules, debt guardrails, investment-return estimator, and goal-feasibility estimator have no independent real-world outcome labels in these datasets and are therefore **not empirically validated here**.

## Sources and data integrity

1. **Credit Card Fraud Detection (Worldline/ULB)**, 284,807 card transactions from September 2013, 492 labeled frauds. OpenML dataset 1597; source describes two days, anonymized PCA inputs V1-V28, Time and Amount. Public listing and citation: Andrea Dal Pozzolo, Olivier Caelen, Reid A. Johnson, Gianluca Bontempi, “Calibrating Probability with Undersampling for Unbalanced Classification,” IEEE CIDM, 2015. [OpenML dataset record](https://www.openml.org/d/1597). SHA-256: `b7efcb35a428bbe22347a05d2437d9177bab07ce61e51214a17bec584ad9496d`.
2. **UCI Online Retail**, 541,909 invoice-line records for one UK online retailer, 2010-12-01 to 2011-12-09. [UCI dataset 352](https://doi.org/10.24432/C5BW33); Chen, Sain & Guo (2012), DOI [10.1057/dbm.2012.17](https://doi.org/10.1057/dbm.2012.17). SHA-256: `a2f79bbdd4463df6db8a3f5a50b9c980ae8f645a370bf5e2c0d6097f9e817b05`.

The first dataset contains real card transactions with fraud labels. The second contains real retail sales and cancellations, not household spending. Neither is a representative sample of FinGear users.

Dataset hashes are pinned to the downloaded versions. Evaluated source-file SHA-256: anomaly detector `73eb96a244049fa35f148fd7a7b1f229f6f17a49d394b6eb14d76995eb59552f`, forecasting module `e41f6a8d14c13931e8e6287e993019514f008c3707b89cb03d70ccbf006213df`, validation harness `82d68bea25a948c7ed1ced690f6e665fc8d754e1308327251a60516ba7eff4b1`.

## Fraud/anomaly detector

**Protocol.** The input records are ordered by the source Time field. Five forward-chaining folds use the first 50%, 60%, 70%, 80%, and 90% of records for training and the immediately following 10% for testing. The detector's existing threshold is held fixed; labels are not used in training or threshold selection. The public dataset provides two days only, so the current detector remains in phase(s) [0]; its mature (8+ unique day) K-means/autoencoder path is not tested. To fit the existing API, Amount and elapsed Time are mapped to amount and date, with all records assigned the same `Other` category. The highly informative anonymized PCA features V1-V28 are intentionally not used because the product detector does not consume them.

| Metric | Result |
|---|---:|
| Out-of-fold transactions | 142,404 |
| Fraud prevalence in evaluated subset | 0.1566% |
| TP / FP / TN / FN | 75 / 37,226 / 104,955 / 148 |
| Accuracy | 73.7550% |
| No-alert accuracy baseline | 99.8434% |
| Precision (Wilson 95% CI) | 0.20% (0.16–0.25%) |
| Recall (Wilson 95% CI) | 33.63% (27.75–40.06%) |
| Specificity / false-positive rate | 73.8179% / 26.1821% |
| F1 / balanced accuracy / MCC | 0.0040 / 53.7251% / 0.0067 |
| ROC-AUC / trapezoidal PR-AUC / average precision | 0.4319 / 0.1694 / 0.0016 |
| Mean detector latency | 0.0253 ms/transaction |

The fold-level counts and protocol are preserved in the JSON output. With severe class imbalance, accuracy is reported only alongside the no-alert baseline, recall, precision, PR-AUC, and confusion matrix. Confidence intervals shown are Wilson binomial intervals; they do not account for dependence between transactions or temporal folds.

The phase-0 score is capped at 1.0, producing tied high scores: 8,834 unique score values were observed and 26.23% of held-out scores saturated at 1. This makes ranking metrics sensitive to ties; the trapezoidal PR area and non-interpolated average precision are both shown and should not be conflated.

## Forecasting module on real retail sales

**Protocol.** Daily net GBP sales are aggregated as Quantity × UnitPrice, retaining negative cancellation/return lines; calendar dates without transactions are zero-filled. An expanding-window, one-day-ahead walk-forward evaluates the final 20% of the daily series. The same FinGear Random Forest forecaster is compared with previous-day and same-weekday-last-week baselines. Its configured salary-day feature remains set to day 1, although payroll is not represented in this retailer dataset. This tests the forecasting implementation on retail revenue, **not personal expenses**.

| Metric | FinGear Random Forest | Previous-day baseline | Weekly seasonal baseline |
|---|---:|---:|---:|
| MAE (GBP/day) | 10412.53 | 21522.67 | 12894.91 |
| RMSE (GBP/day) | 15588.91 | 28158.00 | 18933.45 |
| WAPE | 24.70% | 51.06% | 30.59% |

FinGear MAE skill vs previous-day baseline: 51.62%; vs weekly baseline: 19.25%. A negative skill means the model is worse than that baseline.

## Scope limitations and next research steps

- The fraud benchmark has only two days of data and cannot exercise FinGear's mature detector; this evaluation is limited to its cold-start amount-median rule. Its source's V1-V28 PCA features are omitted, so this is not a full-feature state-of-the-art fraud comparison.
- The fraud labels are extremely imbalanced, and the dataset is historical and specific to one anonymized European cardholder sample. Results do not establish current fraud performance, cross-bank generalization, or acceptable financial false-negative cost.
- Online Retail is one retailer's sales history. Its net sales series is only a real-world time-series proxy for the personal-spending forecaster.
- The finance-health and auxiliary output values are deterministic/model outputs, not accuracy measurements. Real, consented, representative financial profiles with independently measured outcomes and an approved protocol are required to validate those modules.
- A publication should report dataset version and hashes, folds, all confusion counts, both threshold-independent and threshold-specific metrics, uncertainty, baseline comparisons, and these domain limits. Avoid describing these results as validation on real user expenses or as deployment readiness.

## Reproduction

From `backend`, install the optional ML dependencies with `pip install -r requirements-ml.txt`, then run `python run_real_data_validation.py`. It downloads the public source files into `validation_results/real_data_cache`, verifies available transfer lengths and expected row counts, then rewrites this report, `real_data_metrics.json`, `final_research_validation_report.txt`, and `accuracy_results.txt`.
