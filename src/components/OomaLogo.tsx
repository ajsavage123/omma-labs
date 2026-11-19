import type { FC } from 'react';

interface OomaLogoProps {
  className?: string;
  size?: number;
  id?: string;
  strokeColor?: string;
}

export const OomaLogo: FC<OomaLogoProps> = ({ className = '', size = 24, strokeColor }) => {
  const uniqueId = `ooma-grad-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <div className={`flex-shrink-0 flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="-8 -8 116 116"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={uniqueId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFA500" />
            <stop offset="100%" stopColor="#FF6B00" />
          </linearGradient>
        </defs>

        {/* Authentic Gold/Amber/Orange Ooma arc mark */}
        <path
          d="M 35 15 A 40 40 0 1 1 20 35"
          stroke={strokeColor || `url(#${uniqueId})`}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
};
