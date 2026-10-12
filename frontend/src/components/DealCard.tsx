import React, { useState } from 'react';
import { Deal } from '../types';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Scale, Zap, IndianRupee, Leaf, Droplet, Clock } from 'lucide-react';
import { NeoButton } from './ui/NeoButton';
import { NeoBadge } from './ui/NeoBadge';

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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'approved': return 'mint';
      case 'applied': return 'blue';
      case 'rejected': return 'pink';
      default: return 'white';
    }
  };

  return (
    <div className="bg-white border-[3px] border-black rounded-[4px] shadow-[6px_6px_0_#000] p-3.5 text-xs font-['Space_Grotesk',sans-serif] animate-neo-pop">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b-2 border-black">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-[3px] bg-[#FFD60A] border-2 border-black flex items-center justify-center">
            <Scale className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="font-extrabold text-sm uppercase tracking-tight font-mono">{deal.deal_id}</span>
          <NeoBadge variant={getStatusBadgeVariant(deal.status) as any} tilt="right">
            {deal.status}
          </NeoBadge>
        </div>
        <div className="flex items-center space-x-1 font-mono text-[11px] font-bold bg-[#FFF4E0] border border-black px-2 py-0.5 rounded-[2px]">
          <Clock className="w-3 h-3 text-black" />
          <span>{deal.window_start ? new Date(deal.window_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NOW'}</span>
        </div>
      </div>

      {/* Summary message */}
      <div className="text-black text-xs font-semibold mb-3 leading-snug">
        {deal.summary_reasoning || `Co-optimised deal allocating ${deal.total_shed_kw} kW shedding across campus.`}
      </div>

      {/* 4 Savings counters row in Neo-Brutalist boxes */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-[#FFD60A] border-2 border-black rounded-[3px] p-2 text-center shadow-[2px_2px_0_#000]">
          <div className="text-[9px] font-extrabold uppercase flex items-center justify-center space-x-0.5">
            <Zap className="w-3 h-3 text-black" />
            <span>Power</span>
          </div>
          <div className="text-sm font-extrabold font-mono text-black mt-0.5">
            {deal.total_shed_kw} <span className="text-[9px] font-normal">kW</span>
          </div>
        </div>

        <div className="bg-[#06D6A0] border-2 border-black rounded-[3px] p-2 text-center shadow-[2px_2px_0_#000]">
          <div className="text-[9px] font-extrabold uppercase flex items-center justify-center space-x-0.5">
            <IndianRupee className="w-3 h-3 text-black" />
            <span>Tariff</span>
          </div>
          <div className="text-sm font-extrabold font-mono text-black mt-0.5">
            ₹{formatINR(deal.est_savings?.inr || 0)}
          </div>
        </div>

        <div className="bg-[#FF4D8D] border-2 border-black rounded-[3px] p-2 text-center shadow-[2px_2px_0_#000]">
          <div className="text-[9px] font-extrabold uppercase flex items-center justify-center space-x-0.5">
            <Leaf className="w-3 h-3 text-black" />
            <span>CO₂ Avoid</span>
          </div>
          <div className="text-sm font-extrabold font-mono text-black mt-0.5">
            {deal.est_savings?.co2_kg || 0} <span className="text-[9px] font-normal">kg</span>
          </div>
        </div>

        <div className="bg-[#3A86FF] text-white border-2 border-black rounded-[3px] p-2 text-center shadow-[2px_2px_0_#000]">
          <div className="text-[9px] font-extrabold uppercase flex items-center justify-center space-x-0.5 text-white">
            <Droplet className="w-3 h-3 text-white" />
            <span>Water</span>
          </div>
          <div className="text-sm font-extrabold font-mono text-white mt-0.5">
            {deal.est_savings?.litres || 0} <span className="text-[9px] font-normal text-white">L</span>
          </div>
        </div>
      </div>

      {/* Allocations breakdown table */}
      <div className="space-y-1.5 mb-3">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-black">
          LEVER ALLOCATIONS ({deal.allocations?.length || 0})
        </div>
        <div className="border-2 border-black rounded-[3px] overflow-hidden divide-y-2 divide-black bg-[#FFFDF9]">
          {deal.allocations?.map((alloc, idx) => (
            <div key={idx} className="flex items-center justify-between px-2.5 py-1.5 text-[11px]">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-black uppercase">{alloc.zone_id}</span>
                <span className="text-black font-bold">•</span>
                <span className="font-mono font-bold uppercase text-[10px] bg-[#FFF4E0] border border-black px-1 rounded-[2px]">
                  {alloc.lever}
                </span>
                {alloc.setpoint_offset_c && (
                  <span className="font-mono font-bold text-[10px] bg-[#FFD60A] border border-black px-1 rounded-[2px]">
                    +{alloc.setpoint_offset_c}°C
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-neutral-600 truncate max-w-[130px] font-medium">{alloc.note}</span>
                <span className="font-mono font-bold text-black bg-[#06D6A0] border border-black px-1.5 py-0.5 rounded-[2px]">
                  {alloc.shed_kw} kW
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Solver Diff & Verification: YELLOW HIGHLIGHTED BOX in Space Mono */}
      <div className="mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left font-extrabold text-[11px] uppercase bg-[#FFF4E0] hover:bg-[#FFE9C2] p-2 border-2 border-black rounded-[3px] transition-colors"
        >
          <span className="flex items-center space-x-1.5">
            <Scale className="w-3.5 h-3.5 text-black" />
            <span>SOLVER MATH VERIFICATION DIFF</span>
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-black" /> : <ChevronDown className="w-4 h-4 text-black" />}
        </button>

        {expanded && (
          <div className="mt-2 p-3 bg-[#FFD60A] text-black border-2 border-black rounded-[3px] shadow-[3px_3px_0_#000] space-y-2 font-mono text-[11px]">
            <div className="flex justify-between border-b border-black pb-1">
              <span className="font-bold">SOLVER STATUS:</span>
              <span className="font-extrabold bg-black text-[#FFD60A] px-1.5 py-0.5 rounded-[2px] uppercase">
                {deal.solver?.status || 'OPTIMAL'}
              </span>
            </div>
            <div className="flex justify-between border-b border-black pb-1">
              <span>LLM PROPOSED TOTAL:</span>
              <span className="font-bold">{deal.solver?.llm_proposed_total_kw || deal.total_shed_kw} kW</span>
            </div>
            <div className="flex justify-between border-b border-black pb-1">
              <span>SOLVER APPROVED TOTAL:</span>
              <span className="font-extrabold text-black bg-white border border-black px-1 rounded-[2px]">
                {deal.total_shed_kw} kW
              </span>
            </div>

            {deal.solver?.adjusted && deal.solver.adjusted.length > 0 && (
              <div className="pt-1 space-y-1">
                <div className="font-extrabold text-[10px] uppercase text-black">
                  CLAMPED CONSTRAINTS & ADJUSTMENTS:
                </div>
                {deal.solver.adjusted.map((adj, i) => (
                  <div key={i} className="text-[10px] bg-white text-black p-1.5 rounded-[2px] border border-black">
                    <span className="font-extrabold uppercase">{adj.zone}</span>: {adj.from_kw} kW → <span className="font-extrabold underline">{adj.to_kw} kW</span>
                    <div className="text-[9px] font-sans italic mt-0.5">{adj.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* HITL Approve / Reject Buttons pair: Large Green APPROVE and Pink REJECT */}
      {deal.status === 'pending' && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-black">
          <NeoButton
            variant="mint"
            size="md"
            onClick={() => onApprove(deal.deal_id)}
            className="w-full flex items-center justify-center space-x-1.5 text-xs py-2"
          >
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span>APPROVE</span>
          </NeoButton>
          <NeoButton
            variant="pink"
            size="md"
            onClick={() => onReject(deal.deal_id)}
            className="w-full flex items-center justify-center space-x-1.5 text-xs py-2"
          >
            <XCircle className="w-4 h-4 text-black" />
            <span>REJECT</span>
          </NeoButton>
        </div>
      )}
    </div>
  );
};
