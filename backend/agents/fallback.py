import math
from typing import Dict, Any, List
from backend.models import AgentOffer, Ask

FALLBACK_PROFILES = {
    "hostel": {
        "hvac_share": 0.50,
        "lighting_share": 0.30,
        "flexible_share": 0.70,
        "base_weight": 1.2,
        "exam_weight": 2.2,
        "reason_template": "Hostel Substation B2: Postponing domestic hot-water heat pump cycles (22 kW) and corridor AHU cooling. Active dormitory room setpoints preserved at 24.2°C (ASHRAE-55 Class B).",
        "peer_template": "Deferred laundry heaters and common-area lighting. Please protect student dormitory comfort floors."
    },
    "library": {
        "hvac_share": 0.40,
        "lighting_share": 0.60,
        "flexible_share": 0.20,
        "base_weight": 1.4,
        "exam_weight": 2.8,
        "reason_template": "Library Central AHU-1 & Stack Lighting: Step-dimming secondary stack LED lux by 30% via DALI bus. Reading hall VAV dampers modulated to enforce 26.8°C wet-bulb comfort ceiling.",
        "peer_template": "Scholars wing reading halls at peak occupancy; contributed maximum lighting and peripheral ventilation headroom."
    },
    "labs": {
        "hvac_share": 0.40,
        "lighting_share": 0.20,
        "flexible_share": 0.60,
        "base_weight": 1.0,
        "exam_weight": 1.1,
        "reason_template": "Computing & Research Labs (LP-3): Queuing non-urgent batch GPU jobs; shedding 20% non-critical lab AHU cooling. Tier-3 server room core racks (65 kW) locked and untouched.",
        "peer_template": "Non-critical workstation charging and test rigs paused for 2h window. Core compute clusters protected."
    },
    "admin": {
        "hvac_share": 0.75,
        "lighting_share": 0.70,
        "flexible_share": 0.80,
        "base_weight": 0.7,
        "exam_weight": 0.7,
        "reason_template": "Administration Complex & Auditorium: Dispatched 40% chiller staging cut and HVAC setback (+2.5°C) across unoccupied senate chambers and conference suites.",
        "peer_template": "Administrative offices and auditorium absorbing deep shed to protect academic and residential zones."
    },
    "water": {
        "hvac_share": 0.0,
        "lighting_share": 0.0,
        "flexible_share": 0.0,
        "base_weight": 0.9,
        "exam_weight": 1.5,
        "reason_template": "Overhead Balancing Reservoir: Storage level stable at 72.4% (217 kL). Postponing 45 kW Grundfos multistage borehole pump to off-peak TOD window (22:00 IST). 8.2-hour emergency buffer guaranteed.",
        "peer_template": "Borehole pump offline; 300 kL overhead reservoir provides 8+ hours gravity reserve."
    }
}

def generate_fallback_offer(
    zone_id: str,
    ask: Ask,
    headroom_kw: Dict[str, float],
    is_exam_week: bool,
    temp_offset: float = 0.0,
    can_defer_pump: bool = True
) -> AgentOffer:
    """
    Generates a deterministic, context-aware rule-based offer.
    Used for LLM_MODE=mock, timeouts, or invalid JSON.
    """
    profile = FALLBACK_PROFILES.get(zone_id, FALLBACK_PROFILES["admin"])
    
    # Weight multiplier based on context
    comfort_mult = profile["exam_weight"] if is_exam_week else profile["base_weight"]
    if temp_offset > 4.0:
        # Heatwave adds discomfort
        comfort_mult = min(3.0, comfort_mult * 1.25)

    offered: Dict[str, float] = {}
    total_shed = 0.0

    if zone_id in ("water", "pumping"):
        if can_defer_pump and ask.required_kw > 0:
            pump_kw = 45.0
            offered["pump"] = pump_kw
            total_shed = pump_kw
            reason = "Overhead reservoir at 74% (222 kL); safely deferring 45 kW Grundfos pump cycle for 2 hours."
            peer_msg = "Pump deferred; providing 45 kW clean relief to campus grid feeder."
        else:
            offered["pump"] = 0.0
            total_shed = 0.0
            reason = "Reservoir near minimum reserve threshold (30% / 90 kL); continuous pumping required."
            peer_msg = "Reserve floor reached; cannot defer water pumping."
    else:
        # Scale offered shed proportional to required_kw and headroom
        hvac_head = headroom_kw.get("hvac", 0.0)
        light_head = headroom_kw.get("lighting", 0.0)
        flex_head = headroom_kw.get("flexible", 0.0)

        # Fraction to offer
        hvac_offer = round(hvac_head * profile["hvac_share"], 1)
        light_offer = round(light_head * profile["lighting_share"], 1)
        flex_offer = round(flex_head * profile["flexible_share"], 1)

        if hvac_offer > 0: offered["hvac"] = hvac_offer
        if light_offer > 0: offered["lighting"] = light_offer
        if flex_offer > 0: offered["flexible"] = flex_offer

        total_shed = round(sum(offered.values()), 1)
        reason = profile["reason_template"]
        peer_msg = profile["peer_template"]

    # Estimated rebound: 100% of flex, 20% of hvac
    rebound = round(offered.get("flexible", 0.0) * 1.0 + offered.get("hvac", 0.0) * 0.20, 1)

    return AgentOffer(
        zone_id=zone_id,
        ask_id=ask.ask_id,
        offered_shed_kw=offered,
        total_shed_kw=total_shed,
        comfort_weight_multiplier=round(comfort_mult, 2),
        rebound_kwh=rebound,
        reasoning=reason,
        message_to_peers=peer_msg,
        confidence=0.95
    )
