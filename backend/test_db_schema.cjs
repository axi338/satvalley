const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log('--- Database Verification ---');

    // 1. Check profiles for is_teacher column
    const { data: profile, error: pError } = await supabase.from('profiles').select('is_teacher').limit(1).maybeSingle();
    if (pError) {
        console.error('PROFILES TABLE ERROR:', pError.message);
    } else {
        console.log('PROFILES TABLE: is_teacher column exists.');
    }

    // 2. Check teacher_invites table
    const { data: invite, error: iError } = await supabase.from('teacher_invites').select('*').limit(1);
    if (iError) {
        console.error('TEACHER_INVITES TABLE ERROR:', iError.message);
    } else {
        console.log('TEACHER_INVITES TABLE: Exists.');
    }

    process.exit(0);
}

test();
