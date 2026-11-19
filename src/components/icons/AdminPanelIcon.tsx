import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

// Shield/admin icon — filled with gradient, real admin panel style
export const AdminPanelIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shield body */}
      <path
        d="M24 4L6 12V22C6 34 14 42 24 46C34 42 42 34 42 22V12L24 4Z"
        fill="#6366F1"
      />
      {/* Gear on shield */}
      <circle cx="24" cy="24" r="8" fill="white" opacity="0.9" />
      <circle cx="24" cy="24" r="4" fill="#6366F1" />
      {/* Gear teeth */}
      <rect x="22.5" y="13.5" width="3" height="4" rx="1" fill="white" opacity="0.9" />
      <rect x="22.5" y="30.5" width="3" height="4" rx="1" fill="white" opacity="0.9" />
      <rect x="13.5" y="22.5" width="4" height="3" rx="1" fill="white" opacity="0.9" />
      <rect x="30.5" y="22.5" width="4" height="3" rx="1" fill="white" opacity="0.9" />
    </svg>
  );
};
