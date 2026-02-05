import { Play, Clock, Info, Calculator, Sparkles, Zap, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PracticeTestsPageProps {
  onNavigate: (page: string, params?: any) => void;
  user: any;
}

export function PracticeTestsPage({ onNavigate, user }: PracticeTestsPageProps) {
  const [tests, setTests] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const apiBase = (import.meta as any).env?.VITE_BACKEND_URL || '';

  const loadTests = async () => {
    try {
      setLoading(true);
      const [testsRes, resultsRes] = await Promise.all([
        fetch(`${apiBase}/api/tests?isOlympiad=false`).then(r => r.json()),
        user?.email ? fetch(`${apiBase}/api/results?userEmail=${user.email}`).then(r => r.json()) : Promise.resolve({ results: [] })
      ]);

      setTests(testsRes.tests || []);
      setResults(resultsRes.results || []);
    } catch (error) {
      console.error("Failed to fetch tests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, [apiBase]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'from-emerald-400 to-teal-500';
      case 'Medium':
        return 'from-indigo-400 to-indigo-600';
      case 'Hard':
        return 'from-amber-400 to-orange-500';
      case 'Very Hard':
        return 'from-rose-400 to-pink-500';
      default:
        return 'from-slate-400 to-slate-500';
    }
  };

  return (
    <div className="min-h-screen pt-40 pb-24 px-6">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border-white/20 shadow-xl mb-10 animate-in fade-in slide-in-from-bottom-4 bg-white/5">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em]">Adaptive System Architecture</span>
          </div>
          <h1 className="text-7xl lg:text-9xl font-black text-white mb-8 tracking-tighter leading-none">
            Test <span className="opacity-20 italic">Portal.</span>
          </h1>
          <p className="text-2xl text-white/50 max-w-2xl mx-auto leading-relaxed font-bold">
            Execute full-length simulations in the world's most
            accurate Digital SAT testing environment.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-20 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <div className="glass-card p-12 hover:bg-white/5 transition-all">
            <div className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.4em] mb-6">Library Status</div>
            <div className="text-6xl font-black text-white tracking-tighter">{tests.length} Total Tests</div>
          </div>
          <div className="glass-card p-12 hover:bg-white/5 transition-all">
            <div className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.4em] mb-6">English</div>
            <div className="text-6xl font-black text-white tracking-tighter">Reading and Writing</div>
          </div>
          <div className="glass-card p-12 hover:bg-white/5 transition-all">
            <div className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.4em] mb-6">Math</div>
            <div className="text-6xl font-black text-white tracking-tighter">Math</div>
          </div>
        </div>

        {/* Tests Grid */}
        {/* Tests Sections */}
        {loading ? (
          <div className="col-span-full py-40 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-[2rem] border-4 border-white/20 border-t-indigo-400 animate-spin mb-8" />
            <p className="font-black text-indigo-200/40 uppercase tracking-[0.4em] text-[10px]">Accessing Secure Database...</p>
          </div>
        ) : (
          <div className="space-y-32">
            {[
              {
                title: "Full Length Practice",
                items: tests.filter(t => {
                  const hasMath = t.sections?.some((s: string) => s.includes('math'));
                  const hasRW = t.sections?.some((s: string) => s.includes('reading') || s.includes('writing') || s.includes('rw'));
                  return (hasMath && hasRW) || (!hasMath && !hasRW);
                })
              },
              {
                title: "English Module Only",
                items: tests.filter(t => {
                  const hasMath = t.sections?.some((s: string) => s.includes('math'));
                  const hasRW = t.sections?.some((s: string) => s.includes('reading') || s.includes('writing') || s.includes('rw'));
                  return hasRW && !hasMath;
                })
              },
              {
                title: "Math Only",
                items: tests.filter(t => {
                  const hasMath = t.sections?.some((s: string) => s.includes('math'));
                  const hasRW = t.sections?.some((s: string) => s.includes('reading') || s.includes('writing') || s.includes('rw'));
                  return hasMath && !hasRW;
                })
              }
            ].map((section, idx) => (
              <div key={idx} className="space-y-12">
                <div className="flex items-center gap-4">
                  <div className="h-px bg-white/10 flex-1" />
                  <h2 className="text-2xl font-black text-white uppercase tracking-widest">{section.title}</h2>
                  <div className="h-px bg-white/10 flex-1" />
                </div>

                {section.items.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl bg-white/5">
                    <p className="text-white/40 font-black uppercase tracking-widest text-xs">No active modules in this sector.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {section.items.map((test) => (
                      <div key={test.id} className="group glass-card p-12 hover:bg-white/5 transition-all duration-700 border-white/10 hover:border-indigo-500/30">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-10">
                          <div className="space-y-6">
                            <h3 className="text-4xl font-black text-white tracking-tighter group-hover:text-indigo-400 transition-colors">{test.title}</h3>
                            <div className="flex items-center gap-3">
                              <div className={`px-4 py-1.5 rounded-xl bg-gradient-to-r ${getDifficultyColor(test.difficulty)} text-white text-[10px] font-black uppercase tracking-widest shadow-lg`}>
                                {test.difficulty}
                              </div>
                              <div className="px-4 py-1.5 rounded-xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest leading-none">
                                Official Standard
                              </div>
                            </div>
                          </div>
                          <div className="px-5 py-2 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-end justify-center group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-indigo-700 group-hover:border-transparent transition-all duration-500 shadow-sm">
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Ticket ID</span>
                            <span className="font-black text-white/60 group-hover:text-white transition-colors uppercase italic tracking-tighter">T-{test.id.slice(0, 4)}-{test.id.slice(-4)}</span>
                          </div>
                        </div>

                        {/* Sections Visualization */}
                        <div className="flex gap-3 mb-12">
                          {(section.title === "Full Length Practice" || section.title === "English Module Only") && (
                            <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                              <div className="w-1/2 h-full bg-gradient-to-r from-indigo-500 to-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                            </div>
                          )}
                          {(section.title === "Full Length Practice" || section.title === "Math Only") && (
                            <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                              <div className="w-1/2 h-full bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.5)]" />
                            </div>
                          )}
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-3 gap-8 mb-12">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-white/30 font-black uppercase text-[9px] tracking-[0.3em]">
                              <Clock className="w-3.5 h-3.5" />
                              Window
                            </div>
                            <div className="text-xl font-black text-white">{test.duration || 'Standard'}</div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-white/30 font-black uppercase text-[9px] tracking-[0.3em]">
                              <Zap className="w-3.5 h-3.5" />
                              Avg Score
                            </div>
                            <div className="text-xl font-black text-indigo-400 italic tracking-tighter">{test.avgScore || '1280'}</div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-white/30 font-black uppercase text-[9px] tracking-[0.3em]">
                              <Activity className="w-3.5 h-3.5" />
                              Sessions
                            </div>
                            <div className="text-xl font-black text-white tracking-tighter">{test.attempts || 0}</div>
                          </div>
                        </div>

                        {/* CTA */}
                        {results.some(r => r.test_id === test.id) ? (
                          <div className="w-full h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-[2rem] flex items-center justify-center gap-3">
                            <Activity className="w-5 h-5" />
                            <span className="text-sm font-black uppercase tracking-[0.4em]">Node Sequence Completed</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => onNavigate('test-session', { testId: test.id })}
                            className="w-full h-20 bg-white text-black hover:bg-indigo-400 hover:text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.4em] shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 group/btn"
                          >
                            <div className="w-8 h-8 rounded-full bg-black/10 group-hover/btn:bg-white/20 flex items-center justify-center transition-colors">
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </div>
                            Initialize Session
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Official Protocol (Instructions) */}
        <div className="mt-32 glass-card p-16 lg:p-24 border-white/10 relative overflow-hidden group/protocol">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 -mr-64 -mt-64 rounded-full border border-indigo-500/20 blur-3xl opacity-50" />

          <div className="relative z-10 flex flex-col lg:flex-row gap-24">
            <div className="lg:w-1/3">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center mb-10 shadow-2xl shadow-indigo-500/20">
                <Calculator className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-5xl font-black text-white tracking-tighter leading-[0.9] mb-8">System <br /><span className="opacity-30 italic">Protocol.</span></h2>
              <p className="text-white/50 font-bold leading-relaxed text-lg">
                To maintain architectural validity, please adhere to these
                official simulation standards.
              </p>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-16">
              <div className="space-y-10">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Node Preparation</h4>
                <ul className="space-y-6">
                  {[
                    'Sterile testing environment required',
                    'Standard uninterrupted allocation',
                    'High-resolution desktop interface',
                    'Physical scratch tokens permitted'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-6 group/li">
                      <div className="w-2 h-2 rounded-full bg-indigo-500/40 group-hover/li:bg-indigo-400 transition-colors" />
                      <span className="text-white/60 font-black text-xs uppercase tracking-widest">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-10">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Logic Execution</h4>
                <ul className="space-y-6">
                  {[
                    'Autonomous section timing logic',
                    'Active module retrospective review',
                    'Dynamic difficulty adaptation',
                    'Instant analytical synthesis'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-6 group/li">
                      <div className="w-2 h-2 rounded-full bg-indigo-500/40 group-hover/li:bg-indigo-400 transition-colors" />
                      <span className="text-white/60 font-black text-xs uppercase tracking-widest">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
