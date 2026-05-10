import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "d:/satvalley-main/backend/.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function find21st() {
    // Get all tests
    const { data: tests, error: testError } = await supabase.from("tests").select("id, title");
    if (testError) return console.error(testError);

    for (const test of tests) {
        const { data: tqs, error: tqError } = await supabase
            .from("test_questions")
            .select("question_id, order_index, questions(*)")
            .eq("test_id", test.id)
            .order("order_index", { ascending: true });

        if (tqError) continue;

        const m2Math = tqs
            .filter(tq => tq.questions && tq.questions.subject === "math" && (tq.questions.module || "").startsWith("m2"))
            .sort((a, b) => a.order_index - b.order_index);

        if (m2Math.length >= 21) {
            const q = m2Math[20].questions;
            console.log(`Test: ${test.title} (ID: ${test.id})`);
            console.log(`21st M2 Math Question ID: ${q.id}`);
            console.log(`Text: ${q.text.substring(0, 200)}`);
            console.log(`Options: ${JSON.stringify(q.options)}`);
            console.log("---");
        }
    }
}

find21st();
