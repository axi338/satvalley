
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

    console.log(`Starting explanation generation for ${questions.length} questions...`);

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        // Skip if explanation is already substantial (heuristic: > 50 chars)
        if (q.explanation && q.explanation.length > 50) {
            console.log(`[${i + 1}/${questions.length}] Skipping question ${q.id} (already has explanation)`);
            continue;
        }

        console.log(`[${i + 1}/${questions.length}] Generating explanation for question ${q.id} (${q.subject})...`);

        const prompt = `
        You are an expert SAT tutor. Your task is to write a high-quality, pedagogical explanation for the following SAT question. Use the provided "Explanation Style Guide" to ensure the tone, structure, and formatting are professional.

        === EXPLANATION STYLE GUIDE ===
        ${styleGuide}

        === QUESTION DATA ===
        SUBJECT: ${q.subject}
        TYPE: ${q.type}
        PASSAGE: ${q.passage || 'None'}
        QUESTION: ${q.text}
        OPTIONS: ${JSON.stringify(q.options)}
        CORRECT ANSWER: ${q.answer}

        === INSTRUCTIONS ===
        1. Follow the Style Guide EXACTLY.
        2. Use LaTeX for ALL mathematical notation (e.g., $x^2$, $\\frac{1}{2}$). Wrap them in single dollar signs.
        3. For Spr (Student-Produced Response) questions, explain the calculation clearly.
        4. For Reading/Writing, explain the logic of the passage and why the chosen option is the best fit.
        5. Explanations must be step-by-step.
        6. Output ONLY the explanation text.

        BEGIN EXPLANATION:
        `;

        try {
            const request = {
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            };
            const result = await model.generateContent(request);
            const response = await result.response;
            const explanation = response.candidates[0].content.parts[0].text.trim();

            // Update local object
            q.explanation = explanation;

            // Update Supabase
            const { error } = await supabase
                .from('questions')
                .update({ explanation })
                .eq('id', q.id);

            if (error) {
                console.error(`Error updating database for question ${q.id}:`, error);
            } else {
                console.log(`[${i + 1}/${questions.length}] Successfully updated question ${q.id}`);
            }

            // Save progress locally after each success to be safe
            fs.writeFileSync(path.join(__dirname, 'test_1_questions.json'), JSON.stringify(questions, null, 2));

            // Small delay to be kind to rate limits
            await new Promise(r => setTimeout(r, 2000));

        } catch (err) {
            console.error(`Error processing question ${q.id}:`, err);
            // Continue to next question
        }
    }

    console.log('All questions processed!');
}

generateExplanations().catch(console.error);
