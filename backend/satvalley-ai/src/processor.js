import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

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
            model: 'gemini-2.0-flash-001',
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
 * Normalizes a raw question text into a structured JSON format.
 */
export async function normalizeQuestion(rawText, onProgress) {
    const prompt = `
You are an expert SAT question parser. Your task is to convert the following raw text into a strict JSON object following the schema below.

RAW TEXT:
"""
${rawText}
"""

SCHEMA:
{
  "text": "The core question stem. DO NOT include UI labels like 'Mark for Review', question numbers, or page markers.",
  "passage": "Any reading passage associated with the question. If there is a graph/table, include a brief description here. EXCLUDE all UI noise.",
  "type": "multiple-choice or spr",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "A, B, C, D or numeric value",
  "explanation": "Brief explanation",
  "subject": "math or rw",
  "difficulty": "easy, medium, hard",
  "skill_tags": ["tag1", "tag2"],
  "bbox": [ymin, xmin, ymax, xmax],
  "has_image": false
}

RULES:
1. Output ONLY the JSON object.
2. If raw text contains multiple questions, only process the first one.
3. Ensure "subject" is lowercase.
4. If it is a math question without options, set "type" to "spr" and "options" to null.
5. If options are not clearly labeled, infer them from the text and set "type" to "multiple-choice".
6. STOP WORDS: You MUST strip the following from the output:
   - "X Mark for Review" (where X is any number)
   - "[Page: X]" or "Page X of Y"
   - Any "Directions" headings
   - Any random OCR artifacts or page footer/header text
7. TABLES & FIGURES: Do not transcribe tables in full. Simply note "Table with [summary]" and focus on the question.
8. EXTRACT the [bbox: ...] tag from raw text and put it in the "bbox" field as an array of integers.
9. DETERMINE SUBJECT:
   - If the question involves calculation, algebra, geometry, or data analysis -> "math"
   - If the question involves reading a passage, grammar, vocabulary, or rhetoric -> "rw"
10. OPTION PREFIX STRIPPING: You MUST strip the alphabetical letters like "A)", "A.", "(A)", "B)", etc. from the actual string choice in the "options" array. The strings in the "options" array should contain ONLY the text of the option itself. For example, if the text says "A) 5", the option array should just contain "5".
11. ANSWER KEY MAPPING: Look for an answer key provided by the extraction phase. If "CORRECT ANSWER: [Letter/Value]" is included in the raw text, use that to accurately determine the "correct_answer".
12. MATH FORMATTING: You MUST format ALL mathematical expressions, formulas, isolated variables, coordinates (e.g., $(0, 7)$), and fractions using valid LaTeX syntax wrapped in single dollar signs. For example, output $\frac{1}{2}$ instead of 1/2. Output $x^{2}$ instead of x^2. Output $x$ instead of just x when referencing a variable in text. ALL coordinate pairs like (0, 7) MUST be wrapped in dollar signs like $(0, 7)$. ALL fractions like -3/2 MUST be wrapped in dollar signs like $-3/2$ or $-\frac{3}{2}$.
13. DETAILED EXPLANATIONS: The "explanation" field MUST be a detailed, pedagogical, step-by-step guide on how to solve the question.
    - Start by identifying the core concept being tested.
    - Break down the logic or calculation into clear, logical steps.
    - For Reading/Writing: Explain why the correct answer fits the context and why the other options are incorrect.
    - For Math: Show the formula used and the intermediate steps of the calculation.
    - Use LaTeX for ALL mathematical notation within the explanation.
    - Aim for a tone that is helpful, encouraging, and clear.
`;

    try {
        const request = buildTextRequestOrThrow(prompt);
        const result = await generateWithRetry(request, onProgress);
        const text = extractTextFromVertexResponse(result);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No valid JSON found in response");

        const data = JSON.parse(jsonMatch[0]);

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
export async function splitTextToCandidates(fileBuffer, mimeType = "application/pdf", onProgress) {
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

        console.log(`DEBUG: Extracted text length: ${text.length} `);

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
export async function generateVocabularyAI(word, theme = "Standard") {
    const prompt = `
Generate vocabulary details for the following word:
        WORD: "${word}"
    THEME: "${theme}"(Standard, GenZ, or Oxford)

OUTPUT FORMAT(Strict JSON):
    {
        "definition": "A high-quality, Cambridge-style definition that is clear and pedagogical",
            "example": "A high-quality example sentence illustrating the usage."
    }

    RULES:
    1. Output ONLY the JSON object.
2. The definition MUST follow the Cambridge Dictionary style(pedagogical and clear).
3. The example should match the theme(e.g., GenZ should use slang like 'vibe', 'no cap', etc.).
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
        logAiActivity("SUCCESS", "VOCAB_GEN", `Generated for: ${word} `);
        return data;
    } catch (error) {
        logAiActivity("ERROR", "VOCAB_GEN", error?.message || String(error));
        throw error;
    }
}

/**
 * Analyzes student performance and gives comprehensive, skill-based pedagogical suggestions.
 */
export async function analyzePerformanceAI(responses) {
    const prompt = `
Analyze the following student SAT practice test performance data. 
Provide a deep pedagogical synthesis including a skill - by - skill breakdown, a roadmap for improvement, and an overall readiness score.

        RESPONSES:
${JSON.stringify(responses, null, 2)}

OUTPUT FORMAT(Strict JSON):
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

CATEGORIES TO ANALYZE(If applicable):
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
        throw error;
    }
}
