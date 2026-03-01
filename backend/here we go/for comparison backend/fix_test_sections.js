import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixSections(testId) {
    console.log(`Fixing sections for test ID: ${testId}`);

    // Update sections to be Math Only
    const { error } = await supabase
        .from('tests')
        .update({
            sections: ['Math: 58Q'],
            mathq: '58',
            readingq: '0',
            writingq: '0'
        })
        .eq('id', testId);

    if (error) {
        console.error("Error updating test:", error);
    } else {
        console.log("Successfully updated test to Math Only.");
    }
}

const testId = "44d169d0-ec6b-443c-b722-8dd92adad631";
fixSections(testId);
