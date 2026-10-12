import React from 'react';

export type NeoHeaderColor = 
  | 'yellow' 
  | 'pink' 
  | 'blue' 
  | 'mint' 
  | 'orange' 
  | 'lilac' 
  | 'red' 
  | 'white'
  | 'cream';

interface NeoCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  tag?: string;
  tagColor?: 'yellow' | 'pink' | 'blue' | 'mint' | 'orange' | 'lilac' | 'red' | 'black';
  headerColor?: NeoHeaderColor;
  headerAction?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

const HEADER_COLOR_MAP: Record<NeoHeaderColor, string> = {
  yellow: 'bg-[#FFD60A]',
  pink: 'bg-[#FF4D8D]',
  blue: 'bg-[#3A86FF] text-white',
  mint: 'bg-[#06D6A0]',
  orange: 'bg-[#FF7B00]',
  lilac: 'bg-[#B388FF]',
  red: 'bg-[#FF3B30] text-white',
  white: 'bg-white',
  cream: 'bg-[#FFF4E0]',
};

const TAG_COLOR_MAP = {
  yellow: 'bg-[#FFD60A] text-black',
  pink: 'bg-[#FF4D8D] text-black',
  blue: 'bg-[#3A86FF] text-white',
  mint: 'bg-[#06D6A0] text-black',
  orange: 'bg-[#FF7B00] text-black',
  lilac: 'bg-[#B388FF] text-black',
  red: 'bg-[#FF3B30] text-white',
  black: 'bg-black text-[#FFD60A]',
};

export const NeoCard: React.FC<NeoCardProps> = ({
  title,
  subtitle,
  tag,
  tagColor = 'black',
  headerColor = 'yellow',
  headerAction,
  icon,
  children,
  className = '',
  bodyClassName = '',
}) => {
  return (
    <div
      className={`bg-white border-[3px] border-black rounded-[4px] shadow-[6px_6px_0_#000] flex flex-col overflow-hidden ${className}`}
    >
      {/* Retro Window Title Bar */}
      {(title || tag || headerAction) && (
        <div
          className={`border-b-[3px] border-black px-3.5 py-2 flex items-center justify-between font-extrabold uppercase select-none ${HEADER_COLOR_MAP[headerColor]}`}
        >
          <div className="flex items-center space-x-2 min-w-0">
            {icon && <span className="flex-shrink-0">{icon}</span>}
            <div className="truncate">
              <span className="text-xs sm:text-sm font-['Space_Grotesk',sans-serif] tracking-tight">
                {title}
              </span>
              {subtitle && (
                <span className="ml-2 text-[10px] normal-case font-mono font-normal opacity-80">
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {tag && (
              <span
                className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 border-2 border-black rounded-[2px] shadow-[2px_2px_0_#000] ${TAG_COLOR_MAP[tagColor]}`}
              >
                {tag}
              </span>
            )}
            {headerAction}
          </div>
        </div>
      )}

      {/* Card Content Body */}
      <div className={`p-4 flex-1 flex flex-col ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};
