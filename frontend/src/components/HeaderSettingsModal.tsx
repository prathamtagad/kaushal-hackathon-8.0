import React from 'react';
import { X, Settings, ShieldCheck, Cpu, Cloud, Database, IndianRupee, Info } from 'lucide-react';
import { NeoBadge } from './ui/NeoBadge';
import { NeoButton } from './ui/NeoButton';

interface HeaderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    grid_cap_kw: number;
    auto_approve: boolean;
    llm_mode: string;
    weather_source: string;
    tariff_peak?: number;
    tariff_normal?: number;
    tariff_offpeak?: number;
  };
  onAutoApproveToggle: () => void;
  isConnected: boolean;
}

export const HeaderSettingsModal: React.FC<HeaderSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onAutoApproveToggle,
  isConnected,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-neo-pop">
      <div className="w-full max-w-lg bg-white border-[3px] border-black rounded-[4px] shadow-[8px_8px_0_#000] font-['Space_Grotesk',sans-serif] overflow-hidden">
        {/* Header */}
        <div className="p-3.5 bg-[#FFD60A] border-b-[3px] border-black flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-black" />
            <h3 className="font-extrabold text-sm uppercase tracking-tight">
              SYSTEM CONFIGURATION & PROTOCOL STATUS
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[3px] bg-white text-black border-2 border-black flex items-center justify-center font-bold shadow-[2px_2px_0_#000] hover:bg-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs">
          {/* HITL Auto-Approve Policy */}
          <div className="border-2 border-black rounded-[4px] p-3 bg-[#FFF8ED] shadow-[2px_2px_0_#000]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold uppercase text-xs flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-black" />
                <span>HUMAN-IN-THE-LOOP (HITL) APPROVAL</span>
              </span>
              <NeoBadge variant={config.auto_approve ? 'mint' : 'default'}>
                {config.auto_approve ? 'AUTO-APPROVE ON' : 'MANUAL APPROVAL REQUIRED'}
              </NeoBadge>
            </div>
            <p className="text-[11px] text-neutral-600 mb-2.5">
              When disabled, every LP-verified load-shed deal requires human facility manager review.
              When enabled, deals apply directly to the virtual BMS adapter upon solver verification.
            </p>
            <NeoButton
              variant={config.auto_approve ? 'white' : 'mint'}
              size="sm"
              onClick={onAutoApproveToggle}
              className="text-[10px] py-1"
            >
              {config.auto_approve ? 'SWITCH TO MANUAL REVIEW' : 'ENABLE AUTO-APPROVE (DEMO MODE)'}
            </NeoButton>
          </div>

          {/* LLM & AI Engine Mode */}
          <div className="border-2 border-black rounded-[4px] p-3 bg-white shadow-[2px_2px_0_#000]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold uppercase text-xs flex items-center space-x-1.5">
                <Cpu className="w-4 h-4 text-black" />
                <span>AI REASONING ENGINE</span>
              </span>
              <NeoBadge variant="lilac">
                {config.llm_mode.toUpperCase()} MODE
              </NeoBadge>
            </div>
            <p className="text-[11px] text-neutral-600">
              {config.llm_mode === 'mock'
                ? 'Deterministic offline rule agents active. Zero cloud network dependency; 100% reproducible for hackathon judging.'
                : `Live LLM reasoning via ${config.llm_mode.toUpperCase()} provider with JSON structured schema validation.`}
            </p>
          </div>

          {/* Weather & Grid Constants */}
          <div className="grid grid-cols-2 gap-2">
            <div className="border-2 border-black rounded-[4px] p-2.5 bg-[#FFF4E0] shadow-[2px_2px_0_#000]">
              <div className="flex items-center space-x-1 text-neutral-600 mb-1">
                <Cloud className="w-3.5 h-3.5" />
                <span className="font-bold uppercase text-[10px]">WEATHER FEED</span>
              </div>
              <div className="font-extrabold uppercase">{config.weather_source}</div>
              <div className="text-[9px] font-mono text-neutral-600 mt-0.5">Open-Meteo Indore seed</div>
            </div>

            <div className="border-2 border-black rounded-[4px] p-2.5 bg-[#FFF4E0] shadow-[2px_2px_0_#000]">
              <div className="flex items-center space-x-1 text-neutral-600 mb-1">
                <Database className="w-3.5 h-3.5" />
                <span className="font-bold uppercase text-[10px]">WEBSOCKET LINK</span>
              </div>
              <div className="font-extrabold uppercase text-black flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#06D6A0]' : 'bg-[#FF3B30]'}`} />
                <span>{isConnected ? 'ESTABLISHED (LIVE)' : 'DISCONNECTED'}</span>
              </div>
              <div className="text-[9px] font-mono text-neutral-600 mt-0.5">15-min sim tick broadcast</div>
            </div>
          </div>

          {/* Tariff Rates Reference */}
          <div className="border-2 border-black rounded-[4px] p-2.5 bg-white shadow-[2px_2px_0_#000]">
            <div className="flex items-center space-x-1 font-bold uppercase text-[10px] text-neutral-600 mb-1">
              <IndianRupee className="w-3.5 h-3.5" />
              <span>TIME-OF-DAY TARIFF STRUCTURE (MPSERC DISCLOSED)</span>
            </div>
            <div className="grid grid-cols-3 gap-1 font-mono text-[10px] text-center pt-1">
              <div className="bg-[#FF4D8D]/20 border border-black p-1 rounded-[2px]">
                <div className="font-bold text-[#FF3B30]">PEAK</div>
                <div>₹9.00 / kWh</div>
              </div>
              <div className="bg-[#FFD60A]/20 border border-black p-1 rounded-[2px]">
                <div className="font-bold text-black">NORMAL</div>
                <div>₹7.00 / kWh</div>
              </div>
              <div className="bg-[#06D6A0]/20 border border-black p-1 rounded-[2px]">
                <div className="font-bold text-[#00BA88]">OFF-PEAK</div>
                <div>₹5.50 / kWh</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#FFF4E0] border-t-[3px] border-black flex justify-end">
          <NeoButton variant="black" size="sm" onClick={onClose}>
            CLOSE SETTINGS
          </NeoButton>
        </div>
      </div>
    </div>
  );
};
