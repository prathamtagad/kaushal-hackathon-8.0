import React, { useState, useEffect } from 'react';
import { Anomaly } from '../types';
import { AlertCircle, FileText, Terminal, CheckCircle2, Droplet, Ghost } from 'lucide-react';

export const AnomaliesTab: React.FC<{ anomalies: Anomaly[] }> = ({ anomalies }) => {
  return (
    <div className="space-y-3">
      {anomalies.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-xs bg-gray-900/40 rounded-xl border border-gray-800">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/60" />
          <div>Zero Active Campus Waste Anomalies Detected.</div>
          <div className="text-[11px] text-gray-600 mt-1">
            IsolationForest & Water Residual algorithms scanning continuously.
          </div>
        </div>
      ) : (
        anomalies.map((anom) => (
          <div
            key={anom.anomaly_id}
            className="p-3.5 rounded-xl bg-gray-900/80 border border-rose-500/40 flex items-start justify-between text-xs"
          >
            <div className="flex items-start space-x-3">
              {anom.kind === 'tank_leak' ? (
                <Droplet className="w-5 h-5 text-blue-400 mt-0.5" />
              ) : (
                <Ghost className="w-5 h-5 text-purple-400 mt-0.5" />
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-gray-200">{anom.message}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700">
                    CRITICAL
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  Detected Since: <span className="font-mono text-gray-300">{new Date(anom.since).toLocaleTimeString()}</span>
                  {anom.est_waste_kw > 0 && ` • Estimated Waste: ${anom.est_waste_kw} kW`}
                  {anom.est_leak_kl_per_h > 0 && ` • Leak Rate: ${anom.est_leak_kl_per_h} kL/h`}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[10px]">
                Deal Pending
              </span>
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
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {logs.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-xs">No audit entries yet.</div>
      ) : (
        logs.map((entry) => (
          <div key={entry.entry_id} className="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 text-[11px] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] text-gray-500">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className="font-bold text-gray-300 capitalize">{entry.actor}</span>
              <span className="text-gray-500">→</span>
              <span className="text-emerald-400 font-mono">{entry.action}</span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
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
    <div className="space-y-2">
      <div className="text-[11px] text-gray-400 mb-1 flex items-center justify-between">
        <span>BMS / BACnet / MQTT Dispatch Outbox (Simulated Hardware Adapter)</span>
        <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
          Adapter: SimAdapter + MqttStub
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-[10px] pr-1">
        {outbox.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-xs">No dispatched commands in BMS outbox yet.</div>
        ) : (
          outbox.map((cmd, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-black/60 border border-gray-800 text-gray-300">
              <div className="flex justify-between text-emerald-400 font-bold mb-1">
                <span>TOPIC: {cmd.topic}</span>
                <span className="text-gray-500 font-normal">{new Date(cmd.dispatched_at).toLocaleTimeString()}</span>
              </div>
              <pre className="text-gray-300 overflow-x-auto text-[10px]">
                {JSON.stringify(cmd.payload, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
