import { useState, useEffect, useMemo } from 'react';
import { Target, Brain, Award, Sparkles, TrendingUp, BookOpen, Clock, ChevronRight, Zap, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, AreaChart, Area
} from 'recharts';

interface DashboardPageProps {
    user: any;
    onNavigate: (page: string) => void;
}

interface AIAnalysis {
    mastery_score?: number;
    encouragement?: string;
    overall_critique?: string;
    skill_breakdown?: Array<{
        skill: string;
        mastery: number;
        insight: string;
    }>;
    roadmap?: Array<{
        step: number;
        title: string;
        action: string;
    }>;
}

export function DashboardPage({ user, onNavigate }: DashboardPageProps) {
    const [allResults, setAllResults] = useState<any[]>([]);
    const [stats, setStats] = useState({
        testsTaken: 0,
        vocabMastered: 0,
        avgScore: 0,
        lastScore: 0,
        weakArea: 'Standard English Conventions'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserStats = async () => {
            try {
                const { data: results, error } = await supabase
                    .from('results')
                    .select('*')
                    .eq('user_email', user.email)
                    .order('created_at', { ascending: true }); // Ascending for chart

                if (error) throw error;

                if (results && results.length > 0) {
                    setAllResults(results);
                    const totalScore = results.reduce((acc, curr) => acc + (curr.score || 0), 0);

                    // Latest result for weak area and roadmap
                    const latest = results[results.length - 1];
                    const ai: AIAnalysis = latest.ai_suggestions || {};

                    // Determine weak area from skill breakdown if possible
                    let weakArea = 'Standard English Conventions';
                    if (ai.skill_breakdown && ai.skill_breakdown.length > 0) {
                        const lowSkill = [...ai.skill_breakdown].sort((a, b) => a.mastery - b.mastery)[0];
                        weakArea = lowSkill.skill;
                    }

                    setStats({
                        testsTaken: results.length,
                        vocabMastered: 124, // Mock until vocab system is refined
                        avgScore: Math.round(totalScore / results.length),
                        lastScore: latest.score || 0,
                        weakArea
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

    // Derived data for charts
    const chartData = useMemo(() => {
        return allResults.map((r, i) => ({
            name: `Test ${i + 1}`,
            score: r.score,
            date: new Date(r.created_at).toLocaleDateString()
        }));
    }, [allResults]);

    const skillData = useMemo(() => {
        const latestInfo = allResults[allResults.length - 1]?.ai_suggestions;
        if (!latestInfo?.skill_breakdown) return null;
        return latestInfo.skill_breakdown.map((s: any) => ({
            skill: s.skill,
            mastery: s.mastery
        }));
    }, [allResults]);

    const latestAI: AIAnalysis = allResults[allResults.length - 1]?.ai_suggestions || {};

    // Level Logic
    const level = Math.floor(stats.testsTaken / 2) + 1;
    const progressToNextLevel = (stats.testsTaken % 2) * 50;

    const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

    if (loading) return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 font-bold animate-pulse">Syncing your progress...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020617] p-8 pb-24 text-slate-200">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                        Good Afternoon, {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Scholar'} 👋
                    </h1>
                    <p className="text-slate-400 font-medium">Your SAT growth journey is powered by AI insights.</p>
                </div>
                {allResults.length > 0 && (
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                        <TrendingUp className="text-emerald-400" size={24} />
                        <div>
                            <div className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Latest Score</div>
                            <div className="text-2xl font-black text-white">{stats.lastScore}</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Stats & Main Card */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Score Evolution Chart */}
                    <div className="bg-white/5 rounded-3xl p-8 border border-white/10 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-white">Score Evolution</h3>
                                <p className="text-xs text-slate-500 mt-1">Your performance trend over time</p>
                            </div>
                            <div className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                                {stats.testsTaken} Sessions
                            </div>
                        </div>

                        <div className="h-[280px] w-full mt-4">
                            {allResults.length > 1 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#64748b"
                                            fontSize={10}
                                            fontWeight={900}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            domain={[400, 1600]}
                                            stroke="#64748b"
                                            fontSize={10}
                                            fontWeight={900}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #ffffff10',
                                                borderRadius: '16px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                color: '#fff'
                                            }}
                                            itemStyle={{ color: '#818cf8' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="score"
                                            stroke="#6366f1"
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorScore)"
                                            animationDuration={2000}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 border-2 border-dashed border-white/5 rounded-2xl">
                                    <TrendingUp size={40} className="opacity-20" />
                                    <p className="font-bold text-sm">Take more tests to see your growth trend.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Skill Mastery Breakdown (AI Powered) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white/5 rounded-3xl p-8 border border-white/10 shadow-sm">
                            <h3 className="text-xl font-bold text-white mb-6">Skill Mastery</h3>
                            {skillData ? (
                                <div className="h-[220px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={skillData} layout="vertical">
                                            <XAxis type="number" domain={[0, 100]} hide />
                                            <YAxis
                                                dataKey="skill"
                                                type="category"
                                                stroke="#64748b"
                                                fontSize={10}
                                                fontWeight={900}
                                                width={100}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{
                                                    backgroundColor: '#1e293b',
                                                    border: '1px solid #ffffff10',
                                                    borderRadius: '12px'
                                                }}
                                            />
                                            <Bar dataKey="mastery" radius={[0, 4, 4, 0]} barSize={12}>
                                                {skillData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm italic text-center p-6 bg-black/20 rounded-2xl">
                                    AI analysis will appear here after your first full test session.
                                </div>
                            )}
                        </div>

                        {/* AI Growth Roadmap Card */}
                        <div className="bg-indigo-600 rounded-3xl p-8 border border-white/10 shadow-xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4">
                                <Brain className="text-white/20 w-12 h-12" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4">Growth Roadmap</h3>

                            {latestAI.roadmap ? (
                                <div className="space-y-4">
                                    {latestAI.roadmap.slice(0, 2).map((step, idx) => (
                                        <div key={idx} className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                                            <div className="text-[10px] uppercase font-black text-white/60 mb-1">Step {step.step}: {step.title}</div>
                                            <div className="text-xs text-white/90 leading-relaxed line-clamp-2">{step.action}</div>
                                        </div>
                                    ))}
                                    <button
                                        className="w-full py-3 bg-white text-indigo-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-50 mt-2"
                                        onClick={() => onNavigate('practice')}
                                    >
                                        View Full Guide
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6 pt-4">
                                    <p className="text-indigo-100 text-sm leading-relaxed">
                                        Take a test to get a personalized, AI-generated study plan tailored to your results.
                                    </p>
                                    <button
                                        onClick={() => onNavigate('practice')}
                                        className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-bold shadow-lg"
                                    >
                                        Get Started
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Suggestions Summary */}
                    <div className="bg-white/5 rounded-3xl p-8 border border-white/10 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                <Sparkles className="text-indigo-400" size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">AI Pedagogical Insight</h3>
                                <p className="text-xs text-slate-500">Targeted feedback on your readiness</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col md:flex-row items-center gap-6">
                                <div className="w-16 h-16 shrink-0 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-amber-500 shadow-sm border border-white/5">
                                    {latestAI.mastery_score ? (
                                        <div className="text-2xl font-black">{latestAI.mastery_score}</div>
                                    ) : (
                                        <TrendingUp size={32} />
                                    )}
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <div className="text-sm font-bold text-white mb-1">
                                        {latestAI.mastery_score ? `${latestAI.mastery_score}% Mastery Score` : `Focus: ${stats.weakArea}`}
                                    </div>
                                    <div className="text-xs text-slate-400 leading-relaxed">
                                        {latestAI.overall_critique || "Practice specific topics to see the biggest improvement in your scores. Your current trajectory suggests significant potential in Reading & Writing."}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onNavigate('practice')}
                                    className="px-6 py-3 bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-500 transition-colors shrink-0"
                                >
                                    Continue Learning
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Gamification & Quick Stats */}
                <div className="space-y-8">
                    {/* Level Card */}
                    <div className="bg-white/5 rounded-3xl p-8 border border-white/10 shadow-sm">
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
                                Level {level} Scholar
                            </div>
                            <div className="relative w-40 h-40 mx-auto mb-4">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="74"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="transparent"
                                        className="text-white/5"
                                    />
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="74"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="transparent"
                                        strokeDasharray={464.7}
                                        strokeDashoffset={464.7 - (464.7 * progressToNextLevel) / 100}
                                        className="text-indigo-500 transition-all duration-1000 stroke-round"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-black text-white">{level}</span>
                                    <span className="text-[9px] uppercase font-bold text-slate-500 mt-1">Current Level</span>
                                </div>
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 flex justify-between px-4 mt-2">
                                <span>Level {level}</span>
                                <span>{progressToNextLevel}% towards Level {level + 1}</span>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/5">
                            <h4 className="text-sm font-bold text-white mb-6 flex items-center justify-between">
                                Achievement Badges
                                <Award className="text-slate-500" size={16} />
                            </h4>
                            <div className="grid grid-cols-4 gap-4">
                                {/* Always have a getting started badge */}
                                <div className="aspect-square rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-white/5 group relative cursor-help" title="Getting Started">
                                    <Award size={24} className="group-hover:scale-110 transition-transform" />
                                </div>

                                {stats.testsTaken >= 1 && (
                                    <div className="aspect-square rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group relative cursor-help" title="First Milestone">
                                        <CheckCircle2 size={24} className="group-hover:scale-110 transition-transform" />
                                    </div>
                                )}

                                {stats.testsTaken >= 5 && (
                                    <div className="aspect-square rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 group relative cursor-help" title="Studious Scholar">
                                        <BookOpen size={24} className="group-hover:scale-110 transition-transform" />
                                    </div>
                                )}

                                {stats.avgScore >= 1400 && (
                                    <div className="aspect-square rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20 group relative cursor-help" title="Elite Performer">
                                        <Sparkles size={24} className="group-hover:scale-110 transition-transform" />
                                    </div>
                                )}
                            </div>
                            {stats.testsTaken === 0 && (
                                <p className="text-[10px] text-slate-500 mt-6 text-center italic">Take your first test to start collecting badges!</p>
                            )}
                        </div>
                    </div>

                    {/* Weekly Goal Progress */}
                    <div className="bg-white/5 rounded-3xl p-8 border border-white/10 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-sm font-bold text-white">Daily Target</h4>
                            <Clock className="text-slate-500" size={16} />
                        </div>
                        <div className="space-y-4">
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[65%]" />
                            </div>
                            <div className="flex justify-between text-[11px] font-medium">
                                <span className="text-slate-400">45 / 60 mins active today</span>
                                <span className="text-emerald-400">65% Done</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
