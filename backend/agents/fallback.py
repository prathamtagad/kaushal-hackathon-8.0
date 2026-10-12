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
        "reason_template": "Hostel throttling non-essential corridor lighting and shifting laundry cycles. Preserving sleeping wing HVAC.",
        "peer_template": "We've deferred laundry heaters and dimmed corridors. Please protect student study rooms."
    },
    "library": {
        "hvac_share": 0.40,
        "lighting_share": 0.60,
        "flexible_share": 0.20,
        "base_weight": 1.4,
        "exam_weight": 2.8,
        "reason_template": "Library dimming secondary book stacks by 30%. Keeping reading hall setpoint under 27C comfort limit.",
        "peer_template": "Reading halls are at capacity for exams; we gave our lighting headroom."
    },
    "labs": {
        "hvac_share": 0.40,
        "lighting_share": 0.20,
        "flexible_share": 0.60,
        "base_weight": 1.0,
        "exam_weight": 1.1,
        "reason_template": "Labs pausing non-critical workstation charging and queuing batch simulations. Critical servers untouched.",
        "peer_template": "Non-critical GPU rigs paused for 2h. Server rooms remain locked."
    },
    "admin": {
        "hvac_share": 0.75,
        "lighting_share": 0.70,
        "flexible_share": 0.80,
        "base_weight": 0.7,
        "exam_weight": 0.7,
        "reason_template": "Admin taking maximum shedding across empty conference rooms and auditorium cooling.",
        "peer_template": "Offices taking heavy shed to shield hostels and study halls."
    },
    "water": {
        "hvac_share": 0.0,
        "lighting_share": 0.0,
        "flexible_share": 0.0,
        "base_weight": 0.9,
        "exam_weight": 1.5,
        "reason_template": "Overhead reservoir at safe level; postponing borewell pump cycle during high-tariff window.",
        "peer_template": "Borehole pump offline; 300 kL tank provides 8 hours reserve."
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
            reason = "Overhead reservoir at 72%; safely pausing borewell pump for 2 hours."
            peer_msg = "Pump deferred; providing 45 kW clean relief to campus grid."
        else:
            offered["pump"] = 0.0
            total_shed = 0.0
            reason = "Tank near minimum reserve threshold (30%); pump deferral unsafe."
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
