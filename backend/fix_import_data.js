import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runFix() {
    console.log("--- Starting Data Fix Script ---");

    // 1. Fix Status Mismatch
    console.log("Fixing 'completed' -> 'done' status mismatch...");
    const { data: jobRes, error: jobErr } = await supabase
        .from('import_jobs')
        .update({ status: 'done' })
        .eq('status', 'completed')
        .select();

    if (jobErr) {
        console.error("Error updating jobs:", jobErr);
    } else {
        console.log(`Updated ${jobRes?.length || 0} jobs to 'done' status.`);
    }

    // 2. Fix Missing Question IDs for Approved Candidates
    console.log("\nAttempting to link approved candidates to questions...");

    // We'll look for approved candidates without a question_id
    const { data: candidates, error: candErr } = await supabase
        .from('import_candidates')
        .select('id, job_id, normalized_json')
        .eq('status', 'approved')
        .is('question_id', null);

    if (candErr) {
        console.error("Error fetching candidates:", candErr);
    } else if (candidates) {
        console.log(`Found ${candidates.length} approved candidates without question_id.`);

        for (const cand of candidates) {
            // High-confidence heuristic: Match by raw text snippet or job_id + content
            // For now, let's try matching by the exact text from normalized_json
            const text = cand.normalized_json?.text;
            if (!text) continue;

            const { data: questions, error: qErr } = await supabase
                .from('questions')
                .select('id')
                .eq('text', text)
                .limit(1);

            if (questions && questions.length > 0) {
                const qId = questions[0].id;
                await supabase
                    .from('import_candidates')
                    .update({ question_id: qId })
                    .eq('id', cand.id);
                console.log(`Linked Candidate ${cand.id} to Question ${qId}`);
            }
        }
    }

    console.log("\n--- Fix Script Complete ---");
}

runFix().catch(console.error);
