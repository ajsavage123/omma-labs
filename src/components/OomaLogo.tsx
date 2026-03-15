import type { FC } from 'react';

interface OomaLogoProps {
  className?: string;
  size?: number;
}

export const OomaLogo: FC<OomaLogoProps> = ({ className = '', size = 24 }) => {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="ooma-sleek-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
        
        {/* Sleek, Thin, Half-Cutted Circle (Arc) - radius reduced for a smaller look */}
        <path
          d="M 12 4 A 8 8 0 1 1 6.5 8.5"
          stroke="url(#ooma-sleek-grad)"
          strokeWidth="1"
          strokeLinecap="round"
          className="opacity-90"
        />
      </svg>
    </div>
  );
};
