import React, { useState } from 'react';
import { Deal } from '../types';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Scale, Zap, IndianRupee, Leaf, Droplet, Clock } from 'lucide-react';

interface DealCardProps {
  deal: Deal;
  onApprove: (dealId: string) => void;
  onReject: (dealId: string) => void;
}

export const DealCard: React.FC<DealCardProps> = ({ deal, onApprove, onReject }) => {
  const [expanded, setExpanded] = useState(false);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'approved': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'applied': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'rejected': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'expired': return 'bg-gray-700/30 text-gray-400 border-gray-600';
      default: return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  return (
    <div className="glass-panel rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-all text-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Scale className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-gray-200 font-mono">{deal.deal_id}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border ${getStatusBadge(deal.status)}`}>
            {deal.status}
          </span>
        </div>
        <div className="flex items-center space-x-1 text-gray-400 text-[11px] font-mono">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          <span>{deal.window_start ? new Date(deal.window_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</span>
        </div>
      </div>

      {/* Summary message */}
      <div className="text-gray-300 text-xs mb-3">
        {deal.summary_reasoning || `Co-optimised deal allocating ${deal.total_shed_kw} kW shedding across campus.`}
      </div>

      {/* Savings counters row */}
      <div className="grid grid-cols-4 gap-2 mb-3 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800/80">
        <div className="text-center">
          <div className="text-[10px] text-gray-400 flex items-center justify-center space-x-0.5">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Power</span>
          </div>
          <div className="text-sm font-bold text-amber-300 font-mono">
            {deal.total_shed_kw} <span className="text-[10px] font-normal">kW</span>
          </div>
        </div>

        <div className="text-center">
          <div className="text-[10px] text-gray-400 flex items-center justify-center space-x-0.5">
            <IndianRupee className="w-3 h-3 text-emerald-400" />
            <span>Estimated</span>
          </div>
          <div className="text-sm font-bold text-emerald-300 font-mono">
            ₹{formatINR(deal.est_savings?.inr || 0)}
          </div>
        </div>

        <div className="text-center">
          <div className="text-[10px] text-gray-400 flex items-center justify-center space-x-0.5">
            <Leaf className="w-3 h-3 text-green-400" />
            <span>CO₂ Avoided</span>
          </div>
          <div className="text-sm font-bold text-green-300 font-mono">
            {deal.est_savings?.co2_kg || 0} <span className="text-[10px] font-normal">kg</span>
          </div>
        </div>

        <div className="text-center">
          <div className="text-[10px] text-gray-400 flex items-center justify-center space-x-0.5">
            <Droplet className="w-3 h-3 text-blue-400" />
            <span>Water</span>
          </div>
          <div className="text-sm font-bold text-blue-300 font-mono">
            {deal.est_savings?.litres || 0} <span className="text-[10px] font-normal">L</span>
          </div>
        </div>
      </div>

      {/* Allocations breakdown table */}
      <div className="space-y-1.5 mb-3">
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Lever Allocations ({deal.allocations?.length || 0})
        </div>
        <div className="divide-y divide-gray-800/80 bg-gray-900/40 rounded-lg border border-gray-800/60 overflow-hidden">
          {deal.allocations?.map((alloc, idx) => (
            <div key={idx} className="flex items-center justify-between px-2.5 py-1.5 text-[11px]">
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-gray-200 capitalize">{alloc.zone_id}</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400 font-mono uppercase text-[10px] bg-gray-800 px-1 rounded">
                  {alloc.lever}
                </span>
                {alloc.setpoint_offset_c && (
                  <span className="text-amber-400 text-[10px]">+{alloc.setpoint_offset_c}°C</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-[10px] truncate max-w-[150px]">{alloc.note}</span>
                <span className="font-mono font-bold text-emerald-400">{alloc.shed_kw} kW</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Solver Diff & Verification (Expandable) */}
      <div className="border-t border-gray-800/80 pt-2 mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left text-gray-400 hover:text-gray-200"
        >
          <span className="font-semibold text-[11px] text-teal-400 flex items-center space-x-1">
            <Scale className="w-3 h-3 text-teal-400" />
            <span>Solver Verification & Math Diff</span>
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {expanded && (
          <div className="mt-2 p-2.5 rounded-lg bg-black/50 border border-teal-500/30 space-y-2 text-[11px]">
            <div className="flex justify-between text-gray-300">
              <span>Solver Status:</span>
              <span className="font-mono text-teal-300 font-bold uppercase">{deal.solver?.status || 'OPTIMAL'}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>LLM Proposed Total:</span>
              <span className="font-mono text-amber-300">{deal.solver?.llm_proposed_total_kw || deal.total_shed_kw} kW</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Solver Approved Total:</span>
              <span className="font-mono text-emerald-300 font-bold">{deal.total_shed_kw} kW</span>
            </div>

            {deal.solver?.adjusted && deal.solver.adjusted.length > 0 && (
              <div className="pt-2 border-t border-gray-800 space-y-1">
                <div className="text-amber-400 font-semibold text-[10px]">Adjustments & Clamped Constraints:</div>
                {deal.solver.adjusted.map((adj, i) => (
                  <div key={i} className="text-[10px] text-gray-300 bg-gray-900/80 p-1.5 rounded border border-gray-800">
                    <span className="font-bold text-amber-300 capitalize">{adj.zone}</span>: {adj.from_kw} kW → <span className="font-bold text-emerald-300">{adj.to_kw} kW</span>
                    <div className="text-gray-400 italic text-[9px] mt-0.5">{adj.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* HITL Approve / Reject Buttons if Pending */}
      {deal.status === 'pending' && (
        <div className="flex items-center space-x-2 pt-1 border-t border-gray-800">
          <button
            onClick={() => onApprove(deal.deal_id)}
            className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-emerald-900/20"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve & Apply to BMS</span>
          </button>
          <button
            onClick={() => onReject(deal.deal_id)}
            className="py-1.5 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-300 font-semibold flex items-center justify-center space-x-1.5 transition-all"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>
        </div>
      )}
    </div>
  );
};
