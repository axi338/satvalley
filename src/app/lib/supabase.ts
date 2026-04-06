import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL ERROR: Supabase environment variables are missing!');
    console.log('Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment settings.');
    throw new Error('Missing Supabase environment variables');
}

// PKCE must match Supabase OAuth redirects (?code= in the URL). The JS client
// defaults to implicit flow (hash tokens); with implicit + a PKCE callback the
// session is never detected and Google sign-in appears to "do nothing".
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        flowType: 'pkce',
    },
});
