import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

let vertexAI = null;
let generativeModel = null;

function getModel() {
    if (!generativeModel) {
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.VERTEX_LOCATION || 'us-central1';

        if (!project) {
            throw new Error('GOOGLE_CLOUD_PROJECT environment variable is not set.');
        }

        vertexAI = new VertexAI({ project, location });
        generativeModel = vertexAI.getGenerativeModel({
            model: 'gemini-2.0-flash-001',
            generationConfig: {
                temperature: 0.1,
                topP: 0.95,
                maxOutputTokens: 8192,
            }
        });
    }
    return generativeModel;
}

// ---- Rate limiting + retry ----
const BASE_DELAY = Number(process.env.AI_RETRY_BASE_DELAY_MS) || 5000;
const MAX_DELAY = Number(process.env.AI_RETRY_MAX_DELAY_MS) || 60000;

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function isRetryable(e) {
    const code = e?.status || e?.statusCode || e?.code || 0;
    const msg = (e?.message || '').toLowerCase();
    return (
        code === 429 ||
        msg.includes('resource exhausted') ||
        msg.includes('too many requests') ||
        msg.includes('rate limit') ||
        msg.includes('fetch failed')
    );
}

async function generateWithRetry(request, maxAttempts = 4) {
    const model = getModel();
    let delay = BASE_DELAY;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await model.generateContent(request);
            return await result.response;
        } catch (e) {
            if (!isRetryable(e) || attempt === maxAttempts) throw e;
            console.warn(`[formattingFixer] Retry ${attempt}/${maxAttempts} after ${delay}ms — ${e.message}`);
            await sleep(delay);
            delay = Math.min(delay * 2, MAX_DELAY);
        }
    }
    throw new Error('generateWithRetry: unexpected exit');
}

function extractText(response) {
    const candidates = response?.candidates ?? [];
    let out = '';
    for (const c of candidates) {
        for (const p of c?.content?.parts ?? []) {
            if (typeof p?.text === 'string') out += p.text;
        }
    }
    return out.trim();
}

/**
 * Fixes the formatting of a single SAT question using Gemini.
 * Returns { fixed_question_html, fixed_passage_html, changes, confidence, needs_review }
 */
export async function fixQuestionFormatting(question) {
    // Use JSON.stringify to safely embed values without injection issues
    const inputJson = JSON.stringify({
        question_text: question.text || '',
        passage: question.passage || '',
        choices: question.options || [],
        question_type: question.type || '',
        subject: question.subject || ''
    }, null, 2);

    const prompt = `
You are a senior SAT content editor fixing small formatting issues in already-extracted SAT questions.
Your output must be valid HTML using <b>...</b> for bold and exactly "______" (6 underscores) for blanks.

═══════════════════════════════════════
RULE 1 — BOLD TEXT (<b> tags)
═══════════════════════════════════════
- If the question asks "as used in the text, what does the word X most nearly mean?" → wrap X with <b>X</b> wherever it appears.
- If the question asks about "the word X" or "the phrase X" → wrap X in <b>.
- If a specific word/phrase is underlined or visually emphasized → wrap it in <b>.
- DO NOT bold common filler words like "most", "best", "main", "least" unless they are the exact target of the question.
- DO NOT bold random emphasis or repeated words.

═══════════════════════════════════════
RULE 2 — BLANK "______" (6 underscores)
═══════════════════════════════════════
- If the question says "Which choice completes the text..." and the passage/question_text does NOT already contain "______", you MUST insert exactly "______" at the blank position.
- If the question says "Which choice completes the text with the most logical transition..." → the transition slot in the passage is the blank.
- If the question tests grammar/conventions (e.g., verb tense, punctuation) → the blank is where the answer choice slots in.
- If the passage already contains "______" → keep it as-is.
- DO NOT add a blank if you are less than 90% sure where it belongs. Do not add a blank for reading comprehension or evidence questions.

═══════════════════════════════════════
RULE 3 — MATH & LaTeX
═══════════════════════════════════════
- For math questions: preserve any existing LaTeX ($...$) intact.
- If math expressions are unformatted (e.g., "x^2"), wrap them in $x^2$.

═══════════════════════════════════════
RULE 4 — SAFETY
═══════════════════════════════════════
- NEVER rewrite the meaning or logic of the question.
- NEVER change or rearrange the answer choices.
- NEVER invent content.
- Only fix <b> tags and ______ placement.
- The output text must be valid HTML (use <b> not <strong>).

INPUT QUESTION (JSON):
${inputJson}

═══════════════════════════════════════
OUTPUT FORMAT (Strict JSON, no markdown fences)
═══════════════════════════════════════
{
  "fixed_question_html": "The corrected question_text with <b>...</b> and/or ______ added. Use \\n for newlines.",
  "fixed_passage_html": "The corrected passage with <b>...</b> and/or ______ added, or empty string if no passage.",
  "changes": [
    {
      "type": "blank_added | bold_added | no_change",
      "text": "The phrase affected",
      "reason": "Brief reason"
    }
  ],
  "confidence": 0.95,
  "needs_review": false
}

Output ONLY the JSON object with no surrounding text or markdown fences.
`;

    try {
        const response = await generateWithRetry({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const text = extractText(response);

        // Strip potential markdown fences
        const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in AI response. Raw: ' + text.slice(0, 200));

        const data = JSON.parse(jsonMatch[0]);

        // Validate required fields
        if (!data.fixed_question_html || typeof data.fixed_question_html !== 'string') {
            throw new Error('Invalid fixed_question_html returned by AI');
        }
        if (typeof data.fixed_passage_html !== 'string') {
            data.fixed_passage_html = '';
        }
        if (typeof data.confidence !== 'number') {
            data.confidence = 0.5;
        }

        // Force needs_review if confidence is low
        if (data.confidence < 0.90) {
            data.needs_review = true;
        }

        return data;
    } catch (error) {
        console.error('[formattingFixer] Error:', error.message);
        return {
            fixed_question_html: question.text || '',
            fixed_passage_html: question.passage || '',
            changes: [],
            confidence: 0,
            needs_review: true,
            error: error.message
        };
    }
}
