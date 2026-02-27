import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking last 5 import jobs...");
    const { data: jobs } = await supabase.from('import_jobs').select('*').order('created_at', { ascending: false }).limit(5);
    console.table(jobs?.map(j => ({ id: j.id, status: j.status, filename: j.filename, test_id: j.destination_test_id, config: JSON.stringify(j.config) })));

    if (jobs && jobs.length > 0) {
        const lastJobId = jobs[0].id;
        console.log(`Checking candidates for latest job: ${lastJobId}`);
        const { data: candidates } = await supabase.from('import_candidates').select('*').eq('job_id', lastJobId);
        console.log(`Found ${candidates?.length || 0} candidates.`);

        if (candidates && candidates.length > 0) {
            console.log("Sample candidate question_id:", candidates[0].question_id);
            const { data: question } = await supabase.from('questions').select('*').eq('id', candidates[0].question_id).single();
            console.log("Sample question text:", question?.text?.slice(0, 100));
        }
    }
}

check();
