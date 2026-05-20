import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://zxaxmkpnjwrzqyjldgam.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4YXhta3BuandyenF5amxkZ2FtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYxNjI1NSwiZXhwIjoyMDgzMTkyMjU1fQ.1ZBrG3m3EQ7bVzv1ZNKYgilnlU5AE4apUgR4mXXhQBI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const tables = ['import_jobs', 'questions', 'import_candidates'];
    for (const table of tables) {
        console.log(`\nTable: ${table}`);
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`Error fetching from ${table}: ${error.message}`);
        } else if (data && data.length > 0) {
            console.log(`Columns: ${Object.keys(data[0]).join(', ')}`);
        } else {
            console.log('No data found in table to check columns.');
        }
    }
}

checkSchema();
