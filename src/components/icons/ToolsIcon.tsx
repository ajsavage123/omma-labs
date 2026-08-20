import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

// Toolbox/wrench+gear icon — filled production style
export const ToolsIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Wrench */}
      <path
        d="M18.5 29.5L7.5 40.5C6.1 41.9 3.9 41.9 2.5 40.5C1.1 39.1 1.1 36.9 2.5 35.5L13.5 24.5"
        fill="#10B981"
      />
      <path
        d="M18.5 29.5L7.5 40.5C6.1 41.9 3.9 41.9 2.5 40.5C1.1 39.1 1.1 36.9 2.5 35.5L13.5 24.5"
        stroke="#059669"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Gear */}
      <circle cx="32" cy="16" r="10" fill="#10B981" />
      <circle cx="32" cy="16" r="5" fill="#064E3B" />
      {/* Gear teeth */}
      <rect x="30" y="3" width="4" height="5" rx="1" fill="#10B981" />
      <rect x="30" y="24" width="4" height="5" rx="1" fill="#10B981" />
      <rect x="19" y="14" width="5" height="4" rx="1" fill="#10B981" />
      <rect x="40" y="14" width="5" height="4" rx="1" fill="#10B981" />
    </svg>
  );
};
