import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Star, Sparkles, UserCircle2, ArrowUpRight } from 'lucide-react';

const staticResults = [
  { name: 'Alex M.', score: 1600, improvement: '+220', note: 'From 1380 to perfect score in 4 months' },
  { name: 'Sarah K.', score: 1580, improvement: '+190', note: 'Improved Math from 680 to 790' },
  { name: 'David L.', score: 1560, improvement: '+160', note: 'Reading & Writing breakthrough' },
  { name: 'Emma W.', score: 1550, improvement: '+180', note: 'Consistent practice paid off' },
  { name: 'James P.', score: 1540, improvement: '+150', note: 'Mastered weak topics systematically' },
  { name: 'Olivia R.', score: 1530, improvement: '+140', note: 'Data-driven approach worked' },
  { name: 'Michael T.', score: 1600, improvement: '+210', note: 'Perfect score on second attempt' },
  { name: 'Sophia C.', score: 1570, improvement: '+175', note: 'Mistake analysis was key' },
  { name: 'Daniel H.', score: 1560, improvement: '+165', note: 'From 1395 to top tier' },
  { name: 'Isabella G.', score: 1550, improvement: '+155', note: 'Smart review transformed my score' },
  { name: 'Ryan B.', score: 1590, improvement: '+200', note: 'Achieved Ivy League target' },
  { name: 'Ava N.', score: 1540, improvement: '+145', note: 'Focused practice on weak areas' },
  { name: 'Ethan S.', score: 1600, improvement: '+230', note: 'Third perfect score this year' },
  { name: 'Mia J.', score: 1570, improvement: '+170', note: 'Exceeded my own expectations' },
  { name: 'Noah D.', score: 1550, improvement: '+160', note: 'Engineered success step by step', photoUrl: undefined },
];

export function ResultsPage() {
  const [results, setResults] = useState<any[]>(staticResults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState({ high_scores: 5, score_variance: "+178", architectural_mean: 1500 });
  const apiBase = (import.meta as any).env?.VITE_BACKEND_URL || '';

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [res, settingsRes] = await Promise.all([
          fetch(`${apiBase}/api/results`),
          fetch(`${apiBase}/api/settings`)
        ]);

        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const body = await res.json();

        if (active && body.results && body.results.length > 0) {
          setResults(
            body.results.map((r: any) => ({
              name: r.name || 'Student',
              score: r.score || '—',
              improvement: r.improvement || '+0',
              note: r.note || 'Great progress',
              photoUrl: r.photo_url,
            })),
          );
        }

        if (settingsRes.ok) {
          const sBody = await settingsRes.json();
          if (active && sBody.settings) setSiteSettings(sBody.settings);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [apiBase]);

  return (
    <div className="min-h-screen pt-40 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border-white/10 shadow-xl mb-10 animate-in fade-in slide-in-from-bottom-4 bg-white/5">
            <Trophy className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em]">Hall of Excellence</span>
          </div>
          <h1 className="text-7xl lg:text-9xl font-black text-white mb-8 tracking-tighter leading-none">
            Success <span className="opacity-20 italic">Validated.</span>
          </h1>
          <p className="text-2xl text-white/50 max-w-2xl mx-auto leading-relaxed font-bold">
            The numerical proof of our engineering methodology.
            Real scores, amplified by data science.
          </p>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-24 hidden lg:grid">
          <div className="glass-card p-14 hover:bg-white/5 transition-all group border-white/10">
            <div className="text-[10px] font-black text-indigo-300/40 uppercase tracking-[0.4em] mb-10">High Scores</div>
            <div className="text-8xl font-black text-white tracking-tighter mb-4 group-hover:scale-110 transition-transform">{siteSettings.high_scores}</div>
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Global Standard</div>
          </div>
          <div className="glass-card p-14 hover:bg-white/5 transition-all group border-white/10">
            <div className="text-[10px] font-black text-emerald-400/40 uppercase tracking-[0.4em] mb-10">Variance of Scores</div>
            <div className="text-8xl font-black text-emerald-400 tracking-tighter mb-4 group-hover:scale-110 transition-transform">{siteSettings.score_variance}</div>
            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Average Growth</div>
          </div>
          <div className="glass-card p-14 hover:bg-white/5 transition-all group border-white/10">
            <div className="text-[10px] font-black text-indigo-300/40 uppercase tracking-[0.4em] mb-10">Architectural Mean</div>
            <div className="text-8xl font-black text-white tracking-tighter mb-4 group-hover:scale-110 transition-transform">{siteSettings.architectural_mean}</div>
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Elite Tier Final</div>
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="py-40 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-[2rem] border-4 border-white/10 border-t-indigo-500 animate-spin mb-8" />
            <p className="font-black text-white/20 uppercase tracking-[0.4em] text-[10px]">Compiling Success Records...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {results.map((result, index) => (
              <div key={index} className="group glass-card p-12 hover:bg-white/5 transition-all duration-700 flex flex-col h-full border-white/10">
                {/* Score Header */}
                <div className="flex items-start justify-between mb-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.3em]">
                      <UserCircle2 className="w-4 h-4" />
                      {result.name}
                    </div>
                    <div className="text-7xl font-black text-white tracking-tighter group-hover:text-indigo-400 transition-colors">
                      {result.score}
                    </div>
                  </div>
                  {result.score === 1600 && (
                    <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/20">
                      <Star className="w-8 h-8 text-white fill-current" />
                    </div>
                  )}
                </div>

                {/* Improvement Badge */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-500/20">
                    <TrendingUp className="w-4 h-4" />
                    {result.improvement} Delta
                  </div>
                </div>

                {/* Narrative */}
                <div className="flex-1 mb-10">
                  <p className="text-white/60 leading-relaxed font-bold italic border-l-4 border-indigo-500/30 pl-6 py-2 text-lg">
                    "{result.note}"
                  </p>
                </div>

                {result.photoUrl && (
                  <div className="mb-10 rounded-3xl overflow-hidden border-white/10 shadow-inner group-hover:shadow-2xl transition-all h-40">
                    <img
                      src={result.photoUrl}
                      alt={result.name}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale group-hover:grayscale-0"
                    />
                  </div>
                )}

                <div className="pt-8 border-t border-white/10 flex items-center justify-between text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">
                  <span>Verified Sequence</span>
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-20 text-center text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] p-6 rounded-3xl border border-indigo-500/20 bg-indigo-500/5">
            Node Status: {error} | Displaying Primary Success Cache
          </div>
        )}

        {/* CTA */}
        <div className="mt-40">
          <div className="glass-card p-20 lg:p-32 text-center border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{
              backgroundImage: `radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)`,
              backgroundSize: '24px 24px'
            }} />

            <div className="relative z-10">
              <h2 className="text-6xl lg:text-9xl font-black text-white tracking-tighter leading-none mb-10">
                Architect your <br /><span className="bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent italic">perfect score.</span>
              </h2>
              <p className="text-2xl text-white/50 mb-16 max-w-2xl mx-auto font-bold leading-relaxed">
                The delta between your current score and perfection is
                simply a matter of systematic execution.
              </p>
              <button
                className="h-24 px-20 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[3rem] text-xl font-black uppercase tracking-[0.4em] shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-6 mx-auto group"
              >
                Initialize Journey
                <ArrowUpRight className="w-8 h-8 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
