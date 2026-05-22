import { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, Sparkles, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Eye, LayoutGrid, FileText, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface Question {
    id: string;
    text: string;
    passage?: string;
    options: string[];
    fixed_question_html?: string;
    formatting_status: string;
    formatting_confidence?: number;
    formatting_changes?: any[];
    subject?: string;
}



interface TestStat {
    id: string;
    title: string;
    pending: number;
    auto_fixed: number;
    needs_review: number;
    reviewed: number;
    rejected: number;
    total: number;
}

interface FormattingReviewProps {
    onNavigate: (page: string) => void;
}

export const FormattingReview = ({ onNavigate }: FormattingReviewProps) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [testStats, setTestStats] = useState<TestStat[]>([]);
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('auto_fixed');
    const [editedHtml, setEditedHtml] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (selectedTestId || statusFilter === 'global_all') {
            fetchQuestions();
        } else {
            fetchStats();
        }
    }, [statusFilter, selectedTestId]);

    useEffect(() => {
        if (questions[currentIndex]) {
            setEditedHtml(questions[currentIndex].fixed_question_html || '');
            setIsEditing(false);
        }
    }, [currentIndex, questions]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/questions/formatting/stats', {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to fetch stats');
            setTestStats(data.stats || []);
        } catch (err) {
            console.error('Error fetching stats:', err);
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            let url = `/api/admin/questions/formatting/pending?status=${statusFilter === 'global_all' ? 'auto_fixed' : statusFilter}`;
            if (selectedTestId) {
                url += `&testId=${selectedTestId}`;
            }
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to fetch questions');
            setQuestions(data.questions || []);
            setCurrentIndex(0);
        } catch (err) {
            console.error('Error fetching questions:', err);
            toast.error('Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    const currentQuestion = questions[currentIndex];

    const handleApprove = async () => {
        if (!currentQuestion) return;
        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/questions/${currentQuestion.id}/approve-formatting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ editedText: isEditing ? editedHtml : null })
            });

            if (!res.ok) throw new Error('Approval failed');
            toast.success('Formatting Approved!');

            const newQuestions = questions.filter((_, i) => i !== currentIndex);
            setQuestions(newQuestions);
            if (currentIndex >= newQuestions.length && newQuestions.length > 0) {
                setCurrentIndex(newQuestions.length - 1);
            }
        } catch (err) {
            toast.error('Failed to approve');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!currentQuestion) return;
        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/questions/${currentQuestion.id}/reject-formatting`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });

            if (!res.ok) throw new Error('Rejection failed');
            toast.success('Formatting Rejected');

            const newQuestions = questions.filter((_, i) => i !== currentIndex);
            setQuestions(newQuestions);
            if (currentIndex >= newQuestions.length && newQuestions.length > 0) {
                setCurrentIndex(newQuestions.length - 1);
            }
        } catch (err) {
            toast.error('Failed to reject');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBatchFix = async (testId?: string) => {
        if (actionLoading) return;
        setActionLoading(true);
        const toastId = toast.loading('AI is analyzing questions... this may take a few seconds.');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/questions/batch-fix-formatting', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ limit: 20, testId })
            });

            if (!res.ok) throw new Error('Batch fix failed');
            const data = await res.json();
            const successCount = data.results?.filter((r: any) => r.status === 'success').length || 0;

            toast.success(`Success! AI processed ${successCount} questions.`, { id: toastId });
            if (selectedTestId) fetchQuestions();
            else fetchStats();
        } catch (err) {
            toast.error('AI Processing encountered an error', { id: toastId });
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && questions.length === 0 && testStats.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0a0f1e]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-indigo-200/40 text-sm font-bold uppercase tracking-widest">Initialising Fixer...</p>
            </div>
        );
    }

    // --- TEST SELECTOR VIEW ---
    if (!selectedTestId && statusFilter !== 'global_all') {
        return (
            <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col">
                <div className="h-20 bg-[#001E3C] border-b border-white/5 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate('admin')} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold tracking-tight">Formatting Fixer Dashboard</h1>
                    </div>
                    <button
                        onClick={() => setStatusFilter('global_all')}
                        className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-500 transition-all flex items-center gap-2"
                    >
                        <LayoutGrid className="w-4 h-4" /> Global Review All
                    </button>
                </div>

                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {testStats.map(test => {
                                const completionRate = test.total > 0 ? (test.reviewed / test.total) * 100 : 0;
                                return (
                                    <div key={test.id} className="bg-[#0d1326] border border-white/5 rounded-2xl p-6 flex flex-col hover:border-indigo-500/50 transition-all group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Status</div>
                                                <div className="text-xs font-bold text-indigo-400">
                                                    {test.pending > 0 ? 'Fixing Needed' : (test.auto_fixed > 0 ? 'Review Needed' : 'Completed')}
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-bold mb-1 truncate">{test.title}</h3>
                                        <p className="text-xs text-slate-500 mb-6">{test.total} Total Questions</p>

                                        <div className="space-y-4 mb-8">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-400">Progress</span>
                                                <span className="font-bold">{test.reviewed} / {test.total}</span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 transition-all duration-1000"
                                                    style={{ width: `${completionRate}%` }}
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="p-2 rounded-lg bg-white/5 flex flex-col items-center">
                                                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-tighter">Pending</span>
                                                    <span className="text-sm font-bold">{test.pending}</span>
                                                </div>
                                                <div className="p-2 rounded-lg bg-white/5 flex flex-col items-center">
                                                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-tighter">Fixed</span>
                                                    <span className="text-sm font-bold">{test.auto_fixed}</span>
                                                </div>
                                                <div className="p-2 rounded-lg bg-white/5 flex flex-col items-center">
                                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">Needs Rev</span>
                                                    <span className="text-sm font-bold">{test.needs_review}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto flex gap-2">
                                            {test.pending > 0 && (
                                                <button
                                                    onClick={() => handleBatchFix(test.id)}
                                                    className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5" /> Start AI
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedTestId(test.id);
                                                    setStatusFilter('auto_fixed');
                                                }}
                                                className="flex-[2] py-3 bg-indigo-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                                            >
                                                Start Reviewing
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- QUESTION REVIEW VIEW ---
    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center p-8 text-center text-white">
                <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6">
                    <Check className="w-10 h-10 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Queue Clear!</h2>
                <p className="text-indigo-200/40 mb-8 max-w-sm">No questions found for this test with status "{statusFilter}".</p>
                <div className="flex gap-4">
                    <button
                        onClick={() => setSelectedTestId(null)}
                        className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                        <LayoutGrid className="w-4 h-4" /> All Tests
                    </button>
                    <button
                        onClick={fetchQuestions}
                        className="px-6 py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-500 transition-all flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                    {statusFilter === 'pending' && (
                        <button
                            onClick={() => handleBatchFix(selectedTestId || undefined)}
                            className="px-6 py-3 bg-sparkles rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:opacity-90 transition-all flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" /> Start AI Batch Fix
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0f1e] flex flex-col">
            {/* Header */}
            <div className="h-16 bg-[#001E3C] border-b border-slate-700/40 px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedTestId(null)} className="p-2 rounded hover:bg-white/10 text-slate-300">
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="text-sm font-bold text-white">
                            {selectedTestId === 'global_all' ? 'Global Queue' : testStats.find(t => t.id === selectedTestId)?.title || 'Reviewing'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {statusFilter.replace('_', ' ')} questions
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
                        {['pending', 'auto_fixed', 'needs_review'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-all ${statusFilter === s ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                            >
                                {s.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-mono font-bold text-white">{currentIndex + 1} / {questions.length}</div>
                        <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none">Questions in Queue</div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Original */}
                <div className="w-1/2 border-r border-slate-700/40 flex flex-col">
                    <div className="px-6 py-3 border-b border-slate-700/40 bg-[#0d1326] flex items-center justify-between">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Original Extracted Text</span>
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{currentQuestion.subject}</span>
                    </div>
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0a0f1e]">
                        {currentQuestion.passage && (
                            <div className="mb-6 pb-6 border-b border-white/5">
                                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-3">Passage</div>
                                <div className="text-slate-400 leading-relaxed font-serif whitespace-pre-wrap">{currentQuestion.passage}</div>
                            </div>
                        )}
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-3">Question</div>
                        <div className="text-lg text-white font-medium leading-relaxed">{currentQuestion.text}</div>

                        <div className="mt-8 grid grid-cols-1 gap-2">
                            <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Answer Choices</div>
                            {currentQuestion.options?.map((opt, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                    <span className="w-6 h-6 rounded flex items-center justify-center bg-white/10 text-white font-bold text-xs">{String.fromCharCode(65 + i)}</span>
                                    <span className="text-white/60 text-sm">{opt}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Fixed Suggestion */}
                <div className="w-1/2 flex flex-col bg-[#111827]">
                    <div className="px-6 py-3 border-b border-slate-700/40 bg-[#1f2937] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">AI Proposed Formatting</span>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${(currentQuestion.formatting_confidence || 0) >= 0.9 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                {((currentQuestion.formatting_confidence || 0) * 100).toFixed(0)}% Confidence
                            </div>
                        </div>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isEditing ? 'text-indigo-400' : 'text-white/40 hover:text-white/60'}`}
                        >
                            {isEditing ? 'View Preview' : 'Edit Suggestion'}
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden">
                        {isEditing ? (
                            <textarea
                                value={editedHtml}
                                onChange={(e) => setEditedHtml(e.target.value)}
                                className="flex-1 bg-black/20 p-8 text-indigo-100 font-mono text-sm leading-relaxed outline-none resize-none focus:bg-black/30 transition-all custom-scrollbar"
                                placeholder="Enter or edit HTML markup..."
                            />
                        ) : (
                            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-50 text-slate-900 border-[12px] border-[#111827] rounded-[32px]">
                                <div className="max-w-prose mx-auto">
                                    <div className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-sm inline-block mb-6">
                                        Preview
                                    </div>
                                    <div
                                        className="text-lg leading-relaxed font-medium formatting-preview"
                                        dangerouslySetInnerHTML={{ __html: editedHtml || currentQuestion.text }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Changes Log */}
                        <div className="h-48 border-t border-slate-700/40 bg-black/20 p-4 overflow-y-auto custom-scrollbar">
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-3">Detected Changes</div>
                            <div className="space-y-2">
                                {currentQuestion.formatting_changes?.map((change: any, i: number) => (
                                    <div key={i} className="flex gap-3 text-xs leading-relaxed">
                                        <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${change.type === 'blank_added' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                                        <div>
                                            <span className="text-white/60 font-bold mr-2 uppercase text-[10px]">{change.type.replace('_', ' ')}:</span>
                                            <span className="text-white/40 mr-2">"{change.text}"</span>
                                            <span className="text-indigo-300/40 italic">— {change.reason}</span>
                                        </div>
                                    </div>
                                ))}
                                {(!currentQuestion.formatting_changes || currentQuestion.formatting_changes.length === 0) && (
                                    <div className="text-white/20 italic text-xs">No changes detected by AI.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="h-20 bg-[#001E3C] border-t border-slate-700/40 px-8 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                        disabled={currentIndex === 0}
                        className="p-3 rounded-xl bg-white/5 text-white disabled:opacity-20 hover:bg-white/10 transition-all"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                        disabled={currentIndex === questions.length - 1}
                        className="p-3 rounded-xl bg-white/5 text-white disabled:opacity-20 hover:bg-white/10 transition-all"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleReject}
                        disabled={actionLoading}
                        className="px-8 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold uppercase tracking-widest hover:bg-rose-500/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <X className="w-5 h-5" /> Reject Suggestion
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={actionLoading}
                        className="px-10 py-3 rounded-xl bg-emerald-600 text-white font-bold uppercase tracking-widest hover:bg-emerald-500 shadow-[0_10px_20px_rgba(16,185,129,0.2)] active:scale-95 transition-all flex items-center gap-2"
                    >
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                        {isEditing ? 'Save & Approve' : 'Accept Formatting'}
                    </button>
                </div>

                <div className="flex items-center gap-6">
                    {statusFilter === 'pending' && (
                        <button
                            onClick={() => handleBatchFix(selectedTestId || undefined)}
                            disabled={actionLoading}
                            className="flex items-center gap-2 text-indigo-400 font-black uppercase tracking-widest text-[10px] hover:text-indigo-300 transition-colors"
                        >
                            <Sparkles className="w-4 h-4" /> Batch Fix Remaining
                        </button>
                    )}
                    <button
                        onClick={() => setSelectedTestId(null)}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                    >
                        Switch Test
                    </button>
                </div>
            </div>
        </div>
    );
};
