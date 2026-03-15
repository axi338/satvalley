
import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function learnStyle() {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_LOCATION || 'us-central1';

    if (!project) {
        console.error('GOOGLE_CLOUD_PROJECT is not set');
        return;
    }

    const vertexAI = new VertexAI({ project, location });
    const model = vertexAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
    });

    const pdfPath = path.join(__dirname, 'sat-practice-test-8-answers-digital.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);

    const prompt = `
    Analyze the attached SAT practice test answer key and explanation document.
    Focus on the "Explanation" sections for both Reading & Writing and Math questions.
    
    Identify:
    1. The structure of the explanations (e.g., do they start with the correct answer, do they explain why others are wrong?).
    2. The tone (pedagogical, formal, concise?).
    3. How they handle mathematical notation (LaTeX-style, plain text?).
    4. Any specific keywords or phrases used frequently (e.g., "Choice A is correct because...", "Choice B is incorrect because...").

    Provide a concise "Explanation Style Guide" that I can use to generate similar explanations for other SAT questions.
    `;

    const request = {
        contents: [
            {
                role: "user",
                parts: [
                    { inlineData: { data: pdfBuffer.toString("base64"), mimeType: "application/pdf" } },
                    { text: prompt },
                ],
            },
        ],
    };

    console.log('Sending PDF to Vertex AI for analysis...');
    const result = await model.generateContent(request);
    const response = await result.response;
    const text = response.candidates[0].content.parts[0].text;

    fs.writeFileSync('explanation_style_guide.md', text);
    console.log('Style guide saved to explanation_style_guide.md');
}

learnStyle().catch(console.error);
