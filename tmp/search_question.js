import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "d:/satvalley-main/backend/.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findQuestion() {
    const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("subject", "math")
        .ilike("module", "m2%");

    if (error) {
        console.error("Error fetching questions:", error);
        return;
    }

    console.log(`Found ${data.length} M2 Math questions.`);

    // Sorting them to simulate order (assuming they are ordered by created_at or some other way)
    const sorted = data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    sorted.forEach((q, index) => {
        console.log(`[${index + 1}] ID: ${q.id}, Text: ${q.text.substring(0, 100)}...`);
    });
}

findQuestion();
