import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncTestMetadata() {
    console.log(`\n=== Syncing Test Metadata ===\n`);

    // 1. Get All Tests
    const { data: tests, error: testError } = await supabase
        .from('tests')
        .select('id, title, sections, mathq, readingq, writingq');

    if (testError) {
        console.error('Error fetching tests:', testError);
        return;
    }

    console.log(`Found ${tests.length} tests to sync.`);

    for (const test of tests) {
        console.log(`\nProcessing: ${test.title} (${test.id})`);

        // 2. Fetch linked questions to count them
        const { data: linkedQuestions, error: linkError } = await supabase
            .from('test_questions')
            .select(`
        questions (
          subject,
          module
        )
      `)
            .eq('test_id', test.id);

        if (linkError) {
            console.error('Error fetching linked questions:', linkError);
            continue;
        }

        const questions = linkedQuestions
            .map(l => l.questions)
            .filter(q => q);

        const mathCount = questions.filter(q => q.subject === 'math').length;
        const rwCount = questions.filter(q => q.subject === 'reading' || q.subject === 'writing' || q.subject === 'rw').length;
        // Granular counts if needed
        const readingCount = questions.filter(q => q.subject === 'reading').length; // usually 'rw' covers both in recent schema
        const writingCount = questions.filter(q => q.subject === 'writing').length;
        // Note: recent schema seems to use 'rw' for both.

        console.log(`   Actual Counts -> Math: ${mathCount}, RW: ${rwCount}`);

        // 3. Construct new sections array
        const newSections = [];
        if (mathCount > 0) newSections.push(`Math: ${mathCount}Q`);
        if (rwCount > 0) newSections.push(`Reading & Writing: ${rwCount}Q`);

        // Fallback? If both 0, maybe keep it empty or say 'Empty: 0Q'
        if (newSections.length === 0) {
            newSections.push('Empty: 0Q');
        }

        console.log(`   New Sections:`, newSections);

        // 4. Update the test
        // For readingq/writingq, if subject is 'rw', we usually split them or just dump total into readingq?
        // The previous values were integers in string format.

        // Let's assume 'rw' questions count towards readingq for now, or split evenly?
        // Actually, `TestSessionPage` sums them: `(parseInt(readingq) || 0) + (parseInt(writingq) || 0)`
        // So putting total RW count into readingq is safe.

        const updates = {
            sections: newSections,
            mathq: String(mathCount),
            readingq: String(rwCount),
            writingq: "0", // Clear writingq if we put everything in readingq
            updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
            .from('tests')
            .update(updates)
            .eq('id', test.id);

        if (updateError) {
            console.error('   ❌ Error updating test:', updateError);
        } else {
            console.log('   ✅ Metadata updated successfully.');
        }
    }
}

syncTestMetadata()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
