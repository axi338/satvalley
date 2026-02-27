import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listAllTestsWithCounts() {
    console.log(`\n=== All Tests Question Counts ===\n`);

    // 1. Get All Tests
    const { data: tests, error: testError } = await supabase
        .from('tests')
        .select('id, title, created_at')
        .order('created_at', { ascending: false });

    if (testError) {
        console.error('Error fetching tests:', testError);
        return;
    }

    console.log(`Found ${tests.length} tests.\n`);

    for (const test of tests) {
        // 2. Count Linked Questions
        const { count, error: countError } = await supabase
            .from('test_questions')
            .select('*', { count: 'exact', head: true })
            .eq('test_id', test.id);

        if (countError) {
            console.error(`Error counting for test ${test.id}:`, countError);
            continue;
        }

        // 3. Check for Orphaned Questions (Raw questions table)
        const { count: rawCount, error: rawError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('test_id', test.id);

        // Calculate unlinked
        // Note: This is an approximation since test_questions is the source of truth for the test.
        // questions.test_id is the "origin" or "owner" but linking is M:N via test_questions.
        // However, in this system, it seems 1:N usage pattern.

        console.log(`[${test.title}]`);
        console.log(`   ID: ${test.id}`);

        console.log(`   Linked Questions: ${count}`);
        console.log(`   Raw Questions (test_id): ${rawCount}`);
        if (rawCount > 0 && count === 0) {
            console.log(`   ⚠️ WARNING: Has raw questions but ZERO linked! Possible orphan issue again?`);
        } else if (count > 0 && count < 10) {
            console.log(`   ⚠️ WARNING: Very few questions (${count}).`);
        } else if (count === 0) {
            console.log(`   ⚠️ WARNING: EMPTY TEST.`);
        }
        console.log('');
    }
}

listAllTestsWithCounts()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
