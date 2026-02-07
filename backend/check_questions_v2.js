import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching questions:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Columns in 'questions':", Object.keys(data[0]));
        console.log("Example question data:", data[0]);
    } else {
        // If no data, try to get column names via select('count') or just RPC if enabled, 
        // but usually select('*').limit(1) is enough to see columns if at least one row exists.
        // If no row exists, we might need a different approach.
        console.log("No rows in 'questions' table to inspect columns.");
    }
}

checkSchema();
