import { useState } from 'react';
import { Shield, Plus, User, Mail, Lock, Key, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { authApi, apiFetch } from '../../lib/auth';

interface TeacherSignupPageProps {
    onNavigate: (page: string) => void;
}

export function TeacherSignupPage({ onNavigate }: TeacherSignupPageProps) {
    const [code, setCode] = useState('');
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const apiBase = (import.meta as any).env?.VITE_BACKEND_URL || '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${apiBase}/api/auth/teacher-signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, email, password, full_name: fullName }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Signup failed');

            setSuccess(true);
            // Optionally auto-login or redirect to login
            setTimeout(() => onNavigate('dashboard'), 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-6">
                <div className="max-w-md w-full p-12 bg-[#0a0f1d]/60 border border-emerald-500/20 rounded-[3rem] backdrop-blur-xl text-center animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                        <Shield className="text-emerald-400 w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4">Welcome, Teacher!</h2>
                    <p className="text-emerald-200/60 font-medium mb-8">Your account has been verified and granted teacher privileges. Redirecting to your dashboard...</p>
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6 pt-32 pb-24">
            <div className="max-w-xl w-full p-8 md:p-12 bg-[#0a0f1d]/60 border border-white/10 rounded-[3rem] backdrop-blur-xl shadow-2xl relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px]" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/20">
                            <Plus className="text-indigo-400 w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Teacher Registration</h1>
                            <p className="text-indigo-200/40 text-sm font-bold uppercase tracking-widest">Premium Class Access</p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold animate-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] ml-2">Invitation Code</label>
                            <div className="relative group">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400/40 group-focus-within:text-indigo-400 transition-colors" />
                                <Input
                                    required
                                    value={code}
                                    onChange={e => setCode(e.target.value)}
                                    placeholder="INV-XXXXX"
                                    className="bg-white/5 border-white/10 h-14 pl-12 rounded-2xl text-white font-mono placeholder:text-white/10 focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] ml-2">Full Name</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-white transition-colors" />
                                    <Input
                                        required
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        placeholder="John Doe"
                                        className="bg-white/5 border-white/10 h-14 pl-12 rounded-2xl text-white placeholder:text-white/10 focus:border-indigo-500/50 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] ml-2">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-white transition-colors" />
                                    <Input
                                        required
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="teacher@satvalley.com"
                                        className="bg-white/5 border-white/10 h-14 pl-12 rounded-2xl text-white placeholder:text-white/10 focus:border-indigo-500/50 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] ml-2">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-white transition-colors" />
                                <Input
                                    required
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="bg-white/5 border-white/10 h-14 pl-12 rounded-2xl text-white placeholder:text-white/10 focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-16 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    Verify Code & Create Account
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </Button>

                        <p className="text-center text-[10px] text-indigo-200/20 uppercase font-bold tracking-[0.3em] pt-4">
                            Authorized SAT Valley Educational Partners Only
                        </p>
                    </form>
                </div>

                <button
                    onClick={() => onNavigate('dashboard')}
                    className="absolute top-8 left-8 text-white/40 hover:text-white transition-colors flex items-center gap-2 group"
                >
                    <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-bold uppercase tracking-widest">Back to Dashboard</span>
                </button>
            </div>
        </div>
    );
}
