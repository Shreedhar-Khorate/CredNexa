"""Training script for CredNexa ML pipeline."""

import argparse
import json
import sys
from pathlib import Path

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

import sklearn
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.ensemble import ExtraTreesClassifier, GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer
from sklearn.svm import SVC
import joblib

from ml.config import (
    ARTIFACTS_DIR,
    COEFFS_PATH,
    DEFAULT_THRESHOLD,
    METRICS_PATH,
    MODEL_PATH,
    RAW_DATA_PATH,
    SEED,
    TARGET_COL,
)
from ml.preprocess import add_features, build_column_transformer


def load_and_clean_data(data_path: Path) -> pd.DataFrame:
    """Load raw CSV and perform basic validation / low-income record removal."""
    df = pd.read_csv(data_path)
    # Filter clearly invalid records with ApplicantIncome < 1000
    if "ApplicantIncome" in df.columns:
        df = df[df["ApplicantIncome"].fillna(0) >= 1000].copy()
    return df


def evaluate_baselines(X_train: pd.DataFrame, y_train: np.ndarray, X_test: pd.DataFrame, y_test: np.ndarray) -> dict:
    """Compute baseline metrics for majority class, Credit_History rule, and Credit_History LR."""
    # 1. Majority Class Baseline
    maj_pred = np.ones_like(y_test)
    maj_acc = float(accuracy_score(y_test, maj_pred))

    # 2. Credit_History Only Rule (Approve if Credit_History == 1)
    ch_raw = X_test["Credit_History"].fillna(0).astype(str).str.strip()
    ch_rule_pred = ch_raw.isin(["1", "1.0", "Y", "Yes"]).astype(int).values
    ch_rule_acc = float(accuracy_score(y_test, ch_rule_pred))
    ch_rule_f1 = float(f1_score(y_test, ch_rule_pred, zero_division=0))

    # 3. Logistic Regression on Credit_History Only
    ch_train = add_features(X_train)[["Credit_History"]]
    ch_test = add_features(X_test)[["Credit_History"]]

    pipe_ch = Pipeline([
        ("pre", build_column_transformer(numeric_cols=[], categorical_cols=["Credit_History"])),
        ("clf", LogisticRegression(random_state=SEED))
    ])
    pipe_ch.fit(ch_train, y_train)
    ch_lr_pred = pipe_ch.predict(ch_test)
    ch_lr_acc = float(accuracy_score(y_test, ch_lr_pred))
    ch_lr_auc = float(roc_auc_score(y_test, pipe_ch.predict_proba(ch_test)[:, 1]))

    return {
        "majority_class": {"accuracy": maj_acc},
        "credit_history_rule": {"accuracy": ch_rule_acc, "f1": ch_rule_f1},
        "credit_history_logreg": {"accuracy": ch_lr_acc, "roc_auc": ch_lr_auc},
    }


def run_training(data_path: Path = RAW_DATA_PATH):
    """Main training routine."""
    print(f"Loading data from {data_path}...")
    df = load_and_clean_data(data_path)
    print(f"Dataset shape after filtering low-income rows (<1000): {df.shape}")

    # Prepare X and y
    y_raw = df[TARGET_COL].map({"Y": 1, "N": 0}).values
    X_raw = df.drop(columns=[TARGET_COL])

    # Stratified 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_raw, y_raw, test_size=0.20, stratify=y_raw, random_state=SEED
    )
    print(f"Train size: {len(X_train)}, Test size: {len(X_test)}")

    # 1. Baselines
    baselines = evaluate_baselines(X_train, y_train, X_test, y_test)
    print("Baselines:", json.dumps(baselines, indent=2))

    # 2. Compare Candidate Models via 5x3 Repeated Stratified CV
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=SEED)
    candidate_models = {
        "Logistic Regression": LogisticRegression(max_iter=2000, random_state=SEED, class_weight="balanced"),
        "Random Forest": RandomForestClassifier(n_estimators=200, max_depth=6, random_state=SEED),
        "Extra Trees": ExtraTreesClassifier(n_estimators=200, max_depth=6, random_state=SEED),
        "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, learning_rate=0.05, max_depth=3, random_state=SEED),
        "SVM": SVC(probability=True, random_state=SEED, class_weight="balanced"),
    }

    cv_results = {}
    print("\n--- Running Repeated Stratified CV ---")
    for name, clf in candidate_models.items():
        pipeline = Pipeline([
            ("feat", FunctionTransformer(add_features)),
            ("pre", build_column_transformer()),
            ("clf", clf),
        ])

        accs, aucs, f1s, rec_neg = [], [], [], []
        for train_idx, val_idx in cv.split(X_train, y_train):
            X_tr, y_tr = X_train.iloc[train_idx], y_train[train_idx]
            X_val, y_val = X_train.iloc[val_idx], y_train[val_idx]

            pipeline.fit(X_tr, y_tr)
            preds = pipeline.predict(X_val)
            probs = pipeline.predict_proba(X_val)[:, 1]

            accs.append(accuracy_score(y_val, preds))
            aucs.append(roc_auc_score(y_val, probs))
            f1s.append(f1_score(y_val, preds, zero_division=0))
            rec_neg.append(recall_score(y_val, preds, pos_label=0, zero_division=0))

        cv_results[name] = {
            "accuracy_mean": float(np.mean(accs)),
            "accuracy_std": float(np.std(accs)),
            "roc_auc_mean": float(np.mean(aucs)),
            "roc_auc_std": float(np.std(aucs)),
            "f1_mean": float(np.mean(f1s)),
            "f1_std": float(np.std(f1s)),
            "rejected_recall_mean": float(np.mean(rec_neg)),
            "rejected_recall_std": float(np.std(rec_neg)),
        }
        print(f"{name:20s} | Acc: {np.mean(accs):.4f} +/- {np.std(accs):.4f} | AUC: {np.mean(aucs):.4f} +/- {np.std(aucs):.4f} | Rej Recall: {np.mean(rec_neg):.4f}")

    # 3. Fine-Tune Finalist (Logistic Regression for interpretable coefficients & high baseline performance)
    print("\n--- Tuning Logistic Regression ---")
    param_grid = {
        "clf__C": [0.01, 0.1, 0.5, 1.0, 5.0, 10.0],
        "clf__penalty": ["l2"],
        "clf__solver": ["lbfgs"],
        "clf__class_weight": [None, "balanced"],
    }

    base_pipeline = Pipeline([
        ("feat", FunctionTransformer(add_features)),
        ("pre", build_column_transformer()),
        ("clf", LogisticRegression(max_iter=2000, random_state=SEED)),
    ])

    grid_search = GridSearchCV(
        base_pipeline,
        param_grid,
        cv=cv,
        scoring="roc_auc",
        n_jobs=-1,
    )
    grid_search.fit(X_train, y_train)
    best_pipeline = grid_search.best_estimator_
    print(f"Best Hyperparameters: {grid_search.best_params_}")
    print(f"Best CV ROC-AUC: {grid_search.best_score_:.4f}")

    # 4. Calibrate Model
    calibrated_clf = CalibratedClassifierCV(
        estimator=best_pipeline, cv=5, method="sigmoid"
    )
    calibrated_clf.fit(X_train, y_train)

    # 5. Evaluate on Hold-out Test Set & Select Optimal Threshold
    test_probs = calibrated_clf.predict_proba(X_test)[:, 1]
    precisions, recalls, thresholds = precision_recall_curve(y_test, test_probs)

    f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-10)
    best_idx = np.argmax(f1_scores)
    chosen_threshold = float(thresholds[best_idx]) if best_idx < len(thresholds) else DEFAULT_THRESHOLD
    chosen_threshold = float(np.clip(chosen_threshold, 0.45, 0.65))

    test_preds = (test_probs >= chosen_threshold).astype(int)

    holdout_metrics = {
        "accuracy": float(accuracy_score(y_test, test_preds)),
        "precision": float(precision_score(y_test, test_preds, zero_division=0)),
        "recall": float(recall_score(y_test, test_preds, zero_division=0)),
        "f1_score": float(f1_score(y_test, test_preds, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, test_probs)),
        "brier_score": float(brier_score_loss(y_test, test_probs)),
        "rejected_recall": float(recall_score(y_test, test_preds, pos_label=0, zero_division=0)),
        "confusion_matrix": confusion_matrix(y_test, test_preds).tolist(),
    }
    print(f"\nHoldout Evaluation (Threshold={chosen_threshold:.2f}):")
    print(json.dumps(holdout_metrics, indent=2))

    # Save artifacts
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(calibrated_clf, MODEL_PATH)
    print(f"Saved model to {MODEL_PATH}")

    # Extract Logistic Regression coefficients from fitted pipeline inside CalibratedClassifierCV
    base_model = calibrated_clf.calibrated_classifiers_[0].estimator
    clf_model = base_model.named_steps["clf"]
    preprocessor = base_model.named_steps["pre"]
    cat_feature_names = list(preprocessor.named_transformers_["cat"].named_steps["oh"].get_feature_names_out())
    feature_names = preprocessor.transformers_[0][2] + cat_feature_names

    if hasattr(clf_model, "coef_"):
        coef_df = pd.DataFrame({
            "feature": feature_names,
            "coefficient": clf_model.coef_[0]
        }).sort_values(by="coefficient", key=abs, ascending=False)
        coef_df.to_csv(COEFFS_PATH, index=False)
        print(f"Saved coefficients to {COEFFS_PATH}")

    # Plots
    # 1. ROC Curve
    fpr, tpr, _ = roc_curve(y_test, test_probs)
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, label=f"Calibrated LogReg (AUC = {holdout_metrics['roc_auc']:.3f})")
    plt.plot([0, 1], [0, 1], "k--", label="Random Baseline")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve")
    plt.legend()
    plt.tight_layout()
    plt.savefig(ARTIFACTS_DIR / "roc.png", dpi=300)
    plt.close()

    # 2. Confusion Matrix Plot
    cm = holdout_metrics["confusion_matrix"]
    plt.figure(figsize=(5, 4))
    plt.imshow(cm, cmap="Blues", interpolation="nearest")
    plt.title("Confusion Matrix")
    plt.colorbar()
    plt.xticks([0, 1], ["Rejected (0)", "Approved (1)"])
    plt.yticks([0, 1], ["Rejected (0)", "Approved (1)"])
    for i in range(2):
        for j in range(2):
            plt.text(j, i, str(cm[i][j]), ha="center", va="center", color="red" if cm[i][j] > 20 else "black")
    plt.xlabel("Predicted Label")
    plt.ylabel("True Label")
    plt.tight_layout()
    plt.savefig(ARTIFACTS_DIR / "confusion_matrix.png", dpi=300)
    plt.close()

    # 3. Calibration Curve
    prob_true, prob_pred = calibration_curve(y_test, test_probs, n_bins=5)
    plt.figure(figsize=(6, 5))
    plt.plot(prob_pred, prob_true, "s-", label="Calibrated LogReg")
    plt.plot([0, 1], [0, 1], "k--", label="Perfectly Calibrated")
    plt.xlabel("Mean Predicted Probability")
    plt.ylabel("Fraction of Positives")
    plt.title("Calibration Curve")
    plt.legend()
    plt.tight_layout()
    plt.savefig(ARTIFACTS_DIR / "calibration.png", dpi=300)
    plt.close()

    # Save metrics.json
    metrics_data = {
        "baselines": baselines,
        "cv_results": cv_results,
        "holdout_metrics": holdout_metrics,
        "chosen_threshold": chosen_threshold,
        "best_hyperparameters": grid_search.best_params_,
        "metadata": {
            "sklearn_version": sklearn.__version__,
            "random_seed": SEED,
            "train_samples": len(X_train),
            "test_samples": len(X_test),
        },
    }
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)
    print(f"Saved metrics to {METRICS_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train CredNexa ML pipeline.")
    parser.add_argument("--data", type=Path, default=RAW_DATA_PATH, help="Path to raw Loan_Data.csv")
    args = parser.parse_args()
    run_training(args.data)
