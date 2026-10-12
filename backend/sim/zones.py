import math
import random
from typing import Dict, Any, List, Optional
from backend.config import settings

ZONE_DEFINITIONS = {
    "hostel": {
        "name": "Hostels Block (A-D)",
        "capacity_kw": 460.0,
        "base_critical_kw": 45.0,
        "nominal_lighting_kw": 30.0,
        "nominal_hvac_kw": 150.0,
        "nominal_flexible_kw": 40.0,
        "max_occupancy": 800,
        "constraints": {
            "hvac_max_shed_pct": 0.30,
            "hvac_exam_shed_pct": 0.15,
            "lighting_max_shed_pct": 0.25,
            "flexible_max_shed_pct": 0.80,
            "max_temp_c": 28.0
        }
    },
    "library": {
        "name": "Central Library & Study Halls",
        "capacity_kw": 240.0,
        "base_critical_kw": 18.0,
        "nominal_lighting_kw": 25.0,
        "nominal_hvac_kw": 70.0,
        "nominal_flexible_kw": 15.0,
        "max_occupancy": 400,
        "constraints": {
            "hvac_max_shed_pct": 0.25,
            "hvac_exam_shed_pct": 0.10,
            "lighting_max_shed_pct": 0.30,
            "flexible_max_shed_pct": 0.50,
            "max_temp_c": 27.0  # reading hall comfort floor
        }
    },
    "labs": {
        "name": "Engineering & Computing Labs",
        "capacity_kw": 260.0,
        "base_critical_kw": 65.0,  # critical servers & research rigs
        "nominal_lighting_kw": 20.0,
        "nominal_hvac_kw": 65.0,
        "nominal_flexible_kw": 35.0,
        "max_occupancy": 350,
        "constraints": {
            "hvac_max_shed_pct": 0.20,
            "hvac_exam_shed_pct": 0.20,
            "lighting_max_shed_pct": 0.20,
            "flexible_max_shed_pct": 0.50,
            "max_temp_c": 28.5
        }
    },
    "admin": {
        "name": "Administration & Auditorium",
        "capacity_kw": 130.0,
        "base_critical_kw": 18.0,
        "nominal_lighting_kw": 18.0,
        "nominal_hvac_kw": 45.0,
        "nominal_flexible_kw": 18.0,
        "max_occupancy": 150,
        "constraints": {
            "hvac_max_shed_pct": 0.40,
            "hvac_exam_shed_pct": 0.40,
            "lighting_max_shed_pct": 0.50,
            "flexible_max_shed_pct": 0.60,
            "max_temp_c": 29.0
        }
    }
}

class ZoneModel:
    def __init__(self, zone_id: str, seed: int = 42):
        self.zone_id = zone_id
        self.def_info = ZONE_DEFINITIONS[zone_id]
        self.name = self.def_info["name"]
        self.capacity_kw = self.def_info["capacity_kw"]
        self.rng = random.Random(seed + hash(zone_id) % 10000)
        
        # Interventions / levers
        self.setpoint_offset_c = 0.0
        self.lighting_shed_kw = 0.0
        self.flexible_shed_kw = 0.0
        self.rebound_queue: List[Dict[str, float]] = []  # [{remaining_ticks: int, kw: float}]
        self.phantom_load_active = False

    def reset_interventions(self):
        self.setpoint_offset_c = 0.0
        self.lighting_shed_kw = 0.0
        self.flexible_shed_kw = 0.0

    def apply_deal_allocation(self, lever: str, shed_kw: float, setpoint_offset_c: Optional[float] = None, duration_ticks: int = 8):
        if lever == "hvac":
            if setpoint_offset_c is not None:
                self.setpoint_offset_c = min(3.0, max(0.0, setpoint_offset_c))
            else:
                # ~6% HVAC reduction per 1 deg C
                # approx offset = shed_kw / (current_hvac * 0.06)
                self.setpoint_offset_c = min(3.0, max(0.5, shed_kw / 12.0))
            # 20% rebound for HVAC over next 2 hours (8 ticks)
            rebound_kw = (shed_kw * 0.20) / max(1, duration_ticks)
            self.rebound_queue.append({"remaining_ticks": duration_ticks, "kw": rebound_kw})
        elif lever == "lighting":
            self.lighting_shed_kw = shed_kw
        elif lever == "flexible":
            self.flexible_shed_kw = shed_kw
            # 100% rebound for deferred flexible over next 2 hours
            rebound_kw = (shed_kw * 1.0) / max(1, duration_ticks)
            self.rebound_queue.append({"remaining_ticks": duration_ticks, "kw": rebound_kw})

    def calculate_tick_load(
        self,
        sim_hour: float,
        temp_c: float,
        solar_radiation: float,
        occupancy: int,
        is_exam_week: bool,
        apply_shed: bool = True
    ) -> Dict[str, Any]:
        """
        Calculates the electrical load components for this zone for the tick.
        """
        max_occ = self.def_info["max_occupancy"]
        occ_ratio = min(1.0, max(0.0, occupancy / max(1, max_occ)))
        
        # 1. Critical Base
        critical_kw = self.def_info["base_critical_kw"]
        
        # 2. Lighting: scaled by occupancy and daylight
        # daylight factor: high at night, lower during midday when solar irradiance is high
        daylight_factor = 1.0 - min(0.6, solar_radiation / 1200.0)
        nominal_lighting = self.def_info["nominal_lighting_kw"]
        lighting_kw = nominal_lighting * (0.2 + 0.8 * occ_ratio * daylight_factor)
        if apply_shed and self.lighting_shed_kw > 0:
            lighting_kw = max(nominal_lighting * 0.2, lighting_kw - self.lighting_shed_kw)
            
        # 3. HVAC: rises piecewise above 24C, scaled by occupancy
        nominal_hvac = self.def_info["nominal_hvac_kw"]
        effective_temp = max(24.0, temp_c)
        cooling_degree_delta = effective_temp - 24.0
        # Temp factor: 1.0 at 24C, +20% per deg C above 24C
        hvac_factor = 0.25 + 0.75 * (1.0 + cooling_degree_delta * 0.20) * (0.3 + 0.7 * occ_ratio)
        raw_hvac = nominal_hvac * hvac_factor
        
        # Effective setpoint offset
        effective_offset = self.setpoint_offset_c if apply_shed else 0.0
        # 6% reduction per degree offset (cap at +3 deg C -> ~18% reduction)
        hvac_reduction_ratio = min(0.20, effective_offset * 0.06)
        hvac_kw = max(nominal_hvac * 0.2, raw_hvac * (1.0 - hvac_reduction_ratio))
        
        # 4. Flexible: schedule-based (e.g. laundry, heaters in hostel, lab machines)
        nominal_flex = self.def_info["nominal_flexible_kw"]
        # Hostel flexible peaks in morning (07-10) and evening (19-22)
        if self.zone_id == "hostel":
            schedule_factor = 0.6 + 0.5 * (1.0 if (7 <= sim_hour <= 10 or 19 <= sim_hour <= 22) else 0.3)
            if is_exam_week:
                schedule_factor *= 1.8
        elif self.zone_id in ("labs", "admin"):
            schedule_factor = 0.8 if (9 <= sim_hour <= 17) else 0.2
        else:
            schedule_factor = 0.5
            if is_exam_week and self.zone_id == "library":
                schedule_factor *= 2.2
        flex_kw = nominal_flex * schedule_factor * (0.4 + 0.6 * occ_ratio)
        if apply_shed and self.flexible_shed_kw > 0:
            flex_kw = max(0.0, flex_kw - self.flexible_shed_kw)

        # Exam week adds extra study appliances (+195 kW campus-wide at evening peak)
        exam_boost_kw = 0.0
        if is_exam_week and 18 <= sim_hour <= 23:
            if self.zone_id == "hostel": exam_boost_kw = 125.0
            elif self.zone_id == "library": exam_boost_kw = 70.0
            
        # 5. Rebound additions (from earlier shed flexible / hvac)
        rebound_total_kw = 0.0
        if apply_shed and self.rebound_queue:
            active_rebounds = []
            for item in self.rebound_queue:
                rebound_total_kw += item["kw"]
                item["remaining_ticks"] -= 1
                if item["remaining_ticks"] > 0:
                    active_rebounds.append(item)
            self.rebound_queue = active_rebounds

        # 6. Noise: deterministic seeded ±3%
        noise_pct = self.rng.uniform(-0.03, 0.03)
        subtotal = (critical_kw + lighting_kw + hvac_kw + flex_kw + rebound_total_kw + exam_boost_kw)
        subtotal *= (1.0 + noise_pct)
        
        # 7. Phantom load scenario: extra stuck lights/AC at night
        if self.phantom_load_active:
            subtotal += 35.0  # +35 kW waste
            
        total_load = min(self.capacity_kw, max(0.0, subtotal))
        
        # Calculate headroom (how much can currently be shed)
        constraints = self.def_info["constraints"]
        hvac_shed_pct = constraints["hvac_exam_shed_pct"] if is_exam_week else constraints["hvac_max_shed_pct"]
        hvac_headroom = round(hvac_kw * hvac_shed_pct, 2)
        lighting_headroom = round(lighting_kw * constraints["lighting_max_shed_pct"], 2)
        flex_headroom = round(flex_kw * constraints["flexible_max_shed_pct"], 2)
        
        return {
            "current_load_kw": round(total_load, 2),
            "critical_kw": round(critical_kw, 2),
            "hvac_kw": round(hvac_kw, 2),
            "lighting_kw": round(lighting_kw, 2),
            "flexible_kw": round(flex_kw, 2),
            "occupancy": occupancy,
            "temp_c": round(temp_c, 2),
            "setpoint_offset_c": round(effective_offset, 1),
            "rebound_kw": round(rebound_total_kw, 2),
            "headroom_kw": {
                "hvac": hvac_headroom,
                "lighting": lighting_headroom,
                "flexible": flex_headroom
            },
            "total_headroom_kw": round(hvac_headroom + lighting_headroom + flex_headroom, 2)
        }
