import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

// Google Docs / folder style document icon — filled blue
export const DocsLibraryIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Document body */}
      <path
        d="M14 4H30L38 12V40C38 42.2091 36.2091 44 34 44H14C11.7909 44 10 42.2091 10 40V8C10 5.79086 11.7909 4 14 4Z"
        fill="#4285F4"
      />
      {/* Page fold */}
      <path d="M30 4L38 12H34C31.7909 12 30 10.2091 30 8V4Z" fill="#A0C4FF" />
      {/* Text lines */}
      <rect x="16" y="20" width="16" height="2.5" rx="1" fill="white" opacity="0.9" />
      <rect x="16" y="26" width="12" height="2.5" rx="1" fill="white" opacity="0.7" />
      <rect x="16" y="32" width="14" height="2.5" rx="1" fill="white" opacity="0.5" />
    </svg>
  );
};
