import React from 'react';
import Box from './Box';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: string;
  outlineColor?: string;
  backgroundColor?: string;
  hoverEffect?: boolean;
}

export default function Card({ 
  children, 
  padding = '1.5rem', 
  outlineColor = 'var(--outline-color)', 
  backgroundColor = 'rgba(255,255,255,0.02)',
  hoverEffect = false,
  style = {},
  className = '',
  ...props
}: CardProps) {
  return (
    <Box 
      className={`card ${hoverEffect ? 'hover-effect' : ''} ${className}`}
      padding={padding}
      style={{
        background: backgroundColor,
        border: `1px solid ${outlineColor}`,
        borderRadius: '8px',
        ...style
      }}
      {...props}
    >
      {children}
    </Box>
  );
}
