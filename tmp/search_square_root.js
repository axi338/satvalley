import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "d:/satvalley-main/backend/.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function searchSquareRoot() {
    const { data, error } = await supabase
        .from("questions")
        .select("*")
        .ilike("text", "%square%");

    if (error) return console.error(error);

    console.log(`Found ${data.length} matches for 'square':`);
    data.forEach(q => {
        console.log(`ID: ${q.id}, Module: ${q.module}, Subject: ${q.subject}`);
        console.log(`Text: ${q.text}`);
        console.log("---");
    });
}

searchSquareRoot();
