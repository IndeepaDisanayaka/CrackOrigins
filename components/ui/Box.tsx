import React from 'react';

interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: string;
  gap?: string;
  flex?: boolean;
  flexCol?: boolean;
}

export default function Box({ 
  children, 
  padding = '0', 
  gap = '0', 
  flex = false, 
  flexCol = false, 
  className = '', 
  style = {}, 
  ...props 
}: BoxProps) {
  return (
    <div 
      className={className} 
      style={{
        padding,
        display: flex || flexCol ? 'flex' : 'block',
        flexDirection: flexCol ? 'column' : 'row',
        gap,
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
