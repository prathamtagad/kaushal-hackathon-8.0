import math
import random
from typing import Dict, Any, List
from backend.config import settings, get_tariff

class ImpactLedger:
    def __init__(self):
        self.kwh_saved: float = 0.0
        self.inr_saved: float = 0.0
        self.co2_kg_saved: float = 0.0
        self.litres_saved: float = 0.0
        self.peak_baseline_kw: float = 0.0
        self.peak_managed_kw: float = 0.0
        self.phantom_kwh_eliminated: float = 0.0
        
        # Time-series history for chart
        self.history: List[Dict[str, Any]] = []

    def reset(self):
        self.kwh_saved = 0.0
        self.inr_saved = 0.0
        self.co2_kg_saved = 0.0
        self.litres_saved = 0.0
        self.peak_baseline_kw = 0.0
        self.peak_managed_kw = 0.0
        self.phantom_kwh_eliminated = 0.0
        self.history.clear()

    def record_tick(
        self,
        sim_time_iso: str,
        sim_hour: int,
        baseline_import_kw: float,
        managed_import_kw: float,
        baseline_leak_l: float,
        managed_leak_l: float,
        grid_cap_kw: float,
        waste_eliminated_kw: float = 0.0
    ) -> Dict[str, Any]:
        """
        Updates ledger metrics comparing baseline vs managed twin for this tick.
        """
        dt_hours = settings.TICK_MINUTES / 60.0  # 0.25 h
        tariff = get_tariff(sim_hour)
        
        # Track peaks
        self.peak_baseline_kw = max(self.peak_baseline_kw, baseline_import_kw)
        self.peak_managed_kw = max(self.peak_managed_kw, managed_import_kw)
        
        # kWh & INR delta
        delta_kw = baseline_import_kw - managed_import_kw
        tick_kwh_saved = max(0.0, delta_kw * dt_hours)
        tick_inr_saved = tick_kwh_saved * tariff
        
        self.kwh_saved += tick_kwh_saved
        self.inr_saved += tick_inr_saved
        self.co2_kg_saved += tick_kwh_saved * settings.GRID_EMISSION_FACTOR
        
        # Litres saved
        self.litres_saved = max(0.0, baseline_leak_l - managed_leak_l)
        
        # Phantom load eliminated
        if waste_eliminated_kw > 0:
            self.phantom_kwh_eliminated += waste_eliminated_kw * dt_hours

        point = {
            "time": sim_time_iso,
            "baseline_import_kw": round(baseline_import_kw, 1),
            "managed_import_kw": round(managed_import_kw, 1),
            "grid_cap_kw": round(grid_cap_kw, 1)
        }
        self.history.append(point)
        if len(self.history) > 288:  # 3 days of 15m ticks
            self.history.pop(0)

        return self.get_summary()

    def get_summary(self) -> Dict[str, Any]:
        peak_reduction = max(0.0, self.peak_baseline_kw - self.peak_managed_kw)
        return {
            "kwh_saved": round(self.kwh_saved, 1),
            "inr_saved": round(self.inr_saved, 0),
            "co2_kg_saved": round(self.co2_kg_saved, 1),
            "litres_saved": round(self.litres_saved, 0),
            "peak_kw_reduced": round(peak_reduction, 1),
            "phantom_kwh_eliminated": round(self.phantom_kwh_eliminated, 1)
        }

    def compute_confidence_band(self, remaining_ticks: int = 40) -> Dict[str, Any]:
        """
        Runs N=20 fast simulations of remaining ticks with ±5% noise
        to project end-of-day p10 / p50 / p90 for INR and kWh savings.
        """
        rng = random.Random(settings.SEED + len(self.history))
        current_kwh = self.kwh_saved
        current_inr = self.inr_saved
        
        # Estimate average savings per tick from recent history
        recent = self.history[-12:] if len(self.history) >= 12 else self.history
        if recent:
            recent_deltas = [max(0.0, p["baseline_import_kw"] - p["managed_import_kw"]) for p in recent]
            avg_kw_delta = sum(recent_deltas) / len(recent_deltas)
        else:
            avg_kw_delta = 25.0  # nominal default

        kwh_samples = []
        inr_samples = []
        
        for _ in range(20):
            sim_kwh = current_kwh
            sim_inr = current_inr
            for t in range(remaining_ticks):
                # ±5% perturbation
                noise = rng.uniform(0.95, 1.05)
                projected_kw = max(0.0, avg_kw_delta * noise)
                step_kwh = projected_kw * (settings.TICK_MINUTES / 60.0)
                sim_kwh += step_kwh
                sim_inr += step_kwh * settings.TARIFF_NORMAL_INR
            kwh_samples.append(sim_kwh)
            inr_samples.append(sim_inr)

        kwh_samples.sort()
        inr_samples.sort()
        
        # p10, p50, p90
        p10_idx = int(0.10 * len(kwh_samples))
        p50_idx = int(0.50 * len(kwh_samples))
        p90_idx = int(0.90 * len(kwh_samples))
        
        return {
            "kwh": {
                "p10": round(kwh_samples[p10_idx], 1),
                "p50": round(kwh_samples[p50_idx], 1),
                "p90": round(kwh_samples[p90_idx], 1)
            },
            "inr": {
                "p10": round(inr_samples[p10_idx], 0),
                "p50": round(inr_samples[p50_idx], 0),
                "p90": round(inr_samples[p90_idx], 0)
            }
        }

impact_ledger = ImpactLedger()
