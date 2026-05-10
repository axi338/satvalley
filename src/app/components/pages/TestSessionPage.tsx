import React, { memo, useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { MathText } from '../ui/MathText';
import { supabase } from '../../lib/supabase';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Flag,
    Grid,
    Clock,
    Eye,
    EyeOff,
    Calculator,
    X,
    AlertCircle,
    Loader2,
    CheckCircle2,
    Zap,
    PenLine,
    Grid3X3,
    Book,
    HelpCircle as HelpIcon,
    Accessibility,
    LogOut,
    Eye as EyeIcon,
    Move,
    MoreVertical,
    Trash2,
    ArrowRight,
    Shield,
    Monitor,
    MapPin,
    Bookmark,
    FileText,
    Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FullscreenInterstitial } from '../FullscreenInterstitial';
import { PracticeIntroScreen } from './PracticeIntroScreen';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { DesmosPanel, type DesmosPanelRef } from '../ui/DesmosPanel';

// --- Types ---
interface TestSessionPageProps {
    testId?: string;
    onNavigate: (page: string, params?: any) => void;
    user: any;
    profile?: any;
}

interface Question {
    id: number | string;
    text: string;
    passage?: string;
    options?: string[];
    answer?: string;
    type?: 'multiple-choice' | 'numeric' | 'spr';
    imageUrl?: string;
    optionImages?: (string | null)[];
    subject?: 'rw' | 'math';
    explanation?: string;
}

interface HighlightRange {
    start: number;
    end: number;
    text: string;
    color?: 'yellow' | 'blue' | 'pink';
}

interface TestState {
    stage: 'rw-m1' | 'rw-m2' | 'break' | 'math-m1' | 'math-m2';
    questions: Question[];
    answers: Record<string, string>; // questionId -> answer
    flags: Set<string | number>;     // questionIds
    struckOptions: Record<string, Set<string>>; // questionId -> set of options
    highlights: Record<string, HighlightRange[]>; // questionId -> ranges (for passage)
    timeLeft: number;
}

// --- Specialized Tools ---

const LineReader = ({ onClose }: { onClose: () => void }) => {
    const [top, setTop] = useState(200);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startTop, setStartTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartY(e.clientY);
        setStartTop(top);
        e.preventDefault();
        containerRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp') {
            setTop(prev => Math.max(-30, prev - 10));
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            setTop(prev => prev + 10);
            e.preventDefault();
        }
    };

    useEffect(() => {
        containerRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const deltaY = e.clientY - startY;
            // Allow top to go to -30px, keeping handle at the very edge (0px)
            setTop(Math.max(-30, startTop + deltaY));
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, startY, startTop]);

    return (
        <div
            ref={containerRef}
            className="bluebook-line-reader outline-none"
            style={{ top }}
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <div className="bluebook-line-reader-instruction pointer-events-none select-none">
                Click on the six dots, then use the arrow keys to move the line reader.
            </div>
            <div className="bluebook-line-reader-window">
                <div className="bluebook-line-reader-handle" onMouseDown={handleMouseDown}>
                    <div className="flex flex-col gap-0.5 pointer-events-none">
                        <div className="flex gap-0.5"><div className="w-1 h-1 bg-slate-400 rounded-full" /><div className="w-1 h-1 bg-slate-400 rounded-full" /></div>
                        <div className="flex gap-0.5"><div className="w-1 h-1 bg-slate-400 rounded-full" /><div className="w-1 h-1 bg-slate-400 rounded-full" /></div>
                        <div className="flex gap-0.5"><div className="w-1 h-1 bg-slate-400 rounded-full" /><div className="w-1 h-1 bg-slate-400 rounded-full" /></div>
                    </div>
                </div>
                {/* Close Button with high-contrast background */}
                <div className="absolute top-2 right-4 z-[130] pointer-events-auto">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors shadow-lg border border-white/20"
                        title="Close line reader"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const HighlightToolbar = ({
    position,
    onSelectColor,
    onRemove
}: {
    position: { x: number, y: number },
    onSelectColor: (color: 'yellow' | 'blue' | 'pink') => void,
    onRemove: () => void
}) => {
    return (
        <div
            className="fixed z-[70] bg-white border border-slate-200 shadow-xl rounded-full px-3 py-1.5 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200"
            style={{ left: position.x, top: position.y, transform: 'translate(-50%, -120%)' }}
        >
            <button onClick={() => onSelectColor('yellow')} className="w-6 h-6 rounded-full bg-[#FFF5A1] border border-slate-300 hover:scale-110 transition-transform" />
            <button onClick={() => onSelectColor('blue')} className="w-6 h-6 rounded-full bg-[#D1E9FF] border border-slate-300 hover:scale-110 transition-transform" />
            <button onClick={() => onSelectColor('pink')} className="w-6 h-6 rounded-full bg-[#FFD1E8] border border-slate-300 hover:scale-110 transition-transform" />
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <button onClick={onRemove} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                <Trash2 className="w-4 h-4 text-slate-500" />
            </button>
        </div>
    );
};

// --- Main Components ---

// Draggable Reference Component
const DraggableReference = ({ onClose }: { onClose: () => void }) => {
    const [position, setPosition] = useState({ x: 120, y: 120 });
    const [isDragging, setIsDragging] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isMaximized) return; // Prevent dragging while maximized
        if (panelRef.current) {
            const rect = panelRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
            setIsDragging(true);
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: Math.max(0, e.clientX - dragOffset.x),
                    y: Math.max(0, e.clientY - dragOffset.y)
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    return (
        <div
            ref={panelRef}
            className={`fixed bg-white shadow-2xl z-[100] flex flex-col overflow-hidden border border-[#e2e8f0] transition-all duration-200 ${isMaximized ? 'inset-0 w-full h-full rounded-none' : 'w-[750px] h-[600px] rounded-t-xl'
                }`}
            style={!isMaximized ? {
                left: position.x,
                top: position.y,
            } : {}}
        >
            <div
                className="h-[48px] bg-[#1e293b] flex items-center justify-between px-4 cursor-move select-none relative"
                onMouseDown={handleMouseDown}
            >
                <span className="text-[14px] font-bold text-white tracking-wide">
                    Reference Sheet
                </span>

                {/* Handle Dots */}
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col gap-0.5 pointer-events-none opacity-60">
                    <div className="flex gap-0.5"><div className="w-1 h-1 bg-white rounded-full" /><div className="w-1 h-1 bg-white rounded-full" /><div className="w-1 h-1 bg-white rounded-full" /></div>
                    <div className="flex gap-0.5"><div className="w-1 h-1 bg-white rounded-full" /><div className="w-1 h-1 bg-white rounded-full" /><div className="w-1 h-1 bg-white rounded-full" /></div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-2 hover:bg-white/10 rounded transition-colors"
                        title={isMaximized ? "Restore" : "Maximize"}
                    >
                        {isMaximized ? <Move className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>

            <div className={`flex-1 overflow-y-auto bg-white ${isMaximized ? 'p-12' : 'p-6'} bluebook-scroll select-text text-black`}>
                <div className="max-w-4xl mx-auto space-y-10 font-serif">
                    {/* Top Row: Circle, Rectangle, Triangle */}
                    <div className="grid grid-cols-3 gap-8">
                        {/* Circle */}
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 relative mb-4">
                                <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                    <circle cx="50" cy="50" r="1.5" fill="currentColor" />
                                    <line x1="50" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="1" />
                                </svg>
                                <div className="absolute top-[35%] left-[62%]"><MathText text={"$r$"} className="text-sm font-serif italic text-black" /></div>
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-[13px] italic"><MathText text={"$A = \\pi r^2$"} /></p>
                                <p className="text-[13px] italic"><MathText text={"$C = 2\\pi r$"} /></p>
                            </div>
                        </div>

                        {/* Rectangle */}
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 relative flex items-center justify-center mb-4">
                                <svg viewBox="0 0 100 60" className="w-full h-full text-black">
                                    <rect x="10" y="5" width="80" height="50" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                                <div className="absolute -top-3 left-[45%]"><MathText text={"$\\ell$"} className="text-sm font-serif italic text-black" /></div>
                                <div className="absolute top-[40%] -right-2"><MathText text={"$w$"} className="text-sm font-serif italic text-black" /></div>
                            </div>
                            <div className="text-center">
                                <p className="text-[13px] italic"><MathText text={"$A = \\ell w$"} /></p>
                            </div>
                        </div>

                        {/* Triangle */}
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 relative flex items-center justify-center mb-4">
                                <svg viewBox="0 0 100 80" className="w-full h-full text-black">
                                    <path d="M10 70 L90 70 L50 10 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                    <line x1="50" y1="10" x2="50" y2="70" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
                                    <rect x="50" y="62" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
                                </svg>
                                <div className="absolute -bottom-3 left-[48%]"><MathText text={"$b$"} className="text-sm font-serif italic text-black" /></div>
                                <div className="absolute top-[38%] left-[55%]"><MathText text={"$h$"} className="text-sm font-serif italic text-black" /></div>
                            </div>
                            <div className="text-center">
                                <p className="text-[13px] italic"><MathText text={"$A = \\frac{1}{2}bh$"} /></p>
                            </div>
                        </div>
                    </div>

                    {/* Second Row: Pythagorean + Special Rights */}
                    <div className="grid grid-cols-3 gap-8">
                        {/* Pythagorean */}
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 relative flex items-center justify-center mb-4">
                                <svg viewBox="0 0 100 80" className="w-full h-full text-black">
                                    <path d="M20 10 L20 70 L80 70 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                    <rect x="20" y="62" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
                                </svg>
                                <div className="absolute top-[35%] -left-1"><MathText text={"$a$"} className="text-sm font-serif italic text-black" /></div>
                                <div className="absolute -bottom-3 left-[45%]"><MathText text={"$b$"} className="text-sm font-serif italic text-black" /></div>
                                <div className="absolute top-[30%] right-[15%]"><MathText text={"$c$"} className="text-sm font-serif italic text-black" /></div>
                            </div>
                            <div className="text-center">
                                <p className="text-[13px] italic"><MathText text={"$c^2 = a^2 + b^2$"} /></p>
                            </div>
                        </div>

                        {/* 30-60-90 */}
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 relative flex items-center justify-center mb-4">
                                <svg viewBox="0 0 120 80" className="w-full h-full text-black">
                                    <path d="M20 10 L20 70 L90 70 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                    <rect x="20" y="62" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
                                </svg>
                                <div className="absolute top-[65%] right-[20%]"><MathText text={"$30^\\circ$"} className="text-[10px] text-black" /></div>
                                <div className="absolute top-[20%] left-[25%]"><MathText text={"$60^\\circ$"} className="text-[10px] text-black" /></div>
                                <div className="absolute top-[35%] -left-8"><MathText text={"$x\\sqrt{3}$"} className="text-sm font-serif italic text-black" /></div>
                                <div className="absolute -bottom-3 left-[45%]"><MathText text={"$x$"} className="text-sm font-serif italic text-black" /></div>
                                <div className="absolute top-[30%] right-[10%]"><MathText text={"$2x$"} className="text-sm font-serif italic text-black" /></div>
                            </div>
                            <div className="text-center">
                                <p className="text-[11px] font-bold uppercase tracking-tight font-sans">Special Right Triangles</p>
                            </div>
                        </div>

                        {/* 45-45-90 */}
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 relative flex items-center justify-center mb-4">
                                <svg viewBox="0 0 100 80" className="w-full h-full text-black">
                                    <path d="M20 20 L20 70 L70 70 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                    <rect x="20" y="62" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
                                </svg>
                                <div className="absolute top-[65%] right-[25%]"><MathText text={"$45^\\circ$"} className="text-[10px] text-black" /></div>
                                <div className="absolute top-[30%] left-[25%]"><MathText text={"$45^\\circ$"} className="text-[10px] text-black" /></div>
                                <div className="absolute top-[45%] -left-2"><MathText text={"$s$"} className="text-sm font-serif italic text-black" /></div>
                                <div className="absolute -bottom-3 left-[45%]"><MathText text={"$s$"} className="text-sm font-serif italic text-black" /></div>
                                <div className="absolute top-[35%] right-[2%]"><MathText text={"$s\\sqrt{2}$"} className="text-sm font-serif italic text-black" /></div>
                            </div>
                        </div>
                    </div>

                    {/* Third Row: Volumes */}
                    <div className="grid grid-cols-5 gap-4">
                        {/* Rectangular Prism */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 relative mb-2">
                                <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                                    <rect x="5" y="25" width="60" height="40" fill="none" stroke="currentColor" strokeWidth="1.2" />
                                    <path d="M5 25 L25 5 L85 5 L85 45 L65 65" fill="none" stroke="currentColor" strokeWidth="1.2" />
                                    <path d="M65 25 L85 5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                                </svg>
                                <div className="absolute -bottom-3 left-[30%]"><MathText text={"$\\ell$"} className="text-[11px] font-serif italic text-black" /></div>
                                <div className="absolute top-[52%] right-[-5px]"><MathText text={"$w$"} className="text-[11px] font-serif italic text-black" /></div>
                                <div className="absolute top-[38%] left-[-10px]"><MathText text={"$h$"} className="text-[11px] font-serif italic text-black" /></div>
                            </div>
                            <p className="text-[12px] italic mt-2"><MathText text={"$V = \\ell wh$"} /></p>
                        </div>

                        {/* Cylinder */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 relative mb-2">
                                <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                                    <ellipse cx="50" cy="20" rx="30" ry="10" fill="none" stroke="currentColor" strokeWidth="1.2" />
                                    <path d="M20 20 L20 80 A30 10 0 0 0 80 80 L80 20" fill="none" stroke="currentColor" strokeWidth="1.2" />
                                    <ellipse cx="50" cy="80" rx="30" ry="10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
                                    <line x1="50" y1="20" x2="80" y2="20" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1" />
                                </svg>
                                <div className="absolute top-[5px] left-[65%]"><MathText text={"$r$"} className="text-[11px] font-serif italic text-black" /></div>
                                <div className="absolute top-[45%] left-[-5px]"><MathText text={"$h$"} className="text-[11px] font-serif italic text-black" /></div>
                            </div>
                            <p className="text-[12px] italic mt-2"><MathText text={"$V = \\pi r^2 h$"} /></p>
                        </div>

                        {/* Sphere */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 relative mb-2">
                                <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1.2" />
                                    <ellipse cx="50" cy="50" rx="40" ry="12" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
                                    <line x1="50" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1" />
                                </svg>
                                <div className="absolute top-[42%] left-[62%]"><MathText text={"$r$"} className="text-[11px] font-serif italic text-black" /></div>
                            </div>
                            <p className="text-[12px] italic mt-2"><MathText text={"$V = \\frac{4}{3}\\pi r^3$"} /></p>
                        </div>

                        {/* Cone */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 relative mb-2">
                                <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                                    <ellipse cx="50" cy="80" rx="30" ry="10" fill="none" stroke="currentColor" strokeWidth="1.2" />
                                    <path d="M20 80 L50 10 L80 80" fill="none" stroke="currentColor" strokeWidth="1.2" />
                                    <line x1="50" y1="10" x2="50" y2="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
                                </svg>
                                <div className="absolute top-[40%] left-[58%]"><MathText text={"$h$"} className="text-[11px] font-serif italic text-black" /></div>
                                <div className="absolute bottom-[2px] right-[28%]"><MathText text={"$r$"} className="text-[11px] font-serif italic text-black" /></div>
                            </div>
                            <p className="text-[12px] italic mt-2"><MathText text={"$V = \\frac{1}{3}\\pi r^2 h$"} /></p>
                        </div>

                        {/* Pyramid */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 relative mb-2">
                                <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                                    <path d="M10 80 L50 90 L90 80 L50 10 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
                                    <path d="M50 10 L50 90" fill="none" stroke="currentColor" strokeWidth="1.2" />
                                    <path d="M10 80 L90 80" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
                                </svg>
                                <div className="absolute bottom-[-10px] left-[25%]"><MathText text={"$\\ell$"} className="text-[11px] font-serif italic text-black" /></div>
                                <div className="absolute bottom-[-5px] right-[15%]"><MathText text={"$w$"} className="text-[11px] font-serif italic text-black" /></div>
                                <div className="absolute top-[42%] left-[58%]"><MathText text={"$h$"} className="text-[11px] font-serif italic text-black" /></div>
                            </div>
                            <p className="text-[12px] italic mt-2"><MathText text={"$V = \\frac{1}{3}\\ell wh$"} /></p>
                        </div>
                    </div>

                    {/* Bottom Text Notes */}
                    <div className="pt-6 border-t border-slate-100 text-[12px] text-black italic space-y-2">
                        <p>The number of degrees of arc in a circle is 360.</p>
                        <p>The number of radians of arc in a circle is 2π.</p>
                        <p>The sum of the measures in degrees of the angles of a triangle is 180.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


const BreakScreen = ({
    onSkip,
    timeLeft,
    formatTime
}: {
    onSkip: () => void,
    timeLeft: number,
    formatTime: (s: number) => string
}) => {
    return (
        <div className="fixed inset-0 bg-[#1c1c1c] overflow-y-auto z-[100] flex flex-col md:flex-row animate-in fade-in duration-500">
            {/* Left Column - Timer & Actions */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 min-h-screen relative">
                {/* Admin Logo Position */}
                <div className="absolute bottom-8 left-8">
                    <span className="text-white font-bold text-xl tracking-tight">Testpress Admin</span>
                </div>

                <div className="flex flex-col items-center gap-12 max-w-sm w-full">
                    {/* Timer Box */}
                    <div className="w-full border border-white/30 rounded-[20px] p-8 text-center bg-transparent">
                        <p className="text-white font-bold text-[22px] mb-2 tracking-tight">Remaining Break Time:</p>
                        <div className="text-white font-bold text-7xl tracking-[-0.05em] leading-none tabular-nums">
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    {/* Resume Button */}
                    <button
                        onClick={onSkip}
                        className="bg-[#FFE000] hover:bg-[#E6C900] text-black font-bold text-[17px] px-10 py-3.5 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                        Resume Testing
                    </button>
                </div>
            </div>

            {/* Right Column - Instructions */}
            <div className="flex-1 flex flex-col justify-center p-8 md:p-16 border-l border-white/10 bg-[#1c1c1c] text-white">
                <div className="max-w-md w-full space-y-10">
                    {/* Section 1: Practice Break */}
                    <section className="space-y-6">
                        <h2 className="text-[32px] font-bold tracking-tight leading-tight">Practice Break</h2>
                        <p className="text-[17px] text-[#DDDDDD] leading-relaxed font-medium">
                            You can resume this practice test as soon as you're ready to move on. On test day, you'll wait until the clock counts down. Read below to see how breaks work on test day.
                        </p>
                    </section>

                    <hr className="border-white/20" />

                    {/* Section 2: Take a Break */}
                    <section className="space-y-6">
                        <h2 className="text-[32px] font-bold tracking-tight leading-tight">Take a Break</h2>

                        <div className="space-y-6 text-[17px] text-[#DDDDDD] leading-relaxed font-medium">
                            <p>You may leave the room, but do not disturb students who are still testing.</p>
                            <p>Do not exit the app or close your device.</p>
                            <p>Testing won't resume until you return.</p>

                            <div className="space-y-2">
                                <p className="font-bold text-white">Follow these rules during the break:</p>
                                <ol className="list-decimal pl-5 space-y-2">
                                    <li>Do not access your phone, smartwatch, textbooks, notes, or the internet.</li>
                                    <li>Do not eat or drink in the testing room.</li>
                                </ol>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

// Passage Viewer with Multi-color Highlighting
const PassageViewer = memo(({
    text,
    highlights,
    isHighlighterActive,
    onAddHighlight,
    onRemoveHighlight,
    onSelectionChange,
    theme
}: {
    text: string,
    highlights: HighlightRange[],
    isHighlighterActive: boolean,
    onAddHighlight: (range: HighlightRange) => void,
    onRemoveHighlight: (index: number) => void,
    onSelectionChange: (selection: { start: number, end: number, text: string } | null) => void,
    theme: string
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const renderedContent = useMemo(() => {
        if (!text) return '';

        const sorted = [...(highlights || [])].sort((a, b) => a.start - b.start);
        let result = [];
        let lastIndex = 0;

        const colorClasses = {
            yellow: 'bb-highlight-yellow',
            blue: 'bb-highlight-blue',
            pink: 'bb-highlight-pink'
        };

        sorted.forEach((h, idx) => {
            if (h.start < lastIndex) return;

            result.push(<MathText key={`text-${idx}`} text={text.substring(lastIndex, h.start)} className="inline" />);

            result.push(
                <mark
                    key={`mark-${idx}`}
                    className={`${colorClasses[h.color || 'yellow']} ${theme === 'dark' ? 'text-slate-900' : 'text-inherit'} rounded-sm py-0.5 cursor-pointer transition-colors px-0.5`}
                    onClick={(e) => {
                        if (isHighlighterActive) {
                            e.stopPropagation();
                            onRemoveHighlight(idx);
                        }
                    }}
                >
                    <MathText text={text.substring(h.start, h.end)} className="inline" />
                </mark>
            );

            lastIndex = h.end;
        });

        result.push(<MathText key="text-end" text={text.substring(lastIndex)} className="inline" />);
        return result;
    }, [text, highlights, isHighlighterActive, onRemoveHighlight]);

    const handleMouseUp = useCallback(() => {
        if (!isHighlighterActive || !containerRef.current) return;

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;
        if (!containerRef.current.contains(selection.anchorNode)) return;

        const range = selection.getRangeAt(0);
        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(containerRef.current);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        const start = preSelectionRange.toString().length;
        const end = start + range.toString().length;
        const selectedText = range.toString();

        if (selectedText.trim().length > 0) {
            onSelectionChange({
                start,
                end,
                text: selectedText
            });
        } else {
            onSelectionChange(null);
        }
    }, [isHighlighterActive, onSelectionChange]);

    return (
        <div
            ref={containerRef}
            onMouseUp={handleMouseUp}
            className={`font-serif text-[18px] leading-8 whitespace-pre-wrap selection:bg-indigo-500/30 ${theme === 'dark' ? 'text-white' : 'text-[#1e293b]'}`}
        >
            {renderedContent}
        </div>
    );
});

// Navigation Modal Component (Bluebook Style)
const QuestionNavigationModal = ({
    questions,
    answers,
    flags,
    currentIndex,
    onNavigateToQuestion,
    onClose,
    onGoToReview,
    stageTitle
}: {
    questions: Question[],
    answers: Record<string, string>,
    flags: Set<string | number>,
    currentIndex: number,
    onNavigateToQuestion: (idx: number) => void,
    onClose: () => void,
    onGoToReview: () => void,
    stageTitle: string
}) => {
    return (
        <div className="bb-nav-modal-overlay" onClick={onClose}>
            <div className="flex flex-col items-center max-w-[500px] w-full mt-24">
                <div className="bg-white rounded-[10px] shadow-2xl overflow-hidden w-full border border-slate-200" onClick={(e) => e.stopPropagation()}>
                    <div className="p-5 flex items-start justify-between">
                        <div className="w-8" />
                        <h3 className="text-[17px] font-bold text-[#141A29] text-center flex-1 leading-[1.3] px-4">
                            {stageTitle}: {stageTitle.includes('Section 1') ? 'Reading and Writing' : 'Math'}<br />Questions
                        </h3>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors shrink-0">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>

                    <div className="h-px bg-slate-200 w-full" />

                    <div className="flex items-center justify-center gap-6 py-5">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-800" strokeWidth={2} />
                            <span className="text-[14px] font-medium text-slate-600">Current</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-[18px] h-[18px] border-[1.5px] border-dashed border-[#A0A5B1] rounded-full" />
                            <span className="text-[14px] font-medium text-slate-600">Unanswered</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Bookmark className="w-[14px] h-[14px] text-[#DC2626] fill-[#DC2626]" />
                            <span className="text-[14px] font-medium text-slate-600">For Review</span>
                        </div>
                    </div>

                    <div className="h-px bg-slate-200 w-full" />

                    <div className="p-6 pb-2 overflow-y-auto max-h-[350px]">
                        <div className="grid grid-cols-10 gap-x-2 gap-y-6">
                            {questions.map((q, idx) => {
                                const isCurrent = currentIndex === idx;
                                const isAnswered = !!answers[q.id];
                                const isFlagged = flags.has(q.id);

                                return (
                                    <div key={idx} className="flex flex-col items-center relative">
                                        {isCurrent && (
                                            <div className="absolute -top-[22px]">
                                                <MapPin className="w-[18px] h-[18px] text-slate-900" />
                                            </div>
                                        )}
                                        <button
                                            onClick={() => {
                                                onNavigateToQuestion(idx);
                                                onClose();
                                            }}
                                            className={`
                                                w-[32px] h-[32px] rounded-[4px] flex items-center justify-center font-bold text-[14px] 
                                                transition-all hover:scale-105 active:scale-95
                                                ${isAnswered
                                                    ? 'bg-[#E1E5F2] text-[#3B5998] border border-transparent'
                                                    : 'bg-white text-slate-800 border-[1.5px] border-dashed border-slate-700'}
                                                ${isCurrent && isAnswered ? 'border-2 border-slate-900' : ''}
                                                ${isCurrent && !isAnswered ? 'border-2 border-slate-900 border-solid' : ''}
                                            `}
                                        >
                                            {idx + 1}
                                            {isFlagged && (
                                                <div className="absolute -top-1 -right-1 bg-white rounded-full p-[1px]">
                                                    <Bookmark className="w-2.5 h-2.5 text-[#DC2626] fill-[#DC2626]" />
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-8 pb-10 flex justify-center">
                        <button
                            onClick={() => {
                                onClose();
                                onGoToReview();
                            }}
                            className="h-[44px] px-8 rounded-full border border-[#345BAE] text-[#345BAE] font-bold text-[15px] hover:bg-blue-50 transition-colors"
                        >
                            Go to Review Page
                        </button>
                    </div>
                </div>
                <div className="bb-nav-modal-pointer" />
            </div>
        </div>
    );
};

const ReviewScreen = ({
    questions,
    answers,
    flags,
    onNavigateToQuestion,
    onSubmit,
    stageTitle,
    theme
}: {
    questions: Question[],
    answers: Record<string, string>,
    flags: Set<string | number>,
    onNavigateToQuestion: (idx: number) => void,
    onSubmit: () => void,
    stageTitle: string,
    theme: string
}) => {
    return (
        <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'bg-[#0F172A]' : 'bg-[#F0F2F5]'} pb-24 relative overflow-y-auto items-center justify-center`}>
            <div className="flex flex-col items-center max-w-[500px] w-full my-auto">
                <div className={`${theme === 'dark' ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'} rounded-[10px] shadow-sm border w-full overflow-hidden animate-in zoom-in-95 duration-500`}>
                    <div className="p-5 flex items-start justify-center">
                        <h3 className={`text-[17px] font-bold ${theme === 'dark' ? 'text-white' : 'text-[#141A29]'} text-center flex-1 leading-[1.3] px-4`}>
                            {stageTitle}: {stageTitle.includes('Section 1') ? 'Reading and Writing' : 'Math'}<br />Questions
                        </h3>
                    </div>

                    <div className={`h-px ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} w-full`} />

                    <div className="flex items-center justify-center gap-6 py-5">
                        <div className="flex items-center gap-2">
                            <MapPin className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-800'}`} strokeWidth={2} />
                            <span className={`text-[14px] font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Current</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-[18px] h-[18px] border-[1.5px] border-dashed ${theme === 'dark' ? 'border-slate-500' : 'border-[#A0A5B1]'} rounded-full`} />
                            <span className={`text-[14px] font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Unanswered</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Bookmark className="w-[14px] h-[14px] text-[#DC2626] fill-[#DC2626]" />
                            <span className={`text-[14px] font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>For Review</span>
                        </div>
                    </div>

                    <div className={`h-px ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} w-full`} />

                    <div className="p-6 pb-2">
                        <div className="grid grid-cols-10 gap-x-2 gap-y-6">
                            {questions.map((q, idx) => {
                                const isAnswered = !!answers[q.id];
                                const isFlagged = flags.has(q.id);

                                return (
                                    <div key={q.id} className="flex flex-col items-center relative">
                                        <button
                                            onClick={() => onNavigateToQuestion(idx)}
                                            className={`
                                                w-[32px] h-[32px] rounded-[4px] flex items-center justify-center font-bold text-[14px] 
                                                transition-all hover:scale-105 active:scale-95
                                                ${isAnswered
                                                    ? (theme === 'dark' ? 'bg-blue-900/40 text-blue-300 border border-blue-500/50' : 'bg-[#E1E5F2] text-[#3B5998]')
                                                    : (theme === 'dark' ? 'bg-transparent text-slate-300 border-[1.5px] border-dashed border-slate-600' : 'bg-white text-slate-800 border-[1.5px] border-dashed border-slate-700')}
                                            `}
                                        >
                                            {idx + 1}
                                            {isFlagged && (
                                                <div className={`absolute -top-1 -right-1 ${theme === 'dark' ? 'bg-[#1E293B]' : 'bg-white'} rounded-full p-[1px]`}>
                                                    <Bookmark className="w-2.5 h-2.5 text-[#DC2626] fill-[#DC2626]" />
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-8 pb-10 flex justify-center mt-2">
                        <button
                            onClick={onSubmit}
                            className={`h-[44px] px-8 rounded-full border ${theme === 'dark' ? 'border-blue-500 text-blue-400 hover:bg-blue-500/10' : 'border-[#345BAE] text-[#345BAE] hover:bg-blue-50'} font-bold text-[15px] transition-colors flex items-center gap-2`}
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export function TestSessionPage({ testId, onNavigate, user, profile }: TestSessionPageProps) {
    const apiBase = (import.meta as any).env?.VITE_BACKEND_URL || '';
    const [violationCount, setViolationCount] = useState(0);

    const handleViolation = useCallback(async (type: string) => {
        // Ignore minor focus losses or iframes interactions if handled by hook, 
        // but hook calls this on confirmed violation.

        setViolationCount(p => {
            const newCount = p + 1;
            // Only severe penalty after multiple warnings
            if (newCount >= 3) {
                // Trigger terminal violation state
            }
            return newCount;
        });

        // Show soft warning in UI instead of alert
        const warningMsg = type === 'fullscreen_exit' ? "Please return to fullscreen" :
            type === 'window_blur' ? "Keep focus on the test window" :
                "Security Check";

        // We can use a toast or local state to show this. 
        // For now, let's use a custom variable on window or a new state if we want to avoid re-renders?
        // Actually, state is fine.
        setLastWarning({ message: warningMsg, time: Date.now() });

        // Log to backend (silent)
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                await fetch(`${apiBase}/api/olympiad/log-violation`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ testId, type, timestamp: new Date().toISOString() })
                });
            }
        } catch (e) { console.error(e); }

    }, [testId, apiBase]);

    // ... (keep state)
    const [lastWarning, setLastWarning] = useState<{ message: string, time: number } | null>(null);

    // Auto-clear warning
    useEffect(() => {
        if (lastWarning) {
            const t = setTimeout(() => setLastWarning(null), 3000);
            return () => clearTimeout(t);
        }
    }, [lastWarning]);






    // -- State --
    const [loading, setLoading] = useState(true);
    const [screen, setScreen] = useState<'intro' | 'test' | 'review'>('intro');
    const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(false);
    const [isOlympiadMode, setIsOlympiadMode] = useState(false);
    const [stage, setStage] = useState<TestState['stage']>('rw-m1');
    const [testType, setTestType] = useState<'full' | 'math' | 'rw'>('full');
    const [totalTimeTaken, setTotalTimeTaken] = useState(0);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [m2Difficulty, setM2Difficulty] = useState<'easy' | 'hard' | null>(null);
    const [allResponses, setAllResponses] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [flags, setFlags] = useState<Set<string | number>>(new Set());
    const [struckOptions, setStruckOptions] = useState<Record<string, Set<string>>>({});
    const [highlights, setHighlights] = useState<Record<string, HighlightRange[]>>({});
    const [timeLeft, setTimeLeft] = useState(1920);
    const [showTimer, setShowTimer] = useState(true);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [isHighlighterActive, setIsHighlighterActive] = useState(false);
    const [isStrikethroughActive, setIsStrikethroughActive] = useState(false);
    const [activeHighlightColor, setActiveHighlightColor] = useState<'yellow' | 'blue' | 'pink'>('yellow');
    const [showDirections, setShowDirections] = useState(false);
    const [showReference, setShowReference] = useState(false);
    const [showNavModal, setShowNavModal] = useState(false);
    const [testDenoms, setTestDenoms] = useState({ math: 22, rw: 27 });
    const [olympiadProfile, setOlympiadProfile] = useState<{ full_name?: string; phone?: string } | null>(null);
    const [showLineReader, setShowLineReader] = useState(false);
    const [splitWidth, setSplitWidth] = useState(50); // percentage for passage
    const [isDraggingSplit, setIsDraggingSplit] = useState(false);
    const [selectionRect, setSelectionRect] = useState<{ x: number, y: number } | null>(null);
    const [currentSelection, setCurrentSelection] = useState<{ start: number, end: number, text: string } | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // Desmos calculator ref
    const calculatorRef = useRef<DesmosPanelRef>(null);

    useEffect(() => {
        (window as any).nextHighlightColor = activeHighlightColor;
    }, [activeHighlightColor]);

    const { isFullscreen, requestFullscreen } = useAntiCheat({
        enabled: screen === 'test',
        onViolation: handleViolation
    });

    useEffect(() => {
        const controller = new AbortController();
        const fetchQ = async () => {
            if (!testId || stage === 'break') return;
            setLoading(true);
            try {
                // Access Control Check for All Tests (Practice & Olympiad) - Only one attempt allowed
                if (user?.email) {
                    try {
                        const { data: { session } = {} } = await supabase.auth.getSession();
                        const statusRes = await fetch(`${apiBase}/api/olympiad/status?testId=${testId}&userEmail=${encodeURIComponent(user.email)}`, {
                            headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
                        });

                        if (statusRes.ok) {
                            const statusData = await statusRes.json();
                            if (statusData.completed && !statusData.isAdmin) {
                                console.log("Student has already completed this test, allowing retake (Unlimited mode).");
                            }
                        } else {
                            console.warn(`Status check failed with status ${statusRes.status}. Continuing with test load.`);
                        }
                    } catch (statusError) {
                        console.error("Status check fetch failed:", statusError);
                        // Continue loading questions anyway
                    }
                }

                const modPart = stage === 'rw-m1' || stage === 'math-m1' ? 'm1' : `m2-${m2Difficulty || 'hard'}`;
                const subject = stage.startsWith('rw') ? 'rw' : 'math';
                const url = `${apiBase}/api/questions?testId=${testId}&module=${modPart}&subject=${subject}`;
                const res = await fetch(url, { signal: controller.signal });
                const text = await res.text();
                let data: any = null;
                try { data = text ? JSON.parse(text) : null; } catch { data = null; }
                if (!res.ok) throw new Error((data && (data.error || data.message)) || `Request failed (${res.status})`);


                const validQuestions = (data.questions || []).map((q: any) => ({
                    ...q,
                    imageUrl: q.image_url,
                    optionImages: q.option_images,
                    explanation: q.explanation
                })).filter((q: any) => q && typeof q.text === 'string');

                setQuestions(validQuestions);
                // Don't auto-set to test, wait for intro unless already done
                if (hasEnteredFullscreen) {
                    setScreen('test');
                }
                setCurrentIndex(0);
                setAnswers({});
                setFlags(new Set());
                setHighlights({});
                setStruckOptions({});
                setTimeLeft(stage.startsWith('rw') ? 1920 : 2100);
            } catch (e: any) {
                if (e.name === 'AbortError') return;
                console.error("Fetch failed", e);
            } finally {
                setLoading(false);
            }
        };
        fetchQ();
        return () => controller.abort();
    }, [stage, testId, m2Difficulty, apiBase]);

    useEffect(() => {
        if (violationCount >= 3) {
            // Log to console but DO NOT redirect the user anymore.
            // This allows them to continue the test as requested.
            console.log("Maximum security violations reached. Violation logged to server.");
        }
    }, [violationCount]);

    // Detect Test Type (Olympiad, Math Only, RW Only, Full)
    useEffect(() => {
        const checkTestType = async () => {
            if (!testId) return;
            try {
                // Fetch all tests to find the current one (including Olympiad)
                const res = await fetch(`${apiBase}/api/tests`);
                const data = await res.json();
                const currentTest = data.tests?.find((t: any) => t.id === testId);

                if (currentTest) {
                    const hasMath = currentTest.sections?.some((s: string) => s.toLowerCase().includes('math'));
                    const hasRW = currentTest.sections?.some((s: string) => {
                        const lower = s.toLowerCase();
                        return lower.includes('reading') || lower.includes('writing') || lower.includes('rw');
                    });

                    // Set denominators from admin config
                    setTestDenoms({
                        math: parseInt(currentTest.mathq) || 22,
                        rw: (parseInt(currentTest.readingq) || 0) + (parseInt(currentTest.writingq) || 0) || 27
                    });

                    if (currentTest.is_olympiad) {
                        setStage('math-m1');
                        setIsOlympiadMode(true);
                        setTestType('math'); // Olympiad usually math only in this context
                        setTimeLeft(2100);

                        // Fetch Olympiad Profile Identity
                        const fetchProfile = async () => {
                            const { data: { session } = {} } = await supabase.auth.getSession();
                            if (session?.access_token) {
                                const pRes = await fetch(`${apiBase}/api/olympiad/profile`, {
                                    headers: { Authorization: `Bearer ${session.access_token}` }
                                });
                                const pData = await pRes.json();
                                if (pData.profile) setOlympiadProfile(pData.profile);
                            }
                        };
                        fetchProfile();
                    } else if (hasMath && !hasRW) {
                        setStage('math-m1');
                        setTestType('math');
                        setTimeLeft(2100);
                    } else if (hasRW && !hasMath) {
                        setStage('rw-m1');
                        setTestType('rw');
                        setTimeLeft(1920);
                    } else {
                        setTestType('full');
                        // Default stage is rw-m1
                    }
                }
            } catch (e) { console.error(e); }
        };
        checkTestType();
    }, [testId, apiBase]);

    useEffect(() => {
        // One interval per stage/screen, not per second.
        const t = setInterval(() => {
            setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(t);
    }, [stage, screen]);

    useEffect(() => {
        if (timeLeft !== 0) return;

        // When break ends, advance cleanly.
        if (stage === 'break') {
            setStage('math-m1');
            return;
        }

        // Do NOT auto-advance modules here; you already do that via submit flow.
        // Just stop at 0 and let UI handle next action.
    }, [timeLeft, stage]);


    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1);
        else setScreen('review');
    };

    const handleBack = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const handleModuleSubmit = () => {
        // Calculate time taken for this module
        // For Math-Only olympiad, stage is math-m1 -> math-m2
        // Allocated time depends on stage
        let allocated = 0;
        if (stage.startsWith('rw')) allocated = 1920; // 32 mins
        else if (stage.startsWith('math')) allocated = 2100; // 35 mins

        const spent = allocated - timeLeft;
        // setTotalTimeTaken is async, so we use a temp var if we were submitting immediately,
        // but since state update is fine across rerenders before final submit, we use functional update.
        // However, for the FINAL submit, we need the up-to-date value.
        // Better: Pass `currentTotal + spent` to next stages or store in state.

        const currentTotalTime = totalTimeTaken + spent;
        setTotalTimeTaken(currentTotalTime);

        const currentModuleResponses = questions.map(q => ({
            ...q,
            userAnswer: answers[q.id] || null,
            section: stage.startsWith('rw') ? 'rw' : 'math',
            module: stage
        }));

        const newTotalResponses = [...allResponses, ...currentModuleResponses];
        setAllResponses(newTotalResponses);

        if (stage === 'rw-m1') {
            setM2Difficulty('hard');
            setStage('rw-m2');
        } else if (stage === 'rw-m2') {
            if (testType === 'rw') {
                submitFinal(newTotalResponses, currentTotalTime);
            } else {
                setStage('break');
                setTimeLeft(600);
            }
        } else if (stage === 'break') {
            setStage('math-m1');
        } else if (stage === 'math-m1') {
            setM2Difficulty('hard');
            setStage('math-m2');
        } else {
            submitFinal(newTotalResponses, currentTotalTime);
        }
    };

    const submitFinal = async (finalData: any[], finalTimeTaken?: number) => {
        setLoading(true);
        try {
            // New Scoring Logic using Fixed Denominators (Admin defined)
            const rwResponses = finalData.filter(r => r.section === 'rw');
            const mathResponses = finalData.filter(r => r.section === 'math');

            const rwCorrect = rwResponses.filter(r => r.userAnswer === r.answer).length;
            const mathCorrect = mathResponses.filter(r => r.userAnswer === r.answer).length;

            // Section scores (200-800)
            // College Board Digital SAT uses multiples of 10
            const calculateSectionScore = (correct: number, total: number) => {
                if (total === 0) return 200;
                const ratio = correct / total;
                // Simple linear mapping for now, but forced to nearest 10
                let rawScore = Math.round((ratio * 600) / 10) * 10 + 200;
                return Math.min(800, Math.max(200, rawScore));
            };

            const mathTotalDenom = testDenoms.math * 2;
            const rwTotalDenom = testDenoms.rw * 2;

            const rwScore = calculateSectionScore(rwCorrect, rwTotalDenom > 0 ? rwTotalDenom : (rwResponses.length || 1));
            const mathScore = calculateSectionScore(mathCorrect, mathTotalDenom > 0 ? mathTotalDenom : (mathResponses.length || 1));

            let finalScore = 0;
            if (testType === 'full') finalScore = rwScore + mathScore;
            else if (testType === 'rw') finalScore = rwScore + 200;
            else if (testType === 'math') finalScore = mathScore + 200;

            const res = await fetch(`${apiBase}/api/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userEmail: user?.email,
                    userId: user?.id,
                    testId,
                    score: finalScore,
                    responses: finalData,
                    createdAt: new Date().toISOString(),
                    is_olympiad: isOlympiadMode,
                    timeTaken: finalTimeTaken || totalTimeTaken
                })
            });

            const contentType = res.headers.get("content-type");
            if (!res.ok) {
                let errMessage = "Failed to transmit results to Node.";
                if (contentType && contentType.includes("application/json")) {
                    const errData = await res.json();
                    errMessage = errData.message || errMessage;
                } else {
                    const text = await res.text();
                    errMessage = "Server returned an error (non-JSON).";
                    console.error("Non-JSON error response:", text.substring(0, 200));
                }
                throw new Error(errMessage);
            }

            if (!contentType || !contentType.includes("application/json")) {
                const text = await res.text();
                throw new Error(`Expected JSON response but got ${contentType}.`);
            }

            const data = await res.json();
            const resultId = data.result?.id;

            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen();
            }

            onNavigate('review', { resultId });
        } catch (e: any) {
            console.error("DEBUG: Submission failed:", e);
            alert(`Synchronization Failed: ${e.message}`);
            setLoading(false);
        }
    };

    const toggleFlag = () => {
        const qId = questions[currentIndex]?.id;
        if (!qId) return;
        setFlags(prev => {
            const next = new Set(prev);
            if (next.has(qId)) next.delete(qId);
            else next.add(qId);
            return next;
        });
    };

    const toggleStrike = (opt: string) => {
        const qId = questions[currentIndex]?.id;
        if (!qId) return;
        setStruckOptions(prev => {
            const currentSet = new Set(prev[qId] || []);
            if (currentSet.has(opt)) currentSet.delete(opt);
            else currentSet.add(opt);
            return { ...prev, [qId]: currentSet };
        });
    };

    // For split pane dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingSplit) return;
            const newWidth = (e.clientX / window.innerWidth) * 100;
            if (newWidth > 20 && newWidth < 80) {
                setSplitWidth(newWidth);
            }
        };
        const handleMouseUp = () => setIsDraggingSplit(false);

        if (isDraggingSplit) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingSplit]);

    if (loading) return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
    );

    if (screen === 'intro') {
        if (isOlympiadMode) {
            return (
                <FullscreenInterstitial
                    onStart={() => {
                        setHasEnteredFullscreen(true);
                        setScreen('test');
                        requestFullscreen();
                    }}
                />
            );
        } else {
            return (
                <PracticeIntroScreen
                    onBack={() => onNavigate('dashboard')}
                    onNext={() => {
                        setHasEnteredFullscreen(true);
                        setScreen('test');
                        requestFullscreen();
                    }}
                />
            );
        }
    }

    if (stage === 'break') return <BreakScreen timeLeft={timeLeft} formatTime={formatTime} onSkip={() => setStage('math-m1')} />;

    if (screen === 'review') return (
        <div className={`fixed inset-0 ${theme === 'dark' ? 'dark bg-[#0F172A] text-white' : 'bg-[#F2F4F7]'} flex flex-col z-50 overflow-hidden`}>
            <header className={`h-20 ${theme === 'dark' ? 'bg-[#0F172A] border-white/10' : 'bg-white border-slate-200'} border-b flex items-center justify-between px-8 shrink-0 relative z-30 shadow-sm`}>
                <div className="flex items-center gap-6">
                    <span className={`text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tight italic`}>SATVALLEY NODE</span>
                    <div className={`h-6 w-px ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'}`} />
                    <span className={`text-xs font-black ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'} uppercase tracking-widest`}>Retrospective Phase</span>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className={`font-mono text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tighter`}>
                        {formatTime(timeLeft)}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Time Remaining</span>
                </div>

                <button
                    onClick={() => setScreen('test')}
                    className={`h-11 px-8 border-2 ${theme === 'dark' ? 'border-white text-white hover:bg-white/5' : 'border-slate-900 text-slate-900 hover:bg-slate-50'} font-black rounded-xl transition-all flex items-center gap-2`}
                >
                    <ChevronLeft className="w-5 h-5" />
                    Back to Section
                </button>
            </header>

            <ReviewScreen
                questions={questions}
                answers={answers}
                flags={flags}
                onNavigateToQuestion={(idx) => { setCurrentIndex(idx); setScreen('test'); }}
                onSubmit={handleModuleSubmit}
                stageTitle={stage === 'rw-m1' ? 'Reading and Writing Module 1' :
                    stage === 'rw-m2' ? 'Reading and Writing Module 2' :
                        stage === 'math-m1' ? 'Math Module 1' : 'Math Module 2'}
                theme={theme}
            />
        </div>
    );

    // Anti-Cheat Blocking Screen
    if (isOlympiadMode && !isFullscreen && screen === 'test') {
        return (
            <div className="fixed inset-0 bg-red-900 z-[100] flex items-center justify-center p-8 text-center text-white">
                <div className="max-w-xl space-y-8">
                    <AlertCircle className="w-24 h-24 mx-auto text-red-500 bg-white rounded-full p-2" />
                    <h1 className="text-4xl font-black uppercase tracking-widest">Security Violation</h1>
                    <p className="text-xl font-bold opacity-80">You have exited Fullscreen Mode.</p>
                    <p className="opacity-60">This event has been logged. Please return to fullscreen immediately to continue your test.</p>
                    <Button onClick={requestFullscreen} className="bg-white text-red-900 hover:bg-white/90 text-xl px-8 py-6 font-black uppercase tracking-widest rounded-xl">
                        Return to Test
                    </Button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className={`fixed inset-0 ${theme === 'dark' ? 'bg-[#0F172A] text-white' : 'bg-white text-slate-900'} flex flex-col z-50 overflow-hidden font-sans select-none`}>
            {/* Soft Warning Toast */}
            {lastWarning && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="bg-amber-100 border border-amber-200 text-amber-800 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 font-bold text-sm">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        {lastWarning.message}
                    </div>
                </div>
            )}
            <header className={`h-[64px] ${theme === 'dark' ? 'bg-[#0F172A] border-b border-white/10' : 'bg-white'} flex items-center justify-between px-6 shrink-0 relative z-40`}>
                <div className="flex flex-col">
                    <h1 className={`text-[17px] font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1e293b]'} leading-tight`}>
                        {stage === 'rw-m1' ? 'Section 1, Module 1: Reading and Writing' :
                            stage === 'rw-m2' ? 'Section 1, Module 2: Reading and Writing' :
                                stage === 'math-m1' ? 'Section 2, Module 1: Math' : 'Section 2, Module 2: Math'}
                    </h1>
                    <button
                        onClick={() => setShowDirections(!showDirections)}
                        className="text-[13px] font-bold text-[#0077c8] flex items-center gap-1 mt-0.5 hover:underline"
                    >
                        Directions <ChevronDown className={`w-3 h-3 transition-transform ${showDirections ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <span className={`font-bold text-[24px] tracking-tight ${timeLeft < 300 ? 'text-rose-600' : theme === 'dark' ? 'text-white' : 'text-[#1e293b]'}`}>
                        {showTimer ? formatTime(timeLeft) : ''}
                    </span>
                    <button
                        onClick={() => setShowTimer(!showTimer)}
                        className={`px-4 py-1 border rounded font-bold text-[13px] transition-colors ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                    >
                        {showTimer ? 'Hide' : 'Show'}
                    </button>
                </div>

                <div className="flex items-center gap-6">
                    {stage.startsWith('math') ? (
                        <>
                            <button onClick={() => calculatorRef.current?.open()} className={`flex flex-col items-center gap-1 group ${theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-800 hover:text-blue-600'}`}>
                                <Calculator className="w-5 h-5 transition-colors" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Calculator</span>
                            </button>
                            <button onClick={() => setShowReference(true)} className={`flex flex-col items-center gap-1 group ${theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-800 hover:text-blue-600'}`}>
                                <Book className="w-5 h-5 transition-colors" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Reference</span>
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsHighlighterActive(!isHighlighterActive)} className={`flex flex-col items-center gap-1 group transition-colors ${isHighlighterActive ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-600') : (theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-800 hover:text-blue-600')}`}>
                            <PenLine className="w-5 h-5" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Annotate</span>
                        </button>
                    )}

                    <div className={`w-px h-8 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`} />

                    <button onClick={() => setShowMoreMenu(!showMoreMenu)} className={`flex flex-col items-center gap-1 group transition-colors ${theme === 'dark' ? 'text-white hover:text-white' : 'text-slate-800 hover:text-blue-600'}`}>
                        <MoreVertical className="w-5 h-5 transition-colors" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">More</span>
                    </button>
                </div>
            </header>

            <div className="bluebook-practice-bar">
                This is a practice test
            </div>





            {showDirections && (
                <div className={`fixed inset-x-0 top-[64px] border-b p-8 text-[15px] animate-in slide-in-from-top-2 z-50 shadow-lg ${theme === 'dark' ? 'bg-[#0F172A] border-white/10 text-white' : 'bg-[#F6F8FA] border-slate-200 text-slate-700'}`}>
                    <div className="max-w-4xl mx-auto">
                        <h2 className={`text-[20px] font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Directions</h2>
                        <p className="leading-relaxed">
                            The following passage corresponds to the question on the right. Read the passage carefully and choose the best answer to the question based on what is stated or implied in the passage.
                        </p>
                        <button
                            onClick={() => setShowDirections(false)}
                            className={`mt-6 px-6 py-2 font-bold rounded-lg transition-colors ${theme === 'dark' ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Desmos Calculator Panel - only shown in Math sections */}
            {stage.startsWith('math') && (
                <DesmosPanel ref={calculatorRef} />
            )}

            {showReference && (
                <DraggableReference onClose={() => setShowReference(false)} />
            )}

            <main className={`flex-1 flex flex-col overflow-hidden relative ${theme === 'dark' ? 'bg-[#0F172A]' : 'bg-white'}`}>


                {/* Question Bar */}
                <div className={`h-[48px] flex flex-col justify-end px-8 shrink-0 relative z-10 pt-2 pb-0 ${theme === 'dark' ? 'bg-[#0F172A] border-b border-t border-slate-800' : 'bg-slate-100/50'}`}>
                    <div className="flex items-center justify-between w-full h-full pb-1">
                        <div className="flex items-center gap-4 h-full">
                            <div className="bg-[#111111] font-bold text-[18px] w-8 h-8 flex items-center justify-center font-serif leading-none shrink-0 self-end mb-0.5" style={{ color: '#ffffff' }}>
                                {currentIndex + 1}
                            </div>
                            <button
                                onClick={toggleFlag}
                                className={`flex items-center gap-2 px-2 py-1 transition-colors text-[14px] font-medium self-end mb-1 ${flags.has(currentQ?.id || 0) ? 'text-[#0077c8]' : (theme === 'dark' ? 'text-white hover:text-white' : 'text-[#333333] hover:text-black')}`}
                            >
                                <Bookmark className={`w-4 h-5 ${flags.has(currentQ?.id || 0) ? 'fill-[#0077c8] text-[#0077c8]' : (theme === 'dark' ? 'text-slate-400' : 'text-[#666666]')}`} strokeWidth={1.5} />
                                <span className={flags.has(currentQ?.id || 0) ? 'font-bold' : ''}>Mark for Review</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-4 self-end mb-1">
                            <button
                                onClick={() => setIsStrikethroughActive(!isStrikethroughActive)}
                                className={`flex items-center justify-center w-[42px] h-[28px] rounded border transition-all ${isStrikethroughActive ? (theme === 'dark' ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-200 border-slate-400 text-slate-900') : (theme === 'dark' ? 'bg-[#1E293B] border-slate-600 text-white hover:border-slate-400' : 'bg-white border-slate-400 text-slate-800 hover:border-slate-500')}`}
                                title="Cross-out"
                            >
                                <div className="relative flex items-center justify-center">
                                    <span className="text-[13px] leading-none font-sans font-semibold tracking-tighter">ABC</span>
                                    <div className="absolute inset-0 border-b-[1.5px] border-slate-800 top-1/2 -translate-y-1/2 rotate-[-20deg] w-[calc(100%+4px)] -left-[2px]" />
                                </div>
                            </button>
                        </div>
                    </div>
                    {/* Dashed line */}
                    <div className="flex h-[2px] w-full gap-[4px] mt-auto">
                        {Array.from({ length: 40 }).map((_, i) => (
                            <div key={i} className={`h-full flex-1 ${i % 7 === 0 ? 'bg-[#FFD700]' : i % 5 === 0 ? 'bg-[#0077c8]' : (theme === 'dark' ? 'bg-slate-700' : 'bg-[#666666]')}`} />
                        ))}
                    </div>
                </div>





                <div className="flex-1 flex overflow-hidden relative">
                    {(currentQ?.passage || currentQ?.type === 'numeric' || currentQ?.type === 'spr' || (!currentQ?.options?.length && stage.startsWith('math'))) && (
                        <>
                            <div
                                className={`flex flex-col relative group/pane overflow-hidden ${theme === 'dark' ? 'bg-[#0F172A] border-r border-slate-800' : 'bg-white border-r border-slate-300'}`}
                                style={{ width: `${splitWidth}%` }}
                            >
                                <div
                                    className={`flex-1 overflow-y-auto p-12 pb-32 bluebook-scroll select-text cursor-text relative ${theme === 'dark' ? 'text-white' : ''}`}
                                    onMouseUp={(e) => {
                                        const selection = window.getSelection();
                                        if (selection && !selection.isCollapsed) {
                                            const range = selection.getRangeAt(0);
                                            const rect = range.getBoundingClientRect();
                                            setSelectionRect({ x: rect.left + rect.width / 2, y: rect.top });
                                        } else {
                                            setSelectionRect(null);
                                        }
                                    }}
                                >
                                    {currentQ?.imageUrl && <div className={`mt-8 mb-8 rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-slate-800 bg-[#1E293B]' : 'border-slate-200 bg-slate-50'}`}><img src={currentQ.imageUrl.startsWith('http') ? currentQ.imageUrl : `${apiBase}${currentQ.imageUrl}`} alt="Question Image" className="w-full h-auto" /></div>}
                                    {(currentQ?.type === 'numeric' || currentQ?.type === 'spr' || (!currentQ?.options?.length && stage.startsWith('math'))) ? (
                                        <div className={`font-serif whitespace-pre-wrap pr-4 ${theme === 'dark' ? 'text-white' : 'text-[#111827]'}`}>
                                            <h3 className="font-bold text-[20px] mb-6">Student-produced response directions</h3>
                                            <ul className="list-disc pl-5 space-y-4 text-[15px] leading-relaxed">
                                                <li>If you find <strong>more than one correct answer</strong>, enter only one answer.</li>
                                                <li>You can enter up to 5 characters for a <strong>positive</strong> answer and up to 6 characters (including the negative sign) for a <strong>negative</strong> answer.</li>
                                                <li>If your answer is a <strong>fraction</strong> that doesn't fit in the provided space, enter the decimal equivalent.</li>
                                                <li>If your answer is a <strong>decimal</strong> that doesn't fit in the provided space, enter it by truncating or rounding at the fourth digit.</li>
                                                <li>If your answer is a <strong>mixed number</strong> (such as <MathText text={"$3\\frac{1}{2}$"} className="inline font-serif font-medium" />), enter it as an improper fraction (<MathText text={"$7/2$"} className="inline font-serif font-medium" />) or its decimal equivalent (3.5).</li>
                                                <li>Don't enter <strong>symbols</strong> such as a percent sign, comma, or dollar sign.</li>
                                            </ul>
                                        </div>
                                    ) : currentQ?.passage ? (
                                        <PassageViewer
                                            text={currentQ.passage}
                                            highlights={currentQ?.id ? (highlights[currentQ.id] || []) : []}
                                            isHighlighterActive={isHighlighterActive}
                                            onAddHighlight={(range) => currentQ?.id && setHighlights(prev => ({ ...prev, [currentQ.id]: [...(prev[currentQ.id] || []), range] }))}
                                            onRemoveHighlight={(idx) => currentQ?.id && setHighlights(prev => ({ ...prev, [currentQ.id]: (prev[currentQ.id] || []).filter((_, i) => i !== idx) }))}
                                            onSelectionChange={(sel) => setCurrentSelection(sel)}
                                            theme={theme}
                                        />
                                    ) : null}
                                    {/* end of left panel logic */}

                                </div>
                                {showLineReader && <LineReader onClose={() => setShowLineReader(false)} />}
                                {selectionRect && isHighlighterActive && (
                                    <HighlightToolbar
                                        position={selectionRect}
                                        onSelectColor={(color) => {
                                            if (currentSelection && currentQ?.id) {
                                                setHighlights(prev => ({
                                                    ...prev,
                                                    [currentQ.id]: [...(prev[currentQ.id] || []), { ...currentSelection, color }]
                                                }));
                                                setCurrentSelection(null);
                                                setSelectionRect(null);
                                                window.getSelection()?.removeAllRanges();
                                            }
                                        }}
                                        onRemove={() => {
                                            setSelectionRect(null);
                                            setCurrentSelection(null);
                                            window.getSelection()?.removeAllRanges();
                                        }}
                                    />
                                )}
                            </div>

                            <div
                                className="absolute top-0 bottom-0 z-30 flex items-center justify-center"
                                style={{ left: `${splitWidth}%`, transform: 'translateX(-50%)' }}
                            >
                                <div
                                    className="bluebook-split-dragger"
                                    onMouseDown={() => setIsDraggingSplit(true)}
                                >
                                    <div className="flex flex-col gap-1">
                                        <div className="w-1 h-1 rounded-full bg-slate-400" />
                                        <div className="w-1 h-1 rounded-full bg-slate-400" />
                                        <div className="w-1 h-1 rounded-full bg-slate-400" />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div
                        className={`flex flex-col relative group/pane-right overflow-hidden ${theme === 'dark' ? 'bg-[#0F172A]' : 'bg-white'}`}
                        style={{ width: (currentQ?.passage || currentQ?.type === 'numeric' || currentQ?.type === 'spr' || (!currentQ?.options?.length && stage.startsWith('math'))) ? `${100 - splitWidth}%` : '100%' }}
                    >
                        <div className={`flex-1 overflow-y-auto p-12 pb-32 bluebook-scroll ${!(currentQ?.passage || currentQ?.type === 'numeric' || currentQ?.type === 'spr' || (!currentQ?.options?.length && stage.startsWith('math'))) ? 'max-w-4xl mx-auto w-full' : ''}`}>
                            <div className="mb-10 space-y-6">
                                {!(currentQ?.passage || currentQ?.type === 'numeric' || currentQ?.type === 'spr' || (!currentQ?.options?.length && stage.startsWith('math'))) && currentQ?.imageUrl && <div className={`mb-6 rounded-lg overflow-hidden border max-w-2xl mx-auto ${theme === 'dark' ? 'border-slate-800 bg-[#1E293B]' : 'border-slate-200 bg-slate-50'}`}><img src={currentQ.imageUrl.startsWith('http') ? currentQ.imageUrl : `${apiBase}${currentQ.imageUrl}`} alt="Question" className="w-full h-auto" /></div>}

                                {((currentQ?.type === 'numeric' || currentQ?.type === 'spr' || (!currentQ?.options?.length && stage.startsWith('math'))) && currentQ?.passage) && (
                                    <div className={`text-[18px] leading-[1.6] font-medium mb-6 ${theme === 'dark' ? 'text-white' : 'text-[#111827]'}`}>
                                        <MathText text={currentQ.passage} className="block" />
                                    </div>
                                )}
                                <p className={`text-[18px] leading-[1.6] font-medium ${theme === 'dark' ? 'text-white' : 'text-[#111827]'}`}><MathText text={currentQ?.text || ''} className="block" /></p>
                            </div>

                            <div className="space-y-4">
                                {!(currentQ?.type === 'numeric' || currentQ?.type === 'spr') && currentQ?.options?.map((opt, idx) => {
                                    const letter = ['A', 'B', 'C', 'D'][idx];
                                    const isSelected = currentQ?.id ? answers[currentQ.id] === letter : false;
                                    const isStruck = currentQ?.id ? struckOptions[currentQ.id]?.has(letter) : false;

                                    return (
                                        <div key={letter} className="flex items-center gap-4 group/opt-row">
                                            <button
                                                disabled={isStruck}
                                                onClick={() => {
                                                    setAnswers(p => ({ ...p, [currentQ.id]: letter }));
                                                }}
                                                className={`bluebook-option-button flex-1 ${isSelected ? (theme === 'dark' ? 'selected !text-white !border-blue-600 !bg-blue-900/40' : 'selected text-blue-900') : (theme === 'dark' ? '!border-slate-700 !bg-slate-800/50 hover:!bg-slate-800 !text-white' : '')} ${isStruck ? 'struck hover:border-slate-300' : ''}`}
                                            >
                                                <div className={`bluebook-option-letter ${theme === 'dark' ? (!isSelected ? '!border-slate-600 !bg-slate-900 !text-white font-bold' : '!border-blue-500 !text-white font-black !bg-blue-600') : ''}`}>{letter}</div>
                                                <div className="flex-1 flex flex-col gap-2">
                                                    <span className={`text-[16px] leading-relaxed font-bold ${isStruck ? 'line-through text-slate-500' : (theme === 'dark' ? 'text-white' : 'text-slate-800')}`}>
                                                        <MathText text={opt} />
                                                    </span>
                                                    {currentQ.optionImages?.[idx] && (
                                                        <div className={`mt-2 rounded border overflow-hidden max-w-sm ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                                                            <img src={currentQ.optionImages[idx].startsWith('http') ? currentQ.optionImages[idx] : `${apiBase}${currentQ.optionImages[idx]}`} alt={`Option ${letter}`} className={`w-full h-auto ${theme === 'dark' ? 'invert opacity-90' : ''}`} />
                                                        </div>
                                                    )}
                                                </div>
                                            </button>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleStrike(letter); }}
                                                className={`bluebook-eliminate-circle ${theme === 'dark' ? '!text-slate-400 !bg-slate-900 !border-slate-600 hover:!border-slate-400 hover:!text-slate-200' : ''} ${isStruck ? (theme === 'dark' ? 'active !bg-slate-800 !border-slate-700 !text-slate-500' : 'active') : 'opacity-0 group-hover/opt-row:opacity-100'}`}
                                                title="Eliminate"
                                            >
                                                <span>{letter}</span>
                                                {isStruck && <div className="bb-slash" />}
                                            </button>
                                        </div>
                                    );
                                })}
                                {(currentQ?.type === 'numeric' || currentQ?.type === 'spr' || !currentQ?.options || currentQ.options.length === 0) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-8 space-y-8"
                                    >
                                        <div className="w-[124px]">
                                            <Input
                                                value={currentQ?.id ? (answers[currentQ.id] || '') : ''}
                                                onChange={(e) => currentQ?.id && setAnswers(p => ({ ...p, [currentQ.id]: e.target.value }))}
                                                maxLength={6}
                                                className={`h-[44px] text-[18px] font-bold border focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md transition-all px-3 tracking-widest text-center ${theme === 'dark' ? 'bg-[#1E293B] text-white border-slate-600' : 'bg-white text-[#111827] border-slate-900'}`}
                                            />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`font-black text-[18px] ${theme === 'dark' ? 'text-white' : 'text-[#111827]'}`}>Answer Preview:</div>
                                            <div className={`text-[20px] tracking-wider min-h-[30px] font-serif pt-1 ${theme === 'dark' ? 'text-white' : 'text-[#111827]'}`}>
                                                <MathText text={currentQ?.id && answers[currentQ.id] ? answers[currentQ.id] : ''} />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {showMoreMenu && (
                <div className={`fixed top-[60px] right-6 border shadow-2xl rounded-xl z-50 p-2 min-w-[220px] animate-in fade-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-[#1E293B] border-slate-700 text-slate-200' : 'bg-white border-slate-200'}`}>
                    <button
                        onClick={() => { setShowLineReader(true); setShowMoreMenu(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[14px] font-bold transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                        <Accessibility className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                        <span>Line Reader</span>
                    </button>

                    <button
                        onClick={() => {
                            setTheme(theme === 'light' ? 'dark' : 'light');
                            setShowMoreMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[14px] font-bold transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                        {theme === 'light' ? <EyeOff className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} /> : <Eye className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />}
                        <span>{theme === 'light' ? 'Dark Theme' : 'Light Mode'}</span>
                    </button>
                    <button
                        onClick={() => { setShowMoreMenu(false); alert("Help dialog would open here."); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[14px] font-bold transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                        <HelpIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                        <span>Help</span>
                    </button>
                    <div className={`h-px my-1 mx-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`} />
                    <button
                        onClick={() => {
                            setShowMoreMenu(false);
                            onNavigate('dashboard');
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[14px] font-bold transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-rose-400' : 'hover:bg-slate-50 text-rose-600'}`}
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Save and Exit</span>
                    </button>
                </div>
            )}

            <footer className={`h-[72px] flex items-center justify-between px-6 shrink-0 z-40 ${theme === 'dark' ? 'bg-[#0F172A] border-t border-white/10' : 'bg-white border-t border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${theme === 'dark' ? 'bg-[#1E293B] border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                        <span className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-500'}`}>
                            {(olympiadProfile?.full_name || profile?.full_name || user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-[14px] font-black tracking-tight leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {olympiadProfile?.full_name || profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                        </span>
                    </div>
                </div>

                {/* Question Navigation Pill (Bluebook Style) */}
                <div className="absolute left-1/2 -translate-x-1/2">
                    <button
                        onClick={() => setShowNavModal(true)}
                        className={`bluebook-nav-button ${theme === 'dark' ? '!bg-slate-800 !text-slate-200 !border-slate-700 hover:!bg-slate-700' : ''}`}
                    >
                        <span>Question {currentIndex + 1} of {questions.length}</span>
                        <ChevronDown className="w-4 h-4 ml-2 rotate-180" />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        disabled={currentIndex === 0}
                        onClick={handleBack}
                        className={`h-10 px-6 rounded-lg font-bold text-[14px] border border-slate-300 transition-all focus:outline-none focus:ring-0 ${currentIndex === 0 ? "bg-[#111827] text-white" : (theme === 'dark' ? 'bg-transparent text-slate-200 hover:bg-white/5 border-slate-600' : 'bg-transparent text-black')}`}
                    >
                        Back
                    </button>
                    <button
                        onClick={handleNext}
                        className={`h-10 px-8 rounded-lg text-white font-bold text-[14px] transition-all ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-[#111827] hover:bg-slate-800'}`}
                    >
                        {currentIndex === questions.length - 1 ? 'Review' : 'Next'}
                    </button>
                </div>
            </footer>

            {/* Question Navigation Modal */}
            {showNavModal && (
                <QuestionNavigationModal
                    questions={questions}
                    answers={answers}
                    flags={flags}
                    currentIndex={currentIndex}
                    onNavigateToQuestion={setCurrentIndex}
                    onClose={() => setShowNavModal(false)}
                    onGoToReview={() => setScreen('review')}
                    stageTitle={stage === 'rw-m1' ? 'Section 1, Module 1: Reading and Writing' :
                        stage === 'rw-m2' ? 'Section 1, Module 2: Reading and Writing' :
                            stage === 'math-m1' ? 'Section 2, Module 1: Math' : 'Section 2, Module 2: Math'}
                />
            )}
        </div>
    );
}
