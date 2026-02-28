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
            model: 'gemini-1.5-flash', // Matching previous main config
            generationConfig: {
                temperature: 0.1,
                topP: 0.95,
                maxOutputTokens: 2048,
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
4. For math without options, "type": "spr" and "options": null.
5. If text contains [IMAGE], set "has_image": true and leave placeholder in text/passage.
6. EXTRACT [bbox: ...] tag into "bbox" field as array of ints.
7. DETERMINE SUBJECT: math (calc, algebra, geometry) or rw (reading, grammar).
8. Programmatic cleanup will follow, but try to avoid UI noise in the JSON.
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
    1. Extract ONLY real SAT question content.
    2. DO NOT copy any UI elements, interface text, or navigation text such as: "Mark for Review", "Back", "Next", "Question X of Y", "Go to question", "Bookmark", page numbers, section headers/footers, or any other non-question text.
    3. For GRAPHS, TABLES, CHARTS, DIAGRAMS, or any IMAGE: DO NOT describe them. Simply write [IMAGE] as a placeholder.
    4. You MUST provide the BOUNDING BOX coordinates of any diagram/graph/table/image on the page.
    - Format: [bbox: ymin, xmin, ymax, xmax] (on a scale of 0-1000)
    - Example: "[IMAGE] [bbox: 150, 100, 450, 900]"
    5. You MUST indicate which Page Number (1-based) the question is on.
    - Format: [Page: X]

    OUTPUT FORMAT:
    Return each question separated by the delimiter "---QUESTION_START---".
    Include the full question text, any reading passage text (not images), the [IMAGE] placeholder with [bbox:] if applicable, the [Page: X] tag, and all answer options.
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
        } catch (e) { }

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
