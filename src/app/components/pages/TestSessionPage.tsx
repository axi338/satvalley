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
    Settings,
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
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { DesmosPanel, type DesmosPanelRef } from '../ui/DesmosPanel';

// --- Types ---
interface TestSessionPageProps {
    testId?: string;
    onNavigate: (page: string, params?: any) => void;
    user: any;
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
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="black" strokeWidth="1.5" />
                                    <circle cx="50" cy="50" r="1.5" fill="black" />
                                    <line x1="50" y1="50" x2="90" y2="50" stroke="black" strokeWidth="1" />
                                    <text x="70" y="45" fontSize="12" className="italic" fill="black">r</text>
                                </svg>
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-[13px] italic">A = πr²</p>
                                <p className="text-[13px] italic">C = 2πr</p>
                            </div>
                        </div>

                        {/* Rectangle */}
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 flex items-center justify-center mb-4">
                                <svg viewBox="0 0 100 60" className="w-full max-h-full text-black">
                                    <rect x="10" y="5" width="80" height="50" fill="none" stroke="black" strokeWidth="1.5" />
                                    <text x="50" y="0" fontSize="12" className="italic" textAnchor="middle" alignmentBaseline="hanging" fill="black">ℓ</text>
                                    <text x="95" y="30" fontSize="12" className="italic" alignmentBaseline="middle" fill="black">w</text>
                                </svg>
                            </div>
                            <div className="text-center">
                                <p className="text-[13px] italic">A = ℓw</p>
                            </div>
                        </div>

                        {/* Triangle */}
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 flex items-center justify-center mb-4">
                                <svg viewBox="0 0 100 80" className="w-full max-h-full text-black">
                                    <path d="M10 70 L90 70 L50 10 Z" fill="none" stroke="black" strokeWidth="1.5" />
                                    <line x1="50" y1="10" x2="50" y2="70" stroke="black" strokeWidth="1" strokeDasharray="3 2" />
                                    <rect x="50" y="62" width="8" height="8" fill="none" stroke="black" strokeWidth="1" />
                                    <text x="50" y="78" fontSize="12" className="italic" textAnchor="middle" fill="black">b</text>
                                    <text x="56" y="40" fontSize="12" className="italic" fill="black">h</text>
                                </svg>
                            </div>
                            <div className="text-center">
                                <p className="text-[13px] italic">A = ½bh</p>
                            </div>
                        </div>
                    </div>

                    {/* Second Row: Pythagorean + Special Rights */}
                    <div className="grid grid-cols-3 gap-8">
                        {/* Pythagorean */}
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 flex items-center justify-center mb-4">
                                <svg viewBox="0 0 100 80" className="w-full max-h-full text-black">
                                    <path d="M20 10 L20 70 L80 70 Z" fill="none" stroke="black" strokeWidth="1.5" />
                                    <rect x="20" y="62" width="8" height="8" fill="none" stroke="black" strokeWidth="1" />
                                    <text x="10" y="40" fontSize="12" className="italic" alignmentBaseline="middle" fill="black">b</text>
                                    <text x="50" y="78" fontSize="12" className="italic" textAnchor="middle" fill="black">a</text>
                                    <text x="55" y="35" fontSize="12" className="italic" fill="black">c</text>
                                </svg>
                            </div>
                            <div className="text-center">
                                <p className="text-[13px] italic">c² = a² + b²</p>
                            </div>
                        </div>

                        {/* 30-60-90 */}
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 flex items-center justify-center mb-4">
                                <svg viewBox="0 0 120 80" className="w-full max-h-full text-black">
                                    <path d="M20 10 L20 70 L90 70 Z" fill="none" stroke="black" strokeWidth="1.5" />
                                    <rect x="20" y="62" width="8" height="8" fill="none" stroke="black" strokeWidth="1" />
                                    <text x="75" y="65" fontSize="10" fill="black">30°</text>
                                    <text x="25" y="25" fontSize="10" fill="black">60°</text>
                                    <text x="5" y="40" fontSize="12" className="italic" alignmentBaseline="middle" fill="black">x√3</text>
                                    <text x="55" y="78" fontSize="12" className="italic" textAnchor="middle" fill="black">x</text>
                                    <text x="60" y="35" fontSize="12" className="italic" fill="black">2x</text>
                                </svg>
                            </div>
                            <div className="text-center">
                                <p className="text-[11px] font-bold uppercase tracking-tight font-sans">Special Right Triangles</p>
                            </div>
                        </div>

                        {/* 45-45-90 */}
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 flex items-center justify-center mb-4">
                                <svg viewBox="0 0 100 80" className="w-full max-h-full text-black">
                                    <path d="M20 20 L20 70 L70 70 Z" fill="none" stroke="black" strokeWidth="1.5" />
                                    <rect x="20" y="62" width="8" height="8" fill="none" stroke="black" strokeWidth="1" />
                                    <text x="55" y="65" fontSize="10" fill="black">45°</text>
                                    <text x="25" y="35" fontSize="10" fill="black">45°</text>
                                    <text x="10" y="45" fontSize="12" className="italic" alignmentBaseline="middle" fill="black">s</text>
                                    <text x="45" y="78" fontSize="12" className="italic" textAnchor="middle" fill="black">s</text>
                                    <text x="48" y="40" fontSize="12" className="italic" fill="black">s√2</text>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Third Row: Volumes */}
                    <div className="grid grid-cols-5 gap-4">
                        {/* Rectangular Prism */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 mb-2">
                                <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                                    <rect x="5" y="25" width="60" height="40" fill="none" stroke="black" strokeWidth="1.2" />
                                    <path d="M5 25 L25 5 L85 5 L85 45 L65 65" fill="none" stroke="black" strokeWidth="1.2" />
                                    <path d="M65 25 L85 5" fill="none" stroke="black" strokeWidth="1.2" />
                                    <text x="35" y="75" fontSize="10" className="italic" textAnchor="middle" fill="black">ℓ</text>
                                    <text x="75" y="60" fontSize="10" className="italic" fill="black">w</text>
                                    <text x="0" y="45" fontSize="10" className="italic" fill="black">h</text>
                                </svg>
                            </div>
                            <p className="text-[12px] italic">V = ℓwh</p>
                        </div>

                        {/* Cylinder */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 mb-2">
                                <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                                    <ellipse cx="50" cy="20" rx="30" ry="10" fill="none" stroke="black" strokeWidth="1.2" />
                                    <path d="M20 20 L20 80 A30 10 0 0 0 80 80 L80 20" fill="none" stroke="black" strokeWidth="1.2" />
                                    <ellipse cx="50" cy="80" rx="30" ry="10" fill="none" stroke="black" strokeWidth="1.2" strokeDasharray="3 2" />
                                    <line x1="50" y1="20" x2="80" y2="20" stroke="black" strokeWidth="1" strokeDasharray="2 1" />
                                    <text x="65" y="17" fontSize="10" className="italic" fill="black">r</text>
                                    <text x="10" y="55" fontSize="10" className="italic" fill="black">h</text>
                                </svg>
                            </div>
                            <p className="text-[12px] italic">V = πr²h</p>
                        </div>

                        {/* Sphere */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 mb-2">
                                <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="black" strokeWidth="1.2" />
                                    <ellipse cx="50" cy="50" rx="40" ry="12" fill="none" stroke="black" strokeWidth="1" strokeDasharray="3 2" />
                                    <line x1="50" y1="50" x2="90" y2="50" stroke="black" strokeWidth="1" strokeDasharray="2 1" />
                                    <text x="70" y="47" fontSize="10" className="italic" fill="black">r</text>
                                </svg>
                            </div>
                            <p className="text-[12px] italic">V = ⁴/₃πr³</p>
                        </div>

                        {/* Cone */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 mb-2">
                                <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                                    <ellipse cx="50" cy="80" rx="30" ry="10" fill="none" stroke="black" strokeWidth="1.2" />
                                    <path d="M20 80 L50 10 L80 80" fill="none" stroke="black" strokeWidth="1.2" />
                                    <line x1="50" y1="10" x2="50" y2="80" stroke="black" strokeWidth="1" strokeDasharray="3 2" />
                                    <text x="54" y="45" fontSize="10" className="italic" fill="black">h</text>
                                    <text x="65" y="88" fontSize="10" className="italic" fill="black">r</text>
                                </svg>
                            </div>
                            <p className="text-[12px] italic">V = ¹/₃πr²h</p>
                        </div>

                        {/* Pyramid */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 mb-2">
                                <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                                    <path d="M10 80 L50 90 L90 80 L50 10 Z" fill="none" stroke="black" strokeWidth="1.2" />
                                    <path d="M50 10 L50 90" fill="none" stroke="black" strokeWidth="1.2" />
                                    <path d="M10 80 L90 80" fill="none" stroke="black" strokeWidth="1" strokeDasharray="3 2" />
                                    <text x="30" y="92" fontSize="10" className="italic" fill="black">ℓ</text>
                                    <text x="75" y="92" fontSize="10" className="italic" fill="black">w</text>
                                    <text x="54" y="50" fontSize="10" className="italic" fill="black">h</text>
                                </svg>
                            </div>
                            <p className="text-[12px] italic">V = ¹/₃ℓwh</p>
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
    onSelectionChange
}: {
    text: string,
    highlights: HighlightRange[],
    isHighlighterActive: boolean,
    onAddHighlight: (range: HighlightRange) => void,
    onRemoveHighlight: (index: number) => void,
    onSelectionChange: (selection: { start: number, end: number, text: string } | null) => void
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

            result.push(<span key={`text-${idx}`}>{text.substring(lastIndex, h.start)}</span>);

            result.push(
                <mark
                    key={`mark-${idx}`}
                    className={`${colorClasses[h.color || 'yellow']} text-inherit rounded-sm py-0.5 cursor-pointer transition-colors px-0.5`}
                    onClick={(e) => {
                        if (isHighlighterActive) {
                            e.stopPropagation();
                            onRemoveHighlight(idx);
                        }
                    }}
                >
                    {text.substring(h.start, h.end)}
                </mark>
            );

            lastIndex = h.end;
        });

        result.push(<span key="text-end">{text.substring(lastIndex)}</span>);
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
            className="font-serif text-[18px] leading-8 text-slate-900 whitespace-pre-wrap selection:bg-indigo-100 selection:text-indigo-900"
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
    stageTitle
}: {
    questions: Question[],
    answers: Record<string, string>,
    flags: Set<string | number>,
    onNavigateToQuestion: (idx: number) => void,
    onSubmit: () => void,
    stageTitle: string
}) => {
    return (
        <div className="flex flex-col min-h-screen bg-[#F0F2F5] pb-24 relative overflow-y-auto items-center justify-center">
            <div className="flex flex-col items-center max-w-[500px] w-full my-auto">
                <div className="bg-white rounded-[10px] shadow-sm border border-slate-200 w-full overflow-hidden animate-in zoom-in-95 duration-500">
                    <div className="p-5 flex items-start justify-center">
                        <h3 className="text-[17px] font-bold text-[#141A29] text-center flex-1 leading-[1.3] px-4">
                            {stageTitle}: {stageTitle.includes('Section 1') ? 'Reading and Writing' : 'Math'}<br />Questions
                        </h3>
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
                                                    ? 'bg-[#E1E5F2] text-[#3B5998] border border-transparent'
                                                    : 'bg-white text-slate-800 border-[1.5px] border-dashed border-slate-700'}
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

                    <div className="p-8 pb-10 flex justify-center mt-2">
                        <button
                            onClick={onSubmit}
                            className="h-[44px] px-8 rounded-full border border-[#345BAE] text-[#345BAE] font-bold text-[15px] hover:bg-blue-50 transition-colors flex items-center gap-2"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export function TestSessionPage({ testId, onNavigate, user }: TestSessionPageProps) {
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

    // Desmos calculator ref
    const calculatorRef = useRef<DesmosPanelRef>(null);

    useEffect(() => {
        (window as any).nextHighlightColor = activeHighlightColor;
    }, [activeHighlightColor]);

    const { isFullscreen, requestFullscreen } = useAntiCheat({
        enabled: isOlympiadMode && screen === 'test',
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
                    const { data: { session } = {} } = await supabase.auth.getSession();
                    const statusRes = await fetch(`${apiBase}/api/olympiad/status?testId=${testId}&userEmail=${encodeURIComponent(user.email)}`, {
                        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
                    });
                    const statusData = await statusRes.json();

                    if (statusData.completed && !statusData.isAdmin) {
                        // For Olympiad tests, we might want to keep the restriction.
                        // But the user asked for "without limits", so we'll bypass this for practice tests.
                        console.log("Student has already completed this test, allowing retake (Unlimited mode).");
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
                    optionImages: q.option_images
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
                    testId,
                    score: finalScore,
                    responses: finalData,
                    createdAt: new Date().toISOString(),
                    is_olympiad: isOlympiadMode,
                    timeTaken: finalTimeTaken || totalTimeTaken
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || "Failed to transmit results to Node.");
            }

            const data = await res.json();
            const resultId = data.result?.id;

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

    const [colorMode, setColorMode] = useState<'light' | 'reverse'>('light');
    const [activeModal, setActiveModal] = useState<'none' | 'settings' | 'help' | 'exit'>('none');

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveModal('none');
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    const handleSaveAndExit = () => {
        onNavigate('dashboard');
    };

    if (loading) return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
    );

    if (screen === 'intro') {
        return (
            <FullscreenInterstitial
                onStart={() => {
                    setHasEnteredFullscreen(true);
                    setScreen('test');
                }}
            />
        );
    }

    if (stage === 'break') return <BreakScreen timeLeft={timeLeft} formatTime={formatTime} onSkip={() => setStage('math-m1')} />;

    if (screen === 'review') return (
        <div className={`fixed inset-0 bg-[#F2F4F7] flex flex-col z-50 overflow-hidden ${colorMode === 'reverse' ? 'color-reverse' : ''}`}>
            <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-30 shadow-sm">
                <div className="flex items-center gap-6">
                    <span className="text-sm font-black text-slate-900 tracking-tight italic">SATVALLEY NODE</span>
                    <div className="h-6 w-px bg-slate-200" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Retrospective Phase</span>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="font-mono text-xl font-black text-slate-900 tracking-tighter">
                        {formatTime(timeLeft)}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Time Remaining</span>
                </div>

                <button
                    onClick={() => setScreen('test')}
                    className="h-11 px-8 border-2 border-slate-900 text-slate-900 font-black rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
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
        <div className={`fixed inset-0 bg-white flex flex-col z-50 overflow-hidden font-sans select-none ${colorMode === 'reverse' ? 'color-reverse font-medium' : ''}`}>
            {/* Modals */}
            <AnimatePresence>
                {/* ... existing modals ... */}
            </AnimatePresence>

            {/* Soft Warning Toast */}
            {lastWarning && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="bg-amber-100 border border-amber-200 text-amber-800 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 font-bold text-sm">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        {lastWarning.message}
                    </div>
                </div>
            )}
            <header className="h-[64px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 relative z-40 transition-colors">
                <div className="flex flex-col">
                    <h1 className="text-[17px] font-bold text-slate-900 leading-tight">
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
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveModal('settings')} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"><Settings className="w-5 h-5" /></button>
                    <button onClick={() => setActiveModal('help')} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"><HelpIcon className="w-5 h-5" /></button>
                    <button onClick={() => setActiveModal('exit')} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-100">Exit Test</button>
                </div>
            </header>

            <AnimatePresence>
                {activeModal === 'settings' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('none')} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
                            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <Settings className="w-6 h-6 text-indigo-500" />
                                Accessibility Settings
                            </h2>
                            <div className="space-y-6">
                                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-4">Color Mode</span>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setColorMode('light')} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${colorMode === 'light' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                                            <div className="w-full h-8 bg-white border border-slate-200 rounded shadow-sm" />
                                            <span className="text-xs font-bold">Standard</span>
                                        </button>
                                        <button onClick={() => setColorMode('reverse')} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${colorMode === 'reverse' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-[#1e293b] text-slate-600 hover:border-slate-400'}`}>
                                            <div className="w-full h-8 bg-black border border-white/20 rounded shadow-sm" />
                                            <span className="text-xs font-bold font-black">Reverse Contrast</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setActiveModal('none')} className="w-full mt-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">Done</button>
                        </motion.div>
                    </div>
                )}

                {activeModal === 'help' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('none')} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
                            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <HelpIcon className="w-6 h-6 text-indigo-500" />
                                Support & Instructions
                            </h2>
                            <div className="space-y-6 max-h-[60vh] overflow-y-auto bluebook-scroll pr-4">
                                <section>
                                    <h3 className="font-bold text-slate-900 mb-2">Test Navigation</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">Use the 'Next' and 'Back' buttons to move between questions. You can also click the bottom navigation bar to jump to any question in the module.</p>
                                </section>
                                <section>
                                    <h3 className="font-bold text-slate-900 mb-2">Accommodations</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">The 'More' menu provides access to the <strong>Line Reader</strong> and <strong>Contrast Settings</strong> to assist during your exam.</p>
                                </section>
                                <section>
                                    <h3 className="font-bold text-slate-900 mb-2">Technical Assistance</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">If the application becomes unresponsive, your progress is automatically saved to the cloud. Simply refresh the page to resume.</p>
                                </section>
                            </div>
                            <button onClick={() => setActiveModal('none')} className="w-full mt-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors">Return to Test</button>
                        </motion.div>
                    </div>
                )}

                {activeModal === 'exit' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('none')} className="absolute inset-0 bg-rose-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center">
                            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <LogOut className="w-8 h-8 text-rose-600" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2 italic">Save and Exit</h2>
                            <p className="text-sm text-slate-500 mb-8 font-medium">Are you sure you want to pause your test? Your current progress will be preserved.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setActiveModal('none')} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                                <button onClick={handleSaveAndExit} className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-500 transition-colors">Exit Test</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {showDirections && (
                <div className="fixed inset-x-0 top-[64px] bg-[#F6F8FA] border-b border-slate-200 p-8 text-[15px] text-slate-700 animate-in slide-in-from-top-2 z-50 shadow-lg">
                    <div className="max-w-4xl mx-auto">
                        <h3 className="font-bold text-slate-900 mb-4 text-lg">Directions</h3>
                        <p className="leading-relaxed">
                            {stage.startsWith('rw')
                                ? "The questions in this section address a number of important reading and writing skills. Each question includes one or more passages, which may include a table or graph. Read each passage and question carefully, and then choose the best answer to the question based on the passage(s). All questions in this section are multiple-choice with four answer choices. Each question has a single best answer."
                                : "The questions in this section address a number of important math skills. All questions in this section are multiple-choice with four answer choices. Each question has a single best answer."}
                        </p>
                        <button
                            onClick={() => setShowDirections(false)}
                            className="mt-6 px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
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

            <main className="flex-1 flex flex-col overflow-hidden bg-white relative">


                {/* Question Bar */}
                <div className="h-[48px] bg-slate-100/50 flex flex-col justify-end px-8 shrink-0 relative z-10 pt-2 pb-0">
                    <div className="flex items-center justify-between w-full h-full pb-1">
                        <div className="flex items-center gap-4 h-full">
                            <div className="bg-[#111111] text-white font-bold text-[18px] w-8 h-8 flex items-center justify-center font-serif leading-none shrink-0 self-end mb-0.5">
                                {currentIndex + 1}
                            </div>
                            <button
                                onClick={toggleFlag}
                                className={`flex items-center gap-2 px-2 py-1 transition-colors text-[14px] font-medium self-end mb-1 ${flags.has(currentQ?.id || 0) ? 'text-[#0077c8]' : 'text-slate-900 hover:text-black'}`}
                            >
                                <Bookmark className={`w-4 h-5 ${flags.has(currentQ?.id || 0) ? 'fill-[#0077c8] text-[#0077c8]' : 'text-[#666666]'}`} strokeWidth={1.5} />
                                <span className={flags.has(currentQ?.id || 0) ? 'font-bold' : ''}>Mark for Review</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-4 self-end mb-1">
                            <button
                                onClick={() => setIsStrikethroughActive(!isStrikethroughActive)}
                                className={`flex items-center justify-center w-[42px] h-[28px] rounded border transition-all ${isStrikethroughActive ? 'bg-slate-200 border-slate-400 text-slate-900' : 'bg-white border-slate-400 text-slate-800 hover:border-slate-500'}`}
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
                            <div key={i} className={`h-full flex-1 ${i % 7 === 0 ? 'bg-[#FFD700]' : i % 5 === 0 ? 'bg-[#0077c8]' : 'bg-[#666666]'}`} />
                        ))}
                    </div>
                </div>





                <div className="flex-1 flex overflow-hidden relative">
                    {(currentQ?.passage || currentQ?.type === 'numeric' || currentQ?.type === 'spr' || (!currentQ?.options?.length && stage.startsWith('math'))) && (
                        <>
                            <div
                                className="border-r border-slate-300 bg-white flex flex-col relative group/pane overflow-hidden"
                                style={{ width: `${splitWidth}%` }}
                            >
                                <div
                                    className="flex-1 overflow-y-auto p-12 pb-32 bluebook-scroll select-text cursor-text relative"
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
                                    {currentQ?.imageUrl && <div className="mt-8 mb-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50"><img src={currentQ.imageUrl.startsWith('http') ? currentQ.imageUrl : `${apiBase}${currentQ.imageUrl}`} alt="Question Image" className="w-full h-auto" /></div>}
                                    {currentQ?.passage ? (
                                        <PassageViewer
                                            text={currentQ.passage}
                                            highlights={currentQ?.id ? (highlights[currentQ.id] || []) : []}
                                            isHighlighterActive={isHighlighterActive}
                                            onAddHighlight={(range) => currentQ?.id && setHighlights(prev => ({ ...prev, [currentQ.id]: [...(prev[currentQ.id] || []), range] }))}
                                            onRemoveHighlight={(idx) => currentQ?.id && setHighlights(prev => ({ ...prev, [currentQ.id]: (prev[currentQ.id] || []).filter((_, i) => i !== idx) }))}
                                            onSelectionChange={(sel) => setCurrentSelection(sel)}
                                        />
                                    ) : (
                                        <div className="font-serif text-slate-900 whitespace-pre-wrap pr-4">
                                            <h3 className="font-bold text-[20px] mb-6">Student-produced response directions</h3>
                                            <ul className="list-disc pl-5 space-y-4 text-[15px] leading-relaxed">
                                                <li>If you find <strong>more than one correct answer</strong>, enter only one answer.</li>
                                                <li>You can enter up to 5 characters for a <strong>positive</strong> answer and up to 6 characters (including the negative sign) for a <strong>negative</strong> answer.</li>
                                                <li>If your answer is a <strong>fraction</strong> that doesn't fit in the provided space, enter the decimal equivalent.</li>
                                                <li>If your answer is a <strong>decimal</strong> that doesn't fit in the provided space, enter it by truncating or rounding at the fourth digit.</li>
                                                <li>If your answer is a <strong>mixed number</strong> (such as 3 1/2), enter it as an improper fraction (7/2) or its decimal equivalent (3.5).</li>
                                                <li>Don't enter <strong>symbols</strong> such as a percent sign, comma, or dollar sign.</li>
                                            </ul>
                                        </div>
                                    )}

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
                        className="bg-white flex flex-col relative group/pane-right overflow-hidden"
                        style={{ width: (currentQ?.passage || currentQ?.type === 'numeric' || currentQ?.type === 'spr' || (!currentQ?.options?.length && stage.startsWith('math'))) ? `${100 - splitWidth}%` : '100%' }}
                    >
                        <div className={`flex-1 overflow-y-auto p-12 pb-32 bluebook-scroll ${!(currentQ?.passage || currentQ?.type === 'numeric' || currentQ?.type === 'spr' || (!currentQ?.options?.length && stage.startsWith('math'))) ? 'max-w-4xl mx-auto w-full' : ''}`}>
                            <div className="mb-10 space-y-6">
                                {!(currentQ?.passage || currentQ?.type === 'numeric' || currentQ?.type === 'spr' || (!currentQ?.options?.length && stage.startsWith('math'))) && currentQ?.imageUrl && <div className="mb-6 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 max-w-2xl mx-auto"><img src={currentQ.imageUrl.startsWith('http') ? currentQ.imageUrl : `${apiBase}${currentQ.imageUrl}`} alt="Question" className="w-full h-auto" /></div>}
                                <p className="text-[18px] leading-[1.6] text-slate-900 font-medium"><MathText text={currentQ?.text} className="block" /></p>
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
                                                className={`bluebook-option-button flex-1 ${isSelected ? 'selected text-blue-900' : ''} ${isStruck ? 'struck' : ''}`}
                                            >
                                                <div className="bluebook-option-letter">{letter}</div>
                                                <div className="flex-1 flex flex-col gap-2">
                                                    <span className={`text-[16px] leading-relaxed text-slate-800 font-medium ${isStruck ? 'line-through text-slate-400' : ''}`}>
                                                        <MathText text={opt} />
                                                    </span>
                                                    {currentQ.optionImages?.[idx] && (
                                                        <div className="mt-2 rounded border border-slate-200 overflow-hidden bg-white max-w-sm">
                                                            <img src={currentQ.optionImages[idx].startsWith('http') ? currentQ.optionImages[idx] : `${apiBase}${currentQ.optionImages[idx]}`} alt={`Option ${letter}`} className="w-full h-auto" />
                                                        </div>
                                                    )}
                                                </div>
                                            </button>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleStrike(letter); }}
                                                className={`bluebook-eliminate-circle ${isStruck ? 'active' : 'opacity-0 group-hover/opt-row:opacity-100'}`}
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
                                        <div className="w-[120px]">
                                            <Input
                                                value={currentQ?.id ? (answers[currentQ.id] || '') : ''}
                                                onChange={(e) => currentQ?.id && setAnswers(p => ({ ...p, [currentQ.id]: e.target.value }))}
                                                className="h-[52px] text-[20px] bg-white text-slate-900 font-medium border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md transition-all px-4 tracking-wider"
                                            />
                                        </div>
                                        <div>
                                            <div className="font-bold text-[18px] text-slate-900 mb-2">Answer Preview:</div>
                                            <div className="text-[20px] text-slate-900 tracking-wider min-h-[30px]">
                                                {currentQ?.id && answers[currentQ.id] ? answers[currentQ.id] : ''}
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
                <div className="fixed top-[60px] right-6 bg-white border border-slate-200 shadow-2xl rounded-xl z-50 p-2 min-w-[220px] animate-in fade-in zoom-in-95 duration-200 text-slate-800">
                    <button
                        onClick={() => { setShowLineReader(true); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-lg text-[14px] font-bold text-slate-700 transition-colors"
                    >
                        <Accessibility className="w-4 h-4 text-slate-500" />
                        <span>Line Reader</span>
                    </button>
                    <button
                        onClick={() => { setActiveModal('settings'); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-lg text-[14px] font-bold text-slate-700 transition-colors"
                    >
                        <Settings className="w-4 h-4 text-slate-500" />
                        <span>Settings</span>
                    </button>
                    <button
                        onClick={() => { setActiveModal('help'); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-lg text-[14px] font-bold text-slate-700 transition-colors"
                    >
                        <HelpIcon className="w-4 h-4 text-slate-500" />
                        <span>Help</span>
                    </button>
                    <div className="h-px bg-slate-100 my-1 mx-2" />
                    <button
                        onClick={() => { setActiveModal('exit'); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 rounded-lg text-[14px] font-bold text-rose-600 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Save and Exit</span>
                    </button>
                </div>
            )}

            <footer className="h-[72px] bg-white border-t border-slate-200 flex items-center justify-between px-6 shrink-0 z-40 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <span className="text-slate-500 font-bold text-sm">
                            {(olympiadProfile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[14px] font-black text-slate-900 tracking-tight leading-none">
                            {olympiadProfile?.full_name || user?.email?.split('@')[0] || 'User'}
                        </span>
                    </div>
                </div>

                {/* Question Navigation Pill (Bluebook Style) */}
                <div className="absolute left-1/2 -translate-x-1/2">
                    <button
                        onClick={() => setShowNavModal(true)}
                        className="bluebook-nav-button"
                    >
                        <span>Question {currentIndex + 1} of {questions.length}</span>
                        <ChevronDown className="w-4 h-4 ml-2 rotate-180" />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        disabled={currentIndex === 0}
                        onClick={handleBack}
                        className={`h-10 px-6 rounded-lg font-bold text-[14px] border border-slate-300 transition-all focus:outline-none focus:ring-0 ${currentIndex === 0 ? "bg-[#111827] text-white" : "bg-transparent text-black"}`}
                    >
                        Back
                    </button>
                    <button
                        onClick={handleNext}
                        className="h-10 px-8 rounded-lg bg-[#111827] text-white font-bold text-[14px] hover:bg-slate-800 transition-all"
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
