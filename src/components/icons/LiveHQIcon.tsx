import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

// Live broadcast/signal icon — red circle with signal waves (like YouTube Live / broadcast icons)
export const LiveHQIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer signal arc */}
      <path d="M10 14C4.5 19.5 4.5 28.5 10 34" stroke="#00BCD4" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M38 14C43.5 19.5 43.5 28.5 38 34" stroke="#00BCD4" strokeWidth="3.5" strokeLinecap="round" />
      {/* Inner signal arc */}
      <path d="M16 18.5C12.5 22 12.5 26 16 29.5" stroke="#26C6DA" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M32 18.5C35.5 22 35.5 26 32 29.5" stroke="#26C6DA" strokeWidth="3.5" strokeLinecap="round" />
      {/* Center dot — live broadcast */}
      <circle cx="24" cy="24" r="5" fill="#00BCD4" />
    </svg>
  );
};
