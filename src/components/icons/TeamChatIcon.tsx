import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

// Slack/Teams-style chat bubble icon — filled with brand indigo
export const TeamChatIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main chat bubble */}
      <path
        d="M6 12C6 8.68629 8.68629 6 12 6H36C39.3137 6 42 8.68629 42 12V28C42 31.3137 39.3137 34 36 34H18L10 42V34H12C8.68629 34 6 31.3137 6 28V12Z"
        fill="#6366F1"
      />
      {/* Chat dots */}
      <circle cx="17" cy="20" r="2.5" fill="white" />
      <circle cx="24" cy="20" r="2.5" fill="white" />
      <circle cx="31" cy="20" r="2.5" fill="white" />
    </svg>
  );
};
