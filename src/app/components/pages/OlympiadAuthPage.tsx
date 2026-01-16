import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Loader2, Phone } from 'lucide-react';
import { countryCodes } from '../../data/countryCodes';

interface OlympiadAuthPageProps {
    onSuccess: () => void;
}

export function OlympiadAuthPage({ onSuccess }: OlympiadAuthPageProps) {
    const [step, setStep] = useState<'checking' | 'profile' | 'otp'>('checking');
    const [loading, setLoading] = useState(false);

    // Profile Data
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+1');
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
                // Should not happen if App.tsx guards this, but if it does, generic error or nothing
                return;
            }

            const res = await fetch(`${apiBase}/api/olympiad/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.profile?.phone_verified) {
                onSuccess();
            } else if (data.profile) {
                setFullName(data.profile.full_name || '');
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

    const handleSaveProfile = async () => {
        if (!fullName || !phone) return alert("All fields required");
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
                body: JSON.stringify({ full_name: fullName, phone, country_code: countryCode })
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
                        {step === 'profile' && 'Competitor Profile'}
                        {step === 'otp' && 'Verification'}
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        {step === 'profile' && 'Complete your profile to proceed.'}
                        {step === 'otp' && 'Enter the code sent to your device.'}
                    </p>
                </div>

                {step === 'profile' && (
                    <div className="space-y-4">
                        <input
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 focus:outline-none"
                        />
                        <div className="flex gap-2">
                            <select
                                value={countryCode}
                                onChange={e => setCountryCode(e.target.value)}
                                className="bg-black border border-white/10 rounded-xl px-3 py-3 text-white focus:border-indigo-500/50 focus:outline-none max-w-[120px]"
                            >
                                {countryCodes.map((c) => (
                                    <option key={`${c.country}-${c.code}`} value={c.code}>
                                        {c.flag} {c.code}
                                    </option>
                                ))}
                            </select>
                            <input
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="Phone Number"
                                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            disabled={loading}
                            className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                            Verify Mobile
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
