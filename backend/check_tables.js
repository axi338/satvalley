import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    // We can't list tables directly via Supabase JS easily, 
    // but we can try common table names to see if they exist.
    const commonTables = [
        'tests', 'questions', 'test_questions',
        'import_jobs', 'import_candidates',
        'results', 'profiles'
    ];

    for (const table of commonTables) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (error) {
            console.log(`Table '${table}': NOT FOUND or error: ${error.message}`);
        } else {
            console.log(`Table '${table}': EXISTS`);
        }
    }
}

listTables();
