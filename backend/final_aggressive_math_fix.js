import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const testId = 'eb0a9cac-1a47-4da5-8d3e-6a32af220e7e';

function stripMath(text) {
    if (!text) return text;
    return text.replace(/\$/g, '');
}

function processMathSmarter(content) {
    if (!content) return content;

    let text = stripMath(content);

    // 1. Symbol Normalization
    text = text.replace(/²/g, '^2').replace(/³/g, '^3');
    text = text.replace(/√(\d+)/g, '\\sqrt{$1}');
    text = text.replace(/√\(([^\)]+)\)/g, '\\sqrt{$1}');

    // 2. Identify and wrap math expressions
    // Improved regex to catch equations, polynomials, functions like f(x)
    // Matches expressions with operators or powers.
    const mathRegex = /((?:\(?[a-z0-9]+\)?\s*[\+\-\*\/=<>^]\s*)+[a-z0-9\^\(\)]+|[a-z][0-9]*\^[a-z0-9{}]+|[a-g]\([a-z0-9]\)|[a-z0-9]+\s*[=<>]\s*[a-z0-9]+|\b\d+\/\d+\b|\\sqrt\{[^\}]+\}|\\frac\{[^\}]+\}\{[^\}]+\})/gi;

    text = text.replace(mathRegex, (match) => {
        if (/^(is|of|the|at|in|on|to|for|with|by|as|an|if|be|a|and|no|has|was|were)$/i.test(match)) return match;
        if (match.length <= 1) return match;
        return `$${match.trim()}$`;
    });

    // 3. Lone variable wrapping (x, y, z, r, k, etc.)
    // Only wrap when truly solitary or with punctuation.
    const loneVarRegex = /(^|[\s\(\[\.,;!\?])([x-zrkmptqn])(?=[\s\(\)\[\]\.,;!\?]|$)/gi;
    text = text.replace(loneVarRegex, (m, p1, v) => {
        // Avoid common single-letter words or labels
        if (/^[aieo]$/i.test(v)) return m;
        return `${p1}$${v}$`;
    });

    // 4. Repeatedly join adjacent math segments separated only by whitespace or single operator
    // This cleans up "$f$($x$)" -> "$f(x)$"
    let prevText;
    do {
        prevText = text;
        text = text.replace(/\$([^\$]+)\$\s*([\+\-\*\/=<>])\s*\$([^\$]+)\$/g, '$$$1 $2 $3$$') // merge with operator
            .replace(/\$([^\$]+)\$\s*\$([^\$]+)\$/g, '$$$1$2$$') // merge adjacent
            .replace(/\$([^\$]+)\$([a-z0-9\(\)])/gi, '$$$1$2$$') // absorb trailing alphanumeric/parens
            .replace(/([a-z0-9\(\)])\$([^\$]+)\$/gi, '$$$1$2$$'); // absorb leading alphanumeric/parens
    } while (text !== prevText);

    // 5. Cleanup
    text = text.replace(/\$\$+/g, '$');
    text = text.replace(/\s\s+/g, ' ');

    return text;
}

function processOptionsSmarter(options) {
    if (!options || !Array.isArray(options)) return options;
    return options.map(opt => {
        if (typeof opt !== 'string') return opt;
        let cleaned = stripMath(opt.trim()).replace(/^[A-D]\)\s*/, '');
        // If it contains math characters, wrap the WHOLE thing
        if (/[a-z0-9]*[\+\-\*\/=<>^\(\\]+[a-z0-9]*/gi.test(cleaned) || /\b\d+\b/g.test(cleaned)) {
            return `$${cleaned}$`;
        }
        return processMathSmarter(cleaned);
    });
}

async function runFinalFix() {
    console.log('Final Fetching for Test: ' + testId);
    const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Aggressively processing ${questions.length} questions...`);

    let updatedCount = 0;
    for (const q of questions) {
        const newText = processMathSmarter(q.text);
        const newPassage = processMathSmarter(q.passage);
        const newOptions = processOptionsSmarter(q.options);
        const newExplanation = processMathSmarter(q.explanation);

        const changed =
            newText !== q.text ||
            newPassage !== q.passage ||
            JSON.stringify(newOptions) !== JSON.stringify(q.options) ||
            newExplanation !== q.explanation;

        if (changed) {
            console.log(`Question Refined: ${q.id}`);
            const { error: updateError } = await supabase
                .from('questions')
                .update({
                    text: newText.trim(),
                    passage: newPassage ? newPassage.trim() : null,
                    options: newOptions,
                    explanation: newExplanation ? newExplanation.trim() : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', q.id);

            if (updateError) {
                console.error(`Error updating ${q.id}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`Refinement complete. Total questions updated/refined: ${updatedCount}`);
}

runFinalFix()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
