import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("--- Database Diagnostics ---");

    const tables = [
        "questions",
        "test_questions",
        "tests",
        "import_candidates",
        "import_jobs"
    ];

    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.log(`Table ${table}: Error - ${error.message}`);
        } else {
            console.log(`Table ${table}: ${count} rows`);
        }
    }

    console.log("\n--- Recent Questions ---");
    const { data: recentQs, error: qError } = await supabase
        .from("questions")
        .select("id, text, module, subject, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

    if (qError) {
        console.log("Error fetching recent questions:", qError.message);
    } else {
        console.log("Recent questions:", JSON.stringify(recentQs, null, 2));
    }

    console.log("\n--- Recent Tests ---");
    const { data: recentTests, error: tError } = await supabase
        .from("tests")
        .select("id, title, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

    if (tError) {
        console.log("Error fetching recent tests:", tError.message);
    } else {
        console.log("Recent tests:", JSON.stringify(recentTests, null, 2));
    }
}

diagnose().catch(console.error);
