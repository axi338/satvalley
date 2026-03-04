import { useState } from 'react';
import { Mail, Lock, Loader2, Chrome, ShieldCheck, Sparkles, GraduationCap, Zap, Globe, Cpu } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Mode = 'login' | 'register';

export function AuthPage({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setError(null);
    setSuccess(null);
  };

  const handleEmailAuth = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    console.log(`DEBUG: handleEmailAuth started for mode: ${mode}, email: ${email}`);
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        console.log("DEBUG: Sign up successful", data);
        onSuccess();
      } else if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        console.log("DEBUG: Sign in successful", data);
        onSuccess();
      }
    } catch (err) {
      console.error("DEBUG: handleEmailAuth error:", err);
      const message =
        err instanceof Error ? err.message : 'Authentication sequence failed. Verify credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    console.log("DEBUG: handleGoogle started with origin:", window.location.origin);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      console.log("DEBUG: Google OAuth initiated", data);
    } catch (err) {
      console.error("DEBUG: handleGoogle error:", err);
      const message =
        err instanceof Error ? err.message : 'Google OAuth failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 relative z-10">
      <div className="relative z-10 max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 glass-card border-white/10 overflow-hidden shadow-2xl">
        {/* Branding Sidebar */}
        <div className="hidden lg:flex flex-col justify-between p-16 bg-[#0A0F1E] relative overflow-hidden group border-r border-white/5">
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse" />

          <div className="relative z-10 space-y-12">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border-white/10 shadow-xl bg-white/5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em]">Secure Node Access</span>
            </div>
            <div className="space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl flex items-center justify-center mb-10 shadow-2xl border border-indigo-400/20">
                <GraduationCap className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-6xl font-black text-white tracking-tighter leading-none italic">
                Elite <br /><span className="opacity-40 not-italic">Preparation.</span>
              </h1>
              <p className="text-white/60 font-bold text-xl leading-relaxed max-w-md">
                Sign in to access your dashboard, track your progress, and continue your path to a perfect score.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-8 pt-12 border-t border-white/5">
            <div className="flex items-center gap-5">
              <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
              <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.4em]">Secure Platform</span>
            </div>
            <div className="flex items-center gap-6 opacity-40">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <div className="h-px w-12 bg-white/20" />
              <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Official Standard</span>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="p-12 lg:p-20 space-y-12 bg-black/40 backdrop-blur-md">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl border border-indigo-500/10 bg-indigo-500/5 shadow-sm">
              <Cpu className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300/60">
                {mode === 'login' ? 'Authentication' : 'Registration'}
              </span>
            </div>
            <h2 className="text-5xl font-black text-white tracking-tighter leading-none italic">
              {mode === 'login' ? 'Welcome' : 'Create'} <span className="opacity-20 not-italic">{mode === 'login' ? 'Back.' : 'Account.'}</span>
            </h2>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.4em]">Email Address</label>
                <Mail className="w-4 h-4 text-indigo-200/20" />
              </div>
              <input
                type="email"
                placeholder="student@satvalley.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl focus:border-indigo-500 focus:bg-white/10 outline-none px-6 font-bold text-white transition-all placeholder:text-white/20"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.4em]">Password</label>
                <Lock className="w-4 h-4 text-indigo-200/20" />
              </div>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl focus:border-indigo-500 focus:bg-white/10 outline-none px-6 font-bold text-white transition-all placeholder:text-white/20"
              />
            </div>

            {error && (
              <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 border border-rose-500/20 rounded-xl px-5 py-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <Zap className="w-4 h-4 fill-current" />
                {error}
              </div>
            )}

            {success && (
              <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <Sparkles className="w-4 h-4 fill-current" />
                {success}
              </div>
            )}

            <div className="pt-6 space-y-6">
              <button
                className="w-full h-20 bg-white text-black hover:bg-indigo-400 hover:text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.4em] shadow-xl shadow-black/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group"
                onClick={handleEmailAuth}
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="animate-pulse">Processing...</span>
                  </>
                ) : mode === 'login' ? (
                  <>
                    Sign In
                    <Zap className="w-5 h-5 fill-current text-indigo-600 group-hover:text-white transition-colors" />
                  </>
                ) : (
                  <>
                    Register
                    <Globe className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" />
                  </>
                )}
              </button>

              <button
                className="w-full h-20 border border-white/10 hover:bg-white/5 text-white/80 rounded-[2rem] text-sm font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4"
                onClick={handleGoogle}
                disabled={loading}
              >
                <Chrome className="w-6 h-6 text-indigo-400" />
                Continue with Google
              </button>
            </div>
          </div>

          <div className="text-[10px] font-black text-indigo-200/30 uppercase tracking-[0.4em] text-center pt-10 border-t border-indigo-500/10">
            {mode === 'login' ? "Don't have an account?" : 'Already a member?'}{' '}
            <button onClick={toggleMode} className="text-indigo-400 hover:text-indigo-300 ml-3 underline underline-offset-8 transition-colors">
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
