import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/satvalley-main/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    const { data, error } = await supabase
        .from('results')
        .select(`
            id,
            score,
            created_at,
            test_id,
            tests (
              title,
              difficulty
            )
        `)
        .limit(1);

    if (error) {
        console.error("Query failed:", error);
    } else {
        console.log("Query succeeded! Found rows:", data.length);
        if (data.length > 0) {
            console.log("First row:", JSON.stringify(data[0], null, 2));
        }
    }
}
testFetch();
