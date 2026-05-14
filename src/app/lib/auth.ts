import { supabase } from './supabase';

const getApiBase = () => {
    const url = (import.meta as any).env.VITE_BACKEND_URL || '';
    // If we're on localhost and the backend URL is remote, we might want to use the local proxy instead
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
            return ''; // Use relative path to hit Vite proxy
        }
    }
    return url.replace(/\/$/, ''); // Remove trailing slash if exists
};

export const authApi = {
    async getSession() {
        return supabase.auth.getSession();
    },

    async signInWithPassword({ email, password }: any) {
        const res = await fetch(`${getApiBase()}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        // Establish the session locally
        if (data.session) {
            await supabase.auth.setSession(data.session);
        }
        return data;
    },

    async signUp({ email, password }: any) {
        const res = await fetch(`${getApiBase()}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');

        // If the backend returns a session (e.g. if email confirmation is off), set it
        if (data.session) {
            await supabase.auth.setSession(data.session);
        }
        return data;
    },

    async signInWithOtp({ email, options }: any) {
        const res = await fetch(`${getApiBase()}/api/auth/otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, options })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'OTP failed');
        return data;
    },

    async verifyOtp({ email, token, type }: any) {
        const res = await fetch(`${getApiBase()}/api/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, token, type })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Verification failed');

        if (data.session) {
            await supabase.auth.setSession(data.session);
        }
        return data;
    },

    async signInWithOAuth({ provider, options }: any) {
        return supabase.auth.signInWithOAuth({ provider, options });
    },

    async signOut() {
        // Always clear local session, even if backend call fails
        try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (token) {
                // Best-effort backend logout — don't let CORS errors block the user from logging out
                fetch(`${getApiBase()}/api/auth/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => { /* ignore network errors */ });
            }
        } catch (_) { /* ignore */ }
        return supabase.auth.signOut();
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
        return supabase.auth.onAuthStateChange(callback);
    }
};

export const apiFetch = async (url: string, options: any = {}) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const headers: any = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    return fetch(`${getApiBase()}${url}`, { ...options, headers });
};
