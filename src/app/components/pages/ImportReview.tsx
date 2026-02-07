import { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, Edit3, ChevronRight, ChevronLeft, Loader2, Sparkles, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

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
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchCandidates();
    }, [jobId]);

    const fetchCandidates = async () => {
        try {
            const { data, error } = await supabase
                .from('import_candidates')
                .select('*')
                .eq('job_id', jobId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setCandidates(data || []);

            // Find first pending review
            const firstPending = data?.findIndex(c => c.status === 'review_required');
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
    const progress = total > 0 ? (approvedCount / total) * 100 : 0;

    const handleApprove = async () => {
        if (!currentCandidate) return;
        setActionLoading(true);
        try {
            // Get session for auth
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

            // Update local state
            const newCandidates = [...candidates];
            newCandidates[currentIndex].status = 'approved';
            if (isEditing) newCandidates[currentIndex].normalized_json = editData;
            setCandidates(newCandidates);

            setIsEditing(false);
            // Auto-advance to next, even if it's the end (to show success screen)
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

            // Auto-advance
            setCurrentIndex(currentIndex + 1);
        } catch (err) {
            toast.error('Failed to reject');
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

    return (
        <div className="min-h-screen bg-transparent">
            {/* Top Header */}
            <div className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/10 px-8 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => onNavigate('admin-import')}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-indigo-200/40 hover:text-indigo-400 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight">Import Review</h1>
                            <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[10px] text-indigo-200/40 font-black uppercase tracking-widest">Job ID: {jobId.slice(0, 8)}</span>
                                <span className="w-1 h-1 rounded-full bg-indigo-500/20" />
                                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">{approvedCount} Approved</span>
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:flex flex-col items-end gap-2 w-64">
                        <div className="flex justify-between w-full text-[10px] font-black text-indigo-200/40 uppercase tracking-widest">
                            <span>Overall Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-7xl mx-auto">
                {!currentCandidate ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-24 text-center"
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

                        {/* Summary Stats Grid */}
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
                        </div>
                    </motion.div>
                ) : (
                    <div className="grid lg:grid-cols-2 gap-8 items-start">
                        {/* Left: Raw Text */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between ml-2">
                                <span className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.2em]">Source Extraction</span>
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Candidate {currentIndex + 1} of {total}</span>
                            </div>
                            <div className="p-8 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 min-h-[500px] text-indigo-100/70 font-medium leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30">
                                {currentCandidate.raw_text}
                            </div>
                        </motion.div>

                        {/* Right: Structured Data */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center justify-between ml-2">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-indigo-400" />
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Structured Result (Gemini 1.5)</span>
                                </div>
                                {currentCandidate.status === 'approved' && (
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Already Approved
                                    </span>
                                )}
                            </div>

                            <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 space-y-8">
                                {isEditing ? (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-indigo-200/40 uppercase tracking-widest ml-1">Question Stem</label>
                                            <textarea
                                                value={editData.text}
                                                onChange={(e) => setEditData({ ...editData, text: e.target.value })}
                                                className="w-full h-32 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium outline-none focus:border-indigo-500 transition-colors resize-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {['options[0]', 'options[1]', 'options[2]', 'options[3]'].map((opt, i) => (
                                                <div key={i} className="space-y-2">
                                                    <label className="text-[10px] font-black text-indigo-200/40 uppercase tracking-widest ml-1">Option {['A', 'B', 'C', 'D', 'E', 'F'][i]}</label>
                                                    <input
                                                        type="text"
                                                        value={editData.options[i]}
                                                        onChange={(e) => {
                                                            const newOpts = [...editData.options];
                                                            newOpts[i] = e.target.value;
                                                            setEditData({ ...editData, options: newOpts });
                                                        }}
                                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium outline-none focus:border-indigo-500 transition-colors"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-indigo-200/40 uppercase tracking-widest ml-1">Answer</label>
                                                <select
                                                    value={editData.correct_answer}
                                                    onChange={(e) => setEditData({ ...editData, correct_answer: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                                                >
                                                    {['A', 'B', 'C', 'D'].map(v => <option key={v} value={v} className="bg-[#020617]">{v}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-indigo-200/40 uppercase tracking-widest ml-1">Subject</label>
                                                <select
                                                    value={editData.subject}
                                                    onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                                                >
                                                    <option value="math" className="bg-[#020617]">Math</option>
                                                    <option value="rw" className="bg-[#020617]">Reading/Writing</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-indigo-200/40 uppercase tracking-widest ml-1">Difficulty</label>
                                                <select
                                                    value={editData.difficulty}
                                                    onChange={(e) => setEditData({ ...editData, difficulty: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                                                >
                                                    {['easy', 'medium', 'hard'].map(v => <option key={v} value={v} className="bg-[#020617] text-capitalize">{v}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <h3 className="text-[10px] font-black text-indigo-200/40 uppercase tracking-widest ml-1">Stem</h3>
                                            <p className="text-white font-bold leading-relaxed">{currentCandidate.normalized_json?.text || "No question text available."}</p>
                                        </div>

                                        <div className="grid gap-4">
                                            {(currentCandidate.normalized_json.options || []).map((opt: string, i: number) => (
                                                <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl border ${currentCandidate.normalized_json.correct_answer === ['A', 'B', 'C', 'D'][i]
                                                    ? 'bg-emerald-500/10 border-emerald-500/20'
                                                    : 'bg-white/5 border-white/10'
                                                    }`}>
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black shrink-0 ${currentCandidate.normalized_json.correct_answer === ['A', 'B', 'C', 'D'][i]
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-indigo-500/20 text-indigo-300'
                                                        }`}>
                                                        {['A', 'B', 'C', 'D'][i]}
                                                    </div>
                                                    <span className="text-white/80 font-medium break-words pt-1">{opt}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {currentCandidate.normalized_json.skill_tags?.map((tag: string) => (
                                                <span key={tag} className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Botton Controls */}
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                {isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="flex-1 w-full sm:w-auto py-4 rounded-2xl bg-white/5 text-white/40 font-bold hover:bg-white/10 transition-all"
                                    >
                                        Cancel Edits
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setEditData({
                                                text: '',
                                                options: ['', '', '', ''],
                                                correct_answer: 'A',
                                                subject: 'math',
                                                difficulty: 'medium',
                                                skill_tags: [],
                                                explanation: '',
                                                ...currentCandidate.normalized_json
                                            });
                                            setIsEditing(true);
                                        }}
                                        className="flex-1 w-full sm:w-auto py-4 rounded-2xl bg-white/5 text-indigo-400 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/10"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        Edit Fields
                                    </button>
                                )}

                                <button
                                    disabled={currentCandidate.status === 'approved' || actionLoading}
                                    onClick={handleApprove}
                                    className={`flex-[2] w-full sm:w-auto py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${currentCandidate.status === 'approved'
                                        ? 'bg-emerald-500/20 text-emerald-500 cursor-not-allowed border border-emerald-500/20'
                                        : 'bg-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95'
                                        }`}
                                >
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {isEditing ? 'Save & Approve' : 'Quick Approve'}
                                </button>

                                <button
                                    disabled={actionLoading}
                                    onClick={handleReject}
                                    className="p-4 rounded-2xl bg-white/5 text-rose-500 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/20 shadow-lg transition-all"
                                    title="Reject Question"
                                >
                                    <X className="w-6 h-6" />
                                </button>

                                <button
                                    onClick={() => {
                                        if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
                                        else setCurrentIndex(total);
                                    }}
                                    className="p-4 rounded-2xl bg-white/5 text-indigo-400 border border-white/10 hover:bg-white/10 transition-all shadow-lg flex items-center gap-2 font-bold px-6"
                                    title="Skip to Next"
                                >
                                    Skip
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center justify-center gap-8 py-4">
                                <button
                                    disabled={currentIndex === 0}
                                    onClick={() => setCurrentIndex(currentIndex - 1)}
                                    className="p-2 text-indigo-200/20 hover:text-indigo-400 disabled:opacity-0 transition-all font-black"
                                >
                                    <ChevronLeft className="w-10 h-10" />
                                </button>
                                <span className="text-sm font-black text-indigo-200/30 uppercase tracking-[0.3em]">
                                    {currentIndex + 1} / {total}
                                </span>
                                <button
                                    disabled={currentIndex === total - 1}
                                    onClick={() => setCurrentIndex(currentIndex + 1)}
                                    className="p-2 text-indigo-200/20 hover:text-indigo-400 disabled:opacity-0 transition-all font-black"
                                >
                                    <ChevronRight className="w-10 h-10" />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
};
