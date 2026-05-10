import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "d:/satvalley-main/backend/.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listM2Math() {
    const testId = 'eb0a9cac-1a47-4da5-8d3e-6a32af220e7e';
    const { data, error } = await supabase
        .from("test_questions")
        .select("order_index, questions(*)")
        .eq("test_id", testId)
        .order("order_index", { ascending: true });

    if (error) return console.error(error);

    const m2Math = data
        .filter(tq => tq.questions && tq.questions.subject === "math" && (tq.questions.module || "").startsWith("m2"))
        .sort((a, b) => a.order_index - b.order_index);

    console.log(`M2 Math Questions for Test ${testId}:`);
    m2Math.forEach((tq, idx) => {
        console.log(`[${idx + 1}] (Order: ${tq.order_index}) ID: ${tq.questions.id}`);
        console.log(`Text: ${tq.questions.text.substring(0, 100)}`);
        console.log(`Options: ${JSON.stringify(tq.questions.options)}`);
        console.log("---");
    });
}

listM2Math();
