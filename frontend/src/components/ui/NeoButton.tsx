import React from 'react';

export type NeoButtonVariant = 
  | 'yellow' 
  | 'pink' 
  | 'blue' 
  | 'mint' 
  | 'orange' 
  | 'lilac' 
  | 'red' 
  | 'black' 
  | 'white';

interface NeoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NeoButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  isPressed?: boolean;
}

const VARIANT_MAP: Record<NeoButtonVariant, string> = {
  yellow: 'bg-[#FFD60A] text-black hover:bg-[#FFE047]',
  pink: 'bg-[#FF4D8D] text-black hover:bg-[#FF6B9E]',
  blue: 'bg-[#3A86FF] text-white hover:bg-[#5295FF]',
  mint: 'bg-[#06D6A0] text-black hover:bg-[#1CE5B1]',
  orange: 'bg-[#FF7B00] text-black hover:bg-[#FF8D24]',
  lilac: 'bg-[#B388FF] text-black hover:bg-[#C29DFF]',
  red: 'bg-[#FF3B30] text-white hover:bg-[#FF554C]',
  black: 'bg-black text-[#FFD60A] hover:bg-neutral-900',
  white: 'bg-white text-black hover:bg-[#FFF9EE]',
};

const SIZE_MAP = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-xs',
  lg: 'px-4 py-2.5 text-sm',
};

export const NeoButton: React.FC<NeoButtonProps> = ({
  children,
  variant = 'yellow',
  size = 'md',
  isPressed = false,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      disabled={disabled}
      className={`font-['Space_Grotesk',sans-serif] font-bold uppercase tracking-wide border-[3px] border-black rounded-[4px] inline-flex items-center justify-center transition-all duration-100 select-none ${
        isPressed
          ? 'translate-x-[4px] translate-y-[4px] shadow-[2px_2px_0_#000]'
          : 'shadow-[4px_4px_0_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0_#000]'
      } ${disabled ? 'opacity-50 cursor-not-allowed hover:translate-x-0 hover:translate-y-0 hover:shadow-[4px_4px_0_#000]' : 'cursor-pointer'} ${VARIANT_MAP[variant]} ${SIZE_MAP[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
