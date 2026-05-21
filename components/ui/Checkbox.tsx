import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  activeColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function Checkbox({
  checked,
  onChange,
  label,
  description,
  icon,
  activeColor = 'var(--primary)',
  className = '',
  style = {}
}: CheckboxProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1rem',
        background: 'transparent',
        border: `1px solid ${checked ? activeColor : 'var(--outline-color)'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.3s',
        ...style
      }}
    >
      <div style={{ color: checked ? activeColor : 'var(--text-muted)' }}>
        {checked ? <CheckSquare size={18} /> : <Square size={18} />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: checked ? activeColor : 'var(--foreground)' }}>
          {label}
        </span>
        {description && (
          <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{description}</span>
        )}
      </div>
      {icon && (
        <div style={{ marginLeft: 'auto', opacity: 0.3 }}>
          {icon}
        </div>
      )}
    </div>
  );
}
