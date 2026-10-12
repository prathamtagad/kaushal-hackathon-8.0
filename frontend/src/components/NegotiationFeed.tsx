import React, { useRef, useEffect, useState } from 'react';
import { FeedMessage } from '../types';
import { MessageSquare, Bot, Cpu, User, Scale, AlertTriangle, ArrowRight } from 'lucide-react';
import { NeoCard } from './ui/NeoCard';
import { NeoBadge, NeoBadgeVariant } from './ui/NeoBadge';

interface NegotiationFeedProps {
  messages: FeedMessage[];
}

export const NegotiationFeed: React.FC<NegotiationFeedProps> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isHovered && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isHovered]);

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
      title="AGENT NEGOTIATION FEED"
      subtitle="MULTI-AGENT CHAT & PROTOCOL"
      headerColor="blue"
      tag={`${messages.length} MSGS`}
      tagColor="yellow"
      icon={<MessageSquare className="w-5 h-5 text-white" />}
      className="h-full"
      bodyClassName="p-3 flex flex-col justify-between"
    >
      {/* Scrollable Chat Stream */}
      <div
        ref={scrollRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[300px] max-h-[500px]"
      >
        {messages.length === 0 ? (
          <div className="h-full min-h-[240px] flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-black rounded-[4px] bg-[#FFF8ED]">
            <div className="w-12 h-12 rounded-[4px] bg-[#FFD60A] border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-black" />
            </div>
            <div className="font-extrabold text-sm uppercase">NO ACTIVE NEGOTIATIONS</div>
            <div className="text-[11px] font-mono text-neutral-600 mt-1 max-w-xs">
              Simulate peak hours or trigger a chaos injection above to see agents haggle shed levers!
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const theme = getAgentTheme(msg.sender);
            const Icon = theme.icon;
            const kindMeta = getKindBadgeVariant(msg.kind);
            const isExpanded = expandedId === msg.id;

            return (
              <div
                key={msg.id || index}
                className="bg-white border-[3px] border-black rounded-[4px] shadow-[4px_4px_0_#000] p-3 text-xs animate-neo-slide-in relative overflow-hidden"
              >
                {/* Agent Header Banner */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-black">
                  <div className="flex items-center space-x-2">
                    {/* Square Avatar with thick border */}
                    <div className={`w-7 h-7 rounded-[3px] ${theme.avatarBg} border-2 border-black flex items-center justify-center shadow-[1px_1px_0_#000] flex-shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="font-extrabold uppercase tracking-tight text-xs">
                        {msg.sender}
                      </span>
                      <ArrowRight className="w-3 h-3 text-black" />
                      <span className="font-mono text-[10px] bg-[#FFF4E0] border border-black px-1.5 py-0.5 rounded-[2px] font-bold uppercase">
                        {msg.recipient}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    {/* Kind chip as tilted sticker */}
                    <NeoBadge variant={kindMeta.variant} tilt={kindMeta.tilt}>
                      {msg.kind}
                    </NeoBadge>
                    {/* Source sticker badge */}
                    <NeoBadge variant={getSourceBadgeVariant(msg.source)}>
                      {msg.source}
                    </NeoBadge>
                  </div>
                </div>

                {/* Message Body Text in Space Mono */}
                <p className="font-mono text-xs text-black leading-relaxed font-semibold">
                  {msg.text}
                </p>

                {/* Inspectable Payload */}
                {msg.payload && (
                  <div className="mt-2 pt-2 border-t border-black">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                      className="text-[10px] font-mono font-bold uppercase bg-[#FFD60A] text-black border border-black px-2 py-0.5 rounded-[2px] shadow-[1px_1px_0_#000] hover:bg-[#FFE047]"
                    >
                      {isExpanded ? '[- HIDE PAYLOAD]' : '[+ INSPECT PAYLOAD]'}
                    </button>
                    {isExpanded && (
                      <pre className="mt-2 p-2.5 rounded-[3px] bg-black text-[#06D6A0] font-mono text-[10px] overflow-x-auto max-h-44 border-2 border-black">
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

      {isHovered && (
        <div className="mt-2 text-center text-[10px] font-mono font-bold bg-[#FFD60A] border border-black py-0.5 rounded-[2px]">
          AUTO-SCROLL PAUSED WHILE HOVERED
        </div>
      )}
    </NeoCard>
  );
};
