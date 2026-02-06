import { useState, useEffect } from 'react';
import { Plus, Clock, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';

interface ImportJob {
    id: string;
    filename: string;
    status: string;
    created_at: string;
    error_message: string | null;
    config: any;
}

interface ImportDashboardProps {
    onNavigate: (page: string, params?: any) => void;
}

export const ImportDashboard = ({ onNavigate }: ImportDashboardProps) => {
    const [jobs, setJobs] = useState<ImportJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJobs();
        const subscription = supabase
            .channel('import_jobs_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'import_jobs' }, () => {
                fetchJobs();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchJobs = async () => {
        try {
            const { data, error } = await supabase
                .from('import_jobs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setJobs(data || []);
        } catch (err) {
            console.error('Error fetching jobs:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { color: string; icon: any; label: string }> = {
            queued: { color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: Clock, label: 'Queued' },
            extracting: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Loader2, label: 'Extracting' },
            candidate_split: { color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: Loader2, label: 'Splitting' },
            normalizing: { color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Loader2, label: 'Normalizing' },
            review_required: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: AlertCircle, label: 'Needs Review' },
            publishing: { color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', icon: Loader2, label: 'Publishing' },
            done: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle, label: 'Done' },
            failed: { color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: AlertCircle, label: 'Failed' },
        };

        const config = statusMap[status] || statusMap.queued;
        const Icon = config.icon;

        return (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${config.color} text-[10px] font-black uppercase tracking-widest`}>
                {status === 'extracting' || status === 'candidate_split' || status === 'normalizing' || status === 'publishing' ? (
                    <Icon className="w-3 h-3 animate-spin" />
                ) : (
                    <Icon className="w-3 h-3" />
                )}
                {config.label}
            </div>
        );
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight">SAT Content Pipeline</h1>
                    <p className="text-indigo-200/60 font-medium">Manage and review AI-powered question imports</p>
                </motion.div>

                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onNavigate('admin-import-new')}
                    className="flex items-center gap-3 px-6 py-3 bg-indigo-600 rounded-2xl text-white font-bold shadow-[0_0_30px_rgba(79,70,223,0.3)] hover:bg-indigo-500 transition-all group"
                >
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
                        <Plus className="w-5 h-5" />
                    </div>
                    New Import
                </motion.button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    <p className="text-indigo-200/40 text-sm font-bold uppercase tracking-widest">Loading Jobs...</p>
                </div>
            ) : jobs.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20 px-8 rounded-3xl bg-white/5 border border-white/10 text-center"
                >
                    <FileText className="w-16 h-16 text-indigo-500/20 mb-6" />
                    <h3 className="text-xl font-bold text-white mb-2">No Import Jobs Found</h3>
                    <p className="text-indigo-200/50 max-w-sm mb-8">Start by uploading a SAT PDF or text file to begin the AI-powered extraction process.</p>
                    <button
                        onClick={() => onNavigate('admin-import-new')}
                        className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
                    >
                        Create your first import →
                    </button>
                </motion.div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence mode="popLayout">
                        {jobs.map((job, index) => (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                layout
                                className="group relative p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all overflow-hidden"
                            >
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors truncate max-w-md">
                                                {job.filename}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] text-indigo-200/40 font-black uppercase tracking-widest">
                                                    {new Date(job.created_at).toLocaleDateString()} at {new Date(job.created_at).toLocaleTimeString()}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-indigo-500/20" />
                                                <span className="text-[10px] text-indigo-200/40 font-black uppercase tracking-widest">
                                                    {job.config?.testType?.replace('-', ' ') || 'SAT MATH'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
                                        {getStatusBadge(job.status)}

                                        <button
                                            disabled={job.status === 'failed'}
                                            onClick={() => onNavigate('admin-import-review', { jobId: job.id })}
                                            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${job.status === 'review_required' || job.status === 'done'
                                                ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:scale-105 active:scale-95'
                                                : 'bg-white/5 text-white/20 cursor-not-allowed'
                                                }`}
                                        >
                                            {job.status === 'done' ? 'View' : 'Review'}
                                        </button>
                                    </div>
                                </div>

                                {job.status === 'normalizing' && job.config?.total_candidates > 0 && (
                                    <div className="mt-6 space-y-3">
                                        <div className="flex justify-between items-center text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                Processing Candidates...
                                            </div>
                                            <span>{Math.round((job.config.processed_candidates / job.config.total_candidates) * 100)}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(job.config.processed_candidates / job.config.total_candidates) * 100}%` }}
                                                transition={{ duration: 0.5 }}
                                            />
                                        </div>
                                        <p className="text-[9px] text-indigo-200/30 font-bold text-center italic tracking-wider">
                                            {job.config.processed_candidates} of {job.config.total_candidates} candidates normalized
                                        </p>
                                    </div>
                                )}

                                {job.error_message && (
                                    <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-rose-300/80 font-medium">{job.error_message}</p>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};
