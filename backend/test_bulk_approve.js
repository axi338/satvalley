import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testApproveAll() {
    const jobId = '58577675-dd14-4632-8045-cf141d35c743';
    console.log(`Testing approve_all_import_candidates for job ${jobId}...`);

    const { data, error } = await supabase.rpc('approve_all_import_candidates', {
        p_job_id: jobId
    });

    if (error) {
        console.error('❌ RPC Error:', error);
        if (error.hint) console.log('HINT:', error.hint);
        if (error.details) console.log('DETAILS:', error.details);
    } else {
        console.log('✅ RPC Success:', data);
    }
}

testApproveAll();
