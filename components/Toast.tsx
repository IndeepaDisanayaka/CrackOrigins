'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, CheckCircle2, AlertCircle, AlertTriangle, Bug, ArrowRight } from 'lucide-react';

type ToastType = 'info' | 'success' | 'error' | 'warning' | 'bug';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    subtitle?: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, options?: { subtitle?: string; actionLabel?: string; actionHref?: string; onAction?: () => void }) => void;
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

    const showToast = useCallback((
        message: string,
        type: ToastType = 'info',
        options?: { subtitle?: string; actionLabel?: string; actionHref?: string; onAction?: () => void }
    ) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type, ...options }]);
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
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const t = window.setTimeout(() => onRemoveRef.current(), AUTO_DISMISS_MS);

        // Progress bar countdown
        const start = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - start;
            const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
            setProgress(remaining);
            if (remaining === 0) clearInterval(interval);
        }, 50);

        return () => {
            window.clearTimeout(t);
            clearInterval(interval);
        };
    }, []);

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return <CheckCircle2 size={20} color="#4ade80" />;
            case 'error':
                return <AlertCircle size={20} color="#ff4444" />;
            case 'warning':
                return <AlertTriangle size={20} color="#feb60c" />;
            case 'bug':
                return <Bug size={20} color="#feb60c" />;
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
            case 'bug':
                return '#feb60c';
            default:
                return '#3b82f6';
        }
    };

    const accent = getAccentColor();

    const handleAction = () => {
        if (toast.onAction) toast.onAction();
        if (toast.actionHref) window.location.href = toast.actionHref;
        onRemove();
    };

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
                borderRadius: '10px',
                padding: '16px 20px 12px',
                minWidth: '320px',
                maxWidth: '480px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                color: 'var(--foreground)',
                fontSize: '0.95rem',
                position: 'relative',
                overflow: 'hidden',
                transition: 'background 0.3s ease, border 0.3s ease',
            }}
        >
            {/* Left accent bar */}
            <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '3px',
                background: accent,
                borderRadius: '10px 0 0 10px',
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                    style={{
                        background: `${accent}20`,
                        padding: '9px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                    }}
                >
                    {getIcon()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, lineHeight: '1.4', letterSpacing: '0.01em' }}>
                        {toast.message}
                    </div>
                    {toast.subtitle && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.4 }}>
                            {toast.subtitle}
                        </div>
                    )}
                    {(toast.actionLabel && (toast.actionHref || toast.onAction)) && (
                        <button
                            onClick={handleAction}
                            style={{
                                marginTop: '8px',
                                background: 'none',
                                border: 'none',
                                color: accent,
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                letterSpacing: '0.03em',
                            }}
                        >
                            {toast.actionLabel} <ArrowRight size={12} />
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onRemove}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                        marginTop: '-2px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--foreground)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Progress bar */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '2px',
                width: `${progress}%`,
                background: accent,
                transition: 'width 0.05s linear',
                borderRadius: '0 0 10px 0',
            }} />
        </motion.div>
    );
};
