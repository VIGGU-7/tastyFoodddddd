# Nutrition-grade model

The checked-in artifact is **untrained**. No claimed accuracy or invented training records are included.

With internet access and Python 3.10+:

```sh
python3 -m venv .venv
.venv/bin/pip install -r ml/requirements.txt
.venv/bin/python ml/download.py /path/with-space/openfoodfacts-products.jsonl.gz
.venv/bin/python ml/train.py /path/with-space/openfoodfacts-products.jsonl.gz
```

The full dump is large; use sufficient disk space or supply an existing local JSONL/gzip snapshot. The training script accepts `--max-products` (default 100,000 eligible records). It streams input, retains deduplicated complete products with 2023 A–E labels, and splits brand/category groups 60/20/20. Validation selects depth; the test set is used once for the final report. Fit-only categories prevent vocabulary leakage. No scores, derived score fields, grades, or user outcomes enter the predictors. Grade labels are themselves computed from nutrition, so agreement with them is not independent evidence of health outcomes.

Outputs: `lib/food/model-artifact.json` and `ml/metrics.json`. The JSON trees run in the TypeScript app without a Python service. Offline export parity is checked against scikit-learn. Reports include accuracy, macro F1, baseline, per-grade metrics, confusion matrix, sample counts, a digest of eligible records, seed, and training timestamp. Snapshot selection can be biased; metrics apply only to the held-out products from that snapshot.

Use Open Food Facts attribution and ODbL obligations when distributing source or derived database material. A source nutrition grade takes precedence over a predicted grade. Missing numeric inputs yield no prediction. Predictions are marked estimates and never establish allergy or clinical safety.
