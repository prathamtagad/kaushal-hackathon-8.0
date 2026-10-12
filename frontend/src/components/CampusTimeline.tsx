import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, FastForward, Rewind,
  Sun, Moon, CloudSun, Zap, Clock, Droplets,
  Building, Sparkles, Compass
} from 'lucide-react';
import { NeoButton } from './ui/NeoButton';

interface CampusTimelineProps {
  simTime: string;
  isPaused: boolean;
  speed: number;
  gridImportKw: number;
  solarKw: number;
  gridCapKw: number;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onJumpTime: (isoTime: string) => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
}

interface Milestone {
  hour: number;
  title: string;
  badge: string;
  icon: string;
  tag: string;
  color: string;
}

const MILESTONES: Milestone[] = [
  { hour: 6.0, title: 'Dawn Wakeup', badge: '06:00', icon: '🌅', tag: 'Solar Arrays Engage', color: 'mint' },
  { hour: 8.5, title: 'Campus Rush', badge: '08:30', icon: '🏫', tag: 'HVAC Sets Ramp Up', color: 'yellow' },
  { hour: 12.5, title: 'Solar Peak', badge: '12:30', icon: '☀️', tag: '240 kWp Max Generation', color: 'orange' },
  { hour: 16.0, title: 'Library Peak', badge: '16:00', icon: '📚', tag: 'Study Halls Full Load', color: 'blue' },
  { hour: 19.0, title: 'Grid Cap Strain', badge: '19:00', icon: '⚡', tag: 'Dinner & Chiller Peak', color: 'red' },
  { hour: 23.0, title: 'Off-Peak Refill', badge: '23:00', icon: '💧', tag: '45 kW Pump Schedule', color: 'lilac' },
];

export const CampusTimeline: React.FC<CampusTimelineProps> = ({
  simTime,
  isPaused,
  speed,
  gridImportKw,
  solarKw,
  gridCapKw,
  onPlayPause,
  onSpeedChange,
  onJumpTime,
  onStepForward,
  onStepBackward,
  onReset,
}) => {
  // Parse simulated time safely
  const dt = new Date(simTime);
  const currentHour = isNaN(dt.getTime()) ? 6 : dt.getHours();
  const currentMinute = isNaN(dt.getTime()) ? 0 : dt.getMinutes();
  const currentDayOfWeek = isNaN(dt.getTime()) ? 'MON' : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][dt.getDay()];
  const currentFractionalHour = currentHour + currentMinute / 60.0;

  // Time-of-Use Tariff information
  const getTariffInfo = (hr: number) => {
    if ((hr >= 11 && hr < 15) || (hr >= 18 && hr < 22)) {
      return {
        rate: 9.0,
        label: 'PEAK TARIFF',
        color: '#FF3B30',
        bg: 'bg-[#FF3B30] text-white',
        border: 'border-[#FF3B30]'
      };
    }
    if (hr >= 22 || hr < 6) {
      return {
        rate: 5.5,
        label: 'OFF-PEAK TOD',
        color: '#06D6A0',
        bg: 'bg-[#06D6A0] text-black',
        border: 'border-[#06D6A0]'
      };
    }
    return {
      rate: 7.0,
      label: 'NORMAL TARIFF',
      color: '#FFD60A',
      bg: 'bg-[#FFD60A] text-black',
      border: 'border-[#FFD60A]'
    };
  };

  const currentTariff = getTariffInfo(currentHour);

  // Time-of-day phase description
  const getTimePhase = (hr: number) => {
    if (hr >= 6 && hr < 11) return { phase: 'MORNING RAMP', icon: CloudSun, color: 'text-amber-500' };
    if (hr >= 11 && hr < 16) return { phase: 'SOLAR PEAK', icon: Sun, color: 'text-[#FFD60A]' };
    if (hr >= 16 && hr < 18) return { phase: 'AFTERNOON', icon: Sun, color: 'text-orange-500' };
    if (hr >= 18 && hr < 22) return { phase: 'PEAK STRAIN', icon: Zap, color: 'text-[#FF3B30]' };
    return { phase: 'OFF-PEAK NIGHT', icon: Moon, color: 'text-indigo-400' };
  };

  const currentPhase = getTimePhase(currentHour);
  const PhaseIcon = currentPhase.icon;



  const handlePresetJump = (hour: number, minute: number = 0) => {
    const baseDateStr = simTime.split('T')[0] || '2026-10-12';
    const targetIso = `${baseDateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    onJumpTime(targetIso);
  };

  return (
    <div className="bg-white border-[3px] border-black rounded-[4px] shadow-[6px_6px_0_#000] p-3.5 sm:p-4 font-['Space_Grotesk',sans-serif] select-none">
      {/* 1. TOP COMMAND COCKPIT STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-black">
        {/* Left: Glowing Digital Twin Clock & Real Status */}
        <div className="flex items-center space-x-2.5">
          {/* Main Digital Clock */}
          <div className="bg-black text-white px-3.5 py-1.5 rounded-[4px] border-2 border-black shadow-[3px_3px_0_#000] flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#FFD60A] animate-pulse" />
            <div className="flex items-baseline space-x-1.5 font-mono">
              <span className="text-xs font-bold text-[#FFD60A] tracking-wider">{currentDayOfWeek}</span>
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#06D6A0]">
                {String(currentHour).padStart(2, '0')}
                <span className="animate-pulse">:</span>
                {String(currentMinute).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-neutral-400 font-sans">IST</span>
            </div>
          </div>

          {/* Active Tariff Badge */}
          <div className={`px-2.5 py-1 rounded-[3px] border-2 border-black shadow-[2px_2px_0_#000] font-mono text-xs font-extrabold flex items-center space-x-1.5 ${currentTariff.bg}`}>
            <span>₹{currentTariff.rate.toFixed(2)}/kWh</span>
            <span className="text-[10px] font-sans uppercase opacity-90">• {currentTariff.label}</span>
          </div>

          {/* Operational Phase Pill */}
          <div className="hidden md:flex items-center space-x-1.5 bg-[#FFF8ED] border-2 border-black px-2.5 py-1 rounded-[3px] text-xs font-bold shadow-[2px_2px_0_#000]">
            <PhaseIcon className={`w-3.5 h-3.5 ${currentPhase.color}`} />
            <span className="uppercase tracking-tight">{currentPhase.phase}</span>
          </div>
        </div>

        {/* Right: Tactile VCR Playback Controls */}
        <div className="flex items-center space-x-2">
          {/* Step Backward 15m */}
          <button
            onClick={onStepBackward}
            title="Step backward 15 minutes"
            className="px-2 py-1.5 bg-white text-black border-2 border-black rounded-[3px] shadow-[2px_2px_0_#000] hover:bg-[#FFF4E0] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center space-x-1 font-mono text-xs font-bold"
          >
            <Rewind className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">15m</span>
          </button>

          {/* Master Play / Pause Button */}
          <NeoButton
            variant={isPaused ? 'mint' : 'yellow'}
            size="sm"
            onClick={onPlayPause}
            className="px-4 py-1.5 text-xs shadow-[3px_3px_0_#000] flex items-center space-x-1.5 font-extrabold"
            title={isPaused ? 'Resume simulation' : 'Pause simulation'}
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4 fill-black" />
                <span>PLAY</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 fill-black" />
                <span>PAUSE</span>
              </>
            )}
          </NeoButton>

          {/* Step Forward 15m */}
          <button
            onClick={onStepForward}
            title="Step forward 15 minutes"
            className="px-2 py-1.5 bg-white text-black border-2 border-black rounded-[3px] shadow-[2px_2px_0_#000] hover:bg-[#FFF4E0] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center space-x-1 font-mono text-xs font-bold"
          >
            <span className="hidden sm:inline">15m</span>
            <FastForward className="w-3.5 h-3.5" />
          </button>

          {/* Speed Selectors */}
          <div className="flex items-center space-x-0.5 bg-[#FFF8ED] border-2 border-black rounded-[3px] p-0.5 shadow-[2px_2px_0_#000] font-mono text-[10px] font-bold">
            {[1, 2, 4, 8].map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-1 rounded-[2px] transition-all ${
                  speed === s
                    ? 'bg-black text-[#FFD60A] font-extrabold shadow-[1px_1px_0_#000]'
                    : 'text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Reset */}
          <button
            onClick={onReset}
            title="Reset simulation to Monday 06:00"
            className="p-1.5 bg-[#FFF4E0] text-black border-2 border-black rounded-[3px] shadow-[2px_2px_0_#000] hover:bg-[#FFE9C2] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ml-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>



      {/* 3. INTERACTIVE OPERATIONAL MILESTONE CARDS (Clean, Prominent, Separate Row) */}
      <div className="pt-2 border-t border-neutral-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono font-extrabold uppercase text-neutral-800 flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5 text-black" />
            <span>CAMPUS OPERATIONAL EVENTS (ONE-CLICK PHYSIC EVALUATION)</span>
          </span>
          <span className="text-[10px] font-mono font-bold text-neutral-500">
            Click any event to fast-forward twin state
          </span>
        </div>

        {/* Milestone Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {MILESTONES.map((m) => {
            const isActive = Math.abs(currentFractionalHour - m.hour) < 1.0;
            return (
              <button
                key={m.badge}
                onClick={() => handlePresetJump(Math.floor(m.hour), (m.hour % 1) * 60)}
                className={`p-2 border-2 border-black rounded-[4px] text-left transition-all select-none ${
                  isActive
                    ? 'bg-[#FFD60A] -translate-y-0.5 shadow-[4px_4px_0_#000] ring-2 ring-black'
                    : 'bg-[#FFF8ED] hover:bg-[#FFE9C2] shadow-[2px_2px_0_#000] hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{m.icon}</span>
                  <span className="font-mono text-[10px] font-extrabold bg-black text-white px-1.5 py-0.5 rounded-[2px]">
                    {m.badge}
                  </span>
                </div>
                <div className="font-extrabold text-[11px] uppercase tracking-tight text-black truncate">
                  {m.title}
                </div>
                <div className="text-[9px] font-mono text-neutral-600 truncate mt-0.5">
                  {m.tag}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. REAL-TIME REALITY VERIFICATION STRIP */}
      <div className="mt-3 pt-2 border-t-2 border-black flex flex-wrap items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#06D6A0] animate-pulse" />
          <span className="font-extrabold text-black">PHYSICS ENGINE:</span>
          <span className="text-neutral-700">INDORE METEOROLOGICAL SOLAR MODEL + BACnet/IP TELEMETRY</span>
        </div>

        <div className="flex items-center space-x-3 mt-1 sm:mt-0">
          <span>
            SOLAR GENERATION: <strong className="text-black">{Math.round(solarKw)} kWp</strong>
          </span>
          <span>•</span>
          <span>
            NET GRID IMPORT: <strong className={gridImportKw > gridCapKw ? 'text-[#FF3B30] font-extrabold' : 'text-black'}>
              {Math.round(gridImportKw)} kW
            </strong>
          </span>
          <span>•</span>
          <span className="bg-black text-[#FFD60A] px-2 py-0.5 rounded-[2px] font-extrabold">
            100% LIVE PHYSICS
          </span>
        </div>
      </div>
    </div>
  );
};
