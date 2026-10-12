import os
import csv
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from backend.config import settings, get_tariff
from backend.models import TwinState, ZoneState
from backend.sim.zones import ZoneModel, ZONE_DEFINITIONS
from backend.sim.water import WaterModel
from backend.sim.solar import calculate_solar_kw
from backend.sim.weather import weather_service
from backend.sim.scenarios import scenario_manager

TIMETABLE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "timetable.csv")

class TwinSim:
    def __init__(self, mode: str = "baseline", seed: int = 42):
        self.mode = mode
        self.seed = seed
        self.tick_count = 0
        self.sim_start = datetime.fromisoformat(settings.SIM_START)
        self.current_time = self.sim_start
        self.dt_hours = settings.TICK_MINUTES / 60.0  # 0.25
        
        # Load timetable
        self.timetable: Dict[tuple, Dict[str, int]] = {}
        self._load_timetable()
        
        # Zone models
        self.zones: Dict[str, ZoneModel] = {
            zid: ZoneModel(zid, seed=seed) for zid in ZONE_DEFINITIONS
        }
        
        # Water model
        self.water = WaterModel(capacity_kl=settings.TANK_CAPACITY_KL, initial_level_kl=215.0)
        
        # Cumulative metrics
        self.cumulative_kwh = 0.0
        self.cumulative_inr = 0.0
        self.cumulative_co2_kg = 0.0
        self.last_grid_import_kw = 0.0
        self.last_total_load_kw = 0.0
        self.last_solar_kw = 0.0
        
        # Active deal interventions (for managed twin only)
        # deal_id -> {lever, zone_id, shed_kw, setpoint_offset_c, end_tick}
        self.active_interventions: Dict[str, Dict[str, Any]] = {}

    def _load_timetable(self):
        if os.path.exists(TIMETABLE_PATH):
            with open(TIMETABLE_PATH, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    dow = int(row["day_of_week"])
                    hr = int(row["hour"])
                    self.timetable[(dow, hr)] = {
                        "hostel": int(row["hostel"]),
                        "library": int(row["library"]),
                        "labs": int(row["labs"]),
                        "admin": int(row["admin"])
                    }

    def get_occupancy(self, sim_time: datetime, is_exam_week: bool) -> Dict[str, int]:
        dow = sim_time.weekday()
        hr = sim_time.hour
        base = self.timetable.get((dow, hr), {
            "hostel": 500, "library": 150, "labs": 150, "admin": 50
        })
        
        occ = dict(base)
        if is_exam_week:
            # During exam week, students are concentrated in library and hostels in evenings/nights
            occ["hostel"] = min(800, int(occ["hostel"] * 1.35 + (80 if 18 <= hr <= 23 else 0)))
            occ["library"] = min(400, int(occ["library"] * 1.65 + (120 if 18 <= hr <= 23 else 0)))
            occ["labs"] = min(350, int(occ["labs"] * 1.15))
            
        return occ

    def apply_deal(self, deal_id: str, allocations: List[Any], duration_ticks: int = 8):
        """Applies BMS deal allocations to managed twin."""
        if self.mode != "managed":
            return
            
        for alloc in allocations:
            zid = alloc.zone_id
            lever = alloc.lever
            shed_kw = alloc.shed_kw
            setpoint_offset = alloc.setpoint_offset_c
            
            if zid in self.zones:
                self.zones[zid].apply_deal_allocation(
                    lever=lever,
                    shed_kw=shed_kw,
                    setpoint_offset_c=setpoint_offset,
                    duration_ticks=duration_ticks
                )
            elif zid in ("water", "pumping"):
                # Shed pumping: force pump off for the window
                self.water.pump_active = False

    def reset_sim(self):
        self.tick_count = 0
        self.current_time = self.sim_start
        self.cumulative_kwh = 0.0
        self.cumulative_inr = 0.0
        self.cumulative_co2_kg = 0.0
        self.water = WaterModel(capacity_kl=settings.TANK_CAPACITY_KL, initial_level_kl=215.0)
        for z in self.zones.values():
            z.reset_interventions()
            z.rebound_queue.clear()
            z.phantom_load_active = False
        self.active_interventions.clear()

    def tick(self) -> TwinState:
        """Advance twin by 1 tick (15 minutes)."""
        self.tick_count += 1
        self.current_time += timedelta(minutes=settings.TICK_MINUTES)
        
        # Scenarios state
        temp_offset = scenario_manager.get_temp_offset()
        is_exam = scenario_manager.is_exam_week()
        is_leak = scenario_manager.is_tank_leak()
        is_phantom = scenario_manager.is_phantom_load()
        
        # Check phantom load assignment for labs & admin
        if self.mode == "baseline" and is_phantom:
            self.zones["labs"].phantom_load_active = True
            self.zones["admin"].phantom_load_active = True
        elif self.mode == "managed":
            # Managed twin will have it cleared if a waste_fix deal was applied
            # default to phantom active if scenario is on unless fixed
            pass
            
        # 1. Weather
        temp_c, sol_rad = weather_service.get_weather(self.current_time, temp_offset=temp_offset)
        
        # 2. Solar
        solar_kw = calculate_solar_kw(sol_rad)
        self.last_solar_kw = solar_kw
        
        # 3. Occupancies
        occupancies = self.get_occupancy(self.current_time, is_exam)
        
        # 4. Water pump & tank update
        tariff_inr = get_tariff(self.current_time.hour)
        water_res = self.water.update_tick(
            dt_hours=self.dt_hours,
            occupancies=occupancies,
            is_managed=(self.mode == "managed"),
            tariff_inr=tariff_inr,
            solar_kw=solar_kw,
            exam_week=is_exam,
            tank_leak_active=is_leak
        )
        
        # 5. Zone load calculations
        zone_states: Dict[str, ZoneState] = {}
        total_zone_load = 0.0
        
        for zid, zmodel in self.zones.items():
            occ = occupancies.get(zid, 0)
            z_res = zmodel.calculate_tick_load(
                sim_hour=self.current_time.hour + self.current_time.minute / 60.0,
                temp_c=temp_c,
                solar_radiation=sol_rad,
                occupancy=occ,
                is_exam_week=is_exam,
                apply_shed=(self.mode == "managed")
            )
            total_zone_load += z_res["current_load_kw"]
            
            zone_states[zid] = ZoneState(
                zone_id=zid,
                name=zmodel.name,
                current_load_kw=z_res["current_load_kw"],
                critical_kw=z_res["critical_kw"],
                hvac_kw=z_res["hvac_kw"],
                lighting_kw=z_res["lighting_kw"],
                flexible_kw=z_res["flexible_kw"],
                occupancy=occ,
                temp_c=z_res["temp_c"],
                setpoint_offset_c=z_res["setpoint_offset_c"],
                headroom_kw=z_res["headroom_kw"],
                total_headroom_kw=z_res["total_headroom_kw"]
            )
            
        # Total campus load = sum of building zones + water pump
        total_load_kw = round(total_zone_load + water_res["pump_kw"], 2)
        grid_import_kw = max(0.0, round(total_load_kw - solar_kw, 2))
        
        # Cumulative additions
        tick_kwh = grid_import_kw * self.dt_hours
        self.cumulative_kwh += tick_kwh
        self.cumulative_inr += tick_kwh * tariff_inr
        self.cumulative_co2_kg += tick_kwh * settings.GRID_EMISSION_FACTOR
        
        self.last_grid_import_kw = grid_import_kw
        self.last_total_load_kw = total_load_kw
        
        return TwinState(
            mode=self.mode, # type: ignore
            tick=self.tick_count,
            sim_time=self.current_time.isoformat(),
            zones=zone_states,
            tank_level_kl=water_res["level_kl"],
            tank_pct=water_res["level_pct"],
            pump_active=water_res["pump_active"],
            pump_kw=water_res["pump_kw"],
            solar_kw=solar_kw,
            total_load_kw=total_load_kw,
            grid_import_kw=grid_import_kw,
            cumulative_kwh=round(self.cumulative_kwh, 2),
            cumulative_inr=round(self.cumulative_inr, 2),
            cumulative_co2_kg=round(self.cumulative_co2_kg, 2),
            cumulative_leak_litres=water_res["cumulative_leak_litres"]
        )

    def state(self) -> TwinState:
        """Returns the current state snapshot without ticking."""
        return self.tick_without_advancing()

    def tick_without_advancing(self) -> TwinState:
        temp_offset = scenario_manager.get_temp_offset()
        is_exam = scenario_manager.is_exam_week()
        temp_c, sol_rad = weather_service.get_weather(self.current_time, temp_offset=temp_offset)
        solar_kw = calculate_solar_kw(sol_rad)
        occupancies = self.get_occupancy(self.current_time, is_exam)
        
        zone_states: Dict[str, ZoneState] = {}
        for zid, zmodel in self.zones.items():
            occ = occupancies.get(zid, 0)
            z_res = zmodel.calculate_tick_load(
                sim_hour=self.current_time.hour + self.current_time.minute / 60.0,
                temp_c=temp_c,
                solar_radiation=sol_rad,
                occupancy=occ,
                is_exam_week=is_exam,
                apply_shed=(self.mode == "managed")
            )
            zone_states[zid] = ZoneState(
                zone_id=zid,
                name=zmodel.name,
                current_load_kw=z_res["current_load_kw"],
                critical_kw=z_res["critical_kw"],
                hvac_kw=z_res["hvac_kw"],
                lighting_kw=z_res["lighting_kw"],
                flexible_kw=z_res["flexible_kw"],
                occupancy=occ,
                temp_c=z_res["temp_c"],
                setpoint_offset_c=z_res["setpoint_offset_c"],
                headroom_kw=z_res["headroom_kw"],
                total_headroom_kw=z_res["total_headroom_kw"]
            )
            
        return TwinState(
            mode=self.mode, # type: ignore
            tick=self.tick_count,
            sim_time=self.current_time.isoformat(),
            zones=zone_states,
            tank_level_kl=round(self.water.level_kl, 2),
            tank_pct=round((self.water.level_kl / self.water.capacity_kl) * 100.0, 1),
            pump_active=self.water.pump_active,
            pump_kw=self.water.pump_kw if self.water.pump_active else 0.0,
            solar_kw=solar_kw,
            total_load_kw=self.last_total_load_kw,
            grid_import_kw=self.last_grid_import_kw,
            cumulative_kwh=round(self.cumulative_kwh, 2),
            cumulative_inr=round(self.cumulative_inr, 2),
            cumulative_co2_kg=round(self.cumulative_co2_kg, 2),
            cumulative_leak_litres=round(self.water.cumulative_leak_litres, 1)
        )
