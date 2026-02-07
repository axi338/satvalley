import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
    const tables = ['import_jobs', 'import_candidates', 'test_questions', 'questions', 'test_sessions', 'session_answers'];
    console.log("--- Full DB Table Audit ---");
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ ${table}: ${error.code} - ${error.message}`);
        } else {
            console.log(`✅ ${table}: Exists`);
        }
    }
}
verify();
