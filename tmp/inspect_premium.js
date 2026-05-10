import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    const tables = ['profiles', 'class_assignments', 'class_submissions', 'class_performance', 'class_leaderboard'];

    for (const table of tables) {
        console.log(`\n--- Checking columns for ${table} ---`);
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.error(`Error:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`Columns:`, Object.keys(data[0]));
        } else {
            console.log(`Table exists but is empty.`);
        }
    }
}
inspect();
