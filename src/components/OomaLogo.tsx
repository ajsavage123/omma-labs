import React from 'react';

interface OomaLogoProps {
  className?: string;
  size?: number;
}

export const OomaLogo: React.FC<OomaLogoProps> = ({ className = '', size = 24 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Background Glow */}
      <div 
        className="absolute inset-0 bg-indigo-500/30 blur-lg rounded-full animate-pulse" 
        style={{ margin: -size/4 }}
      />
      
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          <linearGradient id="ooma-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Ring Path */}
        <path
          d="M 8.5 3.5 A 9 9 0 1 1 4.5 7.5"
          stroke="url(#ooma-grad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          filter="url(#glow)"
        />
        
        {/* Decorative center element */}
        <circle cx="12" cy="12" r="1.5" fill="white" className="animate-pulse" />
      </svg>
    </div>
  );
};
