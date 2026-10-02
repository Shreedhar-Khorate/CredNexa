# Loan Eligibility Prediction: Issues, Evidence and Required Fixes

**Purpose of this document.** This is a complete specification for an LLM (or developer) to understand the current state of a student ML project, every known defect in it, and exactly how to fix each one. The end goal is to turn the notebooks into a production-style ML module that a Flask/FastAPI website (users, admin, dashboard, dark/light theme, database) can load and call.

**How to use this document.** Read Sections 1-3 for context. Section 4 is the issue register (each issue has an ID, evidence, impact, fix and acceptance test). Section 5 is the target architecture. Section 6 is the build order. Section 7 has reference numbers to verify your work against. Do not skip the "Acceptance test" lines; they define "done".

---

## 1. Project context

- **Task:** binary classification. Predict whether a home-loan application is **Approved (Y)** or **Rejected (N)**.
- **Domain:** banking/finance. A fictional "Dream Housing Finance" company with Urban / Semiurban / Rural customers.
- **Dataset:** Kaggle `devzohaib/eligibility-prediction-for-loan` (CC0). File `Loan_Data.csv`, 614 rows x 13 columns.
- **Authors:** Bhushan Avhad (25101B2006), Shreedhar Khorate (25101B2007). Academic coursework (Data Warehousing and Mining labs).
- **Environment so far:** Google Colab notebooks reading from `/content/drive/MyDrive/Loan/`.
- **What the label means:** `Loan_Status` is the company's *historical approval decision*, not a default/repayment outcome. A model trained on it predicts "would the company have approved this", not "will this person repay".

### 1.1 Raw schema (`Loan_Data.csv`)

| Column | Type | Notes |
|---|---|---|
| Loan_ID | string | unique id, no predictive value |
| Gender | Male/Female | 13 missing. **Sensitive attribute** |
| Married | Yes/No | 3 missing |
| Dependents | 0/1/2/3+ | 15 missing |
| Education | Graduate/Not Graduate | complete |
| Self_Employed | Yes/No | 32 missing |
| ApplicantIncome | int, INR/month | min 150, max 81000, heavy right skew |
| CoapplicantIncome | float, INR/month | many zeros |
| LoanAmount | float, **INR thousands** | 22 missing, min 9, max 700 |
| Loan_Amount_Term | float, months | 14 missing; 360 appears in 509 of 609 rows |
| Credit_History | 1.0/0.0 | **50 missing (8.1%)**; the dominant predictor |
| Property_Area | Urban/Semiurban/Rural | complete |
| Loan_Status | Y/N | target; 68.7% Y in raw data |

### 1.2 Files uploaded and their roles

| File | Role |
|---|---|
| `Loan_Data.csv` | Raw input (614 x 13) |
| `Loan_Data_Cleaned.csv` | Output of preprocessing: imputed, outliers removed, 8 engineered features, human-readable (529 x 21) |
| `Loan_Data_Preprocessed.csv` | Encoded + StandardScaled model input (529 x 22, no Loan_ID) |
| `Loan.ipynb` | Preprocessing pipeline + Decision Tree only (older version) |
| `DWMLoan.ipynb` | Same pipeline + Naive Bayes + 8-model comparison + KNN decision-boundary plot |
| `DWMLoanKmeansCluster.ipynb` | Same as above + KNN PCA plot + K-Means (k=2) |
| `Agglomerative_Clustering.ipynb` | Ward hierarchical clustering on 8 financial features (Lab 8) |
| `LOANEXP6.ipynb` | Logistic Regression study (accuracy, coefficients) |
| `Loan_EDA.ipynb` | Comparative EDA with 10 written "insights" |

### 1.3 What the notebooks currently do (pipeline as implemented)

1. Remove rows with `ApplicantIncome < 1000` -> 609 rows (5 removed).
2. Impute: mode for Gender/Married/Dependents/Self_Employed/Credit_History/Loan_Amount_Term; median (128) for LoanAmount.
3. IQR outlier removal on ApplicantIncome, CoapplicantIncome, LoanAmount -> **529 rows (80 removed)**.
4. Feature engineering: `TotalIncome`, `Log_ApplicantIncome`, `Log_CoapplicantIncome`, `Log_LoanAmount`, `Log_TotalIncome` (all `log1p`), `EMI = LoanAmount / Loan_Amount_Term`, `LoanToIncome = LoanAmount / (TotalIncome + 1)`, `BalanceIncome = TotalIncome - EMI*1000`.
5. Encode: label-encode Gender/Married/Education/Self_Employed/Loan_Status; ordinal Dependents (0-3); one-hot Property_Area.
6. StandardScaler on 12 continuous columns. Drop Loan_ID. Save the two CSVs.
7. Split 80/20 stratified (random_state=42): train 423 / test 106. Evaluate models on the 106-row test set.

### 1.4 Current reported results (106-row test set)

| Model | Accuracy | Precision | Recall | F1 |
|---|---|---|---|---|
| Logistic Regression | 0.858 | 0.855 | 0.959 | 0.904 |
| Extra Trees | 0.858 | 0.847 | 0.973 | 0.906 |
| Random Forest | 0.830 | 0.850 | 0.919 | 0.883 |
| SVM (RBF) | 0.830 | 0.826 | 0.959 | 0.888 |
| Hist Gradient Boosting | 0.821 | 0.857 | 0.892 | 0.874 |
| Decision Tree | 0.802 | 0.827 | 0.905 | 0.865 |
| Gradient Boosting | 0.802 | 0.835 | 0.892 | 0.863 |
| Naive Bayes | 0.811 | n/a | n/a | n/a (class-0 recall 0.62) |
| KNN (k=7, distance) | 0.726 | 0.747 | 0.919 | 0.824 (class-0 recall 0.28) |

Clustering: K-Means k=2 gives Adjusted Rand Index vs Loan_Status = -0.006 and silhouette 0.245. Agglomerative k=2 gives clusters of 397 and 132 rows with approval rates 66.5% and 78.0%.

---

## 2. Executive summary of the problems

1. **Data leakage:** imputation, outlier removal and scaling use the *whole* dataset before the train/test split, so reported accuracy is optimistic.
2. **Nothing is deployable:** there is no saved model, scaler or encoder; the pipeline lives only in notebooks with Colab paths.
3. **Outlier removal deletes 13% of real applicants** and cannot be applied to new applicants at inference time.
4. **Credit_History is imputed with 1.0**, which hides a real signal (missing-credit applicants were mostly approved).
5. **Redundant, collinear features** (raw + log twins) make the logistic coefficients contradictory and the model un-explainable.
6. **A one-rule baseline is almost as good as every model.** Under leakage-free cross-validation the models score about 81%, equal to "approve iff Credit_History == 1" (about 81-82%). The notebooks never report this baseline.
7. **Evaluation is statistically weak:** a single 106-row test split, no cross-validation, no ROC-AUC, no calibration, and differences of 1-3 test rows are presented as model rankings.
8. **Weak minority-class performance:** the "Rejected" class has low recall; the 0.5 threshold is never tuned.
9. **Several written claims in the EDA notebook and markdown contradict the actual data/outputs.**
10. **Clustering is not validated** and the Agglomerative model cannot score new applicants.
11. **A sensitive attribute (Gender) is used as a predictor** with no fairness analysis.
12. **EMI ignores interest**, so `EMI` and `BalanceIncome` are not real repayment figures.

---

## 3. Severity scale

- **P0:** wrong results or blocks deployment. Fix first.
- **P1:** materially weakens correctness, explainability or credibility.
- **P2:** polish, hygiene, documentation.

---

## 4. Issue register

Each entry: **Evidence** (where/what), **Impact**, **Fix**, **Acceptance test**.

### 4.1 Data and preprocessing

#### DATA-01 (P0): Data leakage from preprocessing before the split
- **Evidence:** In `Loan.ipynb` / `DWMLoan.ipynb`, sections 5 (imputation: mode/median computed on all rows), 6 (IQR fences computed on all rows) and 9 (`StandardScaler.fit_transform` on all rows) all run *before* Section 12's `train_test_split`. `Loan_Data_Preprocessed.csv` is therefore already contaminated.
- **Impact:** test-set statistics influence training transformations; reported metrics are optimistic; the saved CSV cannot be used for honest evaluation.
- **Fix:** start from raw `Loan_Data.csv`. Order of operations must be: drop Loan_ID -> drop clearly invalid rows (income < 1000) -> **train/test split (80/20, stratify, random_state=42)** -> fit imputers/encoders/scaler **on the training set only** inside an sklearn `Pipeline` -> transform test with the fitted objects. Prefer doing all fitting inside cross-validation folds via a single `Pipeline`.
- **Acceptance test:** no transformer is fit on data containing test rows (verify by inspecting that `.fit` is only ever called on `X_train` or inside `cross_validate`). The `Pipeline` accepts a raw DataFrame and returns probabilities.

#### DATA-02 (P0): Preprocessing is not packaged or reproducible
- **Evidence:** the scaler (`scaler`), encoder mappings, imputation values (median LoanAmount = 128, mode Gender = Male, etc.) exist only as notebook variables. Nothing is saved with `joblib`/`pickle`. Paths are hard-coded to `/content/drive/MyDrive/Loan/`.
- **Impact:** a website cannot transform a new applicant the same way training did; the CSV outputs cannot be inverted.
- **Fix:** move all steps to `ml/preprocess.py` and `ml/train.py`; build a single `sklearn.pipeline.Pipeline` containing a `ColumnTransformer` + classifier; persist with `joblib.dump`. Use relative paths and a CLI argument for the data path.
- **Acceptance test:** `joblib.load("artifacts/model.joblib").predict_proba(pd.DataFrame([raw_dict]))` works on a raw (unscaled, unencoded) single-row DataFrame in a fresh Python process.

#### DATA-03 (P0): IQR outlier removal deletes 80 real applicants and cannot work at inference
- **Evidence:** Section 6 drops 80 of 609 rows (13.1%): ApplicantIncome 50 outliers, CoapplicantIncome 19, LoanAmount 40 (overlapping). Max ApplicantIncome falls from 81000 to 10139.
- **Impact:** the model never sees high-income or large-loan applicants, so it extrapolates blindly on them; a live website cannot "delete" a user who earns a lot; test-set rows were also removed with global fences (see DATA-01).
- **Fix:** do not drop rows. Instead (a) rely on `log1p` features, and/or (b) **winsorise/clip** continuous inputs to training-set percentile bounds (e.g. 1st-99th) as a transformer step inside the pipeline (`FunctionTransformer` or custom `Clipper` fit on train only). At inference, clip incoming values to those bounds rather than rejecting.
- **Acceptance test:** training uses about 609 rows (only the invalid <1000-income rows removed); inference on income = 500000 does not crash and returns a valid probability.

#### DATA-04 (P0): Missing `Credit_History` imputed with 1.0 hides signal
- **Evidence:** raw data: 50 missing Credit_History; of those, **37 are Approved and 13 Rejected** (74% approved). Mode imputation (1.0) forces them all into the "good credit" bucket.
- **Impact:** noise injected into the strongest feature; the website will have no honest way to handle "I don't know my credit history".
- **Fix:** encode Credit_History as a 3-level categorical: `1`, `0`, `Unknown`, one-hot encoded. Apply the same "Unknown" strategy (or train-fit mode) to Self_Employed, Dependents and Married via the pipeline's categorical imputer. Expose "Unknown" as an option on the web form.
- **Acceptance test:** pipeline accepts `Credit_History = None`/`"Unknown"`; the learned "Unknown" coefficient is reported on the admin model page.

#### DATA-05 (P1): Documentation of the low-income removal is wrong
- **Evidence:** markdown in Section 3e and the pipeline diagram say **3 records** removed (LP001722, LP002502, LP002949) and "611 rows" after step 1 and "approx 553 rows" after outlier removal. The saved outputs show **5 records** removed (also LP001644 at 674 and LP002603 at 645), **609 rows** after step 1 and **529** after outliers.
- **Impact:** report/viva inconsistency; credibility.
- **Fix:** update markdown to match outputs (or better, generate these numbers programmatically in the text cells). Re-evaluate whether a hard threshold of 1000 is justified; document that all 5 rows have a large co-applicant income, so "applicant income" may be mis-entered. Optionally keep these rows and rely on `TotalIncome`.
- **Acceptance test:** every count quoted in markdown equals the printed output.

#### DATA-06 (P1): Redundant and collinear feature set (21 features)
- **Evidence:** correlations (cleaned data): ApplicantIncome vs Log_ApplicantIncome 0.96; CoapplicantIncome vs Log_CoapplicantIncome 0.87; LoanAmount vs Log_LoanAmount 0.94; TotalIncome vs Log_TotalIncome 0.97; BalanceIncome vs TotalIncome 0.97. `Property_Area_*` three one-hot columns are perfectly collinear with each other (dummy trap when using plain logistic regression without regularisation).
- **Impact:** unstable, uninterpretable coefficients (see MODEL-06); inflated dimensionality for 529 rows; distance methods (KNN, K-Means, Agglomerative) double-count the same signal.
- **Fix:** keep one representation per quantity. Recommended final feature set (about 10-12 columns):
  - numeric: `Log_ApplicantIncome`, `Log_CoapplicantIncome`, `Log_LoanAmount`, `Loan_Amount_Term`, `LoanToIncome`, `EMI` (or a corrected EMI, see DATA-09)
  - categorical (one-hot): `Credit_History` (1/0/Unknown), `Property_Area`, `Married`, `Education`, optionally `Self_Employed`, `Dependents`
  - drop: raw `ApplicantIncome`, `CoapplicantIncome`, `LoanAmount`, `TotalIncome`, `Log_TotalIncome`, `BalanceIncome` (or keep `BalanceIncome` and drop `TotalIncome`/`EMI`; choose using a correlation filter and cross-validation).
  - use `OneHotEncoder(drop="first")` or regularised logistic regression.
- **Acceptance test:** no pair of final numeric features has |r| > 0.85; cross-validated score is not worse than the 21-feature model by more than noise (about 1 point).

#### DATA-07 (P1): `log1p` made `LoanAmount` skew worse
- **Evidence:** Section 7b output: skewness of LoanAmount **0.457** (original) vs **-1.313** (after log). ApplicantIncome 1.209 -> 0.124 and CoapplicantIncome 0.816 -> -0.237 improved. The markdown claims the transform "reduces right skew" for all.
- **Impact:** the log of LoanAmount over-corrects (and creates a long left tail because of values like 9 and 17); standardised Log_LoanAmount has min z = -6.13.
- **Fix:** do not log-transform `LoanAmount` after the IQR clip, or compare both versions by CV. At minimum, correct the markdown claim.
- **Acceptance test:** per-feature skew table is regenerated after the final pipeline, and no kept numeric feature has |skew| > 1 unless justified.

#### DATA-08 (P1): Extreme/odd derived values
- **Evidence:** `EMI` max 9.25 (z = 18.7) from loans with a 12-month term; `Loan_Amount_Term` min z = -5.18 (12 months) while 360 dominates (509/609 rows); `Log_CoapplicantIncome` is bimodal (0 for no co-applicant, about 7-8.6 otherwise); `BalanceIncome` min -1768 (EMI exceeds household income).
- **Impact:** a few rows have outsized leverage on scaled features and on K-Means/distance methods; a continuous `Loan_Amount_Term` is really a near-categorical variable.
- **Fix:** (a) add a binary `Has_Coapplicant` feature (or keep zero as meaningful); (b) bin or one-hot `Loan_Amount_Term` (`360`, `other`) or keep numeric but clip; (c) clip EMI at a training percentile; (d) keep negative BalanceIncome (it is meaningful), just document it.
- **Acceptance test:** no standardised feature has |z| > 6 on the training set after clipping.

#### DATA-09 (P1): `EMI` ignores interest
- **Evidence:** `EMI = LoanAmount / Loan_Amount_Term` is principal divided by months. `BalanceIncome = TotalIncome - EMI*1000` therefore assumes a 0% interest rate.
- **Impact:** repayment burden is understated; "EMI" label is misleading in the website UI.
- **Fix:** use the standard annuity formula with a fixed assumed annual rate `r` (e.g. 8.5-9.5%, document the choice; store it in config): `EMI = P * i * (1+i)^n / ((1+i)^n - 1)` where `i = r/12`, `P = LoanAmount*1000`, `n = Loan_Amount_Term`. Must be identical in training and inference. Rename the old feature if retained.
- **Acceptance test:** a unit test computes EMI for P=128000, n=360, r=9% and matches a known calculator value (about 1030/month).

#### DATA-10 (P1): Sensitive attribute `Gender` used without a fairness analysis
- **Evidence:** Gender is a model feature (coefficient +0.149 in logistic regression). Approval rates in the data: Female 67.0%, Male 69.5%. Missing Gender was filled with "Male".
- **Impact:** legal/ethical risk in any lending-style system; filling missing values with the majority class is itself a bias.
- **Fix:** remove Gender from model inputs (its correlation with the target is only 0.05, so accuracy loss is negligible). If kept for reporting, store it only for a fairness page (approval rate and false-rejection rate by Gender, Married, Property_Area). Add a visible "academic demo, not for real lending" disclaimer.
- **Acceptance test:** model feature list excludes Gender; admin page shows group approval rates.

#### DATA-11 (P2): Label semantics and dataset size caveats
- **Evidence:** `Loan_Status` is an approval decision; 529-609 rows; 69-31 class split.
- **Impact:** over-claiming ("predicts creditworthiness") would be incorrect.
- **Fix:** state in docs and UI: "predicts the likelihood the historical lender would approve; decision support only".
- **Acceptance test:** disclaimer text present on result page and in README.

#### DATA-12 (P2): Loan_ID is dropped from the preprocessed CSV
- **Evidence:** `Loan_Data_Preprocessed.csv` has no id; rows align with the cleaned file only by position.
- **Impact:** cannot trace a prediction back to a person/record, and a reordering breaks alignment.
- **Fix:** keep Loan_ID as an index (not a feature) in any saved intermediate dataset.
- **Acceptance test:** every saved dataset has a stable id column.

### 4.2 Modelling and evaluation

#### MODEL-01 (P0): A single Credit_History rule is nearly as good as every model
- **Evidence (computed during review):** majority-class baseline = 69.4% (cleaned) / 68.8% (609 raw rows). Rule "approve iff Credit_History == 1" = **82.2%** (cleaned) / about 81.1% (raw, unknown treated as 1). Leakage-free 5-fold CV on the 609 raw rows with a proper pipeline: Logistic Regression accuracy **0.809 +/- 0.022**, ROC-AUC 0.753; Random Forest accuracy 0.813 +/- 0.017, ROC-AUC 0.774.
- **Impact:** the headline 85.9% (LR) is largely test-split luck plus leakage; real lift over the one-rule baseline is about 0-1 point in accuracy. Reporting models without baselines is misleading.
- **Fix:** always report (a) majority baseline, (b) Credit_History-only rule, (c) Logistic Regression on Credit_History only. Judge models on **ROC-AUC, PR-AUC, balanced accuracy and Rejected-class recall**, not accuracy alone. Be honest in docs that credit history carries most of the signal.
- **Acceptance test:** the metrics table includes the three baselines and CV mean +/- std for every model.

#### MODEL-02 (P0): Single 106-row test split; rankings are noise
- **Evidence:** test set = 106 rows (74 Y / 32 N). One row = 0.94 percentage points. Logistic Regression (0.858) vs SVM (0.830) is a difference of 3 rows. Models are ranked purely by one split's accuracy.
- **Impact:** "best model" is not statistically supported; metrics change with random_state.
- **Fix:** use **repeated stratified k-fold CV** (e.g. 5x5 or 10x3) on the training set for model selection and report mean +/- std; keep the 20% hold-out for one final unbiased evaluation. Treat differences below about 2 points as ties.
- **Acceptance test:** `metrics.json` contains `cv_mean` and `cv_std` per model plus a `holdout` section.

#### MODEL-03 (P1): Hyper-parameters are hand-picked and untuned (except none)
- **Evidence:** fixed values (`max_depth=8`, `n_estimators=500`, `C=1.0`, `k=7`, ...) in `models = {...}`.
- **Impact:** unfair comparison; no evidence the settings are good.
- **Fix:** `GridSearchCV`/`RandomizedSearchCV` on the finalists (LogReg: `C`, `penalty`, `class_weight`; RandomForest/ExtraTrees: `max_depth`, `min_samples_leaf`, `n_estimators`) inside nested or train-only CV.
- **Acceptance test:** best params stored in `metrics.json`.

#### MODEL-04 (P1): Minority class ("Rejected") is poorly detected and the 0.5 threshold is never examined
- **Evidence:** reported Rejected recall: LR 0.62, Naive Bayes 0.62, KNN 0.28. In leakage-free CV, LR Rejected recall is **0.447**; with `class_weight="balanced"` it rises to 0.553 at the cost of accuracy (0.757).
- **Impact:** the system approves most applicants regardless; for a lender, false approvals are the costly error.
- **Fix:** choose a decision threshold deliberately from the precision-recall / ROC curve (store it in `metrics.json` as `threshold`), try `class_weight="balanced"`, and report a confusion matrix at that threshold. Document the business trade-off (false approve vs false reject).
- **Acceptance test:** `predict.py` uses the stored threshold, not a hard-coded 0.5.

#### MODEL-05 (P1): Probabilities are uncalibrated
- **Evidence:** only `predict()` is used; no `predict_proba` calibration check. The website will show "82% likely approved".
- **Impact:** a displayed percentage may be systematically wrong (tree ensembles especially).
- **Fix:** plot a reliability curve and Brier score; if poor, wrap with `CalibratedClassifierCV(method="sigmoid", cv=5)`. Logistic Regression is usually already reasonably calibrated.
- **Acceptance test:** Brier score and calibration plot saved; documented.

#### MODEL-06 (P1): Contradictory logistic regression coefficients
- **Evidence (`LOANEXP6.ipynb` cell 23):** Credit_History +3.35; **Log_LoanAmount +0.853 but LoanAmount -0.368 and LoanToIncome -0.755**; **TotalIncome -0.240 but Log_CoapplicantIncome +0.349 and CoapplicantIncome -0.312**.
- **Impact:** a "bigger loan raises approval" signal appears only because of collinear twins cancelling; coefficients cannot be shown to users as explanations.
- **Fix:** resolve DATA-06 first, then refit. Optionally use L2 regularisation with a tuned `C`. Verify each remaining coefficient has the intuitive sign (Credit_History positive; LoanToIncome negative; Semiurban positive; Rural negative).
- **Acceptance test:** coefficient table has no sign that contradicts domain logic without a documented reason.

#### MODEL-07 (P1): Inconsistent results across notebooks
- **Evidence:** `Loan.ipynb` prints a test set of **159 rows** and Decision Tree accuracy 0.717 (confusion `[[32,17],[28,82]]`) although the code says `test_size=0.20` (which gives 106). `DWMLoan.ipynb` Decision Tree (depth 5) gives 0.802 on 106 rows. The Decision Tree in `Loan.ipynb` is unrestricted (`max_depth=None`) so it overfits.
- **Impact:** reader cannot tell which numbers are current; the saved output is stale relative to the code.
- **Fix:** keep one canonical training notebook/script; delete or regenerate stale outputs (`Restart & Run All`).
- **Acceptance test:** every printed number in the final notebook comes from a single end-to-end run.

#### MODEL-08 (P1): Hard-coded confusion matrix and probable mislabelled legend (`DWMLoan.ipynb`)
- **Evidence:** the Naive Bayes visual uses typed numbers `cm = [[20,12],[8,66]]` with axis labels "Low (0)/High (1)" (wrong semantics for approved/rejected). In the KNN decision-boundary cell, `plt.legend(labels=['Approved (1)','Rejected (0)'])` is passed in an order that likely reverses the seaborn hue order (0 first, then 1), mislabelling classes. `DWMLoanKmeansCluster.ipynb` already fixes the first by computing the matrix from predictions.
- **Impact:** plots can mislead; manual numbers go stale if the model changes.
- **Fix:** always compute the confusion matrix from `y_test, y_pred`; set legend handles from the plotted artists or map hue values to names before plotting.
- **Acceptance test:** no hard-coded metric numbers in code cells; legend colours match class labels in a visual check.

#### MODEL-09 (P2): Poor fit of some algorithms to this feature space
- **Evidence:** Gaussian Naive Bayes is applied to mixed binary + standardised collinear features (violates independence/Gaussian assumptions); KNN (0.726) suffers from 21 redundant dimensions with many binary columns.
- **Impact:** weak models inflate the "comparison" without adding insight.
- **Fix:** after DATA-06, either drop these or label them "baseline only"; use `BernoulliNB`/`CategoricalNB` on the categorical subset if Naive Bayes is kept; tune `k` for KNN via CV.
- **Acceptance test:** comparison table notes the role of each model.

#### MODEL-10 (P1): No saved model artifacts, versions or run metadata
- **Evidence:** no `joblib.dump`; no record of library versions.
- **Impact:** cannot deploy, cannot reproduce, cannot show a model-history page on the admin side.
- **Fix:** save `artifacts/model_vN.joblib`, `metrics.json` (accuracy, precision, recall, F1, ROC-AUC, threshold, feature list, row counts, training date, `sklearn.__version__`, random seed) and plots. Pin `scikit-learn`, `pandas`, `numpy`, `joblib` in `requirements.txt` (joblib files are version-sensitive).
- **Acceptance test:** `python train.py --data data/Loan_Data.csv` regenerates all artifacts deterministically.

### 4.3 Clustering

#### CLUS-01 (P1): K-Means `k=2` was chosen to match the label count, not from evidence
- **Evidence:** `N_CLUSTERS = 2  # chosen to line up with the 2 Loan_Status classes`. Elbow plot is drawn but not used to choose k. Silhouette 0.245 (weak). ARI vs Loan_Status = -0.006 (no relationship). Clusters: 167 vs 362 rows, approval 70.7% vs 68.8% (essentially identical).
- **Impact:** the cluster step does not segment anything meaningful; it was fit on all 21 redundant features including binary flags.
- **Fix:** choose k from silhouette / Calinski-Harabasz / Davies-Bouldin over k = 2-8; cluster only on a small set of non-redundant financial features (`Log_TotalIncome`, `Log_LoanAmount`, `LoanToIncome`, EMI, optionally `Credit_History`); report whether any k gives silhouette > about 0.3. State clearly that clusters describe applicants and are not expected to predict approval.
- **Acceptance test:** a table of metrics for k = 2-8 is saved and the chosen k is justified in one sentence.

#### CLUS-02 (P1): Agglomerative cluster count heuristic is biased towards 2
- **Evidence:** `jumps = np.diff(last_merges_rev); suggested_k = argmax(abs(jumps)) + 2`. The printed merge distances are 42.27, 31.26, 28.24, ... 13.32; the biggest gap is always between the first two (11.0), which mechanically returns k=2.
- **Impact:** "data-driven" k is an artefact; the resulting 2 clusters mainly split income level and Credit_History (cluster 1 mean Credit_History 1.0; cluster 0 holds the Credit_History = 0 applicants).
- **Fix:** compare silhouette for k = 2-6 on the same linkage; look at the dendrogram cut visually; consider whether `Credit_History` (a binary flag, scaled) should be in the distance at all.
- **Acceptance test:** chosen k backed by silhouette plus dendrogram, documented.

#### CLUS-03 (P0 for the website): Agglomerative clustering cannot assign new applicants
- **Evidence:** `AgglomerativeClustering` has no `predict`; the notebook only labels the training rows (`Loan_Data_Clustered.csv`).
- **Impact:** the website's "applicant segment" badge needs to score a new application.
- **Fix:** use **K-Means (or a nearest-centroid classifier fit on the agglomerative labels)** for deployment. Save `scaler + KMeans` as `artifacts/cluster.joblib` together with human-readable cluster names. Use Agglomerative only for exploration.
- **Acceptance test:** `cluster_model.predict(new_row)` returns a segment id and name for any valid input.

#### CLUS-04 (P2): Inconsistent feature sets between clustering notebooks and weak 2D visualisation
- **Evidence:** K-Means uses 21 features; Agglomerative uses 8. PCA captures only 54.7% (K-Means) / 57.6% (Agglomerative) of variance in 2D.
- **Impact:** the two clusterings are not comparable; 2D plots look more separable/overlapping than reality.
- **Fix:** use the same feature set for both and report explained variance next to each plot.
- **Acceptance test:** one shared `CLUSTER_FEATURES` constant.

### 4.4 EDA notebook (`Loan_EDA.ipynb`): claims vs data

All numbers below were recomputed from `Loan_Data_Cleaned.csv` (529 rows).

#### EDA-01 (P1): Insight 10 overstates dependents effect
- **Claim:** applicants with 2 dependents have "nearly 76%" approval; 1 and 3+ face higher rejection.
- **Data:** approval by dependents: 0 -> 69.4%, 1 -> 66.7%, **2 -> 72.7%**, 3+ -> 67.5%. Differences are a few points on small groups.
- **Fix:** correct to 72.7%; add a chi-square test; state "no meaningful relationship" unless p < 0.05.

#### EDA-02 (P1): Insight 8 is partly wrong
- **Claim:** rejected applicants show a higher median LoanToIncome and a higher median EMI.
- **Data:** medians N vs Y: LoanToIncome **0.024 vs 0.025** (rejected is slightly *lower*), EMI **0.356 vs 0.356** (identical), BalanceIncome 4525 vs 4722 (approved higher; small).
- **Fix:** rewrite the insight: "leverage and EMI do not separate the classes; correlation of LoanToIncome with approval is only -0.11". Support with Mann-Whitney tests.

#### EDA-03 (P1): Insight 9 is unsupported
- **Claim:** applicants with negative BalanceIncome have a "high tendency toward rejection".
- **Data:** only **2** such rows: 1 approved, 1 rejected.
- **Fix:** state that the sample is too small to conclude anything.

#### EDA-04 (P2): Claims that are correct (keep, but add numbers)
- Insight 5: Credit_History is dominant. Approval **80.3%** when 1.0 vs **6.4%** when 0.0. Correct.
- Insight 7: Semiurban highest. Approval Semiurban **77.8%**, Urban 65.7%, Rural **62.4%**. Correct.
- Insight 6: total income medians similar (N 4886 vs Y 5093). Correct.
- Insight 1: missing percentages (8.14%, 5.21%, 3.58%) are correct for raw data.
- **Fix:** add the numbers and tests to the markdown so each insight is verifiable.

#### EDA-05 (P2): Insight 2 frames deletion as purely beneficial
- **Claim:** removing 80 outliers "stabilized variance and prevents bias".
- **Reality:** it also removes real applicants and shifts the population (max income 81000 -> 10139). See DATA-03.
- **Fix:** present as a trade-off, not a pure benefit.

#### EDA-06 (P2): Notebook hygiene
- The Insight 10 code cell is duplicated at the end; Drive is mounted twice; titles/units for scaled plots in `LOANEXP6.ipynb` mix "Standardized" and original axes; there is no statistical testing anywhere.
- **Fix:** remove duplicates; add `scipy.stats.chi2_contingency` and `mannwhitneyu` for each bivariate claim.

### 4.5 Website-integration issues (ML side)

#### WEB-01 (P0): No fixed input schema between form and model
- **Fix:** define and freeze this schema; the frontend form, the API validator and the pipeline must all use it.

| Field | Type | Allowed values / range |
|---|---|---|
| Married | enum | Yes, No |
| Dependents | enum | 0, 1, 2, 3+ |
| Education | enum | Graduate, Not Graduate |
| Self_Employed | enum | Yes, No, Unknown |
| ApplicantIncome | number | > 0, monthly INR |
| CoapplicantIncome | number | >= 0, monthly INR |
| LoanAmount | number | > 0, INR thousands |
| Loan_Amount_Term | number | 12-480 months |
| Credit_History | enum | 1, 0, Unknown |
| Property_Area | enum | Urban, Semiurban, Rural |

(Gender optional and stored only for fairness reporting, not passed to the model.)

#### WEB-02 (P0): Robustness to unseen/missing/extreme inputs
- **Fix:** `OneHotEncoder(handle_unknown="ignore")`; imputers for every column; a `Clipper` step (see DATA-03); input validation in `predict.py` returning clear error messages (not stack traces).
- **Acceptance test:** unit tests for (a) missing field, (b) `Property_Area="Metro"`, (c) income 0 and income 1,000,000, (d) term 12 and 480.

#### WEB-03 (P1): Explainability and what-if suggestions are not implemented
- **Fix:** with the final Logistic Regression pipeline, compute per-feature contribution = coefficient x transformed value; return the top 3-5 with plain-English labels (e.g. `LoanToIncome` -> "Loan size relative to income"). For suggestions, re-score variants (loan amount -10/-20%, longer term, add co-applicant income) and return those that raise probability.
- **Acceptance test:** `predict()` returns `top_factors` and `suggestions` lists.

#### WEB-04 (P1): Model versioning and safe retraining for the admin page
- **Fix:** `train.py --data <csv>` returns metrics and writes a new `model_vN.joblib`; the backend stores a `model_runs` row and only switches `is_active` after the admin confirms and the new model's CV ROC-AUC is not worse than the current one's by more than 0.02.

#### WEB-05 (P2): Disclaimer and responsible use
- **Fix:** show "Educational decision-support demo. Not a real lending decision." on the result page and in the README.

---

## 5. Target architecture (what the ML module should look like after fixes)

```
ml/
  config.py          # FEATURES, CATEGORICAL, NUMERIC, INTEREST_RATE, SEED, THRESHOLD path
  preprocess.py      # add_features(df): TotalIncome, EMI(annuity), LoanToIncome, Log_*, Has_Coapplicant
                     # Clipper transformer, build_column_transformer()
  train.py           # CLI: load raw CSV -> split -> CV compare -> tune -> calibrate -> threshold -> save
  predict.py         # predict(dict) -> result dict (below); explain(); what_if(); validate()
  cluster.py         # fit/save/load scaler+KMeans, cluster names
  artifacts/
    model_v1.joblib  # sklearn Pipeline (features + clipper + encoder + scaler + classifier)
    cluster_v1.joblib
    metrics.json
    roc.png  confusion_matrix.png  calibration.png  coefficients.csv
data/
  Loan_Data.csv  train.csv  test.csv  historical_seed.csv
tests/
  test_preprocess.py  test_predict.py  fixtures/example_inputs.json
requirements.txt     # pinned versions
```

### 5.1 `predict()` contract

```python
predict(form: dict) -> {
  "decision": "Approved" | "Rejected",
  "probability": 0.82,            # calibrated P(approved)
  "threshold": 0.60,              # from metrics.json
  "segment": {"id": 1, "name": "High income, low burden"},
  "top_factors": [
     {"feature": "Credit history", "direction": "positive", "impact": 1.9},
     {"feature": "Loan size relative to income", "direction": "negative", "impact": -0.4}
  ],
  "suggestions": [
     {"change": "Reduce loan amount by 15%", "new_probability": 0.88}
  ],
  "model_version": "v1"
}
```
Errors: raise a `ValidationError(field, message)`; never return a stack trace.

### 5.2 Suggested pipeline skeleton

```python
numeric = ["Log_ApplicantIncome","Log_CoapplicantIncome","Log_LoanAmount",
           "Loan_Amount_Term","LoanToIncome","EMI"]
categorical = ["Credit_History","Property_Area","Married","Education",
               "Self_Employed","Dependents"]

pre = ColumnTransformer([
  ("num", Pipeline([("clip", Clipper(1,99)), ("imp", SimpleImputer(strategy="median")),
                    ("sc", StandardScaler())]), numeric),
  ("cat", Pipeline([("imp", SimpleImputer(strategy="constant", fill_value="Unknown")),
                    ("oh", OneHotEncoder(handle_unknown="ignore"))]), categorical),
])
model = Pipeline([("features", FunctionTransformer(add_features)),
                  ("pre", pre),
                  ("clf", LogisticRegression(max_iter=2000, C=..., class_weight=...))])
# cross_validate on train; GridSearchCV; fit; CalibratedClassifierCV if needed; joblib.dump
```
(`Credit_History` must be cast to string `"1"/"0"/"Unknown"` before the categorical imputer.)

---

## 6. Recommended build order

1. **Data prep (DATA-01..04, 12):** work from raw CSV; split first; define schema (WEB-01).
2. **Feature function (DATA-06..09):** `preprocess.py` with unit tests; drop Gender (DATA-10).
3. **Pipeline + baselines + CV (MODEL-01, 02):** compare majority, Credit-only, LR, RF, ExtraTrees, GB, SVM.
4. **Tuning, imbalance, threshold, calibration (MODEL-03..05).**
5. **Coefficient sanity check (MODEL-06)**, then explainability and what-if (WEB-03).
6. **Clustering (CLUS-01..04)** with K-Means for deployment.
7. **Save artifacts, metrics, plots, tests (MODEL-10, WEB-02, WEB-04).**
8. **Fix EDA claims and markdown (EDA-01..06, DATA-05, MODEL-07, MODEL-08)** so the report matches the code.

---

## 7. Reference numbers (to check your work against)

Computed with a leakage-free pipeline on the 609 raw rows (income >= 1000), 5-fold stratified CV, seed 42, features as in Section 5.2 with Credit_History as 1/0/Unknown:

| Model | CV accuracy | CV ROC-AUC | CV F1 | Rejected recall |
|---|---|---|---|---|
| Logistic Regression | 0.809 +/- 0.022 | 0.753 +/- 0.052 | 0.876 | 0.447 |
| Logistic Regression (balanced) | 0.757 +/- 0.044 | 0.755 +/- 0.052 | 0.827 | 0.553 |
| Random Forest (300 trees, depth 6) | 0.813 +/- 0.017 | 0.774 +/- 0.022 | 0.877 | n/a |

Baselines: majority class 0.688; "approve iff Credit_History == 1" about 0.81-0.82.

Interpretation for the rewrite: realistic expected accuracy is about 80-82%; ROC-AUC about 0.75-0.78. Do not expect to reproduce the 85.8% from the notebooks; that number is optimistic because of DATA-01 and MODEL-02. Gains should be sought in ROC-AUC, Rejected-class recall and calibrated probabilities, and the write-up should say so honestly.

### Verified facts from the data (for writing accurate text)

- Raw: 614 rows, 13 columns; missing: Credit_History 50 (8.14%), Self_Employed 32 (5.21%), LoanAmount 22 (3.58%), Dependents 15 (2.44%), Loan_Amount_Term 14 (2.28%), Gender 13 (2.12%), Married 3 (0.49%).
- After removing income < 1000: 609 rows. After IQR removal: 529 rows (367 Y / 162 N, 69.4% / 30.6%).
- Correlation with Loan_Status (cleaned, scaled): Credit_History 0.568; Property_Area_Semiurban 0.145; Education -0.116; LoanToIncome -0.115; Log_CoapplicantIncome 0.098; Property_Area_Rural -0.098; all others |r| < 0.09.
- K-Means (k=2) cluster sizes 167 / 362; Agglomerative (k=2) 397 / 132; PCA variance in 2D 54.7% / 57.6%.

---

## 8. Definition of done

- [ ] All P0 issues resolved; all P1 issues resolved or explicitly documented as accepted trade-offs.
- [ ] `python ml/train.py --data data/Loan_Data.csv` runs end to end and writes `artifacts/` with a reproducible result.
- [ ] `predict(form)` works on a raw dict, handles missing/unseen/extreme input, and returns the contract in Section 5.1.
- [ ] `metrics.json` includes baselines, CV mean +/- std, hold-out results, threshold, feature list, versions.
- [ ] No transformer is fit on test data; no hard-coded metric numbers in code.
- [ ] Every number in written documentation is generated from, or checked against, actual outputs.
- [ ] Unit tests pass (missing field, unseen category, extreme values, sign sanity: Credit_History = 0 gives a clearly lower probability than 1).
- [ ] `requirements.txt` pins versions; README states the educational-use disclaimer.