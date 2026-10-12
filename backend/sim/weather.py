import json
import math
import os
from datetime import datetime, timedelta
from typing import Tuple, List, Dict, Any
from backend.config import settings

WEATHER_CACHE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "weather_cache.json")

class WeatherService:
    def __init__(self):
        self.cached_data: Dict[str, Any] = {}
        self.source: str = "cached"
        self._load_cache()

    def _load_cache(self):
        if os.path.exists(WEATHER_CACHE_PATH):
            try:
                with open(WEATHER_CACHE_PATH, "r", encoding="utf-8") as f:
                    self.cached_data = json.load(f)
                    self.source = "cached"
                    return
            except Exception:
                pass
        self.source = "synthetic"

    def get_weather(self, sim_time: datetime, temp_offset: float = 0.0) -> Tuple[float, float]:
        """
        Returns (temp_c, shortwave_radiation_w_m2) for the given simulation time,
        applying any scenario temperature offset (e.g. +8C for heatwave).
        """
        # If cache contains data, match by day-of-week and hour
        if self.cached_data and "hourly" in self.cached_data:
            hourly = self.cached_data["hourly"]
            times = hourly.get("time", [])
            temps = hourly.get("temperature_2m", [])
            rads = hourly.get("shortwave_radiation", [])
            
            if times and temps:
                # Map simulation hour to cache index
                # Cache has 72 hours (3 days)
                total_hours = len(times)
                hour_idx = ((sim_time.weekday() * 24) + sim_time.hour) % total_hours
                
                base_temp = float(temps[hour_idx])
                # Interp within the 15-minute tick
                next_idx = (hour_idx + 1) % total_hours
                minute_frac = sim_time.minute / 60.0
                interpolated_temp = base_temp + minute_frac * (float(temps[next_idx]) - base_temp)
                
                base_rad = float(rads[hour_idx]) if hour_idx < len(rads) else 0.0
                next_rad = float(rads[next_idx]) if next_idx < len(rads) else 0.0
                interpolated_rad = max(0.0, base_rad + minute_frac * (next_rad - base_rad))
                
                return (round(interpolated_temp + temp_offset, 2), round(interpolated_rad, 1))

        # Synthetic fallback: sinusoid 22-35C, peak at 14:00
        hour_float = sim_time.hour + sim_time.minute / 60.0
        # Peak at hour 14 (phase shift: (hour - 14) * 2pi / 24)
        t_phase = (hour_float - 14.0) * (2.0 * math.pi / 24.0)
        # Midpoint 28.5C, amplitude 6.5C -> range 22.0 to 35.0C
        synthetic_temp = 28.5 + 6.5 * math.cos(t_phase)
        
        # Irradiance: 0 at night (before 06:00 and after 18:30), peak 920 W/m2 at 12:30
        if 6.0 <= hour_float <= 18.5:
            sol_phase = (hour_float - 12.25) / 6.25 * (math.pi / 2.0)
            synthetic_rad = max(0.0, 920.0 * math.cos(sol_phase))
        else:
            synthetic_rad = 0.0

        return (round(synthetic_temp + temp_offset, 2), round(synthetic_rad, 1))

    def get_forecast_24h(self, start_time: datetime, temp_offset: float = 0.0) -> List[Dict[str, Any]]:
        """Returns next 24 hourly weather forecasts."""
        forecast = []
        for h in range(24):
            t = start_time + timedelta(hours=h)
            temp, rad = self.get_weather(t, temp_offset)
            forecast.append({
                "time": t.strftime("%Y-%m-%dT%H:00:00"),
                "temp_c": temp,
                "solar_radiation": rad
            })
        return forecast

weather_service = WeatherService()
