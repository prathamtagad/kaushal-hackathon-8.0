import React from 'react';
import { Flame, GraduationCap, ZapOff, Droplets, Ghost, RotateCcw, AlertTriangle } from 'lucide-react';
import { NeoCard } from './ui/NeoCard';
import { NeoBadge } from './ui/NeoBadge';

interface ChaosPanelProps {
  activeScenarios: string[];
  onTrigger: (type: string) => void;
}

export const ChaosPanel: React.FC<ChaosPanelProps> = ({ activeScenarios, onTrigger }) => {
  const isScenarioActive = (type: string) => activeScenarios.includes(type);

  return (
    <NeoCard
      title="CHAOS INJECTIONS & SCENARIOS"
      subtitle="LIVE STRESS TEST GENERATOR"
      headerColor="orange"
      tag={activeScenarios.length > 0 ? `${activeScenarios.length} ACTIVE` : 'READY'}
      tagColor={activeScenarios.length > 0 ? 'red' : 'black'}
      icon={<AlertTriangle className="w-5 h-5 text-black" />}
      bodyClassName="p-3"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* 1. Heatwave (Orange) */}
        <div className={isScenarioActive('heatwave') ? 'striped-warning-tape rounded-[6px]' : ''}>
          <button
            onClick={() => onTrigger('heatwave')}
            className={`w-full h-full p-3 border-[3px] border-black rounded-[4px] font-['Space_Grotesk',sans-serif] text-left transition-all duration-100 flex flex-col justify-between select-none ${
              isScenarioActive('heatwave')
                ? 'bg-[#FF7B00] text-black translate-x-[4px] translate-y-[4px] shadow-[2px_2px_0_#000]'
                : 'bg-[#FF7B00] text-black shadow-[4px_4px_0_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0_#000]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[3px] bg-black text-[#FF7B00] border-2 border-black flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <NeoBadge variant={isScenarioActive('heatwave') ? 'black' : 'white'} tilt="right">
                {isScenarioActive('heatwave') ? 'ACTIVE' : '+8°C'}
              </NeoBadge>
            </div>
            <div>
              <div className="font-extrabold text-sm uppercase tracking-tight">HEATWAVE</div>
              <div className="text-[10px] font-mono font-bold uppercase mt-0.5 opacity-90">
                +8°C NEXT 6 HOURS
              </div>
            </div>
          </button>
        </div>

        {/* 2. Exam Week (Electric Blue) */}
        <div className={isScenarioActive('exam_week') ? 'striped-warning-tape rounded-[6px]' : ''}>
          <button
            onClick={() => onTrigger('exam_week')}
            className={`w-full h-full p-3 border-[3px] border-black rounded-[4px] font-['Space_Grotesk',sans-serif] text-left transition-all duration-100 flex flex-col justify-between select-none ${
              isScenarioActive('exam_week')
                ? 'bg-[#3A86FF] text-white translate-x-[4px] translate-y-[4px] shadow-[2px_2px_0_#000]'
                : 'bg-[#3A86FF] text-white shadow-[4px_4px_0_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0_#000]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[3px] bg-black text-[#3A86FF] border-2 border-black flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <NeoBadge variant={isScenarioActive('exam_week') ? 'yellow' : 'white'} tilt="left">
                {isScenarioActive('exam_week') ? 'ACTIVE' : 'TIGHT'}
              </NeoBadge>
            </div>
            <div>
              <div className="font-extrabold text-sm uppercase tracking-tight">EXAM WEEK</div>
              <div className="text-[10px] font-mono font-bold uppercase mt-0.5 opacity-90">
                LOCKED COMFORT BAND
              </div>
            </div>
          </button>
        </div>

        {/* 3. Grid Outage (Black with Yellow Text) */}
        <div className={isScenarioActive('grid_outage') ? 'striped-warning-tape rounded-[6px]' : ''}>
          <button
            onClick={() => onTrigger('grid_outage')}
            className={`w-full h-full p-3 border-[3px] border-black rounded-[4px] font-['Space_Grotesk',sans-serif] text-left transition-all duration-100 flex flex-col justify-between select-none ${
              isScenarioActive('grid_outage')
                ? 'bg-black text-[#FFD60A] translate-x-[4px] translate-y-[4px] shadow-[2px_2px_0_#000]'
                : 'bg-black text-[#FFD60A] shadow-[4px_4px_0_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0_#000]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[3px] bg-[#FFD60A] text-black border-2 border-black flex items-center justify-center">
                <ZapOff className="w-5 h-5" />
              </div>
              <NeoBadge variant={isScenarioActive('grid_outage') ? 'red' : 'yellow'} tilt="right">
                {isScenarioActive('grid_outage') ? 'ACTIVE' : '-60%'}
              </NeoBadge>
            </div>
            <div>
              <div className="font-extrabold text-sm uppercase tracking-tight text-[#FFD60A]">GRID OUTAGE</div>
              <div className="text-[10px] font-mono font-bold uppercase mt-0.5 text-white/90">
                CAP → 340 kW (40%)
              </div>
            </div>
          </button>
        </div>

        {/* 4. Tank Leak (Mint) */}
        <div className={isScenarioActive('tank_leak') ? 'striped-warning-tape rounded-[6px]' : ''}>
          <button
            onClick={() => onTrigger('tank_leak')}
            className={`w-full h-full p-3 border-[3px] border-black rounded-[4px] font-['Space_Grotesk',sans-serif] text-left transition-all duration-100 flex flex-col justify-between select-none ${
              isScenarioActive('tank_leak')
                ? 'bg-[#06D6A0] text-black translate-x-[4px] translate-y-[4px] shadow-[2px_2px_0_#000]'
                : 'bg-[#06D6A0] text-black shadow-[4px_4px_0_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0_#000]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[3px] bg-black text-[#06D6A0] border-2 border-black flex items-center justify-center">
                <Droplets className="w-5 h-5" />
              </div>
              <NeoBadge variant={isScenarioActive('tank_leak') ? 'black' : 'white'} tilt="left">
                {isScenarioActive('tank_leak') ? 'ACTIVE' : '6 kL/h'}
              </NeoBadge>
            </div>
            <div>
              <div className="font-extrabold text-sm uppercase tracking-tight">TANK LEAK</div>
              <div className="text-[10px] font-mono font-bold uppercase mt-0.5 opacity-90">
                RESIDUAL WATER LOSS
              </div>
            </div>
          </button>
        </div>

        {/* 5. Phantom Load (Lilac) */}
        <div className={isScenarioActive('phantom_load') ? 'striped-warning-tape rounded-[6px]' : ''}>
          <button
            onClick={() => onTrigger('phantom_load')}
            className={`w-full h-full p-3 border-[3px] border-black rounded-[4px] font-['Space_Grotesk',sans-serif] text-left transition-all duration-100 flex flex-col justify-between select-none ${
              isScenarioActive('phantom_load')
                ? 'bg-[#B388FF] text-black translate-x-[4px] translate-y-[4px] shadow-[2px_2px_0_#000]'
                : 'bg-[#B388FF] text-black shadow-[4px_4px_0_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0_#000]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[3px] bg-black text-[#B388FF] border-2 border-black flex items-center justify-center">
                <Ghost className="w-5 h-5 text-white" />
              </div>
              <NeoBadge variant={isScenarioActive('phantom_load') ? 'black' : 'white'} tilt="right">
                {isScenarioActive('phantom_load') ? 'ACTIVE' : 'STUCK'}
              </NeoBadge>
            </div>
            <div>
              <div className="font-extrabold text-sm uppercase tracking-tight">PHANTOM LOAD</div>
              <div className="text-[10px] font-mono font-bold uppercase mt-0.5 opacity-90">
                UNSCHEDULED BASELOAD
              </div>
            </div>
          </button>
        </div>

        {/* 6. Reset (White) */}
        <div>
          <button
            onClick={() => onTrigger('reset')}
            className="w-full h-full p-3 border-[3px] border-black rounded-[4px] font-['Space_Grotesk',sans-serif] text-left transition-all duration-100 flex flex-col justify-between select-none bg-white text-black shadow-[4px_4px_0_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0_#000]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[3px] bg-[#FFD60A] text-black border-2 border-black flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <NeoBadge variant="mint" tilt="none">
                NORMAL
              </NeoBadge>
            </div>
            <div>
              <div className="font-extrabold text-sm uppercase tracking-tight">RESET CHAOS</div>
              <div className="text-[10px] font-mono font-bold uppercase mt-0.5 opacity-80">
                RESTORE NOMINAL TWIN
              </div>
            </div>
          </button>
        </div>
      </div>
    </NeoCard>
  );
};
