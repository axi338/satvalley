import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';


dotenv.config();

// We need to bypass auth or use a token. 
// Since we are running locally, we can't easily generate a valid JWT for the middleware.
// However, we can use the Supabase client to inspect the data directly using the SAME logic as the server.

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function simulateApiLogic(testId, moduleParam, subjectParam) {
    console.log(`\n=== Simulating API Request ===`);
    console.log(`Parameters: testId=${testId}, module=${moduleParam}, subject=${subjectParam}`);

    // 1. Fetch from test_questions
    const { data: linkedQuestions, error: linkError } = await supabase
        .from("test_questions")
        .select(`
      order_index,
      questions (*)
    `)
        .eq("test_id", testId)
        .order("order_index", { ascending: true });

    if (linkError) {
        console.error('Database Error:', linkError);
        return;
    }

    // 2. Extract
    let questions = (linkedQuestions || [])
        .map(link => link.questions)
        .filter(q => q !== null);

    console.log(`Total questions linked: ${questions.length}`);

    // 3. Filter by Module
    const beforeModuleCount = questions.length;
    if (moduleParam) {
        questions = questions.filter(q => q.module === moduleParam);
    }
    console.log(`After module '${moduleParam}' filter: ${questions.length} (Dropped ${beforeModuleCount - questions.length})`);

    // 4. Filter by Subject
    const beforeSubjectCount = questions.length;
    if (subjectParam) {
        questions = questions.filter(q => q.subject === subjectParam);
    }
    console.log(`After subject '${subjectParam}' filter: ${questions.length} (Dropped ${beforeSubjectCount - questions.length})`);

    // 5. Inspect the dropped ones
    if (questions.length === 0 && beforeModuleCount > 0) {
        console.log('\n--- Why were they dropped? ---');
        const sample = (linkedQuestions || []).map(l => l.questions).filter(q => q).slice(0, 5);
        sample.forEach(q => {
            console.log(`ID: ${q.id} | Module: '${q.module}' | Subject: '${q.subject}'`);
            console.log(`   Matches Module '${moduleParam}'? ${q.module === moduleParam}`);
            console.log(`   Matches Subject '${subjectParam}'? ${q.subject === subjectParam}`);
        });
    }

    console.log(`\nFinal Result Count: ${questions.length}`);
}

const TEST_ID = '072de032-ea41-445c-8d2a-9580203beedc';
simulateApiLogic(TEST_ID, 'm1', 'math');
