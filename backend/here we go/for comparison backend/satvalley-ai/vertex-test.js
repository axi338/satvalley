import { VertexAI } from "@google-cloud/vertexai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

async function testVertexAI() {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_LOCATION || "us-central1";
    const modelName = "gemini-2.5-flash";

    console.log("Project:", project);
    console.log("Location:", location);
    console.log("Credentials Path:", process.env.GOOGLE_APPLICATION_CREDENTIALS);

    if (!project) throw new Error("GOOGLE_CLOUD_PROJECT not set in .env");
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS)
        throw new Error("GOOGLE_APPLICATION_CREDENTIALS not set in .env");

    const vertexAI = new VertexAI({ project, location });
    const generativeModel = vertexAI.getGenerativeModel({ model: modelName });

    const prompt = "Reply with exactly: OK";

    const resp = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text =
        resp.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    console.log("MODEL OUTPUT:", text.trim());
}

testVertexAI().catch((e) => {
    console.error("FAILED:", e?.message || e);
    process.exit(1);
});
