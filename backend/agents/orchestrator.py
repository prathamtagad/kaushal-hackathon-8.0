import uuid
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Callable
from backend.config import settings
from backend.models import Ask, AgentOffer, Deal, FeedMessage, Allocation
from backend.agents.prompts import AGENT_SYSTEM_PROMPTS, build_offer_prompt
from backend.agents.fallback import generate_fallback_offer
from backend.agents.llm import get_llm_client
from backend.solver.verify import verify_and_allocate
from backend.approvals import approval_manager
from backend.adapters.bms import SimAdapter, mqtt_stub

class NegotiationOrchestrator:
    def __init__(self, broadcast_callback: Optional[Callable[[Dict[str, Any]], Any]] = None):
        self.broadcast_callback = broadcast_callback
        self.feed_messages: List[FeedMessage] = []
        self.llm_client = get_llm_client()

    def add_feed_message(self, msg: FeedMessage):
        self.feed_messages.append(msg)
        if len(self.feed_messages) > 150:
            self.feed_messages.pop(0)
        if self.broadcast_callback:
            try:
                res = self.broadcast_callback({"type": "feed_message", "data": msg.model_dump()})
                if asyncio.iscoroutine(res):
                    asyncio.create_task(res)
            except Exception:
                pass

    async def run_negotiation(
        self,
        kind: str,
        required_kw: float,
        predicted_peak_kw: float,
        grid_cap_kw: float,
        context: List[str],
        sim_time: datetime,
        managed_twin: Any,
        is_exam_week: bool,
        temp_offset: float = 0.0,
        auto_approve: bool = False
    ) -> Deal:
        """
        Executes the full negotiation protocol between GridAgent, ZoneAgents, and Solver.
        """
        ask_id = f"ask-{uuid.uuid4().hex[:6]}"
        deal_id = f"deal-{uuid.uuid4().hex[:6]}"
        w_start = sim_time.isoformat()
        w_end = (sim_time + timedelta(hours=settings.NEGOTIATION_TRIGGER_HORIZON_H)).isoformat()

        ask = Ask(
            ask_id=ask_id,
            kind=kind, # type: ignore
            window_start=w_start,
            window_end=w_end,
            required_kw=round(required_kw, 1),
            predicted_peak_kw=round(predicted_peak_kw, 1),
            grid_cap_kw=round(grid_cap_kw, 1),
            context=context
        )

        # 1. Trigger -> Ask feed message
        ask_text = (
            f"GRID DEFICIT ALERT: Forecast peak {predicted_peak_kw:.1f} kW exceeds cap {grid_cap_kw:.1f} kW. "
            f"Target shed: {required_kw:.1f} kW over next {settings.NEGOTIATION_TRIGGER_HORIZON_H}h. Calling all zone agents."
        ) if kind in ("peak", "shortage", "outage") else (
            f"OPTIMIZATION TRIGGER: Action requested for {kind}. Target adjustment: {required_kw:.1f} kW."
        )

        self.add_feed_message(FeedMessage(
            id=f"msg-{uuid.uuid4().hex}",
            ts=datetime.now().isoformat(),
            sender="GridAgent",
            recipient="ALL",
            kind="ask",
            text=ask_text,
            payload=ask.model_dump(),
            source="system"
        ))

        # Zone state and headroom lookup
        managed_state = managed_twin.tick_without_advancing()
        headroom_by_zone = {
            zid: zstate.headroom_kw for zid, zstate in managed_state.zones.items()
        }
        # Water pump headroom
        can_defer_pump = managed_twin.water.project_deferral_headroom(
            window_hours=2.0,
            current_occupancies=managed_twin.get_occupancy(sim_time, is_exam_week),
            exam_week=is_exam_week
        ) > 0.0
        headroom_by_zone["water"] = {"pump": 45.0 if can_defer_pump else 0.0}

        zones_to_query = ["hostel", "library", "labs", "admin", "water"]
        offers: List[AgentOffer] = []

        # 2. Round 1: Query zone agents in parallel
        async def query_zone(zid: str) -> AgentOffer:
            is_mock = settings.LLM_MODE == "mock" or not settings.GEMINI_API_KEY
            if is_mock:
                return generate_fallback_offer(
                    zone_id=zid,
                    ask=ask,
                    headroom_kw=headroom_by_zone.get(zid, {}),
                    is_exam_week=is_exam_week,
                    temp_offset=temp_offset,
                    can_defer_pump=can_defer_pump
                )
            
            # Live LLM with 1 retry
            sys_prompt = AGENT_SYSTEM_PROMPTS.get(zid, "")
            user_prompt = build_offer_prompt(
                zone_id=zid,
                state_json=managed_state.zones.get(zid, managed_state).model_dump_json() if zid in managed_state.zones else "{}",
                ask_json=ask.model_dump_json(),
                context=context
            )
            for attempt in range(settings.LLM_RETRIES + 1):
                try:
                    res_dict = await self.llm_client.generate_offer(sys_prompt, user_prompt, zid, ask)
                    return AgentOffer(**res_dict)
                except Exception:
                    if attempt == settings.LLM_RETRIES:
                        break
            
            # Fallback if LLM fails
            return generate_fallback_offer(
                zone_id=zid,
                ask=ask,
                headroom_kw=headroom_by_zone.get(zid, {}),
                is_exam_week=is_exam_week,
                temp_offset=temp_offset,
                can_defer_pump=can_defer_pump
            )

        # Run parallel gather and stream feed messages as they arrive
        round1_results = await asyncio.gather(*(query_zone(zid) for zid in zones_to_query))
        
        for offer in round1_results:
            offers.append(offer)
            source_tag = "fallback" if settings.LLM_MODE == "mock" or not settings.GEMINI_API_KEY else "llm"
            self.add_feed_message(FeedMessage(
                id=f"msg-{uuid.uuid4().hex}",
                ts=datetime.now().isoformat(),
                sender=f"{offer.zone_id.capitalize()}Agent",
                recipient="GridAgent",
                kind="offer",
                text=f"Offers {offer.total_shed_kw:.1f} kW shed: {offer.reasoning}",
                payload=offer.model_dump(),
                source=source_tag # type: ignore
            ))

        total_r1_offered = sum(o.total_shed_kw for o in offers)

        # 3. Round 2 (Counter) if total offered < required_kw
        if total_r1_offered < required_kw and required_kw > 0:
            deficit = required_kw - total_r1_offered
            counter_text = f"Round 1 shortfall: {deficit:.1f} kW unmet. GridAgent requesting secondary concessions from zones with remaining headroom."
            self.add_feed_message(FeedMessage(
                id=f"msg-{uuid.uuid4().hex}",
                ts=datetime.now().isoformat(),
                sender="GridAgent",
                recipient="ALL",
                kind="counter",
                text=counter_text,
                source="system"
            ))
            # Admin and labs increase flexible concessions in round 2
            for off in offers:
                if off.zone_id in ("admin", "labs"):
                    extra = min(15.0, headroom_by_zone.get(off.zone_id, {}).get("flexible", 0.0))
                    if extra > 0:
                        off.offered_shed_kw["flexible"] = off.offered_shed_kw.get("flexible", 0.0) + extra
                        off.total_shed_kw += extra
                        off.reasoning += f" (Round 2: +{extra:.1f} kW flexible concession)"

        # 4. Verify with math solver
        solver_res = verify_and_allocate(
            ask=ask,
            offers=offers,
            headroom_by_zone=headroom_by_zone,
            tank_reserve_ok=can_defer_pump
        )

        # Post verify message
        adjustments_text = ""
        if solver_res["adjusted"]:
            adj_lines = [f"{a['zone']} adjusted {a['from_kw']}→{a['to_kw']} kW ({a['reason']})" for a in solver_res["adjusted"]]
            adjustments_text = " Clamped: " + "; ".join(adj_lines)
        else:
            adjustments_text = " All zone constraint bounds and comfort floors satisfied."

        self.add_feed_message(FeedMessage(
            id=f"msg-{uuid.uuid4().hex}",
            ts=datetime.now().isoformat(),
            sender="Solver (cvxpy)",
            recipient="ALL",
            kind="verify",
            text=f"Convex optimization complete [{solver_res['status']}]. Total allocated: {solver_res['total_shed_kw']:.1f} kW.{adjustments_text}",
            payload=solver_res,
            source="solver"
        ))

        # Savings estimation
        total_shed_kw = solver_res["total_shed_kw"]
        est_kwh = total_shed_kw * settings.NEGOTIATION_TRIGGER_HORIZON_H
        est_inr = est_kwh * settings.TARIFF_PEAK_INR
        est_co2 = est_kwh * settings.GRID_EMISSION_FACTOR
        est_litres = 6000.0 if kind == "water" else 0.0

        deal = Deal(
            deal_id=deal_id,
            ask_id=ask_id,
            status="pending",
            allocations=solver_res["allocations"],
            total_shed_kw=total_shed_kw,
            residual_unmet_kw=solver_res["residual_unmet_kw"],
            est_savings={
                "kwh": round(est_kwh, 1),
                "inr": round(est_inr, 0),
                "co2_kg": round(est_co2, 1),
                "litres": round(est_litres, 0)
            },
            solver=solver_res,
            used_fallback=(settings.LLM_MODE == "mock" or not settings.GEMINI_API_KEY),
            created_at=datetime.now().isoformat(),
            window_start=w_start,
            window_end=w_end,
            summary_reasoning=f"Co-optimised load shed across {len(solver_res['allocations'])} levers to shave peak by {total_shed_kw:.1f} kW."
        )

        # 5. Deal message
        approval_manager.add_deal(deal)
        self.add_feed_message(FeedMessage(
            id=f"msg-{uuid.uuid4().hex}",
            ts=datetime.now().isoformat(),
            sender="GridAgent",
            recipient="HUMAN",
            kind="deal",
            text=f"Deal {deal_id} formulated: {total_shed_kw:.1f} kW shed, saving estimated ₹{est_inr:.0f} and {est_co2:.1f} kg CO2. Awaiting Facility Manager approval.",
            payload=deal.model_dump(),
            source="system"
        ))

        # Auto-approve if enabled
        if auto_approve or settings.AUTO_APPROVE:
            approval_manager.approve_deal(deal_id, actor="AutoApprove")
            adapter = SimAdapter(managed_twin, mqtt_stub)
            adapter.apply_deal(deal_id, deal.allocations, w_start, w_end)
            approval_manager.mark_applied(deal_id)
            self.add_feed_message(FeedMessage(
                id=f"msg-{uuid.uuid4().hex}",
                ts=datetime.now().isoformat(),
                sender="FacilityManager",
                recipient="ALL",
                kind="deal",
                text=f"Deal {deal_id} AUTO-APPROVED and applied to BMS. Managed twin load shedding active.",
                payload={"deal_id": deal_id, "status": "applied"},
                source="system"
            ))

        return deal
