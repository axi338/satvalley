import { useEffect, useState, useMemo } from 'react';
import { Award, BookOpen, Calculator, ExternalLink, Zap, Globe, ArrowLeft, Loader2, AlertCircle, Trophy, Brain, Target, TrendingUp, Sparkles, CheckCircle2, ListChecks, Map, Star, ArrowUpRight, LayoutDashboard, Settings, ChevronLeft, History, ArrowRight, Clock, Filter, ChevronDown, X, Check, Search, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { MathText } from '../ui/MathText';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area
} from 'recharts';

const DOMAINS = {
  rw: [
    { id: 'information_ideas', label: 'Information and Ideas', description: '(26% of test section, 12-14 questions)' },
    { id: 'craft_structure', label: 'Craft and Structure', description: '(28% of test section, 13-15 questions)' },
    { id: 'expression_ideas', label: 'Expression of Ideas', description: '(20% of test section, 8-12 questions)' },
    { id: 'standard_english', label: 'Standard English Conventions', description: '(26% of test section, 11-15 questions)' }
  ],
  math: [
    { id: 'algebra', label: 'Algebra', description: '(35% of test section, 13-15 questions)' },
    { id: 'advanced_math', label: 'Advanced Math', description: '(35% of test section, 13-15 questions)' },
    { id: 'problem_solving', label: 'Problem-Solving and Data Analysis', description: '(15% of test section, 5-7 questions)' },
    { id: 'geometry_trig', label: 'Geometry and Trigonometry', description: '(15% of test section, 5-7 questions)' }
  ]
};

const SKILL_TO_DOMAIN_MAP: Record<string, string> = {
  // Reading and Writing
  'Information and Ideas': 'information_ideas',
  'Craft and Structure': 'craft_structure',
  'Expression of Ideas': 'expression_ideas',
  'Standard English Conventions': 'standard_english',
  // Math
  'Algebra': 'algebra',
  'Advanced Math': 'advanced_math',
  'Problem-Solving and Data Analysis': 'problem_solving',
  'Geometry and Trigonometry': 'geometry_trig',
  // Tag variations
  'Heart of Algebra': 'algebra',
  'Passport to Advanced Math': 'advanced_math',
  'Problem Solving and Data Analysis': 'problem_solving',
  'Additional Topics in Math': 'geometry_trig'
};

// --- Sub-components ---

const DomainCard = ({ label, description, mastery, colorClass }: { label: string, description: string, mastery: number, colorClass: string }) => {
  // Mastery bar blocks (7 blocks)
  const blocks = Array.from({ length: 7 });
  const filledBlocks = Math.round((mastery / 100) * 7);

  return (
    <div className="space-y-3 group/card">
      <div className="flex justify-between items-baseline">
        <h4 className="text-[14px] font-bold text-white group-hover/card:text-indigo-400 transition-colors">{label}</h4>
        <span className="text-[10px] font-black text-white/40">{mastery}%</span>
      </div>
      <p className="text-[11px] text-slate-400 font-medium line-clamp-1">{description}</p>
      <div className="flex gap-1">
        {blocks.map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-sm transition-all duration-700 ${i < filledBlocks ? colorClass : 'bg-white/5 shadow-inner'}`}
            style={{ transitionDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
    </div>
  );
};

// --- New Chart Components ---

const PerformanceRadar = ({ data }: { data: any[] }) => (
  <div className="h-[300px] w-full bg-white/[0.02] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid stroke="#ffffff10" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
        <Radar
          name="Mastery"
          dataKey="A"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.5}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
          itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  </div>
);

const QuestionDistribution = ({ data }: { data: any[] }) => {
  const COLORS = ['#10b981', '#f43f5e', '#6366f1'];

  return (
    <div className="h-[240px] w-full flex flex-col items-center justify-center p-4">
      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={8}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-4 mt-2">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <span className="text-[10px] font-black text-white uppercase tracking-tighter">{entry.value}</span>
            </div>
            <span className="text-[8px] font-bold text-slate-500 uppercase">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ScoreHistoryTrend = ({ data }: { data: any[] }) => (
  <div className="h-[120px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '10px' }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#6366f1"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#scoreGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const ActionCard = ({ title, score, total, label, colorClass, icon: Icon }: any) => (
  <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-sm flex flex-col items-center justify-center text-center">
    <div className={`p-3 rounded-xl ${colorClass.replace('bg-', 'bg-opacity-10 text-')} mb-4`}>
      <Icon size={24} />
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-4xl font-black text-white">{score}</span>
      {total && <span className="text-lg font-bold text-slate-500">/ {total}</span>}
    </div>
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">{label}</p>
  </div>
);

// --- Overlay Component for Question Review ---
const QuestionNavigationOverlay = ({ responses, currentIndex, onClose, onPrev, onNext, showAnswer, setShowAnswer, latestResult, apiBase }: any) => {
  if (currentIndex === null || !responses[currentIndex]) return null;
  const r = responses[currentIndex];
  const [fetchedExplanation, setFetchedExplanation] = useState<string | null>(null);

  useEffect(() => {
    setFetchedExplanation(null);
    if (!r.explanation && r.id) {
      supabase
        .from('questions')
        .select('explanation')
        .eq('id', r.id)
        .single()
        .then(({ data }) => {
          if (data?.explanation) {
            setFetchedExplanation(data.explanation);
          }
        });
    }
  }, [r.id, r.explanation]);

  const displayExplanation = r.explanation || fetchedExplanation;

  return (
    <div className="fixed inset-0 z-[500] bg-[#020617] flex flex-col animate-in fade-in duration-200">
      <header className="h-[72px] bg-white/5 border-b border-white/10 flex items-center justify-between px-8 text-white shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold tracking-tight">SAT Practice - {latestResult?.test_id || 'Test'}</h2>
          <div className="h-6 w-px bg-white/20" />
          <span className="text-sm font-medium text-slate-400">Knowledge and Skills: {r.skill || r.tags?.[0] || 'General'}</span>
        </div>
        <div className="flex items-center gap-4">
          {!latestResult.ai_suggestions && (
            <button
              onClick={() => {
                onClose();
                const btn = document.getElementById('generate-ai-review-btn');
                if (btn) {
                  btn.scrollIntoView({ behavior: 'smooth' });
                  btn.click();
                }
              }}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-500/30"
            >
              <Sparkles size={14} />
              Generate AI Insights
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto p-12 border-r border-white/10 bluebook-scroll">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-white uppercase tracking-widest">
                {r.section === 'rw' ? 'Reading and Writing' : 'Math'}: Question {currentIndex + 1}
              </span>
            </div>

            {r.passage && (
              <div className="bg-[#0A0F1E] p-8 rounded-2xl border border-white/5 font-serif text-[18px] leading-relaxed text-slate-300">
                <MathText text={r.passage} className="block" />
              </div>
            )}

            {r.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
                <img src={r.imageUrl.startsWith('http') ? r.imageUrl : `${apiBase}${r.imageUrl}`} alt="Question visual" className="w-full h-auto object-contain" />
              </div>
            )}

            <p className="text-[20px] font-bold text-slate-200 leading-relaxed">
              <MathText text={r.text} className="block" />
            </p>
          </div>
        </div>

        <div className="w-[450px] overflow-y-auto p-12 bg-white/5 bluebook-scroll">
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-8">Answer Choices</h3>
            {r.type === 'numeric' ? (
              <div className="space-y-4">
                <div className={`p-6 bg-white/5 rounded-2xl border ${r.userAnswer === r.answer ? 'border-emerald-500/30' : 'border-white/10'}`}>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Your Answer</span>
                  <p className={`text-2xl font-black ${r.userAnswer === r.answer ? 'text-emerald-400' : 'text-rose-400'}`}>{r.userAnswer || 'Omitted'}</p>
                </div>
                {showAnswer && r.userAnswer !== r.answer && (
                  <div className="p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest block mb-1">Correct Answer</span>
                    <p className="text-2xl font-black text-emerald-400">{r.answer}</p>
                  </div>
                )}
              </div>
            ) : (
              ['A', 'B', 'C', 'D'].map((letter, i) => {
                const isCorrect = r.answer === letter;
                const isSelected = r.userAnswer === letter;

                return (
                  <div key={letter} className={`p-5 rounded-2xl border flex items-center gap-4 transition-all relative ${showAnswer && isCorrect ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50' :
                    showAnswer && isSelected && !isCorrect ? 'bg-rose-500/10 border-rose-500/50' :
                      isSelected ? 'bg-white/10 border-white shadow-sm' : 'bg-white/5 border-white/10'
                    }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${showAnswer && isCorrect ? 'bg-emerald-500 text-black' :
                      showAnswer && isSelected && !isCorrect ? 'bg-rose-500 text-white' :
                        isSelected ? 'bg-white text-black' : 'bg-white/10 text-white/50'
                      }`}>
                      {letter}
                    </div>
                    <div className="flex-1">
                      <p className={`text-[15px] font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        <MathText text={r.options?.[i] || `Choice ${letter}`} />
                      </p>
                      {r.optionImages?.[i] && (
                        <div className="mt-2 rounded-lg border border-white/10 overflow-hidden bg-white/5 max-w-xs p-2">
                          <img src={r.optionImages[i].startsWith('http') ? r.optionImages[i] : `${apiBase}${r.optionImages[i]}`} alt={`Option ${letter}`} className="w-full h-auto object-contain" />
                        </div>
                      )}
                    </div>
                    {showAnswer && isCorrect && <Check className="text-emerald-400" size={20} />}
                    {showAnswer && isSelected && !isCorrect && <X className="text-rose-400" size={20} />}
                  </div>
                );
              })
            )}

            {showAnswer && displayExplanation && (
              <div className="mt-12 p-8 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-indigo-400 fill-current" />
                  <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Explanation</h4>
                </div>
                <p className="text-sm font-medium text-slate-300 leading-relaxed whitespace-pre-wrap">
                  <MathText text={displayExplanation} className="block" />
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="h-24 bg-white/5 border-t border-white/10 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${showAnswer ? 'bg-indigo-600 border-indigo-600' : 'border-white/20 group-hover:border-indigo-400'}`}>
              {showAnswer && <Check size={14} className="text-white" />}
            </div>
            <input type="checkbox" className="hidden" checked={showAnswer} onChange={() => setShowAnswer(!showAnswer)} />
            <span className="text-sm font-bold text-slate-300">Show correct answer and explanation</span>
          </label>
        </div>

        <div className="flex items-center gap-4">
          <button
            disabled={currentIndex === 0}
            onClick={onPrev}
            className="px-8 py-3 rounded-2xl border border-white/20 text-white font-black text-sm hover:bg-white/10 transition-all disabled:opacity-20 disabled:hover:bg-transparent"
          >
            Previous
          </button>
          <button
            disabled={currentIndex === responses.length - 1}
            onClick={onNext}
            className="px-8 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-20 disabled:shadow-none"
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );
};

export function ReviewPage({ user, onNavigate, params }: { user: any; onNavigate: (page: string, params?: any) => void; params?: any }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailedReview, setIsDetailedReview] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'rw' | 'math'>('all');
  const [reviewingQuestionIndex, setReviewingQuestionIndex] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const apiBase = (import.meta as any).env?.VITE_BACKEND_URL || '';

  useEffect(() => {
    fetch(`${apiBase}/api/results?userEmail=${user?.email}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then(data => {
        const fetchedResults = data.results || [];
        setResults(fetchedResults);

        // Auto-select latest or passed resultId
        if (params?.resultId && fetchedResults.length > 0) {
          const idx = fetchedResults.findIndex((r: any) => r.id === params.resultId);
          if (idx !== -1) setSelectedResultIndex(idx);
        }

        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [apiBase, user, params?.resultId]);

  const latestResult = results.length > 0 ? results[selectedResultIndex] : null;

  // Process data for the new sections
  const processPerformanceData = (responses: any[]) => {
    if (!responses) return { domains: { rw: [], math: [] }, tableData: [] };

    const domainStats: Record<string, { correct: number, total: number }> = {};

    // Initialize all domains with zero
    [...DOMAINS.rw, ...DOMAINS.math].forEach(d => {
      domainStats[d.id] = { correct: 0, total: 0 };
    });

    const tableData = responses.map((r, idx) => {
      const domainId = SKILL_TO_DOMAIN_MAP[r.skill] || SKILL_TO_DOMAIN_MAP[r.tags?.[0]] || 'other';
      const isCorrect = r.userAnswer === r.answer;

      if (domainStats[domainId]) {
        domainStats[domainId].total++;
        if (isCorrect) domainStats[domainId].correct++;
      }

      return {
        id: idx + 1,
        questionIndex: idx,
        section: r.section === 'rw' ? 'Reading and Writing' : 'Math',
        correctAnswer: r.answer,
        yourAnswer: r.userAnswer || 'Omitted',
        isCorrect,
        domain: r.skill || r.tags?.[0] || 'General',
        domainId
      };
    });

    const calculateMastery = (correct: number, total: number) => {
      if (total === 0) return 0;
      return Math.round((correct / total) * 100);
    };

    return {
      domains: {
        rw: DOMAINS.rw.map(d => ({ ...d, mastery: calculateMastery(domainStats[d.id].correct, domainStats[d.id].total) })),
        math: DOMAINS.math.map(d => ({ ...d, mastery: calculateMastery(domainStats[d.id].correct, domainStats[d.id].total) }))
      },
      tableData,
      radarData: [...DOMAINS.rw, ...DOMAINS.math].map(d => ({
        subject: d.label.split(' ')[0],
        A: calculateMastery(domainStats[d.id].correct, domainStats[d.id].total),
        fullMark: 100
      }))
    };
  };

  const trendData = useMemo(() => {
    return results.slice().reverse().map(r => ({
      name: new Date(r.created_at).toLocaleDateString(),
      score: (r.responses || []).filter((qr: any) => qr.userAnswer === qr.answer).length * 10 + 400 // Mock scaling if scores missing
    }));
  }, [results]);

  const pieData = useMemo(() => {
    if (!latestResult?.responses) return [];
    const correct = latestResult.responses.filter((r: any) => r.userAnswer === r.answer).length;
    const incorrect = latestResult.responses.filter((r: any) => r.userAnswer && r.userAnswer !== r.answer).length;
    const omitted = latestResult.responses.filter((r: any) => !r.userAnswer).length;
    return [
      { name: 'Correct', value: correct },
      { name: 'Incorrect', value: incorrect },
      { name: 'Omitted', value: omitted }
    ];
  }, [latestResult]);

  const performanceData = results.length > 0 ? processPerformanceData(latestResult.responses) : processPerformanceData([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [isDetailedReview]);

  const calculateSectionScores = (responses: any[]) => {
    if (!Array.isArray(responses)) {
      return { rw: 200, math: 200, total: 400, rwCorrect: 0, rwTotal: 0, mathCorrect: 0, mathTotal: 0 };
    }
    const rwQuestions = responses.filter(r => r.section === 'rw' || r.module?.startsWith('rw'));
    const mathQuestions = responses.filter(r => r.section === 'math' || r.module?.startsWith('math'));

    const rwCorrect = rwQuestions.filter(r => r.userAnswer === r.answer).length;
    const mathCorrect = mathQuestions.filter(r => r.userAnswer === r.answer).length;

    const calculateSectionScore = (correct: number, totalQuestions: number) => {
      if (totalQuestions === 0) return 200;
      const ratio = correct / totalQuestions;
      let rawScore = Math.round((ratio * 600) / 10) * 10 + 200;
      return Math.min(800, Math.max(200, rawScore));
    };

    const rwScore = calculateSectionScore(rwCorrect, rwQuestions.length);
    const mathScore = calculateSectionScore(mathCorrect, mathQuestions.length);

    return {
      rw: rwScore,
      math: mathScore,
      total: rwScore + mathScore,
      rwCorrect,
      rwTotal: rwQuestions.length,
      mathCorrect,
      mathTotal: mathQuestions.length
    };
  };

  const scores = latestResult
    ? calculateSectionScores(latestResult.responses || [])
    : { rw: 200, math: 200, total: 400, rwCorrect: 0, rwTotal: 0, mathCorrect: 0, mathTotal: 0 };

  // Enrich results with explanations if missing from stored responses
  useEffect(() => {
    if (latestResult && latestResult.responses) {
      const missingExplaRefs = latestResult.responses.filter((r: any) => !r.explanation && r.id);
      if (missingExplaRefs.length > 0) {
        supabase
          .from('questions')
          .select('id, explanation')
          .in('id', missingExplaRefs.map((r: any) => r.id))
          .then(({ data, error }) => {
            if (error) {
              console.error("Enrichment fetch error:", error);
              return;
            }
            if (data && data.length > 0) {
              const explanationMap = new Map(data.map(q => [q.id, q.explanation]));
              setResults(prevResults => {
                const updatedResults = [...prevResults];
                const targetId = latestResult.id;
                const idx = updatedResults.findIndex(res => res.id === targetId);

                if (idx !== -1) {
                  const resultToUpdate = { ...updatedResults[idx] };
                  resultToUpdate.responses = resultToUpdate.responses.map((r: any) => ({
                    ...r,
                    explanation: r.explanation || explanationMap.get(r.id)
                  }));
                  updatedResults[idx] = resultToUpdate;
                }
                return updatedResults;
              });
            }
          });
      }
    }
  }, [latestResult?.id]); // Only run when the selected result changes

  // Auto-refresh for background analysis
  useEffect(() => {
    if (latestResult && !latestResult.ai_suggestions && !isAnalyzing) {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 10) { // Stop after 30s
          clearInterval(interval);
          return;
        }

        const { data, error } = await supabase
          .from('results')
          .select('ai_suggestions')
          .eq('id', latestResult.id)
          .single();

        if (data?.ai_suggestions) {
          const updatedResults = [...results];
          updatedResults[selectedResultIndex] = {
            ...updatedResults[selectedResultIndex],
            ai_suggestions: data.ai_suggestions
          };
          setResults(updatedResults);
          clearInterval(interval);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [latestResult?.id, !!latestResult?.ai_suggestions]);

  const handleAnalyzePerformance = async () => {
    if (!latestResult?.id) return;
    setIsAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('You must be logged in to analyze performance');
      }

      const res = await fetch(`${apiBase}/api/results/${latestResult.id}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Analysis failed');

      // Update local state
      const updatedResults = [...results];
      updatedResults[selectedResultIndex] = {
        ...updatedResults[selectedResultIndex],
        ai_suggestions: data.analysis
      };
      setResults(updatedResults);
      toast.success('AI Analysis Complete!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to analyze performance');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-8">
          <div className="w-20 h-20 rounded-[2.5rem] border-4 border-white/20 border-t-indigo-400 animate-spin" />
          <p className="text-[10px] font-black text-indigo-300/40 uppercase tracking-[0.4em]">Synthesizing Analysis...</p>
        </div>
      </div>
    );
  }

  if (isDetailedReview && latestResult) {
    return (
      <div className="min-h-screen bg-[#020617] relative z-50">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#020617] to-[#020617] pointer-events-none" />

        {/* Header: SV Analytical Console */}
        <header className="fixed top-0 left-0 right-0 h-24 border-b border-white/10 z-[200] px-8 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl">
          <div className="flex items-center gap-8">
            <button
              onClick={() => setIsDetailedReview(false)}
              className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all border border-white/5 hover:border-white/20 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="font-black text-2xl text-white tracking-tighter leading-none">SV</span>
                <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mt-1">Satellite Valley</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-indigo-200/60 uppercase tracking-[0.3em] leading-none">Neural Analytics</span>
                <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1 italic">Protocol v2.5.0</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-4">
              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Operator Status</span>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Divergent Optimal
              </span>
            </div>
            <button
              onClick={() => {
                const missingExplaRefs = latestResult.responses.filter((r: any) => !r.explanation && r.id);
                if (missingExplaRefs.length > 0) {
                  supabase
                    .from('questions')
                    .select('id, explanation')
                    .in('id', missingExplaRefs.map((r: any) => r.id))
                    .then(({ data }) => {
                      if (data && data.length > 0) {
                        const explanationMap = new Map(data.map(q => [q.id, q.explanation]));
                        setResults(prevResults => {
                          const updatedResults = [...prevResults];
                          const targetId = latestResult.id;
                          const idx = updatedResults.findIndex(res => res.id === targetId);
                          if (idx !== -1) {
                            const resultToUpdate = { ...updatedResults[idx] };
                            resultToUpdate.responses = resultToUpdate.responses.map((r: any) => ({
                              ...r,
                              explanation: r.explanation || explanationMap.get(r.id)
                            }));
                            updatedResults[idx] = resultToUpdate;
                          }
                          return updatedResults;
                        });
                      }
                    });
                }
              }}
              className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 flex items-center gap-2 group"
            >
              <Zap className="w-3 h-3 text-indigo-400 group-hover:scale-110 transition-transform" />
              Sync Explanations
            </button>
            <button className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-500/20 border border-white/10">
              Secure Export
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto pt-44 pb-32 px-6 relative z-10">
          <div className="space-y-40">
            {['rw-m1', 'rw-m2', 'math-m1', 'math-m2'].map(mod => {
              const modResponses = (latestResult.responses || []).filter((r: any) => r.module === mod);
              if (modResponses.length === 0) return null;

              return (
                <div key={mod} className="space-y-24">
                  <div className="flex items-center gap-6 mb-16">
                    <div className="h-px flex-1 bg-white/10" />
                    <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.5em] px-8 py-3 bg-white/5 border border-white/10 rounded-full italic">
                      {mod.replace('-', ' ').toUpperCase()} Node Output
                    </h2>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  {modResponses.map((r: any, qIdx: number) => (
                    <div key={`${mod}-${qIdx}`} className="scroll-mt-48 group">
                      <div className="flex items-center gap-6 mb-8">
                        <span className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center font-black text-sm relative">
                          {qIdx + 1}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">
                            {r.module?.toUpperCase() || 'MOD'}
                          </span>
                          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                          <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Question Protocol</span>
                        </div>
                        <div className={`ml-auto px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${r.userAnswer === r.answer ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                          {r.userAnswer === r.answer ? 'Correct' : 'Incorrect'}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 glass-card p-10 border-white/10 bg-white/[0.02]">
                        <div className="space-y-8">
                          {r.passage && (
                            <div className="space-y-6">
                              <div className="bg-[#0A0F1E] border border-white/5 p-8 rounded-3xl font-serif text-lg text-slate-300 leading-loose max-h-[400px] overflow-y-auto custom-scrollbar">
                                <MathText text={r.passage} className="block" />
                              </div>
                              {r.imageUrl && (
                                <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                                  <img src={r.imageUrl.startsWith('http') ? r.imageUrl : `${apiBase}${r.imageUrl}`} alt="Question visual" className="w-full h-auto" />
                                </div>
                              )}
                            </div>
                          )}
                          {!r.passage && r.imageUrl && (
                            <div className="mb-6 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                              <img src={r.imageUrl.startsWith('http') ? r.imageUrl : `${apiBase}${r.imageUrl}`} alt="Question visual" className="w-full h-auto" />
                            </div>
                          )}
                          <p className="text-xl text-white font-bold tracking-tight leading-relaxed">
                            <MathText text={r.text} className="block" />
                          </p>
                        </div>

                        <div className="space-y-6">
                          {r.type === 'numeric' ? (
                            <div className="p-10 border border-white/10 rounded-[2rem] space-y-8 bg-black/20">
                              <div className={`p-4 rounded-xl border ${r.userAnswer === r.answer ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Your Answer</span>
                                <p className={`text-4xl font-black ${r.userAnswer === r.answer ? 'text-emerald-400' : 'text-rose-400'}`}>{r.userAnswer || 'VOID'}</p>
                              </div>
                              {r.userAnswer !== r.answer && (
                                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                                  <span className="text-[10px] font-black text-emerald-400/50 uppercase tracking-widest block mb-2">Correct Answer</span>
                                  <p className="text-4xl font-black text-emerald-400">{r.answer}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            ['A', 'B', 'C', 'D'].map((letter, i) => (
                              <div key={letter} className={`p-5 rounded-2xl border flex items-center gap-5 transition-all relative overflow-hidden
                                ${r.answer === letter ? 'border-emerald-500 bg-emerald-500/10' :
                                  r.userAnswer === letter ? 'border-rose-500 bg-rose-500/10' : 'bg-white/5 border-white/5 opacity-50'
                                }`}>

                                {/* Answer Badge */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] z-10
                                  ${r.answer === letter ? 'bg-emerald-500 text-black' :
                                    r.userAnswer === letter ? 'bg-rose-500 text-white' : 'bg-black/40 text-white/40'
                                  }`}>
                                  {letter}
                                </div>

                                <div className="flex-1 flex flex-col gap-2 z-10">
                                  <span className={`text-sm font-medium ${r.answer === letter ? 'text-emerald-200' : r.userAnswer === letter ? 'text-rose-200' : 'text-slate-400'}`}>
                                    <MathText text={r.options?.[i] || `Sequence ${letter}`} />
                                  </span>
                                  {r.optionImages?.[i] && (
                                    <div className="mt-1 rounded-lg border border-white/10 overflow-hidden bg-black/40 max-w-xs">
                                      <img src={r.optionImages[i].startsWith('http') ? r.optionImages[i] : `${apiBase}${r.optionImages[i]}`} alt={`Option ${letter}`} className="w-full h-auto" />
                                    </div>
                                  )}
                                </div>

                                {/* Status Indicator */}
                                {r.answer === letter && (
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-900/40 px-3 py-1 rounded border border-emerald-500/30">
                                    Correct
                                  </div>
                                )}
                                {r.userAnswer === letter && r.answer !== letter && (
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-900/40 px-3 py-1 rounded border border-rose-500/30">
                                    Your Choice
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="mt-8 border border-indigo-500/20 bg-indigo-500/5 p-10 rounded-[2rem]">
                        <h4 className="flex items-center gap-4 text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em] mb-6">
                          <Zap className="w-4 h-4 fill-current" />
                          Neural Synthesis
                        </h4>
                        <p className="text-indigo-100/70 text-sm font-medium leading-relaxed whitespace-pre-wrap">
                          <MathText text={r.explanation || "No synthesis available for this iteration."} className="block" />
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6">
        <div className="bg-rose-500/10 p-8 rounded-3xl border border-rose-500/20 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">Sync Error</h2>
          <p className="text-slate-400 mb-8">{error}</p>
          <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
          <BookOpen className="text-slate-500" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No Practice Tests Yet</h2>
        <p className="text-slate-400 mb-8">Complete a practice test to see your performance review here.</p>
        <button onClick={() => onNavigate('practice')} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white font-bold rounded-2xl">Start a Test</button>
      </div>
    );
  }

  const filteredTableData = performanceData.tableData.filter(d => {
    if (activeTab === 'all') return true;
    if (activeTab === 'rw') return d.section === 'Reading and Writing';
    if (activeTab === 'math') return d.section === 'Math';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#020617] pb-32">
      {/* Navigation Overlay */}
      <AnimatePresence>
        {reviewingQuestionIndex !== null && (
          <QuestionNavigationOverlay
            responses={latestResult.responses}
            currentIndex={reviewingQuestionIndex}
            onClose={() => setReviewingQuestionIndex(null)}
            onPrev={() => setReviewingQuestionIndex(prev => prev! - 1)}
            onNext={() => setReviewingQuestionIndex(prev => prev! + 1)}
            showAnswer={showAnswer}
            setShowAnswer={setShowAnswer}
            latestResult={latestResult}
            apiBase={apiBase}
          />
        )}
      </AnimatePresence>

      <div className="bg-[#020617] border-b border-white/10 pt-32 pb-12 px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-slate-300 transition-all">
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">Analytical Suite</span>
                  <div className="w-1 h-1 rounded-full bg-slate-700" />
                  <span className="text-[11px] font-black text-emerald-400/60 uppercase tracking-widest">Live Sync Alpha</span>
                </div>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
                {latestResult?.name || 'SAT Practice Test'}
                <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
              </h1>
              <div className="flex items-center gap-6 text-slate-400">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-slate-600" />
                  <span className="text-[10px] font-black uppercase tracking-wider">{new Date(latestResult?.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-600" />
                  <span className="text-[10px] font-black uppercase tracking-wider">{Math.floor((latestResult?.time_taken_seconds || 0) / 60)}m taken</span>
                </div>
              </div>
            </div>

            <div className="flex gap-6 items-end">
              <div className="hidden lg:block w-48 mb-2">
                <ScoreHistoryTrend data={trendData} />
              </div>
              <div className="bg-white/5 border border-white/10 px-10 py-6 rounded-[2.5rem] text-white flex flex-col items-center min-w-[200px] shadow-2xl relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] mb-1 text-slate-500 group-hover:text-indigo-400 transition-colors">Cumulative Scaled</span>
                <span className="text-6xl font-black italic relative tracking-tighter">{scores.total}</span>
                <div className="mt-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingUp size={12} /> +12 PTS
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-12 space-y-12">
        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {(['all', 'rw', 'math'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
            >
              {tab === 'all' ? 'All Questions' : tab === 'rw' ? 'Reading and Writing' : 'Math'}
            </button>
          ))}
        </div>

        {/* Knowledge and Skills */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-white tracking-tight">Knowledge and Skills</h2>
                <span className="text-indigo-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-indigo-500/20 bg-indigo-500/5">Multicore Evaluation</span>
              </div>
              <p className="text-slate-400 font-medium text-sm">Cross-domain performance calibration across 8 primary Measured Domains.</p>
            </div>
            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Compute Status</span>
                <span className="text-[10px] font-black text-emerald-400 uppercase">Synchronized</span>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-8">
            {/* Radar Mastery */}
            <div className="lg:col-span-1 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Domain Mastery Radar</h3>
              </div>
              <PerformanceRadar data={performanceData.radarData} />
              <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl space-y-3">
                <p className="text-[10px] font-medium text-slate-400 leading-relaxed italic">
                  Radar plot normalizes responses against standard SAT difficulty scaling. Peak values indicate areas of sustained optimal performance.
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-10">
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] border-b border-white/5 pb-4">RW Node Cluster</h3>
                <div className="grid grid-cols-1 gap-10">
                  {performanceData.domains.rw.map(d => (
                    <DomainCard key={d.id} {...d} colorClass="bg-indigo-500" />
                  ))}
                </div>
              </div>
              <div className="space-y-10">
                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] border-b border-white/5 pb-4">Math Node Cluster</h3>
                <div className="grid grid-cols-1 gap-10">
                  {performanceData.domains.math.map(d => (
                    <DomainCard key={d.id} {...d} colorClass="bg-emerald-500" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Questions Overview */}
        <section className="space-y-8 pt-12 border-t border-white/10">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Questions Overview</h2>
            <p className="text-slate-400 font-medium mt-1">Review your results for each question from this practice test.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 glass-card border-white/5 bg-white/[0.01] p-0 overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Question Polarity</h3>
              </div>
              <QuestionDistribution data={pieData} />
            </div>
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <ActionCard label="Total Iterations" score={latestResult.responses?.length || 0} icon={ListChecks} colorClass="bg-indigo-500" />
              <ActionCard label="Optimal Resolves" score={scores.rwCorrect + scores.mathCorrect} icon={CheckCircle2} colorClass="bg-emerald-500" />
              <ActionCard label="Divergent Paths" score={(latestResult.responses?.length || 0) - (scores.rwCorrect + scores.mathCorrect)} icon={X} colorClass="bg-rose-500" />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-slate-300 border-b border-white/10">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Question</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Section</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Correct Answer</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Your Answer</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Actions</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Domain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTableData.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-slate-300">{row.id}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-slate-300">{row.section}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-black text-xs">
                          {row.correctAnswer}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`w-fit px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${row.isCorrect ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                          {row.yourAnswer}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <button
                          onClick={() => setReviewingQuestionIndex(row.questionIndex)}
                          className="text-indigo-400 text-xs font-black uppercase tracking-widest hover:text-indigo-300 transition-colors flex items-center gap-1"
                        >
                          Review <ArrowUpRight size={14} />
                        </button>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-slate-500">{row.domain}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Analysis Section */}
        {latestResult.ai_suggestions ? (
          <section className="space-y-8 pt-12 border-t border-white/10">
            <div className="flex items-center gap-3">
              <Brain className="text-indigo-400" />
              <h2 className="text-2xl font-black text-white tracking-tight">AI Insights</h2>
            </div>

            <div className="bg-indigo-600/20 border border-indigo-500/20 p-12 rounded-[3rem] text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Sparkles size={200} className="text-indigo-400" />
              </div>
              <div className="relative z-10 max-w-2xl">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-4 py-2 rounded-full mb-8 inline-block">Neural Analysis</span>
                <h3 className="text-3xl font-black italic mb-6 leading-tight text-white">"{latestResult.ai_suggestions.encouragement}"</h3>
                <p className="text-lg font-medium text-slate-300 leading-relaxed italic">{latestResult.ai_suggestions.overall_critique}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {latestResult.ai_suggestions.roadmap?.map((step: any, idx: number) => (
                <div key={idx} className="bg-white/5 p-8 rounded-[2rem] border border-white/10 flex gap-6 hover:bg-white/[0.07] transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black italic shrink-0">
                    {idx + 1}
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-black text-white tracking-tight uppercase">{step.title}</h4>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">{step.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="space-y-8 pt-12 border-t border-white/10 flex flex-col items-center justify-center py-12">
            <Brain className="w-16 h-16 text-indigo-500/50 mb-4" />
            <h2 className="text-2xl font-black text-white tracking-tight mb-2">AI Performance Analysis</h2>
            <p className="text-slate-400 mb-8 text-center max-w-md">Get personalized insights and a study roadmap generated by our advanced AI model based on your test performance.</p>
            <button
              id="generate-ai-review-btn"
              onClick={handleAnalyzePerformance}
              disabled={isAnalyzing}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white font-bold rounded-2xl flex items-center gap-3 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate AI Review
                </>
              )}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
