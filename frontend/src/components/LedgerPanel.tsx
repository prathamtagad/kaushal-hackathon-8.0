import React, { useState, useEffect } from 'react';
import { LedgerMetrics, LedgerHistoryPoint } from '../types';
import { Zap, IndianRupee, Leaf, Droplet, ArrowDownRight, RotateCcw, TrendingDown, Info, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
import { NeoCard } from './ui/NeoCard';
import { NeoButton } from './ui/NeoButton';
import { NeoBadge } from './ui/NeoBadge';
import { CountUpNumber } from './ui/CountUpNumber';

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

  const chartData = history.slice(-28).map(point => ({
    ...point,
    displayTime: point.time ? point.time.substring(11, 16) : ''
  }));

  return (
    <NeoCard
      title="IMPACT LEDGER & COUNTERFACTUAL AUDIT"
      subtitle="REAL-TIME METRICS VS UNMANAGED BASELINE"
      headerColor="mint"
      tag="MEASURED IMPACT"
      tagColor="yellow"
      icon={<TrendingDown className="w-5 h-5 text-black" />}
      headerAction={
        <NeoButton
          size="sm"
          variant="white"
          onClick={onReset}
          className="text-[10px] px-2.5 py-1 flex items-center space-x-1"
          title="Reset cumulative metrics"
        >
          <RotateCcw className="w-3 h-3 text-black" />
          <span>RESET</span>
        </NeoButton>
      }
      className="h-full"
      bodyClassName="p-3 sm:p-4 flex flex-col justify-between space-y-4"
    >
      {/* Spacious 5-Metric Responsive Grid: never cramped or clipped */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* Metric 1: Financial Savings */}
        <div className="bg-[#06D6A0] text-black border-[3px] border-black rounded-[4px] p-3 shadow-[4px_4px_0_#000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-extrabold uppercase bg-black text-[#06D6A0] px-1.5 py-0.5 rounded-[2px]">
                COST SAVED
              </span>
              <IndianRupee className="w-4 h-4 text-black" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight my-1 text-black">
              <CountUpNumber value={metrics.inr_saved} prefix="₹" />
            </div>
            <div className="text-[10px] font-mono font-bold text-black uppercase">
              TARIFF AVOIDED
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-black/40 text-[9px] font-mono text-black/90">
            {confidence.inrRange} projected • off-peak shift
          </div>
        </div>

        {/* Metric 2: Energy Conservation */}
        <div className="bg-[#FFD60A] text-black border-[3px] border-black rounded-[4px] p-3 shadow-[4px_4px_0_#000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-extrabold uppercase bg-black text-[#FFD60A] px-1.5 py-0.5 rounded-[2px]">
                ENERGY
              </span>
              <Zap className="w-4 h-4 text-black" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight my-1 text-black">
              <CountUpNumber value={metrics.kwh_saved} /> <span className="text-sm font-bold">kWh</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-black uppercase">
              NET GRID ELECTRICITY
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-black/40 text-[9px] font-mono text-black/90">
            {confidence.kwhRange} p10-p90 • rebound accounted
          </div>
        </div>

        {/* Metric 3: Carbon Avoidance */}
        <div className="bg-[#FF4D8D] text-black border-[3px] border-black rounded-[4px] p-3 shadow-[4px_4px_0_#000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-extrabold uppercase bg-black text-[#FF4D8D] px-1.5 py-0.5 rounded-[2px]">
                CARBON
              </span>
              <Leaf className="w-4 h-4 text-black" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight my-1 text-black">
              <CountUpNumber value={metrics.co2_kg_saved} /> <span className="text-sm font-bold">kg</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-black uppercase">
              CO₂ EMISSIONS CUT
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-black/40 text-[9px] font-mono text-black/90">
            @ 0.82 kg CO₂/kWh India Grid Factor
          </div>
        </div>

        {/* Metric 4: Water Conservation */}
        <div className="bg-[#3A86FF] text-white border-[3px] border-black rounded-[4px] p-3 shadow-[4px_4px_0_#000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-extrabold uppercase bg-black text-white px-1.5 py-0.5 rounded-[2px]">
                WATER
              </span>
              <Droplet className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight my-1 text-white">
              <CountUpNumber value={metrics.litres_saved} /> <span className="text-sm font-bold text-white">L</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-white uppercase">
              POTABLE WATER SAVED
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-white/40 text-[9px] font-mono text-white/90">
            Leak detection & pipe isolation
          </div>
        </div>

        {/* Metric 5: Peak Demand Reduction */}
        <div className="bg-[#B388FF] text-black border-[3px] border-black rounded-[4px] p-3 shadow-[4px_4px_0_#000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-extrabold uppercase bg-black text-[#B388FF] px-1.5 py-0.5 rounded-[2px]">
                PEAK SHAVED
              </span>
              <ArrowDownRight className="w-4 h-4 text-black" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight my-1 text-black">
              <CountUpNumber value={metrics.peak_kw_reduced} decimals={1} /> <span className="text-sm font-bold">kW</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-black uppercase">
              MAX DEMAND REDUCED
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-black/40 text-[9px] font-mono text-black/90">
            vs 850 kW Contract Demand Limit
          </div>
        </div>
      </div>

      {/* Counterfactual Comparison Chart: Full width, clean axes and legends */}
      <div className="w-full bg-white border-[3px] border-black rounded-[4px] shadow-[4px_4px_0_#000] p-3 sm:p-4 flex flex-col">
        <div className="flex flex-wrap items-center justify-between pb-2.5 mb-2.5 border-b-2 border-black font-['Space_Grotesk',sans-serif] gap-2">
          <div>
            <span className="font-extrabold uppercase text-xs sm:text-sm tracking-tight">
              GRID IMPORT DYNAMICS: BASELINE (RED) vs MANAGED (GREEN)
            </span>
            <div className="text-[10px] font-mono text-neutral-600 mt-0.5">
              Simulated twin timelines under identical weather, solar irradiance & student occupancy
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold">
            <span className="inline-flex items-center space-x-1 bg-[#FF4D8D] text-black px-2 py-0.5 rounded-[2px] border border-black shadow-[1px_1px_0_#000]">
              <span>UNMANAGED BASELINE</span>
            </span>
            <span className="inline-flex items-center space-x-1 bg-[#06D6A0] text-black px-2 py-0.5 rounded-[2px] border border-black shadow-[1px_1px_0_#000]">
              <span>MANAGED TWIN</span>
            </span>
            <span className="inline-flex items-center space-x-1 bg-[#FF3B30] text-white px-2 py-0.5 rounded-[2px] border border-black shadow-[1px_1px_0_#000]">
              <span>GRID CAP ({gridCapKw} kW)</span>
            </span>
          </div>
        </div>

        <div className="w-full h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#000000" strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis dataKey="displayTime" stroke="#000000" strokeWidth={2} fontSize={10} fontFamily="Space Mono" tickLine={true} />
              <YAxis stroke="#000000" strokeWidth={2} fontSize={10} fontFamily="Space Mono" tickLine={true} domain={[0, 'dataMax + 80']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFD60A',
                  borderColor: '#000000',
                  borderWidth: '2px',
                  borderRadius: '3px',
                  boxShadow: '4px 4px 0 #000',
                  fontSize: '11px',
                  fontFamily: 'Space Mono',
                  fontWeight: 'bold',
                  color: '#000000'
                }}
                formatter={(val: any, name: any) => [
                  `${val} kW`,
                  name === 'baseline_import_kw' ? 'Baseline (Unmanaged)' : 'Managed (Agent Swarm)'
                ]}
              />
              <ReferenceLine
                y={gridCapKw}
                stroke="#FF3B30"
                strokeWidth={3}
                strokeDasharray="6 4"
                label={{
                  value: `CONTRACT CAP ${gridCapKw}kW`,
                  fill: '#FF3B30',
                  fontSize: 10,
                  fontFamily: 'Space Mono',
                  fontWeight: 'bold',
                  position: 'insideTopRight'
                }}
              />
              <Line
                type="monotone"
                dataKey="baseline_import_kw"
                stroke="#FF4D8D"
                strokeWidth={4}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="managed_import_kw"
                stroke="#06D6A0"
                strokeWidth={4}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </NeoCard>
  );
};
