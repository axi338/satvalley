import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function repairTest(testId) {
    console.log(`Repairing test ID: ${testId}`);

    // 1. Get all linked question IDs
    const { data: links, error: linkErr } = await supabase
        .from('test_questions')
        .select('question_id, order_index')
        .eq('test_id', testId)
        .order('order_index', { ascending: true });

    if (linkErr) {
        console.error("Error fetching test_questions:", linkErr);
        return;
    }

    if (!links || links.length === 0) {
        console.log("No links found for this test.");
        return;
    }

    const qIds = links.map(l => l.question_id);
    console.log(`Found ${qIds.length} linked questions.`);

    // 2. Update test_id for all these questions
    const { error: updateErr } = await supabase
        .from('questions')
        .update({ test_id: testId })
        .in('id', qIds);

    if (updateErr) {
        console.error("Error updating questions.test_id:", updateErr);
    } else {
        console.log("Successfully updated 'test_id' for all linked questions.");
    }

    // 3. Optional: Distribute modules if they are all 'm1' or null
    const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('id, module')
        .in('id', qIds);

    if (qErr) {
        console.error("Error fetching question modules:", qErr);
        return;
    }

    const m1Count = questions.filter(q => q.module === 'm1' || !q.module).length;
    if (m1Count === qIds.length) {
        console.log("All questions are currently M1. Distributing into M1 and M2 for testing...");
        // Split into 3 parts: M1, M2-easy, M2-hard
        const total = qIds.length;
        const m1Limit = Math.ceil(total / 2);
        const m2Others = total - m1Limit;
        const m2EasyLimit = Math.ceil(m2Others / 2);

        for (let i = 0; i < total; i++) {
            let mod = 'm1';
            if (i >= m1Limit) {
                if (i < m1Limit + m2EasyLimit) mod = 'm2-easy';
                else mod = 'm2-hard';
            }
            await supabase.from('questions').update({ module: mod }).eq('id', qIds[i]);
        }
        console.log(`Distributed: ${m1Limit} in M1, ${m2EasyLimit} in M2-easy, ${total - m1Limit - m2EasyLimit} in M2-hard.`);
    }
}

const testId = "44d169d0-ec6b-443c-b722-8dd92adad631";
repairTest(testId);
