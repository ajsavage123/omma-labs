import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

// Calculator icon — filled purple, production style
export const CommissionCalcIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Calculator body */}
      <rect x="8" y="4" width="32" height="40" rx="5" fill="#8B5CF6" />
      {/* Screen */}
      <rect x="12" y="8" width="24" height="10" rx="2" fill="#1E1B4B" />
      {/* Buttons row 1 */}
      <rect x="12" y="22" width="6" height="5" rx="1.5" fill="white" opacity="0.9" />
      <rect x="21" y="22" width="6" height="5" rx="1.5" fill="white" opacity="0.9" />
      <rect x="30" y="22" width="6" height="5" rx="1.5" fill="#FBBF24" />
      {/* Buttons row 2 */}
      <rect x="12" y="30" width="6" height="5" rx="1.5" fill="white" opacity="0.7" />
      <rect x="21" y="30" width="6" height="5" rx="1.5" fill="white" opacity="0.7" />
      <rect x="30" y="30" width="6" height="5" rx="1.5" fill="#10B981" />
      {/* Buttons row 3 */}
      <rect x="12" y="38" width="15" height="3" rx="1.5" fill="white" opacity="0.5" />
      <rect x="30" y="38" width="6" height="3" rx="1.5" fill="#EF4444" />
    </svg>
  );
};
