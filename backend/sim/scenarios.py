from typing import Set, Dict, Any
from datetime import datetime, timedelta

class ScenarioManager:
    def __init__(self):
        self.active_scenarios: Set[str] = set()
        self.heatwave_end_tick: int = 0
        self.outage_end_tick: int = 0

    def trigger_scenario(self, scenario_type: str, current_tick: int) -> Dict[str, Any]:
        scenario_type = scenario_type.lower()
        if scenario_type == "reset":
            self.active_scenarios.clear()
            self.heatwave_end_tick = 0
            self.outage_end_tick = 0
            return {"status": "reset", "active": []}
            
        self.active_scenarios.add(scenario_type)
        if scenario_type == "heatwave":
            # 6 hours = 24 ticks of 15-min
            self.heatwave_end_tick = current_tick + 24
        elif scenario_type == "grid_outage":
            # 3 hours = 12 ticks
            self.outage_end_tick = current_tick + 12

        return {"status": "activated", "scenario": scenario_type, "active": list(self.active_scenarios)}

    def clear_scenario(self, scenario_type: str):
        if scenario_type in self.active_scenarios:
            self.active_scenarios.remove(scenario_type)

    def check_expirations(self, current_tick: int):
        if "heatwave" in self.active_scenarios and self.heatwave_end_tick > 0:
            if current_tick >= self.heatwave_end_tick:
                self.active_scenarios.remove("heatwave")
        if "grid_outage" in self.active_scenarios and self.outage_end_tick > 0:
            if current_tick >= self.outage_end_tick:
                self.active_scenarios.remove("grid_outage")

    def get_temp_offset(self) -> float:
        return 8.0 if "heatwave" in self.active_scenarios else 0.0

    def get_effective_grid_cap(self, base_cap: float) -> float:
        if "grid_outage" in self.active_scenarios:
            return round(base_cap * 0.40, 1)  # 40% of grid cap during outage
        return base_cap

    def is_exam_week(self) -> bool:
        return "exam_week" in self.active_scenarios

    def is_tank_leak(self) -> bool:
        return "tank_leak" in self.active_scenarios

    def is_phantom_load(self) -> bool:
        return "phantom_load" in self.active_scenarios

    def get_active_list(self) -> list[str]:
        return list(self.active_scenarios)

scenario_manager = ScenarioManager()
