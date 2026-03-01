import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectSections() {
    console.log(`\n=== Inspecting Test Sections ===\n`);

    const { data: tests, error } = await supabase
        .from('tests')
        .select('id, title, sections, mathq, readingq, writingq');

    if (error) {
        console.error('Error selecting:', error);
        return;
    }

    tests.forEach(test => {
        console.log(`[${test.title}]`);
        console.log(`   ID: ${test.id}`);
        console.log(`   Sections:`, test.sections);
        console.log(`   MathQ: ${test.mathq}, ReadingQ: ${test.readingq}, WritingQ: ${test.writingq}`);
        console.log('');
    });
}

inspectSections()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
