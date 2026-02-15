import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Lazy initialization - only create VertexAI when actually needed
// This prevents server crashes when GOOGLE_CLOUD_PROJECT env var is missing
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
            console.log(`DEBUG: Using explicit key file: ${keyPath}`);
            vertexInit.googleAuthOptions = { keyFilename: keyPath };
        }

        vertexAI = new VertexAI(vertexInit);
        model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    }
    return model;
}

/**
 * Normalizes a raw question text into a structured JSON format.
 */
export async function normalizeQuestion(rawText) {
    const prompt = `
    You are an expert SAT question parser. Your task is to convert the following raw text into a strict JSON object following the schema below.
    
    RAW TEXT:
    """
    ${rawText}
    """
    
    SCHEMA:
    {
      "text": "The question stem. If there is a graph/table described in the raw text, include that description here.",
      "passage": "Any reading passage or detailed description of a graph/table/image associated with the question (null if none)",
      "type": "multiple-choice or spr (spr is for math questions without options)",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "The correct option (A, B, C, D) or the numeric value for SPR",
      "explanation": "Brief explanation of the answer",
      "subject": "math or rw",
      "difficulty": "easy, medium, hard",
      "skill_tags": ["tag1", "tag2"],
      "bbox": [ymin, xmin, ymax, xmax] // Array of numbers or null
    }
    
    RULES:
    1. Output ONLY the JSON object.
    2. If the raw text contains multiple questions, only process the first one.
    3. Ensure "subject" is lowercase.
    4. If it is a math question without options, set "type" to "spr" and "options" to null.
    5. If options are not clearly labeled, infer them from the text and set "type" to "multiple-choice".
    6. PRESERVE ALL GRAPH/IMAGE DESCRIPTIONS found in the text.
    7. EXTRACT the [bbox: ...] tag from raw text and put it in the "bbox" field as an array of integers.
    8. DETERMINE SUBJECT:
       - If the question involves calculation, algebra, geometry, or data analysis -> "math"
       - If the question involves reading a passage, grammar, vocabulary, or rhetorics -> "rw"
    `;

    try {
        const aiModel = getModel();
        const result = await aiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.candidates[0].content.parts[0].text;

        // Clean markdown code blocks if present
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('No valid JSON found in response');
    } catch (error) {
        console.error('AI Normalization Error:', error);
        throw error;
    }
}

/**
 * Processes a PDF buffer directly to extract question candidates using Multimodal AI.
 * Replaces the old text-only splitting logic.
 */
export async function processPdfCandidates(fileBuffer, mimeType = 'application/pdf') {
    const prompt = `
    You are an expert SAT exam digitizer.
    Your task is to extract ALL questions from this document.
    
    CRITICAL INSTRUCTION FOR IMAGES/GRAPHS:
    - You must specificially look for graphs, tables, and diagrams.
    - When you find one, you MUST include a textual description of it in the question text.
    - NEW: You MUST also provide the BOUNDING BOX coordinates of the diagram on the page.
    - Format: [bbox: ymin, xmin, ymax, xmax] (on a scale of 0-1000)
    - Example: "[Graph: linear function...] [bbox: 150, 100, 450, 900]"
    - NEW: You MUST indiciate which Page Number (1-based) the question is on.
    - Format: [Page: X]
    
    OUTPUT FORMAT:
    Return each question separated by the delimiter "---QUESTION_START---".
    Include the full question text, any header/passage, the image description, the BBOX, the [Page: X] tag, and all options.
    Do not output JSON yet, just the raw separated content blocks.
    `;

    try {
        const aiModel = getModel();

        const request = {
            contents: [{
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: fileBuffer.toString('base64'),
                            mimeType: mimeType
                        }
                    },
                    { text: prompt }
                ]
            }]
        };

        console.log("DEBUG: Sending request to Gemini (model: " + aiModel.model + ")...");
        const startTime = Date.now();
        const result = await aiModel.generateContent(request);
        const duration = Date.now() - startTime;
        console.log(`DEBUG: Received response from Gemini in ${duration}ms.`);

        const response = await result.response;
        // console.log("DEBUG: Response loaded."); 

        if (!response.candidates || response.candidates.length === 0) {
            console.error("DEBUG: No candidates returned!");
            return [];
        }

        const text = response.candidates[0].content.parts[0].text;
        console.log(`DEBUG: Extracted text length: ${text.length}`);

        const questions = text.split('---QUESTION_START---')
            .map(q => q.trim())
            .filter(q => q.length > 50);

        console.log(`DEBUG: Split into ${questions.length} questions.`);
        return questions;
    } catch (error) {
        console.error('AI Processing Error:', error);
        throw error;
    }
}
