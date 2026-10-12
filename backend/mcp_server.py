"""
CampusMind MCP Server (PRD Section 13)
Exposes tool functions for external AI agents or IDE integration:
- get_forecast(zone)
- get_zone_state(zone)
- propose_shed(zone, ask_kw)
"""
from typing import Dict, Any, Optional
from datetime import datetime
from backend.sim.engine import TwinSim
from backend.ml.forecast import forecaster
from backend.config import settings

def get_forecast(zone: str = "all") -> Dict[str, Any]:
    """Returns next-24h forecast for campus or specific zone."""
    return forecaster.predict_24h(start_time=datetime.now())

def get_zone_state(zone_id: str) -> Dict[str, Any]:
    """Returns current live state for a zone."""
    twin = TwinSim(mode="managed", seed=settings.SEED)
    state = twin.tick_without_advancing()
    if zone_id in state.zones:
        return state.zones[zone_id].model_dump()
    return {"error": f"Zone {zone_id} not found", "available": list(state.zones.keys())}

def propose_shed(zone_id: str, ask_kw: float) -> Dict[str, Any]:
    """Evaluates potential shedding headroom for a zone against an ask."""
    twin = TwinSim(mode="managed", seed=settings.SEED)
    state = twin.tick_without_advancing()
    if zone_id not in state.zones:
        return {"error": f"Zone {zone_id} not found"}
    zone = state.zones[zone_id]
    total_headroom = sum(zone.headroom_kw.values())
    viable = min(ask_kw, total_headroom)
    return {
        "zone_id": zone_id,
        "current_load_kw": zone.current_load_kw,
        "available_headroom_kw": zone.headroom_kw,
        "total_headroom_kw": total_headroom,
        "recommended_shed_kw": viable
    }
