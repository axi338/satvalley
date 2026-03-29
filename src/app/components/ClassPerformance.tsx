import { TrendingUp, Award, Zap, BookOpen } from 'lucide-react';
import { useAppSelector } from '../store';

interface PerformanceData {
    id: string;
    student_id: string;
    quiz_scores: any[];
    homework_scores: any[];
    overall_score: number;
    improvement_percentage: number;
}

export function ClassPerformance() {
    const { performanceData } = useAppSelector(state => state.performance);

    const mockInsight = {
        topic: "Algebra",
        suggestion: "You scored below average in Algebra. Here's a set of targeted problems to help you improve!",
        link: "#"
    };

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-[#0a0f1d]/40 border border-white/10 rounded-3xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <h4 className="text-indigo-200/40 font-black uppercase tracking-[0.2em] text-[10px] mb-2">Overall Proficiency</h4>
                        <div className="text-4xl font-black text-white tabular-nums">{performanceData?.overall_score || 0}%</div>
                        <div className="mt-4 flex items-center gap-2 text-emerald-400 font-bold text-xs">
                            <TrendingUp size={14} />
                            +{performanceData?.improvement_percentage || 0}% Improvement
                        </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 text-indigo-500/5 rotate-12">
                        <Award size={160} strokeWidth={1} />
                    </div>
                </div>

                <div className="p-8 bg-[#0a0f1d]/40 border border-white/10 rounded-3xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <h4 className="text-indigo-200/40 font-black uppercase tracking-[0.2em] text-[10px] mb-2">Quizzes Completed</h4>
                        <div className="text-4xl font-black text-white tabular-nums">{performanceData?.quiz_scores?.length || 0}</div>
                        <div className="mt-4 flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                            <Zap size={14} />
                            Elite Tier
                        </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 text-indigo-500/5 rotate-12">
                        <BookOpen size={160} strokeWidth={1} />
                    </div>
                </div>
            </div>

            {/* AI Insights Card */}
            <div className="bg-gradient-to-br from-indigo-900/40 to-cyan-900/40 border border-indigo-500/30 p-8 rounded-3xl relative group overflow-hidden shadow-2xl shadow-indigo-500/10">
                <div className="absolute top-0 right-0 p-8 text-indigo-400/20 group-hover:scale-110 transition-transform">
                    <Zap size={80} strokeWidth={1} />
                </div>
                <div className="relative z-10">
                    <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-4 inline-block">AI Neural Insight</span>
                    <h3 className="text-xl font-bold text-white mb-2">Targeted Improvement: {mockInsight.topic}</h3>
                    <p className="text-indigo-200/80 leading-relaxed max-w-xl font-medium">
                        {mockInsight.suggestion}
                    </p>
                    <button className="mt-6 flex items-center gap-2 text-indigo-400 font-black uppercase tracking-[0.2em] text-[10px] hover:text-white transition-colors group/btn">
                        View Targeted Exercises
                        <TrendingUp size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
