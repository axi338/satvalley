import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    const tables = ['import_jobs', 'import_candidates', 'questions', 'test_questions'];

    for (const table of tables) {
        console.log(`Checking columns for '${table}'...`);
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.error(`Error fetching columns for ${table}:`, error);
            // If there's an error, it might mean the table doesn't exist or there's a permission issue.
            // We can try to check for table existence more explicitly if needed, but for now, just log the error.
        } else {
            if (data && data.length > 0) {
                console.log(`Columns found for ${table}:`, Object.keys(data[0]));
            } else {
                console.log(`Table '${table}' is empty, cannot infer columns from data. Checking for table existence...`);
                // Attempt to select 'id' to see if the table exists at all
                const { error: existError } = await supabase.from(table).select('id').limit(1);
                if (existError) {
                    console.error(`Table '${table}' might be missing or inaccessible:`, existError.message);
                } else {
                    console.log(`Table '${table}' exists but it's empty.`);
                }
            }
        }
    }
}
inspect();
