import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTestConfig(testId) {
    console.log(`Checking config for test ID: ${testId}`);

    // 1. Check test sections
    const { data: test, error: testErr } = await supabase
        .from('tests')
        .select('id, title, sections')
        .eq('id', testId)
        .single();

    if (testErr) {
        console.error("Error fetching test:", testErr);
    } else {
        console.log("Test Sections:", test.sections);
    }

    // 2. Check question subjects
    const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('id, subject, module')
        .eq('test_id', testId);

    if (qErr) {
        console.error("Error fetching questions:", qErr);
    } else {
        console.log(`Total questions for test: ${questions.length}`);
        const subjectCounts = questions.reduce((acc, q) => {
            acc[q.subject] = (acc[q.subject] || 0) + 1;
            return acc;
        }, {});
        console.log("Subject distribution:", subjectCounts);

        const moduleCounts = questions.reduce((acc, q) => {
            acc[q.module] = (acc[q.module] || 0) + 1;
            return acc;
        }, {});
        console.log("Module distribution:", moduleCounts);
    }
}

const testId = "44d169d0-ec6b-443c-b722-8dd92adad631";
checkTestConfig(testId);
