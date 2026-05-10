
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    console.log("Checking profiles table schema...");
    const { data, error } = await supabase.from('profiles').select('*').limit(1);

    if (error) {
        console.error("Error accessing profiles:", error.message);
        return;
    }

    const columns = Object.keys(data[0] || {});
    if (columns.includes('is_teacher')) {
        console.log("✅ SUCCESS: 'is_teacher' column exists.");
    } else {
        console.log("❌ MISSING: 'is_teacher' column is still missing.");
        console.log("Please run: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_teacher BOOLEAN DEFAULT FALSE;");
    }
}

checkStatus();
