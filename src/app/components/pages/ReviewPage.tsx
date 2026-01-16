import { useEffect, useState } from 'react';
import { Award, ChevronRight, BookOpen, Calculator, ExternalLink, Zap, Globe, ArrowLeft, Loader2, AlertCircle, Trophy } from 'lucide-react';

export function ReviewPage({ user, onNavigate }: { user: any; onNavigate: (page: string) => void }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailedReview, setIsDetailedReview] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const apiBase = (import.meta as any).env?.VITE_BACKEND_URL || '';

  useEffect(() => {
    fetch(`${apiBase}/api/results?userEmail=${user?.email}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then(data => {
        setResults(data.results || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [apiBase, user]);

  const latestResult = results.length > 0 ? results[selectedResultIndex] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [isDetailedReview]);

  const calculateSectionScores = (responses: any[]) => {
    const rwQuestions = responses.filter(r => r.section === 'rw' || r.module?.startsWith('rw'));
    const mathQuestions = responses.filter(r => r.section === 'math' || r.module?.startsWith('math'));

    const rwCorrect = rwQuestions.filter(r => r.userAnswer === r.answer).length;
    const mathCorrect = mathQuestions.filter(r => r.userAnswer === r.answer).length;

    const rwScore = rwQuestions.length > 0 ? Math.round((rwCorrect / rwQuestions.length) * 600) + 200 : 200;
    const mathScore = mathQuestions.length > 0 ? Math.round((mathCorrect / mathQuestions.length) * 600) + 200 : 200;

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

  const scores = latestResult ? calculateSectionScores(latestResult.responses || []) : { rw: 200, math: 200, total: 400, rwCorrect: 0, rwTotal: 0, mathCorrect: 0, mathTotal: 0 };

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

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 h-24 border-b border-white/10 z-[200] px-8 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl">
          <div className="flex items-center gap-8">
            <button
              onClick={() => setIsDetailedReview(false)}
              className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all border border-white/5 hover:border-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-6">
              <span className="font-black text-xl text-white tracking-tighter">SV</span>
              <div className="h-6 w-px bg-white/10" />
              <span className="text-[10px] font-black text-indigo-200/60 uppercase tracking-[0.3em]">Neural Analytics Console</span>
            </div>
          </div>
          <button className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-500/20">
            Secure Export
          </button>
        </header>

        <div className="max-w-4xl mx-auto pt-44 pb-32 px-6 relative z-10">
          <div className="space-y-24">
            {latestResult.responses.map((r: any, idx: number) => (
              <div key={idx} className="scroll-mt-48 group">
                <div className="flex items-center gap-6 mb-8">
                  <span className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center font-black text-sm">
                    {idx + 1}
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
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20">
        <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Connection Sync Failure</h2>
          <p className="text-rose-200/60 mb-8 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-all"
          >
            Retry Protocol
          </button>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20">
        <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8">
          <BookOpen className="w-10 h-10 text-indigo-400/50" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4 italic">No Practice Data Found</h2>
        <p className="text-slate-400 max-w-md text-center mb-12 font-medium">
          Complete your first practice test to unlock deep analytical insights and performance tracking.
        </p>
        <button
          onClick={() => onNavigate('practice')}
          className="px-12 py-5 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-white/5"
        >
          Begin Initialization
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-44 pb-32 px-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-24 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center gap-3 text-indigo-400 font-black mb-8 opacity-60">
            <Globe className="w-5 h-5" />
            <span className="uppercase tracking-[0.4em] text-[10px]">Analytical Performance Index</span>
          </div>
          <h1 className="text-7xl lg:text-9xl font-black text-white tracking-tighter italic lg:-ml-1">Your Practice <br /><span className="opacity-20 not-italic">Results.</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Main Results Area */}
          <div className="lg:col-span-8 grid grid-cols-1 gap-10">
            {/* Consolidated Total Score Card */}
            <div className="glass-card hover:bg-white/5 transition-all duration-700 overflow-hidden flex flex-col group border-white/10">
              <div className="bg-gradient-to-br from-indigo-900/50 to-indigo-800/50 p-10 text-white flex items-center justify-between border-b border-white/5">
                <span className="text-3xl font-black tracking-tighter italic">SAT | VALLEY</span>
                <Trophy className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="p-16 text-center">
                <p className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.4em] mb-10">Consolidated Performance Index</p>
                <div className="relative inline-block">
                  <span className="text-[12rem] font-black text-white tracking-tighter italic group-hover:scale-105 transition-transform duration-700 block drop-shadow-2xl">{scores.total}</span>
                  <div className="h-4 w-full bg-indigo-500/20 absolute -bottom-8 rounded-full blur-sm" />
                </div>

                <div className="mt-20 grid grid-cols-2 gap-8 max-w-xl mx-auto">
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-[10px] font-black text-indigo-300/40 uppercase tracking-widest mb-2">Reading & Writing</div>
                    <div className="text-4xl font-black text-white italic">{scores.rw}</div>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-[10px] font-black text-amber-300/40 uppercase tracking-widest mb-2">Mathematics</div>
                    <div className="text-4xl font-black text-white italic">{scores.math}</div>
                  </div>
                </div>

                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-16 italic">Scale: 400 — 1600</p>
              </div>
              <div className="p-12 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-0">
                <button
                  onClick={() => setIsDetailedReview(true)}
                  className="w-full bg-white text-black font-black text-xs py-6 rounded-2xl shadow-xl hover:scale-[1.02] transition-all uppercase tracking-widest hover:bg-indigo-50"
                >
                  Detailed Question Review
                </button>
                <button
                  onClick={() => window.open('https://www.khanacademy.org/test-prep/digital-sat', '_blank')}
                  className="w-full border border-white/10 text-white/60 hover:text-white font-black text-xs py-6 rounded-2xl hover:bg-white/5 transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                >
                  Khan Academy Prep <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-10">
            <div className="glass-card p-14 relative overflow-hidden group border-white/10">
              <div className="relative z-10 text-center">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-10">Consolidated Index</p>
                <h3 className="text-[10rem] font-black text-white italic tracking-tighter leading-none mb-6 group-hover:scale-105 transition-transform duration-700">{scores.total}</h3>
                <div className="h-2 w-32 bg-gradient-to-r from-indigo-500 to-amber-500 mx-auto mb-12 rounded-full" />
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Integrated Range 400–1600</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-14 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group border border-white/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 -mr-32 -mt-32 rounded-full group-hover:scale-150 transition-transform duration-1000 blur-2xl" />
              <Award className="w-16 h-16 text-indigo-300 mb-10" />
              <h4 className="text-4xl font-black tracking-tight mb-8 italic">Success Vector</h4>
              <p className="text-indigo-100/70 font-medium text-lg leading-relaxed mb-12">
                Your performance in {scores.rw > scores.math ? 'Verbal Nodes' : 'Quantitative Nodes'} is exceptional. Focusing on higher-order logic will maximize your percentile delta.
              </p>
              <button className="flex items-center gap-4 text-white font-black text-[10px] uppercase tracking-widest hover:translate-x-3 transition-transform bg-white/20 w-fit px-8 py-4 rounded-2xl hover:bg-white/30">
                Download Analysis PDF <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* History List */}
        {results.length > 1 && (
          <div className="mt-40">
            <div className="flex items-center gap-8 mb-20">
              <h3 className="text-[10px] font-black text-indigo-300/40 uppercase tracking-[0.5em]">System Test Logs</h3>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedResultIndex(i);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`p-10 glass-card text-left flex items-center justify-between transition-all group border-white/10 ${selectedResultIndex === i ? 'border-indigo-500/50 bg-white/5' : 'hover:border-white/30 hover:bg-white/5'}`}
                >
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString()}</p>
                    <p className="text-6xl font-black text-white italic tracking-tighter group-hover:text-indigo-400 transition-colors uppercase">{r.score}</p>
                  </div>
                  <ChevronRight className={`w-8 h-8 transition-transform group-hover:translate-x-3 ${selectedResultIndex === i ? 'text-indigo-400' : 'text-white/20'}`} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
