import { useState, useEffect } from 'react';
import { Loader2, Sparkles, GraduationCap, Zap, User as UserIcon, Calendar, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface OnboardingPageProps {
    user: User;
    onComplete: () => void;
}

export function OnboardingPage({ user, onComplete }: OnboardingPageProps) {
    const [fullName, setFullName] = useState('');
    const [gradYear, setGradYear] = useState('');
    const [satDeadline, setSatDeadline] = useState('');
    const [phone, setPhone] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch existing profile data if they partially filled it
    useEffect(() => {
        async function fetchProfile() {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error("Error fetching profile during onboarding:", error);
                }

                if (data) {
                    if (data.full_name) setFullName(data.full_name);
                    if (data.phone) setPhone(data.phone);
                    if (data.graduation_year) setGradYear(data.graduation_year);
                    if (data.sat_deadline) setSatDeadline(data.sat_deadline);
                } else {
                    // Attempt to fetch from user metadata for google auth
                    const metadataName = user.user_metadata?.full_name;
                    if (metadataName) setFullName(metadataName);
                }
            } catch (err) {
                console.error("Unexpected error fetching profile:", err);
            }
        }

        fetchProfile();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName || !gradYear || !satDeadline || !phone) {
            setError('Please fill out all mandatory fields.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: fullName,
                    phone: phone,
                    graduation_year: gradYear,
                    sat_deadline: satDeadline,
                    email: user.email,
                    updated_at: new Date().toISOString()
                });

            if (upsertError) throw upsertError;

            onComplete(); // Successfully saved, signal to App.tsx to remove lock
        } catch (err) {
            console.error('Error saving profile data:', err);
            setError(err instanceof Error ? err.message : 'Failed to save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12 relative z-10 bg-[#0A0F1E]">
            {/* Background decorations */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

            <div className="w-full max-w-xl bg-black/40 backdrop-blur-xl border border-white/10 p-10 md:p-14 rounded-[2rem] shadow-2xl relative z-10">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-indigo-400/20">
                        <GraduationCap className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-3">Complete Your Profile</h1>
                    <p className="text-white/60 font-medium">Please provide your details to personalize your SatValley experience.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-indigo-200/60 uppercase tracking-widest flex items-center gap-2">
                            <UserIcon className="w-4 h-4" /> Full Name
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full h-14 bg-white/5 border border-white/10 rounded-xl focus:border-indigo-500 focus:bg-white/10 outline-none px-6 font-bold text-white transition-all placeholder:text-white/20"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-indigo-200/60 uppercase tracking-widest flex items-center gap-2">
                            <Phone className="w-4 h-4" /> Phone Number
                        </label>
                        <input
                            type="tel"
                            required
                            placeholder="+1 (555) 000-0000"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full h-14 bg-white/5 border border-white/10 rounded-xl focus:border-indigo-500 focus:bg-white/10 outline-none px-6 font-bold text-white transition-all placeholder:text-white/20"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-indigo-200/60 uppercase tracking-widest flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" /> Graduation Year
                            </label>
                            <input
                                type="number"
                                required
                                min="2024"
                                max="2035"
                                placeholder="2027"
                                value={gradYear}
                                onChange={(e) => setGradYear(e.target.value)}
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-xl focus:border-indigo-500 focus:bg-white/10 outline-none px-6 font-bold text-white transition-all placeholder:text-white/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-indigo-200/60 uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> SAT Deadline
                            </label>
                            <input
                                type="month"
                                required
                                value={satDeadline}
                                onChange={(e) => setSatDeadline(e.target.value)}
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-xl focus:border-indigo-500 focus:bg-white/10 outline-none px-6 font-bold text-white transition-all text-white/80"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 border border-rose-500/20 rounded-xl px-5 py-4 flex items-center gap-3 animate-in fade-in">
                            <Zap className="w-4 h-4 fill-current flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full h-16 bg-white text-black hover:bg-indigo-400 hover:text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-black/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group mt-8"
                        disabled={loading || !fullName || !phone || !gradYear || !satDeadline}
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                Let's Get Started
                                <Sparkles className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
