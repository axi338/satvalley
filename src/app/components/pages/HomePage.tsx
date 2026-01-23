import { useState, useEffect } from 'react';
import { ArrowRight, Target, Brain, Activity, ShieldCheck, Globe, Cpu, ChevronRight, Send, MessageCircle, Trophy, X, Sparkles, Medal } from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {

  const features = [
    {
      icon: Target,
      title: 'Practice Tests',
      description: 'Precision-engineered simulations that mirror the adaptive Digital SAT experience.',
      color: 'text-indigo-400'
    },
    {
      icon: Brain,
      title: 'Adaptive Logic',
      description: 'Advanced algorithms that simulate the Module 2 difficulty shifts based on your performance.',
      color: 'text-amber-400'
    },
    {
      icon: Activity,
      title: 'Skill Analytics',
      description: 'Granular tracking across all 8 SAT domains to identify exactly where to focus.',
      color: 'text-emerald-400'
    },
    {
      icon: ShieldCheck,
      title: 'Verified Content',
      description: 'Every question is cross-referenced with official College Board difficulty standards.',
      color: 'text-indigo-400'
    },
  ];

  const [content, setContent] = useState<any>({});

  useEffect(() => {
    fetch(`${(import.meta as any).env.VITE_BACKEND_URL || ''}/api/content`)
      .then(r => r.json())
      .then(data => setContent(data.content || {}))
      .catch(err => console.error("Failed to load content", err));
  }, []);

  const stats = [
    {
      score: content.stats_1_value || '1500+',
      label: content.stats_1_label || 'Students'
    },
    {
      score: content.stats_2_value || '1550+',
      label: content.stats_2_label || 'Students'
    },
    {
      score: content.stats_3_value || '1600',
      label: content.stats_3_label || 'Perfect Scores'
    },
  ];


  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-6 text-center z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-xl mb-8 animate-in fade-in slide-in-from-bottom-8">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">System v2.4 Active</span>
          </div>

          <h1 className="text-6xl lg:text-8xl font-black text-white max-w-5xl mx-auto mb-8 tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-12 duration-700">
            Success is a <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200">system.</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-16 leading-relaxed font-medium animate-in fade-in duration-1000">
            Master the Digital SAT with the world's most advanced
            adaptive preparation ecosystem.
          </p>

          <div className="flex flex-col items-center gap-8 animate-in fade-in duration-1000 delay-300">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <button
                onClick={() => onNavigate('practice')}
                className="btn-primary h-14 px-8 rounded-xl text-lg flex items-center justify-center gap-3 group w-full sm:w-auto min-w-[200px]"
              >
                Access Portal
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                className="btn-secondary h-14 px-8 rounded-xl text-lg backdrop-blur-md flex items-center justify-center gap-2 group w-full sm:w-auto min-w-[200px] hover:bg-white/10 transition-all border border-white/10"
                onClick={() => window.open('https://t.me/satvalley_admin', '_blank')}
              >
                Get Courses
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://t.me/sat_valley"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] text-sm font-bold transition-all border border-[#229ED9]/20 hover:border-[#229ED9]/50"
              >
                <Send className="w-4 h-4 -rotate-45 translate-x-0.5" />
                Telegram
              </a>
              <a
                href="https://www.instagram.com/satvalley.uz?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-500 text-sm font-bold transition-all border border-pink-500/20 hover:border-pink-500/50"
              >
                <MessageCircle className="w-4 h-4" />
                Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SAT Olympiad Promo Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-[150px] -z-10" />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-amber-300 uppercase tracking-widest">Live Competition</span>
              </div>

              <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[0.95]">
                {content.home_olympiad_title || (
                  <>
                    SAT <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Olympiad</span>
                  </>
                )}
                <br />
                <span className="text-white/30 italic text-4xl lg:text-5xl">{content.home_olympiad_subtitle || 'Season One.'}</span>
              </h2>

              <p className="text-xl text-white/50 leading-relaxed max-w-lg">
                {content.home_olympiad_desc || "Compete against Uzbekistan's brightest minds. Prove your excellence on the global stage and secure your place on the elite leaderboard."}
              </p>

              <div className="flex flex-wrap gap-6">

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Medal className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white">Top 3</div>
                    <div className="text-[10px] text-white/30 uppercase tracking-widest">Get Certificates</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate('olympiad')}
                className="group h-16 px-10 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-all hover:scale-105 active:scale-95 flex items-center gap-4"
              >
                <Trophy className="w-5 h-5" />
                Join Olympiad Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-[3rem] blur-3xl" />
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-amber-500/20 rounded-[3rem] p-12 backdrop-blur-md">
                <div className="text-center mb-8">
                  <div className="text-[10px] font-black text-amber-400 uppercase tracking-[0.4em] mb-4">Current Leaders</div>
                  <div className="w-20 h-1 bg-gradient-to-r from-amber-500 to-orange-500 mx-auto rounded-full" />
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((rank) => (
                    <div key={rank} className={`flex items-center gap-4 p-4 rounded-2xl ${rank === 1 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/5 border border-white/5'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${rank === 1 ? 'bg-amber-500 text-white' : rank === 2 ? 'bg-slate-400 text-slate-900' : 'bg-amber-700 text-white'}`}>
                        {rank}
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-white/10 rounded-full w-3/4" />
                        <div className="h-2 bg-white/5 rounded-full w-1/2 mt-2" />
                      </div>
                      <div className={`text-xl font-black ${rank === 1 ? 'text-amber-400' : 'text-white/60'}`}>
                        {1600 - (rank - 1) * 20}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                  <p className="text-white/20 text-[10px] uppercase tracking-widest">Could be you →</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 relative z-10 px-6 bg-black/20 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="group p-10 rounded-2xl bg-white/5 border border-white/5 text-center transition-all duration-500 hover:bg-white/10"
              >
                <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-4 opacity-60">{stat.label}</div>
                <div className="text-6xl font-black text-white tracking-tight mb-2">
                  {stat.score}
                </div>
                <div className="flex justify-center mt-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    Verified
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Detail */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 text-indigo-400 font-bold mb-6">
                <Globe className="w-5 h-5" />
                <span className="uppercase tracking-widest text-xs">Technical Specifications</span>
              </div>
              <h2 className="text-5xl lg:text-6xl font-black text-white tracking-tight">
                High-fidelity <br />
                <span className="text-slate-500">calibrations.</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 hover:border-indigo-500/30 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-8 group-hover:bg-white/10 transition-colors`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Engineering Footer Call to Action */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-12 bg-white/5 border border-white/10 shadow-2xl">
            <Cpu className="w-10 h-10 text-indigo-400" />
          </div>
          <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tight mb-8">
            Initialize your <br />
            <span className="text-indigo-500">perfect score.</span>
          </h2>
          <p className="text-xl text-slate-400 mb-16 max-w-xl mx-auto leading-relaxed">
            Access our secure testing environment and begin the most advanced
            SAT preparation sequence available.
          </p>
          <button
            onClick={() => onNavigate('practice')}
            className="btn-primary h-16 px-12 rounded-full text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40"
          >
            Start Session
          </button>
        </div>
      </section>
    </div >
  );
}
