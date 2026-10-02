"""Training script for CredNexa ML pipeline."""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

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
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer
from sklearn.svm import SVC
import joblib

from ml.config import (
    ARTIFACTS_DIR,
    CATEGORICAL_FEATURES,
    COEFFS_PATH,
    DEFAULT_THRESHOLD,
    HISTORICAL_SEED_PATH,
    METRICS_PATH,
    MODEL_PATH,
    NUMERIC_FEATURES,
    RAW_DATA_PATH,
    SEED,
    TARGET_COL,
    TEST_DATA_PATH,
    TRAIN_DATA_PATH,
)
from ml.preprocess import add_features, build_column_transformer


def load_and_clean_data(data_path: Path) -> pd.DataFrame:
    """Load raw CSV and perform basic validation / low-income record removal."""
    df = pd.read_csv(data_path)
    if "ApplicantIncome" in df.columns:
        df = df[df["ApplicantIncome"].fillna(0) >= 1000].copy()
    return df


def evaluate_model_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_prob: Optional[np.ndarray] = None) -> dict:
    """Compute comprehensive evaluation metrics dictionary."""
    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    rec_neg = float(recall_score(y_true, y_pred, pos_label=0, zero_division=0))

    auc = float(roc_auc_score(y_true, y_prob)) if y_prob is not None else None
    brier = float(brier_score_loss(y_true, y_prob)) if y_prob is not None else None

    return {
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1_score": f1,
        "rejected_recall": rec_neg,
        "roc_auc": auc,
        "brier_score": brier,
    }


def run_training(data_path: Path = RAW_DATA_PATH):
    """Main training routine."""
    print(f"Loading data from {data_path}...")
    df = load_and_clean_data(data_path)
    print(f"Dataset shape after filtering low-income rows (<1000): {df.shape}")

    # Save historical seed dataset copy
    HISTORICAL_SEED_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(HISTORICAL_SEED_PATH, index=False)

    # Prepare X and y
    y_raw = df[TARGET_COL].map({"Y": 1, "N": 0}).values
    X_raw = df.drop(columns=[TARGET_COL])

    # Stratified 80/20 train/test split BEFORE any feature transformations
    X_train, X_test, y_train, y_test = train_test_split(
        X_raw, y_raw, test_size=0.20, stratify=y_raw, random_state=SEED
    )
    print(f"Train size: {len(X_train)}, Test size: {len(X_test)}")

    # Save train and test split files under data/
    df.loc[X_train.index].to_csv(TRAIN_DATA_PATH, index=False)
    df.loc[X_test.index].to_csv(TEST_DATA_PATH, index=False)
    print(f"Saved train split to {TRAIN_DATA_PATH} and test split to {TEST_DATA_PATH}")

    # CV splitter (5-fold stratified with seed 42)
    cv_5fold = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)

    # Define Candidate Models & Pipelines
    candidate_models = {
        "Majority Baseline": None,
        "Credit_History Rule": None,
        "Credit_History LogReg": Pipeline([
            ("pre", build_column_transformer(numeric_cols=[], categorical_cols=["Credit_History"])),
            ("clf", LogisticRegression(random_state=SEED))
        ]),
        "Logistic Regression (Tuned C=0.1)": Pipeline([
            ("feat", FunctionTransformer(add_features)),
            ("pre", build_column_transformer()),
            ("clf", LogisticRegression(C=0.1, max_iter=2000, random_state=SEED)),
        ]),
        "Random Forest": Pipeline([
            ("feat", FunctionTransformer(add_features)),
            ("pre", build_column_transformer()),
            ("clf", RandomForestClassifier(n_estimators=200, max_depth=6, random_state=SEED)),
        ]),
        "Extra Trees": Pipeline([
            ("feat", FunctionTransformer(add_features)),
            ("pre", build_column_transformer()),
            ("clf", ExtraTreesClassifier(n_estimators=200, max_depth=6, random_state=SEED)),
        ]),
        "Gradient Boosting": Pipeline([
            ("feat", FunctionTransformer(add_features)),
            ("pre", build_column_transformer()),
            ("clf", GradientBoostingClassifier(n_estimators=100, learning_rate=0.05, max_depth=3, random_state=SEED)),
        ]),
        "SVM": Pipeline([
            ("feat", FunctionTransformer(add_features)),
            ("pre", build_column_transformer()),
            ("clf", SVC(probability=True, random_state=SEED)),
        ]),
    }

    # Unified Evaluation Table: CV (on Train) and Holdout (on Test) for ALL models
    unified_results = {}
    print("\n--- Unified Evaluation: Out-of-Fold CV (Train) & Holdout (Test) ---")

    for name, pipe in candidate_models.items():
        if name == "Majority Baseline":
            oof_preds = np.ones_like(y_train)
            oof_probs = np.ones(len(y_train), dtype=float)
            test_preds = np.ones_like(y_test)
            test_probs = np.ones(len(y_test), dtype=float)

        elif name == "Credit_History Rule":
            ch_train_raw = X_train["Credit_History"].fillna(0).astype(str).str.strip()
            oof_preds = ch_train_raw.isin(["1", "1.0", "Y", "Yes"]).astype(int).values
            oof_probs = oof_preds.astype(float)

            ch_test_raw = X_test["Credit_History"].fillna(0).astype(str).str.strip()
            test_preds = ch_test_raw.isin(["1", "1.0", "Y", "Yes"]).astype(int).values
            test_probs = test_preds.astype(float)

        else:
            if name == "Credit_History LogReg":
                X_tr_in = add_features(X_train)[["Credit_History"]]
                X_te_in = add_features(X_test)[["Credit_History"]]
            else:
                X_tr_in = X_train
                X_te_in = X_test

            oof_probs = cross_val_predict(pipe, X_tr_in, y_train, cv=cv_5fold, method="predict_proba")[:, 1]
            oof_preds = (oof_probs >= 0.5).astype(int)

            pipe.fit(X_tr_in, y_train)
            test_probs = pipe.predict_proba(X_te_in)[:, 1]
            test_preds = pipe.predict(X_te_in)

        # Calculate metrics
        cv_metrics = evaluate_model_metrics(y_train, oof_preds, oof_probs)
        holdout_metrics = evaluate_model_metrics(y_test, test_preds, test_probs)

        # Calculate CV accuracy std across 5 folds
        if pipe is not None:
            acc_list = []
            for tr_idx, val_idx in cv_5fold.split(X_train, y_train):
                if name == "Credit_History LogReg":
                    X_tr_f, y_tr_f = X_tr_in.iloc[tr_idx], y_train[tr_idx]
                    X_val_f, y_val_f = X_tr_in.iloc[val_idx], y_train[val_idx]
                else:
                    X_tr_f, y_tr_f = X_train.iloc[tr_idx], y_train[tr_idx]
                    X_val_f, y_val_f = X_train.iloc[val_idx], y_train[val_idx]
                pipe.fit(X_tr_f, y_tr_f)
                acc_list.append(accuracy_score(y_val_f, pipe.predict(X_val_f)))
            acc_std = float(np.std(acc_list))
        else:
            acc_std = 0.0

        cv_metrics["accuracy_std"] = acc_std

        unified_results[name] = {
            "cv_train_oof": cv_metrics,
            "holdout_test": holdout_metrics,
        }

        auc_str = f"{cv_metrics['roc_auc']:.4f}" if cv_metrics['roc_auc'] is not None else "N/A"
        print(f"{name:34s} | CV Acc: {cv_metrics['accuracy']:.4f} ± {acc_std:.4f} | CV AUC: {auc_str} | Holdout Acc: {holdout_metrics['accuracy']:.4f} | Holdout AUC: {holdout_metrics['roc_auc'] if holdout_metrics['roc_auc'] else 'N/A'}")

    # =========================================================================
    # THRESHOLD SELECTION FROM CALIBRATED TRAIN OOF PREDICTIONS ONLY
    # =========================================================================
    tuned_logreg_pipe = candidate_models["Logistic Regression (Tuned C=0.1)"]
    calibrated_clf = CalibratedClassifierCV(estimator=tuned_logreg_pipe, cv=5, method="sigmoid")
    
    # 1. Compute out-of-fold probabilities on TRAIN set from the CALIBRATED pipeline
    oof_calibrated_probs = cross_val_predict(calibrated_clf, X_train, y_train, cv=cv_5fold, method="predict_proba")[:, 1]

    # 2. Pick threshold maximizing F1 on train OOF calibrated probabilities (no clipping)
    precisions_tr, recalls_tr, thresholds_tr = precision_recall_curve(y_train, oof_calibrated_probs)
    f1_scores_tr = 2 * (precisions_tr * recalls_tr) / (precisions_tr + recalls_tr + 1e-10)
    best_tr_idx = np.argmax(f1_scores_tr)
    chosen_threshold = float(thresholds_tr[best_tr_idx]) if best_tr_idx < len(thresholds_tr) else DEFAULT_THRESHOLD
    print(f"\n[THRESHOLD SELECTION] Chosen threshold from Calibrated TRAIN Out-Of-Fold predictions: {chosen_threshold:.6f}")
    # =========================================================================

    # Fit calibrated classifier on full training set
    calibrated_clf.fit(X_train, y_train)

    # Evaluate final calibrated model on Holdout using the TRAIN-derived threshold
    final_test_probs = calibrated_clf.predict_proba(X_test)[:, 1]
    final_test_preds = (final_test_probs >= chosen_threshold).astype(int)

    final_holdout_metrics = evaluate_model_metrics(y_test, final_test_preds, final_test_probs)
    final_holdout_metrics["confusion_matrix"] = confusion_matrix(y_test, final_test_preds).tolist()

    print(f"\nFinal Calibrated Model Holdout Evaluation (Threshold = {chosen_threshold:.4f}):")
    print(json.dumps(final_holdout_metrics, indent=2))

    # Save artifacts
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(calibrated_clf, MODEL_PATH)
    print(f"Saved model artifact to {MODEL_PATH}")

    # Extract Logistic Regression coefficients
    base_model = calibrated_clf.calibrated_classifiers_[0].estimator
    clf_model = base_model.named_steps["clf"]
    preprocessor = base_model.named_steps["pre"]
    cat_feature_names = list(preprocessor.named_transformers_["cat"].named_steps["oh"].get_feature_names_out(CATEGORICAL_FEATURES))
    feature_names = NUMERIC_FEATURES + cat_feature_names

    if hasattr(clf_model, "coef_"):
        coef_df = pd.DataFrame({
            "feature": feature_names,
            "coefficient": clf_model.coef_[0]
        }).sort_values(by="coefficient", key=abs, ascending=False)
        coef_df.to_csv(COEFFS_PATH, index=False)
        print(f"Saved coefficients to {COEFFS_PATH}")

    # Plots
    fpr, tpr, _ = roc_curve(y_test, final_test_probs)
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, label=f"Calibrated LogReg (AUC = {final_holdout_metrics['roc_auc']:.3f})")
    plt.plot([0, 1], [0, 1], "k--", label="Random Baseline")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve")
    plt.legend()
    plt.tight_layout()
    plt.savefig(ARTIFACTS_DIR / "roc.png", dpi=300)
    plt.close()

    cm = final_holdout_metrics["confusion_matrix"]
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

    prob_true, prob_pred = calibration_curve(y_test, final_test_probs, n_bins=5)
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
        "unified_model_comparison": unified_results,
        "final_calibrated_holdout": final_holdout_metrics,
        "chosen_threshold": chosen_threshold,
        "threshold_selection_source": "Train Out-Of-Fold predictions (StratifiedKFold cv=5)",
        "model_choice_rationale": "Logistic Regression chosen for baseline parity, linear feature explainability, smooth probability calibration, and robust cross-validation accuracy.",
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
