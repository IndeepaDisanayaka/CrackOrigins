import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  icon?: React.ReactNode;
  containerStyle?: React.CSSProperties;
  as?: 'input' | 'textarea';
}

export default function Input({ label, icon, containerStyle, className, as = 'input', ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', ...containerStyle }}>
      {label && (
        <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {icon} {label}
        </label>
      )}
      {as === 'textarea' ? (
        <textarea 
          className={`adminInput ${className || ''}`} 
          style={{ minHeight: '100px', paddingTop: '0.8rem', resize: 'vertical', ...props.style }}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} 
        />
      ) : (
        <input 
          className={`adminInput ${className || ''}`} 
          style={{ ...props.style }}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)} 
        />
      )}
    </div>
  );
}
