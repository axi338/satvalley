import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectSchema() {
    console.log(`\n=== Inspecting Tests Table ===\n`);

    // Try to insert a dummy record with test_type to see if it fails
    // or just select * using limit 1 and print keys
    const { data: tests, error } = await supabase
        .from('tests')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error selecting:', error);
    } else if (tests && tests.length > 0) {
        console.log('Columns found:', Object.keys(tests[0]));
        console.log('Test Type column exists?', Object.keys(tests[0]).includes('test_type'));
    } else {
        console.log('No tests found to inspect columns.');
    }

}

inspectSchema();
