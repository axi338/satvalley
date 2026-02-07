import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugTest(testId) {
    console.log(`Debugging test ID: ${testId}`);

    // 1. Check test_questions
    const { data: links, error: linkErr } = await supabase
        .from('test_questions')
        .select('question_id, order_index')
        .eq('test_id', testId);

    if (linkErr) {
        console.error("Error fetching test_questions:", linkErr);
    } else {
        console.log(`Found ${links.length} links in test_questions.`);
    }

    // 2. Check questions table
    const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('id, text, test_id, module, subject')
        .eq('test_id', testId);

    if (qErr) {
        console.error("Error fetching questions:", qErr);
    } else {
        console.log(`Found ${questions.length} rows in 'questions' table with test_id = ${testId}`);
        if (questions.length > 0) {
            const modules = [...new Set(questions.map(q => q.module))];
            const subjects = [...new Set(questions.map(q => q.subject))];
            console.log("Modules found:", modules);
            console.log("Subjects found:", subjects);
        }
    }

    // 3. Detailed check of the first few linked questions
    if (links && links.length > 0) {
        const qIds = links.slice(0, 5).map(l => l.question_id);
        const { data: linkedQuestions, error: lqErr } = await supabase
            .from('questions')
            .select('id, text, test_id, module, subject')
            .in('id', qIds);

        if (lqErr) {
            console.error("Error fetching linked questions:", lqErr);
        } else {
            console.log("\nSample linked questions from 'test_questions':");
            linkedQuestions.forEach(q => {
                console.log(`- ID: ${q.id}, test_id: ${q.test_id}, module: ${q.module}, subject: ${q.subject}`);
            });
        }
    }
}

const testId = "44d169d0-ec6b-443c-b722-8dd92adad631";
debugTest(testId);
