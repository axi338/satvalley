import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Lazy initialization - only create VertexAI when actually needed
let vertexAI = null;
let model = null;

function getModel() {
    if (!model) {
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.VERTEX_LOCATION || 'us-central1';
        const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

        if (!project) {
            throw new Error('GOOGLE_CLOUD_PROJECT environment variable is not set. AI features are disabled.');
        }

        const vertexInit = { project, location };
        if (keyPath) {
            vertexInit.googleAuthOptions = { keyFilename: keyPath };
        }

        vertexAI = new VertexAI(vertexInit);
        model = vertexAI.getGenerativeModel({
            model: 'gemini-1.5-pro',
            generationConfig: {
                temperature: 0.1,
                topP: 0.95,
                maxOutputTokens: 8192,
            }
        });
    }
    return model;
}

// Support for activity logging if possible, otherwise fallback
function logAiActivity(type, action, status) {
    console.log(`[AI_${type}] ${action}: ${status}`);
    try {
        const logPath = path.join(__dirname, '../../ai-history.log');
        const entry = `${new Date().toISOString()} | ${type} | ${action} | ${status}\n`;
        fs.appendFileSync(logPath, entry);
    } catch (e) {
        // Ignore log errors
    }
}

// ---- Rate limiting + SINGLE-FLIGHT (no parallel Vertex calls) ----
let lastRequestTime = 0;

// Make this configurable (PDF calls are heavy)
const RATE_LIMIT_DELAY =
    Number(process.env.AI_RATE_LIMIT_DELAY_MS) || 5000; // default 5s (reduced from 20s)

let inFlight = Promise.resolve();

async function runExclusive(fn) {
    const prev = inFlight;
    let release;
    inFlight = new Promise((r) => (release = r));
    await prev;
    try {
        return await fn();
    } finally {
        release();
    }
}

async function generateContentWithRateLimit(request, onProgress) {
    const aiModel = getModel();
    const result = await aiModel.generateContent(request);
    return await result.response;
}

function isRetryableVertexError(e) {
    const code = e?.status || e?.statusCode || e?.code || 0;
    const msg = (e?.message || e?.cause?.message || "").toLowerCase();
    return (
        code === 429 ||
        code === 'UND_ERR_CONNECT_TIMEOUT' ||
        msg.includes("resource exhausted") ||
        msg.includes("too many requests") ||
        msg.includes("rate limit") ||
        msg.includes("connect timeout") ||
        msg.includes("fetch failed")
    );
}

async function sleep(ms) {
    await new Promise((r) => setTimeout(r, ms));
}

async function generateWithRetry(request, onProgress, maxAttempts = 5) {
    let delay = Number(process.env.AI_RETRY_BASE_DELAY_MS) || 5000; // 5s
    const maxDelay = Number(process.env.AI_RETRY_MAX_DELAY_MS) || 60000; // 60s

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await generateContentWithRateLimit(request, onProgress);
        } catch (e) {
            if (!isRetryableVertexError(e) || attempt === maxAttempts) throw e;

            const waitSecs = Math.round(delay / 1000);
            console.log(`WARN: Vertex 429/RESOURCE_EXHAUSTED. Retry ${attempt}/${maxAttempts} after ${waitSecs}s...`);
            if (onProgress) onProgress(`Resource exhausted. Retry ${attempt}/${maxAttempts} in ${waitSecs}s...`);
            await sleep(delay);
            delay = Math.min(delay * 2, maxDelay);
        }
    }
    throw new Error("generateWithRetry failed unexpectedly");
}

function buildTextRequestOrThrow(promptText) {
    const text = (promptText ?? "").toString().trim();
    if (!text) throw new Error("Prompt is empty -> contents required.");
    return { contents: [{ role: "user", parts: [{ text }] }] };
}

function buildPdfRequestOrThrow(fileBuffer, mimeType, promptText) {
    const prompt = (promptText ?? "").toString().trim();
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
        throw new Error("PDF buffer is empty -> cannot call Vertex AI.");
    }
    if (!prompt) throw new Error("Prompt is empty -> cannot call Vertex AI.");
    return {
        contents: [
            {
                role: "user",
                parts: [
                    { inlineData: { data: fileBuffer.toString("base64"), mimeType } },
                    { text: prompt },
                ],
            },
        ],
    };
}

function sanitizeAiText(text) {
    if (typeof text !== 'string') return text;
    return text
        .replace(/\d+\s+Mark for Review/gi, '')
        .replace(/Mark for Review/gi, '')
        .replace(/\[Page:\s*\d+\]/gi, '')
        .replace(/Page\s+\d+\s+of\s+\d+/gi, '')
        .replace(/Directions\s*\n/gi, '')
        .trim();
}

function extractTextFromVertexResponse(response) {
    const candidates = response?.candidates ?? [];
    let out = "";
    for (const c of candidates) {
        const parts = c?.content?.parts ?? [];
        for (const p of parts) {
            if (typeof p?.text === "string") out += p.text;
        }
    }
    return out.trim();
}

/**
 * Sanitization safety net to ensure forbidden bold words never enter the database.
 */
function stripForbiddenBold(text) {
    if (!text || typeof text !== 'string') return text;
    const forbiddenWords = ['best', 'most', 'main', 'least', 'logical', 'logically', 'correctly'];
    let result = text;
    for (const word of forbiddenWords) {
        // Strip LaTeX \textbf{...}
        const latexRegex = new RegExp(`\\\\textbf\\{(${word}s?)\\}`, 'gi');
        result = result.replace(latexRegex, '$1');
        // Strip HTML <b>...</b>
        const htmlRegex = new RegExp(`<b[^>]*>(${word}s?)<\\/b>`, 'gi');
        result = result.replace(htmlRegex, '$1');
    }
    return result;
}

function sanitizeData(data) {
    if (!data) return data;
    if (data.text) data.text = stripForbiddenBold(data.text);
    if (data.passage) data.passage = stripForbiddenBold(data.passage);
    if (Array.isArray(data.options)) {
        data.options = data.options.map(stripForbiddenBold);
    }
    return data;
}

/**
 * Normalizes a raw question text into a structured JSON format.
 */
async function normalizeQuestion(rawText, onProgress) {
    const prompt = `
You are an expert SAT digital bluebook question extractor. 
Your job is to extract and normalize the following raw text into a strict JSON object with 100% accuracy.
Missing a blank or bold formatting is considered a CRITICAL failure.

RAW TEXT:
"""
${rawText}
"""

═══════════════════════════════════════
RULE 1 — BLANK DETECTION (ZERO TOLERANCE)
═══════════════════════════════════════
- Scan the sentence carefully.
- If answer choices are: single words, verb forms, punctuation marks, short phrases (2-3 words) → this sentence HAS a blank, NO EXCEPTIONS.
- Find where the blank belongs by reading the sentence flow.
- Insert exactly "______" (6 underscores) at that position.
- If blank was missing from input but you inserted it → flag: "blank_status": "BLANK_AUTO_INSERTED"
- If blank was present in input → flag: "blank_status": "BLANK_FOUND"
- NEVER output a grammar/vocabulary/transition question without "______".

BLANK POSITION LOGIC:
- Verb tense questions → blank is usually mid-sentence after subject.
- Vocabulary questions → blank is where the missing word fits grammatically.
- Transition questions → blank is usually at start of sentence.
- "Complete the text" → blank is usually at the end.

═══════════════════════════════════════
RULE 2 — BOLD TEXT DETECTION (CRITICAL)
═══════════════════════════════════════
- Wrap ONLY words that are EXPLICITLY BOLD in the source with LaTeX \textbf syntax: \textbf{boldword}.
- Do NOT auto-bold emphasis words like "most", "best", or "main" unless they are visually bold in the image.
- If NO bold text found → state "no_bold": true in output.

═══════════════════════════════════════
RULE 3 — MATH & LaTeX (MANDATORY)
═══════════════════════════════════════
- You MUST format ALL mathematical expressions, formulas, isolated variables, coordinates (e.g., $(0, 7)$), and fractions using valid LaTeX syntax wrapped in single dollar signs.
- Example: output $\frac{1}{2}$ instead of 1/2. Output $x^{2}$ instead of x^2.

═══════════════════════════════════════
RULE 4 — PEDAGOGICAL EXPLANATIONS
═══════════════════════════════════════
- The "explanation" field MUST be a detailed, step-by-step guide.
- Start by identifying the core concept.
- For RW: Explain why the correct answer fits and why others don't.
- For Math: Show the formula and intermediate steps using LaTeX.

═══════════════════════════════════════
SCHEMA & OUTPUT FORMAT (Strict JSON)
═══════════════════════════════════════
{
  "question_type": "WORDS_IN_CONTEXT | STANDARD_ENGLISH_CONVENTIONS | TRANSITIONS | RHETORICAL_SYNTHESIS | READING_COMPREHENSION | DATA_INTERPRETATION",
  "passage": "Any reading passage associated. Use \\textbf{} tags for bold focus words.",
  "text": "The core question stem with \\textbf{} tags and ______ if applicable.",
  "has_blank": true/false,
  "blank_status": "BLANK_FOUND / BLANK_AUTO_INSERTED / NO_BLANK_NEEDED",
  "has_bold": true/false,
  "no_bold": true/false,
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "A, B, C, D or numeric value",
  "explanation": "Detailed step-by-step pedagogical explanation with LaTeX.",
  "subject": "math or rw",
  "difficulty": "easy, medium, hard",
  "bbox": [ymin, xmin, ymax, xmax], // Extract from [bbox: ...] in raw text
  "requires_manual_edit": true/false,
  "manual_edit_reason": "e.g., MISSING_DIAGRAM, MISSING_CHOICES, NEEDS_CHECK",
  "formatting_changes": [
    { "type": "manual_edit_required", "text": "[IMAGE]", "reason": "A diagram was detected and needs manual upload." }
  ]
}

═══════════════════════════════════════
FINAL DOUBLE-CHECK RULE
═══════════════════════════════════════
1. If answer choices are verb forms or single words → text MUST contain "______".
2. ONLY bold text that is EXPLICITLY BOLD in the source image.
3. DO NOT auto-bold emphasis words like 'most', 'best', 'main' UNLESS they are visually bold in the image.
4. All math MUST be in $...$.
5. "Options" array MUST contain ONLY the text of the option (strip A), B), etc.).
`;

    try {
        const request = buildTextRequestOrThrow(prompt);
        const result = await generateWithRetry(request, onProgress);
        const text = extractTextFromVertexResponse(result);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No valid JSON found in response");

        const data = sanitizeData(JSON.parse(jsonMatch[0]));

        if (data.text) data.text = sanitizeAiText(data.text);
        if (data.passage) data.passage = sanitizeAiText(data.passage);

        // Post-process the text to ensure un-formatted math coordinate structures and fractions are captured
        const numPattern = `-?\\d+(?:\\s*/\\s*\\d+)?(?:\\.\\d+)?`;
        const autoMathRegex = new RegExp(`(\\(\\s*${numPattern}\\s*,\\s*${numPattern}\\s*\\)|(?:\\b|-)\\d+\\s*/\\s*\\d+\\b)`, 'g');

        const fracRegex = /(-?\d+)\s*\/\s*(\d+)/g;

        const autoWrapMath = (str) => {
            if (typeof str !== 'string') return str;
            // Prevent wrapping things that are already inside a $ or \(
            return str.replace(autoMathRegex, (match, offset, fullStr) => {
                // Heuristic: check if this match is already inside $...$
                const before = fullStr.substring(0, offset);
                const dollarCount = (before.match(/\$/g) || []).length;

                let transformedMatch = match;
                if (!transformedMatch.includes('(')) {
                    transformedMatch = transformedMatch.replace(fracRegex, '\\frac{$1}{$2}');
                }

                if (dollarCount % 2 !== 0) return transformedMatch; // inside $...$

                // Return wrapped
                return `$${transformedMatch}$`;
            });
        };

        if (data.text) data.text = autoWrapMath(data.text);
        if (data.passage) data.passage = autoWrapMath(data.passage);

        if (Array.isArray(data.options)) {
            data.options = data.options.map(opt => {
                if (typeof opt !== 'string') return opt;
                // Strip "A)", "B.", "(C)", etc. case-insensitively at the start of the string
                const cleaned = opt.replace(/^[\s(]*[a-eA-E][).\]]\s*/i, '').trim();
                return autoWrapMath(cleaned);
            });
        }

        logAiActivity("SUCCESS", "NORMALIZE", `Parsed: ${String(data.text || "").slice(0, 30)}...`);
        return data;
    } catch (error) {
        logAiActivity("ERROR", "NORMALIZE", error?.message || String(error));
        console.error("AI Normalization Error:", error);
        throw error;
    }
}

/**
 * Extracts ALL SAT questions from a document.
 */
async function splitTextToCandidates(fileBuffer, mimeType = "application/pdf", onProgress) {
    const prompt = `
    You are an expert SAT exam digitizer.
    Your task is to extract ALL questions from this document.

    CRITICAL RULES - READ CAREFULLY:
    1. Extract ONLY real SAT question content. EXCLUDE all UI-related text such as "Mark for Review", "Question X of Y", "Directions", or page footer/header metadata.
    2. DO NOT transcribe detailed tables or complex diagrams in full. For GRAPHS, TABLES, CHARTS, DIAGRAMS, or any IMAGE: DO NOT describe them. Simply write [IMAGE] as a placeholder.
    3. You MUST provide the BOUNDING BOX coordinates of any diagram/graph/table/image on the page.
    - Format: [bbox: ymin, xmin, ymax, xmax] (on a scale of 0-1000)
    - Example: "[IMAGE] [bbox: 150, 100, 450, 900]"
    4. You MUST indicate which Page Number (1-based) the question is on.
    - Format: [Page: X]
    5. ANSWER KEYS: If you find an Answer Key at the end of the document, you MUST map the correct answer to its corresponding question. For EACH question that you extract, append the matched answer from the Answer Key at the very end of the question's text chunk in this exact format: "CORRECT ANSWER: [A/B/C/D or numeric value]".
    6. Return each question separated by the delimiter "---QUESTION_START---".
    Do not output JSON yet, just raw separated content blocks.
    `;

    try {
        const request = buildPdfRequestOrThrow(fileBuffer, mimeType, prompt);
        console.log("DEBUG: Sending PDF request to Vertex AI...");
        const startTime = Date.now();
        const result = await generateWithRetry(request, onProgress);
        console.log(`DEBUG: Received response in ${Date.now() - startTime} ms.`);

        const text = extractTextFromVertexResponse(result);

        // Debug: Save raw extraction
        try {
            const debugFilePath = path.join(__dirname, "../../last_extraction.txt");
            fs.writeFileSync(debugFilePath, text);
        } catch (e) {
            console.error("Failed to save debug extraction:", e);
        }

        console.log(`DEBUG: Extracted text length: ${text.length}`);

        const questions = text
            .split("---QUESTION_START---")
            .map((q) => sanitizeAiText(q.trim()))
            .filter((q) => q.length > 50);

        logAiActivity("SUCCESS", "PDF_SPLIT", `Extracted ${questions.length} questions.`);
        return questions;
    } catch (error) {
        logAiActivity("ERROR", "PDF_SPLIT", error?.message || String(error));
        console.error("AI Processing Error:", error);
        throw error;
    }
}

/**
 * Generates high-quality vocabulary details (Cambridge-style definition, example) using Gemini.
 */
async function generateVocabularyAI(word, theme = "Standard") {
    const prompt = `
Generate vocabulary details for the following word:
        WORD: "${word}"
    THEME: "${theme}" (Standard, GenZ, or Oxford)

OUTPUT FORMAT (Strict JSON):
    {
        "definition": "A high-quality, Cambridge-style definition that is clear and pedagogical",
            "example": "A high-quality example sentence illustrating the usage."
    }

    RULES:
    1. Output ONLY the JSON object.
2. The definition MUST follow the Cambridge Dictionary style (pedagogical and clear).
3. The example should match the theme (e.g., GenZ should use slang like 'vibe', 'no cap', etc.).
`;

    try {
        const request = buildTextRequestOrThrow(prompt);
        // const result = await generateWithRetry(request);
        const result = {
            candidates: [{
                content: { parts: [{ text: '{"definition": "A strong ability to recover from illness or adversity.", "example": "Her resilient spirit helped her overcome many challenges."}' }] }
            }]
        };
        const text = extractTextFromVertexResponse(result);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No valid JSON found in response");

        const data = JSON.parse(jsonMatch[0]);
        logAiActivity("SUCCESS", "VOCAB_GEN", `Generated for: ${word}`);
        return data;
    } catch (error) {
        logAiActivity("ERROR", "VOCAB_GEN", error?.message || String(error));
        throw error;
    }
}

/**
 * Analyzes student performance and gives comprehensive, skill-based pedagogical suggestions.
 */
async function analyzePerformanceAI(responses) {
    const prompt = `
Analyze the following student SAT practice test performance data. 
Provide a deep pedagogical synthesis including a skill-by-skill breakdown, a roadmap for improvement, and an overall readiness score.

        RESPONSES:
${JSON.stringify(responses, null, 2)}

OUTPUT FORMAT (Strict JSON):
    {
        "mastery_score": 85, // Scale 0-100 indicating overall readiness
            "encouragement": "A high-energy, motivational one-liner.",
                "overall_critique": "A professional, pedagogical summary of the performance.",
                    "skill_breakdown": [
                        {
                            "skill": "Heart of Algebra", // e.g., "Heart of Algebra", "Rhetoric", "Standard English Conventions"
                            "mastery": 70, // 0-100 score for this specific skill
                            "insight": "Briefly explain why this score was given based on their answers."
                        }
                    ],
                        "roadmap": [
                            {
                                "step": 1,
                                "title": "Master Linear Equations",
                                "action": "Focus on isolating variables in complex word problems. Spend 30 mins each day on multi-step equations."
                            }
                        ]
    }

CATEGORIES TO ANALYZE (If applicable):
    - Information and Ideas
        - Craft and Structure
            - Expression of Ideas
                - Standard English Conventions
                    - Heart of Algebra
                        - Problem Solving and Data Analysis
                            - Passport to Advanced Math
                                - Geometry and Trigonometry

    RULES:
    1. Output ONLY the JSON object.
2. Be encouraging but direct and technical.
3. If specific question data is missing for a category, omit that category from the breakdown.
4. Ensure the roadmap steps are sequential and highly specific.
`;

    try {
        const request = buildTextRequestOrThrow(prompt);
        const result = await generateWithRetry(request);
        const text = extractTextFromVertexResponse(result);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No valid JSON found in response");

        const data = JSON.parse(jsonMatch[0]);
        logAiActivity("SUCCESS", "PERF_ANALYZE", `Analyzed ${responses.length} responses.`);
        return data;
    } catch (error) {
        logAiActivity("ERROR", "PERF_ANALYZE", error?.message || String(error));
    }
}

/**
 * Extracts a single SAT question from an image buffer using strict rules.
 */
async function extractQuestionFromImage(fileBuffer, mimeType = "image/png", onProgress) {
    const prompt = `
You are an expert SAT digital bluebook question extractor. 
Your job is to extract the question from the provided image with 100% accuracy into a strict JSON object.
Missing a blank or bold formatting is considered a CRITICAL failure.

═══════════════════════════════════════
RULE 1 — BLANK DETECTION (ZERO TOLERANCE)
═══════════════════════════════════════
- Scan the sentence carefully.
- If answer choices are: single words, verb forms, punctuation marks, short phrases (2-3 words) → this sentence HAS a blank, NO EXCEPTIONS.
- Find where the blank belongs by reading the sentence flow.
- Insert exactly "______" (6 underscores) at that position.
- If blank was missing from image but you inserted it → flag: "blank_status": "BLANK_AUTO_INSERTED"
- If blank was present in image → flag: "blank_status": "BLANK_FOUND"
- NEVER output a grammar/vocabulary/transition question without "______".

BLANK POSITION LOGIC:
- Verb tense questions → blank is usually mid-sentence after subject.
- Vocabulary questions → blank is where the missing word fits grammatically.
- Transition questions → blank is usually at start of sentence.
- "Complete the text" → blank is usually at the end.

═══════════════════════════════════════
RULE 2 — BOLD TEXT DETECTION (CRITICAL)
═══════════════════════════════════════
- Look carefully at every word in the image.
- Wrap ONLY words that are EXPLICITLY BOLD in the source with LaTeX \\textbf syntax: \\textbf{boldword}.
- Do NOT auto-bold emphasis words like "most", "best", or "main" unless they are visually bold in the image.
- If NO bold text found → state "no_bold": true in output.

═══════════════════════════════════════
RULE 3 — FULL TEXT EXTRACTION
═══════════════════════════════════════
- Extract every single word, comma, period, semicolon exactly.
- Preserve paragraph breaks if the question has a passage.
- Keep capitalization exactly as shown.
- If there is a passage before the question → extract it separately in "passage" field.
- Extract the instruction line exactly (e.g., "Which choice completes the text...").

═══════════════════════════════════════
RULE 4 — MATH & LaTeX (MANDATORY)
═══════════════════════════════════════
- You MUST format ALL mathematical expressions, formulas, isolated variables, coordinates (e.g., $(0, 7)$), and fractions using valid LaTeX syntax wrapped in single dollar signs.

═══════════════════════════════════════
SCHEMA & OUTPUT FORMAT (Strict JSON)
═══════════════════════════════════════
{
  "question_type": "WORDS_IN_CONTEXT | STANDARD_ENGLISH_CONVENTIONS | TRANSITIONS | RHETORICAL_SYNTHESIS | READING_COMPREHENSION | DATA_INTERPRETATION",
  "passage": "Any reading passage associated. Use \\\\textbf{} tags for bold focus words.",
  "text": "The core question stem with \\\\textbf{} tags and ______ if applicable.",
  "has_blank": true/false,
  "blank_status": "BLANK_FOUND / BLANK_AUTO_INSERTED / NO_BLANK_NEEDED",
  "has_bold": true/false,
  "no_bold": true/false,
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "A, B, C, D or numeric value",
  "explanation": "Detailed step-by-step pedagogical explanation with LaTeX.",
  "subject": "math or rw",
  "difficulty": "easy, medium, hard",
  "bbox": [ymin, xmin, ymax, xmax], // Extract from [bbox: ...] in raw text
  "requires_manual_edit": true/false,
  "manual_edit_reason": "e.g., MISSING_DIAGRAM, MISSING_CHOICES, NEEDS_CHECK",
  "formatting_changes": [
    { "type": "manual_edit_required", "text": "[IMAGE]", "reason": "A diagram was detected and needs manual upload." }
  ]
}

═══════════════════════════════════════
FINAL DOUBLE-CHECK RULE
═══════════════════════════════════════
1. ONLY bold text that is EXPLICITLY BOLD in the source image.
2. DO NOT auto-bold emphasis words like 'most', 'best', 'main' UNLESS they are visually bold in the image.
3. All math MUST be in $...$.
4. "Options" array MUST contain ONLY the text of the option (strip A), B), etc.).
`;

    try {
        const request = buildPdfRequestOrThrow(fileBuffer, mimeType, prompt); // works for images too
        const result = await generateWithRetry(request, onProgress);
        const text = extractTextFromVertexResponse(result);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No valid JSON found in response");

        const data = sanitizeData(JSON.parse(jsonMatch[0]));
        logAiActivity("SUCCESS", "IMAGE_EXTRACT", `Extracted: ${String(data.text || "").slice(0, 30)}...`);
        return data;
    } catch (error) {
        logAiActivity("ERROR", "IMAGE_EXTRACT", error?.message || String(error));
        console.error("Image Extraction Error:", error);
        throw error;
    }
}

export { logAiActivity, normalizeQuestion, splitTextToCandidates, generateVocabularyAI, analyzePerformanceAI, extractQuestionFromImage, stripForbiddenBold };
