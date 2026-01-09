import React, { memo, useRef, useEffect, useMemo, useState, useCallback } from 'react';
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
    FileText
} from 'lucide-react';
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
    type?: 'multiple-choice' | 'numeric';
    imageUrl?: string;
    optionImages?: (string | null)[];
    subject?: 'rw' | 'math';
}

interface HighlightRange {
    start: number;
    end: number;
    text: string;
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

// 2. Break Screen Component
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
        <div className="fixed inset-0 bg-slate-50 flex items-center justify-center z-[100] p-6 lg:p-12 overflow-y-auto">
            <div className="max-w-3xl w-full bg-white rounded-[2.5rem] shadow-[0_20px_70px_-15px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-gradient-x" />

                <div className="p-12 lg:p-16 space-y-12 text-center">
                    <div className="space-y-6">
                        <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mx-auto ring-8 ring-indigo-50/50">
                            <Clock className="w-10 h-10 text-indigo-600 animate-pulse" />
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">Break Time</h2>
                        <p className="text-xl text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
                            You have completed Section 1: Reading and Writing. Take a moment to rest.
                        </p>
                    </div>

                    <div className="py-12 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                        <div className="text-8xl font-black font-mono text-slate-900 tracking-tighter tabular-nums">
                            {formatTime(timeLeft)}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-6">Protocol Standby</p>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex items-start gap-4 text-left">
                            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-amber-900">Important Reminders</p>
                                <ul className="text-xs text-amber-800/70 space-y-1 list-disc ml-4 font-medium">
                                    <li>Do NOT close this testing window</li>
                                    <li>Leave your device open on your desk if you exit the room</li>
                                    <li>The Math section will begin automatically when the timer reaches zero</li>
                                </ul>
                            </div>
                        </div>

                        <Button
                            onClick={onSkip}
                            className="h-16 px-16 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all hover:scale-[1.02] hover:-translate-y-1 w-full sm:w-auto"
                        >
                            Resume Now
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// 1. Passage Viewer with Robust Highlighting
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

    // Merge highlights into the text for rendering
    // We assume 'text' is plain text (except for maybe <br/> we add).
    // To keep it simple and robust, we will work with the raw string and inject spans.
    const renderedContent = useMemo(() => {
        if (!text) return '';

        // Sort highlights by start position
        const sorted = [...(highlights || [])].sort((a, b) => a.start - b.start);

        // Collapse overlapping intervals (simple approach: just don't crash, maybe simplistic rendering)
        // For a robust implementation, we should merge overlaps, but for now let's just render segments.

        let result = [];
        let lastIndex = 0;

        sorted.forEach((h, idx) => {
            if (h.start < lastIndex) return; // Skip overlapping for now to prevent corruption

            // Text before highlight
            result.push(<span key={`text-${idx}`}>{text.substring(lastIndex, h.start)}</span>);

            // Highlighted text
            result.push(
                <mark
                    key={`mark-${idx}`}
                    className="bg-yellow-200/50 text-inherit rounded-sm py-0.5 cursor-pointer hover:bg-yellow-300/50 transition-colors"
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

        // Remaining text
        result.push(<span key="text-end">{text.substring(lastIndex)}</span>);

        // Convert newlines to breaks in the final generic spans if needed, 
        // but here we are returning React nodes. 
        // To support newlines in the original text, we might need a CSS `white-space: pre-wrap` on the container.
        return result;
    }, [text, highlights, isHighlighterActive, onRemoveHighlight]);

    const handleMouseUp = useCallback(() => {
        if (!isHighlighterActive || !containerRef.current) return;

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        // Ensure selection is within our container
        if (!containerRef.current.contains(selection.anchorNode)) return;

        const range = selection.getRangeAt(0);
        // We need 'start' and 'end' relative to the plain 'text' string.
        // This is tricky with DOM nodes. 
        // Simplified approach: Get the full text content of the container, find the selected substring.
        // WARNING: This fails if multiple identical substrings exist. 
        // Robust approach: Tree walker or use a library. 
        // For this "Agentic" implementation, let's try a best-effort character offset calculation.

        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(containerRef.current);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        const start = preSelectionRange.toString().length;
        const end = start + range.toString().length;

        const selectedText = range.toString();

        if (selectedText.trim().length > 0) {
            onAddHighlight({ start, end, text: selectedText });
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

// 2. Review Screen Component
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

// --- Main Page Component ---

export function TestSessionPage({ testId, onNavigate, user }: TestSessionPageProps) {
    const apiBase = import.meta.env.VITE_BACKEND_URL || '';

    // -- State --
    const [loading, setLoading] = useState(true);
    const [screen, setScreen] = useState<'test' | 'review'>('test');

    // Core Test Data
    const [stage, setStage] = useState<TestState['stage']>('rw-m1');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [m2Difficulty, setM2Difficulty] = useState<'easy' | 'hard' | null>(null);
    const [allResponses, setAllResponses] = useState<any[]>([]); // Accumulate across modules

    // Session State (Reset on Module Change)
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [flags, setFlags] = useState<Set<string | number>>(new Set());
    const [struckOptions, setStruckOptions] = useState<Record<string, Set<string>>>({});
    const [highlights, setHighlights] = useState<Record<string, HighlightRange[]>>({});

    // UI State
    const [timeLeft, setTimeLeft] = useState(1920); // 32 mins default for RW
    const [showTimer, setShowTimer] = useState(true);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [isHighlighterActive, setIsHighlighterActive] = useState(false);
    const [showDirections, setShowDirections] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [showReference, setShowReference] = useState(false);

    // -- Effects --

    // Fetch Questions
    useEffect(() => {
        const fetchQ = async () => {
            if (!testId || stage === 'break') return;
            setLoading(true);
            try {
                let url = `${apiBase}/api/questions?testId=${testId}`;
                const modPart = stage === 'rw-m1' ? 'm1' :
                    stage === 'math-m1' ? 'm1' :
                        `m2-${m2Difficulty || 'easy'}`;

                const subject = stage.startsWith('rw') ? 'rw' : 'math';

                const res = await fetch(url + `&module=${modPart}&subject=${subject}`);
                const data = await res.json();

                // Robust Filter and Mapping
                const validQuestions = (data.questions || []).map((q: any) => ({
                    ...q,
                    imageUrl: q.image_url,
                    testId: q.test_id,
                    optionImages: q.option_images
                })).filter((q: any) =>
                    q && typeof q.text === 'string'
                );

                setQuestions(validQuestions);
                setScreen('test');
                setCurrentIndex(0);
                setAnswers({});
                setFlags(new Set());
                setHighlights({});
                setStruckOptions({});

                // Set Time
                setTimeLeft(stage.startsWith('rw') ? 1920 : 2100);
            } catch (e) {
                console.error("Fetch failed", e);
            } finally {
                setLoading(false);
            }
        };
        fetchQ();
    }, [stage, testId, m2Difficulty]);

    // Timer
    useEffect(() => {
        if (timeLeft <= 0) {
            if (stage === 'break') {
                setStage('math-m1');
            }
            return;
        }
        const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
        return () => clearInterval(t);
    }, [timeLeft, stage]);

    // -- Handlers --

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setScreen('review');
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleModuleSubmit = () => {
        // Save logic
        const currentModuleResponses = questions.map(q => ({
            ...q,
            userAnswer: answers[q.id] || null,
            section: stage.startsWith('rw') ? 'rw' : 'math',
            module: stage
        }));

        const newTotalResponses = [...allResponses, ...currentModuleResponses];
        setAllResponses(newTotalResponses);

        // Determine Next Stage
        if (stage === 'rw-m1') {
            const correct = questions.filter(q => answers[q.id] === q.answer).length;
            setM2Difficulty(correct / questions.length > 0.6 ? 'hard' : 'easy');
            setStage('rw-m2');
        } else if (stage === 'rw-m2') {
            setStage('break');
            setTimeLeft(600); // 10 minutes break
        } else if (stage === 'break') {
            setStage('math-m1');
        } else if (stage === 'math-m1') {
            const correct = questions.filter(q => answers[q.id] === q.answer).length;
            setM2Difficulty(correct / questions.length > 0.6 ? 'hard' : 'easy');
            setStage('math-m2');
        } else {
            // Finish Test
            submitFinal(newTotalResponses);
        }
    };

    const submitFinal = async (finalData: any[]) => {
        // Mock submission
        setLoading(true);
        try {
            const correctCount = finalData.filter(r => r.userAnswer === r.answer).length;
            const score = Math.round((correctCount / (finalData.length || 1)) * 800) + 800; // Mock score

            await fetch(`${apiBase}/api/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userEmail: user?.email,
                    testId,
                    score,
                    responses: finalData,
                    createdAt: new Date().toISOString()
                })
            });
            onNavigate('review'); // Or results
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

    // -- Render --

    if (loading) return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
    );

    if (stage === 'break') {
        return (
            <BreakScreen
                timeLeft={timeLeft}
                formatTime={formatTime}
                onSkip={() => setStage('math-m1')}
            />
        );
    }

    if (screen === 'review') {
        return (
            <div className="fixed inset-0 bg-white flex flex-col z-50">
                {/* Review Header */}
                <header className="h-16 bg-[#F6F8FA] border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="font-bold text-lg text-slate-900">
                            Section {stage.includes('rw') ? '1' : '2'}: Review
                        </h1>
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-lg">
                        {formatTime(timeLeft)}
                    </div>
                    <Button variant="ghost" onClick={() => setScreen('test')}>
                        Back to Questions
                    </Button>
                </header>

                <ReviewScreen
                    questions={questions}
                    answers={answers}
                    flags={flags}
                    onNavigateToQuestion={(idx) => {
                        setCurrentIndex(idx);
                        setScreen('test');
                    }}
                    onSubmit={handleModuleSubmit}
                />
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className="fixed inset-0 bg-white flex flex-col z-50 overflow-hidden font-sans select-none">
            {/* Header */}
            <header className="h-14 bg-[#001E3C] text-white flex items-center justify-between px-4 shrink-0 relative z-20 shadow-md">
                {/* Left: Section Info */}
                <div className="flex items-center gap-4 w-1/3">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold tracking-tight">
                            Section {stage.startsWith('rw') ? '1' : '2'}: {stage.startsWith('rw') ? 'Reading and Writing' : 'Math'}
                        </span>
                        <button
                            onClick={() => setShowDirections(!showDirections)}
                            className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                            Directions <ChevronRight className={`w-3 h-3 transition-transform ${showDirections ? 'rotate-90' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Center: Timer */}
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className={`font-mono text-lg font-bold tracking-wider ${timeLeft < 300 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                        {showTimer ? formatTime(timeLeft) : ''}
                    </span>
                    <button onClick={() => setShowTimer(!showTimer)} className="text-[9px] uppercase font-bold opacity-50 hover:opacity-100">
                        {showTimer ? 'Hide' : 'Show'}
                    </button>
                </div>

                {/* Right: Tools */}
                <div className="flex items-center justify-end gap-2 w-1/3">
                    <button
                        onClick={() => setIsHighlighterActive(!isHighlighterActive)}
                        className={`p-2 rounded hover:bg-white/10 flex flex-col items-center gap-0.5 transition-colors ${isHighlighterActive ? 'bg-amber-500/20 text-amber-400' : 'text-slate-300'}`}
                        title="Annotate"
                    >
                        <div className="text-lg leading-none font-serif italic border-b-2 border-current px-0.5">A</div>
                        <span className="text-[8px] font-bold uppercase">Annotate</span>
                    </button>

                    {stage.startsWith('math') && (
                        <>
                            <button
                                onClick={() => setShowCalculator(!showCalculator)}
                                className="p-2 rounded hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300"
                            >
                                <Calculator className="w-5 h-5" />
                                <span className="text-[8px] font-bold uppercase">Calculator</span>
                            </button>
                            <button
                                onClick={() => setShowReference(!showReference)}
                                className="p-2 rounded hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300"
                            >
                                <FileText className="w-5 h-5" />
                                <span className="text-[8px] font-bold uppercase">Reference</span>
                            </button>
                        </>
                    )}

                    <div className="h-6 w-px bg-white/20 mx-1" />

                    <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className="p-2 rounded hover:bg-white/10 text-slate-300 relative"
                    >
                        <MoreVertical className="w-5 h-5" />
                        <span className="text-[8px] font-bold uppercase block text-center">More</span>

                        {showMoreMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white text-slate-900 rounded-lg shadow-xl py-1 z-50 text-sm font-medium">
                                <button
                                    onClick={() => {
                                        if (document.fullscreenElement) document.exitFullscreen();
                                        else document.documentElement.requestFullscreen();
                                        setShowMoreMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <Eye className="w-4 h-4" /> Full Screen
                                </button>
                                <button
                                    onClick={() => {
                                        setScreen('review');
                                        setShowMoreMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 border-t border-slate-100 flex items-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> End Section
                                </button>
                            </div>
                        )}
                    </button>
                </div>
            </header>

            {/* Directions Dropdown */}
            {showDirections && (
                <div className="bg-[#F6F8FA] border-b border-slate-200 p-6 text-sm text-slate-700 animate-in slide-in-from-top-2 z-10">
                    <h3 className="font-bold mb-2">Directions</h3>
                    <p>
                        The questions in this section address a number of important reading and writing skills. Each question includes one or more passages, which may include a table or graph. Read each passage and question carefully, and then choose the best answer to the question based on the passage(s).
                    </p>
                </div>
            )}

            {/* Calculator Modal */}
            {showCalculator && (
                <div className="absolute top-20 left-20 w-[600px] h-[400px] bg-white rounded-lg shadow-2xl border border-slate-300 z-[60] flex flex-col resize overflow-hidden" style={{ minWidth: '300px', minHeight: '300px' }}>
                    <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center justify-between px-3 cursor-move select-none">
                        <span className="text-xs font-bold text-slate-500 uppercase">Desmos Graphing Calculator</span>
                        <button onClick={() => setShowCalculator(false)} className="hover:bg-slate-200 rounded p-0.5"><X className="w-4 h-4 text-slate-500" /></button>
                    </div>
                    <iframe
                        src="https://www.desmos.com/testing/calculator"
                        className="flex-1 w-full h-full border-none"
                        title="Desmos Calculator"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                </div>
            )}

            {/* Reference Sheet Modal */}
            {showReference && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowReference(false)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowReference(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>
                        <h2 className="text-xl font-bold mb-6 text-slate-900 border-b pb-4">Math Reference Sheet</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Mock Reference Sheet Content - In real app, use an image */}
                            <div className="space-y-6">
                                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                                    <h3 className="font-serif font-bold mb-4 border-b border-slate-200 pb-2">Area and Volume</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="font-bold">Circle</div>
                                            <div>A = πr²</div>
                                            <div>C = 2πr</div>
                                        </div>
                                        <div>
                                            <div className="font-bold">Rectangle</div>
                                            <div>A = lw</div>
                                        </div>
                                        <div>
                                            <div className="font-bold">Triangle</div>
                                            <div>A = ½bh</div>
                                        </div>
                                        <div>
                                            <div className="font-bold">Sphere</div>
                                            <div>V = 4/3πr³</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                                    <h3 className="font-serif font-bold mb-4 border-b border-slate-200 pb-2">Triangles</h3>
                                    <div className="grid grid-cols-2 gap-6 text-sm">
                                        <div>
                                            <div className="font-bold">Pythagorean</div>
                                            <div>a² + b² = c²</div>
                                        </div>
                                        <div>
                                            <div className="font-bold">Special Right</div>
                                            <div>30-60-90 (x, x√3, 2x)</div>
                                            <div>45-45-90 (s, s, s√2)</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Split */}
            <main className="flex-1 flex overflow-hidden">
                {/* Left Plane: Passage */}
                <div className="w-1/2 border-r border-slate-200 bg-white flex flex-col">
                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar select-text cursor-text" onMouseDown={e => e.stopPropagation()}>
                        {currentQ?.passage ? (
                            <>
                                <PassageViewer
                                    text={currentQ.passage}
                                    highlights={highlights[currentQ.id] || []}
                                    isHighlighterActive={isHighlighterActive}
                                    onAddHighlight={(range) => {
                                        setHighlights(prev => ({
                                            ...prev,
                                            [currentQ.id]: [...(prev[currentQ.id] || []), range]
                                        }));
                                    }}
                                    onRemoveHighlight={(idx) => {
                                        setHighlights(prev => ({
                                            ...prev,
                                            [currentQ.id]: (prev[currentQ.id] || []).filter((_, i) => i !== idx)
                                        }));
                                    }}
                                />
                                {currentQ?.imageUrl && (
                                    <div className="mt-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                        <img src={`${apiBase}${currentQ.imageUrl}`} alt="Question visual" className="w-full h-auto" />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-300 italic">
                                No passage context for this question.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane: Question */}
                <div className="w-1/2 bg-white flex flex-col">
                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                        {/* Question Header */}
                        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                            <div className="bg-slate-900 text-white text-sm font-bold px-3 py-1 rounded-sm">
                                {currentIndex + 1}
                            </div>
                            <button
                                onClick={toggleFlag}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-xs font-bold uppercase tracking-wider
                                ${flags.has(currentQ?.id || 0) ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                            >
                                <Flag className={`w-4 h-4 ${flags.has(currentQ?.id || 0) ? 'fill-current' : ''}`} />
                                {flags.has(currentQ?.id || 0) ? 'Marked' : 'Mark for Review'}
                            </button>
                        </div>

                        {/* Question Content */}
                        <div className="mb-8 space-y-4">
                            {!currentQ?.passage && currentQ?.imageUrl && (
                                <div className="mb-6 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 max-w-2xl mx-auto">
                                    <img src={`${apiBase}${currentQ.imageUrl}`} alt="Question visual" className="w-full h-auto" />
                                </div>
                            )}
                            <p className="font-serif text-[18px] leading-8 text-slate-900">
                                {currentQ?.text}
                            </p>
                        </div>

                        <div className="space-y-3 pb-20">
                            {!(currentQ?.type === 'numeric' || (currentQ?.type as string) === 'spr') && currentQ?.options?.map((opt, idx) => {
                                const letter = ['A', 'B', 'C', 'D'][idx];
                                const isSelected = answers[currentQ.id] === letter;
                                const isStruck = struckOptions[currentQ.id]?.has(letter);

                                return (
                                    <div key={letter} className="relative group">
                                        <button
                                            onClick={() => {
                                                if (!isStruck) {
                                                    setAnswers(p => ({ ...p, [currentQ.id]: letter }));
                                                }
                                            }}
                                            className={`w-full p-4 rounded border text-left flex items-start gap-4 transition-all
                                             ${isSelected
                                                    ? 'border-[#001E3C] bg-[#E7F0F8] ring-1 ring-[#001E3C]'
                                                    : isStruck
                                                        ? 'opacity-40 bg-slate-50 border-slate-200 cursor-not-allowed'
                                                        : 'border-slate-300 bg-white hover:border-[#001E3C] hover:bg-slate-50'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5
                                             ${isSelected
                                                    ? 'bg-[#001E3C] text-white border-[#001E3C]'
                                                    : 'bg-transparent border-slate-300 text-slate-500'}`}>
                                                {letter}
                                            </div>
                                            <div className="flex-1 flex flex-col gap-2">
                                                <span className={`font-serif text-[16px] leading-7 text-slate-800 ${isStruck ? 'line-through decoration-slate-400' : ''}`}>
                                                    {opt}
                                                </span>
                                                {currentQ.optionImages?.[idx] && (
                                                    <div className="mt-1 rounded border border-slate-200 overflow-hidden bg-white max-w-xs">
                                                        <img src={`${apiBase}${currentQ.optionImages[idx]}`} alt={`Option ${letter}`} className="w-full h-auto" />
                                                    </div>
                                                )}
                                            </div>
                                        </button>

                                        {/* Strike Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleStrike(letter);
                                            }}
                                            className={`absolute top-1/2 -translate-y-1/2 -right-8 p-1 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 ${isStruck ? 'text-rose-500 opacity-100' : ''}`}
                                            title="Strikethrough"
                                        >
                                            abc
                                        </button>
                                    </div>
                                );
                            })}

                            {(currentQ?.type === 'numeric' || (currentQ?.type as string) === 'spr') && (
                                <div className="bg-slate-50 p-6 rounded border border-slate-200">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Student-Produced Response</label>
                                    <Input
                                        value={answers[currentQ.id] || ''}
                                        onChange={(e) => setAnswers(p => ({ ...p, [currentQ.id]: e.target.value }))}
                                        placeholder="Enter answer"
                                        className="bg-white text-lg font-mono border-slate-300 focus:ring-[#001E3C]"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="h-20 bg-white border-t border-slate-200 flex items-center justify-between px-8 relative shrink-0 z-30">
                <div className="font-bold text-slate-900 text-sm">
                    {user?.email || 'Student'}
                </div>

                <div className="flex items-center gap-4">
                    {currentIndex > 0 && (
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            className="px-6 py-6 bg-[#001E3C] text-white hover:bg-[#00152a] hover:text-white border-none rounded-full font-bold"
                        >
                            Back
                        </Button>
                    )}
                    <Button
                        onClick={handleNext}
                        className="px-10 py-6 bg-[#004d99] hover:bg-[#003d7a] text-white border-none rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                    >
                        {currentIndex === questions.length - 1 ? 'Next' : 'Next'}
                    </Button>
                </div>
            </footer>
        </div>
    );
}
