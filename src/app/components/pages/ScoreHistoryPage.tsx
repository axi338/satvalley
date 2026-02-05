import { useEffect, useState } from 'react';
import { History, ArrowRight, Calendar, Target, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ScoreHistoryPageProps {
    user: any;
    onNavigate: (page: string, params?: any) => void;
}

export function ScoreHistoryPage({ user, onNavigate }: ScoreHistoryPageProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data, error } = await supabase
                    .from('test_sessions')
                    .select(`
            id,
            score,
            created_at,
            test_id,
            tests (
              title,
              difficulty
            )
          `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setHistory(data || []);
            } catch (err) {
                console.error('Error fetching history:', err);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchHistory();
    }, [user]);

    return (
        <div className="min-h-screen bg-[#020617] p-8 pb-24 text-slate-200">
            <div className="max-w-4xl mx-auto mb-12">
                <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-4">
                    <History className="text-indigo-500" size={36} />
                    Score History
                </h1>
                <p className="text-slate-400 font-medium">Review your past performance and track your growth.</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-4">
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading records...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-12 text-center">
                        <Target className="w-16 h-16 text-slate-700 mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-white mb-2">No tests completed yet</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Start your first practice test to begin tracking your score history.</p>
                        <button
                            onClick={() => onNavigate('practice')}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-500 transition-all"
                        >
                            Take a Test
                        </button>
                    </div>
                ) : (
                    history.map((session) => (
                        <div key={session.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-all group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar size={12} />
                                        {new Date(session.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">{session.tests?.title || 'Unknown Test'}</h3>
                                    <div className="inline-block px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-black uppercase text-slate-500 border border-white/5">
                                        {session.tests?.difficulty || 'Standard'}
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Score</div>
                                        <div className="text-3xl font-black text-white">{session.score || '---'}</div>
                                    </div>

                                    <button
                                        onClick={() => onNavigate('review', { sessionId: session.id })}
                                        className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                        title="Review Test"
                                    >
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
