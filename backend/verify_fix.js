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

async function verify() {
    console.log("Starting Verification...");

    // 1. Create a Dummy Test
    const { data: test, error: testError } = await supabase
        .from("tests")
        .insert({
            title: "Verification Test " + Date.now(),
            status: "draft",
            is_olympiad: false
        })
        .select()
        .single();

    if (testError) throw new Error("Failed to create test: " + testError.message);
    console.log(`Created Test: ${test.id}`);

    // 2. Create a Dummy Import Job linked to this test
    const { data: job, error: jobError } = await supabase
        .from("import_jobs")
        .insert({
            filename: "test.pdf",
            status: "review_required",
            destination_test_id: test.id,
            config: {
                subject: "math",
                module: "m1"
            }
        })
        .select()
        .single();

    if (jobError) throw new Error("Failed to create job: " + jobError.message);
    console.log(`Created Job: ${job.id}`);

    // 3. Create a Dummy Candidate
    const { data: candidate, error: candError } = await supabase
        .from("import_candidates")
        .insert({
            job_id: job.id,
            status: "review_required",
            raw_text: "Target Question",
            normalized_json: {
                text: "What is 2+2?",
                correct_answer: "B",
                options: ["1", "4", "3", "5"],
                subject: "math",
                module: "m1" // Should be overridden by job config if present
            }
        })
        .select()
        .single();

    if (candError) throw new Error("Failed to create candidate: " + candError.message);
    console.log(`Created Candidate: ${candidate.id}`);

    // 4. Simulate Approval API Call (using local logic simulation since we can't easily call running express app from here without fetch)
    // We will replicate the logic we modified in server.js to ensure it works against the DB

    const editData = {
        ...candidate.normalized_json,
        image_url: "https://example.com/image.png",
        option_images: ["img1", "img2"]
    };

    console.log("Simulating Approval with Image...");

    // LOGIC FROM SERVER.JS
    const subjectToUse = job.config.subject || editData.subject; // Should be 'math'
    const moduleToUse = job.config.module || editData.module || 'm1'; // Should be 'm1'

    const { data: question, error: qError } = await supabase
        .from("questions")
        .insert({
            text: editData.text,
            options: editData.options,
            answer: editData.correct_answer,
            subject: subjectToUse,
            module: moduleToUse,
            image_url: editData.image_url,
            option_images: editData.option_images,
            test_id: test.id // Direct link field
        })
        .select()
        .single();

    if (qError) throw new Error("Question insert failed: " + qError.message);
    console.log(`Created Question: ${question.id}`);

    // Link to test_questions
    const { error: linkError } = await supabase.from("test_questions").insert({
        test_id: test.id,
        question_id: question.id,
        order_index: 1
    });

    if (linkError) throw new Error("Link failed: " + linkError.message);
    console.log("Linked to Test Questions");

    // 5. Verify Data
    const { data: finalQ } = await supabase.from("questions").select("*").eq("id", question.id).single();
    const { data: finalLink } = await supabase.from("test_questions").select("*").eq("test_id", test.id).eq("question_id", question.id).single();

    console.log("\n--- VERIFICATION RESULTS ---");
    console.log(`Image URL Saved: ${finalQ.image_url === "https://example.com/image.png" ? "YES" : "NO"} (${finalQ.image_url})`);
    console.log(`Test Linkage: ${finalLink ? "YES" : "NO"}`);
    console.log(`Subject: ${finalQ.subject}`);
    console.log(`Module: ${finalQ.module}`);

    // Cleanup
    await supabase.from("test_questions").delete().eq("test_id", test.id);
    await supabase.from("questions").delete().eq("id", question.id);
    await supabase.from("import_candidates").delete().eq("id", candidate.id);
    await supabase.from("import_jobs").delete().eq("id", job.id);
    await supabase.from("tests").delete().eq("id", test.id);
    console.log("\nCleanup Complete");
}

verify().catch(console.error);
