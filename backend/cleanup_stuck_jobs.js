import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanupStuckJobs() {
    console.log('--- SATValley Admin Cleanup: Stuck Jobs ---');

    // Find jobs that have been in progress for a long time or have no active server session
    // For simplicity, we'll find all jobs in 'extracting', 'candidate_split', or 'normalizing'
    // and move them to 'failed' with a message.

    const { data: stuckJobs, error: fetchError } = await supabase
        .from('import_jobs')
        .select('id, filename, status, created_at')
        .in('status', ['extracting', 'candidate_split', 'normalizing']);

    if (fetchError) {
        console.error('Failed to fetch stuck jobs:', fetchError);
        return;
    }

    if (!stuckJobs || stuckJobs.length === 0) {
        console.log('No stuck jobs found.');
        return;
    }

    console.log(`Found ${stuckJobs.length} stuck jobs. Resetting to 'failed'...`);

    for (const job of stuckJobs) {
        const { error: updateError } = await supabase
            .from('import_jobs')
            .update({
                status: 'failed',
                error_message: 'Job was interrupted (server restart or crash). Please delete and try again.'
            })
            .eq('id', job.id);

        if (updateError) {
            console.error(`Failed to update job ${job.id}:`, updateError);
        } else {
            console.log(`Successfully reset job: ${job.filename} (${job.id})`);
        }
    }

    console.log('--- Cleanup Complete ---');
}

cleanupStuckJobs();
