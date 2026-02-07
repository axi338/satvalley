import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
    console.log("--- Testing Write Access ---");
    const { data, error } = await supabase.from('import_jobs').insert({
        filename: 'cache_test.pdf',
        status: 'queued'
    }).select();

    if (error) {
        console.log(`❌ Insert failed: ${error.code} - ${error.message}`);
    } else {
        console.log(`✅ Insert successful! ID: ${data[0].id}`);
        // Cleanup
        await supabase.from('import_jobs').delete().eq('id', data[0].id);
        console.log("✅ Cleanup complete.");
    }
}
verify();
