import { Target, Brain, Activity, CheckCheck, AlertTriangle, Database, ShieldCheck, Zap, Code2, Cpu } from 'lucide-react';

export function FeaturesPage() {
  const features = [
    {
      icon: Target,
      title: 'Real Exam Practice',
      description: 'Practice tests that look and feel just like the real Digital SAT.',
      details: [
        'Timed sections just like the real exam',
        'Difficulty levels that adapt to you',
        'Accurate predicted score (400-1600)',
        'Easy-to-use testing screen',
      ],
      color: 'text-cyan-400',
      bg: 'bg-indigo-500/10'
    },
    {
      icon: AlertTriangle,
      title: 'Smart Feedback',
      description: 'Understand why you missed a question and how to fix it.',
      details: [
        'Mistakes grouped by topic',
        'See where you spend the most time',
        'Explanations for every answer choice',
        'Clear breakdown of your strengths',
      ],
      color: 'text-rose-400',
      bg: 'bg-rose-500/10'
    },
    {
      icon: Brain,
      title: 'Logic Framework',
      description: 'Neural insights into performance across all knowledge domains.',
      details: [
        'Real-time skill proficiency mapping',
        'Cognitive load management tracking',
        'Predictive score modeling',
        'Study path optimization priority',
      ],
      color: 'text-purple-400',
      bg: 'bg-purple-500/10'
    },
    {
      icon: CheckCheck,
      title: 'Verified Records',
      description: 'Strictly audited databases matching official difficulty curves.',
      details: [
        'Curated by elite tier SAT instructors',
        'Synchronized content distribution',
        'High-fidelity passage sequences',
        'Calibrated math logic complexity',
      ],
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    {
      icon: Activity,
      title: 'Analytic Dashboard',
      description: 'Premium visual tools to track your trajectory toward 1600.',
      details: [
        'Interactive sequence history charts',
        'Knowledge & Skills bar visualizations',
        'Improvement percentile rankings',
        'Goal-driven milestone tracking',
      ],
      color: 'text-amber-400',
      bg: 'bg-amber-500/10'
    },
    {
      icon: Database,
      title: 'Adaptive Logic Engine',
      description: 'Sophisticated backend architecture that powers simulation nodes.',
      details: [
        'Module-based question weighting',
        'Dynamic difficulty calibration',
        'Neural solution explanations',
        'Multilingual protocol support',
      ],
      color: 'text-cyan-400',
      bg: 'bg-indigo-500/10'
    },
  ];

  return (
    <div className="min-h-screen pt-40 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-32">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border-white/10 shadow-xl mb-10 animate-in fade-in slide-in-from-bottom-4 bg-white/5">
            <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em]">Powerful Study Tools</span>
          </div>
          <h1 className="text-7xl lg:text-9xl font-black text-white mb-8 tracking-tighter leading-none italic">
            Features Built For <span className="opacity-20 not-italic">You.</span>
          </h1>
          <p className="text-2xl text-white/50 max-w-2xl mx-auto leading-relaxed font-bold">
            Everything you need to master the SAT, all in one simple and powerful platform.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {features.map((feature, index) => (
            <div key={index} className="group glass-card p-12 lg:p-16 hover:bg-white/5 transition-all duration-700 border-white/10">
              {/* Header Icon & Title */}
              <div className="flex items-start gap-10 mb-12">
                <div className={`w-24 h-24 rounded-[2rem] ${feature.bg} border-white/5 flex items-center justify-center shrink-0 shadow-2xl shadow-black/20 group-hover:scale-110 transition-transform duration-700`}>
                  <feature.icon className={`w-12 h-12 ${feature.color}`} />
                </div>
                <div>
                  <h3 className="text-4xl font-black text-white mb-4 tracking-tighter leading-none">{feature.title}</h3>
                  <p className="text-white/50 font-bold leading-relaxed text-lg">{feature.description}</p>
                </div>
              </div>

              {/* Details List */}
              <div className="bg-white/5 border-white/5 rounded-3xl p-10 shadow-inner">
                <div className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4" />
                  Verified Logic Stack
                </div>
                <ul className="space-y-6">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center gap-6 group/li">
                      <div className={`w-2.5 h-2.5 rounded-full ${feature.color.replace('text', 'bg')} opacity-20 group-hover/li:opacity-100 transition-opacity flex-shrink-0`} />
                      <span className="text-sm font-black text-white/60 tracking-widest uppercase">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">
                <span>ARCHITECTURAL NODE SECURE</span>
                <Code2 className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-40">
          <div className="glass-card p-20 lg:p-32 text-center border-white/10 relative overflow-hidden group/cta">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 -mr-64 -mt-64 rounded-full blur-3xl opacity-0 group-hover/cta:opacity-100 transition-opacity duration-1000" />

            <div className="relative z-10">
              <h2 className="text-6xl lg:text-9xl font-black text-white tracking-tighter leading-tight mb-10 italic">
                Ready to <br /><span className="opacity-20 not-italic">Begin?</span>
              </h2>
              <p className="text-2xl text-white/50 mb-16 max-w-2xl mx-auto font-bold leading-relaxed">
                Join thousands of students who are already using SatValley to reach their goal scores.
              </p>
              <button
                className="h-24 px-20 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[3rem] text-xl font-black uppercase tracking-[0.4em] shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-6 mx-auto"
              >
                Join for Free
                <Zap className="w-8 h-8 fill-current text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
