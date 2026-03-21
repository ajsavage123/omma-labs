import type { FC } from 'react';

interface OomaLogoProps {
  className?: string;
  size?: number;
  id?: string;
}

export const OomaLogo: FC<OomaLogoProps> = ({ className = '', size = 24 }) => {
  // Use a stable unique id per component instance to avoid SVG gradient conflicts
  const uid = `ooma-grad-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <div className={`flex-shrink-0 flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        {/* Elegant thin 3/4 arc — 1/4 cut at bottom-left */}
        <path
          d="M 12 3 A 9 9 0 1 1 5.4 7"
          stroke={`url(#${uid})`}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
};
