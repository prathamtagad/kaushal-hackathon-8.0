import math
from typing import Dict, Any, List, Tuple
from backend.models import Ask, AgentOffer, Allocation, Deal
from backend.config import settings

BASE_LEVER_WEIGHTS = {
    ("hostel", "flexible"): 1.0,
    ("hostel", "lighting"): 1.4,
    ("hostel", "hvac"): 2.2,
    ("library", "lighting"): 1.2,
    ("library", "hvac"): 2.6,
    ("labs", "flexible"): 1.1,
    ("labs", "lighting"): 1.3,
    ("labs", "hvac"): 2.0,
    ("admin", "flexible"): 0.8,
    ("admin", "lighting"): 0.9,
    ("admin", "hvac"): 1.2,
    ("water", "pump"): 1.0
}

def verify_and_allocate(
    ask: Ask,
    offers: List[AgentOffer],
    headroom_by_zone: Dict[str, Dict[str, float]],
    tank_reserve_ok: bool = True
) -> Dict[str, Any]:
    """
    Verifies LLM offers against hard constraints, then solves convex quadratic problem:
    Minimise sum_{(z,l)} w_{(z,l)} * (s_{(z,l)}^2 / max_shed_{(z,l)})
    Subject to:
      sum s >= required_kw
      0 <= s_{(z,l)} <= max_shed_{(z,l)}
    """
    adjusted_records: List[Dict[str, Any]] = []
    verified_offers: Dict[str, Dict[str, float]] = {}
    comfort_multipliers: Dict[str, float] = {}
    
    total_llm_proposed_kw = 0.0

    # 1. Verification of LLM proposals against hard headroom & constraints
    for offer in offers:
        zid = offer.zone_id
        z_headroom = headroom_by_zone.get(zid, {})
        comfort_mult = min(3.0, max(0.5, offer.comfort_weight_multiplier))
        comfort_multipliers[zid] = comfort_mult
        verified_offers[zid] = {}

        for lever, proposed_kw in offer.offered_shed_kw.items():
            total_llm_proposed_kw += proposed_kw
            max_allowed = z_headroom.get(lever, 0.0)

            # Special check for water pump
            if lever == "pump" and not tank_reserve_ok:
                max_allowed = 0.0
                adjusted_records.append({
                    "zone": "water",
                    "from_kw": proposed_kw,
                    "to_kw": 0.0,
                    "reason": "Pump deferral rejected: violates minimum 30% overhead tank reserve floor"
                })
                verified_offers[zid][lever] = 0.0
                continue

            if proposed_kw > max_allowed + 0.1:
                # LLM proposed more than hard headroom!
                adjusted_records.append({
                    "zone": zid,
                    "from_kw": round(proposed_kw, 1),
                    "to_kw": round(max_allowed, 1),
                    "reason": f"Clamped {lever} shed: exceeded physical headroom ({max_allowed:.1f} kW) or comfort floor"
                })
                verified_offers[zid][lever] = max_allowed
            else:
                verified_offers[zid][lever] = max(0.0, proposed_kw)

    # 2. Setup optimization variables
    # Flat list of (zone_id, lever, max_shed, weight)
    var_list = []
    total_campus_headroom = 0.0

    for zid, levers in headroom_by_zone.items():
        cmult = comfort_multipliers.get(zid, 1.0)
        for lever, max_kw in levers.items():
            if max_kw <= 0.0:
                continue
            if lever == "pump" and not tank_reserve_ok:
                continue
            base_w = BASE_LEVER_WEIGHTS.get((zid, lever), 1.5)
            weight = base_w * cmult
            var_list.append({
                "zone_id": zid,
                "lever": lever,
                "max_shed": max_kw,
                "weight": weight
            })
            total_campus_headroom += max_kw

    required = ask.required_kw
    solver_status = "optimal"
    residual_unmet_kw = 0.0

    # Infeasible check
    if required > total_campus_headroom:
        solver_status = "infeasible_partial"
        residual_unmet_kw = round(required - total_campus_headroom, 1)
        # Allocate all available headroom
        allocations = []
        for v in var_list:
            zid = v["zone_id"]
            lever = v["lever"]
            shed = v["max_shed"]
            offset_c = round(min(3.0, shed / 12.0), 1) if lever == "hvac" else None
            allocations.append(Allocation(
                zone_id=zid,
                lever=lever,
                shed_kw=round(shed, 1),
                setpoint_offset_c=offset_c,
                note="Allocated at 100% maximum capacity due to extreme grid deficit"
            ))
        return {
            "status": solver_status,
            "objective": 999.0,
            "allocations": allocations,
            "total_shed_kw": round(total_campus_headroom, 1),
            "residual_unmet_kw": residual_unmet_kw,
            "llm_proposed_total_kw": round(total_llm_proposed_kw, 1),
            "adjusted": adjusted_records
        }

    # Solve convex allocation
    # Try cvxpy first
    solved_allocations = None
    obj_value = 0.0

    try:
        import cvxpy as cp
        n = len(var_list)
        if n > 0 and required > 0:
            s = cp.Variable(n, nonneg=True)
            u_bounds = [v["max_shed"] for v in var_list]
            weights = [v["weight"] for v in var_list]
            
            # Objective: sum w_i * (s_i^2 / u_i)
            quad_terms = [weights[i] * cp.square(s[i]) / u_bounds[i] for i in range(n)]
            objective = cp.Minimize(cp.sum(quad_terms))
            
            constraints = [
                cp.sum(s) >= required,
                s <= u_bounds
            ]
            
            prob = cp.Problem(objective, constraints)
            # Try OSQP, ECOS, or default
            prob.solve(solver=cp.OSQP if "OSQP" in cp.installed_solvers() else None)
            
            if prob.status in (cp.OPTIMAL, cp.OPTIMAL_INACCURATE) and s.value is not None:
                solved_allocations = {
                    (var_list[i]["zone_id"], var_list[i]["lever"]): max(0.0, float(s.value[i]))
                    for i in range(n)
                }
                obj_value = float(prob.value)
    except Exception:
        solved_allocations = None

    # Analytical / KKT convex quadratic water-filling fallback
    if solved_allocations is None:
        if required <= 0:
            solved_allocations = {(v["zone_id"], v["lever"]): 0.0 for v in var_list}
        else:
            # Water-filling: for min sum w_i * s_i^2 / u_i subject to sum s_i = R, 0 <= s_i <= u_i
            # Gradient: 2 * w_i * s_i / u_i = lambda => s_i = (lambda * u_i) / (2 * w_i)
            # Binary search for lambda
            low = 0.0
            high = 1000.0
            for _ in range(50):
                mid = (low + high) / 2.0
                test_sum = 0.0
                for v in var_list:
                    raw_s = (mid * v["max_shed"]) / (2.0 * v["weight"])
                    clamped_s = min(v["max_shed"], max(0.0, raw_s))
                    test_sum += clamped_s
                if test_sum < required:
                    low = mid
                else:
                    high = mid
            
            solved_allocations = {}
            for v in var_list:
                raw_s = (high * v["max_shed"]) / (2.0 * v["weight"])
                clamped_s = min(v["max_shed"], max(0.0, raw_s))
                solved_allocations[(v["zone_id"], v["lever"])] = clamped_s

    # Build final Allocation objects
    final_allocations: List[Allocation] = []
    total_allocated_kw = 0.0

    for v in var_list:
        zid = v["zone_id"]
        lever = v["lever"]
        shed = solved_allocations.get((zid, lever), 0.0)
        if shed < 0.05:
            continue
        shed = round(shed, 1)
        total_allocated_kw += shed

        offset_c = None
        if lever == "hvac":
            offset_c = round(min(3.0, max(0.5, shed / 12.0)), 1)
            note = f"HVAC setpoint shifted +{offset_c}°C"
        elif lever == "lighting":
            note = f"Corridor and ambient lighting dimmed ({shed} kW)"
        elif lever == "pump":
            note = "Borewell pump shifted off-peak"
        else:
            note = f"Non-critical {lever} circuits deferred"

        final_allocations.append(Allocation(
            zone_id=zid,
            lever=lever,
            shed_kw=shed,
            setpoint_offset_c=offset_c,
            note=note
        ))

    return {
        "status": solver_status,
        "objective": round(obj_value, 2),
        "allocations": final_allocations,
        "total_shed_kw": round(total_allocated_kw, 1),
        "residual_unmet_kw": 0.0,
        "llm_proposed_total_kw": round(total_llm_proposed_kw, 1),
        "adjusted": adjusted_records
    }
