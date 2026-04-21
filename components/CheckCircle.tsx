'use client';

import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

interface Props {
    checked: boolean;
    onChange?: (val: boolean) => void;
    size?: number;
}

const CheckCircle: React.FC<Props> = ({ checked, onChange, size = 18 }) => {
    return (
        <div 
            onClick={(e) => {
                if (onChange) {
                    // Prevent bubbling if wrapped in a click target
                    e.stopPropagation();
                    onChange(!checked);
                }
            }}
            style={{ 
                color: checked ? 'var(--primary)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: onChange ? 'pointer' : 'inherit'
            }}
        >
            {checked ? <CheckSquare size={size} /> : <Square size={size} />}
        </div>
    );
};

export default CheckCircle;
