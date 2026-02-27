import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixOrphanedQuestions() {
    console.log('\n=== Fixing Orphaned Questions ===\n');

    // Find all questions with test_id but no link in test_questions
    const { data: questions, error: qError } = await supabase
        .from('questions')
        .select('id, test_id, text, module, subject')
        .not('test_id', 'is', null);

    if (qError) {
        console.error('Error fetching questions:', qError);
        return;
    }

    console.log(`Found ${questions.length} questions with test_id\n`);

    let fixed = 0;
    let alreadyLinked = 0;
    let errors = 0;

    for (const question of questions) {
        // Check if already linked
        const { data: existing, error: checkError } = await supabase
            .from('test_questions')
            .select('*')
            .eq('question_id', question.id)
            .eq('test_id', question.test_id);

        if (checkError) {
            console.error(`Error checking question ${question.id}:`, checkError);
            errors++;
            continue;
        }

        if (existing && existing.length > 0) {
            alreadyLinked++;
            continue;
        }

        // Not linked - fix it!
        console.log(`Linking question ${question.id} to test ${question.test_id}...`);
        console.log(`  Text: "${question.text.substring(0, 50)}..."`);
        console.log(`  Module: ${question.module}, Subject: ${question.subject}`);

        // Get current max order for this test
        const { data: currentQuestions, error: orderError } = await supabase
            .from('test_questions')
            .select('order_index')
            .eq('test_id', question.test_id)
            .order('order_index', { ascending: false })
            .limit(1);

        if (orderError) {
            console.error(`  Error getting order:`, orderError);
            errors++;
            continue;
        }

        const nextOrder = (currentQuestions?.[0]?.order_index ?? -1) + 1;

        // Insert link
        const { error: linkError } = await supabase
            .from('test_questions')
            .insert({
                test_id: question.test_id,
                question_id: question.id,
                order_index: nextOrder
            });

        if (linkError) {
            console.error(`  ❌ Error linking:`, linkError);
            errors++;
        } else {
            console.log(`  ✅ Linked at order ${nextOrder}`);
            fixed++;
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total questions checked: ${questions.length}`);
    console.log(`Already linked: ${alreadyLinked}`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Errors: ${errors}`);
}

fixOrphanedQuestions()
    .then(() => {
        console.log('\n=== Fix Complete ===\n');
        process.exit(0);
    })
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
