import React from 'react';
import { ZoneState, TwinState } from '../types';
import { X, Building, Zap, Users, Thermometer, ShieldCheck, Sun, Droplets, Activity } from 'lucide-react';
import { NeoBadge } from './ui/NeoBadge';
import { NeoButton } from './ui/NeoButton';

interface AssetDetailDrawerProps {
  selectedAsset: string | null;
  onClose: () => void;
  twinState: TwinState;
  capacities: Record<string, number>;
}

export const AssetDetailDrawer: React.FC<AssetDetailDrawerProps> = ({
  selectedAsset,
  onClose,
  twinState,
  capacities
}) => {
  if (!selectedAsset) return null;

  const zones = twinState.zones || {};
  const isBuilding = ['hostel', 'library', 'labs', 'admin'].includes(selectedAsset);
  const zone: ZoneState | undefined = zones[selectedAsset];

  const getTitle = () => {
    switch (selectedAsset) {
      case 'hostel': return 'HOSTEL BLOCKS (A–D)';
      case 'library': return 'CENTRAL LIBRARY';
      case 'labs': return 'ENGINEERING & RESEARCH LABS';
      case 'admin': return 'CAMPUS ADMINISTRATION';
      case 'solar': return 'ROOFTOP SOLAR PV SYSTEM';
      case 'water': return 'MAIN WATER STORAGE & PUMPING';
      case 'grid_hub': return 'CENTRAL CAMPUS 11kV SUBSTATION';
      default: return selectedAsset.toUpperCase();
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l-[3px] border-black shadow-[-8px_0_0_#000] flex flex-col font-['Space_Grotesk',sans-serif] animate-neo-slide-in">
      {/* Title Bar */}
      <div className="p-4 bg-[#FFD60A] border-b-[3px] border-black flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building className="w-5 h-5 text-black" />
          <h3 className="font-extrabold text-sm sm:text-base tracking-tight uppercase">
            {getTitle()}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-[3px] bg-white text-black border-2 border-black flex items-center justify-center font-bold shadow-[2px_2px_0_#000] hover:bg-neutral-100 active:translate-x-0.5 active:translate-y-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Building Details */}
        {isBuilding && zone && (
          <>
            {/* Load vs Capacity Highlight */}
            <div className="bg-[#FFF4E0] border-2 border-black rounded-[4px] p-3 shadow-[3px_3px_0_#000]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-neutral-600 uppercase">CURRENT LOAD</span>
                <NeoBadge variant={zone.current_load_kw / (capacities[selectedAsset] || 1) > 0.85 ? 'red' : 'mint'}>
                  {Math.round((zone.current_load_kw / (capacities[selectedAsset] || 1)) * 100)}% CAPACITY
                </NeoBadge>
              </div>
              <div className="text-2xl font-extrabold font-mono text-black">
                {Math.round(zone.current_load_kw)} <span className="text-sm font-bold">kW</span>
                <span className="text-xs font-mono font-normal text-neutral-500 ml-2">
                  / {capacities[selectedAsset]} kW cap
                </span>
              </div>
              <div className="mt-2 w-full h-3 bg-white border border-black rounded-[2px] overflow-hidden">
                <div
                  className="h-full bg-[#FF7B00] border-r border-black"
                  style={{ width: `${Math.min(100, (zone.current_load_kw / (capacities[selectedAsset] || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Occupancy and Environment */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border-2 border-black rounded-[4px] p-2.5 shadow-[2px_2px_0_#000]">
                <div className="flex items-center space-x-1.5 text-neutral-600 mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase">OCCUPANCY</span>
                </div>
                <div className="text-lg font-extrabold font-mono">{zone.occupancy} <span className="text-xs font-normal">people</span></div>
                <div className="text-[9px] font-mono text-neutral-500 mt-0.5">from live timetable schedule</div>
              </div>

              <div className="bg-white border-2 border-black rounded-[4px] p-2.5 shadow-[2px_2px_0_#000]">
                <div className="flex items-center space-x-1.5 text-neutral-600 mb-1">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase">ZONE TEMP</span>
                </div>
                <div className="text-lg font-extrabold font-mono">{zone.temp_c || 24.5}°C</div>
                <div className="text-[9px] font-mono text-neutral-500 mt-0.5">
                  setpoint offset: +{zone.setpoint_offset_c || 0}°C
                </div>
              </div>
            </div>

            {/* Load Breakdown Table */}
            <div className="border-2 border-black rounded-[4px] overflow-hidden shadow-[2px_2px_0_#000]">
              <div className="bg-black text-[#FFD60A] px-3 py-1.5 font-bold uppercase text-[10px] flex justify-between">
                <span>SUB-CIRCUIT BREAKDOWN</span>
                <span>POWER (kW)</span>
              </div>
              <div className="divide-y divide-black bg-white font-mono text-xs">
                <div className="p-2 flex justify-between items-center">
                  <div>
                    <div className="font-bold">HVAC / Cooling Compressors</div>
                    <div className="text-[9px] text-neutral-500 font-sans">Thermostat control, setpoint modulated</div>
                  </div>
                  <span className="font-bold">{Math.round(zone.hvac_kw || 0)} kW</span>
                </div>
                <div className="p-2 flex justify-between items-center">
                  <div>
                    <div className="font-bold">Lighting Circuits</div>
                    <div className="text-[9px] text-neutral-500 font-sans">Corridors, reading areas & ambient</div>
                  </div>
                  <span className="font-bold">{Math.round(zone.lighting_kw || 0)} kW</span>
                </div>
                <div className="p-2 flex justify-between items-center">
                  <div>
                    <div className="font-bold">Flexible / Discretionary</div>
                    <div className="text-[9px] text-neutral-500 font-sans">Laundry, heaters, EV / device chargers</div>
                  </div>
                  <span className="font-bold">{Math.round(zone.flexible_kw || 0)} kW</span>
                </div>
                <div className="p-2 flex justify-between items-center bg-[#FFF8ED]">
                  <div>
                    <div className="font-bold">Critical Baseload (Non-sheddable)</div>
                    <div className="text-[9px] text-neutral-500 font-sans">Servers, emergency lighting, security</div>
                  </div>
                  <span className="font-bold">{Math.round(zone.critical_kw || 0)} kW</span>
                </div>
              </div>
            </div>

            {/* Headroom available for agent negotiation */}
            <div className="bg-[#06D6A0] border-2 border-black rounded-[4px] p-3 shadow-[2px_2px_0_#000]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold uppercase text-[10px]">CURRENT SHEDDING HEADROOM</span>
                <span className="font-mono font-bold text-[10px] bg-black text-[#06D6A0] px-1.5 py-0.5 rounded-[2px]">
                  AVAILABLE
                </span>
              </div>
              <div className="text-[11px] font-mono space-y-1 mt-1.5">
                <div>• HVAC Headroom: <strong>{zone.headroom_kw?.hvac || 0} kW</strong></div>
                <div>• Lighting Headroom: <strong>{zone.headroom_kw?.lighting || 0} kW</strong></div>
                <div>• Flexible Load: <strong>{zone.headroom_kw?.flexible || 0} kW</strong></div>
              </div>
            </div>
          </>
        )}

        {/* Solar PV Details */}
        {selectedAsset === 'solar' && (
          <div className="space-y-3">
            <div className="bg-[#FFD60A] border-2 border-black rounded-[4px] p-3 shadow-[3px_3px_0_#000]">
              <div className="text-[10px] font-mono font-bold uppercase text-neutral-700">CURRENT GENERATION</div>
              <div className="text-3xl font-extrabold font-mono text-black mt-1">
                {Math.round(twinState.solar_kw || 0)} <span className="text-sm">kW</span>
              </div>
              <div className="text-[10px] font-mono text-neutral-600 mt-1">
                Peak rated array: 250 kWp Rooftop Polycrystalline
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-[4px] p-3 space-y-2 shadow-[2px_2px_0_#000]">
              <div className="font-bold uppercase text-xs">Irradiance & Solar Model</div>
              <p className="text-[11px] text-neutral-600">
                Seeded with Open-Meteo hourly GHI (Global Horizontal Irradiance) for Indore coordinates (22.7°N, 75.8°E).
                Power is calculated as <code>SOLAR_PEAK_KW * clamp(GHI / 1000)</code>.
              </p>
            </div>
          </div>
        )}

        {/* Water Tank Details */}
        {selectedAsset === 'water' && (
          <div className="space-y-3">
            <div className="bg-[#3A86FF] text-white border-2 border-black rounded-[4px] p-3 shadow-[3px_3px_0_#000]">
              <div className="text-[10px] font-mono font-bold uppercase text-white/80">RESERVOIR CAPACITY</div>
              <div className="text-3xl font-extrabold font-mono mt-1">
                {Math.round(twinState.tank_level_kl || 210)} <span className="text-sm">kL ({Math.round(twinState.tank_pct || 70)}%)</span>
              </div>
              <div className="text-[10px] font-mono mt-1 text-white/80">
                Total capacity: 300 kL • Minimum reserve floor: 30% (40% during exam week)
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-[4px] p-3 shadow-[2px_2px_0_#000] space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold">Borewell Pump (45 kW):</span>
                <NeoBadge variant={twinState.pump_active ? 'mint' : 'default'}>
                  {twinState.pump_active ? 'RUNNING (40 kL/h)' : 'IDLE / OFF'}
                </NeoBadge>
              </div>
              <div className="text-[11px] text-neutral-600 font-mono">
                {twinState.pump_active
                  ? 'Pump is co-scheduled to replenish reservoir during cheap off-peak or solar hours.'
                  : 'Pumping deferred to prevent stacking load onto high-tariff grid peak window.'}
              </div>
            </div>
          </div>
        )}

        {/* Central Grid Hub Details */}
        {selectedAsset === 'grid_hub' && (
          <div className="space-y-3">
            <div className="bg-black text-white border-2 border-black rounded-[4px] p-3 shadow-[3px_3px_0_#000]">
              <div className="text-[10px] font-mono font-bold uppercase text-[#FFD60A]">TOTAL NET GRID IMPORT</div>
              <div className="text-3xl font-extrabold font-mono text-[#06D6A0] mt-1">
                {Math.round(twinState.grid_import_kw || 0)} <span className="text-sm">kW</span>
              </div>
              <div className="text-[10px] font-mono mt-1 text-neutral-300">
                Sanctioned Grid Import Limit: 850 kW
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-[4px] p-3 shadow-[2px_2px_0_#000] space-y-2">
              <div className="font-bold uppercase text-xs">Contract Demand & Penalties</div>
              <p className="text-[11px] text-neutral-600">
                Operating above 850 kW triggers costly MPSERC maximum-demand surcharges.
                When the forecast predicts campus load crossing 850 kW, the Grid Agent automatically issues an Ask to all zone agents to shed non-essential loads.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="p-3 bg-[#FFF4E0] border-t-[3px] border-black flex justify-end">
        <NeoButton variant="black" size="sm" onClick={onClose}>
          CLOSE DETAILS
        </NeoButton>
      </div>
    </div>
  );
};
