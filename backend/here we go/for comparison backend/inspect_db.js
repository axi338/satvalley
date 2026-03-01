import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    console.log("Inspecting 'test_sessions'...");
    const { data, error } = await supabase.from('test_sessions').select('*').limit(1);
    if (error) console.error("Error:", error);
    else console.log("✅ test_sessions is confirmed present.");

    console.log("Checking for 'tests' table (needed for references)...");
    const { data: tests, error: testsError } = await supabase.from('tests').select('id').limit(1);
    if (testsError) console.error("❌ tests table is MISSING or inaccessible:", testsError.message);
    else console.log("✅ tests table exists.");
}
inspect();
