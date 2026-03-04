import { useState, useEffect } from 'react';
import { Target, Brain, Award, Sparkles, TrendingUp, BookOpen, Clock, ChevronRight, Zap } from 'lucide-react';
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
        weakArea: 'Algebra'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserStats = async () => {
            try {
                const { data: results, error } = await supabase
                    .from('results')
                    .select('score, created_at')
                    .eq('user_email', user.email)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (results && results.length > 0) {
                    const totalScore = results.reduce((acc, curr) => acc + (curr.score || 0), 0);
                    setStats({
                        testsTaken: results.length,
                        vocabMastered: 124, // Mock for now
                        avgScore: Math.round(totalScore / results.length),
                        lastScore: results[0].score || 0,
                        weakArea: 'Standard English Conventions' // Mock for now
                    });
                }
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchUserStats();
    }, [user]);

    // Level Logic
    const level = Math.floor(stats.testsTaken / 2) + 1;
    const progressToNextLevel = (stats.testsTaken % 2) * 50;

    return (
        <div className="min-h-screen bg-[#020617] p-8 pb-24 text-slate-200">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-12">
                <h1 className="text-4xl font-black text-white mb-2">
                    Good Afternoon, {profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Scholar'} 👋
                </h1>
                <p className="text-slate-400 font-medium">Ready to continue your SAT preparation journey?</p>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Stats & Main Card */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-sm">
                            <div className="text-3xl font-black text-white mb-1">{stats.testsTaken}</div>
                            <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">Tests Taken</div>
                        </div>
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-sm">
                            <div className="text-3xl font-black text-indigo-400 mb-1">{stats.avgScore || '---'}</div>
                            <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">Average Score</div>
                        </div>
                    </div>

                    {/* Main Welcome Card */}
                    <div className="bg-indigo-600 rounded-3xl p-12 text-center relative overflow-hidden shadow-2xl shadow-indigo-500/20">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />

                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-8">
                            <Zap className="w-10 h-10 text-white" />
                        </div>

                        <h2 className="text-3xl font-bold text-white mb-4">Welcome to SatValley!</h2>
                        <p className="text-indigo-100 max-w-md mx-auto mb-12">
                            Take a practice test to baseline your performance and get AI-driven insights into your weak areas.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => onNavigate('practice')}
                                className="bg-white text-indigo-600 px-8 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-xl"
                            >
                                <Sparkles size={18} />
                                Start Baseline Test
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-8 mt-16 pt-12 border-t border-white/10">
                            <div className="flex flex-col items-center gap-2">
                                <Target className="text-white/40" size={24} />
                                <span className="text-white font-bold text-sm">Real Simulation</span>
                                <span className="text-[10px] text-indigo-200">Official SAT format</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Brain className="text-white/40" size={24} />
                                <span className="text-white font-bold text-sm">Smart Analysis</span>
                                <span className="text-[10px] text-indigo-200">Topic-level feedback</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <TrendingUp className="text-white/40" size={24} />
                                <span className="text-white font-bold text-sm">Score Predictor</span>
                                <span className="text-[10px] text-indigo-200">Scale of 400-1600</span>
                            </div>
                        </div>
                    </div>

                    {/* AI Suggestions Section */}
                    <div className="bg-white/5 rounded-3xl p-8 border border-white/10 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                <Sparkles className="text-indigo-400" size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">AI Topic Recommendations</h3>
                                <p className="text-xs text-slate-500">Based on your recent performance</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-amber-500 shadow-sm">
                                    <TrendingUp size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-white">Focus: {stats.weakArea}</div>
                                    <div className="text-xs text-slate-500">Practice this topic to see the biggest improvement in your score.</div>
                                </div>
                                <button
                                    onClick={() => onNavigate('practice')}
                                    className="px-4 py-2 bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-500 transition-colors"
                                >
                                    Practice Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Gamification */}
                <div className="space-y-8">
                    {/* Level Card */}
                    <div className="bg-white/5 rounded-3xl p-8 border border-white/10 shadow-sm">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
                                Level {level} Scholar
                            </div>
                            <div className="relative w-32 h-32 mx-auto mb-4">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="60"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="transparent"
                                        className="text-white/5"
                                    />
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="60"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="transparent"
                                        strokeDasharray={376.8}
                                        strokeDashoffset={376.8 - (376.8 * progressToNextLevel) / 100}
                                        className="text-indigo-500 transition-all duration-1000"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-black text-white">{level}</span>
                                    <span className="text-[8px] uppercase font-bold text-slate-500">Current Level</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/5">
                            <h4 className="text-sm font-bold text-white mb-4">Achievements</h4>
                            <div className="flex flex-wrap gap-3">
                                {/* Always have a getting started badge */}
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20" title="Getting Started">
                                    <Award size={24} />
                                </div>

                                {stats.testsTaken >= 1 && (
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]" title="First Test Complete">
                                        <Target size={24} />
                                    </div>
                                )}

                                {stats.testsTaken >= 5 && (
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]" title="Dedicated Scholar (5 Tests)">
                                        <BookOpen size={24} />
                                    </div>
                                )}

                                {stats.avgScore >= 1400 && (
                                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]" title="Top Scorer (1400+ Avg)">
                                        <Sparkles size={24} />
                                    </div>
                                )}

                                {stats.testsTaken === 0 && (
                                    <div className="text-xs text-slate-500 italic mt-2 w-full">Complete practice tests to unlock more badges!</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
