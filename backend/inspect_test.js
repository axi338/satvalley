import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectTestQuestions(testId) {
    console.log(`\n=== Inspecting Test: ${testId} ===\n`);

    // 1. Get Test Details
    const { data: test, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

    if (testError) {
        console.error('Error fetching test:', testError);
        return;
    }
    console.log(`Test Title: ${test.title}`);
    console.log(`Test Type: ${test.test_type}`);

    // 2. Get Linked Questions
    const { data: tqs, error: tqError } = await supabase
        .from('test_questions')
        .select(`
      question_id,
      order_index,
      questions (
        id,
        text,
        module,
        subject,
        difficulty
      )
    `)
        .eq('test_id', testId)
        .order('order_index', { ascending: true });

    if (tqError) {
        console.error('Error fetching test_questions:', tqError);
        return;
    }

    console.log(`\nTotal Linked Questions: ${tqs.length}`);

    // Group by Module
    const modules = {};
    tqs.forEach(tq => {
        const q = tq.questions;
        if (!q) return;
        const key = `${q.subject || 'unknown'}-${q.module || 'unknown'}`;
        if (!modules[key]) modules[key] = [];
        modules[key].push({
            order: tq.order_index,
            id: q.id,
            text: q.text.substring(0, 30) + '...',
            difficulty: q.difficulty
        });
    });

    Object.keys(modules).forEach(mod => {
        console.log(`\n--- Module: ${mod} (${modules[mod].length} questions) ---`);
        modules[mod].forEach(q => {
            console.log(`  [${q.order}] ${q.text} (${q.difficulty})`);
        });
    });

    // 3. Check for gaps or duplicates in order
    console.log('\n--- Order Check ---');
    let prevOrder = -1;
    let gaps = 0;
    tqs.forEach(tq => {
        if (tq.order_index !== prevOrder + 1) {
            console.log(`  ⚠️ Gap/Jump: ${prevOrder} -> ${tq.order_index}`);
            gaps++;
        }
        prevOrder = tq.order_index;
    });
    if (gaps === 0) console.log('  ✅ Order indices are sequential');

}

const targetTestId = '44d169d0-ec6b-443c-b722-8dd92adad631';
inspectTestQuestions(targetTestId)
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
