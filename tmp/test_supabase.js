import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://zxaxmkpnjwrzqyjldgam.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4YXhta3BuandyenF5amxkZ2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTYyNTUsImV4cCI6MjA4MzE5MjI1NX0.m5F_ripNyWid8k0Zt1EC4xhoh--zEiHhnEhoUj4y3N4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
    console.log("Testing sign up...");
    try {
        const res = await supabase.auth.signUp({
            email: "test.user.123456@example.com",
            password: "Password123!"
        });
        console.log("SignUp response:", res.data, res.error);
    } catch (err) {
        console.error("SignUp error:", err);
    }

    console.log("Testing OAuth URL generation...");
    try {
        const res = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'http://localhost:5173'
            }
        });
        console.log("OAuth response:", res.data, res.error);
    } catch (err) {
        console.error("OAuth error:", err);
    }
}

testAuth();
