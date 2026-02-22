import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit, RandomizedSearchCV
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
import matplotlib.pyplot as plt
import shap
import flask
from flask import Flask, jsonify, request
from flask_cors import CORS

K = 6

def build_features(df, lag_steps=[1,2,3,6,12,24]):
    df["Timestamp"] = range(1, len(df) + 1)

    for lag in lag_steps:
        df[f"workload_t-{lag}"] = df["Server_Workload(%)"].shift(lag)
        df[f"outlet_t-{lag}"] = df["Outlet_Temperature(°C)"].shift(lag)
        df[f"inlet_t-{lag}"] = df["Inlet_Temperature(°C)"].shift(lag)
        df[f"cooling_power_t-{lag}"] = df["Cooling_Unit_Power_Consumption(kW)"].shift(lag)
        df[f"chiller_usage_t-{lag}"] = df["Chiller_Usage(%)"].shift(lag)
        df[f"ahu_usage_t-{lag}"] = df["AHU_Usage(%)"].shift(lag)
        df[f"ambient_t-{lag}"] = df["Ambient_Temperature(°C)"].shift(lag)

    for col, name in [
        ("Server_Workload(%)", "workload"),
        ("Outlet_Temperature(°C)", "outlet"),
        ("Inlet_Temperature(°C)", "inlet"),
        ("Cooling_Unit_Power_Consumption(kW)", "cooling_power"),
        ("Chiller_Usage(%)", "chiller_usage"),
        ("AHU_Usage(%)", "ahu_usage"),
        ("Ambient_Temperature(°C)", "ambient"),
    ]:
        df[f"{name}_rolling_mean_6"] = df[col].rolling(6).mean()
        df[f"{name}_rolling_mean_24"] = df[col].rolling(24).mean()
        df[f"{name}_roll_std_6"] = df[col].rolling(6).std()
        df[f"{name}_roll_std_24"] = df[col].rolling(24).std()

    Cp = 4.18
    mass_flow = 1.0
    df["delta_T"] = df["Outlet_Temperature(°C)"] - df["Inlet_Temperature(°C)"]
    df["Q_kW"] = mass_flow * Cp * df["delta_T"]

    df["hour"] = (df["Timestamp"] - 1) % 24
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["dow"] = ((df["Timestamp"] - 1) // 24) % 7
    df["dow_sin"] = np.sin(2 * np.pi * df["dow"] / 7)
    df["dow_cos"] = np.cos(2 * np.pi * df["dow"] / 7)

    df["workload_t-168"] = df["Server_Workload(%)"].shift(168)
    df["outlet_t-168"] = df["Outlet_Temperature(°C)"].shift(168)
    df["Q_roll_mean_6"] = df["Q_kW"].rolling(6).mean()
    df["Q_roll_mean_24"] = df["Q_kW"].rolling(24).mean()

    df["target"] = df["Q_kW"].shift(-1).rolling(K).sum().shift(-(K - 1))
    df = df.iloc[:-K]
    df.dropna(inplace=True)

    return df


def main():
    df = pd.read_csv("other.csv")
    df = build_features(df)

    drop_cols = [
        "target", "Q_kW", "delta_T", "hour", "dow", "Timestamp",
        "Cooling_Strategy_Action", "Total_Energy_Cost($)", "Output"
    ]

    X = df.drop(columns=drop_cols)
    y = df["target"]

    print(f"Features: {X.shape[1]}, Rows: {X.shape[0]}")
    print(f"Mean target: {y.mean():.2f} kWh | Std: {y.std():.2f} kWh")

    param_grid = {
        "n_estimators": [300, 500, 1000],
        "max_depth": [3, 5, 7],
        "learning_rate": [0.01, 0.05, 0.1],
        "subsample": [0.7, 0.8, 1.0],
        "colsample_bytree": [0.7, 0.8, 1.0],
    }

    tscv = TimeSeriesSplit(n_splits=5)

    search = RandomizedSearchCV(
        xgb.XGBRegressor(random_state=42),
        param_grid, n_iter=30,
        cv=tscv, scoring="neg_mean_absolute_error",
        random_state=42, verbose=1
    )
    search.fit(X, y)

    best_mae = -search.best_score_
    print(f"\nBest CV MAE: {best_mae:.4f} kWh")
    print(f"MAE% of mean: {best_mae / y.mean() * 100:.2f}%")
    print(f"Best params: {search.best_params_}")

    final_model = xgb.XGBRegressor(**search.best_params_, random_state=42)
    final_model.fit(X, y)
    final_model.save_model("heat_model_6h_window.json")

    # --- predicted vs actual on last fold ---
    last_split = list(tscv.split(X))[-1]
    _, val_idx = last_split
    X_val = X.iloc[val_idx]
    y_val = y.iloc[val_idx]
    preds = final_model.predict(X_val)

    val_mae = mean_absolute_error(y_val, preds)
    val_rmse = root_mean_squared_error(y_val, preds)
    print(f"Last fold — MAE: {val_mae:.4f} | RMSE: {val_rmse:.4f} | MAE%: {val_mae / y.mean() * 100:.2f}%")

    plt.figure(figsize=(14, 4))
    plt.plot(y_val.values, label="Actual", alpha=0.8, color="steelblue")
    plt.plot(preds, label="Predicted", alpha=0.8, color="orange", linestyle="--")
    plt.fill_between(range(len(y_val)), y_val.values, preds, alpha=0.15, color="red", label="Error")
    plt.xlabel("Hour")
    plt.ylabel("Total Heat Output (kWh)")
    plt.title("Predicted vs Actual — Total Recoverable Heat Over Next 6 Hours")
    plt.legend()
    plt.tight_layout()
    plt.savefig("predicted_vs_actual.png", dpi=150)

    plt.figure(figsize=(14, 4))
    plt.plot(df["Q_kW"].values[:24*28], color="orange", alpha=0.8)
    plt.xlabel("Hour")
    plt.ylabel("Heat Output (kW)")
    plt.title("Waste Heat Output — First 4 Weeks")
    plt.tight_layout()
    plt.savefig("q_over_time.png", dpi=150)

    xgb.plot_importance(final_model, max_num_features=20)
    plt.tight_layout()
    plt.savefig("feature_importance.png", dpi=150)

    explainer = shap.Explainer(final_model)
    shap_values = explainer(X)
    shap.summary_plot(shap_values, X, max_display=20, show=False)
    plt.tight_layout()
    plt.savefig("shap_summary.png", dpi=150)

    print("\n$$$$$$ Done. $$$$$$")


def sample_and_predict(model, df, window=12):
    """
    Pick a random point in the dataset, show the surrounding 6-hour
    aggregate trend, and predict the next 6 hours from that point.
    """
    drop_cols = [
        "target", "Q_kW", "delta_T", "hour", "dow", "Timestamp",
        "Cooling_Strategy_Action", "Total_Energy_Cost($)", "Output"
    ]
    existing_drops = [c for c in drop_cols if c in df.columns]
    X = df.drop(columns=existing_drops)

    # pick a random point with enough history
    idx = np.random.randint(window * 6, len(df) - 6)

    # compute 6h rolling sums, sample every 6 rows to get non-overlapping windows
    q_rolling = df["Q_kW"].rolling(6).sum()
    past_indices = range(idx - window * 6, idx + 1, 6)
    rolling_actuals = q_rolling.iloc[list(past_indices)].values

    # predict next 6h from this point
    row = X.iloc[[idx]]
    prediction = model.predict(row)[0]

    # x axis — each step is one 6h window
    x_past = list(range(-window, 1))
    x_future = [0, 1]
    
    print(x_past)
    print(x_future)

    plt.figure(figsize=(12, 4))
    plt.plot(x_past, rolling_actuals, color="steelblue", marker="o",
             markersize=4, label="Actual 6h Aggregates")
    plt.axvline(x=0, color="gray", linestyle="--", alpha=0.5, label="Now")
    plt.plot(x_future, [rolling_actuals[-1], prediction],
             color="orange", marker="o", linestyle="--", label="Predicted Next 6h")
    plt.scatter([1], [prediction], color="orange", zorder=5, s=80)
    plt.annotate(f"{prediction:.1f} kWh", xy=(1, prediction),
                 xytext=(0.7, prediction + 1.5), fontsize=9, color="orange")
    plt.xlabel("6-Hour Windows (0 = now)")
    plt.ylabel("6-Hour Heat (kWh)")
    plt.title(f"6-Hour Heat Trend + Forecast (row {idx})")
    plt.legend()
    plt.tight_layout()
    plt.savefig("sample_forecast.png", dpi=150)
    plt.show()

    print(f"Sampled at row {idx}")
    print(f"Actual 6h aggregate at sample point: {rolling_actuals[-1]:.2f} kWh")
    print(f"Predicted next 6h: {prediction:.2f} kWh")

    return prediction



def flask_sample(model, df, window=12):
    """
    Pick a random point in the dataset, show the surrounding 6-hour
    aggregate trend, and predict the next 6 hours from that point.
    """
    drop_cols = [
        "target", "Q_kW", "delta_T", "hour", "dow", "Timestamp",
        "Cooling_Strategy_Action", "Total_Energy_Cost($)", "Output"
    ]
    existing_drops = [c for c in drop_cols if c in df.columns]
    X = df.drop(columns=existing_drops)

    # pick a random point with enough history
    idx = np.random.randint(window * 6, len(df) - 6)

    # compute 6h rolling sums, sample every 6 rows to get non-overlapping windows
    q_rolling = df["Q_kW"].rolling(6).sum()
    past_indices = range(idx - window * 6, idx + 1, 6)
    rolling_actuals = q_rolling.iloc[list(past_indices)].values

    # predict next 6h from this point
    row = X.iloc[[idx]]
    prediction = float(model.predict(row)[0])

    # x axis — each step is one 6h window
    x_past = list(range(-window, 1))
    x_future = [0, 1]

    return {
        "sampled_row": int(idx),
        "prediction_kwh": round(prediction, 2),
        "actual_current_kwh": round(float(rolling_actuals[-1]), 2),
        "x_past": x_past,
        "rolling_actuals": [round(float(v), 2) for v in rolling_actuals],
        "x_future": x_future,
        "future_values": [round(float(rolling_actuals[-1]), 2), round(prediction, 2)],
    }


def create_app():
    app = Flask(__name__)
    CORS(app)

    # Load model and data once at startup
    loaded_model = xgb.XGBRegressor()
    loaded_model.load_model("heat_model_6h_window.json")
    df = pd.read_csv("other.csv")
    df = build_features(df)

    @app.route("/api/predict", methods=["GET"])
    def predict():
        window = request.args.get("window", default=12, type=int)
        result = flask_sample(loaded_model, df, window=window)
        return jsonify(result)
    
    @app.route("/api/scale", methods=["GET"])
    def scale():
        window = request.args.get("window", default=12, type=int)
        result = flask_sample(loaded_model, df, window=window)
        result["prediction_kwh"] = result["prediction_kwh"] * 45_000
        result["rolling_actuals"] = [v * 45_000 for v in result["rolling_actuals"]]
        return jsonify(result)

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "model": "heat_model_6h_window", "K": K})

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)