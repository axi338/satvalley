import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking questions table schema...");

    // Try to select the specific columns. If they don't exist, it should error.
    const { data, error } = await supabase
        .from("questions")
        .select("image_url, option_images")
        .limit(1);

    if (error) {
        console.log("Error selecting columns:", error.message);
        if (error.message.includes("does not exist") || error.code === 'PGRST204') {
            console.log("Columns likely missing.");
        }
    } else {
        console.log("Columns exist!");
    }
}

checkSchema().catch(console.error);
