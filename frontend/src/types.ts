export interface ZoneState {
  zone_id: string;
  name: string;
  current_load_kw: number;
  critical_kw: number;
  hvac_kw: number;
  lighting_kw: number;
  flexible_kw: number;
  occupancy: number;
  temp_c: number;
  setpoint_offset_c: number;
  headroom_kw: Record<string, number>;
  total_headroom_kw: number;
}

export interface TwinState {
  mode: 'baseline' | 'managed';
  tick: number;
  sim_time: string;
  zones: Record<string, ZoneState>;
  tank_level_kl: number;
  tank_pct: number;
  pump_active: boolean;
  pump_kw: number;
  solar_kw: number;
  total_load_kw: number;
  grid_import_kw: number;
  cumulative_kwh: number;
  cumulative_inr: number;
  cumulative_co2_kg: number;
  cumulative_leak_litres: number;
}

export interface Ask {
  ask_id: string;
  kind: 'peak' | 'shortage' | 'outage' | 'waste_fix' | 'water';
  window_start: string;
  window_end: string;
  required_kw: number;
  predicted_peak_kw: number;
  grid_cap_kw: number;
  context: string[];
}

export interface Allocation {
  zone_id: string;
  lever: string;
  shed_kw: number;
  setpoint_offset_c?: number;
  note: string;
}

export interface Deal {
  deal_id: string;
  ask_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'expired';
  allocations: Allocation[];
  total_shed_kw: number;
  residual_unmet_kw: number;
  est_savings: {
    kwh: number;
    inr: number;
    co2_kg: number;
    litres: number;
  };
  solver: {
    status: string;
    objective: number;
    llm_proposed_total_kw: number;
    adjusted: Array<{
      zone: string;
      from_kw: number;
      to_kw: number;
      reason: string;
    }>;
  };
  used_fallback: boolean;
  created_at: string;
  window_start: string;
  window_end: string;
  summary_reasoning?: string;
}

export interface FeedMessage {
  id: string;
  ts: string;
  sender: string;
  recipient: string;
  kind: 'ask' | 'offer' | 'counter' | 'verify' | 'deal' | 'alert' | 'fallback' | 'system';
  text: string;
  payload?: any;
  source: 'llm' | 'fallback' | 'solver' | 'system';
}

export interface Anomaly {
  anomaly_id: string;
  zone_id?: string;
  kind: 'phantom_load' | 'tank_leak';
  est_waste_kw: number;
  est_leak_kl_per_h: number;
  since: string;
  message: string;
  active: boolean;
}

export interface LedgerMetrics {
  kwh_saved: number;
  inr_saved: number;
  co2_kg_saved: number;
  litres_saved: number;
  peak_kw_reduced: number;
  phantom_kwh_eliminated: number;
}

export interface LedgerHistoryPoint {
  time: string;
  baseline_import_kw: number;
  managed_import_kw: number;
  grid_cap_kw: number;
  p10_inr?: number;
  p50_inr?: number;
  p90_inr?: number;
}

export interface FullStateSnapshot {
  baseline: TwinState;
  managed: TwinState;
  clock: {
    tick: number;
    sim_time: string;
    is_paused: boolean;
    speed: number;
  };
  config: {
    grid_cap_kw: number;
    solar_peak_kw: number;
    auto_approve: boolean;
    llm_mode: string;
    weather_source: string;
    tariff_peak: number;
    tariff_normal: number;
    tariff_offpeak: number;
  };
  scenarios: string[];
  anomalies: Anomaly[];
  pending_deals: Deal[];
  ledger: LedgerMetrics;
}
