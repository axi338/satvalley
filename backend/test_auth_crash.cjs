const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log('Testing with INVALID token...');
    try {
        const { data, error } = await supabase.auth.getUser('invalid-token-123');
        if (error) {
            console.log('EXPECTED ERROR (JSON):', error.message);
        } else {
            console.log('UNEXPECTED SUCCESS:', data);
        }
    } catch (err) {
        console.error('CRITICAL FAILURE (HTML?):', err.message);
        if (err.message.includes('<')) {
            console.error('REPRODUCED: Supabase returned HTML!');
        }
    }
    process.exit(0);
}

test();
