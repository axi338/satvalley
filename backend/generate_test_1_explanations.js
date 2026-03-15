
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
            maxOutputTokens: 3000,
        }
    });

    const styleGuide = fs.readFileSync(path.join(__dirname, 'explanation_style_guide.md'), 'utf-8');
    const questions = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_1_questions.json'), 'utf-8'));

    console.log(`Starting ROBUST explanation generation...`);

    // Prioritize TBD questions first
    const sortedQuestions = [...questions].sort((a, b) => {
        const aTbd = !a.answer || a.answer === 'TBD';
        const bTbd = !b.answer || b.answer === 'TBD';
        if (aTbd && !bTbd) return -1;
        if (!aTbd && bTbd) return 1;
        return 0;
    });

    for (let i = 0; i < sortedQuestions.length; i++) {
        const q = sortedQuestions[i];

        // High-quality threshold: 600 chars AND includes 'incorrect' analysis
        const hasGoodExpla = q.explanation && q.explanation.includes('incorrect') && q.explanation.length > 600;
        const hasGoodAnswer = q.answer && q.answer !== 'TBD';

        if (hasGoodExpla && hasGoodAnswer) {
            continue;
        }

        console.log(`[${i + 1}/${sortedQuestions.length}] Generating DEEP explanation for question ${q.id} (Current Answer: ${q.answer})...`);

        const prompt = `
        You are an expert SAT tutor. Write a COMPREHENSIVE, pedagogical explanation for this question. 
        
        REQUIRED FORMAT:
        CORRECT ANSWER: [Just the letter A, B, C, or D, or the numeric value]
        EXPLANATION: [Full multi-paragraph explanation text]

        RULES:
        1. STRUCTURE: 
           - Part 1: Start with "Choice [Letter] is the best answer because..." and provide a detailed, step-by-step reasoning (at least 2 paragraphs).
           - Part 2: Provide an explicit section: "Choice A is incorrect because...", "Choice B is incorrect because...", etc. for EVERY incorrect option.
        2. DEPTH: Be pedagogical and encouraging. Use at least 300 words.
        3. MATH: Use LaTeX ($...$) for ALL math notation.
        4. VERIFICATION: Independently solve the question. Correct the answer if it is "TBD" or wrong.

        === STYLE GUIDE ===
        ${styleGuide}

        === QUESTION DATA ===
        SUBJECT: ${q.subject}
        PASSAGE: ${q.passage || 'None'}
        QUESTION: ${q.text}
        OPTIONS: ${JSON.stringify(q.options)}
        CORRECT ANSWER: ${q.answer || 'MISSING'}

        BEGIN RESPONSE:
        `;

        try {
            const request = {
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            };
            const result = await model.generateContent(request);
            const response = await result.response;
            const text = response.candidates[0].content.parts[0].text.trim();

            // Even more robust parsing (handles A-D, negative numbers, decimals, fractions)
            const answerMatch = text.match(/CORRECT\s*ANSWER:\s*([A-D]|[\d\.\/\-]+)/i);
            const explanationMatch = text.match(/EXPLANATION:\s*([\s\S]+)/i);

            if (!answerMatch || !explanationMatch) {
                console.warn(`[${q.id}] Parsing failed. Raw output snippet:\n${text.substring(0, 200)}...`);
                continue;
            }

            const finalAnswer = answerMatch[1].trim().toUpperCase();
            const explanation = explanationMatch[1].trim();

            console.log(`[${q.id}] Parsed Answer: ${finalAnswer}, Length: ${explanation.length}`);

            // Find original question index and update
            const originalIdx = questions.findIndex(orig => orig.id === q.id);
            if (originalIdx !== -1) {
                questions[originalIdx].explanation = explanation;
                questions[originalIdx].answer = finalAnswer;
            }

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
                console.log(`[${i + 1}/${sortedQuestions.length}] Successfully updated question ${q.id}`);
            }

            // Save progress locally
            fs.writeFileSync(path.join(__dirname, 'test_1_questions.json'), JSON.stringify(questions, null, 2));

            // small delay
            await new Promise(r => setTimeout(r, 500));

        } catch (err) {
            console.error(`Error processing question ${q.id}:`, err);
        }
    }

    console.log('All questions refined!');
}

generateExplanations().catch(console.error);