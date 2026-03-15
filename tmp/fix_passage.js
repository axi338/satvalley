import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "d:/satvalley-main/backend/.env" });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixPassage() {
    const { data, error } = await supabase
        .from("questions")
        .update({
            passage: "The function $f(x) = ax^2 + bx + c$ has a vertex at $(2, 23)$."
        })
        .eq("id", "1c9c00de-2688-4033-bb3a-1176e28d95b4");

    if (error) {
        console.error("Error updating question:", error);
    } else {
        console.log("Successfully updated question passage.");
    }
}

fixPassage();
