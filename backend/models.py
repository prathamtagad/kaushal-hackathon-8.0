from datetime import datetime
from typing import Literal, Dict, List, Any, Optional
from pydantic import BaseModel, Field

class ZoneState(BaseModel):
    zone_id: str
    name: str
    current_load_kw: float
    critical_kw: float
    hvac_kw: float
    lighting_kw: float
    flexible_kw: float
    occupancy: int
    temp_c: float
    setpoint_offset_c: float = 0.0
    headroom_kw: Dict[str, float] = Field(default_factory=dict) # lever -> max_shed_kw
    total_headroom_kw: float = 0.0

class TwinState(BaseModel):
    mode: Literal["baseline", "managed"]
    tick: int
    sim_time: str
    zones: Dict[str, ZoneState]
    tank_level_kl: float
    tank_pct: float
    pump_active: bool
    pump_kw: float
    solar_kw: float
    total_load_kw: float
    grid_import_kw: float
    cumulative_kwh: float
    cumulative_inr: float
    cumulative_co2_kg: float
    cumulative_leak_litres: float = 0.0

class Ask(BaseModel):
    ask_id: str
    kind: Literal["peak", "shortage", "outage", "waste_fix", "water"]
    window_start: str
    window_end: str
    required_kw: float              # shed needed (0 for waste_fix/water if not power-bound)
    predicted_peak_kw: float
    grid_cap_kw: float
    context: List[str]              # e.g. ["exam_week", "heatwave +8C"]

class AgentOffer(BaseModel):
    zone_id: str
    ask_id: str
    offered_shed_kw: Dict[str, float]          # lever -> kW, e.g. {"hvac": 22, "lighting": 4}
    total_shed_kw: float
    comfort_weight_multiplier: float = Field(default=1.0, ge=0.5, le=3.0)  # pain level
    rebound_kwh: float = 0.0
    reasoning: str = Field(default="", max_length=240)
    message_to_peers: str = Field(default="", max_length=160)
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)

class Allocation(BaseModel):
    zone_id: str
    lever: str
    shed_kw: float
    setpoint_offset_c: Optional[float] = None     # for hvac
    note: str = ""

class Deal(BaseModel):
    deal_id: str
    ask_id: str
    status: Literal["pending", "approved", "rejected", "applied", "expired"]
    allocations: List[Allocation]
    total_shed_kw: float
    residual_unmet_kw: float                   # >0 if infeasible
    est_savings: Dict[str, float]              # {kwh, inr, co2_kg, litres}
    solver: Dict[str, Any]                     # {status, objective, llm_proposed_total_kw, adjusted: [...]}
    used_fallback: bool
    created_at: str
    window_start: str
    window_end: str
    summary_reasoning: str = ""

class FeedMessage(BaseModel):
    id: str
    ts: str
    sender: str
    recipient: str                # agent ids or "ALL" / "SOLVER" / "HUMAN"
    kind: Literal["ask", "offer", "counter", "verify", "deal", "alert", "fallback", "system"]
    text: str
    payload: Optional[Dict[str, Any]] = None
    source: Literal["llm", "fallback", "solver", "system"]

class Anomaly(BaseModel):
    anomaly_id: str
    zone_id: Optional[str] = None
    kind: Literal["phantom_load", "tank_leak"]
    est_waste_kw: float = 0.0
    est_leak_kl_per_h: float = 0.0
    since: str
    message: str
    active: bool = True

class AuditEntry(BaseModel):
    entry_id: str
    timestamp: str
    category: str
    action: str
    actor: str
    details: Dict[str, Any]

class BmsCommand(BaseModel):
    topic: str
    payload: Dict[str, Any]
    dispatched_at: str
    adapter: str

class SimControlRequest(BaseModel):
    action: Literal["play", "pause", "speed", "jump", "reset", "step"]
    value: Optional[Any] = None

class ScenarioRequest(BaseModel):
    type: Literal["heatwave", "exam_week", "grid_outage", "tank_leak", "phantom_load", "reset"]

class AutoApproveRequest(BaseModel):
    enabled: bool
