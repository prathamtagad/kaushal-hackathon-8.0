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
