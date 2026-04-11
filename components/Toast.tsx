'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
};

const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
    return (
        <div
            style={{
                position: 'fixed',
                top: '30px',
                right: '30px',
                zIndex: 10000000,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                pointerEvents: 'none',
            }}
        >
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
                ))}
            </AnimatePresence>
        </div>
    );
};

const AUTO_DISMISS_MS = 8000;

const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
    const onRemoveRef = useRef(onRemove);
    onRemoveRef.current = onRemove;

    useEffect(() => {
        const t = window.setTimeout(() => onRemoveRef.current(), AUTO_DISMISS_MS);
        return () => window.clearTimeout(t);
    }, []);

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return <CheckCircle2 size={20} color="#4ade80" />;
            case 'error':
                return <AlertCircle size={20} color="#ff4444" />;
            case 'warning':
                return <AlertTriangle size={20} color="#feb60c" />;
            default:
                return <Info size={20} color="#3b82f6" />;
        }
    };

    const getAccentColor = () => {
        switch (toast.type) {
            case 'success':
                return '#4ade80';
            case 'error':
                return '#ff4444';
            case 'warning':
                return '#feb60c';
            default:
                return '#3b82f6';
        }
    };

    const accent = getAccentColor();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.2 } }}
            style={{
                pointerEvents: 'auto',
                background: 'var(--background)',
                backdropFilter: 'blur(16px)',
                border: `1px solid var(--outline-color)`,
                borderRadius: '8px',
                padding: '16px 20px',
                minWidth: '320px',
                maxWidth: '480px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                color: 'var(--foreground)',
                fontSize: '0.95rem',
                position: 'relative',
                overflow: 'hidden',
                transition: 'background 0.3s ease, border 0.3s ease',
            }}
        >
            <div
                style={{
                    background: `${accent}15`,
                    padding: '10px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                {getIcon()}
            </div>

            <div style={{ flex: 1, fontWeight: 700, lineHeight: '1.4', letterSpacing: '0.01em' }}>{toast.message}</div>

            <button
                type="button"
                onClick={onRemove}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--foreground)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
                <X size={18} />
            </button>
        </motion.div>
    );
};
