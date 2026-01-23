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
    Monitor
} from 'lucide-react';
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
                <button
                    onClick={onClose}
                    className="hover:bg-slate-700 rounded p-1 transition-colors"
                >
                    <X className="w-4 h-4 text-white" />
                </button>
            </div>
            <iframe
                src="https://www.desmos.com/calculator"
                className="flex-1 w-full h-full border-none bg-white"
                title="Desmos Calculator"
                allow="clipboard-read; clipboard-write"
            />
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

// Review Screen Component
const ReviewScreen = ({
    questions,
    answers,
    flags,
    onNavigateToQuestion,
    onSubmit
}: {
    questions: Question[],
    answers: Record<string, string>,
    flags: Set<string | number>,
    onNavigateToQuestion: (idx: number) => void,
    onSubmit: () => void
}) => {
    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="max-w-4xl mx-auto w-full flex-1 p-8 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                        Check Your Work
                    </h2>
                    <p className="text-slate-500 mb-8">
                        On test day, you won't be able to return to this module once you submit.
                        Please ensure you have answered all questions.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {questions.map((q, idx) => {
                            const isAnswered = !!answers[q.id];
                            const isFlagged = flags.has(q.id);

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => onNavigateToQuestion(idx)}
                                    className={`
                                        relative h-14 rounded-lg border-2 flex items-center justify-between px-4 transition-all
                                        ${isFlagged ? 'border-rose-200 bg-rose-50' : isAnswered ? 'border-slate-200 bg-white hover:border-indigo-300' : 'border-dashed border-slate-300 bg-slate-50 hover:bg-white'}
                                    `}
                                >
                                    <span className={`font-bold ${isAnswered ? 'text-slate-900' : 'text-slate-400'}`}>
                                        Question {idx + 1}
                                    </span>
                                    <div className="flex gap-2">
                                        {isFlagged && <Flag className="w-4 h-4 text-rose-500 fill-rose-500" />}
                                        {isAnswered && !isFlagged && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-200 flex justify-center sticky bottom-0 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <Button
                    onClick={onSubmit}
                    className="h-12 px-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg rounded-full shadow-lg shadow-indigo-500/20"
                >
                    Submit Module
                </Button>
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
                // Access Control Check for Olympiad
                if (isOlympiadMode && user?.email) {
                    const { data: { session } } = await supabase.auth.getSession();
                    const statusRes = await fetch(`${apiBase}/api/olympiad/status?testId=${testId}&userEmail=${user.email}`, {
                        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
                    });
                    const statusData = await statusRes.json();

                    if (statusData.completed) {
                        alert("You have already completed this Olympiad test.");
                        onNavigate('home');
                        return;
                    }
                }

                const modPart = stage === 'rw-m1' || stage === 'math-m1' ? 'm1' : `m2-${m2Difficulty || 'easy'}`;
                const subject = stage.startsWith('rw') ? 'rw' : 'math';
                const url = `${apiBase}/api/questions?testId=${testId}&module=${modPart}&subject=${subject}`;
                const res = await fetch(url);
                const data = await res.json();

                const validQuestions = (data.questions || []).map((q: any) => ({
                    ...q,
                    imageUrl: q.image_url,
                    optionImages: q.option_images
                })).filter((q: any) => q && typeof q.text === 'string');

                setQuestions(validQuestions);
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
                    const score = Math.round((correctCount / (finalData.length || 1)) * 800) + 800; // Simplified scoring

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

                    if (currentTest.is_olympiad) {
                        setStage('math-m1');
                        setIsOlympiadMode(true);
                        setTestType('math'); // Olympiad usually math only in this context
                        setTimeLeft(2100);
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
        if (timeLeft <= 0) {
            if (stage === 'break') setStage('math-m1');
            return;
        }
        const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
        return () => clearInterval(t);
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
                submitFinal(newTotalResponses);
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
            submitFinal(newTotalResponses);
        }
    };

    const submitFinal = async (finalData: any[]) => {
        setLoading(true);
        try {
            const correctCount = finalData.filter(r => r.userAnswer === r.answer).length;
            const score = Math.round((correctCount / (finalData.length || 1)) * 800) + 800;

            await fetch(`${apiBase}/api/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userEmail: user?.email,
                    testId,
                    score,
                    responses: finalData,
                    createdAt: new Date().toISOString(),
                    is_olympiad: isOlympiadMode
                })
            });
            onNavigate('review');
        } catch (e) {
            console.error(e);
            onNavigate('home');
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
        <div className="fixed inset-0 bg-white flex flex-col z-50">
            <header className="h-16 bg-[#F6F8FA] border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-lg text-slate-900">Section {stage.includes('rw') ? '1' : '2'}: Review</h1>
                </div>
                <div className="font-mono font-bold text-slate-900 text-lg">{formatTime(timeLeft)}</div>
                <Button variant="ghost" onClick={() => setScreen('test')}>Back to Questions</Button>
            </header>
            <ReviewScreen questions={questions} answers={answers} flags={flags} onNavigateToQuestion={(idx) => { setCurrentIndex(idx); setScreen('test'); }} onSubmit={handleModuleSubmit} />
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
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowReference(false)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowReference(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>
                        <h2 className="text-xl font-bold mb-6 text-slate-900 border-b pb-4">Math Reference Sheet</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                                <h3 className="font-serif font-bold mb-4 border-b border-slate-200 pb-2">Area and Volume</h3>
                                <p>Circle: A=πr², C=2πr</p>
                                <p>Rectangle: A=lw</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 flex overflow-hidden">
                <div className="w-1/2 border-r border-slate-200 bg-white flex flex-col">
                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar select-text cursor-text" onMouseDown={e => e.stopPropagation()}>
                        {currentQ?.passage ? (
                            <>
                                <PassageViewer text={currentQ.passage} highlights={highlights[currentQ.id] || []} isHighlighterActive={isHighlighterActive} onAddHighlight={(range) => setHighlights(prev => ({ ...prev, [currentQ.id]: [...(prev[currentQ.id] || []), range] }))} onRemoveHighlight={(idx) => setHighlights(prev => ({ ...prev, [currentQ.id]: (prev[currentQ.id] || []).filter((_, i) => i !== idx) }))} />
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
                                const isSelected = answers[currentQ.id] === letter;
                                const isStruck = struckOptions[currentQ.id]?.has(letter);

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
                            {(currentQ?.type === 'numeric' || currentQ?.type === 'spr') && (
                                <div className="bg-slate-50 p-6 rounded border border-slate-200">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Student-Produced Response</label>
                                    <Input value={answers[currentQ.id] || ''} onChange={(e) => setAnswers(p => ({ ...p, [currentQ.id]: e.target.value }))} placeholder="Enter answer" className="bg-white text-lg font-mono border-slate-300 focus:ring-[#001E3C]" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="h-20 bg-white border-t border-slate-200 flex items-center justify-between px-8 relative shrink-0 z-30">
                <div className="flex items-center gap-4">
                    <div className="font-bold text-slate-900 text-sm">{user?.email || 'Student'}</div>
                    {!isOlympiadMode && testId && (
                        <div className="px-3 py-1 bg-slate-100 rounded-md border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Ticket: T-{testId.slice(0, 4)}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {currentIndex > 0 && <Button variant="outline" onClick={handleBack} className="px-6 py-6 bg-[#001E3C] text-white hover:bg-[#00152a] hover:text-white border-none rounded-full font-bold">Back</Button>}
                    <Button onClick={handleNext} className="px-10 py-6 bg-[#004d99] hover:bg-[#003d7a] text-white border-none rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all">Next</Button>
                </div>
            </footer>
        </div>
    );
}
