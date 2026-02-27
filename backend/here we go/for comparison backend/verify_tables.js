
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkTables() {
    console.log("Checking vocabulary_sets table...");
    const { data, error } = await supabase
        .from("vocabulary_sets")
        .select("count", { count: "exact", head: true });

    if (error) {
        console.error("Error accessing vocabulary_sets:", error);
    } else {
        console.log("vocabulary_sets table exists. Row count:", data); // data is null for head:true usually, count is in data or count
    }

    console.log("Checking vocabulary_words table...");
    const { data: wordsData, error: wordsError } = await supabase
        .from("vocabulary_words")
        .select("count", { count: "exact", head: true });

    if (wordsError) {
        console.error("Error accessing vocabulary_words:", wordsError);
    } else {
        console.log("vocabulary_words table exists.");
    }
}

checkTables();
