import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

export const DashboardIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top-left square */}
      <rect x="4" y="4" width="18" height="18" rx="4" fill="#4285F4" />
      {/* Top-right square */}
      <rect x="26" y="4" width="18" height="18" rx="4" fill="#34A853" />
      {/* Bottom-left square */}
      <rect x="4" y="26" width="18" height="18" rx="4" fill="#FBBC04" />
      {/* Bottom-right square */}
      <rect x="26" y="26" width="18" height="18" rx="4" fill="#EA4335" />
    </svg>
  );
};
