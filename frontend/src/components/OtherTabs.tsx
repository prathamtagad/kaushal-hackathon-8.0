import React, { useState, useEffect } from 'react';
import { Anomaly } from '../types';
import { CheckCircle2, Droplet, Ghost, AlertTriangle, Terminal, FileText, ArrowRight } from 'lucide-react';
import { NeoBadge } from './ui/NeoBadge';

export const AnomaliesTab: React.FC<{ anomalies: Anomaly[] }> = ({ anomalies }) => {
  return (
    <div className="space-y-3 font-['Space_Grotesk',sans-serif]">
      {anomalies.length === 0 ? (
        <div className="p-8 text-center bg-white border-[3px] border-black rounded-[4px] shadow-[4px_4px_0_#000]">
          <div className="w-12 h-12 rounded-[4px] bg-[#06D6A0] border-2 border-black mx-auto mb-2 flex items-center justify-center shadow-[2px_2px_0_#000]">
            <CheckCircle2 className="w-6 h-6 text-black" />
          </div>
          <div className="font-extrabold uppercase text-sm">ZERO CAMPUS WASTE DETECTED</div>
          <div className="text-[11px] font-mono text-neutral-600 mt-1">
            IsolationForest & Water Residual algorithms scanning continuously. All systems nominal.
          </div>
        </div>
      ) : (
        anomalies.map((anom) => (
          <div
            key={anom.anomaly_id}
            className="p-3.5 bg-[#FF3B30] text-white border-[3px] border-black rounded-[4px] shadow-[6px_6px_0_#000] flex items-start justify-between text-xs animate-neo-slide-in"
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-[3px] bg-black text-white border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_#000]">
                {anom.kind === 'tank_leak' ? (
                  <Droplet className="w-5 h-5 text-[#3A86FF]" />
                ) : (
                  <Ghost className="w-5 h-5 text-[#FFD60A]" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm uppercase tracking-tight">{anom.message}</span>
                  <NeoBadge variant="black" tilt="right">
                    CRITICAL
                  </NeoBadge>
                </div>
                <div className="text-[11px] font-mono mt-1 text-white/90">
                  SINCE: <span className="font-bold underline">{new Date(anom.since).toLocaleTimeString()}</span>
                  {anom.est_waste_kw > 0 && ` • WASTE: ${anom.est_waste_kw} kW`}
                  {anom.est_leak_kl_per_h > 0 && ` • LEAK: ${anom.est_leak_kl_per_h} kL/h`}
                </div>
              </div>
            </div>

            <div className="text-right">
              <NeoBadge variant="yellow" tilt="left">
                DEAL PENDING
              </NeoBadge>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export const AuditTab: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/audit')
      .then(res => res.json())
      .then(data => setLogs(data || []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 font-['Space_Grotesk',sans-serif]">
      {logs.length === 0 ? (
        <div className="p-8 text-center bg-white border-[3px] border-black rounded-[4px] shadow-[4px_4px_0_#000] font-mono text-xs">
          NO AUDIT LOG ENTRIES RECORDED YET.
        </div>
      ) : (
        logs.map((entry) => (
          <div
            key={entry.entry_id}
            className="p-2.5 bg-white border-2 border-black rounded-[3px] shadow-[2px_2px_0_#000] text-xs flex flex-wrap items-center justify-between gap-2"
          >
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] bg-[#FFF4E0] border border-black px-1.5 py-0.5 rounded-[2px] font-bold">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className="font-extrabold uppercase bg-black text-[#FFD60A] px-1.5 py-0.5 rounded-[2px] text-[10px]">
                {entry.actor}
              </span>
              <ArrowRight className="w-3 h-3 text-black" />
              <span className="font-mono font-bold text-black uppercase bg-[#06D6A0] px-1.5 py-0.5 rounded-[2px] border border-black text-[10px]">
                {entry.action}
              </span>
            </div>
            <div className="text-[10px] font-mono font-bold text-neutral-700 bg-[#FFF8ED] px-2 py-0.5 rounded border border-black truncate max-w-md">
              {JSON.stringify(entry.details)}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export const BmsOutputTab: React.FC = () => {
  const [outbox, setOutbox] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/bms/outbox')
      .then(res => res.json())
      .then(data => setOutbox(data || []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-2 font-['Space_Grotesk',sans-serif]">
      <div className="text-xs font-extrabold uppercase flex flex-wrap items-center justify-between pb-1 border-b-2 border-black">
        <span className="flex items-center space-x-1.5">
          <Terminal className="w-4 h-4 text-black" />
          <span>BMS / BACnet / MQTT DISPATCH OUTBOX (HARDWARE BRIDGE)</span>
        </span>
        <NeoBadge variant="mint">
          ADAPTER: SimAdapter + MqttStub
        </NeoBadge>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-[10px] pr-1">
        {outbox.length === 0 ? (
          <div className="p-6 text-center bg-white border-2 border-black rounded-[3px] shadow-[2px_2px_0_#000] text-xs font-mono font-bold">
            NO DISPATCHED COMMANDS IN BMS OUTBOX YET.
          </div>
        ) : (
          outbox.map((cmd, idx) => (
            <div key={idx} className="p-2.5 bg-black text-[#06D6A0] border-[3px] border-black rounded-[4px] shadow-[4px_4px_0_#000]">
              <div className="flex justify-between font-bold mb-1 border-b border-neutral-700 pb-1">
                <span className="text-[#FFD60A]">TOPIC: {cmd.topic}</span>
                <span className="text-neutral-400 font-normal">{new Date(cmd.dispatched_at).toLocaleTimeString()}</span>
              </div>
              <pre className="overflow-x-auto text-[10px] text-white">
                {JSON.stringify(cmd.payload, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const WorkflowTab: React.FC = () => {
  return (
    <div className="space-y-4 font-['Space_Grotesk',sans-serif]">
      {/* Header Banner */}
      <div className="bg-[#FFF4E0] border-[3px] border-black rounded-[4px] p-4 shadow-[4px_4px_0_#000]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2 mb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-extrabold uppercase tracking-tight">CAMPUSMIND END-TO-END SYSTEM WORKFLOW</span>
              <NeoBadge variant="mint">DECISION ARCHITECTURE</NeoBadge>
            </div>
            <p className="text-xs text-neutral-700 mt-1">
              How AI zone agents, predictive LightGBM ML, convex safety optimization, and counterfactual twins interact in real-time.
            </p>
          </div>
          <div className="text-right font-mono text-[10px] font-bold bg-black text-[#FFD60A] px-2 py-1 rounded-[2px]">
            PS-04 SUSTAINABLE TECH
          </div>
        </div>

        {/* Interactive Step-by-Step Architecture Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {/* Step 1 */}
          <div className="bg-white border-2 border-black rounded-[3px] p-2.5 shadow-[2px_2px_0_#000] flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-extrabold bg-[#FFD60A] text-black px-1.5 py-0.5 rounded-[2px] border border-black inline-block mb-1.5">
                STEP 01
              </div>
              <div className="font-extrabold uppercase text-[11px] mb-1">DIGITAL TWIN SENSORS</div>
              <p className="text-[10px] text-neutral-700 font-sans leading-tight">
                Simulated 415V feeder import, solar PV output, 4 building zone sub-meters, and 300 kL reservoir level updated every 15 min.
              </p>
            </div>
            <div className="mt-2 text-[9px] font-mono text-neutral-500 border-t border-neutral-300 pt-1">
              Physics engine lockstep
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white border-2 border-black rounded-[3px] p-2.5 shadow-[2px_2px_0_#000] flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-extrabold bg-[#3A86FF] text-white px-1.5 py-0.5 rounded-[2px] border border-black inline-block mb-1.5">
                STEP 02
              </div>
              <div className="font-extrabold uppercase text-[11px] mb-1">LIGHTGBM & ML PREDICTIONS</div>
              <p className="text-[10px] text-neutral-700 font-sans leading-tight">
                24-hour GBDT load forecast (MAPE &lt; 2%) evaluates weather, solar irradiance, and timetable occupancy. Detects anomalies.
              </p>
            </div>
            <div className="mt-2 text-[9px] font-mono text-neutral-500 border-t border-neutral-300 pt-1">
              Horizon trigger check
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white border-2 border-black rounded-[3px] p-2.5 shadow-[2px_2px_0_#000] flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-extrabold bg-[#FF7B00] text-black px-1.5 py-0.5 rounded-[2px] border border-black inline-block mb-1.5">
                STEP 03
              </div>
              <div className="font-extrabold uppercase text-[11px] mb-1">MULTI-AGENT NEGOTIATION</div>
              <p className="text-[10px] text-neutral-700 font-sans leading-tight">
                GridAgent broadcasts Ask. Hostel, Library, Labs, Admin & Water agents formulate structured offers based on comfort priorities.
              </p>
            </div>
            <div className="mt-2 text-[9px] font-mono text-neutral-500 border-t border-neutral-300 pt-1">
              LLM + dynamic weights
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white border-2 border-black rounded-[3px] p-2.5 shadow-[2px_2px_0_#000] flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-extrabold bg-[#FF4D8D] text-black px-1.5 py-0.5 rounded-[2px] border border-black inline-block mb-1.5">
                STEP 04
              </div>
              <div className="font-extrabold uppercase text-[11px] mb-1">CONVEX SOLVER (cvxpy)</div>
              <p className="text-[10px] text-neutral-700 font-sans leading-tight">
                Quadratic penalty optimizer validates offers, guarantees hard thermal bounds (&le;27°C) & reserve floors, outputting optimal allocations.
              </p>
            </div>
            <div className="mt-2 text-[9px] font-mono text-neutral-500 border-t border-neutral-300 pt-1">
              Hard constraint oracle
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-white border-2 border-black rounded-[3px] p-2.5 shadow-[2px_2px_0_#000] flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-extrabold bg-[#06D6A0] text-black px-1.5 py-0.5 rounded-[2px] border border-black inline-block mb-1.5">
                STEP 05
              </div>
              <div className="font-extrabold uppercase text-[11px] mb-1">HITL FACILITY APPROVAL</div>
              <p className="text-[10px] text-neutral-700 font-sans leading-tight">
                Facility manager inspects deal reasoning and solver diff. One-click Approve or automated policy dispatches BMS commands.
              </p>
            </div>
            <div className="mt-2 text-[9px] font-mono text-neutral-500 border-t border-neutral-300 pt-1">
              BACnet/MQTT outbox
            </div>
          </div>

          {/* Step 6 */}
          <div className="bg-white border-2 border-black rounded-[3px] p-2.5 shadow-[2px_2px_0_#000] flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-extrabold bg-[#B388FF] text-black px-1.5 py-0.5 rounded-[2px] border border-black inline-block mb-1.5">
                STEP 06
              </div>
              <div className="font-extrabold uppercase text-[11px] mb-1">COUNTERFACTUAL LEDGER</div>
              <p className="text-[10px] text-neutral-700 font-sans leading-tight">
                Managed twin differential measured against unmanaged baseline in real-time, accounting for HVAC rebound and TOD tariffs.
              </p>
            </div>
            <div className="mt-2 text-[9px] font-mono text-neutral-500 border-t border-neutral-300 pt-1">
              Proved kWh, ₹, CO₂, & Litres
            </div>
          </div>
        </div>
      </div>

      {/* "WHAT PROBLEMS DOES CAMPUSMIND SOLVE?" SECTION */}
      <div className="bg-white border-[3px] border-black rounded-[4px] p-4 shadow-[4px_4px_0_#000]">
        <div className="flex items-center space-x-2 border-b-2 border-black pb-2 mb-3">
          <span className="font-extrabold text-xs uppercase tracking-tight">KEY PROBLEMS SOLVED & ECONOMIC/ENVIRONMENTAL IMPACT</span>
          <NeoBadge variant="yellow">REAL-WORLD IMPACT</NeoBadge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1 */}
          <div className="bg-[#FFF8ED] border-2 border-black rounded-[3px] p-3 shadow-[2px_2px_0_#000]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-extrabold bg-[#FF3B30] text-white px-1.5 py-0.5 rounded-[2px]">
                01. CONTRACT PEAK CHARGES
              </span>
            </div>
            <div className="font-extrabold text-xs mb-1">DISCOM Demand Charge Penalties</div>
            <p className="text-[11px] text-neutral-700 leading-relaxed font-sans">
              Indian power distribution companies (DISCOMs) bill university campuses heavy penalties (150%–200% standard rate) whenever import exceeds the sanctioned contract demand (850 kW). CampusMind proactively detects impending peaks 2 hours ahead and negotiates shedding before breaches occur.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#FFF8ED] border-2 border-black rounded-[3px] p-3 shadow-[2px_2px_0_#000]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-extrabold bg-[#FF7B00] text-black px-1.5 py-0.5 rounded-[2px]">
                02. TOD TARIFF SPIKES
              </span>
            </div>
            <div className="font-extrabold text-xs mb-1">Time-Of-Day Tariff Arbitrage</div>
            <p className="text-[11px] text-neutral-700 leading-relaxed font-sans">
              Electricity during evening peak hours (18:00–22:00) costs ₹9.00/kWh versus ₹5.50/kWh off-peak. Campuses routinely run water borewell pumps during peak hours. CampusMind co-schedules heavy pumping and laundry loads into off-peak or solar-surplus hours, cutting thousands in monthly bills.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#FFF8ED] border-2 border-black rounded-[3px] p-3 shadow-[2px_2px_0_#000]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-extrabold bg-[#3A86FF] text-white px-1.5 py-0.5 rounded-[2px]">
                03. UNSEEN WATER LOSSES
              </span>
            </div>
            <div className="font-extrabold text-xs mb-1">Underground Pipe Leak Detection</div>
            <p className="text-[11px] text-neutral-700 leading-relaxed font-sans">
              Underground water distribution pipelines frequently burst or develop leaks unnoticed for weeks, wasting 6,000+ litres/hour. The water residual detection algorithm tracks tank mass-balance vs expected occupancy outflow, flagging breaches within 45 minutes and generating valve isolation orders.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-[#FFF8ED] border-2 border-black rounded-[3px] p-3 shadow-[2px_2px_0_#000]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-extrabold bg-[#B388FF] text-black px-1.5 py-0.5 rounded-[2px]">
                04. PHANTOM NIGHT WASTE
              </span>
            </div>
            <div className="font-extrabold text-xs mb-1">Empty Facility Ghost Loads</div>
            <p className="text-[11px] text-neutral-700 leading-relaxed font-sans">
              Auditoriums, lecture halls, and laboratories frequently leave high-tonnage AC split units and lighting energized during zero-occupancy night hours (~35 kW continuous waste). IsolationForest ML flags anomalous energy usage and auto-generates targeted BMS shutdown deals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
