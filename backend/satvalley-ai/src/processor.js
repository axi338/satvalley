import fs from "fs";
import { VertexAI } from "@google-cloud/vertexai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, "../../ai-history.log");

/**
 * Logs AI activity to a file with timestamps.
 * @param {'SUCCESS' | 'ERROR'} status 
 * @param {string} activity 
 * @param {string} details 
 */
export function logAiActivity(status, activity, details) {
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    const logEntry = `[${timestamp}] [${status}] Activity: ${activity} | Details: ${details}\n`;

    try {
        fs.appendFileSync(LOG_FILE, logEntry);
    } catch (error) {
        console.error('Failed to write to AI log file:', error);
    }
}

console.log("LOADED processor.js VERSION = 2026-02-11-vertex-fix-2-inlined");

dotenv.config({ path: path.join(__dirname, "../../.env") });

let vertexAI = null;
let model = null;

function getModel() {
    if (!model) {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.VERTEX_LOCATION || "us-central1";

        if (!projectId) {
            throw new Error(
                "GOOGLE_CLOUD_PROJECT environment variable is not set. AI features are disabled."
            );
        }

        vertexAI = new VertexAI({ project: projectId, location });

        // Safety Settings: BLOCK_NONE to ensure SAT questions aren't falsely flagged
        const safetySettings = [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ];

        model = vertexAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            safetySettings: safetySettings
        });
    }
    return model;
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
    return runExclusive(async () => {
        const aiModel = getModel();

        const now = Date.now();
        const timeSinceLast = now - lastRequestTime;

        if (timeSinceLast < RATE_LIMIT_DELAY) {
            const waitTime = RATE_LIMIT_DELAY - timeSinceLast;
            const waitSecs = Math.round(waitTime / 1000);
            console.log(
                `DEBUG: Rate limiting. Waiting ${waitSecs}s...`
            );
            if (onProgress) onProgress(`Rate limiting: waiting ${waitSecs}s...`);
            await new Promise((r) => setTimeout(r, waitTime));
        }

        lastRequestTime = Date.now();
        if (onProgress) onProgress("Sending request to AI...");
        return aiModel.generateContent(request);
    });
}

// ---- Retry for 429 RESOURCE_EXHAUSTED ----
function isRetryableVertexError(e) {
    const code = e?.code ?? e?.statusCode ?? e?.cause?.code;
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
            // Log deep failure details if it's the last attempt or not retryable
            const isRetryable = isRetryableVertexError(e);

            if (!isRetryable || attempt === maxAttempts) {
                const errorDetails = e?.response?.data || e?.message || String(e);
                console.error(`[VertexAI Error] Full Details:`, JSON.stringify(errorDetails, null, 2));
                throw e;
            }

            const waitSecs = Math.round(delay / 1000);
            console.log(
                `WARN: Vertex 429/RESOURCE_EXHAUSTED. Retry ${attempt}/${maxAttempts} after ${waitSecs}s...`
            );
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

    return {
        contents: [{ role: "user", parts: [{ text }] }],
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

export async function normalizeQuestion(rawText, onProgress) {
    const prompt = `
You are an expert SAT question parser. Your task is to convert the following raw text into a strict JSON object following the schema below.

RAW TEXT:
"""
${rawText}
"""

SCHEMA:
{
  "text": "The core question stem (e.g., 'What is the value of x?'). DO NOT include UI labels like 'Mark for Review', question numbers, or page markers.",
  "passage": "The reading passage for the question. If there is a graph/table, include a brief description here. EXCLUDE all UI noise and page numbers.",
  "type": "multiple-choice or spr",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "A, B, C, D or numeric value",
  "explanation": "Brief explanation",
  "subject": "math or rw",
  "difficulty": "easy, medium, hard",
  "skill_tags": ["tag1", "tag2"],
  "bbox": [ymin, xmin, ymax, xmax]
}

RULES:
1. Output ONLY the JSON object.
2. If the raw text contains multiple questions, only process the first one.
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
12. MATH FORMATTING: You MUST format ALL mathematical expressions, formulas, isolated variables, and fractions using valid LaTeX syntax wrapped in single dollar signs. For example, output $\frac{1}{2}$ instead of 1/2. Output $x^2$ instead of x^2. Output $x$ instead of just x when referencing a variable in text.
`;

    try {
        const request = buildTextRequestOrThrow(prompt);

        // Use retry wrapper
        const result = await generateWithRetry(request, onProgress);
        const response = result.response;

        const text = extractTextFromVertexResponse(response);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No valid JSON found in response");

        const data = JSON.parse(jsonMatch[0]);

        // Programmatic cleanup of AI noise
        if (data.text) data.text = sanitizeAiText(data.text);
        if (data.passage) data.passage = sanitizeAiText(data.passage);
        if (Array.isArray(data.options)) {
            data.options = data.options.map(opt => {
                if (typeof opt !== 'string') return opt;
                // Strip "A)", "B.", "(C)", etc. case-insensitively at the start of the string
                return opt.replace(/^[\s(]*[a-eA-E][).\]]\s*/i, '').trim();
            });
        }

        logAiActivity(
            "SUCCESS",
            "NORMALIZE",
            `Parsed: ${String(data.text || "").slice(0, 30)}...`
        );
        return data;
    } catch (error) {
        logAiActivity("ERROR", "NORMALIZE", error?.message || String(error));
        console.error("AI Normalization Error:", error);
        throw error;
    }
}

export async function splitTextToCandidates(
    fileBuffer,
    mimeType = "application/pdf",
    onProgress
) {
    const prompt = `
Extract ALL SAT questions from this PDF.
Separate each question with "---QUESTION_START---".

IMPORTANT EXTRACTION RULES:
    1. EXCLUDE all UI - related text such as "Mark for Review", "Question X of Y", "Directions", or page footer / header metadata.
2. DO NOT transcribe detailed tables or complex diagrams in full.Instead, simply note their presence if they contain textual labels and focus on the question / passage text. 
3. The user uploads separate images for tables / diagrams, so only extract the core question stem and reading passage.
4. Keep the output clean of OCR noise and non - academic text.
5. ANSWER KEYS: If you find an Answer Key at the end of the document, you MUST map the correct answer to its corresponding question.For EACH question that you extract, append the matched answer from the Answer Key at the very end of the question's text chunk in this exact format: "CORRECT ANSWER: [A/B/C/D or numeric value]".
`;

    try {
        const request = buildPdfRequestOrThrow(fileBuffer, mimeType, prompt);

        console.log(
            "DEBUG: Sending PDF request to Vertex AI (gemini-2.5-flash)..."
        );
        const startTime = Date.now();

        // Use retry wrapper (PDF calls hit 429 most often)
        const result = await generateWithRetry(request, onProgress);

        console.log(`DEBUG: Received response in ${Date.now() - startTime} ms.`);

        const response = result.response;
        const text = extractTextFromVertexResponse(response);

        // DEBUG: Save raw extraction to file for user inspection
        try {
            const debugFilePath = path.join(__dirname, "../../last_extraction.txt");
            fs.writeFileSync(debugFilePath, text);
            console.log(`DEBUG: Saved raw extraction to ${debugFilePath} `);
        } catch (e) {
            console.error("Failed to save debug extraction:", e);
        }

        console.log(`DEBUG: Extracted text length: ${text.length} `);

        const questions = text
            .split("---QUESTION_START---")
            .map((q) => sanitizeAiText(q.trim()))
            .filter((q) => q.length > 50);

        logAiActivity(
            "SUCCESS",
            "PDF_SPLIT",
            `Extracted ${questions.length} questions.`
        );
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
        const result = await generateWithRetry(request);
        const text = extractTextFromVertexResponse(result.response);

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
Provide a deep pedagogical synthesis including a skill-by-skill breakdown, a roadmap for improvement, and an overall readiness score.

RESPONSES:
${JSON.stringify(responses, null, 2)}

CATEGORIES TO ANALYZE (Map results to these):
- Information and Ideas (Reading)
- Craft and Structure (Reading/Writing)
- Expression of Ideas (Writing)
- Standard English Conventions (Grammar)
- Heart of Algebra (Algebra)
- Problem Solving and Data Analysis (Statistics/Modeling)
- Passport to Advanced Math (Functions/Advanced Equations)
- Geometry and Trigonometry

OUTPUT FORMAT (Strict JSON):
{
  "mastery_score": 85, // Scale 0-100 indicating overall readiness for the SAT
  "encouragement": "A high-energy, motivational one-liner tailored to their performance level.",
  "overall_critique": "A professional, pedagogical summary (3-4 sentences) analyzing their test-taking strategy, common pitfalls, and conceptual gaps.",
  "skill_breakdown": [
    {
      "skill": "Skill Name From Categories List",
      "mastery": 70, // 0-100 score
      "insight": "Explain specific patterns observed (e.g., 'Struggles with punctuation in complex sentences')."
    }
  ],
  "roadmap": [
    {
      "step": 1,
      "title": "Clear Objective",
      "action": "Specific, actionable instruction (e.g., 'Review Circle Theorems on Khan Academy for 20 mins')."
    }
  ]
}

RULES:
1. Output ONLY the JSON object.
2. Be technical yet encouraging.
3. If specific question data is missing for a category, omit it.
4. ROADMAP: Steps must be sequential and focus on the weakest skills first.
5. CALCULATION: The mastery_score should be a weighted average of their performance, not just a count.
`;

    try {
        const request = buildTextRequestOrThrow(prompt);
        const result = await generateWithRetry(request);
        const text = extractTextFromVertexResponse(result.response);

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
