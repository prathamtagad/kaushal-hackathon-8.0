import React, { useRef, useEffect, useState } from 'react';
import { FeedMessage } from '../types';
import { MessageSquare, Bot, Cpu, User, Scale, AlertTriangle, ArrowRight, Filter, Sparkles, CheckCircle2 } from 'lucide-react';
import { NeoCard } from './ui/NeoCard';
import { NeoBadge, NeoBadgeVariant } from './ui/NeoBadge';
import { NeoButton } from './ui/NeoButton';

interface NegotiationFeedProps {
  messages: FeedMessage[];
  onTriggerDemo?: () => void;
  onTriggerPeak?: () => void;
}

export const NegotiationFeed: React.FC<NegotiationFeedProps> = ({
  messages,
  onTriggerDemo,
  onTriggerPeak,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'deals' | 'offers' | 'alerts'>('all');

  useEffect(() => {
    if (!isHovered && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isHovered]);

  const filteredMessages = messages.filter((msg) => {
    if (filter === 'all') return true;
    if (filter === 'deals') return msg.kind === 'deal' || msg.kind === 'verify';
    if (filter === 'offers') return msg.kind === 'offer' || msg.kind === 'counter' || msg.kind === 'ask';
    if (filter === 'alerts') return msg.kind === 'alert' || msg.kind === 'fallback';
    return true;
  });

  const getAgentTheme = (sender: string) => {
    const s = sender.toLowerCase();
    if (s.includes('grid')) return { bg: 'bg-[#06D6A0]', avatarBg: 'bg-black text-[#06D6A0]', icon: Bot, name: 'GRID AGENT' };
    if (s.includes('hostel')) return { bg: 'bg-[#FFD60A]', avatarBg: 'bg-black text-[#FFD60A]', icon: Bot, name: 'HOSTEL AGENT' };
    if (s.includes('library')) return { bg: 'bg-[#3A86FF]', avatarBg: 'bg-black text-[#3A86FF]', icon: Bot, name: 'LIBRARY AGENT' };
    if (s.includes('labs')) return { bg: 'bg-[#B388FF]', avatarBg: 'bg-black text-[#B388FF]', icon: Cpu, name: 'LABS AGENT' };
    if (s.includes('admin')) return { bg: 'bg-[#FF7B00]', avatarBg: 'bg-black text-[#FF7B00]', icon: Bot, name: 'ADMIN AGENT' };
    if (s.includes('water')) return { bg: 'bg-[#06D6A0]', avatarBg: 'bg-black text-[#06D6A0]', icon: Bot, name: 'WATER AGENT' };
    if (s.includes('solver')) return { bg: 'bg-[#FF4D8D]', avatarBg: 'bg-black text-[#FF4D8D]', icon: Scale, name: 'SOLVER ORACLE' };
    if (s.includes('facility') || s.includes('human')) return { bg: 'bg-[#FF3B30]', avatarBg: 'bg-black text-[#FF3B30]', icon: User, name: 'FACILITY MGR' };
    return { bg: 'bg-[#FFF4E0]', avatarBg: 'bg-black text-white', icon: MessageSquare, name: sender };
  };

  const getKindBadgeVariant = (kind: string): { variant: NeoBadgeVariant; tilt: 'left' | 'right' | 'none' } => {
    switch (kind) {
      case 'ask': return { variant: 'orange', tilt: 'left' };
      case 'offer': return { variant: 'blue', tilt: 'right' };
      case 'counter': return { variant: 'yellow', tilt: 'left' };
      case 'verify': return { variant: 'mint', tilt: 'right' };
      case 'deal': return { variant: 'pink', tilt: 'none' };
      case 'alert': return { variant: 'red', tilt: 'left' };
      default: return { variant: 'white', tilt: 'none' };
    }
  };

  const getSourceBadgeVariant = (source: string): NeoBadgeVariant => {
    switch (source) {
      case 'solver': return 'pink';
      case 'fallback': return 'yellow';
      default: return 'mint'; // llm
    }
  };

  return (
    <NeoCard
      title="AGENT NEGOTIATION STREAM"
      subtitle="MULTI-AGENT DECENTRALIZED PROTOCOL"
      headerColor="blue"
      tag={messages.length > 0 ? `${messages.length} MSGS` : 'STANDBY'}
      tagColor={messages.length > 0 ? 'yellow' : 'mint'}
      icon={<MessageSquare className="w-5 h-5 text-white" />}
      headerAction={
        messages.length > 0 ? (
          <div className="flex items-center space-x-1">
            {(['all', 'deals', 'offers', 'alerts'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 border border-black rounded-[2px] transition-all ${
                  filter === tab ? 'bg-black text-[#FFD60A] shadow-[1px_1px_0_#000]' : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        ) : undefined
      }
      className="h-full"
      bodyClassName="p-3 flex flex-col justify-between"
    >
      {/* Messages Stream */}
      <div
        ref={scrollRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[280px] max-h-[460px]"
      >
        {messages.length === 0 ? (
          <div className="h-full min-h-[240px] flex flex-col items-center justify-center p-5 text-center border-2 border-dashed border-black rounded-[4px] bg-[#FFF8ED]">
            <div className="w-10 h-10 rounded-[3px] bg-[#06D6A0] border-2 border-black shadow-[3px_3px_0_#000] flex items-center justify-center mb-2.5">
              <CheckCircle2 className="w-5 h-5 text-black" />
            </div>
            <div className="font-extrabold text-xs uppercase tracking-tight">AGENT NETWORK IN EQUILIBRIUM</div>
            <p className="text-[11px] font-mono text-neutral-600 mt-1 max-w-xs leading-normal">
              Grid import remains within 850 kW limit. 5 zone agents stand ready to negotiate load-shedding if peak strain occurs.
            </p>
            <div className="mt-3 flex items-center space-x-2">
              {onTriggerDemo && (
                <NeoButton variant="pink" size="sm" onClick={onTriggerDemo} className="text-[10px] py-1">
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Trigger 3-Min Demo
                </NeoButton>
              )}
            </div>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const theme = getAgentTheme(msg.sender);
            const Icon = theme.icon;
            const kindMeta = getKindBadgeVariant(msg.kind);
            const isExpanded = expandedId === msg.id;

            return (
              <div
                key={msg.id || index}
                className="bg-white border-2 border-black rounded-[4px] shadow-[3px_3px_0_#000] p-2.5 text-xs animate-neo-slide-in relative overflow-hidden"
              >
                {/* Agent Header */}
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-black">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-[2px] ${theme.avatarBg} border-2 border-black flex items-center justify-center shadow-[1px_1px_0_#000] flex-shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-extrabold uppercase tracking-tight text-[11px]">
                        {msg.sender}
                      </span>
                      <ArrowRight className="w-3 h-3 text-black" />
                      <span className="font-mono text-[9px] bg-[#FFF4E0] border border-black px-1.5 py-0.5 rounded-[2px] font-bold uppercase">
                        {msg.recipient}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <NeoBadge variant={kindMeta.variant} tilt={kindMeta.tilt}>
                      {msg.kind}
                    </NeoBadge>
                    <NeoBadge variant={getSourceBadgeVariant(msg.source)}>
                      {msg.source}
                    </NeoBadge>
                  </div>
                </div>

                {/* Message Body Text */}
                <p className="font-mono text-[11px] text-black leading-relaxed font-semibold">
                  {msg.text}
                </p>

                {/* Expandable Payload */}
                {msg.payload && (
                  <div className="mt-1.5 pt-1.5 border-t border-neutral-200">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                      className="text-[9px] font-mono font-bold uppercase bg-[#FFD60A] text-black border border-black px-1.5 py-0.5 rounded-[2px] shadow-[1px_1px_0_#000] hover:bg-[#FFE047]"
                    >
                      {isExpanded ? '[- HIDE PAYLOAD]' : '[+ INSPECT DATA]'}
                    </button>
                    {isExpanded && (
                      <pre className="mt-1.5 p-2 rounded-[2px] bg-black text-[#06D6A0] font-mono text-[9px] overflow-x-auto max-h-36 border border-black">
                        {JSON.stringify(msg.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isHovered && messages.length > 0 && (
        <div className="mt-1.5 text-center text-[9px] font-mono font-bold bg-[#FFD60A] border border-black py-0.5 rounded-[2px]">
          AUTO-SCROLL PAUSED WHILE HOVERED
        </div>
      )}
    </NeoCard>
  );
};
