import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

// Contact card icon — Google Contacts style, filled with amber
export const ClientContactsIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Card body */}
      <rect x="4" y="8" width="40" height="32" rx="4" fill="#F59E0B" />
      {/* Person avatar */}
      <circle cx="18" cy="22" r="5" fill="white" />
      <path d="M10 36C10 31.5817 13.5817 28 18 28C22.4183 28 26 31.5817 26 36" fill="white" />
      {/* Contact lines */}
      <rect x="30" y="18" width="10" height="2.5" rx="1" fill="white" opacity="0.9" />
      <rect x="30" y="24" width="8" height="2.5" rx="1" fill="white" opacity="0.7" />
      <rect x="30" y="30" width="6" height="2.5" rx="1" fill="white" opacity="0.5" />
    </svg>
  );
};
