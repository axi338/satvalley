import { Github, Send, MessageCircle, Twitter } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="relative pt-24 pb-12 px-6 bg-[#020617] mt-24 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shadow-lg shadow-indigo-600/30">
                <img src="/logo.jpg" alt="SAT Valley Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-xl font-bold text-white tracking-tight">SAT Valley</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Premium Prep</div>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-sm">
              Crafted for students who demand excellence. Precision, analytics, and intelligence combined.
            </p>

          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Platform</h4>
            <div className="flex flex-col gap-3">
              <button onClick={() => onNavigate('features')} className="text-left text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors">Features</button>
              <button onClick={() => onNavigate('results')} className="text-left text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors">Analytics</button>
              <button onClick={() => onNavigate('calculator')} className="text-left text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors">Score Calculator</button>
              <button onClick={() => onNavigate('review')} className="text-left text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors">Review</button>
            </div>
          </div>

          {/* Admin */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">System</h4>
            <div className="flex flex-col gap-3">
              <button onClick={() => onNavigate('admin')} className="text-left text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors">Admin Portal</button>
              <div className="pt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Operational</span>
              </div>
            </div>
          </div>

          {/* Feedback & Social */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Connect & Feedback</h4>
            <div className="flex items-center gap-3 mb-4">
              <a href="https://t.me/satvalley_admin" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-[#229ED9]/10 hover:bg-[#229ED9]/20 hover:text-[#229ED9] flex items-center justify-center text-slate-400 transition-all">
                <Send className="w-4 h-4 -rotate-45 translate-x-0.5" />
              </a>
              <a href="https://www.instagram.com/satvalley.uz?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 hover:text-pink-500 flex items-center justify-center text-slate-400 transition-all">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const text = (e.currentTarget.elements.namedItem('feedback') as HTMLTextAreaElement).value;
                window.location.href = `mailto:ibroximovaxliddin6.5@gmail.com?subject=SAT Valley Feedback&body=${encodeURIComponent(text)}`;
              }}
              className="space-y-2"
            >
              <textarea
                name="feedback"
                placeholder="Send us your feedback..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all resize-none h-20 placeholder:text-slate-600"
              />
              <button type="submit" className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-indigo-600/20">
                Send Feedback
              </button>
            </form>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            © {new Date().getFullYear()} SAT Valley. All rights reserved.
          </div>
          <div className="text-xs font-medium text-slate-600">
            Design by Deepmind
          </div>
        </div>
      </div>
    </footer>
  );
}
