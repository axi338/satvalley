import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "d:/satvalley-main/backend/.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findQuestionDetail() {
    console.log("Searching for M2 questions that might have 'square' written literally...");

    const { data: questions, error } = await supabase
        .from("questions")
        .select("*")
        .ilike("module", "m2%")
        .eq("subject", "math");

    if (error) {
        console.error("Error:", error);
        return;
    }

    const suspicious = questions.filter(q => {
        const content = JSON.stringify(q).toLowerCase();
        // We are looking for the word "square" used as a substitution for a symbol
        return content.includes("square") || content.includes("sqrt");
    });

    console.log(`Found ${suspicious.length} suspicious questions.`);
    suspicious.forEach(q => {
        console.log(`ID: ${q.id}`);
        console.log(`Module: ${q.module}`);
        console.log(`Text: ${q.text}`);
        console.log(`Options: ${JSON.stringify(q.options)}`);
        console.log("---");
    });
}

findQuestionDetail();
