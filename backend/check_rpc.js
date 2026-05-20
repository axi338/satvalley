import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRpc() {
    console.log('Checking for function approve_all_import_candidates...');
    // We can't list functions directly easily, but we can try calling it with a dummy ID
    const { data, error } = await supabase.rpc('approve_all_import_candidates', {
        p_job_id: '00000000-0000-0000-0000-000000000000'
    });

    if (error) {
        console.log('RPC Call Result:', error.message);
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
            console.log('❌ Function does NOT exist.');
        } else {
            console.log('✅ Function exists (but failed with expected error).');
        }
    } else {
        console.log('✅ Function exists and returned data:', data);
    }
}

checkRpc();
