import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function countEverything() {
    const { count: totalQuestions, error: qError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

    const { count: totalTests, error: tError } = await supabase
        .from('tests')
        .select('*', { count: 'exact', head: true });

    const { count: linkedCount, error: lError } = await supabase
        .from('test_questions')
        .select('*', { count: 'exact', head: true });

    console.log(`Total Questions: ${totalQuestions}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Total Links (test_questions): ${linkedCount}`);

    // Check for orphaned questions (not in test_questions)
    const { data: links } = await supabase.from('test_questions').select('question_id');
    const linkedIds = new Set(links.map(l => l.question_id));

    const { data: allQs } = await supabase.from('questions').select('id');
    const orphaned = allQs.filter(q => !linkedIds.has(q.id));

    console.log(`Orphaned Questions: ${orphaned.length}`);
}

countEverything();
