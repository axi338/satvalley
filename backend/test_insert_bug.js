import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testInsert() {
    // 1. Create a dummy job first
    const { data: job, error: jobError } = await supabase
        .from('import_jobs')
        .insert({
            filename: 'debug-insert.pdf',
            status: 'queued',
            admin_id: '6d936443-7667-4b2b-ae92-d2ce219a2f23', // From logs
            config: { testType: 'sat-math' }
        })
        .select()
        .single();

    if (jobError) {
        console.error("Failed to create job:", jobError);
        return;
    }
    console.log("Job created:", job.id);

    // 2. Try to insert a question
    const qPayload = {
        text: "Test Question from Debugger",
        answer: "A",
        test_id: job.destination_test_id || null,
        passage: null,
        image_url: null,
        options: ["A", "B", "C", "D"],
        type: 'multiple-choice',
        module: 'm1',
        subject: 'math',
        explanation: "Debug explanation",
        difficulty: "medium",
        tags: ["debug"]
    };

    console.log("Attempting question insert...");
    const { data: qData, error: qError } = await supabase
        .from("questions")
        .insert(qPayload)
        .select()
        .single();

    if (qError) {
        console.error("Question Insert Error:", JSON.stringify(qError, null, 2));
    } else {
        console.log("Question Insert Success:", qData.id);

        // 3. Try to insert a candidate
        console.log("Attempting candidate insert...");
        const { data: cData, error: cError } = await supabase
            .from("import_candidates")
            .insert({
                job_id: job.id,
                raw_text: "Raw text for debug question",
                normalized_json: qPayload,
                status: 'review_required',
                question_id: qData.id
            })
            .select()
            .single();

        if (cError) {
            console.error("Candidate Insert Error:", JSON.stringify(cError, null, 2));
        } else {
            console.log("Candidate Insert Success:", cData.id);
        }
    }
}

testInsert();
