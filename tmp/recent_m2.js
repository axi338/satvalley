import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "d:/satvalley-main/backend/.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function recentM2() {
    const { data, error } = await supabase
        .from("questions")
        .select("*")
        .ilike("module", "m2%")
        .eq("subject", "math")
        .order("updated_at", { ascending: false })
        .limit(10);

    if (error) return console.error(error);

    console.log("Recently updated M2 Math questions:");
    data.forEach(q => {
        console.log(`ID: ${q.id}, Updated: ${q.updated_at}`);
        console.log(`Text: ${q.text}`);
        console.log("---");
    });
}

recentM2();
