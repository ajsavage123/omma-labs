import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

// Exact match of the user's reference Sales / Customer Support Agent with Headset Icon
export const CRMIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer Headset Band */}
      <path
        d="M 18 48 C 18 26 32 12 50 12 C 68 12 82 26 82 48"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Head / Hair Profile */}
      <path
        d="M 28 44 C 28 31 38 20 50 20 C 62 20 72 31 72 44 V 56 C 72 65 62 70 50 70 C 38 70 28 65 28 56 V 44 Z"
        fill="currentColor"
      />

      {/* Inner Face Cutout */}
      <path
        d="M 34 46 C 34 46 34 56 50 56 C 66 56 66 46 66 46 C 66 38 59 34 50 34 C 41 34 34 38 34 46 Z"
        fill="#09090b"
      />

      {/* Left Earcup */}
      <rect x="11" y="37" width="13" height="22" rx="6.5" fill="currentColor" />

      {/* Right Earcup */}
      <rect x="76" y="37" width="13" height="22" rx="6.5" fill="currentColor" />

      {/* Microphone Boom Arm */}
      <path
        d="M 80 57 C 80 72 70 75 56 75"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Microphone Capsule */}
      <rect x="42" y="70" width="18" height="11" rx="5.5" fill="currentColor" />
    </svg>
  );
};
