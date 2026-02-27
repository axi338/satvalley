import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { X, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DesmosPanelRef {
    open: () => void;
    close: () => void;
    toggle: () => void;
    isOpen: boolean;
}

interface DesmosPanelProps {
    onClose?: () => void;
}

export const DesmosPanel = forwardRef<DesmosPanelRef, DesmosPanelProps>(({ onClose }, ref) => {
    const [isOpen, setIsOpen] = useState(false);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen(prev => !prev),
        isOpen
    }));

    // Keyboard shortcut: Ctrl+D
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        onClose?.();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    drag
                    dragHandleSelector=".calculator-header"
                    dragMomentum={false}
                    initial={{ opacity: 0, scale: 0.9, x: "20%", y: "10%" }}
                    animate={{ opacity: 1, scale: 1, x: "20%", y: "10%" }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="fixed right-1/2 top-1/4 w-[600px] h-[640px] bg-white shadow-2xl z-[60] flex flex-col border border-slate-200 rounded-xl overflow-hidden allow-anticheat-focus"
                >
                    {/* Header (Drag Handle) */}
                    <div className="calculator-header h-14 bg-[#0b2a4a] border-b border-[#0a2440] flex items-center justify-between px-6 flex-shrink-0 cursor-move">
                        <div className="flex items-center gap-3">
                            <Calculator className="w-5 h-5 text-white" />
                            <span className="text-sm font-bold text-white uppercase tracking-wider select-none">
                                Desmos Graphing Calculator
                            </span>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                            aria-label="Close calculator"
                        >
                            <X className="w-5 h-5 text-white group-hover:text-white/80" />
                        </button>
                    </div>

                    {/* Calculator Container */}
                    <div className="flex-1 relative bg-white overflow-hidden">
                        <iframe
                            src="https://www.desmos.com/testing/collegeboard/graphing"
                            className="absolute inset-0 w-full h-full border-none"
                            title="Desmos Graphing Calculator"
                        />
                    </div>

                    {/* Footer hint */}
                    <div className="h-10 bg-slate-50 border-t border-slate-200 flex items-center justify-center px-4 flex-shrink-0">
                        <p className="text-xs text-slate-500 font-medium select-none">
                            Press <kbd className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono">Ctrl+D</kbd> to toggle calculator
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

DesmosPanel.displayName = 'DesmosPanel';
