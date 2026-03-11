import React from 'react';

interface OomaLogoProps {
  className?: string;
  size?: number;
}

export const OomaLogo: React.FC<OomaLogoProps> = ({ className = '', size = 24 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Outer Glow Layer */}
      <div 
        className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full scale-150 animate-pulse" 
      />
      
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 overflow-visible"
      >
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          
          <filter id="premium-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <radialGradient id="inner-glow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Shadow Ring */}
        <circle 
          cx="50" cy="50" r="42" 
          stroke="rgba(99, 102, 241, 0.1)" 
          strokeWidth="8" 
        />

        {/* Main Glowing Ring */}
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="url(#ring-grad)"
          strokeWidth="6"
          strokeLinecap="round"
          filter="url(#premium-glow)"
          className="transition-all duration-700"
          style={{
            strokeDasharray: '260',
            strokeDashoffset: '0',
          }}
        />

        {/* Inner Highlight Ring (Thin) */}
        <circle
          cx="50"
          cy="50"
          r="36"
          stroke="white"
          strokeWidth="0.5"
          strokeOpacity="0.3"
          fill="none"
        />

        {/* Center Tech Dot */}
        <circle 
          cx="50" cy="50" r="4" 
          fill="white" 
          className="animate-pulse shadow-lg"
          style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8))' }}
        />

        {/* Orbital Accent */}
        <circle cx="50" cy="8" r="3" fill="#818cf8">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 50 50"
            to="360 50 50"
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
};
