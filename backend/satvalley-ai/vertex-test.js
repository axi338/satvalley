import { VertexAI } from "@google-cloud/vertexai";
import { logAiActivity } from "./src/logger.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, "../.env") });

async function testVertexAI() {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_LOCATION || "us-central1";

    console.log("Project ID:", project);
    console.log("Location:", location);

    if (!project) throw new Error("GOOGLE_CLOUD_PROJECT is not set");

    const vertexAI = new VertexAI({ project, location });
    const generativeModel = vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    console.log("DEBUG: Sending request to Vertex AI (model: gemini-2.5-flash)...");

    const result = await generativeModel.generateContent({
        contents: [
            {
                role: "user",
                parts: [{ text: "Reply with exactly: OK" }],
            },
        ],
    });

    const response = result.response; // no need to await
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    console.log("MODEL OUTPUT:", text.trim());
    logAiActivity("SUCCESS", "TEST_RUN", `Model output: ${text.trim()}`);
}

testVertexAI().catch(async (e) => {
    console.error("\n--- ERROR DETECTED ---");
    logAiActivity("ERROR", "TEST_RUN", e?.message || String(e));
    console.error("DETAILS:", e?.message || e);
    await new Promise((r) => setTimeout(r, 500));
    process.exit(1);
});
