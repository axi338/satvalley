import { useState, useEffect } from 'react';
import { Target, Brain, Award, Sparkles, TrendingUp, BookOpen, Clock, ChevronRight, Zap, Trophy, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DashboardPageProps {
    user: any;
    profile?: any;
    onNavigate: (page: string) => void;
}

export function DashboardPage({ user, profile, onNavigate }: DashboardPageProps) {
    const [stats, setStats] = useState({
        testsTaken: 0,
        vocabMastered: 0,
        avgScore: 0,
        lastScore: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserStats = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                if (!token) return;

                const res = await fetch('/api/dashboard/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) throw new Error('Failed to fetch stats');
                const data = await res.json();

                setStats({
                    testsTaken: data.testsTaken || 0,
                    vocabMastered: data.vocabMastered || 0,
                    avgScore: data.avgScore || 0,
                    lastScore: data.lastScore || 0,
                });
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchUserStats();
    }, [user]);

    // Gamification — 1 test = 10 XP, level up every 50 XP
    const xp = stats.testsTaken * 10 + stats.vocabMastered;
    const level = Math.floor(xp / 50) + 1;
    const progressToNextLevel = ((xp % 50) / 50) * 100;

    // Greeting based on time
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const firstName = profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Scholar';

    // Score color
    const scoreColor = stats.avgScore >= 1400 ? 'text-emerald-400' : stats.avgScore >= 1200 ? 'text-indigo-400' : stats.avgScore >= 1000 ? 'text-amber-400' : 'text-rose-400';

    return (
        <div className="min-h-screen bg-[#020617] p-6 md:p-8 pb-24 text-slate-200">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-10">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-white mb-1">
                            {greeting}, {firstName} 👋
                        </h1>
                        <p className="text-slate-400 font-medium">Ready to continue your SAT preparation journey?</p>
                    </div>
                    {/* Level badge */}
                    <div className="hidden md:flex flex-col items-center bg-indigo-500/10 border border-indigo-500/30 rounded-2xl px-5 py-3 ml-4">
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">Level</span>
                        <span className="text-4xl font-black text-white">{level}</span>
                        <div className="w-20 h-1.5 bg-white/10 rounded-full mt-2">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                style={{ width: `${progressToNextLevel}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">{Math.round(progressToNextLevel)}% to next</span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 p-5 rounded-2xl border border-white/10 col-span-1">
                            <div className="text-3xl font-black text-white mb-1">
                                {loading ? '—' : stats.testsTaken}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">Tests Taken</div>
                        </div>
                        <div className="bg-white/5 p-5 rounded-2xl border border-white/10 col-span-1">
                            <div className={`text-3xl font-black mb-1 ${scoreColor}`}>
                                {loading ? '—' : (stats.avgScore || '—')}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">Avg Score</div>
                        </div>
                        <div className="bg-white/5 p-5 rounded-2xl border border-white/10 col-span-1">
                            <div className="text-3xl font-black text-amber-400 mb-1">
                                {loading ? '—' : stats.vocabMastered}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">Words Mastered</div>
                        </div>
                        <div className="bg-white/5 p-5 rounded-2xl border border-white/10 col-span-1">
                            <div className="text-3xl font-black text-emerald-400 mb-1">
                                {loading ? '—' : (stats.lastScore || '—')}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">Last Score</div>
                        </div>
                    </div>

                    {/* Main CTA Card */}
                    <div className="bg-indigo-600 rounded-3xl p-10 text-center relative overflow-hidden shadow-2xl shadow-indigo-500/20">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Zap className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">
                            {stats.testsTaken === 0 ? 'Start Your First Test!' : 'Keep Pushing Forward!'}
                        </h2>
                        <p className="text-indigo-100 max-w-md mx-auto mb-8 text-sm">
                            {stats.testsTaken === 0
                                ? 'Take a practice test to baseline your performance and get AI-driven insights.'
                                : `You've taken ${stats.testsTaken} test${stats.testsTaken === 1 ? '' : 's'}. Keep building your streak to unlock more achievements!`
                            }
                        </p>
                        <button
                            onClick={() => onNavigate('practice')}
                            className="bg-white text-indigo-600 px-8 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-xl mx-auto w-fit"
                        >
                            <Sparkles size={18} />
                            {stats.testsTaken === 0 ? 'Start Baseline Test' : 'Take Another Test'}
                        </button>

                        <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-white/10">
                            <div className="flex flex-col items-center gap-2">
                                <Target className="text-white/40" size={20} />
                                <span className="text-white font-bold text-xs">Real Simulation</span>
                                <span className="text-[10px] text-indigo-200">Official SAT format</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Brain className="text-white/40" size={20} />
                                <span className="text-white font-bold text-xs">Smart Analysis</span>
                                <span className="text-[10px] text-indigo-200">Topic-level feedback</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <TrendingUp className="text-white/40" size={20} />
                                <span className="text-white font-bold text-xs">Score Predictor</span>
                                <span className="text-[10px] text-indigo-200">Scale of 400–1600</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Nav */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Vocabulary', icon: <BookOpen size={20} />, page: 'vocabulary', color: 'amber' },
                            { label: 'Review', icon: <Clock size={20} />, page: 'review', color: 'rose' },
                            { label: 'Practice', icon: <ChevronRight size={20} />, page: 'practice', color: 'indigo' },
                        ].map(item => (
                            <button
                                key={item.page}
                                onClick={() => onNavigate(item.page)}
                                className={`bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-3 transition-all group`}
                            >
                                <div className={`text-${item.color}-400`}>{item.icon}</div>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Column — Gamification */}
                <div className="space-y-6">
                    {/* XP / Level Card */}
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
                                <Star size={10} /> Level {level} Scholar
                            </div>
                            <div className="relative w-28 h-28 mx-auto mb-3">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/5" />
                                    <circle
                                        cx="64" cy="64" r="56"
                                        stroke="currentColor" strokeWidth="10" fill="transparent"
                                        strokeDasharray={351.68}
                                        strokeDashoffset={351.68 - (351.68 * progressToNextLevel) / 100}
                                        className="text-indigo-500 transition-all duration-1000"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-black text-white">{level}</span>
                                    <span className="text-[8px] uppercase font-bold text-slate-500">Level</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500">{xp} XP total · {50 - (xp % 50)} XP to next level</p>
                        </div>

                        {/* Achievements */}
                        <div className="border-t border-white/5 pt-5">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Achievements</h4>
                            <div className="flex flex-wrap gap-3">
                                {/* Always unlocked */}
                                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20" title="Getting Started">
                                    <Award size={20} />
                                </div>
                                {stats.testsTaken >= 1 && (
                                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(52,211,153,0.1)]" title="First Test Complete">
                                        <Target size={20} />
                                    </div>
                                )}
                                {stats.testsTaken >= 5 && (
                                    <div className="w-11 h-11 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-[0_0_12px_rgba(251,191,36,0.1)]" title="Dedicated Scholar (5 Tests)">
                                        <BookOpen size={20} />
                                    </div>
                                )}
                                {stats.testsTaken >= 10 && (
                                    <div className="w-11 h-11 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/20" title="Test Veteran (10 Tests)">
                                        <Trophy size={20} />
                                    </div>
                                )}
                                {stats.vocabMastered >= 50 && (
                                    <div className="w-11 h-11 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400 border border-rose-500/20" title="Vocabulary Master (50 words)">
                                        <Brain size={20} />
                                    </div>
                                )}
                                {stats.avgScore >= 1400 && (
                                    <div className="w-11 h-11 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-yellow-400 border border-yellow-500/20 shadow-[0_0_12px_rgba(234,179,8,0.2)]" title="Top Scorer (1400+ Avg)">
                                        <Sparkles size={20} />
                                    </div>
                                )}
                                {stats.testsTaken === 0 && (
                                    <div className="text-xs text-slate-500 italic mt-2 w-full">Complete tests to unlock badges!</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Score Range Visual */}
                    {stats.avgScore > 0 && (
                        <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Score Range</h4>
                            <div className="relative h-3 bg-gradient-to-r from-rose-500 via-amber-400 via-indigo-400 to-emerald-400 rounded-full">
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-xl border-4 border-[#020617] transition-all duration-1000"
                                    style={{ left: `${Math.min(100, Math.max(0, ((stats.avgScore - 400) / 1200) * 100))}%`, transform: 'translate(-50%, -50%)' }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                                <span>400</span>
                                <span className={`font-black ${scoreColor}`}>{stats.avgScore}</span>
                                <span>1600</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
