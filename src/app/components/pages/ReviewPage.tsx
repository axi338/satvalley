import { useEffect, useState } from 'react';
import { Award, BookOpen, Calculator, ExternalLink, Zap, Globe, ArrowLeft, Loader2, AlertCircle, Trophy, Brain, Target, TrendingUp, Sparkles, CheckCircle2, ListChecks, Map, Star, ArrowUpRight, LayoutDashboard, Settings, ChevronLeft, History, ArrowRight, Clock, Filter, ChevronDown, X, Check, Search, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

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
    <div className="space-y-3">
      <div className="flex justify-between items-baseline">
        <h4 className="text-[14px] font-bold text-white">{label}</h4>
      </div>
      <p className="text-[11px] text-slate-400 font-medium">{description}</p>
      <div className="flex gap-1">
        {blocks.map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-sm transition-all duration-700 ${i < filledBlocks ? colorClass : 'bg-white/5'}`}
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
        Difficulty level: <span className="text-slate-300 font-black">{mastery > 80 ? 'Hard' : mastery > 40 ? 'Medium' : 'Easy'}</span>
      </p>
    </div>
  );
};

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

  // --- Overlay Component for Question Review ---
  const QuestionNavigationOverlay = ({ responses, currentIndex, onClose, onPrev, onNext, showAnswer, setShowAnswer }: any) => {
    if (currentIndex === null || !responses[currentIndex]) return null;
    const r = responses[currentIndex];

    return (
      <div className="fixed inset-0 z-[500] bg-[#020617] flex flex-col animate-in fade-in duration-200">
        <header className="h-[72px] bg-white/5 border-b border-white/10 flex items-center justify-between px-8 text-white shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold tracking-tight">SAT Practice - {latestResult?.test_id || 'Test'}</h2>
            <div className="h-6 w-px bg-white/20" />
            <span className="text-sm font-medium text-slate-400">Knowledge and Skills: {r.skill || r.tags?.[0] || 'General'}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
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
                  {r.passage}
                </div>
              )}

              {r.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
                  <img src={r.imageUrl.startsWith('http') ? r.imageUrl : `${apiBase}${r.imageUrl}`} alt="Question visual" className="w-full h-auto object-contain" />
                </div>
              )}

              <p className="text-[20px] font-bold text-slate-200 leading-relaxed">{r.text}</p>
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
                          {r.options?.[i] || `Choice ${letter}`}
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

              {showAnswer && r.explanation && (
                <div className="mt-12 p-8 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-indigo-400 fill-current" />
                    <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Explanation</h4>
                  </div>
                  <p className="text-sm font-medium text-slate-300 leading-relaxed whitespace-pre-wrap">{r.explanation}</p>
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
      tableData
    };
  };

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
                                {r.passage}
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
                          <p className="text-xl text-white font-bold tracking-tight leading-relaxed">{r.text}</p>
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
                                    {r.options?.[i] || `Sequence ${letter}`}
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
                          {r.explanation || "No synthesis available for this iteration."}
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
          />
        )}
      </AnimatePresence>

      <div className="bg-[#020617] border-b border-white/10 pt-32 pb-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-slate-300 transition-all">
                  <ChevronLeft size={20} />
                </button>
                <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">Practice Test Review</span>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight">
                {latestResult?.name || 'SAT Practice Test'}
              </h1>
              <div className="flex items-center gap-6 text-slate-400">
                <div className="flex items-center gap-2">
                  <History size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">{new Date(latestResult?.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">{Math.floor((latestResult?.time_taken_seconds || 0) / 60)}m taken</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-slate-900 px-10 py-6 rounded-[2rem] text-white flex flex-col items-center min-w-[180px]">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-50">Total Score</span>
                <span className="text-5xl font-black italic">{scores.total}</span>
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
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-white tracking-tight">Knowledge and Skills <span className="text-indigo-400 text-[11px] font-black uppercase tracking-widest ml-1 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">New!</span></h2>
            <Info size={16} className="text-slate-500" />
          </div>
          <p className="text-slate-400 font-medium">View your performance across the 8 content domains measured on the SAT.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
            <div className="space-y-10">
              <h3 className="text-lg font-black text-white border-b border-white/5 pb-4">Reading and Writing</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                {performanceData.domains.rw.map(d => (
                  <DomainCard key={d.id} {...d} colorClass="bg-indigo-500" />
                ))}
              </div>
            </div>
            <div className="space-y-10">
              <h3 className="text-lg font-black text-white border-b border-white/5 pb-4">Math</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                {performanceData.domains.math.map(d => (
                  <DomainCard key={d.id} {...d} colorClass="bg-indigo-500" />
                ))}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <ActionCard label="Total Questions" score={latestResult.responses?.length || 0} icon={ListChecks} colorClass="bg-indigo-500" />
            <ActionCard label="Correct Answers" score={scores.rwCorrect + scores.mathCorrect} icon={CheckCircle2} colorClass="bg-emerald-500" />
            <ActionCard label="Incorrect Answers" score={(latestResult.responses?.length || 0) - (scores.rwCorrect + scores.mathCorrect)} icon={X} colorClass="bg-rose-500" />
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
        {latestResult.ai_suggestions && (
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
        )}
      </div>
    </div>
  );
}
