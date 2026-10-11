# Nutrition-grade model

The checked-in artifact is a trained preliminary random forest. Accuracy: **75.0%** on 156 held-out products; macro F1: **0.640**; majority baseline: **46.8%**. The frozen sample contains 1,479 real products (938 training, 385 validation, 156 test). Grade B F1 is only 0.261 with 11 test products. The sample comes from a truncated prefix of the official dump and is not representative. `snapshot.json` records source, extraction, hashes, and selection limits; `metrics.json` records the complete evaluation. The training sample itself is ignored by Git.

To train a new artifact, use internet access and Python 3.10–3.13 (the pinned scientific libraries were validated with Python 3.12):

```sh
python3 -m venv .venv
.venv/bin/pip install -r ml/requirements.txt
.venv/bin/python ml/download.py /path/with-space/openfoodfacts-products.jsonl.gz
.venv/bin/python ml/train.py /path/with-space/openfoodfacts-products.jsonl.gz
```

The full dump is large; use sufficient disk space or supply an existing local JSONL/gzip snapshot. The training script accepts `--max-products` (default 100,000 eligible records). It streams input, retains deduplicated complete products with 2023 A–E labels, and splits brand/category groups 60/20/20. Validation selects depth; the test set is used once for the final report. Fit-only categories prevent vocabulary leakage. No scores, derived score fields, grades, or user outcomes enter the predictors. Grade labels are themselves computed from nutrition, so agreement with them is not independent evidence of health outcomes.

For a partial gzip download, `python ml/extract_prefix.py /path/to/prefix.gz ml/data/training-sample.jsonl` extracts complete records and writes provenance; then train on that JSONL. Do not compare results as though a prefix were a random population sample.

Outputs: `src/features/nutrition/domain/model-artifact.json`, `ml/metrics.json`, and `ml/parity-fixtures.json`. The JSON trees run in the TypeScript app without a Python service. Offline export parity is checked against scikit-learn. Reports include accuracy, macro F1, baseline, per-grade metrics, confusion matrix, sample counts, a digest of eligible records, seed, and training timestamp. Snapshot selection can be biased; metrics apply only to the held-out products from that snapshot.

Use Open Food Facts attribution and ODbL obligations when distributing source or derived database material. A source nutrition grade takes precedence over a predicted grade. Missing numeric inputs yield no prediction. Predictions are marked estimates and never establish allergy or clinical safety.
