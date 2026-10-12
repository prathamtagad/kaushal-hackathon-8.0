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
import { NeoButton } from './components/ui/NeoButton';
import { NeoBadge } from './components/ui/NeoBadge';
import { NeoCard } from './components/ui/NeoCard';
import { ConfettiBurst } from './components/ui/ConfettiBurst';
import {
  Play, Pause, FastForward, RotateCcw, Clock, ShieldCheck,
  CheckCircle2, AlertTriangle, Cpu, Radio, Sparkles, Zap,
  LineChart as LineChartIcon, FileText, Terminal, Layers
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
  const [activeTab, setActiveTab] = useState<'forecast' | 'anomalies' | 'audit' | 'bms'>('forecast');
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

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
        // Confetti burst of flat colored squares on deal approval
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

  // Is any negotiation actively taking place?
  const isNegotiating = feedMessages.length > 0 &&
    new Date().getTime() - new Date(feedMessages[feedMessages.length - 1].ts).getTime() < 8000;

  return (
    <div className="min-h-screen bg-[#FFF4E0] text-black flex flex-col font-['Space_Grotesk',sans-serif]">
      {/* Celebratory Neo-Brutalist Confetti Burst */}
      <ConfettiBurst trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Top Bar: Thick black-bordered strip */}
      <header className="border-b-[3px] border-black bg-white px-5 py-3 sticky top-0 z-50 shadow-[0_4px_0_#000]">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo as chunky yellow #FFD60A block with bolt mascot icon */}
          <div className="flex items-center space-x-3">
            <div className="bg-[#FFD60A] border-[3px] border-black rounded-[4px] px-3 py-1.5 shadow-[4px_4px_0_#000] flex items-center space-x-2 -rotate-1 hover:rotate-0 transition-transform">
              <div className="w-6 h-6 rounded-[3px] bg-black text-[#FFD60A] flex items-center justify-center">
                <Zap className="w-4 h-4 fill-[#FFD60A]" />
              </div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight uppercase text-black font-['Space_Grotesk',sans-serif]">
                CAMPUSMIND
              </span>
            </div>

            <div className="hidden sm:block">
              <div className="flex items-center space-x-2">
                <NeoBadge variant="pink" tilt="right">
                  DIGITAL TWIN
                </NeoBadge>
                <span className="text-[11px] font-mono font-bold bg-[#FFF4E0] border border-black px-1.5 py-0.5 rounded-[2px]">
                  PS-04 SUSTAINABLE TECH
                </span>
              </div>
              <p className="text-[10px] font-mono font-bold text-neutral-600 mt-0.5">
                COUNTERFACTUAL TWIN • AGENT NEGOTIATION • LP SOLVER
              </p>
            </div>
          </div>

          {/* Sim Clock in Space Mono inside a black pill with mint text */}
          <div className="flex items-center space-x-2 bg-white border-[3px] border-black rounded-[4px] p-1.5 shadow-[4px_4px_0_#000]">
            {/* Black Pill with Mint Space Mono Clock */}
            <div className="flex items-center space-x-1.5 bg-black text-[#06D6A0] font-mono font-bold text-xs px-3 py-1 rounded-full border-2 border-black shadow-[2px_2px_0_#000]">
              <Clock className="w-3.5 h-3.5 text-[#06D6A0]" />
              <span>{formatSimTime(clock.sim_time)}</span>
            </div>

            {/* Play / Pause Neo Button */}
            <button
              onClick={handlePlayPause}
              className={`p-1.5 border-2 border-black rounded-[3px] font-bold transition-all duration-100 ${
                clock.is_paused
                  ? 'bg-[#06D6A0] text-black shadow-[2px_2px_0_#000] hover:bg-[#1CE5B1]'
                  : 'bg-[#FFD60A] text-black shadow-[2px_2px_0_#000] hover:bg-[#FFE047]'
              }`}
              title={clock.is_paused ? 'Play simulation' : 'Pause simulation'}
            >
              {clock.is_paused ? <Play className="w-3.5 h-3.5 fill-black" /> : <Pause className="w-3.5 h-3.5 fill-black" />}
            </button>

            {/* Speeds */}
            <div className="flex items-center space-x-1 font-mono text-[11px] font-bold">
              {[1, 2, 4, 8].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-1.5 py-0.5 border border-black rounded-[2px] transition-all ${
                    clock.speed === s
                      ? 'bg-[#FF4D8D] text-black font-extrabold shadow-[2px_2px_0_#000]'
                      : 'bg-white text-black hover:bg-[#FFF4E0]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Quick Jumps */}
            <div className="hidden lg:flex items-center space-x-1 pl-2 border-l-2 border-black text-[10px] font-mono font-bold">
              <span>JUMP:</span>
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
              <button
                onClick={() => handleJumpTime('2026-10-12T23:00:00')}
                className="px-1.5 py-0.5 bg-[#3A86FF] text-white border border-black rounded-[2px] hover:shadow-[1px_1px_0_#000]"
              >
                NIGHT
              </button>
            </div>
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center space-x-2 text-xs">
            {/* 3-Minute Demo quick trigger */}
            <NeoButton
              variant="pink"
              size="sm"
              onClick={handleRunDemoScript}
              className="flex items-center space-x-1 py-1"
              title="Execute 3-minute hackathon demo script sequence"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>3-MIN DEMO</span>
            </NeoButton>

            {/* Auto-Approve Toggle */}
            <NeoButton
              variant={config.auto_approve ? 'mint' : 'white'}
              size="sm"
              isPressed={config.auto_approve}
              onClick={handleAutoApproveToggle}
              className="flex items-center space-x-1 py-1 font-mono text-[11px]"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AUTO-APP: {config.auto_approve ? 'ON' : 'OFF'}</span>
            </NeoButton>

            {/* LLM Mode Badge */}
            <NeoBadge variant="lilac">
              LLM: {config.llm_mode.toUpperCase()}
            </NeoBadge>

            {/* Live WS Status */}
            <div className={`px-2 py-0.5 border-2 border-black rounded-[3px] shadow-[2px_2px_0_#000] font-mono text-[10px] font-bold flex items-center space-x-1.5 ${isConnected ? 'bg-[#06D6A0] text-black' : 'bg-[#FF3B30] text-white'}`}>
              <span className={`w-2 h-2 rounded-full border border-black ${isConnected ? 'bg-black animate-ping' : 'bg-white'}`} />
              <span>{isConnected ? 'LIVE' : 'DISCONNECTED'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 p-4 sm:p-5 space-y-4 max-w-[1720px] mx-auto w-full">
        {/* Top Section: 3 Columns Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch min-h-[520px]">
          {/* Left: 2D Campus SVG Twin (5 cols) */}
          <div className="xl:col-span-5 h-full">
            {baseline && managed && (
              <CampusMap
                baselineState={baseline}
                managedState={managed}
                activeDeals={pendingDeals}
                isNegotiating={isNegotiating}
              />
            )}
          </div>

          {/* Middle: Agent Negotiation Feed & Pending Deal Cards (4 cols) */}
          <div className="xl:col-span-4 h-full flex flex-col space-y-3">
            {/* Pending Deal Cards with Approve / Reject pair */}
            {pendingDeals.length > 0 && (
              <div className="space-y-3">
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

            {/* Negotiation Feed Chat */}
            <div className="flex-1 min-h-[360px]">
              <NegotiationFeed messages={feedMessages} />
            </div>
          </div>

          {/* Right: Impact Ledger & Counterfactual Time-Series (3 cols) */}
          <div className="xl:col-span-3 h-full">
            <LedgerPanel
              metrics={ledger}
              history={history}
              gridCapKw={config.grid_cap_kw || 850}
              onReset={handleResetSim}
            />
          </div>
        </div>

        {/* Chaos Buttons Panel (The Star!) */}
        <ChaosPanel
          activeScenarios={scenarios}
          onTrigger={handleChaosTrigger}
        />

        {/* Lower Inspector Tabs: Forecast, Anomalies, Audit, BMS Output */}
        <div className="bg-white border-[3px] border-black rounded-[4px] shadow-[6px_6px_0_#000] p-4">
          {/* Neo-Brutalist Tabs: thick bordered tab shapes, active tab filled yellow and lifted */}
          <div className="flex flex-wrap items-center gap-2 border-b-[3px] border-black pb-3 mb-4">
            <button
              onClick={() => setActiveTab('forecast')}
              className={`px-3 py-1.5 border-[3px] border-black rounded-[4px] font-['Space_Grotesk',sans-serif] font-extrabold text-xs uppercase flex items-center space-x-1.5 transition-all duration-100 ${
                activeTab === 'forecast'
                  ? 'bg-[#FFD60A] text-black -translate-y-1 shadow-[4px_4px_0_#000]'
                  : 'bg-white text-black hover:bg-[#FFF4E0] shadow-[2px_2px_0_#000]'
              }`}
            >
              <LineChartIcon className="w-4 h-4" />
              <span>24H LOAD FORECAST</span>
            </button>

            <button
              onClick={() => setActiveTab('anomalies')}
              className={`px-3 py-1.5 border-[3px] border-black rounded-[4px] font-['Space_Grotesk',sans-serif] font-extrabold text-xs uppercase flex items-center space-x-1.5 transition-all duration-100 ${
                activeTab === 'anomalies'
                  ? 'bg-[#FFD60A] text-black -translate-y-1 shadow-[4px_4px_0_#000]'
                  : 'bg-white text-black hover:bg-[#FFF4E0] shadow-[2px_2px_0_#000]'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-black" />
              <span>ANOMALIES & LEAKS ({anomalies.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 border-[3px] border-black rounded-[4px] font-['Space_Grotesk',sans-serif] font-extrabold text-xs uppercase flex items-center space-x-1.5 transition-all duration-100 ${
                activeTab === 'audit'
                  ? 'bg-[#FFD60A] text-black -translate-y-1 shadow-[4px_4px_0_#000]'
                  : 'bg-white text-black hover:bg-[#FFF4E0] shadow-[2px_2px_0_#000]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>AUDIT TRAIL</span>
            </button>

            <button
              onClick={() => setActiveTab('bms')}
              className={`px-3 py-1.5 border-[3px] border-black rounded-[4px] font-['Space_Grotesk',sans-serif] font-extrabold text-xs uppercase flex items-center space-x-1.5 transition-all duration-100 ${
                activeTab === 'bms'
                  ? 'bg-[#FFD60A] text-black -translate-y-1 shadow-[4px_4px_0_#000]'
                  : 'bg-white text-black hover:bg-[#FFF4E0] shadow-[2px_2px_0_#000]'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>BMS / MQTT OUTBOX</span>
            </button>
          </div>

          <div>
            {activeTab === 'forecast' && <ForecastTab gridCapKw={config.grid_cap_kw || 850} />}
            {activeTab === 'anomalies' && <AnomaliesTab anomalies={anomalies} />}
            {activeTab === 'audit' && <AuditTab />}
            {activeTab === 'bms' && <BmsOutputTab />}
          </div>
        </div>
      </main>

      {/* Footer with Mandated Disclosures in Neo-Brutalist Strip */}
      <footer className="border-t-[3px] border-black bg-white py-3 px-6 text-[11px] font-mono font-bold text-black flex flex-col sm:flex-row items-center justify-between gap-2 shadow-[0_-2px_0_#000]">
        <div>
          DATA: SIMULATED • SEEDED WITH OPEN-METEO INDORE (22.7°N, 75.8°E) • TARIFFS & EMISSIONS: STANDARD MPSERC DEFAULTS
        </div>
        <div className="flex items-center space-x-3">
          <span className="bg-[#FFD60A] px-1.5 py-0.5 rounded-[2px] border border-black">
            LLM: GEMINI 1.5 FLASH (OFFLINE MOCK ACTIVE)
          </span>
          <span>•</span>
          <span className="bg-[#06D6A0] px-1.5 py-0.5 rounded-[2px] border border-black">
            FASTAPI + LIGHTGBM + SCIKIT-LEARN + REACT
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
