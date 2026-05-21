import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost';
  children: React.ReactNode;
}

export default function Button({ variant = 'solid', children, className, style, ...props }: ButtonProps) {
  let btnClass = 'btnSolid';
  if (variant === 'outline') btnClass = 'btnOutline';
  if (variant === 'ghost') btnClass = 'btnGhost'; // Assuming ghost exists or will be added

  return (
    <button 
      className={`${btnClass} ${className || ''}`} 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
}
