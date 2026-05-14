import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { authApi } from '../../lib/auth';
import { Trophy, Loader2, Phone, Zap, Mail } from 'lucide-react';
import { countryCodes } from '../../data/countryCodes';

interface OlympiadAuthPageProps {
    onSuccess: () => void;
}

export function OlympiadAuthPage({ onSuccess }: OlympiadAuthPageProps) {
    const [step, setStep] = useState<'checking' | 'auth' | 'profile' | 'otp'>('checking');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');

    // Profile Data
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+998');
    const [showCountryList, setShowCountryList] = useState(false);
    const [otp, setOtp] = useState('');

    const apiBase = (import.meta as any).env?.VITE_BACKEND_URL || '';

    useEffect(() => {
        checkProfile();
    }, []);

    const checkProfile = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                setStep('auth');
                return;
            }

            const res = await fetch(`${apiBase}/api/olympiad/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401) {
                setStep('auth');
                return;
            }

            const data = await res.json();

            if (data.profile?.phone_verified) {
                onSuccess();
            } else if (data.profile) {
                const parts = (data.profile.full_name || '').split(' ');
                setFirstName(parts[0] || '');
                setLastName(parts.slice(1).join(' ') || '');
                setPhone(data.profile.phone || '');
                setCountryCode(data.profile.country_code || '+1');
                setStep('otp');
            } else {
                setStep('profile');
            }
        } catch (e) {
            console.error(e);
            setStep('profile'); // Default to profile on error to allow retry/entry
        } finally {
            setLoading(false);
        }
    };

    const handleInitialAuth = async () => {
        if (!email) return alert("Email required");
        setLoading(true);
        try {
            const { error } = await authApi.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin,
                }
            });
            if (error) throw error;
            alert("Verification link sent to your email. Please click it to continue.");
        } catch (e: any) {
            alert(`Auth failed: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!firstName || !lastName || !phone) return alert("Full Name and Phone are required.");
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`${apiBase}/api/olympiad/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ full_name: `${firstName} ${lastName}`.trim(), phone, country_code: countryCode })
            });

            if (res.ok) {
                setStep('otp'); // Move to OTP
            } else {
                const errData = await res.json();
                throw new Error(errData.message || "Failed to save profile");
            }
        } catch (e: any) {
            alert(`Error saving profile: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp) return alert("Enter OTP");
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`${apiBase}/api/olympiad/verify-phone`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code: otp })
            });

            const data = await res.json();
            if (data.success) {
                onSuccess();
            } else {
                alert("Invalid OTP");
            }
        } catch (e) {
            alert("Verification failed");
        } finally {
            setLoading(false);
        }
    };

    if (step === 'checking') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-8 space-y-8">
                <div className="text-center">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Trophy className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter mb-2">
                        {step === 'auth' && 'Olympiad: Enter Node'}
                        {step === 'profile' && 'Competitor Sign Up'}
                        {step === 'otp' && 'Trust Verification'}
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        {step === 'auth' && 'Initialize your competition sequence.'}
                        {step === 'profile' && 'Register your official credentials.'}
                        {step === 'otp' && 'Verify your mobile connectivity.'}
                    </p>
                </div>

                {step === 'auth' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.4em] px-1 text-left block">Official Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="competitor@satvalley.com"
                                className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 transition-all outline-none font-bold"
                            />
                        </div>
                        <button
                            onClick={handleInitialAuth}
                            disabled={loading}
                            className="w-full h-16 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-500 hover:text-white transition-all shadow-xl flex items-center justify-center gap-3 group"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current text-indigo-600 group-hover:text-white" />}
                            Initialize Access
                        </button>
                    </div>
                )}

                {step === 'profile' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                                placeholder="First Name"
                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 focus:outline-none font-bold"
                            />
                            <input
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                                placeholder="Surname"
                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 focus:outline-none font-bold"
                            />
                        </div>
                        <div className="flex gap-2 relative">
                            <div className="relative w-[120px]">
                                <input
                                    value={countryCode}
                                    onChange={e => {
                                        setCountryCode(e.target.value);
                                        setShowCountryList(true);
                                    }}
                                    onFocus={() => setShowCountryList(true)}
                                    onBlur={() => setTimeout(() => setShowCountryList(false), 200)}
                                    placeholder="+Code"
                                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-white focus:border-indigo-500/50 focus:outline-none font-mono text-center"
                                />
                                {showCountryList && (
                                    <div className="absolute top-full left-0 w-[240px] max-h-60 overflow-y-auto bg-zinc-900 border border-white/10 rounded-xl z-50 mt-2 shadow-2xl p-2 custom-scrollbar">
                                        {countryCodes.filter(c =>
                                            c.code.includes(countryCode) ||
                                            (c.name && c.name.toLowerCase().includes(countryCode.toLowerCase())) ||
                                            countryCode === ''
                                        ).map((c) => (
                                            <button
                                                key={`${c.country}-${c.code}`}
                                                onClick={() => {
                                                    setCountryCode(c.code);
                                                    setShowCountryList(false);
                                                }}
                                                className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center gap-3 rounded-lg border-b border-white/5 last:border-0"
                                            >
                                                <span className="text-lg">{c.flag}</span>
                                                <span className="font-mono text-xs text-white/60">{c.code}</span>
                                                <span className="text-xs text-white/40 truncate flex-1">{c.name || c.country}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <input
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="Phone Number"
                                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 focus:outline-none font-bold"
                            />
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/10"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trophy className="w-5 h-5" />}
                            Register for Olympiad
                        </button>
                    </div>
                )}

                {step === 'otp' && (
                    <div className="space-y-4">
                        <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-center">
                            <p className="text-xs text-indigo-300">Development Mode: Enter <span className="font-mono font-bold">123456</span></p>
                        </div>
                        <input
                            value={otp}
                            onChange={e => setOtp(e.target.value)}
                            placeholder="000 000"
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] font-mono focus:border-indigo-500/50 focus:outline-none"
                            maxLength={6}
                        />
                        <button
                            onClick={handleVerifyOtp}
                            disabled={loading}
                            className="w-full py-4 bg-emerald-500 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                            Complete Verification
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
}
