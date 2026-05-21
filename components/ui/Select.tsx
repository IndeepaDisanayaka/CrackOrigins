import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: React.ReactNode;
  options: { value: string; label: string }[];
  containerStyle?: React.CSSProperties;
}

export default function Select({ label, icon, options, containerStyle, className, ...props }: SelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', ...containerStyle }}>
      {label && (
        <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {icon} {label}
        </label>
      )}
      <select 
        className={className || "adminInput"} 
        style={{
          width: '100%',
          padding: '0.75rem',
          background: 'transparent',
          border: '1px solid var(--outline-color)',
          borderRadius: '8px',
          color: 'var(--foreground)',
          fontSize: '0.9rem',
          outline: 'none',
          ...props.style
        }}
        {...props} 
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
