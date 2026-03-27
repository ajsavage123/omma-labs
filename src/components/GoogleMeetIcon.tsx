import React from 'react';

interface GoogleMeetIconProps {
  className?: string;
  size?: number | string;
}

export const GoogleMeetIcon: React.FC<GoogleMeetIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M0 10.5V31C0 34.3137 2.68629 37 6 37H26V10.5H0Z" fill="#34A853" />
      <path d="M48 9.5L34 20V31L48 41.5V9.5Z" fill="#34A853" />
      <path d="M26 10.5L34 2.5V37L26 41V10.5Z" fill="#EA4335" />
      <path d="M26 10.5V37H6C2.68629 37 0 34.3137 0 31V10.5H26Z" fill="#4285F4" />
      <path d="M26 10.5L34 2.5H6C2.68629 2.5 0 5.18629 0 8.5V10.5H26Z" fill="#FBBC04" />
    </svg>
  );
};
