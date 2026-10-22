import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, classification_report
from xgboost import XGBClassifier
import shap

# 1. Load Cleaned Dataset
csv_path = "cad_dataset_clean.csv"
if not os.path.exists(csv_path):
    csv_path = os.path.join("..", "cad_dataset_clean.csv")

print(f"Loading data from {csv_path}...")
df = pd.read_csv(csv_path)
print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns.")

# 2. Separate Leakage & Target Columns
leakage_and_target_cols = [
    'Cath', 'CAD', 'LAD', 'LCX', 'RCA',
    'CAD_binary', 'LAD_binary', 'LCX_binary', 'RCA_binary'
]
feature_cols = [col for col in df.columns if col not in leakage_and_target_cols]
X = df[feature_cols].copy()

targets = {
    'CAD': df['CAD_binary'],
    'LAD': df['LAD_binary'],
    'LCX': df['LCX_binary'],
    'RCA': df['RCA_binary']
}

print(f"Features count (without leakage): {X.shape[1]}")

# 3. Preprocessing
categorical_cols = X.select_dtypes(include=['object', 'str']).columns.tolist()
numerical_cols = X.select_dtypes(include=['int64', 'float64']).columns.tolist()

for col in categorical_cols:
    X[col] = X[col].astype(str).str.strip().str.title()

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numerical_cols),
        ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols)
    ]
)

X_processed = preprocessor.fit_transform(X)
feature_names_out = (
    numerical_cols + 
    preprocessor.named_transformers_['cat'].get_feature_names_out(categorical_cols).tolist()
)
print(f"Total processed feature dimensions: {X_processed.shape[1]}")

# 4. Multi-Target Training with Algorithmic Class Weighting
models = {}
eval_results = {}

print("\n--- Training Models with scale_pos_weight ---")
for target_name, y in targets.items():
    X_train, X_test, y_train, y_test = train_test_split(
        X_processed, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Calculate algorithmic class weighting: neg_count / pos_count
    pos_count = int((y_train == 1).sum())
    neg_count = int((y_train == 0).sum())
    weight = float(neg_count) / float(pos_count)
    
    clf = XGBClassifier(
        n_estimators=120,
        max_depth=3,
        learning_rate=0.08,
        scale_pos_weight=weight,
        random_state=42,
        eval_metric='logloss'
    )
    clf.fit(X_train, y_train)
    
    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)[:, 1]
    
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)
    
    models[target_name] = clf
    eval_results[target_name] = {
        'Class Weight': round(weight, 3),
        'Accuracy': round(acc, 3),
        'F1-Score': round(f1, 3),
        'ROC-AUC': round(auc, 3)
    }
    print(f"Target: {target_name:4} | Weight: {weight:.3f} | Acc: {acc:.3f} | F1: {f1:.3f} | AUC: {auc:.3f}")

metrics_df = pd.DataFrame(eval_results).T
print("\n--- Evaluation Summary ---")
print(metrics_df)

# 5. Build Pipelines & Fit SHAP Explainer
print("\nBuilding Pipelines and fitting SHAP Explainer...")
pipelines = {}
for target_name in ['CAD', 'LAD', 'LCX', 'RCA']:
    pipelines[target_name] = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', models[target_name])
    ])

explainer = shap.TreeExplainer(models['CAD'])

export_bundle = {
    'pipelines': pipelines,
    'models': models,
    'preprocessor': preprocessor,
    'feature_names_raw': feature_cols,
    'raw_feature_names': feature_cols,
    'feature_names_processed': feature_names_out,
    'processed_feature_names': feature_names_out,
    'explainer': explainer
}

# 6. Save cardio_models.joblib in both locations
export_paths = [
    "cardio_models.joblib",
    os.path.join("..", "cardio_models.joblib")
]
for p in export_paths:
    if os.path.exists(os.path.dirname(os.path.abspath(p))):
        joblib.dump(export_bundle, p)
        print(f"Saved: {os.path.abspath(p)}")

# 7. Generate demo_presets.json
all_probs = pd.DataFrame({
    'CAD': models['CAD'].predict_proba(X_processed)[:, 1],
    'LAD': models['LAD'].predict_proba(X_processed)[:, 1],
    'LCX': models['LCX'].predict_proba(X_processed)[:, 1],
    'RCA': models['RCA'].predict_proba(X_processed)[:, 1]
})

low_cands = all_probs[(all_probs['CAD'] < 0.20) & (all_probs['LAD'] < 0.20)].index
lad_cands = all_probs[(all_probs['LAD'] > 0.70) & (all_probs['LCX'] < 0.35) & (all_probs['RCA'] < 0.35)].index
multi_cands = all_probs[(all_probs['CAD'] > 0.85) & (all_probs['LAD'] > 0.75) & (all_probs['RCA'] > 0.65)].index

low_idx = low_cands[0]
lad_idx = lad_cands[0]
multi_idx = multi_cands[0]

demo_presets = {
    "Patient 1 - Healthy / Low Risk": {
        "expected_output": {k: float(v) for k, v in all_probs.loc[low_idx].round(3).to_dict().items()},
        "patient_data": {k: (int(v) if isinstance(v, (np.integer, int)) else (float(v) if isinstance(v, (np.floating, float)) else str(v))) for k, v in X.loc[low_idx].to_dict().items()}
    },
    "Patient 2 - Single-Vessel (LAD) Stenosis": {
        "expected_output": {k: float(v) for k, v in all_probs.loc[lad_idx].round(3).to_dict().items()},
        "patient_data": {k: (int(v) if isinstance(v, (np.integer, int)) else (float(v) if isinstance(v, (np.floating, float)) else str(v))) for k, v in X.loc[lad_idx].to_dict().items()}
    },
    "Patient 3 - Severe Multi-Vessel CAD": {
        "expected_output": {k: float(v) for k, v in all_probs.loc[multi_idx].round(3).to_dict().items()},
        "patient_data": {k: (int(v) if isinstance(v, (np.integer, int)) else (float(v) if isinstance(v, (np.floating, float)) else str(v))) for k, v in X.loc[multi_idx].to_dict().items()}
    }
}

preset_paths = [
    "demo_presets.json",
    os.path.join("..", "demo_presets.json")
]
for p in preset_paths:
    if os.path.exists(os.path.dirname(os.path.abspath(p))):
        with open(p, "w") as f:
            json.dump(demo_presets, f, indent=2)
        print(f"Saved: {os.path.abspath(p)}")

print("\n--- Generated Demo Presets ---")
for name, data in demo_presets.items():
    print(f"• {name} -> {data['expected_output']}")

# 8. Test prediction verification
test_pat = demo_presets["Patient 1 - Healthy / Low Risk"]["patient_data"]
df_test = pd.DataFrame([test_pat])
for col in feature_cols:
    if col not in df_test.columns:
        df_test[col] = None
df_test = df_test[feature_cols]
for c in df_test.select_dtypes(include=['object', 'str']).columns:
    df_test[c] = df_test[c].astype(str).str.strip().str.title()

test_cad = float(pipelines["CAD"].predict_proba(df_test)[0, 1])
test_lad = float(pipelines["LAD"].predict_proba(df_test)[0, 1])
test_lcx = float(pipelines["LCX"].predict_proba(df_test)[0, 1])
test_rca = float(pipelines["RCA"].predict_proba(df_test)[0, 1])
print(f"\nVerification Test: CAD={test_cad:.3f}, LAD={test_lad:.3f}, LCX={test_lcx:.3f}, RCA={test_rca:.3f}")
print("ALL DONE SUCCESSFULLY!")
