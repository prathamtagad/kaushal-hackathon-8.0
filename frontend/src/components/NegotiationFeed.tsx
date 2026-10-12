import React, { useRef, useEffect, useState } from 'react';
import { FeedMessage } from '../types';
import { MessageSquare, Bot, AlertTriangle, ShieldCheck, Scale, Cpu, User } from 'lucide-react';

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

  const getSenderBadge = (sender: string) => {
    const s = sender.toLowerCase();
    if (s.includes('grid')) return { bg: 'bg-emerald-950/80', border: 'border-emerald-600', text: 'text-emerald-400', icon: Bot };
    if (s.includes('hostel')) return { bg: 'bg-amber-950/80', border: 'border-amber-600', text: 'text-amber-400', icon: Bot };
    if (s.includes('library')) return { bg: 'bg-blue-950/80', border: 'border-blue-600', text: 'text-blue-400', icon: Bot };
    if (s.includes('labs')) return { bg: 'bg-purple-950/80', border: 'border-purple-600', text: 'text-purple-400', icon: Cpu };
    if (s.includes('admin')) return { bg: 'bg-indigo-950/80', border: 'border-indigo-600', text: 'text-indigo-400', icon: Bot };
    if (s.includes('water')) return { bg: 'bg-cyan-950/80', border: 'border-cyan-600', text: 'text-cyan-400', icon: Bot };
    if (s.includes('solver')) return { bg: 'bg-teal-950/80', border: 'border-teal-500', text: 'text-teal-300', icon: Scale };
    if (s.includes('facility') || s.includes('human')) return { bg: 'bg-rose-950/80', border: 'border-rose-500', text: 'text-rose-300', icon: User };
    return { bg: 'bg-gray-800', border: 'border-gray-600', text: 'text-gray-300', icon: MessageSquare };
  };

  const getKindChip = (kind: string) => {
    switch (kind) {
      case 'ask': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'offer': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'counter': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'verify': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'deal': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'alert': return 'bg-red-500/30 text-red-200 border-red-500/60 animate-pulse';
      default: return 'bg-gray-700/40 text-gray-300 border-gray-600';
    }
  };

  return (
    <div
      className="glass-panel rounded-2xl p-4 flex flex-col h-full overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-semibold tracking-wide text-gray-200 uppercase">
            Negotiation Feed
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          {isHovered && (
            <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
              Auto-scroll paused
            </span>
          )}
          <span className="text-xs text-gray-500 font-mono">
            {messages.length} msgs
          </span>
        </div>
      </div>

      {/* Feed list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs">
            <Bot className="w-8 h-8 mb-2 opacity-40 text-gray-400" />
            <div>No active negotiations.</div>
            <div className="text-[11px] text-gray-600">Simulate a peak or click a chaos button to start.</div>
          </div>
        ) : (
          messages.map((msg) => {
            const senderMeta = getSenderBadge(msg.sender);
            const Icon = senderMeta.icon;
            const isExpanded = expandedId === msg.id;

            return (
              <div
                key={msg.id}
                className={`p-3 rounded-xl border transition-all text-xs ${senderMeta.bg} ${senderMeta.border} hover:border-gray-400/50`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <Icon className={`w-3.5 h-3.5 ${senderMeta.text}`} />
                    <span className={`font-semibold ${senderMeta.text}`}>
                      {msg.sender}
                    </span>
                    <span className="text-gray-500 text-[10px]">→</span>
                    <span className="text-gray-400 text-[10px]">{msg.recipient}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold border ${getKindChip(msg.kind)}`}>
                      {msg.kind}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                      msg.source === 'fallback'
                        ? 'bg-amber-900/40 text-amber-300 border-amber-600/40'
                        : msg.source === 'solver'
                        ? 'bg-teal-900/40 text-teal-300 border-teal-600/40'
                        : 'bg-emerald-900/40 text-emerald-300 border-emerald-600/40'
                    }`}>
                      {msg.source.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Message Body */}
                <p className="text-gray-200 leading-relaxed font-sans text-xs">
                  {msg.text}
                </p>

                {/* Expandable payload if present */}
                {msg.payload && (
                  <div className="mt-2 pt-1.5 border-t border-gray-700/50">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-mono"
                    >
                      {isExpanded ? 'Hide Details ▲' : 'Inspect Payload ▼'}
                    </button>
                    {isExpanded && (
                      <pre className="mt-1 p-2 rounded bg-black/60 text-[10px] font-mono text-emerald-300/90 overflow-x-auto max-h-40">
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
    </div>
  );
};
