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
        return supabase.auth.signInWithPassword({ email, password });
    },

    async signUp({ email, password }: any) {
        return supabase.auth.signUp({ email, password });
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
