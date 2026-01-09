import { useState, useEffect } from 'react';
import { Calculator, TrendingUp, Sparkles, Target, Cpu } from 'lucide-react';

export function CalculatorPage() {
  const [mathCorrect, setMathCorrect] = useState<string>('');
  const [readingCorrect, setReadingCorrect] = useState<string>('');
  const [mathScore, setMathScore] = useState<number>(0);
  const [readingScore, setReadingScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);

  const calculateMathScore = (correct: number): number => {
    const questions = 44;
    const scaled = Math.min(800, 200 + (Math.min(correct, questions) * (600 / questions)));
    return Math.round(scaled / 10) * 10;
  };

  const calculateReadingScore = (correct: number): number => {
    const questions = 54;
    const scaled = Math.min(800, 200 + (Math.min(correct, questions) * (600 / questions)));
    return Math.round(scaled / 10) * 10;
  };

  useEffect(() => {
    const math = parseInt(mathCorrect) || 0;
    const reading = parseInt(readingCorrect) || 0;

    const mScore = calculateMathScore(math);
    const rScore = calculateReadingScore(reading);

    setMathScore(mScore);
    setReadingScore(rScore);
    setTotalScore(mScore + rScore);
  }, [mathCorrect, readingCorrect]);

  const getPercentile = (score: number) => {
    if (score >= 1550) return '99+';
    if (score >= 1500) return '98';
    if (score >= 1450) return '96';
    if (score >= 1400) return '94';
    if (score >= 1350) return '90';
    if (score >= 1300) return '86';
    if (score >= 1250) return '80';
    if (score >= 1200) return '74';
    return '50+';
  };

  return (
    <div className="min-h-screen pt-40 pb-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-32">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border-white/20 shadow-xl mb-10 animate-in fade-in slide-in-from-bottom-4 bg-white/5">
            <Calculator className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em]">Precision Scoring Console</span>
          </div>
          <h1 className="text-7xl lg:text-9xl font-black text-white mb-8 tracking-tighter leading-none italic">
            Score <span className="opacity-20 not-italic">Projection.</span>
          </h1>
          <p className="text-2xl text-white/50 max-w-2xl mx-auto leading-relaxed font-bold">
            Simulate your performance index using our calibrated
            scoring algorithms for the Digital SAT protocol.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Input Section */}
          <div className="space-y-12">
            {/* Math Section */}
            <div className="group glass-card p-12 hover:bg-white/5 transition-all duration-700">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="text-4xl font-black text-white tracking-tighter mb-2 italic">Mathematical Domain</h3>
                  <p className="text-[10px] font-black text-indigo-300/60 uppercase tracking-[0.4em]">Protocol: 44 Nodes</p>
                </div>
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center shadow-xl border border-indigo-500/20">
                  <Target className="w-8 h-8 text-indigo-400" />
                </div>
              </div>

              <div className="space-y-10">
                <div className="glass border-indigo-500/10 rounded-3xl p-10 shadow-inner bg-black/20">
                  <label className="block text-[10px] font-black text-indigo-300/60 uppercase tracking-[0.4em] mb-6">Correct Sequences</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="44"
                      value={mathCorrect}
                      onChange={(e) => setMathCorrect(e.target.value)}
                      placeholder="0-44"
                      className="w-full bg-white/5 border-white/10 focus:border-indigo-500 focus:bg-white/10 outline-none text-7xl h-32 text-center font-black text-white rounded-2xl shadow-xl transition-all placeholder:text-white/10"
                    />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-indigo-300/20 font-black text-2xl uppercase tracking-widest">/ 44</div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-10 py-8 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Projected Weight</span>
                  <span className="text-5xl font-black text-indigo-400 tracking-tighter italic">{mathScore}</span>
                </div>
              </div>
            </div>

            {/* Reading & Writing Section */}
            <div className="group glass-card p-12 hover:bg-white/5 transition-all duration-700">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="text-4xl font-black text-white tracking-tighter mb-2 italic">Cognitive Domain</h3>
                  <p className="text-[10px] font-black text-amber-300/60 uppercase tracking-[0.4em]">Protocol: 54 Nodes</p>
                </div>
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center shadow-xl border border-amber-500/20">
                  <Sparkles className="w-8 h-8 text-amber-400" />
                </div>
              </div>

              <div className="space-y-10">
                <div className="glass border-amber-500/10 rounded-3xl p-10 shadow-inner bg-black/20">
                  <label className="block text-[10px] font-black text-amber-300/60 uppercase tracking-[0.4em] mb-6">Correct Sequences</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="54"
                      value={readingCorrect}
                      onChange={(e) => setReadingCorrect(e.target.value)}
                      placeholder="0-54"
                      className="w-full bg-white/5 border-white/10 focus:border-amber-500 focus:bg-white/10 outline-none text-7xl h-32 text-center font-black text-white rounded-2xl shadow-xl transition-all placeholder:text-white/10"
                    />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-amber-300/20 font-black text-2xl uppercase tracking-widest">/ 54</div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-10 py-8 bg-amber-500/10 rounded-3xl border border-amber-500/20">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.4em]">Projected Weight</span>
                  <span className="text-5xl font-black text-amber-400 tracking-tighter italic">{readingScore}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="relative lg:sticky lg:top-40 h-fit">
            <div className="space-y-12">
              {/* Total Score Display */}
              <div className="glass-card p-20 lg:p-24 text-center border-white/20 relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <div className="relative z-10">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-12">Consolidated Projection</div>
                  <div className={`text-[12rem] font-black leading-none mb-12 tracking-tighter ${totalScore >= 1500 ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-amber-200' : 'text-white/80'} transition-all duration-1000 italic`}>
                    {totalScore}
                  </div>
                  <div className="flex items-center justify-center gap-4 py-5 px-10 border border-white/10 bg-white/5 shadow-2xl rounded-full w-fit mx-auto backdrop-blur-md">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                    <span className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.4em]">
                      {getPercentile(totalScore)}th Percentile Metric
                    </span>
                  </div>
                </div>
              </div>

              {/* Functional Dashboard */}
              <div className="glass-card p-12 lg:p-16 border-white/20 space-y-12">
                <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] border-b border-white/5 pb-8">
                  <Cpu className="w-5 h-5" />
                  Performance Stack
                </div>

                <div className="space-y-12">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-indigo-300 uppercase tracking-widest italic">Math Scaling</span>
                      <span className="text-2xl font-black text-indigo-400 italic tracking-tighter">{mathScore}</span>
                    </div>
                    <div className="h-5 bg-white/5 rounded-full overflow-hidden p-1">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                        style={{ width: `${(mathScore / 800) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-amber-300 uppercase tracking-widest italic">R&W Scaling</span>
                      <span className="text-2xl font-black text-amber-400 italic tracking-tighter">{readingScore}</span>
                    </div>
                    <div className="h-5 bg-white/5 rounded-full overflow-hidden p-1">
                      <div
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                        style={{ width: `${(readingScore / 800) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-10 grid grid-cols-2 gap-6">
                  <div className="p-8 border border-white/10 rounded-3xl text-center group/card transition-all hover:bg-white/5 hover:border-indigo-500/30">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Ivy Threshold</div>
                    <div className="text-3xl font-black text-white/40 tracking-tighter group-hover:text-indigo-400 transition-colors italic">1500+</div>
                  </div>
                  <div className="p-8 border border-white/10 rounded-3xl text-center group/card transition-all hover:bg-white/5 hover:border-amber-500/30">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Elite Tier</div>
                    <div className="text-3xl font-black text-white/40 tracking-tighter group-hover:text-amber-400 transition-colors italic">1550+</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
