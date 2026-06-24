import { useId } from 'react';
import type { FC } from 'react';

interface OomaLogoProps {
  className?: string;
  size?: number;
  id?: string;
  strokeColor?: string;
}

export const OomaLogo: FC<OomaLogoProps> = ({ className = '', size = 24, strokeColor }) => {
  const hasTextColor = /\btext-/.test(className);
  const colorClass = hasTextColor ? '' : 'text-[#FFD700]';
  
  return (
    <div className={`flex-shrink-0 flex items-center justify-center ${colorClass} ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 35 15 A 40 40 0 1 1 20 35"
          stroke={strokeColor || 'currentColor'}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
};
