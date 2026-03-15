
import { VertexAI } from '@google-cloud/vertexai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function cleanJsonResponse(text) {
    // Remove markdown code blocks
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Sometimes AI adds text before or after the JSON
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    // Fix common JSON issues like unescaped backslashes in math
    // But be careful not to break valid escapes. 
    // The most common issue is unescaped \ in \frac or \sqrt
    // We can try to escape them if they aren't part of a valid escape sequence

    return cleaned;
}

async function generateExplanations() {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_LOCATION || 'us-central1';

    if (!project) throw new Error('GOOGLE_CLOUD_PROJECT is not set');

    const vertexAI = new VertexAI({ project, location });
    const model = vertexAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
        generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            maxOutputTokens: 2048,
        }
    });

    const styleGuide = fs.readFileSync(path.join(__dirname, 'explanation_style_guide.md'), 'utf-8');
    const questions = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_1_questions.json'), 'utf-8'));

    console.log(`Starting TARGETED explanation generation for questions missing high-quality content...`);

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        // Only regenerate if it doesn't meet the "incorrect" keyword criteria
        if (q.explanation && q.explanation.includes('incorrect') && q.explanation.length > 200) {
            continue;
        }

        console.log(`[${i + 1}/${questions.length}] Generating HIGH-QUALITY explanation for question ${q.id} (${q.subject})...`);

        const prompt = `
        You are an expert SAT tutor. Your task is to write a COMPREHENSIVE, pedagogical explanation for the following SAT question. 
        You MUST follow the "Explanation Style Guide" precisely. 
        
        CRITICAL RULES:
        1. STRUCTURE: 
           - Part 1: Start with "Choice [Letter] is the best answer because..." and provide a detailed, step-by-step reasoning.
           - Part 2: Explicitly state "Choice [Letter] is incorrect because..." for EVERY single incorrect choice (A, B, C, and D except the correct one).
        2. LENGTH: The explanation must be thorough and educational. 
        3. MATH: Use LaTeX for ALL mathematical notation (e.g., $x^2$, $\\frac{a}{b}$, $y=mx+b$). Wrap them in single dollar signs.
           IMPORTANT: In your JSON response, ensure backslashes in LaTeX are double-escaped (e.g., "\\\\frac{a}{b}") so the JSON is valid.
        4. ANSWER VERIFICATION: If the "CORRECT ANSWER" provided below is missing or seems incorrect, you MUST determine the correct answer yourself and start your explanation with the correct one.
        5. FORMAT: Output your response as a JSON object with two fields: "explanation" (the full text) and "correct_answer" (the letter A, B, C, or D, or the numeric value).

        === EXPLANATION STYLE GUIDE ===
        ${styleGuide}

        === QUESTION DATA ===
        SUBJECT: ${q.subject}
        TYPE: ${q.type}
        PASSAGE: ${q.passage || 'None'}
        QUESTION: ${q.text}
        OPTIONS: ${JSON.stringify(q.options)}
        CORRECT ANSWER: ${q.answer || 'MISSING'}

        === OUTPUT FORMAT ===
        {
          "explanation": "...",
          "correct_answer": "..."
        }
        `;

        try {
            const request = {
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            };
            const result = await model.generateContent(request);
            const response = await result.response;
            const responseText = response.candidates[0].content.parts[0].text.trim();

            const cleaned = cleanJsonResponse(responseText);
            const data = JSON.parse(cleaned);
            const explanation = data.explanation;
            const finalAnswer = data.correct_answer;

            // Update local object
            q.explanation = explanation;
            q.answer = finalAnswer;

            // Update Supabase
            const { error } = await supabase
                .from('questions')
                .update({
                    explanation,
                    answer: finalAnswer
                })
                .eq('id', q.id);

            if (error) {
                console.error(`Error updating database for question ${q.id}:`, error);
            } else {
                console.log(`[${i + 1}/${questions.length}] Successfully updated question ${q.id} (Answer: ${finalAnswer})`);
            }

            // Save progress locally
            fs.writeFileSync(path.join(__dirname, 'test_1_questions.json'), JSON.stringify(questions, null, 2));

            // small delay
            await new Promise(r => setTimeout(r, 1000));

        } catch (err) {
            console.error(`Error processing question ${q.id}:`, err);
        }
    }

    console.log('All targeted questions processed with high-quality explanations!');
}

generateExplanations().catch(console.error);