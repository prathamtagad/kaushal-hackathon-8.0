import os
from pydantic import BaseModel
from datetime import datetime

class CampusConfig(BaseModel):
    SEED: int = int(os.getenv("SEED", "42"))
    TICK_MINUTES: int = int(os.getenv("TICK_MINUTES", "15"))
    SIM_SPEED_SECONDS_PER_SIM_HOUR: float = float(os.getenv("SIM_SPEED_SECONDS_PER_SIM_HOUR", "3.0"))
    SIM_START: str = os.getenv("SIM_START", "2026-10-12T06:00:00")  # Monday 06:00
    LATITUDE: float = float(os.getenv("LATITUDE", "22.7196"))
    LONGITUDE: float = float(os.getenv("LONGITUDE", "75.8577"))
    LOCATION_NAME: str = os.getenv("LOCATION_NAME", "Indore")
    
    GRID_CAP_KW: float = float(os.getenv("GRID_CAP_KW", "850.0"))
    SOLAR_PEAK_KW: float = float(os.getenv("SOLAR_PEAK_KW", "250.0"))
    
    # Tariffs in INR / kWh
    TARIFF_PEAK_INR: float = float(os.getenv("TARIFF_PEAK_INR", "9.0"))
    TARIFF_NORMAL_INR: float = float(os.getenv("TARIFF_NORMAL_INR", "7.0"))
    TARIFF_OFFPEAK_INR: float = float(os.getenv("TARIFF_OFFPEAK_INR", "5.5"))
    
    GRID_EMISSION_FACTOR: float = float(os.getenv("GRID_EMISSION_FACTOR", "0.82")) # kg CO2/kWh
    NEGOTIATION_TRIGGER_HORIZON_H: int = int(os.getenv("NEGOTIATION_TRIGGER_HORIZON_H", "2"))
    
    LLM_TIMEOUT_S: float = float(os.getenv("LLM_TIMEOUT_S", "8.0"))
    LLM_RETRIES: int = int(os.getenv("LLM_RETRIES", "1"))
    LLM_MODE: str = os.getenv("LLM_MODE", "mock") # "mock" | "live"
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini") # "gemini" | "openai" | "anthropic" | "mock"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    AUTO_APPROVE: bool = os.getenv("AUTO_APPROVE", "false").lower() in ("true", "1", "yes")
    
    TANK_CAPACITY_KL: float = float(os.getenv("TANK_CAPACITY_KL", "300.0"))
    TANK_MIN_RESERVE_PCT: float = float(os.getenv("TANK_MIN_RESERVE_PCT", "30.0"))
    TANK_EXAM_RESERVE_PCT: float = float(os.getenv("TANK_EXAM_RESERVE_PCT", "40.0"))
    PUMP_POWER_KW: float = float(os.getenv("PUMP_POWER_KW", "45.0"))
    PUMP_FLOW_KL_PER_H: float = float(os.getenv("PUMP_FLOW_KL_PER_H", "40.0"))

settings = CampusConfig()

def get_tariff(hour: int) -> float:
    """Peak: 11:00-15:00 and 18:00-22:00. Off-peak: 22:00-06:00. Normal otherwise."""
    if (11 <= hour < 15) or (18 <= hour < 22):
        return settings.TARIFF_PEAK_INR
    elif (hour >= 22) or (hour < 6):
        return settings.TARIFF_OFFPEAK_INR
    else:
        return settings.TARIFF_NORMAL_INR
