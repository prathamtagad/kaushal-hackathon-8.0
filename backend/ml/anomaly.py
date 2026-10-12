import math
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.models import Anomaly

class AnomalyDetector:
    def __init__(self):
        self.active_anomalies: Dict[str, Anomaly] = {}
        # Consecutive counters
        self.phantom_counts: Dict[str, int] = {"hostel": 0, "library": 0, "labs": 0, "admin": 0}
        self.tank_leak_counter: int = 0
        self.last_tank_level: Optional[float] = None

    def check_tick(
        self,
        sim_time_iso: str,
        zone_states: Dict[str, Any],
        tank_level_kl: float,
        pump_active: bool,
        pump_flow_kl_per_h: float,
        total_occupancies: Dict[str, int],
        dt_hours: float = 0.25
    ) -> List[Anomaly]:
        """
        Runs phantom load and tank leak anomaly detection algorithms.
        """
        newly_detected: List[Anomaly] = []

        # 1. Phantom Load Detection
        # Rule: occupancy < 5% of max capacity and load > 2.0x night baseline for 3 consecutive ticks
        night_baselines = {"hostel": 80.0, "library": 30.0, "labs": 95.0, "admin": 25.0}
        max_occupancies = {"hostel": 800, "library": 400, "labs": 350, "admin": 150}

        for zid, zstate in zone_states.items():
            occ = total_occupancies.get(zid, 0)
            max_occ = max_occupancies.get(zid, 200)
            occ_pct = occ / max(1, max_occ)
            current_kw = getattr(zstate, "current_load_kw", 0.0) if hasattr(zstate, "current_load_kw") else zstate.get("current_load_kw", 0.0)
            night_base = night_baselines.get(zid, 40.0)

            # Trigger condition
            if occ_pct < 0.05 and current_kw > (1.8 * night_base):
                self.phantom_counts[zid] += 1
                if self.phantom_counts[zid] >= 3:
                    anomaly_id = f"anom-phantom-{zid}"
                    waste_kw = round(current_kw - night_base, 1)
                    if anomaly_id not in self.active_anomalies:
                        anom = Anomaly(
                            anomaly_id=anomaly_id,
                            zone_id=zid,
                            kind="phantom_load",
                            est_waste_kw=waste_kw,
                            since=sim_time_iso,
                            message=f"Phantom Load in {zid.capitalize()}: {waste_kw} kW drawing with near-zero occupancy ({occ} occupants). Lights/HVAC stuck on."
                        )
                        self.active_anomalies[anomaly_id] = anom
                        newly_detected.append(anom)
            else:
                self.phantom_counts[zid] = max(0, self.phantom_counts[zid] - 1)
                anomaly_id = f"anom-phantom-{zid}"
                if anomaly_id in self.active_anomalies and self.phantom_counts[zid] == 0:
                    del self.active_anomalies[anomaly_id]

        # 2. Tank Leak Detection
        # Compare observed tank delta to expected inflow/outflow
        if self.last_tank_level is not None:
            observed_delta_kl = tank_level_kl - self.last_tank_level
            expected_inflow_kl = (pump_flow_kl_per_h * dt_hours) if pump_active else 0.0
            
            # Expected normal demand ~ 5-10 kL per hour -> ~1.5 - 2.5 kL per tick
            hostel_occ = total_occupancies.get("hostel", 500)
            other_occ = sum(occ for z, occ in total_occupancies.items() if z != "hostel")
            expected_outflow_kl = (((hostel_occ * 25.0) + (other_occ * 5.0)) / 1000.0) * dt_hours
            expected_delta_kl = expected_inflow_kl - expected_outflow_kl

            residual_drop_kl = expected_delta_kl - observed_delta_kl
            residual_drop_per_h = residual_drop_kl / dt_hours

            # If residual drop > 3.0 kL/h for 3 ticks
            if residual_drop_per_h > 3.0:
                self.tank_leak_counter += 1
                if self.tank_leak_counter >= 3:
                    anomaly_id = "anom-tank-leak"
                    if anomaly_id not in self.active_anomalies:
                        anom = Anomaly(
                            anomaly_id=anomaly_id,
                            zone_id="pumping",
                            kind="tank_leak",
                            est_leak_kl_per_h=round(residual_drop_per_h, 1),
                            since=sim_time_iso,
                            message=f"Subsurface Tank Leak: Unaccounted loss rate of {residual_drop_per_h:.1f} kL/h detected in distribution line."
                        )
                        self.active_anomalies[anomaly_id] = anom
                        newly_detected.append(anom)
            else:
                self.tank_leak_counter = max(0, self.tank_leak_counter - 1)
                if "anom-tank-leak" in self.active_anomalies and self.tank_leak_counter == 0:
                    del self.active_anomalies["anom-tank-leak"]

        self.last_tank_level = tank_level_kl
        return newly_detected

    def resolve_anomaly(self, anomaly_id: str):
        if anomaly_id in self.active_anomalies:
            del self.active_anomalies[anomaly_id]

    def get_active(self) -> List[Anomaly]:
        return list(self.active_anomalies.values())

anomaly_detector = AnomalyDetector()
