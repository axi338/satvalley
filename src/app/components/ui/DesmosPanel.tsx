import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { X, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Desmos API types
declare global {
    interface Window {
        Desmos?: {
            GraphingCalculator: (element: HTMLElement, options?: any) => any;
        };
    }
}

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
    const [isLoaded, setIsLoaded] = useState(false);
    const calculatorRef = useRef<HTMLDivElement>(null);
    const calculatorInstanceRef = useRef<any>(null);
    const scriptLoadedRef = useRef(false);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen(prev => !prev),
        isOpen
    }));

    // Load Desmos API script
    useEffect(() => {
        if (scriptLoadedRef.current) return;

        const script = document.createElement('script');
        script.src = 'https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6';
        script.async = true;

        script.onload = () => {
            setIsLoaded(true);
            scriptLoadedRef.current = true;
        };

        script.onerror = () => {
            console.error('Failed to load Desmos API');
        };

        document.head.appendChild(script);

        return () => {
            // Don't remove script on unmount - keep it loaded for performance
        };
    }, []);

    // Initialize calculator when panel opens and script is loaded
    useEffect(() => {
        if (!isOpen || !isLoaded || !calculatorRef.current || calculatorInstanceRef.current) {
            return;
        }

        if (window.Desmos) {
            try {
                calculatorInstanceRef.current = window.Desmos.GraphingCalculator(
                    calculatorRef.current,
                    {
                        keypad: true,
                        expressions: true,
                        settingsMenu: true,
                        zoomButtons: true,
                        expressionsTopbar: true,
                        pointsOfInterest: true,
                        trace: true,
                        border: false,
                        lockViewport: false,
                        expressionsCollapsed: false,
                        capExpressionSize: false,
                        // Bluebook-style colors
                        graphpaper: true,
                        showGrid: true,
                        showXAxis: true,
                        showYAxis: true,
                    }
                );
            } catch (error) {
                console.error('Error initializing Desmos calculator:', error);
            }
        }
    }, [isOpen, isLoaded]);

    // Cleanup calculator on unmount
    useEffect(() => {
        return () => {
            if (calculatorInstanceRef.current) {
                try {
                    calculatorInstanceRef.current.destroy();
                    calculatorInstanceRef.current = null;
                } catch (error) {
                    console.error('Error destroying calculator:', error);
                }
            }
        };
    }, []);

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
        <>
            {/* Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/20 z-[55] backdrop-blur-[2px]"
                        onClick={handleClose}
                    />
                )}
            </AnimatePresence>

            {/* Calculator Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-[40%] min-w-[400px] max-w-[600px] bg-white shadow-2xl z-[60] flex flex-col border-l border-slate-200 allow-anticheat-focus"
                    >
                        {/* Header */}
                        <div className="h-14 bg-[#0b2a4a] border-b border-[#0a2440] flex items-center justify-between px-6 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <Calculator className="w-5 h-5 text-white" />
                                <span className="text-sm font-bold text-white uppercase tracking-wider">
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
                            {!isLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white">
                                    <div className="text-center space-y-4">
                                        <div className="w-12 h-12 border-4 border-[#0b2a4a] border-t-transparent rounded-full animate-spin mx-auto" />
                                        <p className="text-sm font-medium text-slate-600">Loading calculator...</p>
                                    </div>
                                </div>
                            )}
                            <div
                                ref={calculatorRef}
                                className="absolute inset-0 w-full h-full"
                                style={{ opacity: isLoaded ? 1 : 0 }}
                            />
                        </div>

                        {/* Footer hint */}
                        <div className="h-10 bg-slate-50 border-t border-slate-200 flex items-center justify-center px-4 flex-shrink-0">
                            <p className="text-xs text-slate-500 font-medium">
                                Press <kbd className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono">Ctrl+D</kbd> to toggle calculator
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
});

DesmosPanel.displayName = 'DesmosPanel';
