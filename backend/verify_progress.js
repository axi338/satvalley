import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
    console.log("Creating dummy job...");
    const { data: job, error: jobError } = await supabase
        .from('import_jobs')
        .insert({
            filename: 'test-verification.pdf',
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

    console.log(`Job created: ${job.id}`);

    const reportProgress = async (status, configUpdates = {}) => {
        const { data: currentJob } = await supabase
            .from("import_jobs")
            .select("config")
            .eq("id", job.id)
            .single();

        await supabase
            .from("import_jobs")
            .update({
                status,
                config: { ...(currentJob?.config || {}), ...configUpdates }
            })
            .eq("id", job.id);
        console.log(`Status -> ${status} | Message: ${configUpdates.progress_message || 'N/A'}`);
    };

    console.log("Simulating process...");
    await reportProgress('candidate_split', { progress_message: 'Analyzing PDF...' });
    await new Promise(r => setTimeout(r, 1000));
    await reportProgress('candidate_split', { progress_message: 'Rate limiting: waiting 1s...' });
    await new Promise(r => setTimeout(r, 1000));

    await reportProgress('normalizing', {
        total_candidates: 2,
        processed_candidates: 0,
        progress_message: 'Extracted 2 candidates. Starting...'
    });

    await new Promise(r => setTimeout(r, 1000));
    await reportProgress('normalizing', {
        processed_candidates: 1,
        progress_message: 'Normalized 1/2 questions...'
    });

    await new Promise(r => setTimeout(r, 1000));
    await reportProgress('normalizing', {
        processed_candidates: 2,
        progress_message: 'Normalized 2/2 questions...'
    });

    await reportProgress('review_required', { progress_message: 'Complete!' });

    console.log("Verification finished. Checking final state...");
    const { data: finalJob } = await supabase.from('import_jobs').select('*').eq('id', job.id).single();
    console.log("Final Job state:", JSON.stringify(finalJob, null, 2));

    // Cleanup
    // await supabase.from('import_jobs').delete().eq('id', job.id);
    console.log("Left job in review_required for manual inspection if needed.");
}

verify();
