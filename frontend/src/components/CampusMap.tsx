import React, { useState } from 'react';
import { TwinState, Deal } from '../types';
import { Sun, Droplets, Zap, Users, Building, ShieldCheck, Flame } from 'lucide-react';

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

  const getLoadRatioColor = (loadKw: number, capacityKw: number) => {
    const ratio = loadKw / capacityKw;
    if (ratio < 0.65) return { fill: '#064e3b', stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' };
    if (ratio < 0.85) return { fill: '#78350f', stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' };
    return { fill: '#7f1d1d', stroke: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)' };
  };

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col h-full relative overflow-hidden">
      {/* Header & View Toggle */}
      <div className="flex items-center justify-between mb-3 z-10">
        <div className="flex items-center space-x-2">
          <Building className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold tracking-wide text-gray-200 uppercase">
            Campus Twin Map (2D)
          </h2>
          {isNegotiating && (
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono animate-pulse border border-amber-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>AGENTS NEGOTIATING</span>
            </span>
          )}
        </div>

        {/* Baseline vs Managed View Switch */}
        <div className="inline-flex rounded-lg bg-gray-900/80 p-0.5 border border-gray-700">
          <button
            onClick={() => setViewMode('managed')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === 'managed'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Managed View
          </button>
          <button
            onClick={() => setViewMode('baseline')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === 'baseline'
                ? 'bg-rose-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Baseline View
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative flex-1 w-full min-h-[380px] bg-[#0d1322] rounded-xl border border-gray-800/80 p-2 flex items-center justify-center">
        <svg viewBox="0 0 800 520" className="w-full h-full max-h-[500px]">
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
            </pattern>
            <linearGradient id="solarGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="waterGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* Background grid */}
          <rect width="800" height="520" fill="url(#grid)" />

          {/* Negotiating Inter-Zone Communication Lines */}
          {isNegotiating && (
            <g stroke="#10b981" strokeWidth="2" opacity="0.7">
              <line x1="220" y1="140" x2="400" y2="260" className="animate-dash" />
              <line x1="580" y1="140" x2="400" y2="260" className="animate-dash" />
              <line x1="220" y1="380" x2="400" y2="260" className="animate-dash" />
              <line x1="580" y1="380" x2="400" y2="260" className="animate-dash" />
            </g>
          )}

          {/* Central Grid Hub */}
          <circle cx="400" cy="260" r="32" fill="#111827" stroke="#374151" strokeWidth="2" />
          <circle cx="400" cy="260" r="24" fill="#1e293b" stroke={viewMode === 'managed' ? '#10b981' : '#f43f5e'} strokeWidth="2" />
          <text x="400" y="255" textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="bold">GRID HUB</text>
          <text x="400" y="272" textAnchor="middle" fill="#f3f4f6" fontSize="12" fontWeight="bold">
            {Math.round(currentTwin.grid_import_kw || 0)} kW
          </text>

          {/* ZONE 1: HOSTELS (Top Left) */}
          {(() => {
            const z = zones.hostel || { current_load_kw: 280, occupancy: 700 };
            const style = getLoadRatioColor(z.current_load_kw, capacities.hostel);
            return (
              <g
                transform="translate(100, 50)"
                className="cursor-pointer transition-transform hover:scale-105"
                onMouseEnter={() => setHoveredZone('hostel')}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <rect
                  width="240"
                  height="140"
                  rx="14"
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth="2.5"
                  filter={`drop-shadow(0 0 12px ${style.glow})`}
                />
                <rect x="0" y="0" width="240" height="28" rx="14" fill="rgba(0,0,0,0.3)" />
                <text x="16" y="19" fill="#e5e7eb" fontSize="12" fontWeight="600">HOSTELS (Blocks A-D)</text>
                <text x="16" y="55" fill="#f3f4f6" fontSize="22" fontWeight="bold">
                  {Math.round(z.current_load_kw)} <tspan fontSize="12" fill="#9ca3af">kW</tspan>
                </text>
                <text x="16" y="78" fill="#9ca3af" fontSize="11">
                  Cap: {capacities.hostel} kW • Occ: {z.occupancy} students
                </text>
                <text x="16" y="100" fill="#cbd5e1" fontSize="10">
                  HVAC: {Math.round(z.hvac_kw || 0)} kW • Flex: {Math.round(z.flexible_kw || 0)} kW
                </text>
                {/* Status bar */}
                <rect x="16" y="115" width="208" height="6" rx="3" fill="rgba(0,0,0,0.5)" />
                <rect
                  x="16"
                  y="115"
                  width={Math.min(208, (z.current_load_kw / capacities.hostel) * 208)}
                  height="6"
                  rx="3"
                  fill={style.stroke}
                />
              </g>
            );
          })()}

          {/* ZONE 2: LIBRARY (Top Right) */}
          {(() => {
            const z = zones.library || { current_load_kw: 120, occupancy: 250 };
            const style = getLoadRatioColor(z.current_load_kw, capacities.library);
            return (
              <g
                transform="translate(460, 50)"
                className="cursor-pointer transition-transform hover:scale-105"
                onMouseEnter={() => setHoveredZone('library')}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <rect
                  width="240"
                  height="140"
                  rx="14"
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth="2.5"
                  filter={`drop-shadow(0 0 12px ${style.glow})`}
                />
                <rect x="0" y="0" width="240" height="28" rx="14" fill="rgba(0,0,0,0.3)" />
                <text x="16" y="19" fill="#e5e7eb" fontSize="12" fontWeight="600">CENTRAL LIBRARY</text>
                <text x="16" y="55" fill="#f3f4f6" fontSize="22" fontWeight="bold">
                  {Math.round(z.current_load_kw)} <tspan fontSize="12" fill="#9ca3af">kW</tspan>
                </text>
                <text x="16" y="78" fill="#9ca3af" fontSize="11">
                  Cap: {capacities.library} kW • Temp: {z.temp_c || 24.5}°C (max 27°C)
                </text>
                <text x="16" y="100" fill="#cbd5e1" fontSize="10">
                  Reading halls • Occ: {z.occupancy} scholars
                </text>
                <rect x="16" y="115" width="208" height="6" rx="3" fill="rgba(0,0,0,0.5)" />
                <rect
                  x="16"
                  y="115"
                  width={Math.min(208, (z.current_load_kw / capacities.library) * 208)}
                  height="6"
                  rx="3"
                  fill={style.stroke}
                />
              </g>
            );
          })()}

          {/* ZONE 3: LABS (Bottom Left) */}
          {(() => {
            const z = zones.labs || { current_load_kw: 190, occupancy: 200 };
            const style = getLoadRatioColor(z.current_load_kw, capacities.labs);
            return (
              <g
                transform="translate(100, 310)"
                className="cursor-pointer transition-transform hover:scale-105"
                onMouseEnter={() => setHoveredZone('labs')}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <rect
                  width="240"
                  height="140"
                  rx="14"
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth="2.5"
                  filter={`drop-shadow(0 0 12px ${style.glow})`}
                />
                <rect x="0" y="0" width="240" height="28" rx="14" fill="rgba(0,0,0,0.3)" />
                <text x="16" y="19" fill="#e5e7eb" fontSize="12" fontWeight="600">ENGINEERING LABS</text>
                <text x="16" y="55" fill="#f3f4f6" fontSize="22" fontWeight="bold">
                  {Math.round(z.current_load_kw)} <tspan fontSize="12" fill="#9ca3af">kW</tspan>
                </text>
                <text x="16" y="78" fill="#9ca3af" fontSize="11">
                  Cap: {capacities.labs} kW • Critical Servers: ~90 kW
                </text>
                <text x="16" y="100" fill="#cbd5e1" fontSize="10">
                  GPU Rigs • Compute Cluster Active
                </text>
                <rect x="16" y="115" width="208" height="6" rx="3" fill="rgba(0,0,0,0.5)" />
                <rect
                  x="16"
                  y="115"
                  width={Math.min(208, (z.current_load_kw / capacities.labs) * 208)}
                  height="6"
                  rx="3"
                  fill={style.stroke}
                />
              </g>
            );
          })()}

          {/* ZONE 4: ADMIN (Bottom Right) */}
          {(() => {
            const z = zones.admin || { current_load_kw: 85, occupancy: 80 };
            const style = getLoadRatioColor(z.current_load_kw, capacities.admin);
            return (
              <g
                transform="translate(460, 310)"
                className="cursor-pointer transition-transform hover:scale-105"
                onMouseEnter={() => setHoveredZone('admin')}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <rect
                  width="240"
                  height="140"
                  rx="14"
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth="2.5"
                  filter={`drop-shadow(0 0 12px ${style.glow})`}
                />
                <rect x="0" y="0" width="240" height="28" rx="14" fill="rgba(0,0,0,0.3)" />
                <text x="16" y="19" fill="#e5e7eb" fontSize="12" fontWeight="600">ADMINISTRATION</text>
                <text x="16" y="55" fill="#f3f4f6" fontSize="22" fontWeight="bold">
                  {Math.round(z.current_load_kw)} <tspan fontSize="12" fill="#9ca3af">kW</tspan>
                </text>
                <text x="16" y="78" fill="#9ca3af" fontSize="11">
                  Cap: {capacities.admin} kW • High flexibility
                </text>
                <text x="16" y="100" fill="#cbd5e1" fontSize="10">
                  Offices & Auditorium
                </text>
                <rect x="16" y="115" width="208" height="6" rx="3" fill="rgba(0,0,0,0.5)" />
                <rect
                  x="16"
                  y="115"
                  width={Math.min(208, (z.current_load_kw / capacities.admin) * 208)}
                  height="6"
                  rx="3"
                  fill={style.stroke}
                />
              </g>
            );
          })()}

          {/* SOLAR ARRAY (Top Center) */}
          <g transform="translate(340, 30)">
            <rect width="120" height="65" rx="8" fill="#182234" stroke="#f59e0b" strokeWidth="1.5" />
            <path d="M 10 32 L 110 32 M 35 10 L 35 55 M 60 10 L 60 55 M 85 10 L 85 55" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1" />
            <text x="60" y="22" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="bold">SOLAR PV</text>
            <text x="60" y="48" textAnchor="middle" fill="#fef3c7" fontSize="13" fontWeight="bold">
              {Math.round(currentTwin.solar_kw || 0)} kW
            </text>
          </g>

          {/* WATER TANK (Bottom Center) */}
          <g transform="translate(345, 380)">
            {/* Tank shell */}
            <rect width="110" height="90" rx="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <text x="55" y="20" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">
              WATER TANK (300kL)
            </text>
            
            {/* Animated water fill level */}
            {(() => {
              const pct = Math.min(100, Math.max(0, currentTwin.tank_pct || 70));
              const fillHeight = (pct / 100) * 50;
              const yPos = 80 - fillHeight;
              return (
                <rect
                  x="10"
                  y={yPos}
                  width="90"
                  height={fillHeight}
                  rx="4"
                  fill="url(#waterGrad)"
                  className="transition-all duration-700"
                />
              );
            })()}

            <text x="55" y="55" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold">
              {Math.round(currentTwin.tank_level_kl || 210)} kL ({Math.round(currentTwin.tank_pct || 70)}%)
            </text>
            <text x="55" y="73" textAnchor="middle" fill={currentTwin.pump_active ? "#4ade80" : "#94a3b8"} fontSize="9">
              Pump: {currentTwin.pump_active ? 'ON (45 kW)' : 'OFF'}
            </text>
          </g>
        </svg>

        {/* Floating Tooltip if Hovered */}
        {hoveredZone && zones[hoveredZone] && (
          <div className="absolute top-4 left-4 bg-gray-900/95 border border-emerald-500/40 p-3 rounded-xl shadow-xl pointer-events-none text-xs space-y-1">
            <div className="font-semibold text-emerald-400 capitalize">{hoveredZone} Details</div>
            <div>Current Load: <span className="text-white font-mono">{zones[hoveredZone].current_load_kw} kW</span></div>
            <div>Occupancy: <span className="text-white font-mono">{zones[hoveredZone].occupancy}</span></div>
            <div>Setpoint Offset: <span className="text-amber-400 font-mono">+{zones[hoveredZone].setpoint_offset_c}°C</span></div>
            <div className="text-[10px] text-gray-400 pt-1">
              Available Headroom: HVAC ({zones[hoveredZone].headroom_kw?.hvac} kW), Lighting ({zones[hoveredZone].headroom_kw?.lighting} kW)
            </div>
          </div>
        )}
      </div>

      {/* Footer legend */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 px-1">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
            <span>&lt;65% Normal</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-500"></span>
            <span>65-85% High</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
            <span>&gt;85% Peak Strain</span>
          </span>
        </div>
        <div className="font-mono text-gray-500">Indore (22.7°N, 75.8°E)</div>
      </div>
    </div>
  );
};
