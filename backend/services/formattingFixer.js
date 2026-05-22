import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

let vertexAI = null;
let model = null;

function getModel() {
    if (!model) {
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.VERTEX_LOCATION || 'us-central1';

        if (!project) {
            throw new Error('GOOGLE_CLOUD_PROJECT environment variable is not set.');
        }

        vertexAI = new VertexAI({ project, location });
        model = vertexAI.getGenerativeModel({
            model: 'gemini-2.0-flash-001',
            generationConfig: {
                temperature: 0.1,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        });
    }
    return model;
}

/**
 * Fixes the formatting of a single SAT question using Gemini.
 */
export async function fixQuestionFormatting(question) {
    const model = getModel();

    const prompt = `
You are a senior SAT content editor. Your job is to fix small formatting issues in already extracted SAT questions.
Specifically, you need to:
1. Identify phrases that should be in <strong>...</strong> (bold).
2. Identify where a blank "___" is missing in the question text.

RULES FOR ADDING <strong>:
- If the question asks about "the word X" or "the phrase X", wrap X in <strong>.
- If the question says "as used in the text", the target word in the passage/question should be bold.
- If a specific word/phrase is being analyzed or emphasized, make it bold.
- Do not bold random or common words.

RULES FOR ADDING ___ (blank):
- If the question asks "Which choice completes the text..." and one of the answer choices fits into a sentence in the passage/question, replace that phrase with ___.
- For "transition" questions, the transition word/phrase in the passage should usually be replaced with ___.
- For grammar/conventions questions, if a choice fits into a position, add ___ there.
- Do not add ___ if you are not 90% sure it belongs there.

SAFETY RULES:
- NEVER rewrite the meaning of the question.
- NEVER change the answer choices.
- The output text must be valid HTML with <strong> and <br>.
- The blank must be exactly "___".

INPUT QUESTION:
{
  "question_text": "${question.text}",
  "passage": "${question.passage || ''}",
  "choices": ${JSON.stringify(question.options || [])},
  "question_type": "${question.type || ''}",
  "subject": "${question.subject || ''}"
}

OUTPUT FORMAT (Strict JSON):
{
  "fixed_question_html": "The corrected question text with <strong> and ___ included.",
  "changes": [
    {
      "type": "blank_added" | "bold_added",
      "text": "The phrase affected",
      "reason": "Why you made this change"
    }
  ],
  "confidence": 0.0 to 1.0,
  "needs_review": true | false
}

Rules for Confidence:
- confidence >= 0.90: the fix is highly reliable.
- confidence 0.70-0.89: fix is probably correct but needs review.
- confidence < 0.70: uncertain, mark needs_review = true.

Output ONLY the JSON object.
`;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        const response = await result.response;
        const text = response.candidates[0].content.parts[0].text;

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in AI response");

        const data = JSON.parse(jsonMatch[0]);

        // Basic Safety Validation
        if (!data.fixed_question_html || typeof data.fixed_question_html !== 'string') {
            throw new Error("Invalid fixed_question_html from AI");
        }

        // Ensure choices are NOT changed (by checking if they are still in the input, 
        // essentially AI shouldn't even return choices in the output format I defined)

        // Final review check
        if (data.confidence < 0.90) {
            data.needs_review = true;
        }

        return data;
    } catch (error) {
        console.error("Error in fixQuestionFormatting:", error);
        return {
            fixed_question_html: question.text,
            changes: [],
            confidence: 0,
            needs_review: true,
            error: error.message
        };
    }
}
