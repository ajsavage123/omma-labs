import React from 'react';

interface OmmaLogoProps {
  className?: string;
  size?: number | string;
}

export const OmmaLogo: React.FC<OmmaLogoProps> = ({ className = 'w-5 h-5', size }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 
        Center is (12, 12), radius is 9.
        Start at ~top-left, arc clockwise to the other side of the gap.
      */}
      <path d="M 8.5 3.5 A 9 9 0 1 1 4.5 7.5" />
    </svg>
  );
};
