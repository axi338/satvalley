import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "d:/satvalley-main/backend/.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function selectiveSearch() {
    const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("subject", "math");

    if (error) return console.error(error);

    const results = data.filter(q => {
        const s = JSON.stringify(q).toLowerCase();
        if (!s.includes("square")) return false;
        // Exclude the obvious ones
        if (s.includes("square centimeter")) return false;
        if (s.includes("square inch")) return false;
        if (s.includes("square meter")) return false;
        if (s.includes("square unit")) return false;
        if (s.includes("square feet")) return false;
        if (s.includes("square foot")) return false;
        return true;
    });

    console.log(`Found ${results.length} potentially problematic questions:`);
    results.forEach(q => {
        console.log(`ID: ${q.id}, Module: ${q.module}`);
        console.log(`Text: ${q.text}`);
        console.log(`Options: ${JSON.stringify(q.options)}`);
        console.log(`Passage: ${q.passage}`);
        console.log("---");
    });
}

selectiveSearch();
