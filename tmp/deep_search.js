import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "d:/satvalley-main/backend/.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deepSearch() {
    const { data, error } = await supabase
        .from("questions")
        .select("*")
        .ilike("module", "m2%");

    if (error) return console.error(error);

    const results = data.filter(q => {
        const s = JSON.stringify(q).toLowerCase();
        return s.includes("square");
    });

    console.log(`Found ${results.length} results:`);
    results.forEach(q => {
        console.log(`ID: ${q.id}, Text: ${q.text.substring(0, 100)}`);
        console.log(`Options: ${JSON.stringify(q.options)}`);
        console.log("---");
    });
}

deepSearch();
