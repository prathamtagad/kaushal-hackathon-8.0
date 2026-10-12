from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.config import settings

class WaterModel:
    def __init__(self, capacity_kl: float = 300.0, initial_level_kl: float = 220.0):
        self.capacity_kl = capacity_kl
        self.level_kl = initial_level_kl
        self.pump_active = False
        self.pump_kw = settings.PUMP_POWER_KW  # 45 kW
        self.pump_rate_kl_per_h = settings.PUMP_FLOW_KL_PER_H  # 40 kL/h
        self.leak_rate_kl_per_h = 0.0
        self.cumulative_leak_litres = 0.0
        self.isolated_leak = False

    def update_tick(
        self,
        dt_hours: float,
        occupancies: Dict[str, int],
        is_managed: bool,
        tariff_inr: float,
        solar_kw: float,
        exam_week: bool,
        pump_override: Optional[bool] = None,
        tank_leak_active: bool = False
    ) -> Dict[str, Any]:
        """
        Advances the water model by dt_hours (0.25 h for 15 min).
        Returns current water status.
        """
        # Occupancy demand: hostel dominant (~25 L/person/h), other zones ~5 L/person/h
        hostel_occ = occupancies.get("hostel", 0)
        other_occ = sum(occ for zid, occ in occupancies.items() if zid != "hostel")
        
        # Outflow in Litres/hour -> convert to kL/hour
        demand_l_per_h = (hostel_occ * 25.0) + (other_occ * 5.0)
        demand_kl_per_h = demand_l_per_h / 1000.0
        
        # Tank leak scenario (6 kL/h)
        if tank_leak_active and not self.isolated_leak:
            self.leak_rate_kl_per_h = 6.0
        else:
            self.leak_rate_kl_per_h = 0.0

        outflow_kl = (demand_kl_per_h + self.leak_rate_kl_per_h) * dt_hours
        self.cumulative_leak_litres += (self.leak_rate_kl_per_h * dt_hours) * 1000.0

        min_reserve_pct = settings.TANK_EXAM_RESERVE_PCT if exam_week else settings.TANK_MIN_RESERVE_PCT
        min_reserve_kl = self.capacity_kl * (min_reserve_pct / 100.0)

        # Pump control logic
        if pump_override is not None:
            # Explicit override from BMS or agent deal
            self.pump_active = pump_override
        elif not is_managed:
            # Baseline rule: on < 60% (180 kL), off > 90% (270 kL)
            if self.level_kl < (self.capacity_kl * 0.60):
                self.pump_active = True
            elif self.level_kl > (self.capacity_kl * 0.90):
                self.pump_active = False
        else:
            # Managed rule:
            # 1. Hard floor: if level < min_reserve + 15 kL, must pump
            if self.level_kl < (min_reserve_kl + 15.0):
                self.pump_active = True
            # 2. If tank is full (> 95%), turn off
            elif self.level_kl > (self.capacity_kl * 0.95):
                self.pump_active = False
            # 3. Off-peak tariff (< 6.0 INR) or solar surplus (> 120 kW): opportunity fill
            elif tariff_inr <= settings.TARIFF_OFFPEAK_INR or solar_kw > 120.0:
                if self.level_kl < (self.capacity_kl * 0.88):
                    self.pump_active = True
            # 4. During peak tariff (> 8.0 INR), defer pumping if safely above reserve
            elif tariff_inr >= settings.TARIFF_PEAK_INR:
                if self.level_kl > (min_reserve_kl + 20.0):
                    self.pump_active = False

        inflow_kl = (self.pump_rate_kl_per_h * dt_hours) if self.pump_active else 0.0
        self.level_kl = max(0.0, min(self.capacity_kl, self.level_kl + inflow_kl - outflow_kl))

        active_pump_kw = self.pump_kw if self.pump_active else 0.0

        return {
            "level_kl": round(self.level_kl, 2),
            "level_pct": round((self.level_kl / self.capacity_kl) * 100.0, 1),
            "pump_active": self.pump_active,
            "pump_kw": active_pump_kw,
            "demand_kl_per_h": round(demand_kl_per_h, 2),
            "leak_rate_kl_per_h": round(self.leak_rate_kl_per_h, 2),
            "cumulative_leak_litres": round(self.cumulative_leak_litres, 1),
            "isolated_leak": self.isolated_leak
        }

    def project_deferral_headroom(
        self,
        window_hours: float,
        current_occupancies: Dict[str, int],
        exam_week: bool
    ) -> float:
        """
        Projects how many kW of pump load can be shed/deferred over window_hours
        while ensuring the tank stays >= TANK_MIN_RESERVE_PCT.
        Returns max pump shed kW (0 or 45 kW).
        """
        min_reserve_pct = settings.TANK_EXAM_RESERVE_PCT if exam_week else settings.TANK_MIN_RESERVE_PCT
        min_reserve_kl = self.capacity_kl * (min_reserve_pct / 100.0)

        # Expected demand over window
        hostel_occ = current_occupancies.get("hostel", 0)
        other_occ = sum(occ for zid, occ in current_occupancies.items() if zid != "hostel")
        demand_kl_per_h = ((hostel_occ * 25.0) + (other_occ * 5.0)) / 1000.0
        expected_drop_kl = demand_kl_per_h * window_hours

        projected_level = self.level_kl - expected_drop_kl
        if projected_level >= min_reserve_kl:
            # We can safely shut off the pump (shed full 45 kW)
            return self.pump_kw
        else:
            return 0.0
