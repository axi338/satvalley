import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "d:/satvalley-main/backend/.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findQuestion() {
    const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("subject", "math")
        .ilike("module", "m2%")
        .ilike("text", "%square%");

    if (error) {
        console.error("Error fetching questions:", error);
        return;
    }

    console.log(`Matching questions in M2:`);
    data.forEach(q => {
        console.log(`ID: ${q.id}, Text: ${q.text}`);
    });
}

findQuestion();
