import { Github, Send, MessageCircle, Twitter } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="relative pt-24 pb-12 px-6 bg-[#020617] mt-24 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shadow-lg shadow-indigo-600/30">
                <img src="/logo.png" alt="SAT Valley Logo" className="w-full h-full object-cover" />
              </div>
              <div className="text-xl font-bold text-white tracking-tight">SAT Valley</div>
            </div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Premium SAT Preparation</p>
          </div>

          <div className="flex flex-wrap gap-12">
            {/* Support & Contact */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Support</h4>
              <div className="flex flex-col gap-2">
                <a href="mailto:ibroximovaxliddin6.5@gmail.com" className="text-sm font-bold text-slate-300 hover:text-indigo-400 transition-colors">Contact Support</a>
                <span className="text-[10px] text-slate-600 font-medium">Response within 24h</span>
              </div>
            </div>

            {/* Social */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Social</h4>
              <div className="flex items-center gap-4">
                <a
                  href="https://t.me/satvalley_admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-[#229ED9] transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#229ED9]/10 flex items-center justify-center group-hover:bg-[#229ED9]/20 transition-all">
                    <Send className="w-3 h-3 -rotate-45 translate-x-0.5" />
                  </div>
                  Telegram
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
            © {new Date().getFullYear()} SAT Valley. Precision Prep.
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">Systems Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
