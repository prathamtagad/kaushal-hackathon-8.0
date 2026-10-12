import React, { useState, useEffect } from 'react';
import { LedgerMetrics, LedgerHistoryPoint } from '../types';
import { Zap, IndianRupee, Leaf, Droplet, ArrowDownRight, RotateCcw, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, Area } from 'recharts';

interface LedgerPanelProps {
  metrics: LedgerMetrics;
  history: LedgerHistoryPoint[];
  gridCapKw: number;
  onReset: () => void;
}

export const LedgerPanel: React.FC<LedgerPanelProps> = ({
  metrics,
  history,
  gridCapKw,
  onReset
}) => {
  const [confidence, setConfidence] = useState<{ kwhRange: string; inrRange: string }>({
    kwhRange: '± 8%',
    inrRange: '± 7%'
  });

  useEffect(() => {
    // Fetch confidence bounds
    fetch('/api/ledger/confidence')
      .then(res => res.json())
      .then(data => {
        if (data && data.inr && data.kwh) {
          const inrSpread = Math.round(((data.inr.p90 - data.inr.p10) / (data.inr.p50 || 1)) * 50);
          const kwhSpread = Math.round(((data.kwh.p90 - data.kwh.p10) / (data.kwh.p50 || 1)) * 50);
          setConfidence({
            inrRange: `± ${Math.max(5, Math.min(20, inrSpread))}%`,
            kwhRange: `± ${Math.max(5, Math.min(20, kwhSpread))}%`
          });
        }
      })
      .catch(() => {});
  }, [metrics.kwh_saved]);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
  };

  // Prepare chart data: format time label to HH:MM
  const chartData = history.slice(-24).map(point => ({
    ...point,
    displayTime: point.time ? point.time.substring(11, 16) : ''
  }));

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <TrendingDown className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold tracking-wide text-gray-200 uppercase">
            Impact Ledger (Live Counterfactual)
          </h2>
        </div>
        <button
          onClick={onReset}
          className="text-[11px] text-gray-400 hover:text-gray-200 flex items-center space-x-1 px-2 py-0.5 rounded bg-gray-800/80 border border-gray-700 hover:border-gray-600 transition-all"
          title="Reset cumulative counters"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* 5 Big Impact Counters */}
      <div className="grid grid-cols-5 gap-2.5 mb-4">
        {/* Counter 1: kWh saved */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/50 p-2.5 rounded-xl border border-gray-800 text-center relative overflow-hidden">
          <div className="text-[10px] text-gray-400 flex items-center justify-center space-x-1 mb-0.5">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Energy Saved</span>
          </div>
          <div className="text-lg font-bold text-amber-300 font-mono tracking-tight">
            {metrics.kwh_saved.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">kWh</span>
          </div>
          <div className="text-[9px] text-gray-500 font-mono mt-0.5">
            {confidence.kwhRange} p10-p90
          </div>
        </div>

        {/* Counter 2: INR saved */}
        <div className="bg-gradient-to-br from-emerald-950/40 to-gray-900/90 p-2.5 rounded-xl border border-emerald-800/40 text-center relative overflow-hidden shadow-lg shadow-emerald-950/20">
          <div className="text-[10px] text-emerald-400 flex items-center justify-center space-x-1 mb-0.5 font-medium">
            <IndianRupee className="w-3 h-3 text-emerald-400" />
            <span>Tariff Saved</span>
          </div>
          <div className="text-lg font-bold text-emerald-300 font-mono tracking-tight">
            ₹{formatINR(metrics.inr_saved)}
          </div>
          <div className="text-[9px] text-emerald-500/80 font-mono mt-0.5">
            {confidence.inrRange} projected
          </div>
        </div>

        {/* Counter 3: kg CO2 */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/50 p-2.5 rounded-xl border border-gray-800 text-center relative overflow-hidden">
          <div className="text-[10px] text-gray-400 flex items-center justify-center space-x-1 mb-0.5">
            <Leaf className="w-3 h-3 text-green-400" />
            <span>CO₂ Avoided</span>
          </div>
          <div className="text-lg font-bold text-green-300 font-mono tracking-tight">
            {metrics.co2_kg_saved.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">kg</span>
          </div>
          <div className="text-[9px] text-gray-500 font-mono mt-0.5">
            @ 0.82 kg/kWh
          </div>
        </div>

        {/* Counter 4: Litres Water Saved */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/50 p-2.5 rounded-xl border border-gray-800 text-center relative overflow-hidden">
          <div className="text-[10px] text-gray-400 flex items-center justify-center space-x-1 mb-0.5">
            <Droplet className="w-3 h-3 text-blue-400" />
            <span>Water Saved</span>
          </div>
          <div className="text-lg font-bold text-blue-300 font-mono tracking-tight">
            {metrics.litres_saved.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">L</span>
          </div>
          <div className="text-[9px] text-gray-500 font-mono mt-0.5">
            leak isolation
          </div>
        </div>

        {/* Counter 5: Peak kW Reduced */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/50 p-2.5 rounded-xl border border-gray-800 text-center relative overflow-hidden">
          <div className="text-[10px] text-gray-400 flex items-center justify-center space-x-1 mb-0.5">
            <ArrowDownRight className="w-3 h-3 text-purple-400" />
            <span>Peak Shaved</span>
          </div>
          <div className="text-lg font-bold text-purple-300 font-mono tracking-tight">
            {metrics.peak_kw_reduced.toFixed(1)} <span className="text-[10px] font-normal text-gray-400">kW</span>
          </div>
          <div className="text-[9px] text-gray-500 font-mono mt-0.5">
            vs baseline max
          </div>
        </div>
      </div>

      {/* Baseline vs Managed Time-Series Chart */}
      <div className="flex-1 w-full min-h-[220px] bg-[#0c1220] rounded-xl border border-gray-800/80 p-2 flex flex-col">
        <div className="flex items-center justify-between text-xs px-2 mb-1">
          <span className="text-gray-400 font-medium">Grid Import: Baseline vs Managed</span>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-0.5 bg-rose-500"></span>
              <span className="text-rose-400">Baseline (Unmanaged)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-0.5 bg-emerald-500"></span>
              <span className="text-emerald-400">Managed (Agent Twin)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-0.5 border-t border-dashed border-red-500"></span>
              <span className="text-red-400">Cap ({gridCapKw} kW)</span>
            </span>
          </div>
        </div>

        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="displayTime" stroke="#6b7280" fontSize={10} tickLine={false} />
              <YAxis stroke="#6b7280" fontSize={10} tickLine={false} domain={[0, 'dataMax + 100']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  borderColor: '#374151',
                  borderRadius: '0.5rem',
                  fontSize: '11px'
                }}
                formatter={(val: any, name: any) => [
                  `${val} kW`,
                  name === 'baseline_import_kw' ? 'Baseline Import' : 'Managed Import'
                ]}
              />
              <ReferenceLine y={gridCapKw} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `Grid Cap ${gridCapKw}kW`, fill: '#ef4444', fontSize: 10, position: 'top' }} />
              <Line
                type="monotone"
                dataKey="baseline_import_kw"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="managed_import_kw"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
