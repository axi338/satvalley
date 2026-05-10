import { useState, useRef } from 'react';
import { User, Mail, Phone, Edit2, Copy, Send, CheckCircle2, Gift, Users, Loader2, X, Save, Camera } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { authApi, apiFetch } from '../../lib/auth';
import { toast } from 'sonner';

interface ProfilePageProps {
    user: SupabaseUser;
    profile?: any;
    onProfileUpdate?: () => void;
}

export function ProfilePage({ user, profile, onProfileUpdate }: ProfilePageProps) {
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);

    const [editName, setEditName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
    const [editPhone, setEditPhone] = useState(profile?.phone || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || user?.user_metadata?.avatar_url || '');
    const [bannerUrl, setBannerUrl] = useState(profile?.banner_url || "https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=2676&auto=format&fit=crop");



    const fileInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    // Derive display names
    const fullName = editName || 'Scholar';
    const email = user?.email || 'Not provided';
    const phone = editPhone || 'Not provided';
    const userId = user?.id || 'Unknown ID';

    // Mock referral data
    const referralCode = `SAT-${userId.substring(0, 8).toUpperCase()}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploadingAvatar(true);

            const formData = new FormData();
            formData.append('file', file);
            const res = await apiFetch('/api/me/avatar', { method: 'POST', body: formData, headers: {} });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const publicUrl = data.url;

            setAvatarUrl(publicUrl);
            toast.success('Profile picture updated!');
            onProfileUpdate?.();
        } catch (err: any) {
            console.error('Avatar upload error:', err);
            let msg = err.message || 'Unknown error';

            // Check specifically for HTML responses (means bucket is missing or server error)
            if (msg.includes('Unexpected token') || msg.includes('<html>')) {
                msg = "Storage bucket 'avatars' is likely missing. Please run the migration SQL to create it.";
            } else if (msg.includes('Failed to fetch')) {
                msg = "Connection blocked (VPN/Ad-blocker?). Please check your network.";
            }

            toast.error('Failed to upload picture: ' + msg);
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploadingBanner(true);
            const formData = new FormData();
            formData.append('file', file);
            const res = await apiFetch('/api/me/banner', { method: 'POST', body: formData, headers: {} });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const publicUrl = data.url;

            setBannerUrl(publicUrl);
            toast.success('Cover photo updated!');
            onProfileUpdate?.();
        } catch (err: any) {
            console.error('Banner upload error:', err);
            let msg = err.message || 'Unknown error';
            if (msg.includes('Unexpected token') || msg.includes('<html>')) {
                msg = "Storage bucket 'banners' is missing. Run the migration SQL.";
            }
            toast.error('Failed to upload cover photo: ' + msg);
        } finally {
            setIsUploadingBanner(false);
        }
    };

    const saveProfile = async () => {
        setIsSaving(true);
        try {
            const res = await apiFetch('/api/me/profile', {
                method: 'POST',
                body: JSON.stringify({
                    full_name: editName,
                    phone: editPhone,
                    avatar_url: avatarUrl,
                    banner_url: bannerUrl
                })
            });

            if (!res.ok) throw new Error((await res.json()).error);
            toast.success('Profile saved!');
            setIsEditing(false);
            onProfileUpdate?.();
        } catch (err: any) {
            console.error('Error saving profile:', err);
            let msg = err.message || 'Check console';
            if (msg.includes('Unexpected token') || msg.includes('Failed to fetch') || msg.includes('<html>')) {
                msg = "Connection blocked (likely by an Ad-Blocker or VPN). Please disable them for this site.";
            }
            toast.error('Failed to save profile: ' + msg);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200">
            {/* Top Banner section */}
            <div className="w-full h-64 md:h-80 relative overflow-hidden bg-slate-900 border-b border-white/5 group">
                <img
                    src={bannerUrl}
                    alt="Profile Banner"
                    className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent" />

                {isEditing && (
                    <div
                        onClick={() => bannerInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                    >
                        <div className="flex flex-col items-center text-white bg-black/40 p-4 rounded-2xl border border-white/10">
                            <Edit2 className="w-8 h-8 mb-2" />
                            <span className="font-bold text-sm tracking-widest uppercase">Change Cover Photo</span>
                        </div>
                    </div>
                )}

                <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    ref={bannerInputRef}
                    onChange={handleBannerChange}
                />

                <div className="absolute bottom-6 right-6 flex flex-col md:flex-row items-end md:items-center gap-2">
                    <div className="flex items-center gap-2 bg-[#020617]/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-white/70">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                        Online
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 -mt-24 relative z-10 pb-24">

                {/* Main Profile Card */}
                {!isEditing ? (
                    <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl mb-8 relative">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-xl border border-white/10 hover:bg-white/10 group flex items-center gap-2"
                        >
                            <span className="text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity w-0 group-hover:w-auto overflow-hidden">Edit</span>
                            <Edit2 size={18} />
                        </button>

                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Avatar */}
                            <div className="relative group shrink-0">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-32 h-32 rounded-3xl object-cover shadow-xl border-4 border-[#0F172A]" />
                                ) : (
                                    <div className="w-32 h-32 rounded-3xl bg-indigo-600 flex items-center justify-center text-white font-black text-5xl shadow-xl shadow-indigo-500/20 border-4 border-[#0F172A]">
                                        {fullName[0]?.toUpperCase() || 'S'}
                                    </div>
                                )}
                            </div>

                            {/* User Details */}
                            <div className="flex-1 space-y-6 pt-2 w-full">
                                <div>
                                    <h1 className="text-3xl font-black text-white">{fullName}</h1>
                                    <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs mt-1 opacity-80">SatValley Scholar</p>
                                </div>

                                <div className="space-y-4">
                                    {/* ID Row */}
                                    <div className="flex items-center gap-3 text-sm group">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                                            <User size={16} />
                                        </div>
                                        <div className="flex-1 flex items-center gap-2 text-slate-300">
                                            <span className="font-mono">{userId}</span>
                                        </div>
                                    </div>

                                    {/* Email Row */}
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                                            <Mail size={16} />
                                        </div>
                                        <span className="text-slate-300">{email}</span>
                                    </div>

                                    {/* Phone Row */}
                                    <div className="flex items-center gap-3 text-sm group">
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 shrink-0">
                                            <Phone size={16} />
                                        </div>
                                        <div className="flex-1 flex items-center gap-2 text-slate-300">
                                            <span className={phone === 'Not provided' ? 'text-slate-500 italic' : ''}>{phone}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Telegram Auth Button */}
                                <div className="pt-4 border-t border-white/5">
                                    <button className="flex items-center gap-3 bg-[#2AABEE]/10 hover:bg-[#2AABEE]/20 border border-[#2AABEE]/30 text-[#2AABEE] px-6 py-3 rounded-2xl font-bold transition-all shadow-[0_0_15px_rgba(42,171,238,0.1)] group">
                                        <Send size={18} className="group-hover:-translate-y-1 transition-transform" />
                                        Log in with Telegram
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Edit Overlay UI (Matches user screenshot) */
                    <div className="bg-[#0f172a] rounded-[2rem] p-6 md:p-8 shadow-2xl mb-8 relative border border-[#1e293b]">
                        <button
                            onClick={() => setIsEditing(false)}
                            disabled={isSaving}
                            className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full border border-white/10 hover:bg-white/10"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mt-4">
                            {/* Blue Avatar Box */}
                            <div className="relative group shrink-0">
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                />
                                <div
                                    onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#4f46e5] flex items-center justify-center text-white font-black text-4xl sm:text-5xl shadow-[0_0_30px_rgba(79,70,229,0.3)] border-4 border-[#0f172a] cursor-pointer relative overflow-hidden group transition-all ${isUploadingAvatar ? 'opacity-70 grayscale-[0.5]' : 'group-hover:bg-[#6366f1]'}`}
                                >
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className={`w-full h-full object-cover transition-opacity ${isUploadingAvatar ? 'opacity-30' : 'opacity-100'}`} />
                                    ) : (
                                        (editName || profile?.full_name || user?.user_metadata?.full_name || user?.email || 'S')[0]?.toUpperCase()
                                    )}

                                    {/* Edit Hover Overlay */}
                                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isUploadingAvatar ? 'hidden' : ''}`}>
                                        <Camera className="text-white w-6 h-6" />
                                    </div>

                                    {/* Uploading Loader overlay */}
                                    {isUploadingAvatar && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Name Input & Save Button */}
                            <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-4 bg-[#020617] rounded-2xl border border-white/5 p-2 pr-4 shadow-inner">
                                <div className="flex-1 px-4 py-2 w-full">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder="Your Full Name"
                                        className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder:text-slate-600"
                                    />
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#4f46e5] mt-1 opacity-80">SatValley Scholar</div>
                                </div>
                                <button
                                    onClick={() => saveProfile()}
                                    disabled={isSaving}
                                    className="w-full sm:w-auto px-6 py-3 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Save
                                </button>
                            </div>
                        </div>

                        {/* Phone Edit Row (Optional, kept minimal) */}
                        <div className="mt-8 pt-6 border-t border-[#1e293b] flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#020617] flex items-center justify-center text-slate-400 border border-white/5 shrink-0">
                                <Phone size={16} />
                            </div>
                            <input
                                type="tel"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                placeholder="+1 (555) 000-0000"
                                className="w-full max-w-sm bg-[#020617] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-[#4f46e5] outline-none transition-colors placeholder:text-slate-600"
                            />
                        </div>
                    </div>
                )}

                {/* Referral Section */}
                <div className="bg-gradient-to-br from-indigo-900/40 to-[#0f172a] border border-indigo-500/20 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-4 border border-amber-500/20">
                                <Gift size={12} />
                                Rewards Program
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Referral</h2>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-sm">
                                Share your unique referral code with friends and earn rewards for every successful registration to the SatValley community.
                            </p>

                            <div className="flex items-center gap-3">
                                <div className="bg-[#020617] py-3 px-5 rounded-xl border border-white/10 font-mono text-indigo-300 tracking-wider font-bold flex-1 max-w-[200px] text-center">
                                    {referralCode}
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className={`p-3.5 rounded-xl transition-all flex items-center justify-center ${copied
                                        ? 'bg-emerald-500 text-white border-transparent'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-[0_0_20px_rgba(79,70,229,0.3)]'
                                        }`}
                                >
                                    {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="hidden md:flex w-48 h-48 bg-white/5 rounded-full items-center justify-center border-8 border-[#0F172A] relative shadow-2xl">
                            <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-pulse" />
                            <Users className="w-20 h-20 text-indigo-400" />
                            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-amber-500 rounded-2xl rotate-12 flex items-center justify-center border-4 border-[#0F172A] shadow-xl">
                                <Gift className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
