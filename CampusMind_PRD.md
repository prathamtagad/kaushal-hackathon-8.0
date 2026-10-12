# Bachat — Product Requirements Document

> **Audience: an autonomous AI coding agent (Antigravity).** Build exactly what this document specifies. Make reasonable decisions yourself instead of asking questions. Where this PRD gives a default, use it. Priorities: **P0 = must ship, P1 = should ship, P2 = only if time remains.**

---

## 0. Agent operating rules

1. Read this whole document before writing code.
2. Build **phase by phase** (Section 17). Finish a phase's acceptance checks before starting the next. Commit after each phase.
3. **Keep the stack boring.** No microservices, no Docker requirement, no databases beyond SQLite/in-memory, no Unix sockets.
4. **Everything must run offline** via `LLM_MODE=mock` and cached weather. The demo must never depend on the internet.
5. **Determinism:** the simulation is seeded (`SEED=42`). Same seed + same scenario = same numbers.
6. One command to run backend, one for frontend, one `make demo` that does everything (seed data, train models, start both).
7. Hard time budget: the full MVP is a **6-hour hackathon build**. If something threatens P0, cut P2, then P1.
8. Never claim hardware integration. All control actions go through the **BMS adapter** (simulator implementation by default).

---

## 1. Product overview

**Name:** Bachat
**One-liner:** A counterfactual digital twin of a college campus where AI zone-agents negotiate load-shedding, a math solver verifies every deal, and a live ledger proves the kWh, ₹, CO₂ and litres saved versus doing nothing.

**Problem (PS-04, Sustainable Tech Without Limits):** Campuses waste electricity and water because nobody tracks or acts on it in real time. Peaks hit during heat or exam weeks, water pumps run at expensive hours, lights and AC stay on in empty rooms, and tank leaks go unnoticed.

**Solution:** A software control layer on top of existing building systems:
1. **See:** a live 2D twin of campus zones with load, occupancy, tank levels and solar.
2. **Predict:** 24-hour per-zone load forecast plus waste/leak anomaly detection.
3. **Act:** zone agents (LLM) negotiate who sheds how much; a **solver verifies** feasibility, constraints and cost; a facility manager approves.
4. **Prove:** two timelines run side by side (**Baseline** vs **Managed**) so every saving is measurable.

**Differentiators (keep these front and centre):**
- **Counterfactual twin:** baseline vs managed on identical weather and occupancy.
- **LLM proposes, solver disposes:** the LLM turns fuzzy context (exam week, VIP visit) into structured weights and offers; a convex solver guarantees constraints hold.
- **Energy–water nexus:** pumps and tank reserves co-optimised with power.
- **Chaos button:** judges trigger heatwave, exam week, grid outage, tank leak live.
- **Human-in-the-loop + BMS adapter:** credible path from demo to real campus.

---

## 2. Goals, non-goals, success criteria

### Goals
- A working end-to-end MVP, runnable on a laptop, demoable in 3 minutes.
- Clear, visible link between agent decisions and measurable impact.
- Reliable demo (fallbacks everywhere).

### Non-goals
- No physical hardware, no real meter integration, no auth/multi-tenant, no production hardening, no mobile app.

### Success criteria (the demo must show all of these)
| # | Criterion |
|---|-----------|
| S1 | Twin map animates live; zones change colour by load ratio |
| S2 | Forecast chart shows predicted next-24h peak per zone and campus total |
| S3 | A predicted peak above grid cap automatically triggers a negotiation visible in the feed |
| S4 | Solver result is shown with each deal (what the LLM proposed vs what was approved) |
| S5 | Baseline-vs-managed chart with confidence band, plus live counters for kWh, ₹, kg CO₂, litres, peak kW reduced |
| S6 | Chaos buttons (Heatwave, Exam Week, Grid Outage, Tank Leak, Phantom Load) each change the twin and trigger agent response |
| S7 | Approve/Reject on every deal, audit log of everything |
| S8 | Works fully offline in `LLM_MODE=mock` and degrades gracefully when the LLM fails |

---

## 3. Users

- **Facility manager (primary):** watches the twin, approves/rejects deals, reads explanations.
- **Judge / demo viewer:** pushes chaos buttons and watches the system respond.
- **(P2) Student:** hostel floor carbon-budget leaderboard.

---

## 4. Architecture

```
┌────────────────────────── Frontend (React) ──────────────────────────┐
│ Campus Map (SVG) │ Negotiation Feed │ Ledger + Chart │ Chaos/Controls │
└───────────▲──────────────────▲───────────────────▲───────────────────┘
            │ REST             │ WebSocket /ws     │
┌───────────┴──────────────────┴───────────────────┴───────────────────┐
│                         FastAPI backend                               │
│  Sim Engine (baseline + managed twins, lockstep, seeded)              │
│  Forecaster (LightGBM)   Anomaly Detector (IsolationForest + rules)   │
│  Orchestrator ── Grid Agent + Zone Agents (LLM, JSON-schema output)   │
│  Solver (cvxpy) ── verifies/finalises deals                           │
│  Approval queue ── Audit log ── Ledger                                │
│  BMS Adapter (SimAdapter | MqttStubAdapter)                           │
│  (P2) MCP server wrapping the same tool functions                     │
└───────────────────────────────────────────────────────────────────────┘
```

**Control flow each sim tick (15 sim-minutes):**
1. Advance **baseline** twin and **managed** twin (same inputs; managed has active deals applied).
2. Forecast refresh (every sim hour) and anomaly check (every tick) on the managed twin's *unmanaged-equivalent* signals.
3. If forecast peak (next 2h) > `GRID_CAP_KW`, or grid outage active, or anomaly raised → create an **Ask** → run negotiation.
4. Negotiation yields a **Deal** → status `pending` (or auto-approved if toggle on) → applied via BMS adapter → managed twin changes.
5. Ledger updates; everything is pushed over WebSocket.

---

## 5. Tech stack and repo layout

**Backend:** Python 3.11, FastAPI, uvicorn, WebSockets, pydantic v2, numpy, pandas, LightGBM, scikit-learn (IsolationForest), cvxpy (solver: OSQP/ECOS), httpx, pytest.
**LLM:** abstract `LLMClient` interface. Default provider **Gemini** via `GEMINI_API_KEY` (JSON-schema structured output). Also implement `LLM_MODE=mock` (deterministic, no network) and keep the provider swappable via env (`LLM_PROVIDER=gemini|openai|anthropic|mock`).
**Frontend:** React 18 + Vite + TypeScript + Tailwind + Recharts. Campus map is plain SVG (no map library). Dark theme.
**Data:** SQLite or in-memory + JSON files. No external DB.

```
Bachat/
├─ Makefile                  # make demo | make train | make test
├─ README.md                 # run steps, disclosures, architecture
├─ .env.example
├─ backend/
│  ├─ main.py                # FastAPI app, REST + /ws
│  ├─ config.py              # all defaults from Section 6
│  ├─ models.py              # pydantic schemas (Section 9.2)
│  ├─ sim/
│  │  ├─ engine.py           # TwinSim class (used twice: baseline, managed)
│  │  ├─ zones.py            # zone definitions, levers, constraints
│  │  ├─ water.py            # tank + pump model
│  │  ├─ solar.py
│  │  ├─ weather.py          # Open-Meteo client + cached fallback
│  │  └─ scenarios.py        # chaos scenarios
│  ├─ ml/
│  │  ├─ datagen.py          # synthetic history generator
│  │  ├─ forecast.py         # LightGBM train/predict
│  │  └─ anomaly.py
│  ├─ agents/
│  │  ├─ llm.py              # LLMClient + providers + mock
│  │  ├─ prompts.py
│  │  ├─ zone_agent.py
│  │  ├─ grid_agent.py
│  │  ├─ orchestrator.py     # negotiation protocol
│  │  └─ fallback.py         # deterministic rule-based agents
│  ├─ solver/verify.py       # cvxpy allocation + verification
│  ├─ ledger.py
│  ├─ approvals.py           # deal queue + audit log
│  ├─ adapters/bms.py        # SimAdapter, MqttStubAdapter
│  └─ mcp_server.py          # P2, thin wrapper
├─ data/
│  ├─ timetable.csv          # occupancy schedule per zone (generated)
│  ├─ events.json            # exam_week, convocation, vip_visit contexts
│  ├─ weather_cache.json     # cached Open-Meteo response for Indore
│  └─ history.parquet        # generated training data
├─ models/                   # saved LightGBM + IsolationForest
├─ frontend/                 # Vite app
└─ tests/
```

---

## 6. Configuration defaults (`config.py`, all overridable by env)

| Key | Default | Notes |
|-----|---------|-------|
| `SEED` | 42 | |
| `TICK_MINUTES` | 15 | sim step |
| `SIM_SPEED_SECONDS_PER_SIM_HOUR` | 3 | UI speeds: 1x, 2x, 4x, 8x |
| `SIM_START` | Monday 06:00 | with "Jump to time" control for demo |
| `LOCATION` | Indore (22.7196, 75.8577) | Open-Meteo lat/lon |
| `GRID_CAP_KW` | 850 | sanctioned import limit |
| `SOLAR_PEAK_KW` | 250 | rooftop PV, scaled by irradiance |
| `TARIFF_INR_PER_KWH` | peak 09 (18:00–22:00 and 11:00–15:00), normal 07, off-peak 05.5 (22:00–06:00) | **assumed values, disclose, user-editable** |
| `GRID_EMISSION_FACTOR` | 0.82 kg CO₂/kWh | **assumed India grid average, disclose** |
| `NEGOTIATION_TRIGGER_HORIZON_H` | 2 | look-ahead window |
| `LLM_TIMEOUT_S` | 8 | per agent call |
| `LLM_RETRIES` | 1 | on invalid JSON |
| `AUTO_APPROVE` | false | UI toggle |
| `TANK_CAPACITY_KL` | 300 | |
| `TANK_MIN_RESERVE_PCT` | 30 (40 in exam week) | hard constraint |

**Calibration requirement:** tune baseline loads so a normal day peaks at ~80% of `GRID_CAP_KW` (no negotiation), while Heatwave or Exam Week pushes the baseline peak **8–15% above the cap**, so the demo reliably triggers negotiation. Add a test asserting this.

---

## 7. Simulation engine

### 7.1 Zones

| zone_id | Display | Typical peak kW | Levers (sheddable) | Non-sheddable |
|---------|---------|----------------|--------------------|---------------|
| `hostel` | Hostels | ~330 | `hvac`, `lighting` (corridors), `flexible` (laundry, water heaters) | base appliances |
| `library` | Library | ~150 | `hvac`, `lighting` | servers, security |
| `labs` | Labs | ~230 | `hvac`, `flexible` (chargers, non-critical compute) | critical equipment (~40% of load) |
| `admin` | Admin | ~110 | `hvac`, `lighting`, `flexible` | servers |
| `pumping` | Water pumping | ~45 | `pump` (deferrable) | none |
| `solar` | Solar (supply only) | −250 | — | — |

Add a second hostel block only if time allows (P2).

### 7.2 Load model (per zone, per tick)

```
load = critical_kw
     + lighting_kw * f(occupancy, daylight)
     + hvac_kw     * g(temp_c, occupancy, setpoint_offset)
     + flexible_kw * h(schedule)
     + noise (seeded, ±3%)
```
- Occupancy comes from `timetable.csv` (hostel high at night, library/labs/admin high in day, weekends low), modified by scenarios and events.
- `hvac` grows with temperature above ~24°C (piecewise linear), scaled by occupancy.
- `setpoint_offset_c` (set by deals) reduces HVAC kW (~6% per °C, cap at +3°C).
- **Rebound (required for honesty):** deferred flexible/pump energy is re-added over the following 2 hours (100% rebound), HVAC setpoint shedding has 20% rebound. Ledger savings must account for this.

### 7.3 Water model
- Tank level in kL. Outflow = occupancy-driven demand (L/person/h, hostel dominant) plus leak flow if scenario active.
- Pump: 45 kW → 40 kL/h. 
- **Baseline pump control:** simple threshold (start when level < 60%, stop at 90%), regardless of tariff.
- **Managed pump control:** agents co-schedule pumping into off-peak and solar-surplus windows, pre-filling before known peaks, never below `TANK_MIN_RESERVE_PCT`.
- Tank-level projection function is used to compute how many kW of pump load can be deferred over a window while keeping the reserve.

### 7.4 Solar and grid
- `solar_kw = SOLAR_PEAK_KW * clamp(shortwave_radiation / 1000)` (cloud effect included by using Open-Meteo irradiance).
- `grid_import_kw = max(0, total_load - solar_kw)`. Cap, tariff and emissions apply to grid import.

### 7.5 Weather
- Fetch Open-Meteo hourly `temperature_2m, shortwave_radiation` for the location. Cache to `data/weather_cache.json`. If the network fails, use the cache. If the cache is missing, generate synthetic temp (sinusoid 22–38°C) and irradiance. **Open-Meteo must be disclosed in README/UI footer.**

### 7.6 Two twins in lockstep
- `TwinSim` is instantiated twice: `baseline` (never gets interventions) and `managed` (receives applied deals through the BMS adapter). Same seed, weather, timetable, scenarios.
- Both expose `state()` returning per-zone `ZoneState`, tank, solar, grid import, cumulative energy/cost/CO₂.

---

## 8. ML

### 8.1 Forecast (P0)
- **Data:** `datagen.py` runs the baseline sim for 60 days using historical Open-Meteo archive (or synthetic temps) → `history.parquet`. Optionally blend seed shapes from the Building Data Genome 2 dataset **only if downloaded easily; do not block on it**. Disclose whatever is used.
- **Model:** one LightGBM regressor with `zone` as a categorical feature.
- **Features:** hour, day_of_week, temp_c, solar_kw, planned_occupancy (from timetable), is_exam_week, lag_24h, lag_168h.
- **Output:** next-24h hourly load per zone + campus total, predicted peak time/value. Training must take < 60 s. Show MAPE on a hold-out week in the UI.
- Forecast uses **forecast weather** (Open-Meteo hourly forecast or the cache) so scenarios like Heatwave visibly change the predicted peak. When a scenario is active, apply its temperature delta to the forecast input.

### 8.2 Anomaly detection (P0)
- **Phantom load:** IsolationForest per zone on `[load / expected_load, occupancy, hour_sin, hour_cos]` **plus a rule**: occupancy < 5% and load > 2× that zone's night baseline for 3 consecutive ticks. Emit `Anomaly{zone, kind: phantom_load, est_waste_kw, since}`.
- **Tank leak:** compare observed tank level to expected level (demand model + pump). If residual drop > 3 kL/h for 3 ticks, emit `Anomaly{kind: tank_leak, est_leak_kl_per_h}`.
- Anomalies create a `waste_fix` Ask (Section 9.3).

---

## 9. Agents and negotiation

### 9.1 Agents
| Agent | Role |
|-------|------|
| `GridAgent` | Owns the grid cap and the water/energy budget. Announces Asks, aggregates offers, posts the final deal summary. |
| `HostelAgent`, `LibraryAgent`, `LabsAgent`, `AdminAgent` | Represent their zone's comfort and constraints. Respond to Asks with structured offers. |
| `WaterAgent` (pumping zone) | Offers pump deferral within tank reserve constraints. |

Each agent has a **persona/system prompt** with: zone description, hard constraints, soft preferences, current context (events, scenario, occupancy, temps), and current lever headroom. Agents **must output JSON matching the schema**. Free text is limited to the `reasoning` and `message_to_peers` fields (short).

### 9.2 Schemas (`models.py`)

```python
class Ask(BaseModel):
    ask_id: str
    kind: Literal["peak","shortage","outage","waste_fix","water"]
    window_start: datetime; window_end: datetime
    required_kw: float              # shed needed (0 for waste_fix/water if not power-bound)
    predicted_peak_kw: float
    grid_cap_kw: float
    context: list[str]              # e.g. ["exam_week", "heatwave +8C"]

class AgentOffer(BaseModel):
    zone_id: str
    ask_id: str
    offered_shed_kw: dict[str, float]          # lever -> kW, e.g. {"hvac": 22, "lighting": 4}
    total_shed_kw: float
    comfort_weight_multiplier: float = Field(ge=0.5, le=3.0)  # LLM expresses how painful shedding is *right now*
    rebound_kwh: float
    reasoning: str = Field(max_length=240)
    message_to_peers: str = Field(max_length=160)
    confidence: float = Field(ge=0, le=1)

class Allocation(BaseModel):
    zone_id: str; lever: str; shed_kw: float
    setpoint_offset_c: float | None = None     # for hvac
    note: str

class Deal(BaseModel):
    deal_id: str; ask_id: str
    status: Literal["pending","approved","rejected","applied","expired"]
    allocations: list[Allocation]
    total_shed_kw: float
    residual_unmet_kw: float                   # >0 if infeasible
    est_savings: dict                          # {kwh, inr, co2_kg, litres}
    solver: dict                               # {status, objective, llm_proposed_total_kw, adjusted: [{zone, from_kw, to_kw, reason}]}
    used_fallback: bool
    created_at: datetime

class FeedMessage(BaseModel):                  # what the UI renders
    id: str; ts: datetime
    sender: str; recipient: str                # agent ids or "ALL" / "SOLVER" / "HUMAN"
    kind: Literal["ask","offer","counter","verify","deal","alert","fallback","system"]
    text: str
    payload: dict | None = None
    source: Literal["llm","fallback","solver","system"]
```

### 9.3 Negotiation protocol (`orchestrator.py`)

1. **Trigger → Ask.** Grid Agent creates an `Ask` (kind from trigger) and posts an `ask` feed message.
2. **Round 1 (parallel):** send each zone agent its state, headroom (`max_shed` per lever), constraints, context, and the Ask. Run with `asyncio.gather`, timeout `LLM_TIMEOUT_S`, one retry on invalid JSON. Post each `offer` to the feed as it arrives (stream, don't wait for all).
3. **Aggregate:** if `Σ offers ≥ required_kw`, go to verify. Otherwise Grid Agent posts a `counter` to zones with remaining headroom (**Round 2, max 2 rounds**).
4. **Verify (solver, Section 10):** validates each offer against hard constraints, then computes the final allocation. Posts a `verify` message summarising what was clamped or reallocated and why.
5. **Deal:** Grid Agent posts a `deal` message with the per-zone summary and estimated savings. Deal enters the approval queue (or auto-approves).
6. **Apply:** on approval, `BMS adapter` dispatches commands to the managed twin.
7. **Expiry:** at `window_end`, commands revert and rebound energy is added.

**Per-kind behaviour**
- `peak` / `outage` / `shortage`: shed power across zones to get under the cap.
- `waste_fix`: single-zone, low-risk action (turn off phantom load) with a one-line justification.
- `water`: Water Agent reschedules pumping (shift to off-peak/solar window, enforce reserve). In a leak, the proposed action is "isolate leaking branch" (human approval required).

### 9.4 Fallback (P0)
`fallback.py` implements deterministic agents: offer = a fixed fraction (per zone priority table) of headroom, templated messages. Use when: LLM timeout, invalid JSON after retry, missing API key, or `LLM_MODE=mock`. Feed messages are tagged `source: "fallback"` with a small badge. In `mock` mode, templated messages should still read naturally and reference real numbers and context (exam week, heatwave).

### 9.5 Prompt requirements (`prompts.py`)
- System prompt per agent: role, hard constraints (non-negotiable, listed explicitly), preference ordering, output JSON schema, "never exceed `max_shed`", "be concise".
- User prompt: current state JSON, Ask JSON, context strings, peers' earlier messages (for Round 2).
- Zone constraints (defaults):
  - **Hostel:** HVAC max shed 30% normal, 15% in exam week; night comfort is a floor; laundry/flexible fully deferrable.
  - **Library:** reading-hall temp must stay ≤ 27°C; HVAC max shed 25% (10% in exam week); lighting 30%.
  - **Labs:** critical equipment non-sheddable; HVAC 20%; flexible 50%.
  - **Admin:** most flexible after 17:00; HVAC 40%, lighting 50%, flexible 60%.
  - **Pumping:** defer only if projected tank level stays ≥ reserve through the window.

---

## 10. Solver and verification (`solver/verify.py`)

**Role: the LLM expresses intent and context; the solver guarantees feasibility and optimality.**

For each Ask:
- Variables `s[z,l] ≥ 0`, upper bound `max_shed[z,l]` (computed from current lever kW × constraint %, and tank projection for pumping).
- Weight `w[z,l] = base_weight[z,l] × comfort_weight_multiplier[z]` (multiplier clamped to [0.5, 3.0]).
- **Minimise** `Σ w[z,l] · s[z,l]² / max_shed[z,l]` (convex, so shedding spreads, painful zones shed less).
- **Subject to** `Σ s ≥ required_kw`, `0 ≤ s ≤ max_shed`, and the tank-reserve constraint for `pump`.
- **Verification of LLM proposals:** for each offer, check `offered ≤ max_shed` and lever validity. Record violations. Compare the LLM's total vs the solver's final.
- **Output:** the final `Allocation` list, `solver.adjusted[]` (e.g. "Library 40→28 kW: exceeds reading-hall comfort floor"), `solver.status`, `objective`.
- If infeasible (`Σ max_shed < required`): allocate all headroom, set `residual_unmet_kw`, post an `alert`, and recommend human action. The deal still goes to the approval queue.
- Convert HVAC shed kW to `setpoint_offset_c` (cap +3°C).
- Unit tests required (Section 18).

---

## 11. Impact Ledger (`ledger.py`)

Computed every tick as `baseline − managed` (cumulative since scenario/start, with a reset button):

| Metric | Formula |
|--------|---------|
| kWh saved | `Σ (baseline_grid_import − managed_grid_import) × dt`, **including rebound** |
| ₹ saved | `Σ Δimport_kWh × tariff(t)` (so shifting load off-peak counts even if kWh is equal) |
| kg CO₂ avoided | `kWh saved × GRID_EMISSION_FACTOR` |
| Litres saved | `leak_flow_baseline_total − leak_flow_managed_total` (after isolation) + phantom-water optional (skip) |
| Peak kW reduced | `max(baseline import) − max(managed import)` |
| Phantom load eliminated (kWh) | energy removed by `waste_fix` deals |

**Confidence band:** `GET /api/ledger/confidence` runs `N=20` fast numpy-vectorised re-simulations of the *remaining* day with ±5% noise on occupancy/temperature and returns `p10 / p50 / p90` for the projected end-of-day ₹ and kWh saved. Show as a shaded band on the chart and a "± range" under the counters. Must respond in < 2 s.

---

## 12. Chaos scenarios (`scenarios.py`)

| Scenario | Effect | Expected response |
|----------|--------|-------------------|
| **Heatwave** | +8°C temp for next 6 h | HVAC load spikes, forecast peak > cap, `peak` Ask |
| **Exam Week** | Hostel/library occupancy ↑, comfort floors tightened, tank reserve → 40% | Agents negotiate with stricter limits, comfort multipliers ↑ |
| **Grid Outage** | `GRID_CAP_KW` → 40% for 3 h (solar only + small import) | `outage` Ask, deeper shedding, partial residual alert possible |
| **Tank Leak** | Extra outflow 6 kL/h unobserved | Leak anomaly → `water` Ask → isolate branch deal |
| **Phantom Load** | Labs/Admin lights+AC stuck on with 0 occupancy after hours | Anomaly → `waste_fix` deal |
| **Reset** | Clear scenarios, restore defaults | |

Scenarios apply to **both** twins (the world is the same); only the managed twin gets interventions. A scenario can be stacked (e.g. Exam Week + Heatwave).

---

## 13. Human-in-the-loop and BMS adapter

### Approval queue (P0)
- Every deal is `pending` until Approve/Reject (unless `AUTO_APPROVE`). Pending deals auto-expire when their window starts if nobody acts (status `expired`, logged).
- Each deal card shows per-zone allocations, savings estimate, **LLM reasoning**, and the **solver diff**.
- **Audit log:** append-only list of every ask, offer, verification, decision (who/when), command dispatched. `GET /api/audit`.

### BMS adapter (P0 interface, P1 stub)
```python
class BMSAdapter(Protocol):
    def dispatch(self, commands: list[Command]) -> list[CommandResult]: ...
class SimAdapter: ...         # applies commands to the managed TwinSim
class MqttStubAdapter: ...    # logs the JSON it *would* publish; no broker needed
```
Example payload logged by the stub (shown in the UI's "BMS Output" panel):
```json
{"topic": "campus/library/hvac/setpoint_offset", "payload": {"offset_c": 1.5, "from": "2026-10-12T14:00", "to": "2026-10-12T16:00", "deal_id": "d-0042"}}
```
Pitch line: "Swap `SimAdapter` for a BACnet/MQTT adapter and the agents don't change."

### MCP (P2, thin only)
`mcp_server.py` exposes `get_forecast(zone)`, `get_zone_state(zone)`, `propose_shed(zone, ask)` using the Python MCP SDK, wrapping the same functions the in-process agents use. **Not on the critical path.** If it takes > 20 minutes, skip it.

---

## 14. API contract

**REST (prefix `/api`)**
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/state` | Full snapshot: both twins, tank, solar, scenarios, sim clock, config |
| POST | `/sim/control` | `{action: "play"|"pause"|"speed"|"jump"|"reset", value?}` |
| POST | `/scenario` | `{type: "heatwave"|"exam_week"|"grid_outage"|"tank_leak"|"phantom_load"|"reset"}` |
| GET | `/forecast` | Per-zone + total next-24h, predicted peak, MAPE |
| GET | `/anomalies` | Active anomalies |
| GET | `/ledger` | Counters + time series (baseline vs managed) |
| GET | `/ledger/confidence` | p10/p50/p90 projection |
| GET | `/deals` | All deals |
| POST | `/deals/{id}/approve` · `/reject` | HITL decision |
| POST | `/config/auto-approve` | `{enabled: bool}` |
| GET | `/audit` | Audit log |
| GET | `/bms/outbox` | Recent adapter commands |
| GET | `/health` | `{llm_mode, llm_ok, weather_source, model_loaded}` |

**WebSocket `/ws`** pushes JSON events: `tick`, `feed_message`, `deal_update`, `anomaly`, `ledger_update`, `scenario_update`, `forecast_update`, `health`. On connect, send a full `state` snapshot. Auto-reconnect on the client.

---

## 15. Frontend spec

**Layout (single page, dark theme, desktop 1080p primary):**
```
┌──────────────────────────────────────────────────────────────────┐
│ Top bar: sim clock · play/pause · speed · jump-to · LLM badge     │
│          · weather source · AUTO-APPROVE toggle · Reset           │
├───────────────┬─────────────────────────┬────────────────────────┤
│ Campus Map    │ Negotiation Feed        │ Impact Ledger          │
│ (SVG twin)    │ (agent chat + badges)   │ 5 big counters         │
│ Baseline/     │ Pending deal cards      │ Baseline vs Managed    │
│ Managed       │ [Approve] [Reject]      │ chart + confidence band│
│ toggle        │                         │ + grid cap line        │
├───────────────┴─────────────────────────┴────────────────────────┤
│ Chaos panel: Heatwave · Exam Week · Grid Outage · Tank Leak ·     │
│ Phantom Load · Reset      | tabs: Forecast · Anomalies · Audit ·  │
│ BMS Output                                                        │
└──────────────────────────────────────────────────────────────────┘
```

**Components**
- **CampusMap (P0):** schematic SVG with a block per zone, solar array, and water tank (fill level animates). Block colour = load / zone capacity (green → amber → red). Pulse + animated dashed lines between blocks while they negotiate. Tooltip: kW, occupancy, active deals. A toggle switches the map between **Baseline view** and **Managed view** (a split view is a P1 nice-to-have).
- **NegotiationFeed (P0):** chat bubbles with agent colour/avatar, kind chip (`ASK`, `OFFER`, `SOLVER`, `DEAL`, `ALERT`), source badge (`LLM` / `FALLBACK`). Streams in as messages arrive. Auto-scroll with pause on hover.
- **DealCard (P0):** per-zone allocation table, estimated savings, expandable "Why" (LLM reasoning + solver diff: "LLM proposed 40 kW, solver approved 28 kW because…"), Approve/Reject buttons, status pill.
- **LedgerPanel (P0):** five animated counters (kWh, ₹, kg CO₂, litres, peak kW reduced) with "± range" from the confidence endpoint; Recharts line chart of grid import (baseline vs managed) with shaded p10–p90 band and a horizontal grid-cap line, scenario markers on the x-axis.
- **ChaosPanel (P0):** large buttons, active scenarios highlighted, Reset.
- **ForecastTab (P0):** per-zone and total next-24h forecast, predicted peak annotated, MAPE shown.
- **AnomaliesTab, AuditTab, BmsOutputTab (P1).**
- **Footer:** "Data: simulated, seeded with Open-Meteo weather" + disclosures.
- **Empty/loading/error states:** skeleton loaders; red banner if the WebSocket drops; `FALLBACK` badge visible if the LLM is down.

**UX rules:** no console errors; no layout shift on new feed items; numbers formatted with Indian digit grouping for ₹.

---

## 16. Reliability and fallbacks

| Failure | Behaviour |
|---------|-----------|
| LLM timeout / bad JSON | one retry, then deterministic fallback agent for that zone; feed shows `FALLBACK` |
| No API key | auto `LLM_MODE=mock` |
| Open-Meteo unreachable | cached JSON, else synthetic weather |
| Forecast model missing | train on startup (< 60 s) or use a simple seasonal-naive fallback |
| Solver infeasible | partial deal + alert + `residual_unmet_kw` |
| WebSocket drop | client reconnects and resyncs from `/api/state` |
| Demo insurance (P1) | `POST /api/demo/script` plays a **pre-recorded deterministic sequence** of scenarios + canned negotiation, so a 3-minute demo is reproducible even if everything else breaks |

---

## 17. Build phases and acceptance criteria

**Phase 0 (15 min) — Skeleton.** Repo, Makefile, FastAPI `/health`, Vite app, `/ws` echo, `config.py`, pydantic models, `.env.example`.
✅ `make demo` boots both; frontend shows "connected".

**Phase 1 (60 min) — Twin + data.** `TwinSim` ×2, zones, water, solar, weather (+ cache), timetable generation, tick loop, `/state`, `/sim/control`, WS `tick` events.
✅ Sim runs a full day; deterministic under `SEED`; calibration test passes (Section 6); map shows live colours.

**Phase 2 (45 min) — ML.** Datagen, LightGBM forecast, IsolationForest + rules, `/forecast`, `/anomalies`.
✅ Forecast MAPE displayed; Heatwave raises predicted peak; Phantom Load and Tank Leak raise anomalies.

**Phase 3 (90 min) — Agents + solver.** LLM client + mock + fallback, prompts, orchestrator, solver, deals, approvals, audit, BMS adapter, WS `feed_message` / `deal_update`.
✅ Heatwave triggers an Ask → ≥3 agent offers stream to the feed → solver diff is shown → approving applies commands → the managed twin's import drops below the cap while baseline exceeds it. Works with `LLM_MODE=mock` and with a real key.

**Phase 4 (45 min) — Ledger + chaos.** Ledger math, confidence endpoint, all 5 scenarios + Reset, water/leak flow.
✅ Counters increase only when managed beats baseline; leak scenario shows litres saved after isolation approval.

**Phase 5 (60 min) — Frontend polish.** All P0 components, animations, deal cards, chaos panel, forecast tab.
✅ A non-technical person can run the full demo script without help.

**Phase 6 (45 min) — Hardening + demo.** Fallbacks, demo script endpoint, README (run steps, architecture, **disclosures**), full end-to-end test run, record a backup screen capture.
✅ Entire demo works with Wi-Fi off.

(Total ≈ 5 h 20 min of agent work, leaving buffer. Cut order if behind: P2 items → AnomaliesTab/AuditTab polish → split view → confidence band UI.)

---

## 18. Tests (pytest, required)

1. **Determinism:** same seed → identical 24 h baseline series.
2. **Calibration:** normal day baseline peak < cap; Heatwave and Exam Week baseline peak exceeds the cap by 8–15%.
3. **Solver:** (a) feasible case meets `required_kw` and respects all bounds; (b) infeasible case returns `residual_unmet_kw > 0`; (c) a higher `comfort_weight_multiplier` reduces that zone's allocation; (d) pump deferral never breaches tank reserve.
4. **Ledger:** with no deals, managed == baseline (savings = 0); with a deal, savings > 0 and rebound included.
5. **Agents:** invalid LLM JSON → fallback used and flagged; mock mode needs no network.
6. **API smoke:** `/state`, `/scenario`, `/deals/{id}/approve` round-trip.

---

## 19. Demo script (3 minutes, the build must support exactly this)

1. **(0:00)** "Campuses waste power and water because nobody sees it in real time." Show the twin, normal day, no problem.
2. **(0:30)** Click **Heatwave**. Forecast peak jumps over the cap. Agents start talking. Point at the solver diff: "the LLM proposed, the solver verified."
3. **(1:15)** Click **Approve**. The managed line drops below the cap while baseline stays above it. Counters tick up: kWh, ₹, CO₂, peak kW.
4. **(1:45)** Click **Exam Week** on top. "Same crisis, but the library and hostel push back harder, with context the optimiser alone can't encode."
5. **(2:15)** Click **Tank Leak**. Anomaly raised, water agent proposes isolation, litres saved.
6. **(2:40)** Show the BMS Output tab: "Swap the simulator for BACnet/MQTT and nothing in the agents changes." Close on the ledger.

---

## 20. Disclosures (put in README and UI footer)

- Open-Meteo API (weather and irradiance), open source libraries: FastAPI, LightGBM, scikit-learn, cvxpy, React, Recharts, Tailwind.
- LLM provider used for agent reasoning (Gemini by default).
- Load data is **simulated**, seeded with public weather, and (if used) Building Data Genome 2 shapes.
- Tariff and emission factor are **assumed defaults**, configurable.
- Built during the hackathon window. AI coding agents were used to build it.

---

## 21. Out of scope / risks

- Real meter ingestion, auth, multi-campus, production security: out of scope.
- **Risk: LLM latency/variance on stage** → mock mode + fallback + demo script endpoint.
- **Risk: over-promising impact** → label numbers as "simulated, vs baseline"; never say "replaces hardware smart grids"; say "software control layer over existing BMS".
- **Risk: scope creep** → P2 items are explicitly optional.
