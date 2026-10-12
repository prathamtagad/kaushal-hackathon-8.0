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
import {
  Play, Pause, FastForward, RotateCcw, Clock, ShieldCheck,
  CheckCircle2, AlertTriangle, Cpu, Radio, Sparkles, Building2,
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
      .then(d => {
        setPendingDeals(prev => prev.filter(deal => deal.deal_id !== dealId));
      });
  };

  const handleRejectDeal = (dealId: string) => {
    fetch(`/api/deals/${dealId}/reject`, { method: 'POST' })
      .then(res => res.json())
      .then(d => {
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
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-['Inter',sans-serif]">
      {/* Top Bar */}
      <header className="border-b border-gray-800 bg-[#0E1424]/90 backdrop-blur-md px-5 py-3 sticky top-0 z-50 flex items-center justify-between">
        {/* Brand & One-liner */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Building2 className="w-5 h-5 text-gray-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-white">CampusMind</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Digital Twin
              </span>
              <span className="text-[10px] text-gray-500 hidden md:inline">PS-04 Sustainable Tech</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Counterfactual campus twin • AI agent negotiation • Math solver verification
            </p>
          </div>
        </div>

        {/* Sim Clock & Time Controls */}
        <div className="flex items-center space-x-3 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-800 text-xs">
          <div className="flex items-center space-x-1.5 font-mono text-emerald-300 font-semibold pr-2 border-r border-gray-700">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{formatSimTime(clock.sim_time)}</span>
          </div>

          {/* Play / Pause */}
          <button
            onClick={handlePlayPause}
            className={`p-1.5 rounded-lg transition-all ${
              clock.is_paused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-amber-300'
            }`}
            title={clock.is_paused ? 'Play simulation' : 'Pause simulation'}
          >
            {clock.is_paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Speeds */}
          <div className="flex items-center space-x-1 font-mono text-[11px]">
            {[1, 2, 4, 8].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-1.5 py-0.5 rounded ${
                  clock.speed === s
                    ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/50'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Jump-To Quick Times */}
          <div className="hidden lg:flex items-center space-x-1 pl-2 border-l border-gray-700 text-[10px] text-gray-400 font-mono">
            <span>Jump:</span>
            <button
              onClick={() => handleJumpTime('2026-10-12T12:00:00')}
              className="hover:text-emerald-300 px-1 py-0.5 rounded bg-gray-800"
            >
              Noon
            </button>
            <button
              onClick={() => handleJumpTime('2026-10-12T19:00:00')}
              className="hover:text-amber-300 px-1 py-0.5 rounded bg-gray-800"
            >
              Peak
            </button>
            <button
              onClick={() => handleJumpTime('2026-10-12T23:00:00')}
              className="hover:text-blue-300 px-1 py-0.5 rounded bg-gray-800"
            >
              Night
            </button>
          </div>
        </div>

        {/* Right Status Controls */}
        <div className="flex items-center space-x-3 text-xs">
          {/* Demo script quick trigger */}
          <button
            onClick={handleRunDemoScript}
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold text-[11px] shadow-sm transition-all"
            title="Execute 3-minute hackathon demo script sequence"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>3-Min Demo</span>
          </button>

          {/* Auto-Approve Toggle */}
          <button
            onClick={handleAutoApproveToggle}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all ${
              config.auto_approve
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AUTO-APPROVE: {config.auto_approve ? 'ON' : 'OFF'}</span>
          </button>

          {/* Offline / LLM Mode Badge */}
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-gray-900 border border-gray-800 text-[10px] font-mono text-gray-400">
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span>LLM: {config.llm_mode.toUpperCase()}</span>
          </div>

          {/* Live WS Status */}
          <div className="flex items-center space-x-1 text-[10px] font-mono text-gray-400">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span>{isConnected ? 'LIVE' : 'DISCONNECTED'}</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 p-5 space-y-4 max-w-[1720px] mx-auto w-full">
        {/* Top Section: 3 Columns Layout */}
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
            {/* Pending Deal Alert Cards if any exist */}
            {pendingDeals.length > 0 && (
              <div className="space-y-2">
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

        {/* Chaos Buttons Panel */}
        <ChaosPanel
          activeScenarios={scenarios}
          onTrigger={handleChaosTrigger}
        />

        {/* Lower Inspector Tabs: Forecast, Anomalies, Audit, BMS Output */}
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-2 mb-4">
            <button
              onClick={() => setActiveTab('forecast')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'forecast'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>24h Load Forecast</span>
            </button>

            <button
              onClick={() => setActiveTab('anomalies')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'anomalies'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Anomalies & Leaks ({anomalies.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'audit'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Audit Log</span>
            </button>

            <button
              onClick={() => setActiveTab('bms')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'bms'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>BMS / MQTT Outbox</span>
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

      {/* Footer with Mandated Disclosures */}
      <footer className="border-t border-gray-800 bg-[#0A0D16] py-3 px-6 text-[11px] text-gray-500 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <div>
          Data: simulated, seeded with Open-Meteo weather for Indore (22.7°N, 75.8°E). Tariffs & emissions: assumed defaults.
        </div>
        <div className="flex items-center space-x-4">
          <span>LLM Provider: Gemini 1.5 Flash (Offline Mock fallback active)</span>
          <span>•</span>
          <span>FastAPI + LightGBM + scikit-learn + React</span>
        </div>
      </footer>
    </div>
  );
};
export default App;
