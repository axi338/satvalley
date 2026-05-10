import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "d:/satvalley-main/backend/.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function audit() {
    const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("subject", "math")
        .ilike("module", "m2%");

    if (error) return console.error(error);

    data.forEach((q, i) => {
        const s = JSON.stringify(q).toLowerCase();
        if (s.includes("square")) {
            console.log(`MATCH [${i + 1}] ID: ${q.id}`);
            console.log(`Text: ${q.text}`);
            console.log(`Passage: ${q.passage}`);
            console.log(`Options: ${JSON.stringify(q.options)}`);
            console.log(`Explanation: ${q.explanation}`);
            console.log(`Skill: ${q.skill}`);
            console.log("---");
        }
    });
}

audit();
