import { VertexAI } from "@google-cloud/vertexai";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env ONLY for local development
if (process.env.NODE_ENV !== "production") {
    dotenv.config({ path: path.join(__dirname, ".env") });
}

// If Render provides JSON, write it to a temp file and point Google SDK to it
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    const credsPath = "/tmp/gcp-sa.json";
    fs.writeFileSync(credsPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credsPath;
}

async function testVertexAI() {
    const project =
        process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

    const location =
        process.env.GOOGLE_CLOUD_LOCATION || process.env.VERTEX_LOCATION || "us-central1";

    const modelName = "gemini-2.5-flash";

    console.log("Project:", project);
    console.log("Location:", location);
    console.log("Credentials Path:", process.env.GOOGLE_APPLICATION_CREDENTIALS);

    if (!project) throw new Error("GOOGLE_CLOUD_PROJECT is not set");
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS)
        throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set (credentials not loaded)");

    const vertexAI = new VertexAI({ project, location });
    const generativeModel = vertexAI.getGenerativeModel({ model: modelName });

    const resp = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{ text: "Reply with exactly: OK" }] }],
    });

    const text = resp.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log("MODEL OUTPUT:", text.trim());
}

testVertexAI().catch((e) => {
    console.error("FAILED:", e?.message || e);
    process.exit(1);
});
