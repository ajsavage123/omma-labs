import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

// People/team icon — Google Contacts / Teams style, filled with color
export const TeamLibraryIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left person */}
      <circle cx="16" cy="16" r="6" fill="#10B981" />
      <path d="M6 38C6 31.3726 10.4772 26 16 26C21.5228 26 26 31.3726 26 38" fill="#10B981" />
      {/* Right person (slightly behind) */}
      <circle cx="33" cy="14" r="5.5" fill="#059669" />
      <path d="M24 36C24 30.4772 27.9249 26 33 26C38.0751 26 42 30.4772 42 36" fill="#059669" />
    </svg>
  );
};
