import React from 'react';

export type NeoBadgeVariant = 
  | 'yellow' 
  | 'pink' 
  | 'blue' 
  | 'mint' 
  | 'orange' 
  | 'lilac' 
  | 'red' 
  | 'black' 
  | 'white'
  | 'default';

interface NeoBadgeProps {
  children: React.ReactNode;
  variant?: NeoBadgeVariant;
  tilt?: 'left' | 'right' | 'none';
  className?: string;
}

const VARIANT_MAP: Record<NeoBadgeVariant, string> = {
  yellow: 'bg-[#FFD60A] text-black border-black',
  pink: 'bg-[#FF4D8D] text-black border-black',
  blue: 'bg-[#3A86FF] text-white border-black',
  mint: 'bg-[#06D6A0] text-black border-black',
  orange: 'bg-[#FF7B00] text-black border-black',
  lilac: 'bg-[#B388FF] text-black border-black',
  red: 'bg-[#FF3B30] text-white border-black',
  black: 'bg-black text-[#FFD60A] border-black',
  white: 'bg-white text-black border-black',
  default: 'bg-white text-black border-black',
};

const TILT_MAP = {
  left: '-rotate-1',
  right: 'rotate-1',
  none: 'rotate-0',
};

export const NeoBadge: React.FC<NeoBadgeProps> = ({
  children,
  variant = 'default',
  tilt = 'none',
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border-2 shadow-[2px_2px_0_#000] rounded-[3px] select-none ${VARIANT_MAP[variant]} ${TILT_MAP[tilt]} ${className}`}
    >
      {children}
    </span>
  );
};
