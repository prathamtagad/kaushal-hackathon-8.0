import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Set, Dict, Any, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.models import (
    SimControlRequest, ScenarioRequest, AutoApproveRequest,
    TwinState, FeedMessage, Deal
)
from backend.sim.engine import TwinSim
from backend.sim.scenarios import scenario_manager
from backend.sim.weather import weather_service
from backend.ledger import impact_ledger
from backend.approvals import approval_manager
from backend.adapters.bms import SimAdapter, mqtt_stub
from backend.ml.forecast import forecaster
from backend.ml.anomaly import anomaly_detector
from backend.agents.orchestrator import NegotiationOrchestrator

@asynccontextmanager
async def lifespan(app: FastAPI):
    global sim_task
    asyncio.create_task(asyncio.to_thread(forecaster.train))
    sim_task = asyncio.create_task(simulation_loop())
    yield
    if sim_task:
        sim_task.cancel()

app = FastAPI(title="CampusMind Digital Twin", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Twin instances
baseline_twin = TwinSim(mode="baseline", seed=settings.SEED)
managed_twin = TwinSim(mode="managed", seed=settings.SEED)
sim_adapter = SimAdapter(managed_twin, mqtt_stub)

# Clock & Simulation loop state
is_paused = False
sim_speed = 1.0  # multiplier: 1x, 2x, 4x, 8x
auto_approve = settings.AUTO_APPROVE

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        if not self.active_connections:
            return
        dead = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.active_connections.discard(d)

ws_manager = ConnectionManager()

# Negotiation orchestrator
orchestrator = NegotiationOrchestrator(broadcast_callback=ws_manager.broadcast)

def get_full_state_snapshot() -> Dict[str, Any]:
    b_state = baseline_twin.tick_without_advancing() if baseline_twin.tick_count > 0 else baseline_twin.tick()
    m_state = managed_twin.tick_without_advancing() if managed_twin.tick_count > 0 else managed_twin.tick()
    
    return {
        "baseline": b_state.model_dump(),
        "managed": m_state.model_dump(),
        "clock": {
            "tick": baseline_twin.tick_count,
            "sim_time": baseline_twin.current_time.isoformat(),
            "is_paused": is_paused,
            "speed": sim_speed
        },
        "config": {
            "grid_cap_kw": scenario_manager.get_effective_grid_cap(settings.GRID_CAP_KW),
            "solar_peak_kw": settings.SOLAR_PEAK_KW,
            "auto_approve": auto_approve,
            "llm_mode": settings.LLM_MODE,
            "weather_source": weather_service.source,
            "tariff_peak": settings.TARIFF_PEAK_INR,
            "tariff_normal": settings.TARIFF_NORMAL_INR,
            "tariff_offpeak": settings.TARIFF_OFFPEAK_INR
        },
        "scenarios": scenario_manager.get_active_list(),
        "anomalies": [a.model_dump() for a in anomaly_detector.get_active()],
        "pending_deals": [d.model_dump() for d in approval_manager.get_pending_deals()],
        "ledger": impact_ledger.get_summary()
    }

async def step_simulation():
    """Runs a single simulation tick (15 min) for both twins in lockstep."""
    scenario_manager.check_expirations(baseline_twin.tick_count)
    approval_manager.check_expirations(baseline_twin.current_time)

    # 1. Advance twins
    b_state = baseline_twin.tick()
    m_state = managed_twin.tick()

    # 2. Check for applied approved deals
    for deal in approval_manager.get_all_deals():
        if deal.status == "approved":
            sim_adapter.apply_deal(deal.deal_id, deal.allocations, deal.window_start, deal.window_end)
            approval_manager.mark_applied(deal.deal_id)

    # 3. Update Impact Ledger
    effective_cap = scenario_manager.get_effective_grid_cap(settings.GRID_CAP_KW)
    waste_kw = 35.0 if ("phantom_load" in scenario_manager.get_active_list() and not managed_twin.zones["labs"].phantom_load_active) else 0.0
    
    ledger_summary = impact_ledger.record_tick(
        sim_time_iso=b_state.sim_time,
        sim_hour=baseline_twin.current_time.hour,
        baseline_import_kw=b_state.grid_import_kw,
        managed_import_kw=m_state.grid_import_kw,
        baseline_leak_l=b_state.cumulative_leak_litres,
        managed_leak_l=m_state.cumulative_leak_litres,
        grid_cap_kw=effective_cap,
        waste_eliminated_kw=waste_kw
    )

    # 4. Check anomalies
    new_anomalies = anomaly_detector.check_tick(
        sim_time_iso=b_state.sim_time,
        zone_states=m_state.zones,
        tank_level_kl=m_state.tank_level_kl,
        pump_active=m_state.pump_active,
        pump_flow_kl_per_h=settings.PUMP_FLOW_KL_PER_H,
        total_occupancies={z: s.occupancy for z, s in m_state.zones.items()},
        dt_hours=0.25
    )
    for anom in new_anomalies:
        await ws_manager.broadcast({"type": "anomaly", "data": anom.model_dump()})
        # If tank leak, trigger water Ask
        if anom.kind == "tank_leak":
            asyncio.create_task(orchestrator.run_negotiation(
                kind="water",
                required_kw=0.0,
                predicted_peak_kw=m_state.grid_import_kw,
                grid_cap_kw=effective_cap,
                context=["tank_leak_detected", "isolate_branch"],
                sim_time=baseline_twin.current_time,
                managed_twin=managed_twin,
                is_exam_week=scenario_manager.is_exam_week(),
                auto_approve=auto_approve
            ))
        elif anom.kind == "phantom_load":
            asyncio.create_task(orchestrator.run_negotiation(
                kind="waste_fix",
                required_kw=35.0,
                predicted_peak_kw=m_state.grid_import_kw,
                grid_cap_kw=effective_cap,
                context=["phantom_load_detected", f"zone_{anom.zone_id}"],
                sim_time=baseline_twin.current_time,
                managed_twin=managed_twin,
                is_exam_week=scenario_manager.is_exam_week(),
                auto_approve=auto_approve
            ))

    # 5. Check Grid Deficit Trigger (Forecast peak next 2h > effective_cap or grid outage)
    is_outage = "grid_outage" in scenario_manager.get_active_list()
    if b_state.grid_import_kw > effective_cap or is_outage:
        # Check if already a pending/applied deal for this window
        has_active_deal = any(d.status in ("pending", "applied") for d in approval_manager.get_all_deals()[-3:])
        if not has_active_deal:
            req_kw = max(35.0, round(b_state.grid_import_kw - effective_cap + 20.0, 1))
            ctx = list(scenario_manager.get_active_list())
            asyncio.create_task(orchestrator.run_negotiation(
                kind="outage" if is_outage else "peak",
                required_kw=req_kw,
                predicted_peak_kw=b_state.grid_import_kw,
                grid_cap_kw=effective_cap,
                context=ctx,
                sim_time=baseline_twin.current_time,
                managed_twin=managed_twin,
                is_exam_week=scenario_manager.is_exam_week(),
                temp_offset=scenario_manager.get_temp_offset(),
                auto_approve=auto_approve
            ))

    # Broadcast tick
    await ws_manager.broadcast({
        "type": "tick",
        "data": {
            "baseline": b_state.model_dump(),
            "managed": m_state.model_dump(),
            "clock": {
                "tick": baseline_twin.tick_count,
                "sim_time": baseline_twin.current_time.isoformat(),
                "is_paused": is_paused,
                "speed": sim_speed
            },
            "ledger": ledger_summary
        }
    })

# Background Sim Loop Task
async def simulation_loop():
    while True:
        try:
            if not is_paused:
                await step_simulation()
            # 3 sim hours per second nominal -> 15 min = 0.25h -> step delay = (3 / 4) / speed
            delay = max(0.1, (settings.SIM_SPEED_SECONDS_PER_SIM_HOUR / 4.0) / sim_speed)
            await asyncio.sleep(delay)
        except asyncio.CancelledError:
            break
        except Exception as e:
            await asyncio.sleep(1.0)

sim_task: Optional[asyncio.Task] = None

# --- REST Endpoints ---

@app.get("/api/health")
def get_health():
    return {
        "status": "ok",
        "llm_mode": settings.LLM_MODE,
        "llm_ok": True,
        "weather_source": weather_service.source,
        "model_loaded": forecaster.model is not None,
        "mape": forecaster.mape
    }

@app.get("/api/state")
def get_state():
    return get_full_state_snapshot()

@app.post("/api/sim/control")
async def control_sim(req: SimControlRequest):
    global is_paused, sim_speed
    if req.action == "play":
        is_paused = False
    elif req.action == "pause":
        is_paused = True
    elif req.action == "speed":
        sim_speed = float(req.value or 1.0)
    elif req.action == "step":
        is_paused = True
        await step_simulation()
    elif req.action == "reset":
        baseline_twin.reset_sim()
        managed_twin.reset_sim()
        impact_ledger.reset()
        scenario_manager.trigger_scenario("reset", 0)
    elif req.action == "jump":
        # Jump to given ISO time
        if req.value:
            try:
                target = datetime.fromisoformat(req.value)
                baseline_twin.current_time = target
                managed_twin.current_time = target
            except Exception:
                pass
                
    await ws_manager.broadcast({"type": "clock_update", "data": {"is_paused": is_paused, "speed": sim_speed}})
    return {"status": "ok", "action": req.action}

@app.post("/api/scenario")
async def handle_scenario(req: ScenarioRequest):
    res = scenario_manager.trigger_scenario(req.type, baseline_twin.tick_count)
    if req.type == "tank_leak":
        managed_twin.water.isolated_leak = False
        baseline_twin.water.isolated_leak = False
    elif req.type == "reset":
        managed_twin.water.isolated_leak = False
        baseline_twin.water.isolated_leak = False
        managed_twin.zones["labs"].phantom_load_active = False
        managed_twin.zones["admin"].phantom_load_active = False

    await ws_manager.broadcast({"type": "scenario_update", "data": scenario_manager.get_active_list()})
    return res

@app.get("/api/forecast")
def get_forecast():
    temp_offset = scenario_manager.get_temp_offset()
    is_exam = scenario_manager.is_exam_week()
    recent = {zid: z.current_load_kw for zid, z in managed_twin.tick_without_advancing().zones.items()}
    return forecaster.predict_24h(
        start_time=baseline_twin.current_time,
        temp_offset=temp_offset,
        is_exam_week=is_exam,
        recent_zone_loads=recent
    )

@app.get("/api/anomalies")
def get_anomalies():
    return anomaly_detector.get_active()

@app.get("/api/ledger")
def get_ledger():
    return {
        "counters": impact_ledger.get_summary(),
        "history": impact_ledger.history
    }

@app.get("/api/ledger/confidence")
def get_ledger_confidence():
    return impact_ledger.compute_confidence_band(remaining_ticks=32)

@app.get("/api/deals")
def get_deals():
    return approval_manager.get_all_deals()

@app.post("/api/deals/{deal_id}/approve")
async def approve_deal(deal_id: str):
    deal = approval_manager.approve_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # If this was a water tank leak isolation deal
    if deal.ask_id and "water" in deal.deal_id:
        managed_twin.water.isolated_leak = True
    # If waste fix phantom load deal
    for alloc in deal.allocations:
        if alloc.lever == "waste_fix" or "phantom" in alloc.note.lower():
            if alloc.zone_id in managed_twin.zones:
                managed_twin.zones[alloc.zone_id].phantom_load_active = False

    sim_adapter.apply_deal(deal.deal_id, deal.allocations, deal.window_start, deal.window_end)
    approval_manager.mark_applied(deal.deal_id)
    
    await ws_manager.broadcast({"type": "deal_update", "data": deal.model_dump()})
    return deal

@app.post("/api/deals/{deal_id}/reject")
async def reject_deal(deal_id: str):
    deal = approval_manager.reject_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    await ws_manager.broadcast({"type": "deal_update", "data": deal.model_dump()})
    return deal

@app.post("/api/config/auto-approve")
def set_auto_approve(req: AutoApproveRequest):
    global auto_approve
    auto_approve = req.enabled
    return {"auto_approve": auto_approve}

@app.get("/api/audit")
def get_audit():
    return approval_manager.get_audit_log()

@app.get("/api/bms/outbox")
def get_bms_outbox():
    return mqtt_stub.outbox

@app.post("/api/demo/script")
async def run_demo_script():
    """
    Demo Insurance: Plays the pre-recorded deterministic sequence:
    1. Normal day baseline
    2. Heatwave triggered
    3. Negotiation occurs
    4. Auto-approved and ledger gains demonstrated
    """
    global is_paused
    is_paused = False
    scenario_manager.trigger_scenario("heatwave", baseline_twin.tick_count)
    await ws_manager.broadcast({"type": "scenario_update", "data": scenario_manager.get_active_list()})
    
    deal = await orchestrator.run_negotiation(
        kind="peak",
        required_kw=68.0,
        predicted_peak_kw=945.0,
        grid_cap_kw=settings.GRID_CAP_KW,
        context=["heatwave +8C", "demo_mode"],
        sim_time=baseline_twin.current_time,
        managed_twin=managed_twin,
        is_exam_week=False,
        temp_offset=8.0,
        auto_approve=True
    )
    return {"status": "demo_script_executed", "deal": deal.model_dump()}

# --- WebSocket ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    # Send full state snapshot on connection
    await websocket.send_json({"type": "initial_state", "data": get_full_state_snapshot()})
    try:
        while True:
            data = await websocket.receive_text()
            # Echo / heartbeat
            msg = json.loads(data)
            if msg.get("action") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
