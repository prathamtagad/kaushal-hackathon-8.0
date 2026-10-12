import React, { useState, useEffect } from 'react';
import { LedgerMetrics, LedgerHistoryPoint } from '../types';
import { Zap, IndianRupee, Leaf, Droplet, ArrowDownRight, RotateCcw, TrendingDown } from 'lucide-react';
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

  const chartData = history.slice(-24).map(point => ({
    ...point,
    displayTime: point.time ? point.time.substring(11, 16) : ''
  }));

  return (
    <NeoCard
      title="IMPACT LEDGER"
      subtitle="LIVE COUNTERFACTUAL"
      headerColor="mint"
      tag="SAVINGS"
      tagColor="yellow"
      icon={<TrendingDown className="w-5 h-5 text-black" />}
      headerAction={
        <NeoButton
          size="sm"
          variant="white"
          onClick={onReset}
          className="text-[10px] px-2 py-0.5 flex items-center space-x-1"
          title="Reset cumulative counters"
        >
          <RotateCcw className="w-3 h-3 text-black" />
          <span>RESET</span>
        </NeoButton>
      }
      className="h-full"
      bodyClassName="p-3 flex flex-col justify-between"
    >
      {/* 5 Giant Counter Tiles in Different Accent Colors with Space Mono count-up and uppercase label stickers */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-3">
        {/* Tile 1: Energy Saved (Yellow) */}
        <div className="bg-[#FFD60A] text-black border-[3px] border-black rounded-[4px] p-2.5 shadow-[4px_4px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold uppercase bg-black text-[#FFD60A] px-1.5 py-0.5 rounded-[2px]">
              ENERGY
            </span>
            <Zap className="w-3.5 h-3.5 text-black" />
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight leading-none">
              <CountUpNumber value={metrics.kwh_saved} />
            </div>
            <div className="text-[9px] font-mono font-bold mt-0.5">kWh SAVED</div>
          </div>
          <div className="text-[8px] font-mono bg-white/70 border border-black px-1 py-0.5 rounded-[2px]">
            {confidence.kwhRange} p10-p90
          </div>
        </div>

        {/* Tile 2: Tariff Saved (Mint) */}
        <div className="bg-[#06D6A0] text-black border-[3px] border-black rounded-[4px] p-2.5 shadow-[4px_4px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold uppercase bg-black text-[#06D6A0] px-1.5 py-0.5 rounded-[2px]">
              TARIFF
            </span>
            <IndianRupee className="w-3.5 h-3.5 text-black" />
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight leading-none">
              <CountUpNumber value={metrics.inr_saved} prefix="₹" />
            </div>
            <div className="text-[9px] font-mono font-bold mt-0.5">INR SAVED</div>
          </div>
          <div className="text-[8px] font-mono bg-white/70 border border-black px-1 py-0.5 rounded-[2px]">
            {confidence.inrRange} proj.
          </div>
        </div>

        {/* Tile 3: CO2 Avoided (Pink) */}
        <div className="bg-[#FF4D8D] text-black border-[3px] border-black rounded-[4px] p-2.5 shadow-[4px_4px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold uppercase bg-black text-[#FF4D8D] px-1.5 py-0.5 rounded-[2px]">
              CARBON
            </span>
            <Leaf className="w-3.5 h-3.5 text-black" />
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight leading-none">
              <CountUpNumber value={metrics.co2_kg_saved} />
            </div>
            <div className="text-[9px] font-mono font-bold mt-0.5">kg CO₂ CUT</div>
          </div>
          <div className="text-[8px] font-mono bg-white/70 border border-black px-1 py-0.5 rounded-[2px]">
            @ 0.82 kg/kWh
          </div>
        </div>

        {/* Tile 4: Water Saved (Electric Blue) */}
        <div className="bg-[#3A86FF] text-white border-[3px] border-black rounded-[4px] p-2.5 shadow-[4px_4px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold uppercase bg-black text-white px-1.5 py-0.5 rounded-[2px]">
              WATER
            </span>
            <Droplet className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight leading-none">
              <CountUpNumber value={metrics.litres_saved} />
            </div>
            <div className="text-[9px] font-mono font-bold mt-0.5 text-white">LITRES WATER</div>
          </div>
          <div className="text-[8px] font-mono bg-white/20 border border-black px-1 py-0.5 rounded-[2px] text-white">
            leak isolation
          </div>
        </div>

        {/* Tile 5: Peak Shaved (Lilac) */}
        <div className="col-span-2 sm:col-span-1 bg-[#B388FF] text-black border-[3px] border-black rounded-[4px] p-2.5 shadow-[4px_4px_0_#000] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold uppercase bg-black text-[#B388FF] px-1.5 py-0.5 rounded-[2px]">
              PEAK
            </span>
            <ArrowDownRight className="w-3.5 h-3.5 text-black" />
          </div>
          <div className="my-1.5">
            <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight leading-none">
              <CountUpNumber value={metrics.peak_kw_reduced} decimals={1} />
            </div>
            <div className="text-[9px] font-mono font-bold mt-0.5">kW SHAVED</div>
          </div>
          <div className="text-[8px] font-mono bg-white/70 border border-black px-1 py-0.5 rounded-[2px]">
            vs baseline max
          </div>
        </div>
      </div>

      {/* Chart: thick black axes, 4px lines (baseline = pink, managed = mint), grid cap as dashed red line with a CAP sticker */}
      <div className="flex-1 w-full min-h-[220px] bg-white border-[3px] border-black rounded-[4px] shadow-[4px_4px_0_#000] p-3 flex flex-col">
        <div className="flex flex-wrap items-center justify-between text-xs pb-2 mb-2 border-b-2 border-black font-['Space_Grotesk',sans-serif]">
          <span className="font-extrabold uppercase tracking-tight text-xs">
            GRID IMPORT: BASELINE vs MANAGED
          </span>
          <div className="flex items-center space-x-2 text-[10px] font-mono font-bold">
            <span className="inline-flex items-center space-x-1 bg-[#FF4D8D] text-black px-1.5 py-0.5 rounded-[2px] border border-black">
              <span>BASELINE</span>
            </span>
            <span className="inline-flex items-center space-x-1 bg-[#06D6A0] text-black px-1.5 py-0.5 rounded-[2px] border border-black">
              <span>MANAGED</span>
            </span>
            <span className="inline-flex items-center space-x-1 bg-[#FF3B30] text-white px-1.5 py-0.5 rounded-[2px] border border-black">
              <span>CAP {gridCapKw}kW</span>
            </span>
          </div>
        </div>

        <div className="flex-1 w-full min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 18, left: -15, bottom: 0 }}>
              <defs>
                {/* Flat hatched pattern for chart background */}
                <pattern id="chartHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#000000" strokeWidth="0.8" opacity="0.1" />
                </pattern>
              </defs>
              <CartesianGrid stroke="#000000" strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis dataKey="displayTime" stroke="#000000" strokeWidth={2} fontSize={10} fontFamily="Space Mono" tickLine={true} />
              <YAxis stroke="#000000" strokeWidth={2} fontSize={10} fontFamily="Space Mono" tickLine={true} domain={[0, 'dataMax + 100']} />
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
                  name === 'baseline_import_kw' ? 'Baseline Import' : 'Managed Import'
                ]}
              />
              <ReferenceLine
                y={gridCapKw}
                stroke="#FF3B30"
                strokeWidth={3}
                strokeDasharray="6 4"
                label={{
                  value: `CAP ${gridCapKw}kW`,
                  fill: '#FFFFFF',
                  fontSize: 10,
                  fontFamily: 'Space Mono',
                  fontWeight: 'bold',
                  position: 'insideTopRight',
                  offset: 5,
                  className: 'bg-black px-1 border border-black'
                }}
              />
              {/* Baseline 4px Line (Pink) */}
              <Line
                type="monotone"
                dataKey="baseline_import_kw"
                stroke="#FF4D8D"
                strokeWidth={4}
                dot={false}
                isAnimationActive={false}
              />
              {/* Managed 4px Line (Mint) */}
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
