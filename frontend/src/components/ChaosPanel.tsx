import React from 'react';
import { Flame, GraduationCap, ZapOff, Droplets, Ghost, RotateCcw, AlertTriangle } from 'lucide-react';

interface ChaosPanelProps {
  activeScenarios: string[];
  onTrigger: (type: string) => void;
}

export const ChaosPanel: React.FC<ChaosPanelProps> = ({ activeScenarios, onTrigger }) => {
  const isScenarioActive = (type: string) => activeScenarios.includes(type);

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between">
      <div className="flex items-center space-x-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h3 className="text-xs font-semibold text-gray-200 tracking-wider uppercase">
          Chaos Buttons & Live Injections
        </h3>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {/* Heatwave */}
        <button
          onClick={() => onTrigger('heatwave')}
          className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl border font-medium text-xs transition-all ${
            isScenarioActive('heatwave')
              ? 'bg-orange-600/30 border-orange-500 text-orange-200 shadow-lg shadow-orange-950/40 animate-pulse'
              : 'bg-gray-900/60 border-gray-800 text-gray-300 hover:border-orange-500/50 hover:bg-orange-950/20'
          }`}
        >
          <Flame className={`w-4 h-4 ${isScenarioActive('heatwave') ? 'text-orange-400' : 'text-gray-400'}`} />
          <div className="text-left">
            <div className="font-semibold">Heatwave</div>
            <div className="text-[10px] text-gray-500">+8°C Next 6h</div>
          </div>
        </button>

        {/* Exam Week */}
        <button
          onClick={() => onTrigger('exam_week')}
          className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl border font-medium text-xs transition-all ${
            isScenarioActive('exam_week')
              ? 'bg-amber-600/30 border-amber-500 text-amber-200 shadow-lg shadow-amber-950/40 animate-pulse'
              : 'bg-gray-900/60 border-gray-800 text-gray-300 hover:border-amber-500/50 hover:bg-amber-950/20'
          }`}
        >
          <GraduationCap className={`w-4 h-4 ${isScenarioActive('exam_week') ? 'text-amber-400' : 'text-gray-400'}`} />
          <div className="text-left">
            <div className="font-semibold">Exam Week</div>
            <div className="text-[10px] text-gray-500">Tight Comfort Floors</div>
          </div>
        </button>

        {/* Grid Outage */}
        <button
          onClick={() => onTrigger('grid_outage')}
          className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl border font-medium text-xs transition-all ${
            isScenarioActive('grid_outage')
              ? 'bg-rose-600/30 border-rose-500 text-rose-200 shadow-lg shadow-rose-950/40 animate-pulse'
              : 'bg-gray-900/60 border-gray-800 text-gray-300 hover:border-rose-500/50 hover:bg-rose-950/20'
          }`}
        >
          <ZapOff className={`w-4 h-4 ${isScenarioActive('grid_outage') ? 'text-rose-400' : 'text-gray-400'}`} />
          <div className="text-left">
            <div className="font-semibold">Grid Outage</div>
            <div className="text-[10px] text-gray-500">Cap → 40% (340kW)</div>
          </div>
        </button>

        {/* Tank Leak */}
        <button
          onClick={() => onTrigger('tank_leak')}
          className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl border font-medium text-xs transition-all ${
            isScenarioActive('tank_leak')
              ? 'bg-blue-600/30 border-blue-500 text-blue-200 shadow-lg shadow-blue-950/40 animate-pulse'
              : 'bg-gray-900/60 border-gray-800 text-gray-300 hover:border-blue-500/50 hover:bg-blue-950/20'
          }`}
        >
          <Droplets className={`w-4 h-4 ${isScenarioActive('tank_leak') ? 'text-blue-400' : 'text-gray-400'}`} />
          <div className="text-left">
            <div className="font-semibold">Tank Leak</div>
            <div className="text-[10px] text-gray-500">+6 kL/h Loss</div>
          </div>
        </button>

        {/* Phantom Load */}
        <button
          onClick={() => onTrigger('phantom_load')}
          className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl border font-medium text-xs transition-all ${
            isScenarioActive('phantom_load')
              ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-lg shadow-purple-950/40 animate-pulse'
              : 'bg-gray-900/60 border-gray-800 text-gray-300 hover:border-purple-500/50 hover:bg-purple-950/20'
          }`}
        >
          <Ghost className={`w-4 h-4 ${isScenarioActive('phantom_load') ? 'text-purple-400' : 'text-gray-400'}`} />
          <div className="text-left">
            <div className="font-semibold">Phantom Load</div>
            <div className="text-[10px] text-gray-500">Stuck Lights / AC</div>
          </div>
        </button>

        {/* Reset Chaos */}
        <button
          onClick={() => onTrigger('reset')}
          className="flex items-center space-x-2 px-3 py-2.5 rounded-xl border border-gray-700 bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white transition-all font-medium text-xs justify-center"
        >
          <RotateCcw className="w-4 h-4 text-emerald-400" />
          <div className="text-left">
            <div className="font-semibold">Reset Chaos</div>
            <div className="text-[10px] text-gray-400">Restore Normal</div>
          </div>
        </button>
      </div>
    </div>
  );
};
