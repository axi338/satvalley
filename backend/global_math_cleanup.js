
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanup() {
    console.log("Starting global math cleanup...");

    // 1. Fetch ALL questions
    const { data: questions, error } = await supabase.from('questions').select('*');
    if (error) {
        console.error("Failed to fetch questions:", error);
        return;
    }

    console.log(`Auditing ${questions.length} questions...`);

    let totalChanged = 0;

    for (const q of questions) {
        let changed = false;

        const cleanStr = (str) => {
            if (!str) return str;
            let newStr = str;

            // Pattern 1: Strip $ that are not part of a closed block
            // We use the same logic as our new MathText parser
            let result = "";
            let i = 0;
            let hasStray = false;

            while (i < newStr.length) {
                if (newStr.substr(i, 2) === '$$') {
                    const next = newStr.indexOf('$$', i + 2);
                    if (next !== -1) {
                        result += newStr.substring(i, next + 2);
                        i = next + 2;
                        continue;
                    }
                }

                if (newStr[i] === '$') {
                    const next = newStr.indexOf('$', i + 1);
                    if (next !== -1 && newStr[next + 1] !== '$') {
                        const content = newStr.substring(i + 1, next);
                        // Heuristic: If it has more than 1 space AND doesn't look like complex LaTeX, it's probably NOT math.
                        // Complex LaTeX usually has \ or ^ or _.
                        const spaceCount = (content.match(/ /g) || []).length;
                        const hasMathChars = /[\\^_]/.test(content);
                        const isLikelyPlain = spaceCount > 1 && !hasMathChars;

                        if (isLikelyPlain) {
                            // Stray $ at the beginning, we'll keep the content but skip the opening $
                            hasStray = true;
                            i++;
                            continue;
                        } else {
                            // Legitimate closed block
                            result += newStr.substring(i, next + 1);
                            i = next + 1;
                            continue;
                        }
                    } else {
                        // Stray $
                        hasStray = true;
                        i++;
                        continue;
                    }
                }

                result += newStr[i];
                i++;
            }

            if (hasStray) {
                changed = true;
                return result;
            }
            return str;
        };

        const cleanedText = cleanStr(q.text);
        const cleanedPassage = cleanStr(q.passage);
        const cleanedOptions = q.options ? q.options.map(o => cleanStr(o)) : q.options;

        // Final polish for hyphenated words that might still have $ or weird spaces
        // Actually the cleanStr above should handle most stray $

        if (cleanedText !== q.text || cleanedPassage !== q.passage || JSON.stringify(cleanedOptions) !== JSON.stringify(q.options)) {
            console.log(`Updating Question ${q.id} (Test: ${q.test_id})`);
            const { error: updError } = await supabase.from('questions').update({
                text: cleanedText,
                passage: cleanedPassage,
                options: cleanedOptions
            }).eq('id', q.id);

            if (updError) console.error(`Error updating ${q.id}:`, updError);
            else totalChanged++;
        }
    }

    console.log(`Cleanup complete. Updated ${totalChanged} questions.`);
}

cleanup();
