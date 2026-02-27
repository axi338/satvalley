import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkApprovedQuestions() {
    console.log('\n=== Checking Approved Questions ===\n');

    // 1. Get recent import jobs
    const { data: jobs, error: jobError } = await supabase
        .from('import_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (jobError) {
        console.error('Error fetching jobs:', jobError);
        return;
    }

    console.log(`Found ${jobs.length} recent import jobs:\n`);
    jobs.forEach((job, i) => {
        console.log(`${i + 1}. Job ID: ${job.id}`);
        console.log(`   Filename: ${job.filename}`);
        console.log(`   Status: ${job.status}`);
        console.log(`   Destination Test: ${job.destination_test_id || 'None'}`);
        console.log(`   Config: ${JSON.stringify(job.config)}`);
        console.log('');
    });

    // 2. For each job, check candidates
    for (const job of jobs) {
        console.log(`\n--- Job ${job.id}: ${job.filename} ---`);

        const { data: candidates, error: candError } = await supabase
            .from('import_candidates')
            .select('*')
            .eq('job_id', job.id);

        if (candError) {
            console.error('Error fetching candidates:', candError);
            continue;
        }

        console.log(`Total candidates: ${candidates.length}`);
        const approved = candidates.filter(c => c.status === 'approved');
        const pending = candidates.filter(c => c.status === 'review_required');
        const rejected = candidates.filter(c => c.status === 'rejected');

        console.log(`  - Approved: ${approved.length}`);
        console.log(`  - Pending: ${pending.length}`);
        console.log(`  - Rejected: ${rejected.length}`);

        // 3. For approved candidates, check if questions were created
        if (approved.length > 0) {
            console.log('\n  Checking if approved questions were inserted...');

            for (const candidate of approved) {
                const questionData = candidate.normalized_json;
                const questionText = questionData?.text?.substring(0, 50) || 'No text';

                // Try to find this question in the questions table
                const { data: questions, error: qError } = await supabase
                    .from('questions')
                    .select('id, text, test_id, module, subject')
                    .ilike('text', `${questionText}%`);

                if (qError) {
                    console.error('    Error searching questions:', qError);
                } else if (questions && questions.length > 0) {
                    console.log(`    ✅ Found question: ID ${questions[0].id}`);
                    console.log(`       Test ID: ${questions[0].test_id}`);
                    console.log(`       Module: ${questions[0].module}`);
                    console.log(`       Subject: ${questions[0].subject}`);

                    // Check if linked to test
                    if (questions[0].test_id) {
                        const { data: link, error: linkError } = await supabase
                            .from('test_questions')
                            .select('*')
                            .eq('question_id', questions[0].id)
                            .eq('test_id', questions[0].test_id);

                        if (linkError) {
                            console.error('       Error checking link:', linkError);
                        } else if (link && link.length > 0) {
                            console.log(`       ✅ Linked to test via test_questions`);
                        } else {
                            console.log(`       ❌ NOT linked via test_questions!`);
                        }
                    }
                } else {
                    console.log(`    ❌ Question NOT found in database!`);
                    console.log(`       Candidate ID: ${candidate.id}`);
                    console.log(`       Question text: "${questionText}..."`);
                }
            }
        }

        // 4. If job has destination_test_id, check test_questions
        if (job.destination_test_id) {
            console.log(`\n  Checking test ${job.destination_test_id}...`);

            const { data: testQuestions, error: tqError } = await supabase
                .from('test_questions')
                .select('question_id, questions(text, module, subject)')
                .eq('test_id', job.destination_test_id);

            if (tqError) {
                console.error('    Error fetching test questions:', tqError);
            } else {
                console.log(`    Total questions in test: ${testQuestions?.length || 0}`);

                if (testQuestions && testQuestions.length > 0) {
                    const config = job.config || {};
                    const targetModule = config.module;
                    const targetSubject = config.subject;

                    if (targetModule && targetSubject) {
                        const matching = testQuestions.filter(tq => {
                            const q = tq.questions;
                            return q && q.module === targetModule && q.subject === targetSubject;
                        });
                        console.log(`    Questions in ${targetModule}_${targetSubject}: ${matching.length}`);
                    }
                }
            }
        }
    }
}

checkApprovedQuestions()
    .then(() => {
        console.log('\n=== Check Complete ===\n');
        process.exit(0);
    })
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
