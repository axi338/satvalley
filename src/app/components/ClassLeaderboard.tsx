import { useState, useEffect } from 'react';
import { Trophy, Medal, Crown } from 'lucide-react';

interface LeaderboardEntry {
    id: string;
    student_id: string;
    points: number;
    rank: number;
    badges: any[];
    profiles: {
        full_name: string;
        avatar_url: string | null;
    };
}

export function ClassLeaderboard() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const resp = await fetch('/api/leaderboard');
                const data = await resp.json();
                setLeaderboard(data.leaderboard || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    if (loading) return <div className="animate-pulse space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl" />)}</div>;

    return (
        <div className="bg-[#0a0f1d]/40 border border-white/10 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/5">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <Trophy className="text-yellow-500" />
                    Weekly Top Scholars
                </h3>
            </div>

            <div className="divide-y divide-white/5">
                {leaderboard.map((entry, index) => (
                    <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 flex items-center justify-center">
                                {index === 0 ? <Crown size={24} className="text-yellow-500" /> :
                                    index === 1 ? <Medal size={22} className="text-slate-300" /> :
                                        index === 2 ? <Medal size={22} className="text-amber-600" /> :
                                            <span className="text-indigo-200/40 font-black">{index + 1}</span>}
                            </div>

                            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-white/5 overflow-hidden">
                                {entry.profiles?.avatar_url ? (
                                    <img src={entry.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-indigo-400 font-bold">
                                        {entry.profiles?.full_name?.[0].toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>

                            <div>
                                <p className="text-white font-bold group-hover:text-indigo-400 transition-colors uppercase tracking-wider text-sm">{entry.profiles?.full_name}</p>
                                <div className="flex gap-1 mt-1">
                                    {entry.badges?.map((badge, bIdx) => (
                                        <div key={bIdx} className="w-4 h-4 rounded-full bg-indigo-500/20" title={badge.name} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-white font-black text-xl tabular-nums">{entry.points}</div>
                            <div className="text-[10px] text-indigo-200/40 font-black uppercase tracking-widest">Points</div>
                        </div>
                    </div>
                ))}
                {leaderboard.length === 0 && (
                    <div className="p-12 text-center text-indigo-200/20">
                        <Trophy size={48} strokeWidth={1} className="mx-auto" />
                        <p className="mt-4 font-bold uppercase tracking-widest text-xs">No rankings yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}
