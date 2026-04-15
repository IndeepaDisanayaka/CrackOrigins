import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, value, label }) => {
  return (
    <div style={{ background: 'transparent', border: '1px solid var(--outline-color)', padding: '1.5rem', borderRadius: '16px' }}>
      <Icon size={24} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
      <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{value}</div>
      <div style={{ fontSize: '0.7rem', opacity: 0.75, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
};
