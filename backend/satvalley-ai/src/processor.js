import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const project = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.VERTEX_LOCATION || 'us-central1';

const vertexAI = new VertexAI({ project, location });
const model = vertexAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
      "text": "The question stem or stimulus",
      "passage": "Any reading passage associated with the question (null if none)",
      "type": "multiple-choice or spr (spr is for math questions without options)",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "The correct option (A, B, C, D) or the numeric value for SPR",
      "explanation": "Brief explanation of the answer",
      "subject": "math or rw",
      "difficulty": "easy, medium, hard",
      "skill_tags": ["tag1", "tag2"]
    }
    
    RULES:
    1. Output ONLY the JSON object.
    2. If the raw text contains multiple questions, only process the first one.
    3. Ensure "subject" is lowercase.
    4. If it is a math question without options, set "type" to "spr" and "options" to null.
    5. If options are not clearly labeled, infer them from the text and set "type" to "multiple-choice".
    `;

    try {
        const result = await model.generateContent(prompt);
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
 * Splits a large chunk of text into potential question candidates.
 */
export async function splitTextToCandidates(fullText) {
    const prompt = `
    Split the following text into individual SAT questions. 
    Return each question as a separate block clearly delimited by "---QUESTION_START---".
    
    TEXT:
    """
    ${fullText}
    """
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.candidates[0].content.parts[0].text;

        return text.split('---QUESTION_START---')
            .map(q => q.trim())
            .filter(q => q.length > 50); // Filter out tiny chunks
    } catch (error) {
        console.error('AI Splitting Error:', error);
        throw error;
    }
}
