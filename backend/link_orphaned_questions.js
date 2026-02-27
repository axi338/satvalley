import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_ID = "bace2493-5595-4b09-ad00-1676f2208d8a"; // Official Practice Test 1

async function fix() {
    console.log("--- Linking Orphaned Questions ---");

    // 1. Find orphaned questions
    const { data: linkedIds } = await supabase.from('test_questions').select('question_id');
    const linkedSet = new Set(linkedIds.map(l => l.question_id));

    const { data: allQs } = await supabase.from('questions').select('id, text, answer');
    const orphaned = allQs.filter(q => !linkedSet.has(q.id));

    console.log(`Found ${orphaned.length} orphaned questions.`);
    if (orphaned.length === 0) return;

    // 2. Map to test_questions format
    // Get current max index
    const { data: currentLinks } = await supabase
        .from('test_questions')
        .select('order_index')
        .eq('test_id', TEST_ID)
        .order('order_index', { ascending: false })
        .limit(1);

    let startIndex = (currentLinks?.[0]?.order_index || 0) + 1;

    const linksToInsert = orphaned.map((q, i) => ({
        test_id: TEST_ID,
        question_id: q.id,
        order_index: startIndex + i
    }));

    // 3. Insert links
    const { error: insertError } = await supabase
        .from('test_questions')
        .insert(linksToInsert);

    if (insertError) {
        console.error("Error inserting links:", insertError.message);
    } else {
        console.log(`Successfully linked ${linksToInsert.length} questions to test ${TEST_ID}`);
    }

    // 4. Recalculate Metadata (similar to server.js logic)
    const { data: questions } = await supabase
        .from("test_questions")
        .select(`
            questions (
                subject
            )
        `)
        .eq("test_id", TEST_ID);

    const questionsData = questions.map(l => l.questions).filter(q => q);
    const mathCount = questionsData.filter(q => q.subject === 'math').length;
    const rwCount = questionsData.filter(q => ['reading', 'writing', 'rw'].includes(q.subject)).length;

    const newSections = [];
    if (mathCount > 0) newSections.push(`Math: ${mathCount}Q`);
    if (rwCount > 0) newSections.push(`Reading & Writing: ${rwCount}Q`);

    await supabase
        .from("tests")
        .update({
            sections: newSections,
            mathq: String(mathCount),
            readingq: String(rwCount),
            updated_at: new Date().toISOString()
        })
        .eq("id", TEST_ID);

    console.log(`Updated test metadata: Math=${mathCount}, RW=${rwCount}`);
}

fix().catch(console.error);
