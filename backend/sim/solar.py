from backend.config import settings

def calculate_solar_kw(shortwave_radiation_w_m2: float) -> float:
    """
    Computes solar PV output from shortwave irradiance (W/m^2).
    Peak 250 kW at 1000 W/m^2.
    """
    irradiance_factor = min(1.0, max(0.0, shortwave_radiation_w_m2 / 1000.0))
    return round(settings.SOLAR_PEAK_KW * irradiance_factor, 2)
