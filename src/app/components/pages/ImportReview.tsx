import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { ArrowLeft, Check, X, Edit3, ChevronRight, ChevronLeft, Loader2, Sparkles, Save, Flag, AlertCircle, FileEdit, Trash2, Globe, Image as ImageIcon, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { MathText } from '../ui/MathText';

// ── Highlight types ────────────────────────────────────────────────────────────
interface HighlightRange {
    start: number;
    end: number;
    text: string;
    color?: 'yellow' | 'blue' | 'pink';
}

// ── Passage Viewer with Multi-color Highlighting (same as TestSessionPage) ────
const PassageViewer = memo(({
    text,
    highlights,
    isHighlighterActive,
    activeColor,
    onAddHighlight,
    onRemoveHighlight
}: {
    text: string;
    highlights: HighlightRange[];
    isHighlighterActive: boolean;
    activeColor: 'yellow' | 'blue' | 'pink';
    onAddHighlight: (range: HighlightRange) => void;
    onRemoveHighlight: (index: number) => void;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const renderedContent = useMemo(() => {
        if (!text) return null;
        const sorted = [...(highlights || [])].sort((a, b) => a.start - b.start);
        const result: React.ReactNode[] = [];
        let lastIndex = 0;

        const colorClasses: Record<string, string> = {
            yellow: 'bg-yellow-200/80 hover:bg-yellow-300/80',
            blue: 'bg-blue-200/80 hover:bg-blue-300/80',
            pink: 'bg-pink-200/80 hover:bg-pink-300/80',
        };

        sorted.forEach((h, idx) => {
            if (h.start < lastIndex) return;
            result.push(<span key={`t-${idx}`}>{text.substring(lastIndex, h.start)}</span>);
            result.push(
                <mark
                    key={`m-${idx}`}
                    className={`${colorClasses[h.color || 'yellow']} text-inherit rounded-sm py-0.5 px-0.5 cursor-pointer transition-colors`}
                    onClick={(e) => { if (isHighlighterActive) { e.stopPropagation(); onRemoveHighlight(idx); } }}
                >
                    {text.substring(h.start, h.end)}
                </mark>
            );
            lastIndex = h.end;
        });
        result.push(<span key="t-end">{text.substring(lastIndex)}</span>);
        return result;
    }, [text, highlights, isHighlighterActive, onRemoveHighlight]);

    const handleMouseUp = useCallback(() => {
        if (!isHighlighterActive || !containerRef.current) return;
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;
        if (!containerRef.current.contains(selection.anchorNode)) return;

        const range = selection.getRangeAt(0);
        const preRange = range.cloneRange();
        preRange.selectNodeContents(containerRef.current);
        preRange.setEnd(range.startContainer, range.startOffset);
        const start = preRange.toString().length;
        const end = start + range.toString().length;
        const selectedText = range.toString();

        if (selectedText.trim().length > 0) {
            onAddHighlight({ start, end, text: selectedText, color: activeColor });
            selection.removeAllRanges();
        }
    }, [isHighlighterActive, activeColor, onAddHighlight]);

    return (
        <div
            ref={containerRef}
            onMouseUp={handleMouseUp}
            className={`font-serif text-[15px] leading-7 text-slate-800 whitespace-pre-wrap selection:bg-indigo-100 border-l-2 border-slate-200 pl-4 bg-slate-50/60 py-3 pr-4 rounded-r-lg ${isHighlighterActive ? 'cursor-text select-text' : ''}`}
        >
            {renderedContent}
        </div>
    );
});

interface Candidate {
    id: string;
    raw_text: string;
    normalized_json: any;
    status: string;
}

interface ImportReviewProps {
    jobId: string;
    onNavigate: (page: string) => void;
}

export const ImportReview = ({ jobId, onNavigate }: ImportReviewProps) => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>(null);
    const [editedRawText, setEditedRawText] = useState('');
    const [isEditingRaw, setIsEditingRaw] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // ── Per-question annotation state ────────────────────────────────────────
    const [highlights, setHighlights] = useState<Record<string, HighlightRange[]>>({});
    const [struckOptions, setStruckOptions] = useState<Record<string, Set<string>>>({});
    const [isHighlighterActive, setIsHighlighterActive] = useState(false);
    const [isStrikeActive, setIsStrikeActive] = useState(false);
    const [activeHighlightColor, setActiveHighlightColor] = useState<'yellow' | 'blue' | 'pink'>('yellow');

    // Reset tool state when navigating questions
    useEffect(() => {
        setIsHighlighterActive(false);
        setIsStrikeActive(false);
    }, [currentIndex]);

    useEffect(() => {
        fetchCandidates();
    }, [jobId]);

    // Sync editedRawText when candidate changes
    useEffect(() => {
        if (candidates[currentIndex]) {
            setEditedRawText(candidates[currentIndex].raw_text || '');
            setIsEditingRaw(false);
        }
    }, [currentIndex, candidates]);

    const fetchCandidates = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/import/jobs/${jobId}/candidates`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to fetch candidates');

            setCandidates(data.candidates || []);

            // Find first pending review
            const firstPending = data.candidates?.findIndex((c: any) => c.status === 'review_required');
            if (firstPending !== -1 && firstPending !== undefined) {
                setCurrentIndex(firstPending);
            }
        } catch (err) {
            console.error('Error fetching candidates:', err);
            toast.error('Failed to load candidates');
        } finally {
            setLoading(false);
        }
    };

    const currentCandidate = candidates[currentIndex];
    const total = candidates.length;
    const approvedCount = candidates.filter(c => c.status === 'approved').length;
    const rejectedCount = candidates.filter(c => c.status === 'rejected').length;
    const progress = total > 0 ? ((approvedCount + rejectedCount) / total) * 100 : 0;

    const handleApprove = async () => {
        if (!currentCandidate) return;
        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(`/api/admin/import/candidates/${currentCandidate.id}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ editData: isEditing ? editData : null }),
            });

            if (!response.ok) throw new Error('Approval failed');

            toast.success('Question Approved & Published!');

            const newCandidates = [...candidates];
            newCandidates[currentIndex].status = 'approved';
            if (isEditing) newCandidates[currentIndex].normalized_json = editData;
            setCandidates(newCandidates);

            setIsEditing(false);
            setCurrentIndex(currentIndex + 1);
        } catch (err) {
            toast.error('Failed to approve');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!currentCandidate) return;
        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`/api/admin/import/candidates/${currentCandidate.id}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });

            const newCandidates = [...candidates];
            newCandidates[currentIndex].status = 'rejected';
            setCandidates(newCandidates);

            setCurrentIndex(currentIndex + 1);
        } catch (err) {
            toast.error('Failed to reject');
        } finally {
            setActionLoading(false);
        }
    };

    const handleApproveAll = async () => {
        if (!jobId || actionLoading) return;

        const confirmApprove = window.confirm(`This will approve all ${total - approvedCount - rejectedCount} remaining questions. Continue?`);
        if (!confirmApprove) return;

        setActionLoading(true);
        const toastId = toast.loading('Approving all questions...');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`/api/admin/import/jobs/${jobId}/approve-all`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                }
            });

            if (!response.ok) throw new Error('Bulk approval failed');
            const data = await response.json();

            toast.success(data.message || 'All questions approved!', { id: toastId });

            // Refresh candidates to show completion screen
            await fetchCandidates();
        } catch (err) {
            console.error('Bulk approval error:', err);
            toast.error('Failed to approve all questions', { id: toastId });
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectAll = async () => {
        if (!jobId || actionLoading) return;

        const confirmReject = window.confirm(`This will REJECT ALL questions in this job and DELETE them from the test. Continue?`);
        if (!confirmReject) return;

        setActionLoading(true);
        const toastId = toast.loading('Rejecting all questions...');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`/api/admin/import/jobs/${jobId}/reject-all`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                }
            });

            if (!response.ok) throw new Error('Bulk rejection failed');
            const data = await response.json();

            toast.success(data.message || 'All questions rejected!', { id: toastId });

            // Refresh candidates to show completion screen
            await fetchCandidates();
        } catch (err) {
            console.error('Bulk rejection error:', err);
            toast.error('Failed to reject all questions', { id: toastId });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveRawEdit = () => {

        const newCandidates = [...candidates];
        newCandidates[currentIndex].raw_text = editedRawText;
        setCandidates(newCandidates);
        setIsEditingRaw(false);
        toast.success('Raw text updated');
    };

    const startEdit = () => {
        const nj = currentCandidate.normalized_json || {};
        setEditData({
            text: nj.text || '',
            passage: nj.passage || '',
            options: nj.options?.length ? [...nj.options] : ['', '', '', ''],
            option_images: nj.option_images?.length ? [...nj.option_images] : ['', '', '', ''],
            image_url: nj.image_url || null,
            correct_answer: nj.correct_answer || 'A',
            subject: nj.subject || 'math',
            difficulty: nj.difficulty || 'medium',
            skill_tags: nj.skill_tags || [],
            explanation: nj.explanation || '',
            has_image: nj.has_image || false,
            bbox: nj.bbox || null,
        });
        setIsEditing(true);
    };

    const handleOptionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, optionIndex: number) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];

        try {
            setActionLoading(true);
            const formData = new FormData();
            formData.append('image', file);

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            const newOptionImages = [...(editData.option_images || ['', '', '', ''])];
            newOptionImages[optionIndex] = data.url;
            setEditData({ ...editData, option_images: newOptionImages });
            toast.success(`Option ${['A', 'B', 'C', 'D'][optionIndex]} image uploaded successfully`);
        } catch (err) {
            console.error('Option image upload error:', err);
            toast.error('Failed to upload option image');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-indigo-200/40 text-sm font-bold uppercase tracking-widest">Loading Candidates...</p>
            </div>
        );
    }

    // Success screen
    if (!currentCandidate || currentIndex >= total) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center min-h-screen"
            >
                <div className="relative mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 12 }}
                        className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
                    >
                        <Check className="w-12 h-12" />
                    </motion.div>
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-emerald-400"
                            initial={{ x: 0, y: 0, opacity: 1 }}
                            animate={{
                                x: Math.cos(i * 60 * Math.PI / 180) * 80,
                                y: Math.sin(i * 60 * Math.PI / 180) * 80,
                                opacity: 0,
                                scale: 0.5
                            }}
                            transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
                        />
                    ))}
                </div>
                <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Import Pipeline Successful!</h2>
                <p className="text-indigo-200/40 mb-12 max-w-lg mx-auto font-medium leading-relaxed">
                    Excellent work! All candidates have been processed. Approved questions have been published and linked to your chosen practice test.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl mb-12">
                    {[
                        { label: 'Approved', value: approvedCount, color: 'text-emerald-400' },
                        { label: 'Rejected', value: candidates.filter(c => c.status === 'rejected').length, color: 'text-rose-400' },
                        { label: 'Math', value: candidates.filter(c => c.status === 'approved' && c.normalized_json?.subject === 'math').length, color: 'text-indigo-400' },
                        { label: 'Reading/Writing', value: candidates.filter(c => c.status === 'approved' && c.normalized_json?.subject === 'rw').length, color: 'text-indigo-400' }
                    ].map((stat, i) => (
                        <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
                            <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{stat.label}</span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button
                        onClick={() => onNavigate('admin-import')}
                        className="px-10 py-4 bg-indigo-600 rounded-2xl text-white font-black uppercase tracking-widest hover:bg-indigo-500 shadow-[0_20px_40px_rgba(79,70,223,0.3)] hover:scale-105 active:scale-95 transition-all w-full sm:w-auto flex items-center gap-3"
                    >
                        <Check className="w-5 h-5" />
                        Finish & Return to Dashboard
                    </button>
                    <button
                        onClick={() => onNavigate('admin-import-new')}
                        className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-white/60 font-black uppercase tracking-widest hover:bg-white/10 transition-all w-full sm:w-auto flex items-center gap-3"
                    >
                        <Sparkles className="w-5 h-5" />
                        Process Another File
                    </button>
                    <button
                        onClick={handleRejectAll}
                        disabled={actionLoading}
                        className="px-10 py-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all w-full sm:w-auto flex items-center gap-3"
                    >
                        <X className="w-5 h-5" />
                        Undo & Reject All
                    </button>
                </div>
            </motion.div>
        );
    }

    const nj = currentCandidate.normalized_json || {};
    const isApproved = currentCandidate.status === 'approved';
    const isRejected = currentCandidate.status === 'rejected';

    return (
        <div className="min-h-screen bg-transparent flex flex-col">
            {/* SAT-style top header - dark navy */}
            <div className="sticky top-0 z-50 bg-[#001E3C] text-white px-6 py-0 h-14 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-4 w-1/4">
                    <button
                        onClick={() => onNavigate('admin-import')}
                        className="p-2 rounded hover:bg-white/10 text-slate-300 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="text-sm font-bold tracking-tight">AI Import Review</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Job {jobId.slice(0, 8)}</div>
                    </div>
                </div>

                {/* Center: question counter */}
                <div className="flex flex-col items-center">
                    <span className="font-mono text-lg font-bold tracking-wider">
                        {currentIndex + 1} / {total}
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Questions</span>
                </div>

                {/* Right: progress + stats */}
                <div className="flex items-center gap-6 w-1/4 justify-end">
                    <div className="flex items-center gap-2">
                        {total > 0 && (
                            <button
                                onClick={handleRejectAll}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-3 py-1.5 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all border border-rose-500/30 disabled:opacity-50"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Reject All</span>
                            </button>
                        )}
                        {total - approvedCount - rejectedCount > 0 && (
                            <button
                                onClick={handleApproveAll}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all border border-emerald-500/30 disabled:opacity-50"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Approve All</span>
                            </button>
                        )}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">{approvedCount} Approved</span>
                    <span className="text-[10px] text-rose-400 font-black uppercase tracking-widest">{rejectedCount} Rejected</span>
                </div>
            </div>

            {/* Progress bar (SAT-style thin bar) */}
            <div className="h-1 bg-slate-200/10 shrink-0">
                <motion.div
                    className="h-full bg-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                />
            </div>

            {/* Main split layout - SAT style */}
            <div className="flex-1 flex overflow-hidden" style={{ minHeight: 'calc(100vh - 56px - 4px - 64px)' }}>

                {/* LEFT PANEL: Raw Extracted Text (editable) */}
                <div className="w-1/2 border-r border-slate-700/40 bg-[#0a0f1e] flex flex-col">
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700/40 shrink-0">
                        <span className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.2em]">Raw Extracted Text</span>
                        <div className="flex items-center gap-2">
                            {isEditingRaw ? (
                                <>
                                    <button
                                        onClick={() => { setEditedRawText(currentCandidate.raw_text); setIsEditingRaw(false); }}
                                        className="text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors px-3 py-1 rounded-lg hover:bg-white/5"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveRawEdit}
                                        className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                                    >
                                        Save Text
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditingRaw(true)}
                                    className="text-[10px] font-black text-indigo-400/60 uppercase tracking-widest hover:text-indigo-400 transition-colors px-3 py-1 rounded-lg hover:bg-indigo-500/10 flex items-center gap-1.5"
                                >
                                    <Edit3 className="w-3 h-3" />
                                    Edit Text
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Raw text area */}
                    <div className="flex-1 overflow-hidden p-6">
                        {isEditingRaw ? (
                            <textarea
                                value={editedRawText}
                                onChange={(e) => setEditedRawText(e.target.value)}
                                className="w-full h-full bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-indigo-100/70 font-medium leading-relaxed p-4 outline-none focus:border-indigo-500/50 resize-none font-mono text-sm custom-scrollbar"
                                spellCheck={false}
                            />
                        ) : (
                            <div
                                className="w-full h-full overflow-y-auto p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-100/70 font-medium leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30 text-sm custom-scrollbar cursor-text"
                                onClick={() => setIsEditingRaw(true)}
                                title="Click to edit"
                            >
                                {editedRawText || currentCandidate.raw_text || <span className="text-indigo-200/20 italic">No raw text available.</span>}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL: Structured Question (SAT style) */}
                <div className="w-1/2 bg-white text-slate-900 flex flex-col overflow-hidden">
                    {/* Panel header — mirrors test session toolbar */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 shrink-0 bg-[#001E3C]">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-slate-300" />
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Structured Output</span>
                        </div>

                        {/* Annotation + Eliminate tools (only in view mode) */}
                        {!isEditing && (
                            <div className="flex items-center gap-1.5">
                                {/* Highlighter */}
                                <div className={`flex items-center border border-white/10 rounded-lg p-0.5 ${isHighlighterActive ? 'bg-white/10' : ''}`}>
                                    <button
                                        onClick={() => { setIsHighlighterActive(p => !p); setIsStrikeActive(false); }}
                                        className={`p-1.5 rounded flex flex-col items-center gap-0.5 transition-all ${isHighlighterActive ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
                                        title="Annotate passage"
                                    >
                                        <div className="text-base leading-none font-serif italic border-current px-0.5">H</div>
                                        <span className="text-[7px] font-black uppercase tracking-wider">Annotate</span>
                                    </button>
                                    {isHighlighterActive && (
                                        <div className="flex items-center gap-1 px-1.5 border-l border-white/10 ml-0.5">
                                            {(['yellow', 'blue', 'pink'] as const).map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setActiveHighlightColor(c)}
                                                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${c === 'yellow' ? 'bg-yellow-300' : c === 'blue' ? 'bg-blue-300' : 'bg-pink-300'
                                                        } ${activeHighlightColor === c ? 'border-white scale-125' : 'border-transparent'}`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Strikethrough / Eliminate */}
                                <button
                                    onClick={() => { setIsStrikeActive(p => !p); setIsHighlighterActive(false); }}
                                    className={`p-1.5 rounded hover:bg-white/10 flex flex-col items-center gap-0.5 transition-colors ${isStrikeActive ? 'bg-white/10 text-rose-400' : 'text-slate-400'}`}
                                    title="Eliminate answer options"
                                >
                                    <span className="text-base leading-none line-through decoration-current font-bold">ABC</span>
                                    <span className="text-[7px] font-black uppercase tracking-wider">Eliminate</span>
                                </button>

                                <div className="h-5 w-px bg-white/20 mx-1" />

                                {/* Status badges */}
                                {isApproved && (
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                                        <Check className="w-3 h-3" /> Approved
                                    </span>
                                )}
                                {isRejected && (
                                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded">
                                        <X className="w-3 h-3" /> Rejected
                                    </span>
                                )}
                                {!isApproved && !isRejected && nj.subject && (
                                    <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded">
                                        {nj.subject === 'rw' ? 'R&W' : 'Math'}
                                    </span>
                                )}
                                {!isApproved && !isRejected && nj.difficulty && (
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${nj.difficulty === 'easy' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                                        nj.difficulty === 'hard' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                                            'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                        }`}>
                                        {nj.difficulty}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Edit mode: show badge only */}
                        {isEditing && (
                            <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded flex items-center gap-1">
                                <Edit3 className="w-3 h-3" /> Editing
                            </span>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {isEditing ? (
                            <div className="p-8 space-y-8">
                                {/* Passage */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Passage</label>
                                    <textarea
                                        value={editData.passage || ''}
                                        onChange={(e) => setEditData({ ...editData, passage: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-colors resize-none text-sm"
                                        placeholder="Enter passage text (if any)..."
                                    />
                                </div>

                                {/* Question Stem */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Question Stem</label>
                                    <textarea
                                        value={editData.text || ''}
                                        onChange={(e) => setEditData({ ...editData, text: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-colors resize-none text-sm"
                                        placeholder="Enter question text..."
                                    />
                                </div>

                                {/* Options */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Answer Options</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {['A', 'B', 'C', 'D'].map((letter, i) => (
                                            <div key={letter} className="flex gap-3">
                                                <button
                                                    onClick={() => setEditData({ ...editData, correct_answer: letter })}
                                                    className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center border transition-all ${editData.correct_answer === letter ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300'}`}
                                                >
                                                    {letter}
                                                </button>
                                                <div className="flex-1 space-y-2">
                                                    <input
                                                        value={editData.options[i] || ''}
                                                        onChange={(e) => {
                                                            const newOpts = [...editData.options];
                                                            newOpts[i] = e.target.value;
                                                            setEditData({ ...editData, options: newOpts });
                                                        }}
                                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium outline-none focus:border-indigo-400 transition-colors text-sm"
                                                        placeholder={`Option ${letter}`}
                                                    />
                                                    {/* Option Image Upload */}
                                                    <div className="flex items-center gap-3">
                                                        {editData.option_images?.[i] ? (
                                                            <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white inline-block">
                                                                <img src={editData.option_images[i]} alt={`Option ${letter}`} className="h-16 w-32 object-contain" />
                                                                <button
                                                                    onClick={() => {
                                                                        const newImages = [...editData.option_images];
                                                                        newImages[i] = '';
                                                                        setEditData({ ...editData, option_images: newImages });
                                                                    }}
                                                                    className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => document.getElementById(`opt-image-${i}`)?.click()}
                                                                className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                                            >
                                                                <ImageIcon className="w-3.5 h-3.5" /> Add Image
                                                            </button>
                                                        )}
                                                        <input
                                                            id={`opt-image-${i}`}
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={(e) => handleOptionImageUpload(e, i)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Meta fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                                        <select
                                            value={editData.subject || 'math'}
                                            onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-400 transition-colors text-sm"
                                        >
                                            <option value="math">Math</option>
                                            <option value="rw">Reading & Writing</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Difficulty</label>
                                        <select
                                            value={editData.difficulty || 'medium'}
                                            onChange={(e) => setEditData({ ...editData, difficulty: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold outline-none focus:border-indigo-400 transition-colors text-sm"
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Explanation */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Explanation</label>
                                    <textarea
                                        value={editData.explanation || ''}
                                        onChange={(e) => setEditData({ ...editData, explanation: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-colors resize-none text-sm"
                                        placeholder="Explanation for the correct answer..."
                                    />
                                </div>
                            </div>
                        ) : (
                            /* VIEW MODE - SAT interface style */
                            <div className="flex flex-col h-full bg-white">
                                {/* Question number + flag row */}
                                <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-slate-100">
                                    <div className="bg-slate-900 text-white text-sm font-bold px-3 py-1 rounded-sm min-w-[2rem] text-center">
                                        {currentIndex + 1}
                                    </div>
                                    <button className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                                        <Flag className="w-4 h-4" /> Mark for Review
                                    </button>
                                </div>

                                <div className="px-8 py-6 space-y-6">
                                    {/* Passage with live highlighting */}
                                    {nj.passage && (
                                        <PassageViewer
                                            text={nj.passage}
                                            highlights={highlights[currentCandidate.id] || []}
                                            isHighlighterActive={isHighlighterActive}
                                            activeColor={activeHighlightColor}
                                            onAddHighlight={(range) =>
                                                setHighlights(prev => ({
                                                    ...prev,
                                                    [currentCandidate.id]: [...(prev[currentCandidate.id] || []), range]
                                                }))
                                            }
                                            onRemoveHighlight={(idx) =>
                                                setHighlights(prev => ({
                                                    ...prev,
                                                    [currentCandidate.id]: (prev[currentCandidate.id] || []).filter((_, i) => i !== idx)
                                                }))
                                            }
                                        />
                                    )}

                                    {/* Image indicator */}
                                    {nj.has_image && (
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                            <span className="text-sm font-bold text-amber-700">This question contains an image/graph that needs to be uploaded manually after approval.</span>
                                        </div>
                                    )}

                                    {/* Question stem */}
                                    <p className="font-serif text-[17px] leading-8 text-slate-900 select-text">
                                        <MathText text={nj.text || "No question text available."} />
                                    </p>

                                    {/* Answer options with eliminate (strikethrough) */}
                                    <div className="space-y-2">
                                        {(nj.options || []).map((opt: string, i: number) => {
                                            const letter = ['A', 'B', 'C', 'D'][i];
                                            const isCorrect = nj.correct_answer === letter;
                                            const struck = struckOptions[currentCandidate.id]?.has(letter);

                                            return (
                                                <div key={i} className="relative group">
                                                    <button
                                                        onClick={() => {
                                                            if (isStrikeActive) {
                                                                setStruckOptions(prev => {
                                                                    const cur = new Set(prev[currentCandidate.id] || []);
                                                                    if (cur.has(letter)) cur.delete(letter); else cur.add(letter);
                                                                    return { ...prev, [currentCandidate.id]: cur };
                                                                });
                                                            }
                                                        }}
                                                        className={`w-full flex flex-col items-start gap-2 p-4 rounded border text-left transition-all ${struck
                                                            ? 'opacity-40 bg-slate-50 border-slate-200 cursor-not-allowed'
                                                            : isCorrect
                                                                ? 'border-[#001E3C] bg-[#E7F0F8] ring-1 ring-[#001E3C]'
                                                                : isStrikeActive
                                                                    ? 'border-slate-300 bg-white hover:border-rose-300 hover:bg-rose-50 cursor-pointer'
                                                                    : 'border-slate-300 bg-white'
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${isCorrect && !struck
                                                                ? 'bg-[#001E3C] text-white border-[#001E3C]'
                                                                : 'border-slate-300 text-slate-500 bg-white'
                                                                }`}>
                                                                {letter}
                                                            </div>
                                                            <span className={`font-serif text-[15px] leading-7 text-slate-800 pt-0.5 ${struck ? 'line-through decoration-slate-400 opacity-50' : ''}`}>
                                                                <MathText text={opt} />
                                                            </span>
                                                        </div>
                                                        {nj.option_images?.[i] && (
                                                            <div className="mt-2 rounded-lg border border-slate-100 overflow-hidden bg-white/50 inline-block">
                                                                <img src={nj.option_images[i]} alt={`Option ${letter}`} className="max-h-48 object-contain" />
                                                            </div>
                                                        )}
                                                    </button>
                                                    {/* Inline ABC eliminate button (always visible) */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setStruckOptions(prev => {
                                                                const cur = new Set(prev[currentCandidate.id] || []);
                                                                if (cur.has(letter)) cur.delete(letter); else cur.add(letter);
                                                                return { ...prev, [currentCandidate.id]: cur };
                                                            });
                                                        }}
                                                        className={`absolute top-1/2 -translate-y-1/2 -right-8 p-1 text-xs font-bold uppercase tracking-wider transition-colors ${struck ? 'text-rose-500' : 'text-slate-300 hover:text-rose-500'}`}
                                                        title="Eliminate"
                                                    >
                                                        abc
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {
                                            nj.type === 'spr' && (!nj.options || nj.options.length === 0) && (
                                                <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
                                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Student-Produced Response (No Options)</span>
                                                </div>
                                            )
                                        }
                                    </div>

                                    {/* Skill tags */}
                                    {nj.skill_tags?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {nj.skill_tags.map((tag: string) => (
                                                <span key={tag} className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black uppercase tracking-widest">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Explanation */}
                                    {nj.explanation && (
                                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Explanation</p>
                                            <p className="text-sm text-slate-700 leading-relaxed">
                                                <MathText text={nj.explanation} />
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom footer toolbar - SAT style */}
            <div className="h-16 bg-white border-t border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-[0_-4px_15px_rgba(0,0,0,0.04)] z-30">
                {/* Left: navigation */}
                <div className="flex items-center gap-2 min-w-[160px]">
                    <button
                        disabled={currentIndex === 0}
                        onClick={() => { setCurrentIndex(currentIndex - 1); setIsEditing(false); }}
                        className="h-9 px-4 border border-slate-300 text-slate-700 font-bold rounded text-sm hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                    >
                        <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                </div>

                {/* Center: action buttons */}
                <div className="flex items-center gap-3">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="h-10 px-5 border border-slate-300 text-slate-600 font-bold rounded text-sm hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isApproved || actionLoading}
                                onClick={handleApprove}
                                className="h-10 px-6 bg-[#001E3C] text-white font-bold rounded text-sm hover:bg-[#002D5C] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save & Approve
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Reject */}
                            <button
                                disabled={actionLoading || isRejected}
                                onClick={handleReject}
                                className="h-10 px-4 border border-rose-200 text-rose-600 font-bold rounded text-sm hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                <X className="w-4 h-4" /> Reject
                            </button>

                            {/* Edit */}
                            <button
                                onClick={startEdit}
                                className="h-10 px-4 border border-slate-300 text-slate-700 font-bold rounded text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                            >
                                <Edit3 className="w-4 h-4" /> Edit
                            </button>

                            {/* Approve */}
                            <button
                                disabled={isApproved || actionLoading}
                                onClick={handleApprove}
                                className={`h-10 px-6 font-bold rounded text-sm transition-all flex items-center gap-2 shadow ${isApproved
                                    ? 'bg-emerald-100 text-emerald-600 border border-emerald-200 cursor-not-allowed'
                                    : 'bg-[#001E3C] text-white hover:bg-[#002D5C] hover:scale-[1.02]'
                                    }`}
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {isApproved ? 'Approved' : 'Approve'}
                            </button>
                        </>
                    )}
                </div>

                {/* Right: next navigation */}
                <div className="flex items-center gap-2 min-w-[160px] justify-end">
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
                            else setCurrentIndex(total); // triggers success screen
                        }}
                        className="h-9 px-4 border border-slate-300 text-slate-700 font-bold rounded text-sm hover:bg-slate-50 transition-all flex items-center gap-1"
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Question navigator dots */}
            <div className="bg-[#001E3C]/5 border-t border-slate-200/50 px-6 py-2 flex items-center justify-center gap-1.5 flex-wrap shrink-0">
                {candidates.map((c, i) => (
                    <button
                        key={c.id}
                        onClick={() => { setCurrentIndex(i); setIsEditing(false); }}
                        title={`Question ${i + 1} - ${c.status}`}
                        className={`w-7 h-7 rounded text-xs font-bold transition-all border ${i === currentIndex
                            ? 'bg-[#001E3C] text-white border-[#001E3C] scale-110'
                            : c.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                                : c.status === 'rejected'
                                    ? 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200'
                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                    >
                        {i + 1}
                    </button>
                ))}
            </div>
        </div>
    );
};
