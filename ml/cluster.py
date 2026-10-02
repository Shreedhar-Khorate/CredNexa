"""Clustering module for CredNexa ML pipeline."""

import json
import sys
from pathlib import Path
from typing import Dict, Tuple

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.pipeline import Pipeline
import joblib

from ml.config import (
    CLUSTER_FEATURES,
    CLUSTER_PATH,
    RAW_DATA_PATH,
    SEED,
)
from ml.preprocess import add_features, build_column_transformer


class CredNexaClusterer:
    """Clusterer for segmenting applicants based on financial profiles."""

    def __init__(self, n_clusters: int = 2):
        self.n_clusters = n_clusters
        self.pipeline = None
        self.segment_names: Dict[int, str] = {}

    def fit(self, df_raw: pd.DataFrame) -> "CredNexaClusterer":
        """Fit KMeans clustering pipeline on raw DataFrame."""
        df_feat = add_features(df_raw)
        
        preprocessor = build_column_transformer(
            numeric_cols=CLUSTER_FEATURES,
            categorical_cols=[]
        )

        kmeans = KMeans(n_clusters=self.n_clusters, random_state=SEED, n_init=10)
        self.pipeline = Pipeline([
            ("pre", preprocessor),
            ("kmeans", kmeans),
        ])

        self.pipeline.fit(df_feat)
        
        # Name segments based on centroid characteristics
        X_trans = self.pipeline.named_steps["pre"].transform(df_feat)
        centers = self.pipeline.named_steps["kmeans"].cluster_centers_

        for cid in range(self.n_clusters):
            # Centroid summary (0: Log_ApplicantIncome, 1: Log_LoanAmount, 2: LoanToIncome, 3: EMI)
            inc_z = centers[cid, 0]
            loan_z = centers[cid, 1]
            if inc_z > 0.3:
                inc_desc = "High Income"
            elif inc_z < -0.3:
                inc_desc = "Lower Income"
            else:
                inc_desc = "Moderate Income"

            if loan_z > 0.3:
                burden_desc = "High Loan Size"
            else:
                burden_desc = "Standard Loan Size"

            self.segment_names[cid] = f"{inc_desc}, {burden_desc}"

        return self

    def predict(self, df_raw: pd.DataFrame) -> Tuple[np.ndarray, list]:
        """Predict cluster labels and return segment names for raw input DataFrame."""
        if self.pipeline is None:
            raise RuntimeError("Clusterer has not been fitted.")
        df_feat = add_features(df_raw)
        cluster_ids = self.pipeline.predict(df_feat)
        names = [self.segment_names.get(int(cid), f"Segment {cid}") for cid in cluster_ids]
        return cluster_ids, names


def select_optimal_k_and_train(data_path: Path = RAW_DATA_PATH) -> dict:
    """Evaluate silhouette scores for k=2..8 and train best KMeans model."""
    df_raw = pd.read_csv(data_path)
    if "ApplicantIncome" in df_raw.columns:
        df_raw = df_raw[df_raw["ApplicantIncome"].fillna(0) >= 1000].copy()

    df_feat = add_features(df_raw)
    preprocessor = build_column_transformer(
        numeric_cols=CLUSTER_FEATURES,
        categorical_cols=[]
    )
    X_trans = preprocessor.fit_transform(df_feat)

    silhouette_scores = {}
    best_k = 2
    best_score = -1.0

    print("\n--- Evaluating K-Means Silhouette Scores (k=2..8) ---")
    for k in range(2, 9):
        kmeans = KMeans(n_clusters=k, random_state=SEED, n_init=10)
        labels = kmeans.fit_predict(X_trans)
        score = silhouette_score(X_trans, labels)
        silhouette_scores[k] = float(score)
        print(f"k={k}: Silhouette Score = {score:.4f}")
        if score > best_score:
            best_score = score
            best_k = k

    print(f"Selected Optimal k = {best_k} (Silhouette = {best_score:.4f})")

    clusterer = CredNexaClusterer(n_clusters=best_k)
    clusterer.fit(df_raw)

    # Save cluster artifact
    CLUSTER_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(clusterer, CLUSTER_PATH)
    print(f"Saved clusterer to {CLUSTER_PATH}")

    return {
        "silhouette_scores": silhouette_scores,
        "selected_k": best_k,
        "segment_names": clusterer.segment_names,
    }


if __name__ == "__main__":
    select_optimal_k_and_train()
