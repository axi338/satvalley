import { Play, Trophy, Clock, Medal, Sparkles, Target, Zap, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface OlympiadPageProps {
    onNavigate: (page: string, params?: any) => void;
    user: any;
    isAdmin?: boolean;
}

function CountDown({ targetDate }: { targetDate: string }) {
    const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);

    useEffect(() => {
        const calculateTime = () => {
            const difference = +new Date(targetDate) - +new Date();
            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                });
            } else {
                setTimeLeft(null); // Time's up
            }
        };

        calculateTime();
        const timer = setInterval(calculateTime, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    if (!timeLeft) return <span className="text-emerald-400 font-black animate-pulse">LIVE NOW</span>;

    return (
        <div className="flex gap-2 text-xs font-black text-indigo-300">
            <span>{String(timeLeft.days).padStart(2, '0')}d</span>:
            <span>{String(timeLeft.hours).padStart(2, '0')}h</span>:
            <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>:
            <span>{String(timeLeft.seconds).padStart(2, '0')}s</span>
        </div>
    );
}

export function OlympiadPage({ onNavigate, user, isAdmin }: OlympiadPageProps) {
    const [olympiads, setOlympiads] = useState<any[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOlympiadId, setSelectedOlympiadId] = useState<string | null>(null);

    const apiBase = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3000';

    const loadData = async () => {
        try {
            setLoading(true);
            const [testsRes, leaderboardRes] = await Promise.all([
                fetch(`${apiBase}/api/tests?isOlympiad=true`).then(r => r.json()),
                fetch(`${apiBase}/api/olympiad/leaderboard${selectedOlympiadId ? `?testId=${selectedOlympiadId}` : ''}`).then(r => r.json())
            ]);

            console.log("DEBUG: Olympiad Page Data:", testsRes);

            // Filter only published for non-admins, or show all for admins with a badge
            const tests = testsRes.tests || [];
            setOlympiads(tests);
            setLeaderboard(leaderboardRes.leaderboard || []);

            // Auto-select first published olympiad if none selected
            if (!selectedOlympiadId && tests.length > 0) {
                const firstPublished = tests.find((t: any) => t.status === 'published');
                if (firstPublished) setSelectedOlympiadId(firstPublished.id);
                else setSelectedOlympiadId(tests[0].id);
            }
        } catch (e) {
            console.error("DEBUG: Failed to load olympiad data:", e);
        } finally {
            setLoading(false);
        }
    };

    const publishedOlympiads = olympiads.filter(t => t.status === 'published');
    // If admin via prop or env email, they see everything
    const visibleOlympiads = (isAdmin || (user?.email && (import.meta as any).env?.VITE_ADMIN_EMAILS?.includes(user.email)))
        ? olympiads
        : publishedOlympiads;

    useEffect(() => {
        loadData();
    }, [apiBase, selectedOlympiadId]);

    const getRankColor = (index: number) => {
        switch (index) {
            case 0: return 'text-amber-400'; // Gold
            case 1: return 'text-slate-300'; // Silver
            case 2: return 'text-amber-600'; // Bronze
            default: return 'text-indigo-200/40';
        }
    };

    return (
        <div className="min-h-screen pt-40 pb-24 px-6 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] -z-10 rounded-full" />

                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-indigo-500/20 shadow-xl mb-10 bg-indigo-500/5 backdrop-blur-md">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em]">Official SAT Olympiad Node</span>
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                    </div>
                    <h1 className="text-7xl lg:text-9xl font-black text-white mb-8 tracking-tighter leading-none italic">
                        Elite <span className="text-indigo-400 not-italic">Olympiad.</span>
                    </h1>
                    <p className="text-2xl text-white/50 max-w-2xl mx-auto leading-relaxed font-bold">
                        Compete with the world's brightest minds. Achieve architectural
                        excellence and claim your position on the global grid.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content: Tests */}
                    <div className="lg:col-span-2 space-y-8">
                        <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.4em] flex items-center gap-3 mb-8">
                            <Zap className="w-4 h-4" /> Available Challenges
                        </h2>

                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center glass-card">
                                <div className="w-12 h-12 rounded-2xl border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mb-4" />
                                <p className="text-[10px] font-black text-indigo-200/20 uppercase tracking-widest">Accessing Node...</p>
                            </div>
                        ) : visibleOlympiads.length === 0 ? (
                            <div className="glass-card p-20 text-center border-dashed border-white/5">
                                <Target className="w-12 h-12 text-white/10 mx-auto mb-6" />
                                <p className="text-white/40 font-black uppercase tracking-widest text-xs">No active Olympiads detected.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {visibleOlympiads.map((olympiad) => {
                                    const isUpcoming = new Date(olympiad.olympiad_start_date) > new Date();
                                    const isEnded = new Date(olympiad.olympiad_end_date) < new Date();

                                    return (
                                        <div
                                            key={olympiad.id}
                                            className={`group glass-card p-10 hover:bg-white/5 transition-all duration-500 border-white/5 hover:border-indigo-500/30 relative overflow-hidden ${selectedOlympiadId === olympiad.id ? 'border-indigo-500/50 bg-white/5' : ''}`}
                                            onClick={() => setSelectedOlympiadId(olympiad.id)}
                                        >
                                            {/* Status Badge */}
                                            {olympiad.status !== 'published' && (
                                                <div className="absolute top-4 right-4 px-3 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest z-20">
                                                    {olympiad.status}
                                                </div>
                                            )}

                                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Medal className="w-32 h-32 text-white" />
                                            </div>

                                            <div className="flex flex-col justify-between h-full gap-8 relative z-10">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-tighter border ${isEnded ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                            isUpcoming ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                                                                'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                            }`}>
                                                            {isEnded ? 'Ended' : isUpcoming ? 'Upcoming' : 'Live Now'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-4xl font-black text-white tracking-tighter">{olympiad.title}</h3>
                                                    <p className="text-white/40 max-w-md font-medium text-sm leading-relaxed line-clamp-2">{olympiad.description}</p>

                                                    <div className="flex flex-wrap gap-6 pt-4">
                                                        <div className="flex items-center gap-2 text-white/60 font-black uppercase text-[10px] tracking-widest">
                                                            <Clock className="w-4 h-4 text-indigo-400" />
                                                            {isUpcoming ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span>Starts in:</span>
                                                                    <CountDown targetDate={olympiad.olympiad_start_date} />
                                                                </div>
                                                            ) : isEnded ? 'Event Concluded' : '180 Minutes'}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-white/60 font-black uppercase text-[10px] tracking-widest">
                                                            <Activity className="w-4 h-4 text-emerald-400" />
                                                            {olympiad.difficulty}
                                                        </div>
                                                    </div>
                                                </div>

                                                <OlympiadActionButton
                                                    testId={olympiad.id}
                                                    user={user}
                                                    apiBase={apiBase}
                                                    onNavigate={onNavigate}
                                                    startDate={olympiad.olympiad_start_date}
                                                    endDate={olympiad.olympiad_end_date}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Sidebar: Leaderboard */}
                    <div className="space-y-8">
                        <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.4em] flex items-center gap-3 mb-8">
                            <Trophy className="w-4 h-4" /> Global Grid
                        </h2>

                        <div className="glass-card p-8 border-indigo-500/10 min-h-[500px] flex flex-col">
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Top Performers</span>
                                <Medal className="w-4 h-4 text-amber-500/40" />
                            </div>

                            <div className="space-y-4 flex-1">
                                {loading ? (
                                    <div className="py-20 flex justify-center">
                                        <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 animate-spin rounded-full" />
                                    </div>
                                ) : leaderboard.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                                        <Medal className="w-8 h-8 mb-4" />
                                        <p className="text-[9px] font-black uppercase tracking-widest">Board Empty</p>
                                    </div>
                                ) : (
                                    leaderboard.map((entry, index) => (
                                        <div key={entry.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                            <div className={`w-8 font-black text-xl italic tracking-tighter ${getRankColor(index)}`}>
                                                {index + 1}
                                            </div>
                                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                                                {entry.photo_url ? (
                                                    <img src={entry.photo_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                                                        {entry.name?.[0] || 'S'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-white truncate">{entry.name}</div>
                                                <div className="text-[9px] text-white/30 font-black uppercase tracking-widest truncate">{entry.user_email?.split('@')[0] || 'Unknown User'}</div>
                                            </div>
                                            <div className="text-xl font-black text-indigo-400 tracking-tighter">
                                                {entry.score}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5">
                                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="w-4 h-4 text-indigo-400" />
                                        <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest">Season One</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-indigo-200/40 uppercase">Archived Soon</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function OlympiadActionButton({ testId, user, apiBase, onNavigate, startDate, endDate }: { testId: string, user: any, apiBase: string, onNavigate: any, startDate: string, endDate: string }) {
    const [status, setStatus] = useState<'loading' | 'unregistered' | 'registered' | 'completed'>('loading');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            if (!user) {
                setStatus('unregistered');
                return;
            }
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                if (!token) return;

                const res = await fetch(`${apiBase}/api/olympiad/status?testId=${testId}&userEmail=${user.email}`, {
                    headers: { authorization: `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.completed) setStatus('completed');
                else if (data.registered) setStatus('registered');
                else setStatus('unregistered');
            } catch (e) {
                console.error(e);
                setStatus('unregistered');
            }
        };

        checkStatus();
    }, [testId, user, apiBase]);

    const handleRegister = async (e: any) => {
        e.stopPropagation();
        if (!user) return alert("Please login first");

        if (!confirm("Confirm Registration? You can only take this Olympiad once.")) return;

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`${apiBase}/api/olympiad/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ testId })
            });

            const data = await res.json();
            if (data.success) {
                setStatus('registered');
            } else {
                alert(data.message || "Registration Failed");
            }
        } catch (e) {
            alert("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    const handleStart = (e: any) => {
        e.stopPropagation();
        onNavigate('test-session', { testId });
    };

    if (status === 'loading') return <div className="h-16 w-32 animate-pulse bg-white/5 rounded-2xl" />;

    if (status === 'completed') {
        return (
            <button disabled className="h-16 px-8 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shrink-0 cursor-not-allowed">
                <Medal className="w-4 h-4" /> Completed
            </button>
        );
    }

    // Check if live
    const isLive = new Date() >= new Date(startDate) && new Date() <= new Date(endDate);
    const isEnded = new Date() > new Date(endDate);

    if (isEnded) {
        return (
            <button disabled className="h-16 px-8 bg-zinc-500/20 text-zinc-500 border border-zinc-500/30 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shrink-0 cursor-not-allowed">
                <Clock className="w-4 h-4" /> Ended
            </button>
        );
    }

    if (status === 'registered') {
        return (
            <button
                onClick={handleStart}
                disabled={!isLive}
                className={`h-16 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl transition-all flex items-center justify-center gap-3 shrink-0 ${isLive ? 'bg-white text-black hover:bg-indigo-500 hover:text-white hover:scale-105 active:scale-95' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
            >
                <Play className="w-4 h-4 fill-current" />
                {isLive ? 'Enter Node' : 'Wait for Start'}
            </button>
        );
    }

    return (
        <button
            onClick={handleRegister}
            disabled={loading || isEnded}
            className="h-16 px-8 bg-indigo-600 text-white hover:bg-indigo-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shrink-0"
        >
            {loading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Target className="w-4 h-4" />}
            Sign Up
        </button>
    );
}
