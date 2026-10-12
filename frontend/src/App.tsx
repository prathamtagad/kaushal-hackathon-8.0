import React, { useState, useEffect, useRef } from 'react';
import {
  TwinState, Deal, FeedMessage, Anomaly, LedgerMetrics,
  LedgerHistoryPoint, FullStateSnapshot
} from './types';
import { CampusMap } from './components/CampusMap';
import { NegotiationFeed } from './components/NegotiationFeed';
import { DealCard } from './components/DealCard';
import { LedgerPanel } from './components/LedgerPanel';
import { ChaosPanel } from './components/ChaosPanel';
import { ForecastTab } from './components/ForecastTab';
import { AnomaliesTab, AuditTab, BmsOutputTab } from './components/OtherTabs';
import { AssetDetailDrawer } from './components/AssetDetailDrawer';
import { HeaderSettingsModal } from './components/HeaderSettingsModal';
import { NeoButton } from './components/ui/NeoButton';
import { NeoBadge } from './components/ui/NeoBadge';
import { NeoCard } from './components/ui/NeoCard';
import { ConfettiBurst } from './components/ui/ConfettiBurst';
import { CountUpNumber } from './components/ui/CountUpNumber';
import {
  Play, Pause, Clock, ShieldCheck, CheckCircle2, AlertTriangle,
  Cpu, Sparkles, Zap, Building, TrendingDown,
  LineChart as LineChartIcon, FileText, Terminal, Settings, ArrowRight,
  Flame, Droplet, IndianRupee, Layers, Leaf
} from 'lucide-react';

export const App: React.FC = () => {
  // State
  const [baseline, setBaseline] = useState<TwinState | null>(null);
  const [managed, setManaged] = useState<TwinState | null>(null);
  const [clock, setClock] = useState<{ tick: number; sim_time: string; is_paused: boolean; speed: number }>({
    tick: 0,
    sim_time: '2026-10-12T06:00:00',
    is_paused: false,
    speed: 1.0
  });
  const [config, setConfig] = useState<any>({
    grid_cap_kw: 850,
    auto_approve: false,
    llm_mode: 'mock',
    weather_source: 'cached'
  });
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [feedMessages, setFeedMessages] = useState<FeedMessage[]>([]);
  const [pendingDeals, setPendingDeals] = useState<Deal[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [ledger, setLedger] = useState<LedgerMetrics>({
    kwh_saved: 0,
    inr_saved: 0,
    co2_kg_saved: 0,
    litres_saved: 0,
    peak_kw_reduced: 0,
    phantom_kwh_eliminated: 0
  });
  const [history, setHistory] = useState<LedgerHistoryPoint[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // Navigation & Inspector State
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'map' | 'analytics' | 'chaos' | 'inspect'>('map');
  const [inspectorSubTab, setInspectorSubTab] = useState<'forecast' | 'anomalies' | 'audit' | 'bms'>('forecast');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Capacities mapping
  const capacities: Record<string, number> = {
    hostel: 380,
    library: 180,
    labs: 260,
    admin: 130
  };

  // WebSocket Auto-Reconnect Connection
  useEffect(() => {
    let reconnectTimeout: any = null;

    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connectWS, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleWebSocketMessage(msg);
        } catch (err) {
          console.error('WS Parse Error', err);
        }
      };
    };

    connectWS();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Initial Snapshot Fetch as fallback
  useEffect(() => {
    fetch('/api/state')
      .then(res => res.json())
      .then((data: FullStateSnapshot) => {
        setBaseline(data.baseline);
        setManaged(data.managed);
        setClock(data.clock);
        setConfig(data.config);
        setScenarios(data.scenarios || []);
        setAnomalies(data.anomalies || []);
        setPendingDeals(data.pending_deals || []);
        if (data.ledger) setLedger(data.ledger);
      })
      .catch(() => {});

    // Fetch initial deals
    fetch('/api/deals')
      .then(res => res.json())
      .then((deals: Deal[]) => {
        setPendingDeals(deals.filter(d => d.status === 'pending'));
      })
      .catch(() => {});
  }, []);

  const handleWebSocketMessage = (msg: { type: string; data: any }) => {
    switch (msg.type) {
      case 'initial_state':
        setBaseline(msg.data.baseline);
        setManaged(msg.data.managed);
        setClock(msg.data.clock);
        setConfig(msg.data.config);
        setScenarios(msg.data.scenarios || []);
        setAnomalies(msg.data.anomalies || []);
        setPendingDeals(msg.data.pending_deals || []);
        if (msg.data.ledger) setLedger(msg.data.ledger);
        break;

      case 'tick':
        setBaseline(msg.data.baseline);
        setManaged(msg.data.managed);
        setClock(msg.data.clock);
        if (msg.data.ledger) {
          setLedger(msg.data.ledger);
          // Append to history
          setHistory(prev => [
            ...prev.slice(-48),
            {
              time: msg.data.baseline.sim_time,
              baseline_import_kw: msg.data.baseline.grid_import_kw,
              managed_import_kw: msg.data.managed.grid_import_kw,
              grid_cap_kw: config.grid_cap_kw
            }
          ]);
        }
        break;

      case 'feed_message':
        setFeedMessages(prev => [...prev, msg.data]);
        break;

      case 'deal_update':
        setPendingDeals(prev => {
          const updated = prev.filter(d => d.deal_id !== msg.data.deal_id);
          if (msg.data.status === 'pending') {
            return [...updated, msg.data];
          }
          return updated;
        });
        break;

      case 'anomaly':
        setAnomalies(prev => [...prev.filter(a => a.anomaly_id !== msg.data.anomaly_id), msg.data]);
        break;

      case 'scenario_update':
        setScenarios(msg.data);
        break;

      case 'clock_update':
        setClock(prev => ({ ...prev, ...msg.data }));
        break;
    }
  };

  // Simulation Controls
  const handlePlayPause = () => {
    const action = clock.is_paused ? 'play' : 'pause';
    fetch('/api/sim/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    setClock(prev => ({ ...prev, is_paused: !prev.is_paused }));
  };

  const handleSpeedChange = (speed: number) => {
    fetch('/api/sim/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'speed', value: speed })
    });
    setClock(prev => ({ ...prev, speed }));
  };

  const handleJumpTime = (timeIso: string) => {
    fetch('/api/sim/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'jump', value: timeIso })
    });
  };

  const handleChaosTrigger = (type: string) => {
    fetch('/api/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
  };

  const handleApproveDeal = (dealId: string) => {
    fetch(`/api/deals/${dealId}/approve`, { method: 'POST' })
      .then(res => res.json())
      .then(() => {
        setPendingDeals(prev => prev.filter(deal => deal.deal_id !== dealId));
        setShowConfetti(true);
      });
  };

  const handleRejectDeal = (dealId: string) => {
    fetch(`/api/deals/${dealId}/reject`, { method: 'POST' })
      .then(res => res.json())
      .then(() => {
        setPendingDeals(prev => prev.filter(deal => deal.deal_id !== dealId));
      });
  };

  const handleAutoApproveToggle = () => {
    const nextVal = !config.auto_approve;
    fetch('/api/config/auto-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: nextVal })
    });
    setConfig((prev: any) => ({ ...prev, auto_approve: nextVal }));
  };

  const handleResetSim = () => {
    fetch('/api/sim/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' })
    });
  };

  const handleRunDemoScript = () => {
    fetch('/api/demo/script', { method: 'POST' });
  };

  // Format Sim Time (e.g., "Monday, 14:15")
  const formatSimTime = (isoString: string) => {
    try {
      const dt = new Date(isoString);
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const day = days[dt.getDay()];
      const hours = String(dt.getHours()).padStart(2, '0');
      const minutes = String(dt.getMinutes()).padStart(2, '0');
      return `${day} ${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  };

  const isNegotiating = feedMessages.length > 0 &&
    new Date().getTime() - new Date(feedMessages[feedMessages.length - 1].ts).getTime() < 8000;

  const currentImport = Math.round(managed?.grid_import_kw || 0);
  const isOverCap = currentImport > (config.grid_cap_kw || 850);

  return (
    <div className="min-h-screen bg-[#FFF4E0] text-black flex flex-col font-['Space_Grotesk',sans-serif]">
      {/* Celebratory Neo-Brutalist Confetti Burst */}
      <ConfettiBurst trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Settings & Configuration Modal */}
      <HeaderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onAutoApproveToggle={handleAutoApproveToggle}
        isConnected={isConnected}
      />

      {/* Contextual Asset Detail Drawer */}
      {managed && (
        <AssetDetailDrawer
          selectedAsset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          twinState={managed}
          capacities={capacities}
        />
      )}

      {/* ======================================================== */}
      {/* 1. SIMPLIFIED GLOBAL HEADER: 3 Distinct Logical Groups */}
      {/* ======================================================== */}
      <header className="border-b-[3px] border-black bg-white px-4 sm:px-6 py-2.5 sticky top-0 z-40 shadow-[0_4px_0_#000]">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* GROUP 1: Brand & Project Context */}
          <div className="flex items-center space-x-3">
            <div className="bg-[#FFD60A] border-[3px] border-black rounded-[4px] px-3 py-1 shadow-[3px_3px_0_#000] flex items-center space-x-2 -rotate-1">
              <div className="w-6 h-6 rounded-[2px] bg-black text-[#FFD60A] flex items-center justify-center">
                <Zap className="w-4 h-4 fill-[#FFD60A]" />
              </div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight uppercase text-black">
                CAMPUSMIND
              </span>
            </div>

            <div className="hidden md:flex items-center space-x-2 text-xs">
              <NeoBadge variant="pink">DIGITAL TWIN</NeoBadge>
              <span className="font-mono text-[11px] font-bold text-neutral-600">
                PS-04 SUSTAINABLE TECH
              </span>
            </div>
          </div>

          {/* GROUP 2: Simulation Controls (Clear Primary Action) */}
          <div className="flex items-center space-x-2 bg-[#FFF8ED] border-2 border-black rounded-[4px] p-1 shadow-[2px_2px_0_#000]">
            {/* Simulation Clock Pill */}
            <div className="flex items-center space-x-1.5 bg-black text-[#06D6A0] font-mono font-bold text-xs px-2.5 py-1 rounded-full border border-black">
              <Clock className="w-3.5 h-3.5 text-[#06D6A0]" />
              <span>{formatSimTime(clock.sim_time)}</span>
            </div>

            {/* Primary Action: Play / Pause */}
            <button
              onClick={handlePlayPause}
              className={`px-2.5 py-1 border-2 border-black rounded-[3px] font-bold transition-all text-xs flex items-center space-x-1 select-none ${
                clock.is_paused
                  ? 'bg-[#06D6A0] text-black shadow-[2px_2px_0_#000] hover:bg-[#1CE5B1]'
                  : 'bg-[#FFD60A] text-black shadow-[2px_2px_0_#000] hover:bg-[#FFE047]'
              }`}
              title={clock.is_paused ? 'Play simulation' : 'Pause simulation'}
            >
              {clock.is_paused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>PLAY</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 fill-black" />
                  <span>PAUSE</span>
                </>
              )}
            </button>

            {/* Speed Multipliers */}
            <div className="hidden sm:flex items-center space-x-0.5 font-mono text-[11px] font-bold">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-1.5 py-0.5 border border-black rounded-[2px] transition-all ${
                    clock.speed === s
                      ? 'bg-[#FF4D8D] text-black font-extrabold shadow-[1px_1px_0_#000]'
                      : 'bg-white text-black hover:bg-[#FFF4E0]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Jump Buttons */}
            <div className="hidden lg:flex items-center space-x-1 pl-1.5 border-l border-neutral-300 text-[10px] font-mono font-bold">
              <button
                onClick={() => handleJumpTime('2026-10-12T12:00:00')}
                className="px-1.5 py-0.5 bg-[#FFD60A] border border-black rounded-[2px] hover:shadow-[1px_1px_0_#000]"
              >
                NOON
              </button>
              <button
                onClick={() => handleJumpTime('2026-10-12T19:00:00')}
                className="px-1.5 py-0.5 bg-[#FF7B00] border border-black rounded-[2px] hover:shadow-[1px_1px_0_#000]"
              >
                PEAK
              </button>
            </div>
          </div>

          {/* GROUP 3: System Status & Primary Demo Action */}
          <div className="flex items-center space-x-2">
            {/* 3-Minute Demo Sequence */}
            <NeoButton
              variant="pink"
              size="sm"
              onClick={handleRunDemoScript}
              className="py-1 px-3 shadow-[2px_2px_0_#000] text-xs"
              title="Runs the verified 3-minute hackathon demo script sequence"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              <span>3-MIN DEMO</span>
            </NeoButton>

            {/* Compact Settings / Status Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-2.5 py-1 bg-white border-2 border-black rounded-[3px] shadow-[2px_2px_0_#000] hover:bg-[#FFF4E0] flex items-center space-x-1.5 text-xs font-bold uppercase transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-black" />
              <span className="hidden sm:inline">SETTINGS</span>
            </button>

            {/* Live Link Badge */}
            <div className={`px-2 py-0.5 border-2 border-black rounded-[3px] shadow-[2px_2px_0_#000] font-mono text-[10px] font-bold flex items-center space-x-1.5 ${isConnected ? 'bg-[#06D6A0] text-black' : 'bg-[#FF3B30] text-white'}`}>
              <span className={`w-2 h-2 rounded-full border border-black ${isConnected ? 'bg-black animate-ping' : 'bg-white'}`} />
              <span className="hidden sm:inline">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 p-3 sm:p-5 space-y-4 max-w-[1720px] mx-auto w-full">
        
        {/* ======================================================== */}
        {/* 2. OVERVIEW STRIP: Prominent KPIs + Smart Next Action */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          
          {/* Top 4 Essential KPIs */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* KPI 1: Grid Import */}
            <div className="bg-white border-2 border-black rounded-[4px] p-2.5 shadow-[3px_3px_0_#000] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-neutral-600">
                <span>NET GRID IMPORT</span>
                <NeoBadge variant={isOverCap ? 'red' : 'mint'}>
                  {isOverCap ? 'OVER CAP' : 'NORMAL'}
                </NeoBadge>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight my-0.5">
                {currentImport} <span className="text-xs font-normal">kW</span>
              </div>
              <div className="text-[10px] font-mono text-neutral-500">
                Limit: {config.grid_cap_kw || 850} kW
              </div>
            </div>

            {/* KPI 2: Cost Saved */}
            <div className="bg-[#06D6A0] text-black border-2 border-black rounded-[4px] p-2.5 shadow-[3px_3px_0_#000] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-mono font-extrabold">
                <span>TARIFF SAVINGS</span>
                <IndianRupee className="w-3.5 h-3.5 text-black" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight my-0.5">
                <CountUpNumber value={ledger.inr_saved} prefix="₹" />
              </div>
              <div className="text-[10px] font-mono font-bold">
                vs unmanaged baseline
              </div>
            </div>

            {/* KPI 3: Energy Saved */}
            <div className="bg-[#FFD60A] text-black border-2 border-black rounded-[4px] p-2.5 shadow-[3px_3px_0_#000] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-mono font-extrabold">
                <span>ENERGY SHAVED</span>
                <Zap className="w-3.5 h-3.5 text-black" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight my-0.5">
                <CountUpNumber value={ledger.kwh_saved} /> <span className="text-xs font-normal">kWh</span>
              </div>
              <div className="text-[10px] font-mono font-bold">
                rebound accounted
              </div>
            </div>

            {/* KPI 4: Carbon Avoidance */}
            <div className="bg-[#FF4D8D] text-black border-2 border-black rounded-[4px] p-2.5 shadow-[3px_3px_0_#000] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-mono font-extrabold">
                <span>CO₂ MITIGATED</span>
                <Leaf className="w-3.5 h-3.5 text-black" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight my-0.5">
                <CountUpNumber value={ledger.co2_kg_saved} /> <span className="text-xs font-normal">kg</span>
              </div>
              <div className="text-[10px] font-mono font-bold">
                @ 0.82 kg/kWh
              </div>
            </div>
          </div>

          {/* Prominent Next Action / Contextual Recommendation Banner */}
          <div className="lg:col-span-4 bg-[#FFF8ED] border-2 border-black rounded-[4px] p-3 shadow-[3px_3px_0_#000] flex flex-col justify-between">
            <div className="flex items-center space-x-1.5 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF7B00] animate-pulse" />
              <span className="text-[10px] font-mono font-extrabold uppercase text-neutral-700">
                INTELLIGENT SYSTEM STATE
              </span>
            </div>

            <div className="text-xs font-bold leading-snug">
              {pendingDeals.length > 0 ? (
                <span className="text-[#FF3B30]">
                  ⚠️ Deal pending facility approval! {pendingDeals[0].total_shed_kw} kW shedding ready to apply to BMS.
                </span>
              ) : isOverCap ? (
                <span className="text-[#FF7B00]">
                  ⚡ Peak demand exceeds {config.grid_cap_kw}kW. Zone agents negotiating load-shedding.
                </span>
              ) : scenarios.length > 0 ? (
                <span className="text-black">
                  🌪️ Stress active: {scenarios.join(', ').toUpperCase()}. Digital twin reacting in real time.
                </span>
              ) : (
                <span className="text-neutral-800">
                  ✅ Campus operating nominally. Click any building on the map below or test a crisis injection.
                </span>
              )}
            </div>

            <div className="mt-2 pt-1 border-t border-neutral-300 flex items-center justify-between text-[10px] font-mono">
              <span className="text-neutral-600">RECOMMENDED ACTION:</span>
              {pendingDeals.length > 0 ? (
                <button
                  onClick={() => setActiveWorkspaceTab('map')}
                  className="font-bold underline text-black hover:text-[#3A86FF]"
                >
                  REVIEW PENDING DEAL →
                </button>
              ) : (
                <button
                  onClick={() => setActiveWorkspaceTab('chaos')}
                  className="font-bold underline text-black hover:text-[#3A86FF]"
                >
                  EXPLORE SCENARIO LAB →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. WORKSPACE NAVIGATION TABS (Uncluttered, Focused Views) */}
        {/* ======================================================== */}
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-black pb-2">
          <button
            onClick={() => setActiveWorkspaceTab('map')}
            className={`px-3.5 py-1.5 border-2 border-black rounded-[4px] font-bold text-xs uppercase flex items-center space-x-1.5 transition-all ${
              activeWorkspaceTab === 'map'
                ? 'bg-[#FFD60A] text-black -translate-y-0.5 shadow-[3px_3px_0_#000]'
                : 'bg-white text-black hover:bg-[#FFF4E0] shadow-[1px_1px_0_#000]'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>CAMPUS DIGITAL TWIN</span>
          </button>

          <button
            onClick={() => setActiveWorkspaceTab('analytics')}
            className={`px-3.5 py-1.5 border-2 border-black rounded-[4px] font-bold text-xs uppercase flex items-center space-x-1.5 transition-all ${
              activeWorkspaceTab === 'analytics'
                ? 'bg-[#FFD60A] text-black -translate-y-0.5 shadow-[3px_3px_0_#000]'
                : 'bg-white text-black hover:bg-[#FFF4E0] shadow-[1px_1px_0_#000]'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>IMPACT LEDGER & CHARTS</span>
          </button>

          <button
            onClick={() => setActiveWorkspaceTab('chaos')}
            className={`px-3.5 py-1.5 border-2 border-black rounded-[4px] font-bold text-xs uppercase flex items-center space-x-1.5 transition-all ${
              activeWorkspaceTab === 'chaos'
                ? 'bg-[#FFD60A] text-black -translate-y-0.5 shadow-[3px_3px_0_#000]'
                : 'bg-white text-black hover:bg-[#FFF4E0] shadow-[1px_1px_0_#000]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>CHAOS SCENARIO LAB</span>
            {scenarios.length > 0 && (
              <span className="ml-1 w-2 h-2 rounded-full bg-[#FF3B30] animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveWorkspaceTab('inspect')}
            className={`px-3.5 py-1.5 border-2 border-black rounded-[4px] font-bold text-xs uppercase flex items-center space-x-1.5 transition-all ${
              activeWorkspaceTab === 'inspect'
                ? 'bg-[#FFD60A] text-black -translate-y-0.5 shadow-[3px_3px_0_#000]'
                : 'bg-white text-black hover:bg-[#FFF4E0] shadow-[1px_1px_0_#000]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>INSPECTOR & PROTOCOL AUDIT</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* 4. WORKSPACE CONTENT: Based on Selected Workspace Tab     */}
        {/* ======================================================== */}

        {/* TAB 1: CAMPUS DIGITAL TWIN MAP & AGENT NEGOTIATIONS */}
        {activeWorkspaceTab === 'map' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch min-h-[540px]">
            {/* Primary Campus Map (7 cols on large screens: spacious, readable) */}
            <div className="xl:col-span-7 h-full">
              {baseline && managed && (
                <CampusMap
                  baselineState={baseline}
                  managedState={managed}
                  activeDeals={pendingDeals}
                  isNegotiating={isNegotiating}
                  onSelectAsset={(id) => setSelectedAsset(id)}
                  selectedAsset={selectedAsset}
                />
              )}
            </div>

            {/* Agent Negotiation Feed & Pending Deal Review (5 cols) */}
            <div className="xl:col-span-5 h-full flex flex-col space-y-3">
              {/* Pending Deals Cards */}
              {pendingDeals.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-extrabold uppercase text-[#FF3B30] flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>PENDING DEALS REQUIRING FACILITY MANAGER APPROVAL ({pendingDeals.length})</span>
                  </div>
                  {pendingDeals.map((deal) => (
                    <DealCard
                      key={deal.deal_id}
                      deal={deal}
                      onApprove={handleApproveDeal}
                      onReject={handleRejectDeal}
                    />
                  ))}
                </div>
              )}

              {/* Negotiation Feed Stream */}
              <div className="flex-1 min-h-[360px]">
                <NegotiationFeed
                  messages={feedMessages}
                  onTriggerDemo={handleRunDemoScript}
                  onTriggerPeak={() => handleChaosTrigger('heatwave')}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: IMPACT LEDGER & COUNTERFACTUAL ANALYTICS */}
        {activeWorkspaceTab === 'analytics' && (
          <div className="space-y-4">
            <LedgerPanel
              metrics={ledger}
              history={history}
              gridCapKw={config.grid_cap_kw || 850}
              onReset={handleResetSim}
            />
          </div>
        )}

        {/* TAB 3: CHAOS SCENARIOS LAB */}
        {activeWorkspaceTab === 'chaos' && (
          <div className="space-y-4">
            <ChaosPanel
              activeScenarios={scenarios}
              onTrigger={handleChaosTrigger}
            />
          </div>
        )}

        {/* TAB 4: INSPECTOR, FORECAST, ANOMALIES & AUDIT */}
        {activeWorkspaceTab === 'inspect' && (
          <div className="bg-white border-[3px] border-black rounded-[4px] shadow-[6px_6px_0_#000] p-4">
            {/* Inspector sub-tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b-2 border-black pb-3 mb-4">
              <button
                onClick={() => setInspectorSubTab('forecast')}
                className={`px-3 py-1.5 border-2 border-black rounded-[3px] font-bold text-xs uppercase flex items-center space-x-1.5 transition-all ${
                  inspectorSubTab === 'forecast'
                    ? 'bg-[#FFD60A] text-black shadow-[2px_2px_0_#000]'
                    : 'bg-white text-black hover:bg-[#FFF4E0]'
                }`}
              >
                <LineChartIcon className="w-3.5 h-3.5" />
                <span>24H LOAD FORECAST</span>
              </button>

              <button
                onClick={() => setInspectorSubTab('anomalies')}
                className={`px-3 py-1.5 border-2 border-black rounded-[3px] font-bold text-xs uppercase flex items-center space-x-1.5 transition-all ${
                  inspectorSubTab === 'anomalies'
                    ? 'bg-[#FFD60A] text-black shadow-[2px_2px_0_#000]'
                    : 'bg-white text-black hover:bg-[#FFF4E0]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>ANOMALIES & LEAKS ({anomalies.length})</span>
              </button>

              <button
                onClick={() => setInspectorSubTab('audit')}
                className={`px-3 py-1.5 border-2 border-black rounded-[3px] font-bold text-xs uppercase flex items-center space-x-1.5 transition-all ${
                  inspectorSubTab === 'audit'
                    ? 'bg-[#FFD60A] text-black shadow-[2px_2px_0_#000]'
                    : 'bg-white text-black hover:bg-[#FFF4E0]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>AUDIT TRAIL</span>
              </button>

              <button
                onClick={() => setInspectorSubTab('bms')}
                className={`px-3 py-1.5 border-2 border-black rounded-[3px] font-bold text-xs uppercase flex items-center space-x-1.5 transition-all ${
                  inspectorSubTab === 'bms'
                    ? 'bg-[#FFD60A] text-black shadow-[2px_2px_0_#000]'
                    : 'bg-white text-black hover:bg-[#FFF4E0]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>BMS / MQTT OUTBOX</span>
              </button>
            </div>

            <div>
              {inspectorSubTab === 'forecast' && <ForecastTab gridCapKw={config.grid_cap_kw || 850} />}
              {inspectorSubTab === 'anomalies' && <AnomaliesTab anomalies={anomalies} />}
              {inspectorSubTab === 'audit' && <AuditTab />}
              {inspectorSubTab === 'bms' && <BmsOutputTab />}
            </div>
          </div>
        )}
      </main>

      {/* Footer with Mandated Disclosures */}
      <footer className="border-t-[3px] border-black bg-white py-2.5 px-6 text-[10px] sm:text-[11px] font-mono font-bold text-black flex flex-col sm:flex-row items-center justify-between gap-2 shadow-[0_-2px_0_#000]">
        <div>
          DATA: SIMULATED • SEEDED WITH OPEN-METEO INDORE (22.7°N, 75.8°E) • TARIFFS & EMISSIONS: STANDARD MPSERC DEFAULTS
        </div>
        <div className="flex items-center space-x-3">
          <span className="bg-[#FFD60A] px-1.5 py-0.5 rounded-[2px] border border-black">
            LLM: {config.llm_mode.toUpperCase()} (DETERMINISTIC FALLBACKS ACTIVE)
          </span>
          <span>•</span>
          <span className="bg-[#06D6A0] px-1.5 py-0.5 rounded-[2px] border border-black">
            FASTAPI + LIGHTGBM + REACT + CVXPY
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
