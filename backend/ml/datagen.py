import os
import math
import random
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from backend.config import settings
from backend.sim.zones import ZONE_DEFINITIONS
from backend.sim.weather import weather_service
from backend.sim.solar import calculate_solar_kw

HISTORY_PARQUET_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "history.parquet")

def generate_synthetic_history(days: int = 60) -> pd.DataFrame:
    """
    Generates 60 days of hourly simulated history across all zones for training LightGBM.
    """
    start_date = datetime(2026, 8, 1, 0, 0, 0)
    rng = random.Random(settings.SEED)
    records = []

    # Precompute 168h baseline occupancy profiles
    occupancy_profiles = {
        "hostel": [
            760, 780, 790, 795, 790, 770, 720, 620, 450, 280, 180, 150,
            220, 260, 190, 170, 210, 320, 480, 620, 700, 740, 760, 760
        ],
        "library": [
            15, 5, 0, 0, 0, 0, 10, 40, 120, 220, 280, 310,
            290, 250, 300, 330, 340, 310, 260, 220, 180, 140, 80, 35
        ],
        "labs": [
            5, 5, 0, 0, 0, 0, 0, 10, 60, 180, 240, 270,
            260, 220, 280, 290, 270, 220, 140, 80, 50, 30, 20, 10
        ],
        "admin": [
            0, 0, 0, 0, 0, 0, 5, 20, 60, 110, 125, 130,
            110, 95, 130, 125, 115, 80, 40, 20, 10, 5, 0, 0
        ]
    }

    total_hours = days * 24
    for h in range(total_hours):
        dt = start_date + timedelta(hours=h)
        dow = dt.weekday()
        hour = dt.hour
        
        # Weather
        temp_c, sol_rad = weather_service.get_weather(dt)
        solar_kw = calculate_solar_kw(sol_rad)
        
        # Exam week occurs in days 35-42
        is_exam = 35 <= (h // 24) <= 42

        for zid, zdef in ZONE_DEFINITIONS.items():
            base_occ = occupancy_profiles[zid][hour]
            if dow >= 5:  # Weekend
                base_occ = int(base_occ * 0.4 if zid != "hostel" else base_occ * 1.05)
            if is_exam:
                if zid == "hostel": base_occ = int(base_occ * 1.25)
                elif zid == "library": base_occ = int(base_occ * 1.50)

            occ_ratio = min(1.0, max(0.0, base_occ / zdef["max_occupancy"]))
            
            # Physics load synthesis
            critical = zdef["base_critical_kw"]
            lighting = zdef["nominal_lighting_kw"] * (0.2 + 0.8 * occ_ratio * (1.0 - min(0.6, sol_rad / 1200.0)))
            
            # HVAC
            cooling_delta = max(0.0, temp_c - 24.0)
            hvac_factor = 0.3 + 0.7 * (1.0 + cooling_delta * 0.12) * (0.3 + 0.7 * occ_ratio)
            hvac = zdef["nominal_hvac_kw"] * hvac_factor
            
            # Flex
            flex = zdef["nominal_flexible_kw"] * (0.4 + 0.6 * occ_ratio)
            
            # Seeded noise
            noise = rng.uniform(-0.03, 0.03)
            load_kw = round((critical + lighting + hvac + flex) * (1.0 + noise), 2)

            records.append({
                "timestamp": dt,
                "zone": zid,
                "hour": hour,
                "day_of_week": dow,
                "temp_c": temp_c,
                "solar_kw": solar_kw,
                "planned_occupancy": base_occ,
                "is_exam_week": int(is_exam),
                "load_kw": load_kw
            })

    df = pd.DataFrame(records)
    
    # Generate lag features per zone
    df.sort_values(["zone", "timestamp"], inplace=True)
    df["lag_24h"] = df.groupby("zone")["load_kw"].shift(24).bfill()
    df["lag_168h"] = df.groupby("zone")["load_kw"].shift(168).bfill()
    
    # Save to parquet
    os.makedirs(os.path.dirname(HISTORY_PARQUET_PATH), exist_ok=True)
    df.to_parquet(HISTORY_PARQUET_PATH, index=False)
    return df

if __name__ == "__main__":
    generate_synthetic_history(60)
