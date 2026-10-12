import React, { useState } from 'react';
import { TwinState, Deal } from '../types';
import { Building, Zap, Droplets, Sun, Activity, Info } from 'lucide-react';
import { NeoCard } from './ui/NeoCard';
import { NeoButton } from './ui/NeoButton';
import { NeoBadge } from './ui/NeoBadge';

interface CampusMapProps {
  baselineState: TwinState;
  managedState: TwinState;
  activeDeals: Deal[];
  isNegotiating?: boolean;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  baselineState,
  managedState,
  activeDeals,
  isNegotiating = false,
}) => {
  const [viewMode, setViewMode] = useState<'managed' | 'baseline'>('managed');
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const currentTwin = viewMode === 'managed' ? managedState : baselineState;
  const zones = currentTwin.zones || {};

  // Zone capacity mapping
  const capacities: Record<string, number> = {
    hostel: 380,
    library: 180,
    labs: 260,
    admin: 130
  };

  // Hard step neo-brutalist colors: mint, yellow, orange, red (pure black text)
  const getLoadRatioStyle = (loadKw: number, capacityKw: number) => {
    const ratio = loadKw / capacityKw;
    if (ratio < 0.65) {
      return { fill: '#06D6A0', headerFill: '#00BA88', text: '#000000', label: 'NORMAL' };
    }
    if (ratio < 0.85) {
      return { fill: '#FFD60A', headerFill: '#E6C000', text: '#000000', label: 'ELEVATED' };
    }
    if (ratio < 1.0) {
      return { fill: '#FF7B00', headerFill: '#E66E00', text: '#000000', label: 'HIGH STRAIN' };
    }
    return { fill: '#FF3B30', headerFill: '#D62820', text: '#FFFFFF', label: 'OVERLOAD' };
  };

  return (
    <NeoCard
      title="CAMPUS TWIN 2D MAP"
      subtitle={viewMode === 'managed' ? 'AGENT CO-OPTIMISED' : 'UNMANAGED BASELINE'}
      headerColor="yellow"
      tag={isNegotiating ? 'NEGOTIATING' : 'LIVE TWIN'}
      tagColor={isNegotiating ? 'orange' : 'mint'}
      icon={<Building className="w-5 h-5 text-black" />}
      headerAction={
        <div className="flex items-center space-x-1.5">
          <NeoButton
            size="sm"
            variant={viewMode === 'managed' ? 'mint' : 'white'}
            isPressed={viewMode === 'managed'}
            onClick={() => setViewMode('managed')}
            className="text-[10px] px-2 py-0.5"
          >
            Managed
          </NeoButton>
          <NeoButton
            size="sm"
            variant={viewMode === 'baseline' ? 'pink' : 'white'}
            isPressed={viewMode === 'baseline'}
            onClick={() => setViewMode('baseline')}
            className="text-[10px] px-2 py-0.5"
          >
            Baseline
          </NeoButton>
        </div>
      }
      className="h-full"
      bodyClassName="p-3 flex flex-col justify-between"
    >
      {/* SVG Canvas Area */}
      <div className="relative flex-1 w-full min-h-[390px] bg-[#FFF8ED] border-[3px] border-black rounded-[4px] shadow-[4px_4px_0_#000] p-2 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 800 520" className="w-full h-full max-h-[500px]">
          <defs>
            {/* Neo-brutalist dot pattern */}
            <pattern id="campusDots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="#000000" opacity="0.18" />
            </pattern>
            {/* Diagonal hatched stripe pattern for solar panels */}
            <pattern id="solarHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#000000" strokeWidth="2" />
            </pattern>
          </defs>

          {/* Background dot grid */}
          <rect width="800" height="520" fill="url(#campusDots)" />

          {/* Negotiating Inter-Zone Dashed Communication Lines */}
          {isNegotiating && (
            <g stroke="#000000" strokeWidth="3.5">
              <line x1="220" y1="140" x2="400" y2="260" className="animate-neo-dash" />
              <line x1="580" y1="140" x2="400" y2="260" className="animate-neo-dash" />
              <line x1="220" y1="380" x2="400" y2="260" className="animate-neo-dash" />
              <line x1="580" y1="380" x2="400" y2="260" className="animate-neo-dash" />
            </g>
          )}

          {/* Central Grid Hub: Neo-Brutalist Hex / Octagon / Circle */}
          <g transform="translate(400, 260)">
            {/* Hard offset shadow */}
            <circle cx="5" cy="5" r="38" fill="#000000" />
            {/* Outer ring */}
            <circle cx="0" cy="0" r="38" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
            {/* Inner accent core */}
            <circle
              cx="0"
              cy="0"
              r="30"
              fill={viewMode === 'managed' ? '#06D6A0' : '#FF4D8D'}
              stroke="#000000"
              strokeWidth="2.5"
            />
            <text x="0" y="-6" textAnchor="middle" fill="#000000" fontSize="9" fontWeight="800" fontFamily="Space Grotesk">
              GRID HUB
            </text>
            <text x="0" y="14" textAnchor="middle" fill="#000000" fontSize="13" fontWeight="800" fontFamily="Space Mono">
              {Math.round(currentTwin.grid_import_kw || 0)}kW
            </text>
          </g>

          {/* ZONE 1: HOSTELS (Top Left) */}
          {(() => {
            const z = zones.hostel || { current_load_kw: 280, occupancy: 700 };
            const style = getLoadRatioStyle(z.current_load_kw, capacities.hostel);
            const isWiggling = isNegotiating;
            return (
              <g
                transform="translate(100, 50)"
                className={`cursor-pointer transition-transform ${isWiggling ? 'animate-neo-wiggle' : 'hover:-translate-x-1 hover:-translate-y-1'}`}
                onMouseEnter={() => setHoveredZone('hostel')}
                onMouseLeave={() => setHoveredZone(null)}
              >
                {/* Hard offset shadow */}
                <rect x="6" y="6" width="240" height="140" rx="3" fill="#000000" />
                {/* Card box */}
                <rect x="0" y="0" width="240" height="140" rx="3" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
                {/* Title bar strip */}
                <rect x="0" y="0" width="240" height="30" rx="2" fill={style.fill} stroke="#000000" strokeWidth="3" />
                <text x="12" y="20" fill="#000000" fontSize="11" fontWeight="800" fontFamily="Space Grotesk">
                  HOSTELS (A-D)
                </text>
                <text x="228" y="20" textAnchor="end" fill="#000000" fontSize="9" fontWeight="700" fontFamily="Space Mono">
                  [{style.label}]
                </text>

                {/* Big Load Value */}
                <text x="14" y="66" fill="#000000" fontSize="28" fontWeight="800" fontFamily="Space Mono">
                  {Math.round(z.current_load_kw)}
                  <tspan fontSize="13" fontWeight="700"> kW</tspan>
                </text>

                {/* Details */}
                <text x="14" y="88" fill="#000000" fontSize="11" fontWeight="600" fontFamily="Space Grotesk">
                  Cap: {capacities.hostel} kW • {z.occupancy || 0} Students
                </text>
                <text x="14" y="106" fill="#333333" fontSize="10" fontFamily="Space Mono">
                  HVAC: {Math.round(z.hvac_kw || 0)}kW • Flex: {Math.round(z.flexible_kw || 0)}kW
                </text>

                {/* Chunky load progress bar */}
                <rect x="14" y="118" width="212" height="10" rx="2" fill="#E5E5E5" stroke="#000000" strokeWidth="2" />
                <rect
                  x="14"
                  y="118"
                  width={Math.min(212, (z.current_load_kw / capacities.hostel) * 212)}
                  height="10"
                  rx="1"
                  fill={style.fill}
                  stroke="#000000"
                  strokeWidth="2"
                />
              </g>
            );
          })()}

          {/* ZONE 2: LIBRARY (Top Right) */}
          {(() => {
            const z = zones.library || { current_load_kw: 120, occupancy: 250 };
            const style = getLoadRatioStyle(z.current_load_kw, capacities.library);
            const isWiggling = isNegotiating;
            return (
              <g
                transform="translate(460, 50)"
                className={`cursor-pointer transition-transform ${isWiggling ? 'animate-neo-wiggle' : 'hover:-translate-x-1 hover:-translate-y-1'}`}
                onMouseEnter={() => setHoveredZone('library')}
                onMouseLeave={() => setHoveredZone(null)}
              >
                {/* Hard offset shadow */}
                <rect x="6" y="6" width="240" height="140" rx="3" fill="#000000" />
                {/* Card box */}
                <rect x="0" y="0" width="240" height="140" rx="3" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
                {/* Title bar strip */}
                <rect x="0" y="0" width="240" height="30" rx="2" fill={style.fill} stroke="#000000" strokeWidth="3" />
                <text x="12" y="20" fill="#000000" fontSize="11" fontWeight="800" fontFamily="Space Grotesk">
                  CENTRAL LIBRARY
                </text>
                <text x="228" y="20" textAnchor="end" fill="#000000" fontSize="9" fontWeight="700" fontFamily="Space Mono">
                  [{style.label}]
                </text>

                {/* Big Load Value */}
                <text x="14" y="66" fill="#000000" fontSize="28" fontWeight="800" fontFamily="Space Mono">
                  {Math.round(z.current_load_kw)}
                  <tspan fontSize="13" fontWeight="700"> kW</tspan>
                </text>

                {/* Details */}
                <text x="14" y="88" fill="#000000" fontSize="11" fontWeight="600" fontFamily="Space Grotesk">
                  Cap: {capacities.library} kW • Temp: {z.temp_c || 24.5}°C
                </text>
                <text x="14" y="106" fill="#333333" fontSize="10" fontFamily="Space Mono">
                  Reading Halls • {z.occupancy || 0} Scholars
                </text>

                {/* Progress bar */}
                <rect x="14" y="118" width="212" height="10" rx="2" fill="#E5E5E5" stroke="#000000" strokeWidth="2" />
                <rect
                  x="14"
                  y="118"
                  width={Math.min(212, (z.current_load_kw / capacities.library) * 212)}
                  height="10"
                  rx="1"
                  fill={style.fill}
                  stroke="#000000"
                  strokeWidth="2"
                />
              </g>
            );
          })()}

          {/* ZONE 3: LABS (Bottom Left) */}
          {(() => {
            const z = zones.labs || { current_load_kw: 190, occupancy: 200 };
            const style = getLoadRatioStyle(z.current_load_kw, capacities.labs);
            const isWiggling = isNegotiating;
            return (
              <g
                transform="translate(100, 310)"
                className={`cursor-pointer transition-transform ${isWiggling ? 'animate-neo-wiggle' : 'hover:-translate-x-1 hover:-translate-y-1'}`}
                onMouseEnter={() => setHoveredZone('labs')}
                onMouseLeave={() => setHoveredZone(null)}
              >
                {/* Hard offset shadow */}
                <rect x="6" y="6" width="240" height="140" rx="3" fill="#000000" />
                {/* Card box */}
                <rect x="0" y="0" width="240" height="140" rx="3" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
                {/* Title bar strip */}
                <rect x="0" y="0" width="240" height="30" rx="2" fill={style.fill} stroke="#000000" strokeWidth="3" />
                <text x="12" y="20" fill="#000000" fontSize="11" fontWeight="800" fontFamily="Space Grotesk">
                  ENGINEERING LABS
                </text>
                <text x="228" y="20" textAnchor="end" fill="#000000" fontSize="9" fontWeight="700" fontFamily="Space Mono">
                  [{style.label}]
                </text>

                {/* Big Load Value */}
                <text x="14" y="66" fill="#000000" fontSize="28" fontWeight="800" fontFamily="Space Mono">
                  {Math.round(z.current_load_kw)}
                  <tspan fontSize="13" fontWeight="700"> kW</tspan>
                </text>

                {/* Details */}
                <text x="14" y="88" fill="#000000" fontSize="11" fontWeight="600" fontFamily="Space Grotesk">
                  Cap: {capacities.labs} kW • Rigs: ~90 kW
                </text>
                <text x="14" y="106" fill="#333333" fontSize="10" fontFamily="Space Mono">
                  Compute Cluster • {z.occupancy || 0} Researchers
                </text>

                {/* Progress bar */}
                <rect x="14" y="118" width="212" height="10" rx="2" fill="#E5E5E5" stroke="#000000" strokeWidth="2" />
                <rect
                  x="14"
                  y="118"
                  width={Math.min(212, (z.current_load_kw / capacities.labs) * 212)}
                  height="10"
                  rx="1"
                  fill={style.fill}
                  stroke="#000000"
                  strokeWidth="2"
                />
              </g>
            );
          })()}

          {/* ZONE 4: ADMIN (Bottom Right) */}
          {(() => {
            const z = zones.admin || { current_load_kw: 85, occupancy: 80 };
            const style = getLoadRatioStyle(z.current_load_kw, capacities.admin);
            const isWiggling = isNegotiating;
            return (
              <g
                transform="translate(460, 310)"
                className={`cursor-pointer transition-transform ${isWiggling ? 'animate-neo-wiggle' : 'hover:-translate-x-1 hover:-translate-y-1'}`}
                onMouseEnter={() => setHoveredZone('admin')}
                onMouseLeave={() => setHoveredZone(null)}
              >
                {/* Hard offset shadow */}
                <rect x="6" y="6" width="240" height="140" rx="3" fill="#000000" />
                {/* Card box */}
                <rect x="0" y="0" width="240" height="140" rx="3" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
                {/* Title bar strip */}
                <rect x="0" y="0" width="240" height="30" rx="2" fill={style.fill} stroke="#000000" strokeWidth="3" />
                <text x="12" y="20" fill="#000000" fontSize="11" fontWeight="800" fontFamily="Space Grotesk">
                  ADMINISTRATION
                </text>
                <text x="228" y="20" textAnchor="end" fill="#000000" fontSize="9" fontWeight="700" fontFamily="Space Mono">
                  [{style.label}]
                </text>

                {/* Big Load Value */}
                <text x="14" y="66" fill="#000000" fontSize="28" fontWeight="800" fontFamily="Space Mono">
                  {Math.round(z.current_load_kw)}
                  <tspan fontSize="13" fontWeight="700"> kW</tspan>
                </text>

                {/* Details */}
                <text x="14" y="88" fill="#000000" fontSize="11" fontWeight="600" fontFamily="Space Grotesk">
                  Cap: {capacities.admin} kW • High Flex
                </text>
                <text x="14" y="106" fill="#333333" fontSize="10" fontFamily="Space Mono">
                  Offices & Halls • {z.occupancy || 0} Staff
                </text>

                {/* Progress bar */}
                <rect x="14" y="118" width="212" height="10" rx="2" fill="#E5E5E5" stroke="#000000" strokeWidth="2" />
                <rect
                  x="14"
                  y="118"
                  width={Math.min(212, (z.current_load_kw / capacities.admin) * 212)}
                  height="10"
                  rx="1"
                  fill={style.fill}
                  stroke="#000000"
                  strokeWidth="2"
                />
              </g>
            );
          })()}

          {/* SOLAR ARRAY (Top Center) */}
          <g transform="translate(340, 30)">
            <rect x="5" y="5" width="120" height="65" rx="3" fill="#000000" />
            <rect x="0" y="0" width="120" height="65" rx="3" fill="#FFD60A" stroke="#000000" strokeWidth="3" />
            {/* Solar panel grid lines */}
            <path d="M 0 32 L 120 32 M 30 0 L 30 65 M 60 0 L 60 65 M 90 0 L 90 65" stroke="#000000" strokeWidth="2" />
            <rect x="15" y="6" width="90" height="16" fill="#FFFFFF" stroke="#000000" strokeWidth="2" rx="2" />
            <text x="60" y="18" textAnchor="middle" fill="#000000" fontSize="10" fontWeight="800" fontFamily="Space Grotesk">
              SOLAR PV
            </text>
            <rect x="18" y="38" width="84" height="20" fill="#000000" rx="2" />
            <text x="60" y="53" textAnchor="middle" fill="#FFD60A" fontSize="13" fontWeight="800" fontFamily="Space Mono">
              {Math.round(currentTwin.solar_kw || 0)} kW
            </text>
          </g>

          {/* WATER TANK (Bottom Center): Chunky black-outlined rectangle with flat blue fill animating up and down */}
          <g transform="translate(345, 375)">
            {/* Hard shadow */}
            <rect x="5" y="5" width="110" height="95" rx="3" fill="#000000" />
            {/* Tank shell */}
            <rect x="0" y="0" width="110" height="95" rx="3" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
            {/* Tank header */}
            <rect x="0" y="0" width="110" height="24" rx="2" fill="#B388FF" stroke="#000000" strokeWidth="3" />
            <text x="55" y="16" textAnchor="middle" fill="#000000" fontSize="10" fontWeight="800" fontFamily="Space Grotesk">
              TANK (300kL)
            </text>
            
            {/* Animated water fill level (flat blue #3A86FF with black top line) */}
            {(() => {
              const pct = Math.min(100, Math.max(0, currentTwin.tank_pct || 70));
              const fillHeight = (pct / 100) * 50;
              const yPos = 84 - fillHeight;
              return (
                <g>
                  <rect
                    x="8"
                    y={yPos}
                    width="94"
                    height={fillHeight}
                    fill="#3A86FF"
                    stroke="#000000"
                    strokeWidth="2"
                    className="transition-all duration-500"
                  />
                  {/* Subtle water wave notches */}
                  <line x1="8" y1={yPos} x2="102" y2={yPos} stroke="#000000" strokeWidth="3" />
                </g>
              );
            })()}

            {/* Level label */}
            <rect x="12" y="30" width="86" height="20" fill="#000000" rx="2" />
            <text x="55" y="44" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800" fontFamily="Space Mono">
              {Math.round(currentTwin.tank_level_kl || 210)}kL ({Math.round(currentTwin.tank_pct || 70)}%)
            </text>

            {/* Pump status sticker */}
            <rect
              x="12"
              y="56"
              width="86"
              height="18"
              fill={currentTwin.pump_active ? '#06D6A0' : '#E5E5E5'}
              stroke="#000000"
              strokeWidth="2"
              rx="2"
            />
            <text x="55" y="69" textAnchor="middle" fill="#000000" fontSize="9" fontWeight="800" fontFamily="Space Mono">
              PUMP: {currentTwin.pump_active ? 'ON (45kW)' : 'OFF'}
            </text>
          </g>
        </svg>

        {/* Hover Tooltip in Neo-Brutalist Sticker Style */}
        {hoveredZone && zones[hoveredZone] && (
          <div className="absolute top-4 left-4 bg-[#FFD60A] text-black border-[3px] border-black p-3 rounded-[4px] shadow-[6px_6px_0_#000] pointer-events-none text-xs space-y-1 z-20 font-['Space_Grotesk',sans-serif]">
            <div className="font-extrabold text-sm uppercase flex items-center justify-between border-b-2 border-black pb-1">
              <span>{hoveredZone} ZONE</span>
              <span className="font-mono text-[10px] bg-black text-[#FFD60A] px-1.5 py-0.5 rounded-[2px]">
                {capacities[hoveredZone]} kW MAX
              </span>
            </div>
            <div className="font-mono pt-1">
              LOAD: <strong>{zones[hoveredZone].current_load_kw} kW</strong>
            </div>
            <div className="font-mono">
              OCCUPANCY: <strong>{zones[hoveredZone].occupancy} PEOPLE</strong>
            </div>
            <div className="font-mono">
              SETPOINT OFFSET: <strong>+{zones[hoveredZone].setpoint_offset_c || 0}°C</strong>
            </div>
            <div className="text-[10px] bg-white border border-black p-1.5 rounded-[2px] font-mono mt-1">
              HEADROOM: HVAC {zones[hoveredZone].headroom_kw?.hvac}kW • LIGHTS {zones[hoveredZone].headroom_kw?.lighting}kW
            </div>
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs mt-3 pt-2 border-t-2 border-black font-['Space_Grotesk',sans-serif]">
        <div className="flex items-center space-x-2">
          <span className="font-bold uppercase text-[11px]">LOAD RATIO:</span>
          <NeoBadge variant="mint">&lt;65% NORMAL</NeoBadge>
          <NeoBadge variant="yellow">65-85% ELEVATED</NeoBadge>
          <NeoBadge variant="orange">85-95% HIGH</NeoBadge>
          <NeoBadge variant="red">&gt;95% CRITICAL</NeoBadge>
        </div>
        <div className="font-mono font-bold text-[10px] bg-black text-[#FFF4E0] px-2 py-0.5 rounded-[2px] border border-black mt-1 sm:mt-0">
          INDORE (22.7°N, 75.8°E)
        </div>
      </div>
    </NeoCard>
  );
};
