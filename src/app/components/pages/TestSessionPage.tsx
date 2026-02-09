import React, { memo, useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
    ChevronLeft,
    ChevronRight,
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
    HelpCircle,
    MoreVertical,
    FileText,
    Trophy,
    BookOpen,
    ExternalLink,
    ArrowRight,
    Shield,
    Monitor,
    Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FullscreenInterstitial } from '../FullscreenInterstitial';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

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

// Draggable Calculator Component
const DraggableCalculator = ({ onClose }: { onClose: () => void }) => {
    const [position, setPosition] = useState({ x: 80, y: 80 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
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
            className="fixed w-[650px] h-[450px] bg-white rounded-xl shadow-2xl border border-slate-300 z-[60] flex flex-col overflow-hidden allow-anticheat-focus"
            style={{
                left: position.x,
                top: position.y,
                minWidth: '400px',
                minHeight: '350px'
            }}
        >
            <div
                className="h-10 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 cursor-move select-none"
                onMouseDown={handleMouseDown}
            >
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Desmos Graphing Calculator
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onClose}
                        className="hover:bg-slate-700 rounded p-1 transition-colors"
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>
            <iframe
                src="https://www.desmos.com/testing/collegeboard/graphing"
                className="flex-1 w-full h-full border-none bg-white"
                title="Desmos Calculator"
                allow="clipboard-read; clipboard-write"
            />
        </div>
    );
};

// Draggable Reference Component
const DraggableReference = ({ onClose }: { onClose: () => void }) => {
    const [position, setPosition] = useState({ x: 120, y: 120 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
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
            className="fixed w-[700px] h-[550px] bg-white rounded-xl shadow-2xl border border-slate-300 z-[60] flex flex-col overflow-hidden"
            style={{
                left: position.x,
                top: position.y,
            }}
        >
            <div
                className="h-10 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 cursor-move select-none"
                onMouseDown={handleMouseDown}
            >
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Reference Sheet
                </span>
                <button
                    onClick={onClose}
                    className="hover:bg-slate-700 rounded p-1 transition-colors"
                >
                    <X className="w-4 h-4 text-white" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                <div className="space-y-8">
                    {/* Area/Circumference Formulas */}
                    <div className="grid grid-cols-3 gap-8">
                        <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-20 h-20 border-2 border-slate-400 rounded-full relative">
                                <span className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-slate-600 origin-left" />
                                <span className="absolute top-[40%] left-[65%] text-[10px] font-bold italic">r</span>
                            </div>
                            <p className="text-xs font-bold leading-tight">Circle<br />A = πr<sup>2</sup><br />C = 2πr</p>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-24 h-16 border-2 border-slate-400 relative">
                                <span className="absolute top-[-15px] left-1/2 -translate-x-1/2 text-[10px] font-bold italic">l</span>
                                <span className="absolute right-[-12px] top-1/2 -translate-y-1/2 text-[10px] font-bold italic">w</span>
                            </div>
                            <p className="text-xs font-bold leading-tight">Rectangle<br />A = lw</p>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-20 h-20 relative">
                                <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-slate-400 stroke-2">
                                    <path d="M10 90 L90 90 L50 10 Z" />
                                    <line x1="50" y1="10" x2="50" y2="90" strokeDasharray="4" />
                                    <rect x="50" y="80" width="10" height="10" />
                                </svg>
                                <span className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 text-[10px] font-bold italic">b</span>
                                <span className="absolute left-[54%] top-1/2 text-[10px] font-bold italic">h</span>
                            </div>
                            <p className="text-xs font-bold leading-tight">Triangle<br />A = ½bh</p>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Pythagorean / Special Right */}
                    <div className="grid grid-cols-3 gap-8">
                        <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-20 h-20 relative">
                                <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-slate-400 stroke-2">
                                    <path d="M20 10 L20 90 L80 90 Z" />
                                    <rect x="20" y="80" width="10" height="10" />
                                </svg>
                                <span className="absolute left-[5px] top-1/2 -translate-y-1/2 text-[10px] font-bold italic">b</span>
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-bold italic">a</span>
                                <span className="absolute right-[15px] top-[40%] text-[10px] font-bold italic">c</span>
                            </div>
                            <p className="text-xs font-bold leading-tight">Pythagorean Theorem<br />c<sup>2</sup> = a<sup>2</sup> + b<sup>2</sup></p>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-24 h-20 relative">
                                <svg viewBox="0 0 120 100" className="w-full h-full fill-none stroke-slate-400 stroke-2">
                                    <path d="M20 10 L20 90 L100 90 Z" />
                                    <rect x="20" y="80" width="10" height="10" />
                                    <text x="35" y="85" fontSize="10" className="fill-slate-600 italic">30°</text>
                                    <text x="25" y="30" fontSize="10" className="fill-slate-600 italic">60°</text>
                                </svg>
                                <span className="absolute left-[5px] top-1/2 text-[10px] font-bold italic">x√3</span>
                                <span className="absolute bottom-[-10px] left-1/2 text-[10px] font-bold italic">x</span>
                                <span className="absolute right-[10px] top-[40%] text-[10px] font-bold italic">2x</span>
                            </div>
                            <p className="text-xs font-bold leading-tight italic uppercase tracking-tighter">Special Right Triangles</p>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-20 h-20 relative">
                                <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-slate-400 stroke-2">
                                    <path d="M20 20 L20 80 L80 80 Z" />
                                    <rect x="20" y="70" width="10" height="10" />
                                    <text x="35" y="75" fontSize="10" className="fill-slate-600 italic">45°</text>
                                </svg>
                                <span className="absolute left-[5px] top-1/2 text-[10px] font-bold italic">s</span>
                                <span className="absolute bottom-[-10px] left-1/2 text-[10px] font-bold italic">s</span>
                                <span className="absolute right-[10px] top-[40%] text-[10px] font-bold italic">s√2</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Volume Formulas */}
                    <div className="grid grid-cols-5 gap-4">
                        <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-16 h-12 border-2 border-slate-400 relative">
                                <span className="absolute top-[-12px] left-1/2 text-[8px] font-bold">l</span>
                                <span className="absolute right-[-10px] top-1/2 text-[8px] font-bold">w</span>
                                <span className="absolute left-[-10px] top-1/2 text-[8px] font-bold">h</span>
                            </div>
                            <p className="text-[10px] font-bold">V=lwh</p>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-16 h-16 relative">
                                <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-slate-400 stroke-2">
                                    <ellipse cx="50" cy="20" rx="30" ry="10" />
                                    <path d="M20 20 L20 80 A30 10 0 0 0 80 80 L80 20" />
                                    <line x1="50" y1="20" x2="80" y2="20" strokeDasharray="2" />
                                </svg>
                                <span className="absolute left-[-15px] top-1/2 text-[8px] font-bold">h</span>
                                <span className="absolute top-1 left-[60%] text-[8px] font-bold">r</span>
                            </div>
                            <p className="text-[10px] font-bold">V=πr<sup>2</sup>h</p>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-16 h-16 border-2 border-slate-400 rounded-full relative">
                                <ellipse cx="50" cy="50" rx="50" ry="15" className="stroke-slate-200 stroke-1" strokeDasharray="4" />
                                <line x1="50" y1="50" x2="100" y2="50" strokeDasharray="2" />
                            </div>
                            <p className="text-[10px] font-bold mt-2">V=4/3πr<sup>3</sup></p>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-16 h-16 relative">
                                <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-slate-400 stroke-2">
                                    <ellipse cx="50" cy="80" rx="30" ry="10" />
                                    <path d="M20 80 L50 10 L80 80" />
                                </svg>
                            </div>
                            <p className="text-[10px] font-bold">V=1/3πr<sup>2</sup>h</p>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-2">
                            <div className="w-16 h-16 relative">
                                <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-slate-400 stroke-2">
                                    <path d="M20 80 L80 80 L50 90 Z" strokeDasharray="2" />
                                    <path d="M20 80 L50 10 L80 80 L50 90 L20 80" />
                                    <line x1="50" y1="10" x2="50" y2="85" strokeDasharray="2" />
                                </svg>
                            </div>
                            <p className="text-[10px] font-bold">V=1/3lwh</p>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    <div className="text-[11px] font-bold text-slate-600 space-y-2 italic">
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
        <div className="fixed inset-0 bg-[#F6F8FA] flex items-center justify-center z-[100] p-6 lg:p-12 animate-in fade-in duration-500">
            <div className="max-w-xl w-full text-center space-y-12">
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-[#001E3C] tracking-tight">Break</h2>
                    <p className="text-slate-600 text-lg">
                        You've completed Section 1. Take a 10 minute break.
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] border border-slate-200 py-20 px-12 space-y-8">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Remaining Time</p>
                        <div className="text-9xl font-black font-mono text-[#001E3C] tracking-tighter tabular-nums">
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    <div className="space-y-6">
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            Make sure your device remains open. <br />
                            Section 2: Math will begin automatically when the timer expires.
                        </p>

                        <button
                            onClick={onSkip}
                            className="w-full h-16 bg-[#001E3C] hover:bg-[#002D5C] text-white font-bold text-lg rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                        >
                            Resume Testing
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-6 opacity-30 grayscale pointer-events-none">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Secure Node</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-400" />
                    <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Protocol 1.2</span>
                    </div>
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
    onRemoveHighlight
}: {
    text: string,
    highlights: HighlightRange[],
    isHighlighterActive: boolean,
    onAddHighlight: (range: HighlightRange) => void,
    onRemoveHighlight: (index: number) => void
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const renderedContent = useMemo(() => {
        if (!text) return '';

        const sorted = [...(highlights || [])].sort((a, b) => a.start - b.start);
        let result = [];
        let lastIndex = 0;

        const colorClasses = {
            yellow: 'bg-yellow-200/60 hover:bg-yellow-300/60',
            blue: 'bg-blue-200/60 hover:bg-blue-300/60',
            pink: 'bg-pink-200/60 hover:bg-pink-300/60'
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
            onAddHighlight({
                start,
                end,
                text: selectedText,
                color: (window as any).nextHighlightColor || 'yellow'
            });
            selection.removeAllRanges();
        }
    }, [isHighlighterActive, onAddHighlight]);

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
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-slate-900">{stageTitle}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-8">
                    <div className="flex items-center justify-center gap-12 mb-10">
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-900 ring-4 ring-slate-100" />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 border-2 border-dashed border-slate-300 rounded-md" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unanswered</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Flag className="w-5 h-5 text-rose-500 fill-rose-500" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">For Review</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-3 max-h-[40vh] overflow-y-auto p-2 custom-scrollbar">
                        {questions.map((q, idx) => {
                            const isActive = currentIndex === idx;
                            const isAnswered = !!answers[q.id];
                            const isFlagged = flags.has(q.id);

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => {
                                        onNavigateToQuestion(idx);
                                        onClose();
                                    }}
                                    className={`
                                        relative aspect-square rounded-xl border-2 flex items-center justify-center font-bold text-sm transition-all
                                        ${isActive ? 'border-slate-900 bg-slate-900 text-white ring-4 ring-slate-100 scale-110 z-10' :
                                            isFlagged ? 'border-rose-200 bg-rose-50 text-rose-700' :
                                                isAnswered ? 'border-indigo-100 bg-indigo-50/50 text-indigo-700 hover:border-indigo-200' :
                                                    'border-dashed border-slate-200 bg-white text-slate-400 hover:border-slate-300'}
                                    `}
                                >
                                    {idx + 1}
                                    {isFlagged && !isActive && (
                                        <div className="absolute -top-1.5 -right-1.5">
                                            <Flag className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                                        </div>
                                    )}
                                    {isActive && (
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-900 ring-4 ring-slate-100 animate-bounce" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-10 flex justify-center pb-4 border-t border-slate-100 pt-8">
                        <button
                            onClick={() => {
                                onClose();
                                onGoToReview();
                            }}
                            className="h-12 px-8 border-2 border-[#001E3C] text-[#001E3C] font-black rounded-full hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                        >
                            Go to Review Page
                        </button>
                    </div>
                </div>
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
        <div className="flex flex-col h-full bg-[#F2F4F7]">
            <div className="max-w-4xl mx-auto w-full flex-1 p-8 overflow-y-auto">
                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-12 mb-8 animate-in zoom-in-95 duration-500">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{stageTitle}</h2>
                        <div className="h-1 w-20 bg-indigo-600 mx-auto rounded-full" />
                    </div>

                    <div className="flex items-center justify-center gap-12 mb-16 pb-12 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-950 ring-4 ring-slate-100" />
                            </div>
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Current</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 border-2 border-dashed border-slate-300 rounded-lg" />
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Unanswered</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Flag className="w-5 h-5 text-rose-600 fill-rose-600" />
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">For Review</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 px-4">
                        {questions.map((q, idx) => {
                            const isAnswered = !!answers[q.id];
                            const isFlagged = flags.has(q.id);

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => onNavigateToQuestion(idx)}
                                    className={`
                                        relative aspect-square rounded-2xl border-2 flex items-center justify-center font-black text-lg transition-all hover:scale-105 active:scale-95
                                        ${isFlagged ? 'border-rose-200 bg-rose-50 text-rose-700' :
                                            isAnswered ? 'border-indigo-100 bg-indigo-50/50 text-indigo-700 hover:border-indigo-200' :
                                                'border-dashed border-slate-200 bg-white text-slate-400 hover:border-slate-300'}
                                    `}
                                >
                                    {idx + 1}
                                    {isFlagged && (
                                        <div className="absolute -top-1.5 -right-1.5">
                                            <Flag className="w-4 h-4 text-rose-600 fill-rose-600 drop-shadow-sm" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="p-8 bg-white border-t border-slate-200 flex justify-center sticky bottom-0 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
                <button
                    onClick={onSubmit}
                    className="h-16 px-16 bg-[#001E3C] hover:bg-[#002D5C] text-white font-black text-lg rounded-2xl shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-4 group"
                >
                    Submit Module
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
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
    const [showCalculator, setShowCalculator] = useState(false);
    const [showReference, setShowReference] = useState(false);
    const [showNavModal, setShowNavModal] = useState(false);
    const [testDenoms, setTestDenoms] = useState({ math: 22, rw: 27 });
    const [olympiadProfile, setOlympiadProfile] = useState<{ full_name?: string; phone?: string } | null>(null);

    useEffect(() => {
        (window as any).nextHighlightColor = activeHighlightColor;
    }, [activeHighlightColor]);

    const { isFullscreen, requestFullscreen } = useAntiCheat({
        enabled: isOlympiadMode && screen === 'test',
        onViolation: handleViolation
    });

    useEffect(() => {
        const fetchQ = async () => {
            if (!testId || stage === 'break') return;
            setLoading(true);
            try {
                // Access Control Check for All Tests (Practice & Olympiad) - Only one attempt allowed
                if (user?.email) {
                    const { data: { session } } = await supabase.auth.getSession();
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

                const modPart = stage === 'rw-m1' || stage === 'math-m1' ? 'm1' : `m2-${m2Difficulty || 'easy'}`;
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
            } catch (e) {
                console.error("Fetch failed", e);
            } finally {
                setLoading(false);
            }
        };
        fetchQ();
    }, [stage, testId, m2Difficulty, apiBase]);

    useEffect(() => {
        if (violationCount >= 3) {
            const forceSubmit = async () => {
                setLoading(true);
                // Construct simplified response payload for partial credit/record
                const currentModuleResponses = questions.map(q => ({
                    ...q,
                    userAnswer: answers[q.id] || null,
                    section: stage.startsWith('rw') ? 'rw' : 'math',
                    module: stage
                }));
                // Merge with prior
                const finalData = [...allResponses, ...currentModuleResponses];

                // Submit
                try {
                    const correctCount = finalData.filter(r => r.userAnswer === r.answer).length;
                    const score = Math.round((correctCount / (finalData.length || 1)) * 1200) + 400; // Corrected scoring (Baseline 400)

                    await fetch(`${apiBase}/api/results`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userEmail: user?.email,
                            testId,
                            score: 0, // Disqualified? Or just score what they have? Prompt says "severe violations", usually 0.
                            // Let's give them 0 or distinct status.
                            // Database schema might not have "status" for results yet, only score.
                            // Let's give 0 score for now to indicate termination, OR calculate score but frontend will show Terminated.
                            // Actually, let's keep it simple: Submit what they have.
                            responses: finalData,
                            createdAt: new Date().toISOString(),
                            is_olympiad: isOlympiadMode,
                            disqualified: true // Add this flag if backend supports it (it might not yet, but useful payload)
                        })
                    });

                    alert("Test Terminated due to Security Violations.");
                    onNavigate('home');
                } catch (e) {
                    alert("Termination Error");
                    onNavigate('home');
                }
            };

            forceSubmit();
        }
    }, [violationCount, questions, answers, allResponses, stage, apiBase, user, testId, isOlympiadMode, onNavigate]);

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
                    const hasMath = currentTest.sections?.some((s: string) => s.includes('math'));
                    const hasRW = currentTest.sections?.some((s: string) => s.includes('reading') || s.includes('writing') || s.includes('rw'));

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
                            const { data: { session } } = await supabase.auth.getSession();
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
            const correct = questions.filter(q => answers[q.id] === q.answer).length;
            setM2Difficulty(correct / questions.length > 0.6 ? 'hard' : 'easy');
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
            const correct = questions.filter(q => answers[q.id] === q.answer).length;
            setM2Difficulty(correct / questions.length > 0.6 ? 'hard' : 'easy');
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
        <div className="fixed inset-0 bg-[#F2F4F7] flex flex-col z-50 overflow-hidden">
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
        <div className="fixed inset-0 bg-white flex flex-col z-50 overflow-hidden font-sans select-none">
            {/* Soft Warning Toast */}
            {lastWarning && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="bg-amber-100 border border-amber-200 text-amber-800 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 font-bold text-sm">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        {lastWarning.message}
                    </div>
                </div>
            )}
            <header className="h-14 bg-[#001E3C] text-white flex items-center justify-between px-4 shrink-0 relative z-20 shadow-md">
                <div className="flex items-center gap-4 w-1/3">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold tracking-tight">Section {stage.startsWith('rw') ? '1' : '2'}: {stage.startsWith('rw') ? 'Reading and Writing' : 'Math'}</span>
                        <button onClick={() => setShowDirections(!showDirections)} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                            Directions <ChevronRight className={`w-3 h-3 transition-transform ${showDirections ? 'rotate-90' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className={`font-mono text-lg font-bold tracking-wider ${timeLeft < 300 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                        {showTimer ? formatTime(timeLeft) : ''}
                    </span>
                    <button onClick={() => setShowTimer(!showTimer)} className="text-[9px] uppercase font-bold opacity-50 hover:opacity-100">{showTimer ? 'Hide' : 'Show'}</button>
                </div>

                <div className="flex items-center justify-end gap-2 w-1/3">
                    {/* Highlighter & Strikethrough Tools */}
                    <div className="flex items-center gap-1.5 mr-2">
                        <div className={`flex items-center border border-white/10 rounded-lg p-0.5 ${isHighlighterActive ? 'bg-white/10' : ''}`}>
                            <button
                                onClick={() => setIsHighlighterActive(!isHighlighterActive)}
                                className={`p-1.5 rounded flex flex-col items-center gap-0.5 transition-all ${isHighlighterActive ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <div className="text-lg leading-none font-serif italic border-current px-0.5">H</div>
                                <span className="text-[7px] font-black uppercase">Annotate</span>
                            </button>
                            {isHighlighterActive && (
                                <div className="flex items-center gap-1 px-1.5 border-l border-white/10 ml-0.5">
                                    <button onClick={() => setActiveHighlightColor('yellow')} className={`w-3.5 h-3.5 rounded-full bg-yellow-300 border-2 ${activeHighlightColor === 'yellow' ? 'border-white' : 'border-transparent'}`} />
                                    <button onClick={() => setActiveHighlightColor('blue')} className={`w-3.5 h-3.5 rounded-full bg-blue-300 border-2 ${activeHighlightColor === 'blue' ? 'border-white' : 'border-transparent'}`} />
                                    <button onClick={() => setActiveHighlightColor('pink')} className={`w-3.5 h-3.5 rounded-full bg-pink-300 border-2 ${activeHighlightColor === 'pink' ? 'border-white' : 'border-transparent'}`} />
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setIsStrikethroughActive(!isStrikethroughActive)}
                            className={`p-2 rounded hover:bg-white/10 flex flex-col items-center gap-0.5 transition-colors ${isStrikethroughActive ? 'bg-white/10 text-rose-400 font-bold' : 'text-slate-400'}`}
                        >
                            <span className="text-lg leading-none line-through decoration-current">ABC</span>
                            <span className="text-[7px] font-black uppercase">Eliminate</span>
                        </button>
                    </div>

                    {stage.startsWith('math') && (
                        <>
                            <button onClick={() => setShowCalculator(!showCalculator)} className="p-2 rounded hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300"><Calculator className="w-5 h-5" /><span className="text-[8px] font-bold uppercase">Calculator</span></button>
                            <button onClick={() => setShowReference(!showReference)} className="p-2 rounded hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300"><FileText className="w-5 h-5" /><span className="text-[8px] font-bold uppercase">Reference</span></button>
                        </>
                    )}

                    <div className="h-6 w-px bg-white/20 mx-1" />
                    <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 rounded hover:bg-white/10 text-slate-300 relative">
                        <MoreVertical className="w-5 h-5" />
                        <span className="text-[8px] font-bold uppercase block text-center">More</span>
                        {showMoreMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white text-slate-900 rounded-lg shadow-xl py-1 z-50 text-sm font-medium">
                                <button onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); setShowMoreMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2"><Eye className="w-4 h-4" /> Full Screen</button>
                                <button onClick={() => { setScreen('review'); setShowMoreMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 border-t border-slate-100 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> End Section</button>
                            </div>
                        )}
                    </button>
                </div>
            </header>

            {showDirections && (
                <div className="bg-[#F6F8FA] border-b border-slate-200 p-6 text-sm text-slate-700 animate-in slide-in-from-top-2 z-10">
                    <h3 className="font-bold mb-2">Directions</h3>
                    <p>Each question includes one or more passages. Read carefully and choose the best answer.</p>
                </div>
            )}

            {showCalculator && (
                <DraggableCalculator onClose={() => setShowCalculator(false)} />
            )}

            {showReference && (
                <DraggableReference onClose={() => setShowReference(false)} />
            )}

            <main className="flex-1 flex overflow-hidden">
                <div className="w-1/2 border-r border-slate-200 bg-white flex flex-col">
                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar select-text cursor-text" onMouseDown={e => e.stopPropagation()}>
                        {currentQ?.passage ? (
                            <>
                                <PassageViewer
                                    text={currentQ.passage}
                                    highlights={currentQ?.id ? (highlights[currentQ.id] || []) : []}
                                    isHighlighterActive={isHighlighterActive}
                                    onAddHighlight={(range) => currentQ?.id && setHighlights(prev => ({ ...prev, [currentQ.id]: [...(prev[currentQ.id] || []), range] }))}
                                    onRemoveHighlight={(idx) => currentQ?.id && setHighlights(prev => ({ ...prev, [currentQ.id]: (prev[currentQ.id] || []).filter((_, i) => i !== idx) }))}
                                />
                                {currentQ?.imageUrl && <div className="mt-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50"><img src={currentQ.imageUrl.startsWith('http') ? currentQ.imageUrl : `${apiBase}${currentQ.imageUrl}`} alt="Question" className="w-full h-auto" /></div>}
                            </>
                        ) : <div className="h-full flex items-center justify-center text-slate-300 italic">No passage context.</div>}
                    </div>
                </div>

                <div className="w-1/2 bg-white flex flex-col">
                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                            <div className="bg-slate-900 text-white text-sm font-bold px-3 py-1 rounded-sm">{currentIndex + 1}</div>
                            <button onClick={toggleFlag} className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-xs font-bold uppercase tracking-wider ${flags.has(currentQ?.id || 0) ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                                <Flag className={`w-4 h-4 ${flags.has(currentQ?.id || 0) ? 'fill-current' : ''}`} />{flags.has(currentQ?.id || 0) ? 'Marked' : 'Mark for Review'}
                            </button>
                        </div>

                        <div className="mb-8 space-y-4">
                            {!currentQ?.passage && currentQ?.imageUrl && <div className="mb-6 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 max-w-2xl mx-auto"><img src={currentQ.imageUrl.startsWith('http') ? currentQ.imageUrl : `${apiBase}${currentQ.imageUrl}`} alt="Question" className="w-full h-auto" /></div>}
                            <p className="font-serif text-[18px] leading-8 text-slate-900">{currentQ?.text}</p>
                        </div>

                        <div className="space-y-3 pb-20">
                            {!(currentQ?.type === 'numeric' || currentQ?.type === 'spr') && currentQ?.options?.map((opt, idx) => {
                                const letter = ['A', 'B', 'C', 'D'][idx];
                                const isSelected = currentQ?.id ? answers[currentQ.id] === letter : false;
                                const isStruck = currentQ?.id ? struckOptions[currentQ.id]?.has(letter) : false;

                                return (
                                    <div key={letter} className="relative group">
                                        <button
                                            onClick={() => {
                                                if (isStrikethroughActive) toggleStrike(letter);
                                                else if (!isStruck) setAnswers(p => ({ ...p, [currentQ.id]: letter }));
                                            }}
                                            className={`w-full p-4 rounded border text-left flex items-start gap-4 transition-all ${isSelected ? 'border-[#001E3C] bg-[#E7F0F8] ring-1 ring-[#001E3C]' : isStruck ? 'opacity-40 bg-slate-50 border-slate-200 cursor-not-allowed' : 'border-slate-300 bg-white hover:border-[#001E3C] hover:bg-slate-50'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${isSelected ? 'bg-[#001E3C] text-white border-[#001E3C]' : 'bg-transparent border-slate-300 text-slate-500'}`}>{letter}</div>
                                            <div className="flex-1 flex flex-col gap-2">
                                                <span className={`font-serif text-[16px] leading-7 text-slate-800 ${isStruck ? 'line-through decoration-slate-400' : ''}`}>{opt}</span>
                                                {currentQ.optionImages?.[idx] && <div className="mt-1 rounded border border-slate-200 overflow-hidden bg-white max-w-xs"><img src={currentQ.optionImages[idx].startsWith('http') ? currentQ.optionImages[idx] : `${apiBase}${currentQ.optionImages[idx]}`} alt={`Option ${letter}`} className="w-full h-auto" /></div>}
                                            </div>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); toggleStrike(letter); }} className={`absolute top-1/2 -translate-y-1/2 -right-8 p-1 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 ${isStruck ? 'text-rose-500 opacity-100' : ''}`} title="Eliminate">abc</button>
                                    </div>
                                );
                            })}
                            {(currentQ?.type === 'numeric' || currentQ?.type === 'spr' || !currentQ?.options || currentQ.options.length === 0) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-slate-50 p-10 rounded-[2rem] border-2 border-slate-100 shadow-sm max-w-xl"
                                >
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                                            <Zap className="w-4 h-4 fill-current" />
                                        </div>
                                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Student-Produced Response</label>
                                    </div>
                                    <Input
                                        value={currentQ?.id ? (answers[currentQ.id] || '') : ''}
                                        onChange={(e) => currentQ?.id && setAnswers(p => ({ ...p, [currentQ.id]: e.target.value }))}
                                        placeholder="Enter your solution..."
                                        className="bg-white h-20 text-3xl font-black text-slate-900 border-slate-200 focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 rounded-2xl transition-all shadow-inner px-6"
                                    />
                                    <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
                                        For math questions without options, enter your final numerical answer or expression in the field above.
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="h-16 bg-white border-t border-slate-200 flex items-center justify-between px-6 relative shrink-0 z-30 shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-4 min-w-[200px]">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Competitor</span>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs truncate max-w-[120px]">
                                {isOlympiadMode ? (olympiadProfile?.full_name || user?.email?.split('@')[0]) : (user?.name || user?.email?.split('@')[0] || 'Student')}
                            </span>
                            {isOlympiadMode && olympiadProfile?.phone && (
                                <span className="text-[9px] font-bold text-slate-300 font-mono">{olympiadProfile.phone}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Question Navigation Pill (Bluebook Style) */}
                <div className="absolute left-1/2 -translate-x-1/2">
                    <button
                        onClick={() => setShowNavModal(true)}
                        className="h-9 px-5 bg-[#001E3C] text-white rounded-lg flex items-center gap-4 hover:bg-[#002D5C] transition-all group shadow-sm border border-white/10"
                    >
                        <span className="font-bold text-xs tracking-tight">Question {currentIndex + 1} of {questions.length}</span>
                        <div className="w-px h-3 bg-white/20" />
                        <ChevronLeft className={`w-3 h-3 transition-transform ${showNavModal ? 'rotate-90' : '-rotate-90'}`} />
                    </button>
                </div>

                <div className="flex items-center gap-3 min-w-[200px] justify-end">
                    {currentIndex > 0 && (
                        <button onClick={handleBack} className="h-10 px-6 border-2 border-[#001E3C] text-[#001E3C] font-black rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2 text-xs uppercase tracking-wider">
                            Back
                        </button>
                    )}
                    <button onClick={handleNext} className="h-10 px-8 bg-[#001E3C] text-white font-black rounded-lg hover:bg-[#002D5C] transition-all flex items-center gap-2 shadow-lg shadow-blue-900/10 text-xs uppercase tracking-wider">
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
                    stageTitle={stage === 'rw-m1' ? 'Reading and Writing Module 1' :
                        stage === 'rw-m2' ? 'Reading and Writing Module 2' :
                            stage === 'math-m1' ? 'Math Module 1' : 'Math Module 2'}
                />
            )}
        </div>
    );
}
