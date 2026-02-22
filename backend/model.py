import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
import matplotlib.pyplot as plt
import shap

def main(lag_steps=[1,2,3,6,12,24]):
    
    df = pd.read_csv("other.csv")
    print(df.head())
    
    df["Timestamp"] = range(1, len(df) + 1)
    
    for lag in lag_steps:
        df[f"workload_t-{lag}"] = df["Server_Workload(%)"].shift(lag)
        df[f"outlet_t-{lag}"] = df["Outlet_Temperature(°C)"].shift(lag)
        df[f"inlet_t-{lag}"] = df["Inlet_Temperature(°C)"].shift(lag)
        df[f"cooling_power_t-{lag}"] = df["Cooling_Unit_Power_Consumption(kW)"].shift(lag)
        df[f"chiller_usage_t-{lag}"] = df["Chiller_Usage(%)"].shift(lag)
        df[f"ahu_usage_t-{lag}"] = df["AHU_Usage(%)"].shift(lag)
        df[f"ambient_t-{lag}"] = df["Ambient_Temperature(°C)"].shift(lag)
        

    df["workload_rolling_mean_6"] = df["Server_Workload(%)"].rolling(window=6).mean()
    df["workload_rolling_mean_24"] = df["Server_Workload(%)"].rolling(window=24).mean()
    
    df["workload_roll_std_6"] = df["Server_Workload(%)"].rolling(window=6).std()
    df["workload_roll_std_24"] = df["Server_Workload(%)"].rolling(window=24).std()
    
    df["outlet_rolling_mean_6"] = df["Outlet_Temperature(°C)"].rolling(window=6).mean()
    df["outlet_rolling_mean_24"] = df["Outlet_Temperature(°C)"].rolling(window=24).mean()
    
    df["outlet_roll_std_6"] = df["Outlet_Temperature(°C)"].rolling(window=6).std()
    df["outlet_roll_std_24"] = df["Outlet_Temperature(°C)"].rolling(window=24).std()
    
    df["inlet_rolling_mean_6"] = df["Inlet_Temperature(°C)"].rolling(window=6).mean()
    df["inlet_rolling_mean_24"] = df["Inlet_Temperature(°C)"].rolling(window=24).mean()
    
    df["inlet_roll_std_6"] = df["Inlet_Temperature(°C)"].rolling(window=6).std()
    df["inlet_roll_std_24"] = df["Inlet_Temperature(°C)"].rolling(window=24).std()
    
    df["cooling_power_rolling_mean_6"] = df["Cooling_Unit_Power_Consumption(kW)"].rolling(window=6).mean()
    df["cooling_power_rolling_mean_24"] = df["Cooling_Unit_Power_Consumption(kW)"].rolling(window=24).mean()
    
    df["cooling_power_roll_std_6"] = df["Cooling_Unit_Power_Consumption(kW)"].rolling(window=6).std()
    df["cooling_power_roll_std_24"] = df["Cooling_Unit_Power_Consumption(kW)"].rolling(window=24).std()
    
    df["chiller_usage_rolling_mean_6"] = df["Chiller_Usage(%)"].rolling(window=6).mean()
    df["chiller_usage_rolling_mean_24"] = df["Chiller_Usage(%)"].rolling(window=24).mean()
    
    df["chiller_usage_roll_std_6"] = df["Chiller_Usage(%)"].rolling(window=6).std()
    df["chiller_usage_roll_std_24"] = df["Chiller_Usage(%)"].rolling(window=24).std()
    
    df["ahu_usage_rolling_mean_6"] = df["AHU_Usage(%)"].rolling(window=6).mean()
    df["ahu_usage_rolling_mean_24"] = df["AHU_Usage(%)"].rolling(window=24).mean()
    
    df["ahu_usage_roll_std_6"] = df["AHU_Usage(%)"].rolling(window=6).std()
    df["ahu_usage_roll_std_24"] = df["AHU_Usage(%)"].rolling(window=24).std()
    
    df["ambient_rolling_mean_6"] = df["Ambient_Temperature(°C)"].rolling(6).mean()
    df["ambient_rolling_mean_24"] = df["Ambient_Temperature(°C)"].rolling(24).mean()
        

    Cp = 4.18  # kJ/kg·K — adjust if liquid cooling fluid differs
    mass_flow = 1.0  # kg/s — set to your actual flow rate or treat as constant

    df["delta_T"] = df["Outlet_Temperature(°C)"] - df["Inlet_Temperature(°C)"]
    df["Q_kW"] = mass_flow * Cp * df["delta_T"]

    # Time encodings
    df["hour"] = (df["Timestamp"] - 1) % 24  # if Timestamp is 1-indexed hourly
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["dow"] = ((df["Timestamp"] - 1) // 24) % 7
    df["dow_sin"] = np.sin(2 * np.pi * df["dow"] / 7)
    df["dow_cos"] = np.cos(2 * np.pi * df["dow"] / 7)
    
    
    
    
    
    
    
    
    df["workload_t-168"] = df["Server_Workload(%)"].shift(168)
    df["outlet_t-168"] = df["Outlet_Temperature(°C)"].shift(168)
    df["Q_roll_mean_6"] = df["Q_kW"].rolling(6).mean()
    df["Q_roll_mean_24"] = df["Q_kW"].rolling(24).mean()
    df["Q_t-1"] = df["Q_kW"].shift(1)
    df["Q_t-6"] = df["Q_kW"].shift(6)
    df["Q_t-24"] = df["Q_kW"].shift(24)
    

    # Target — total recoverable heat over next K hours
    K = 1
    df["target"] = df["Q_kW"].shift(-1).rolling(K).sum().shift(-(K-1))
    df = df.iloc[:-K]  # drop last K rows with no valid target

    df.dropna(inplace=True)
    
    
    
    
    drop_cols = ["target", "Q_kW", "delta_T", "hour", "dow", "Timestamp", "Cooling_Strategy_Action", "Total_Energy_Cost($)", "Output"]
    

    
    X = df.drop(columns=drop_cols)
    y = df["target"]

    print(X.columns.tolist())    
    
    print(f"Mean target: {y.mean():.2f} kWh")
    print(f"Std target: {y.std():.2f} kWh")
    

    
    print("$$$$$$ Feature engineering complete. $$$$$$")
    
    tscv = TimeSeriesSplit(n_splits=5)
    
    maes = []
    
    param_grid = {
        "n_estimators": [300, 500, 1000],
        "max_depth": [3, 5, 7],
        "learning_rate": [0.01, 0.05, 0.1],
        "subsample": [0.7, 0.8, 1.0],
        "colsample_bytree": [0.7, 0.8, 1.0],
    }
    
    from sklearn.model_selection import RandomizedSearchCV
    
    
    model = xgb.XGBRegressor(random_state=42)
    
    search = RandomizedSearchCV(
        model, param_grid, n_iter=30,
        cv=tscv, scoring="neg_mean_absolute_error",
        random_state=42, verbose=1
    )
    
    
    search.fit(X, y)
    print("Best params:", search.best_params_)

    # then use best params for final model
    final_model = xgb.XGBRegressor(**search.best_params_, random_state=42)
    final_model.fit(X, y)
    
    print("$$$$$$ Final model trained on full data. $$$$$$")
    
    
    results = pd.DataFrame(search.cv_results_)
    results["mean_mae"] = -results["mean_test_score"]
    results["std_mae"] = results["std_test_score"]

    print(results[["params", "mean_mae", "std_mae"]].sort_values("mean_mae").to_string())

    # --- feature importance ---
    xgb.plot_importance(final_model, max_num_features=30)
    plt.tight_layout()
    plt.savefig("feature_importance.png")
    
    explainer = shap.Explainer(final_model)
    shap_values = explainer(X)
    shap.summary_plot(shap_values, X, max_display=20)

    # --- save model ---
    final_model.save_model("heat_model.json")



def forward_predict(model, X_new):
    return model.predict(X_new)
    


if __name__ == "__main__":
    
    
    main()
    