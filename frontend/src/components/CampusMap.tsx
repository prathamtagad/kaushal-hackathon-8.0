import React, { useState } from 'react';
import { TwinState, Deal } from '../types';
import { Building, Zap, Droplets, Sun, Activity, Info, MousePointerClick } from 'lucide-react';
import { NeoCard } from './ui/NeoCard';
import { NeoButton } from './ui/NeoButton';
import { NeoBadge } from './ui/NeoBadge';

interface CampusMapProps {
  baselineState: TwinState;
  managedState: TwinState;
  activeDeals: Deal[];
  isNegotiating?: boolean;
  onSelectAsset?: (assetId: string) => void;
  selectedAsset?: string | null;
  gridCapKw?: number;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  baselineState,
  managedState,
  activeDeals,
  isNegotiating = false,
  onSelectAsset,
  selectedAsset,
  gridCapKw = 850,
}) => {
  const [viewMode, setViewMode] = useState<'managed' | 'baseline'>('managed');
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const currentTwin = viewMode === 'managed' ? managedState : baselineState;
  const zones = currentTwin.zones || {};
  const managedKw = Math.round(managedState.grid_import_kw || 0);
  const baselineKw = Math.round(baselineState.grid_import_kw || 0);
  const deltaKw = Math.round(baselineKw - managedKw);

  // Zone capacity mapping
  const capacities: Record<string, number> = {
    hostel: 380,
    library: 180,
    labs: 260,
    admin: 130
  };

  // Hard step neo-brutalist colors: mint, yellow, orange, red
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

  const handleAssetClick = (id: string) => {
    if (onSelectAsset) {
      onSelectAsset(id);
    }
  };

  return (
    <NeoCard
      title="CAMPUS DIGITAL TWIN (2D MAP)"
      subtitle="REAL-TIME ASSET TELEMETRY & LOAD DISTRIBUTION"
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
            className="text-[10px] px-2.5 py-1"
          >
            Managed View {deltaKw > 0 ? `(-${deltaKw}kW)` : ''}
          </NeoButton>
          <NeoButton
            size="sm"
            variant={viewMode === 'baseline' ? 'pink' : 'white'}
            isPressed={viewMode === 'baseline'}
            onClick={() => setViewMode('baseline')}
            className="text-[10px] px-2.5 py-1"
          >
            Baseline View {deltaKw > 0 ? `(+${deltaKw}kW)` : ''}
          </NeoButton>
        </div>
      }
      className="h-full"
      bodyClassName="p-3 flex flex-col justify-between"
    >
      {/* Interactive Helper & Live Comparison Banner */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono bg-[#FFF8ED] border-2 border-black rounded-[3px] px-3 py-1.5 mb-2 gap-2">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-0.5 rounded-[2px] font-extrabold uppercase border border-black ${
            viewMode === 'managed' ? 'bg-[#06D6A0] text-black' : 'bg-[#FF4D8D] text-black'
          }`}>
            {viewMode === 'managed' ? 'CO-OPTIMISED (MANAGED)' : 'UNMANAGED BASELINE'}
          </span>
          <span className="text-neutral-700 hidden sm:inline">
            • Grid Import: <strong className="text-black">{Math.round(currentTwin.grid_import_kw || 0)} kW</strong>
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[10px]">
          {deltaKw > 0 ? (
            <span className="bg-[#FFD60A] text-black border border-black px-2 py-0.5 rounded-[2px] font-extrabold">
              ⚡ LIVE SAVINGS: {deltaKw} kW SHED ({Math.round((deltaKw / baselineKw) * 100)}% REDUCTION)
            </span>
          ) : (
            <span className="bg-[#06D6A0] text-black border border-black px-2 py-0.5 rounded-[2px] font-extrabold">
              ✓ EQUILIBRIUM: SAFELY UNDER 850 kW CAP
            </span>
          )}
          {currentTwin.grid_import_kw > 850 && (
            <span className="bg-[#FF3B30] text-white border border-black px-2 py-0.5 rounded-[2px] font-extrabold animate-pulse">
              ⚠️ OVERLOAD: +{Math.round(currentTwin.grid_import_kw - 850)} kW EXCEEDED
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas Area: ViewBox 0 0 920 540 */}
      <div className="relative flex-1 w-full min-h-[420px] bg-[#FFF8ED] border-[3px] border-black rounded-[4px] shadow-[4px_4px_0_#000] p-2 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 920 540" className="w-full h-full max-h-[560px]">
          <defs>
            <pattern id="campusDots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="#000000" opacity="0.18" />
            </pattern>
          </defs>

          {/* Background dot grid */}
          <rect width="920" height="540" fill="url(#campusDots)" />

          {/* Negotiating Inter-Zone Dashed Communication Lines */}
          {isNegotiating && (
            <g stroke="#FF7B00" strokeWidth="4" className="animate-energy-pulse">
              <line x1="295" y1="130" x2="460" y2="270" className="animate-neo-dash" />
              <line x1="625" y1="130" x2="460" y2="270" className="animate-neo-dash" />
              <line x1="295" y1="400" x2="460" y2="270" className="animate-neo-dash" />
              <line x1="625" y1="400" x2="460" y2="270" className="animate-neo-dash" />
            </g>
          )}

          {/* Central Grid Hub (Center x=460, y=270) */}
          <g
            transform="translate(460, 270)"
            className="cursor-pointer transition-opacity hover:opacity-90 duration-150"
            onClick={() => handleAssetClick('grid_hub')}
          >
            {isNegotiating && (
              <>
                <circle cx="0" cy="0" r="62" fill="none" stroke="#FF7B00" strokeWidth="3" className="animate-ping" opacity="0.4" />
                <circle cx="0" cy="0" r="58" fill="none" stroke="#FFD60A" strokeWidth="2.5" strokeDasharray="6 4" className="animate-neo-dash" />
              </>
            )}
            {/* Hard drop shadow */}
            <circle cx="5" cy="5" r="52" fill="#000000" />
            {/* Outer crisp border */}
            <circle cx="0" cy="0" r="52" fill="#FFFFFF" stroke="#000000" strokeWidth="3.5" />
            {/* Inner dynamic fill */}
            <circle
              cx="0"
              cy="0"
              r="44"
              fill={
                (currentTwin.grid_import_kw || 0) > gridCapKw
                  ? '#FF3B30'
                  : viewMode === 'managed'
                  ? '#06D6A0'
                  : '#FF4D8D'
              }
              stroke="#000000"
              strokeWidth="2.5"
            />
            {/* Title */}
            <text x="0" y="-14" textAnchor="middle" fill="#000000" fontSize="10.5" fontWeight="800" fontFamily="Space Grotesk" letterSpacing="0.05em">
              GRID HUB
            </text>
            {/* Live kW Value */}
            <text x="0" y="7" textAnchor="middle" fill="#000000" fontSize="16" fontWeight="800" fontFamily="Space Mono">
              {Math.round(currentTwin.grid_import_kw || 0)} <tspan fontSize="11" fontWeight="700">kW</tspan>
            </text>
            {/* High-contrast limit sticker pill */}
            <rect x="-38" y="16" width="76" height="16" rx="3" fill="#000000" />
            <text x="0" y="27.5" textAnchor="middle" fill="#FFD60A" fontSize="8.5" fontWeight="700" fontFamily="Space Mono">
              LIMIT: {Math.round(gridCapKw)}kW
            </text>
          </g>

          {/* ZONE 1: HOSTELS (Top Left: x=35, y=50, w=260, h=160) */}
          {(() => {
            const z = zones.hostel || { current_load_kw: 280, occupancy: 700 };
            const style = getLoadRatioStyle(z.current_load_kw, capacities.hostel);
            const isSelected = selectedAsset === 'hostel';
            return (
              <g
                transform="translate(35, 50)"
                className="cursor-pointer neo-zone-hover transition-all duration-200"
                onClick={() => handleAssetClick('hostel')}
                onMouseEnter={() => setHoveredZone('hostel')}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <rect x="6" y="6" width="260" height="160" rx="4" fill="#000000" />
                <rect
                  x="0"
                  y="0"
                  width="260"
                  height="160"
                  rx="4"
                  fill="#FFFFFF"
                  stroke={isSelected ? '#3A86FF' : isNegotiating ? '#FF7B00' : '#000000'}
                  strokeWidth={isSelected ? '5' : isNegotiating ? '4' : '3'}
                />
                <rect x="0" y="0" width="260" height="32" rx="3" fill={style.fill} stroke="#000000" strokeWidth="3" />
                <text x="12" y="21" fill="#000000" fontSize="11" fontWeight="800" fontFamily="Space Grotesk">
                  HOSTELS (BLOCKS A–D)
                </text>
                <text x="248" y="21" textAnchor="end" fill="#000000" fontSize="9" fontWeight="700" fontFamily="Space Mono">
                  [{isNegotiating ? 'NEGOTIATING' : style.label}]
                </text>

                <text x="14" y="70" fill="#000000" fontSize="30" fontWeight="800" fontFamily="Space Mono">
                  {Math.round(z.current_load_kw)}
                  <tspan fontSize="14" fontWeight="700"> kW</tspan>
                </text>

                <text x="14" y="94" fill="#000000" fontSize="11" fontWeight="700" fontFamily="Space Grotesk">
                  Capacity: {capacities.hostel} kW • {z.occupancy || 0} Students
                </text>
                <text x="14" y="112" fill="#333333" fontSize="10" fontFamily="Space Mono">
                  HVAC: {Math.round(z.hvac_kw || 0)}kW • Flex: {Math.round(z.flexible_kw || 0)}kW
                </text>

                {/* Progress bar */}
                <rect x="14" y="128" width="232" height="12" rx="2" fill="#E5E5E5" stroke="#000000" strokeWidth="2" />
                <rect
                  x="14"
                  y="128"
                  width={Math.min(232, (z.current_load_kw / capacities.hostel) * 232)}
                  height="12"
                  rx="1"
                  fill={style.fill}
                  stroke="#000000"
                  strokeWidth="2"
                  className="transition-all duration-300"
                />
              </g>
            );
          })()}

          {/* SOLAR ARRAY (Top Center: x=360, y=30, w=200, h=85) */}
          <g
            transform="translate(360, 30)"
            className="cursor-pointer neo-zone-hover transition-all duration-200"
            onClick={() => handleAssetClick('solar')}
          >
            <rect x="5" y="5" width="200" height="85" rx="4" fill="#000000" />
            <rect
              x="0"
              y="0"
              width="200"
              height="85"
              rx="4"
              fill="#FFD60A"
              stroke={selectedAsset === 'solar' ? '#3A86FF' : '#000000'}
              strokeWidth={selectedAsset === 'solar' ? '5' : '3'}
            />
            <path d="M 0 42 L 200 42 M 50 0 L 50 85 M 100 0 L 100 85 M 150 0 L 150 85" stroke="#000000" strokeWidth="2" />
            <rect x="25" y="8" width="150" height="20" fill="#FFFFFF" stroke="#000000" strokeWidth="2" rx="2" />
            <text x="100" y="22" textAnchor="middle" fill="#000000" fontSize="11" fontWeight="800" fontFamily="Space Grotesk">
              ROOFTOP SOLAR PV
            </text>
            <rect x="35" y="50" width="130" height="24" fill="#000000" rx="3" />
            <text x="100" y="67" textAnchor="middle" fill="#FFD60A" fontSize="15" fontWeight="800" fontFamily="Space Mono">
              {Math.round(currentTwin.solar_kw || 0)} kWp
            </text>
          </g>

          {/* ZONE 2: LIBRARY (Top Right: x=625, y=50, w=260, h=160) */}
          {(() => {
            const z = zones.library || { current_load_kw: 120, occupancy: 250 };
            const style = getLoadRatioStyle(z.current_load_kw, capacities.library);
            const isSelected = selectedAsset === 'library';
            return (
              <g
                transform="translate(625, 50)"
                className="cursor-pointer neo-zone-hover transition-all duration-200"
                onClick={() => handleAssetClick('library')}
                onMouseEnter={() => setHoveredZone('library')}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <rect x="6" y="6" width="260" height="160" rx="4" fill="#000000" />
                <rect
                  x="0"
                  y="0"
                  width="260"
                  height="160"
                  rx="4"
                  fill="#FFFFFF"
                  stroke={isSelected ? '#3A86FF' : isNegotiating ? '#FF7B00' : '#000000'}
                  strokeWidth={isSelected ? '5' : isNegotiating ? '4' : '3'}
                />
                <rect x="0" y="0" width="260" height="32" rx="3" fill={style.fill} stroke="#000000" strokeWidth="3" />
                <text x="12" y="21" fill="#000000" fontSize="11" fontWeight="800" fontFamily="Space Grotesk">
                  CENTRAL LIBRARY
                </text>
                <text x="248" y="21" textAnchor="end" fill="#000000" fontSize="9" fontWeight="700" fontFamily="Space Mono">
                  [{isNegotiating ? 'NEGOTIATING' : style.label}]
                </text>

                <text x="14" y="70" fill="#000000" fontSize="30" fontWeight="800" fontFamily="Space Mono">
                  {Math.round(z.current_load_kw)}
                  <tspan fontSize="14" fontWeight="700"> kW</tspan>
                </text>

                <text x="14" y="94" fill="#000000" fontSize="11" fontWeight="700" fontFamily="Space Grotesk">
                  Capacity: {capacities.library} kW • Temp: {z.temp_c || 24.5}°C
                </text>
                <text x="14" y="112" fill="#333333" fontSize="10" fontFamily="Space Mono">
                  Reading Halls • {z.occupancy || 0} Scholars
                </text>

                {/* Progress bar */}
                <rect x="14" y="128" width="232" height="12" rx="2" fill="#E5E5E5" stroke="#000000" strokeWidth="2" />
                <rect
                  x="14"
                  y="128"
                  width={Math.min(232, (z.current_load_kw / capacities.library) * 232)}
                  height="12"
                  rx="1"
                  fill={style.fill}
                  stroke="#000000"
                  strokeWidth="2"
                  className="transition-all duration-300"
                />
              </g>
            );
          })()}

          {/* ZONE 3: LABS (Bottom Left: x=35, y=320, w=260, h=160) */}
          {(() => {
            const z = zones.labs || { current_load_kw: 190, occupancy: 200 };
            const style = getLoadRatioStyle(z.current_load_kw, capacities.labs);
            const isSelected = selectedAsset === 'labs';
            return (
              <g
                transform="translate(35, 320)"
                className="cursor-pointer neo-zone-hover transition-all duration-200"
                onClick={() => handleAssetClick('labs')}
                onMouseEnter={() => setHoveredZone('labs')}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <rect x="6" y="6" width="260" height="160" rx="4" fill="#000000" />
                <rect
                  x="0"
                  y="0"
                  width="260"
                  height="160"
                  rx="4"
                  fill="#FFFFFF"
                  stroke={isSelected ? '#3A86FF' : isNegotiating ? '#FF7B00' : '#000000'}
                  strokeWidth={isSelected ? '5' : isNegotiating ? '4' : '3'}
                />
                <rect x="0" y="0" width="260" height="32" rx="3" fill={style.fill} stroke="#000000" strokeWidth="3" />
                <text x="12" y="21" fill="#000000" fontSize="11" fontWeight="800" fontFamily="Space Grotesk">
                  ENGINEERING LABS
                </text>
                <text x="248" y="21" textAnchor="end" fill="#000000" fontSize="9" fontWeight="700" fontFamily="Space Mono">
                  [{isNegotiating ? 'NEGOTIATING' : style.label}]
                </text>

                <text x="14" y="70" fill="#000000" fontSize="30" fontWeight="800" fontFamily="Space Mono">
                  {Math.round(z.current_load_kw)}
                  <tspan fontSize="14" fontWeight="700"> kW</tspan>
                </text>

                <text x="14" y="94" fill="#000000" fontSize="11" fontWeight="700" fontFamily="Space Grotesk">
                  Capacity: {capacities.labs} kW • Rigs: ~90 kW
                </text>
                <text x="14" y="112" fill="#333333" fontSize="10" fontFamily="Space Mono">
                  GPU Cluster • {z.occupancy || 0} Researchers
                </text>

                {/* Progress bar */}
                <rect x="14" y="128" width="232" height="12" rx="2" fill="#E5E5E5" stroke="#000000" strokeWidth="2" />
                <rect
                  x="14"
                  y="128"
                  width={Math.min(232, (z.current_load_kw / capacities.labs) * 232)}
                  height="12"
                  rx="1"
                  fill={style.fill}
                  stroke="#000000"
                  strokeWidth="2"
                  className="transition-all duration-300"
                />
              </g>
            );
          })()}

          {/* WATER TANK (Bottom Center: x=360, y=380, w=200, h=120) */}
          <g
            transform="translate(360, 380)"
            className="cursor-pointer neo-zone-hover transition-all duration-200"
            onClick={() => handleAssetClick('water')}
          >
            <rect x="6" y="6" width="200" height="120" rx="4" fill="#000000" />
            <rect
              x="0"
              y="0"
              width="200"
              height="120"
              rx="4"
              fill="#FFFFFF"
              stroke={selectedAsset === 'water' ? '#3A86FF' : '#000000'}
              strokeWidth={selectedAsset === 'water' ? '5' : '3'}
            />
            <rect x="0" y="0" width="200" height="28" rx="3" fill="#B388FF" stroke="#000000" strokeWidth="3" />
            <text x="100" y="19" textAnchor="middle" fill="#000000" fontSize="11" fontWeight="800" fontFamily="Space Grotesk">
              WATER TANK (300 kL)
            </text>

            {/* Flat Blue Water Level Fill */}
            {(() => {
              const pct = Math.min(100, Math.max(0, currentTwin.tank_pct || 70));
              const fillHeight = (pct / 100) * 55;
              const yPos = 95 - fillHeight;
              return (
                <g>
                  <rect
                    x="12"
                    y={yPos}
                    width="176"
                    height={fillHeight}
                    fill="#3A86FF"
                    stroke="#000000"
                    strokeWidth="2"
                    className="transition-all duration-500 ease-in-out"
                  />
                  <line x1="12" y1={yPos} x2="188" y2={yPos} stroke="#000000" strokeWidth="2.5" />
                </g>
              );
            })()}

            <rect x="25" y="38" width="150" height="24" fill="#000000" rx="3" />
            <text x="100" y="55" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="800" fontFamily="Space Mono">
              {Math.round(currentTwin.tank_level_kl || 210)}kL ({Math.round(currentTwin.tank_pct || 70)}%)
            </text>

            {/* Pump Status */}
            <rect
              x="25"
              y="74"
              width="150"
              height="20"
              fill={currentTwin.pump_active ? '#06D6A0' : '#E5E5E5'}
              stroke="#000000"
              strokeWidth="2"
              rx="2"
            />
            <text x="100" y="88" textAnchor="middle" fill="#000000" fontSize="10" fontWeight="800" fontFamily="Space Mono">
              BOREWELL PUMP: {currentTwin.pump_active ? 'ON (45kW)' : 'OFF'}
            </text>
          </g>

          {/* ZONE 4: ADMIN (Bottom Right: x=625, y=320, w=260, h=160) */}
          {(() => {
            const z = zones.admin || { current_load_kw: 85, occupancy: 80 };
            const style = getLoadRatioStyle(z.current_load_kw, capacities.admin);
            const isSelected = selectedAsset === 'admin';
            return (
              <g
                transform="translate(625, 320)"
                className="cursor-pointer neo-zone-hover transition-all duration-200"
                onClick={() => handleAssetClick('admin')}
                onMouseEnter={() => setHoveredZone('admin')}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <rect x="6" y="6" width="260" height="160" rx="4" fill="#000000" />
                <rect
                  x="0"
                  y="0"
                  width="260"
                  height="160"
                  rx="4"
                  fill="#FFFFFF"
                  stroke={isSelected ? '#3A86FF' : isNegotiating ? '#FF7B00' : '#000000'}
                  strokeWidth={isSelected ? '5' : isNegotiating ? '4' : '3'}
                />
                <rect x="0" y="0" width="260" height="32" rx="3" fill={style.fill} stroke="#000000" strokeWidth="3" />
                <text x="12" y="21" fill="#000000" fontSize="11" fontWeight="800" fontFamily="Space Grotesk">
                  ADMINISTRATION
                </text>
                <text x="248" y="21" textAnchor="end" fill="#000000" fontSize="9" fontWeight="700" fontFamily="Space Mono">
                  [{isNegotiating ? 'NEGOTIATING' : style.label}]
                </text>

                <text x="14" y="70" fill="#000000" fontSize="30" fontWeight="800" fontFamily="Space Mono">
                  {Math.round(z.current_load_kw)}
                  <tspan fontSize="14" fontWeight="700"> kW</tspan>
                </text>

                <text x="14" y="94" fill="#000000" fontSize="11" fontWeight="700" fontFamily="Space Grotesk">
                  Capacity: {capacities.admin} kW • High Flex
                </text>
                <text x="14" y="112" fill="#333333" fontSize="10" fontFamily="Space Mono">
                  Offices & Halls • {z.occupancy || 0} Staff
                </text>

                {/* Progress bar */}
                <rect x="14" y="128" width="232" height="12" rx="2" fill="#E5E5E5" stroke="#000000" strokeWidth="2" />
                <rect
                  x="14"
                  y="128"
                  width={Math.min(232, (z.current_load_kw / capacities.admin) * 232)}
                  height="12"
                  rx="1"
                  fill={style.fill}
                  stroke="#000000"
                  strokeWidth="2"
                  className="transition-all duration-300"
                />
              </g>
            );
          })()}
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
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs mt-3 pt-2 border-t-2 border-black font-['Space_Grotesk',sans-serif]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold uppercase text-[11px]">LOAD STATUS:</span>
          <NeoBadge variant="mint">&lt;65% NORMAL</NeoBadge>
          <NeoBadge variant="yellow">65–85% ELEVATED</NeoBadge>
          <NeoBadge variant="orange">85–95% HIGH</NeoBadge>
          <NeoBadge variant="red">&gt;95% CRITICAL</NeoBadge>
        </div>
        <div className="font-mono font-bold text-[10px] bg-black text-[#FFF4E0] px-2 py-0.5 rounded-[2px] border border-black mt-1 sm:mt-0">
          INDORE (22.7°N, 75.8°E)
        </div>
      </div>
    </NeoCard>
  );
};
