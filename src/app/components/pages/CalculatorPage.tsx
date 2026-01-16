import { useState, useEffect, useMemo } from 'react';
import { Calculator, TrendingUp, Sparkles, Target, Cpu, BookOpen, BarChart3 } from 'lucide-react';

// SAT Score Calculation Constants
const RW_MODULE1_QUESTIONS = 27;
const RW_MODULE2_QUESTIONS = 27;
const MATH_MODULE1_QUESTIONS = 22;
const MATH_MODULE2_QUESTIONS = 22;

// Adaptive scoring thresholds
const RW_ADAPTIVE_THRESHOLD = 17;  // If Module 1 < 17 correct, easier path
const MATH_ADAPTIVE_THRESHOLD = 12; // If Module 1 < 12 correct, easier path

// Score caps for easier routes
const RW_EASY_ROUTE_CAP = 630;
const MATH_EASY_ROUTE_CAP = 640;

// Score conversion tables (approximations based on typical SAT curves)
const getRWScoreTable = (isEasyRoute: boolean): Map<number, number> => {
  const table = new Map<number, number>();

  if (isEasyRoute) {
    // Easier Module 2 route - capped at ~630
    for (let i = 0; i <= 54; i++) {
      const rawScore = i;
      let scaled: number;
      if (rawScore <= 10) scaled = 200 + (rawScore * 15);
      else if (rawScore <= 25) scaled = 350 + ((rawScore - 10) * 10);
      else if (rawScore <= 40) scaled = 500 + ((rawScore - 25) * 7);
      else scaled = 605 + ((rawScore - 40) * 1.8);
      table.set(i, Math.min(Math.round(scaled / 10) * 10, RW_EASY_ROUTE_CAP));
    }
  } else {
    // Harder Module 2 route - can reach 800
    for (let i = 0; i <= 54; i++) {
      const rawScore = i;
      let scaled: number;
      if (rawScore <= 10) scaled = 200 + (rawScore * 18);
      else if (rawScore <= 25) scaled = 380 + ((rawScore - 10) * 12);
      else if (rawScore <= 40) scaled = 560 + ((rawScore - 25) * 10);
      else scaled = 710 + ((rawScore - 40) * 6.5);
      table.set(i, Math.min(Math.round(scaled / 10) * 10, 800));
    }
  }
  return table;
};

const getMathScoreTable = (isEasyRoute: boolean): Map<number, number> => {
  const table = new Map<number, number>();

  if (isEasyRoute) {
    // Easier Module 2 route - capped at ~640
    for (let i = 0; i <= 44; i++) {
      const rawScore = i;
      let scaled: number;
      if (rawScore <= 8) scaled = 200 + (rawScore * 20);
      else if (rawScore <= 20) scaled = 360 + ((rawScore - 8) * 12);
      else if (rawScore <= 32) scaled = 504 + ((rawScore - 20) * 8);
      else scaled = 600 + ((rawScore - 32) * 3.3);
      table.set(i, Math.min(Math.round(scaled / 10) * 10, MATH_EASY_ROUTE_CAP));
    }
  } else {
    // Harder Module 2 route - can reach 800
    for (let i = 0; i <= 44; i++) {
      const rawScore = i;
      let scaled: number;
      if (rawScore <= 8) scaled = 200 + (rawScore * 25);
      else if (rawScore <= 20) scaled = 400 + ((rawScore - 8) * 15);
      else if (rawScore <= 32) scaled = 580 + ((rawScore - 20) * 12);
      else scaled = 724 + ((rawScore - 32) * 6.3);
      table.set(i, Math.min(Math.round(scaled / 10) * 10, 800));
    }
  }
  return table;
};

/**
 * Calculate Reading & Writing section score with adaptive routing
 */
const calculateRWScore = (
  module1Correct: number,
  module2Correct: number,
  isAdaptive: boolean
): { score: number; isEasyRoute: boolean } => {
  const m1 = Math.max(0, Math.min(module1Correct, RW_MODULE1_QUESTIONS));
  const m2 = Math.max(0, Math.min(module2Correct, RW_MODULE2_QUESTIONS));
  const totalCorrect = m1 + m2;

  // Determine if student went easy route
  const isEasyRoute = isAdaptive && m1 < RW_ADAPTIVE_THRESHOLD;

  const scoreTable = getRWScoreTable(isEasyRoute);
  const score = scoreTable.get(totalCorrect) || 200;

  return { score, isEasyRoute };
};

/**
 * Calculate Math section score with adaptive routing
 */
const calculateMathScore = (
  module1Correct: number,
  module2Correct: number,
  isAdaptive: boolean
): { score: number; isEasyRoute: boolean } => {
  const m1 = Math.max(0, Math.min(module1Correct, MATH_MODULE1_QUESTIONS));
  const m2 = Math.max(0, Math.min(module2Correct, MATH_MODULE2_QUESTIONS));
  const totalCorrect = m1 + m2;

  // Determine if student went easy route
  const isEasyRoute = isAdaptive && m1 < MATH_ADAPTIVE_THRESHOLD;

  const scoreTable = getMathScoreTable(isEasyRoute);
  const score = scoreTable.get(totalCorrect) || 200;

  return { score, isEasyRoute };
};

/**
 * Get percentile based on total SAT score
 */
const getPercentile = (score: number): string => {
  if (score >= 1560) return '~100%';
  if (score >= 1530) return '~99%';
  if (score >= 1500) return '~98%';
  if (score >= 1470) return '~97%';
  if (score >= 1440) return '~95%';
  if (score >= 1400) return '~93%';
  if (score >= 1360) return '~90%';
  if (score >= 1320) return '~87%';
  if (score >= 1280) return '~83%';
  if (score >= 1240) return '~78%';
  if (score >= 1200) return '~73%';
  if (score >= 1160) return '~67%';
  if (score >= 1120) return '~60%';
  if (score >= 1080) return '~53%';
  if (score >= 1040) return '~45%';
  if (score >= 1000) return '~38%';
  if (score >= 960) return '~31%';
  if (score >= 920) return '~24%';
  if (score >= 880) return '~18%';
  if (score >= 840) return '~13%';
  if (score >= 800) return '~9%';
  if (score >= 760) return '~6%';
  if (score >= 720) return '~4%';
  if (score >= 680) return '~2%';
  return '<2%';
};

export function CalculatorPage() {
  // Module-level state
  const [rwModule1, setRwModule1] = useState<number>(0);
  const [rwModule2, setRwModule2] = useState<number>(0);
  const [mathModule1, setMathModule1] = useState<number>(0);
  const [mathModule2, setMathModule2] = useState<number>(0);
  const [isAdaptive, setIsAdaptive] = useState<boolean>(true);

  // Calculate scores using memoization
  const rwResult = useMemo(() =>
    calculateRWScore(rwModule1, rwModule2, isAdaptive),
    [rwModule1, rwModule2, isAdaptive]
  );

  const mathResult = useMemo(() =>
    calculateMathScore(mathModule1, mathModule2, isAdaptive),
    [mathModule1, mathModule2, isAdaptive]
  );

  const totalScore = rwResult.score + mathResult.score;
  const percentile = getPercentile(totalScore);

  return (
    <div className="min-h-screen pt-40 pb-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border-white/20 shadow-xl mb-10 animate-in fade-in slide-in-from-bottom-4 bg-white/5">
            <Calculator className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em]">SAT Score Calculator</span>
          </div>
          <h1 className="text-6xl lg:text-8xl font-black text-white mb-8 tracking-tighter leading-none">
            SAT Score Calculator
          </h1>
          <p className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed font-medium">
            Calculate your Digital SAT score instantly. Enter your correct answers for each module
            and get your estimated score range.
          </p>
        </div>

        {/* How It Works Section */}
        <div className="glass-card p-6 mb-8 border border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">How It Works</h3>
          </div>

          <p className="text-white/70 text-sm mb-4 leading-relaxed">
            Use the sliders or input fields to enter your correct answers for each section.
            The Digital SAT uses <span className="text-indigo-400 font-semibold">adaptive testing</span> — your
            Module 1 performance determines which Module 2 you receive.
          </p>

          {/* Score Path Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <BookOpen className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="text-xs">
                <span className="text-amber-400 font-bold">R&W Path:</span>
                <span className="text-white/60 ml-1">17+ correct in M1 → harder M2 → up to 800</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <Target className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div className="text-xs">
                <span className="text-indigo-400 font-bold">Math Path:</span>
                <span className="text-white/60 ml-1">12+ correct in M1 → harder M2 → up to 800</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Adaptive Scoring Toggle */}
            <div className="glass-card p-6 border border-white/10">
              <label className="flex items-center gap-4 cursor-pointer">
                <div
                  className={`w-12 h-7 rounded-full transition-all duration-300 flex items-center p-1 ${isAdaptive ? 'bg-indigo-500' : 'bg-white/20'
                    }`}
                  onClick={() => setIsAdaptive(!isAdaptive)}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform duration-300 ${isAdaptive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </div>
                <span className="text-lg font-bold text-white">Adaptive Scoring</span>
                {isAdaptive && (
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full">Active</span>
                )}
              </label>
            </div>

            {/* Reading and Writing Module 1 */}
            <div className="glass-card p-6 border border-amber-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Reading and Writing Module 1</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={RW_MODULE1_QUESTIONS}
                    value={rwModule1}
                    onChange={(e) => setRwModule1(Math.min(RW_MODULE1_QUESTIONS, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-16 h-10 text-center bg-white/10 border border-white/20 rounded-lg text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-white/40">/{RW_MODULE1_QUESTIONS}</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max={RW_MODULE1_QUESTIONS}
                value={rwModule1}
                onChange={(e) => setRwModule1(parseInt(e.target.value))}
                className="w-full h-3 bg-slate-700 rounded-full appearance-none cursor-pointer slider-amber"
                style={{
                  background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${(rwModule1 / RW_MODULE1_QUESTIONS) * 100}%, #334155 ${(rwModule1 / RW_MODULE1_QUESTIONS) * 100}%, #334155 100%)`
                }}
              />
              {isAdaptive && rwModule1 < RW_ADAPTIVE_THRESHOLD && rwModule1 > 0 && (
                <p className="text-xs text-amber-400 mt-2">⚠️ Below threshold - easier Module 2 route (capped at ~630)</p>
              )}
            </div>

            {/* Reading and Writing Module 2 */}
            <div className="glass-card p-6 border border-amber-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Reading and Writing Module 2</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={RW_MODULE2_QUESTIONS}
                    value={rwModule2}
                    onChange={(e) => setRwModule2(Math.min(RW_MODULE2_QUESTIONS, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-16 h-10 text-center bg-white/10 border border-white/20 rounded-lg text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-white/40">/{RW_MODULE2_QUESTIONS}</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max={RW_MODULE2_QUESTIONS}
                value={rwModule2}
                onChange={(e) => setRwModule2(parseInt(e.target.value))}
                className="w-full h-3 bg-slate-700 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${(rwModule2 / RW_MODULE2_QUESTIONS) * 100}%, #334155 ${(rwModule2 / RW_MODULE2_QUESTIONS) * 100}%, #334155 100%)`
                }}
              />
            </div>

            {/* Math Module 1 */}
            <div className="glass-card p-6 border border-indigo-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Math Module 1</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={MATH_MODULE1_QUESTIONS}
                    value={mathModule1}
                    onChange={(e) => setMathModule1(Math.min(MATH_MODULE1_QUESTIONS, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-16 h-10 text-center bg-white/10 border border-white/20 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-white/40">/{MATH_MODULE1_QUESTIONS}</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max={MATH_MODULE1_QUESTIONS}
                value={mathModule1}
                onChange={(e) => setMathModule1(parseInt(e.target.value))}
                className="w-full h-3 bg-slate-700 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(mathModule1 / MATH_MODULE1_QUESTIONS) * 100}%, #334155 ${(mathModule1 / MATH_MODULE1_QUESTIONS) * 100}%, #334155 100%)`
                }}
              />
              {isAdaptive && mathModule1 < MATH_ADAPTIVE_THRESHOLD && mathModule1 > 0 && (
                <p className="text-xs text-indigo-400 mt-2">⚠️ Below threshold - easier Module 2 route (capped at ~640)</p>
              )}
            </div>

            {/* Math Module 2 */}
            <div className="glass-card p-6 border border-indigo-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Math Module 2</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={MATH_MODULE2_QUESTIONS}
                    value={mathModule2}
                    onChange={(e) => setMathModule2(Math.min(MATH_MODULE2_QUESTIONS, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-16 h-10 text-center bg-white/10 border border-white/20 rounded-lg text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-white/40">/{MATH_MODULE2_QUESTIONS}</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max={MATH_MODULE2_QUESTIONS}
                value={mathModule2}
                onChange={(e) => setMathModule2(parseInt(e.target.value))}
                className="w-full h-3 bg-slate-700 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(mathModule2 / MATH_MODULE2_QUESTIONS) * 100}%, #334155 ${(mathModule2 / MATH_MODULE2_QUESTIONS) * 100}%, #334155 100%)`
                }}
              />
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:sticky lg:top-40 space-y-6">
            {/* Total Score Display */}
            <div className="glass-card p-8 text-center bg-slate-800/80 border border-white/10">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Total Score</div>
              <div className={`text-7xl font-black leading-none mb-4 tracking-tighter ${totalScore >= 1500 ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-amber-200' : 'text-white'
                }`}>
                {totalScore}
              </div>
              <div className="text-sm text-white/40 mb-4">400 - 1600</div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${((totalScore - 400) / 1200) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-center gap-2 py-2 px-4 border border-white/10 bg-white/5 rounded-full">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-white/80">Percentile: {percentile}</span>
              </div>
            </div>

            {/* Section Scores */}
            <div className="glass-card p-6 bg-slate-800/80 border border-white/10">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">
                <BarChart3 className="w-4 h-4" />
                Section Scores
              </div>

              {/* Reading and Writing Score */}
              <div className="mb-6 pb-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span className="font-medium text-white">Reading and Writing</span>
                  </div>
                </div>
                <div className="text-4xl font-black text-white mb-1">{rwResult.score}</div>
                <div className="text-xs text-white/40 mb-2">200 - 800</div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${((rwResult.score - 200) / 600) * 100}%` }}
                  />
                </div>
                {rwResult.isEasyRoute && (
                  <p className="text-xs text-amber-400 mt-2">Easier route - capped at ~630</p>
                )}
              </div>

              {/* Math Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium text-white">Math</span>
                  </div>
                </div>
                <div className="text-4xl font-black text-white mb-1">{mathResult.score}</div>
                <div className="text-xs text-white/40 mb-2">200 - 800</div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${((mathResult.score - 200) / 600) * 100}%` }}
                  />
                </div>
                {mathResult.isEasyRoute && (
                  <p className="text-xs text-indigo-400 mt-2">Easier route - capped at ~640</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
