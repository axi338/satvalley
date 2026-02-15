import express from "express";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import * as pdf from "pdf-parse";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import { normalizeQuestion, processPdfCandidates } from "./satvalley-ai/src/processor.js";
// import { v4 as uuidv4 } from 'uuid';
// import sharp from 'sharp';
// import pdfImgConvert from 'pdf-img-convert';

dotenv.config();

// Global Crash Logger
const logCrash = (type, err) => {
  const msg = `[${new Date().toISOString()}] ${type}: ${err.message}\n${err.stack}\n\n`;
  console.error(msg); // Print to console still
  try {
    fs.appendFileSync(path.join(process.cwd(), 'crash.log'), msg);
  } catch (e) {
    console.error("Failed to write to crash.log", e);
  }
};

process.on('uncaughtException', (err) => logCrash('UNCAUGHT_EXCEPTION', err));
process.on('unhandledRejection', (reason, promise) => {
  logCrash('UNHANDLED_REJECTION', reason instanceof Error ? reason : new Error(String(reason)));
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}


const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const allowList = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://sat-valley.web.app',
    'https://satvalley.web.app',
    'https://satvalley.pages.dev',
    'https://satvalley.com',
    'https://www.satvalley.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/uploads', express.static('public/uploads'));

const verifyAdmin = async (req) => {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    throw Object.assign(new Error("Missing bearer token"), { status: 401 });
  }
  const token = match[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw Object.assign(new Error("Unauthenticated"), { status: 401 });
  }

  const email = user.email ? user.email.toLowerCase() : "";
  // Check if user has an 'admin' claim or is in the allowList
  const isAdmin = user.app_metadata?.admin === true || allowList.includes(email);

  if (isAdmin) {
    return user;
  }
  throw Object.assign(new Error("Not an admin"), { status: 403 });
};

app.get("/listUsers", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) throw error;

    const formattedUsers = users.map((u) => ({
      uid: u.id,
      email: u.email || "",
      lastLogin: u.last_sign_in_at || "",
    }));

    res.json({ users: formattedUsers });
  } catch (err) {
    const status = err.status || 401;
    res.status(status).json({
      error: status === 401 ? "unauthenticated" : "forbidden",
      message: err.message || "Unauthorized",
    });
  }
});

app.get("/api/tests", async (req, res) => {
  try {
    const { isOlympiad } = req.query;
    let query = supabase.from("tests").select("*");

    if (isOlympiad !== undefined) {
      // Convert string "true" to boolean true, or handle exact matching string
      const isOlympiadBool = isOlympiad === "true" || isOlympiad === true;
      query = query.eq("is_olympiad", isOlympiadBool);
    }

    const { status } = req.query;
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(50);

    // If error is due to missing column, return all tests (backwards compatibility)
    if (error && error.message && error.message.includes("is_olympiad")) {
      console.warn("WARN: is_olympiad column missing, returning all tests. Please run fix_database_complete.sql");
      const { data: allData, error: allError } = await supabase
        .from("tests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (allError) throw allError;
      return res.json({ tests: allData || [] });
    }

    if (error) throw error;
    res.json({ tests: data });
  } catch (err) {
    res.status(500).json({ error: "failed_to_list_tests", message: err.message });
  }
});

app.post("/api/tests", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { title, difficulty, description, sections, mathq, readingq, writingq, is_olympiad, olympiad_end_date } = req.body || {};
    if (!title) return res.status(400).json({ error: "title_required" });

    const { data, error } = await supabase
      .from("tests")
      .insert({
        title,
        difficulty: difficulty || "Medium",
        description: description || "",
        sections: sections || [],
        mathq: mathq || "0",
        readingq: readingq || "0",
        writingq: writingq || "0",
        is_olympiad: is_olympiad || false,
        olympiad_end_date: olympiad_end_date || null,
        olympiad_start_date: req.body.olympiad_start_date || new Date().toISOString(),
        status: 'draft' // Default to draft
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ test: data });
  } catch (err) {
    const status = err.status || 401;
    res.status(status).json({ error: status === 401 ? "unauthenticated" : "forbidden", message: err.message });
  }
});

app.put("/api/tests/:id", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { id } = req.params;

    // Build update object only with provided fields
    const updates = { ...req.body };
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("tests")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true, id });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "update_test_failed", message: err.message });
  }
});

app.delete("/api/tests/:id", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { id } = req.params;

    const { error } = await supabase
      .from("tests")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "delete_test_failed", message: err.message });
  }
});

app.get("/api/questions", async (req, res) => {
  try {
    const { testId, module, subject } = req.query || {};

    // If testId is provided, use the test_questions junction table
    if (testId && testId !== "undefined" && testId !== "") {
      // Query through the junction table to get linked questions
      const { data: linkedQuestions, error: linkError } = await supabase
        .from("test_questions")
        .select(`
          order_index,
          questions (*)
        `)
        .eq("test_id", testId)
        .order("order_index", { ascending: true });

      if (linkError) throw linkError;

      // Extract questions from the nested structure
      let questions = (linkedQuestions || [])
        .map(link => link.questions)
        .filter(q => q !== null);

      // Apply additional filters if provided
      if (module && module !== "undefined" && module !== "") {
        questions = questions.filter(q => q.module === module);
      }
      if (subject && subject !== "undefined" && subject !== "") {
        questions = questions.filter(q => q.subject === subject);
      }

      return res.json({ questions });
    }

    // Fallback: query questions table directly (for backward compatibility)
    let query = supabase.from("questions").select("*");

    if (module && module !== "undefined" && module !== "") {
      query = query.eq("module", module);
    }
    if (subject && subject !== "undefined" && subject !== "") {
      query = query.eq("subject", subject);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(100);

    if (error) throw error;
    res.json({ questions: data });
  } catch (err) {
    res.status(500).json({ error: "failed_to_list_questions", message: err.message });
  }
});

app.post("/api/upload", upload.single('image'), async (req, res) => {
  try {
    await verifyAdmin(req);
    if (!req.file) return res.status(400).json({ error: "no_file" });

    const fileName = `uploads/${Date.now()}-${req.file.originalname}`;

    const { data, error } = await supabase.storage
      .from("images")
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);

    res.json({ url: publicUrl });
  } catch (err) {
    res.status(500).json({ error: "upload_failed", message: err.message });
  }
});

app.post("/api/questions", async (req, res) => {
  try {
    await verifyAdmin(req);

    // Support both old format (text, answer) and new format (question_text, option_a/b/c/d, correct_answer)
    const {
      text, answer, testId, passage, options, type, module, skill, explanation, imageUrl, subject, optionImages,
      question_text, option_a, option_b, option_c, option_d, correct_answer, test_id, section, difficulty
    } = req.body || {};

    // Use new format if available, otherwise fall back to old format
    const questionText = question_text || text;
    const correctAnswer = correct_answer || answer;
    const finalTestId = test_id || testId;

    if (!questionText || !correctAnswer) {
      return res.status(400).json({ error: "question_text_and_correct_answer_required" });
    }

    // Build options array from individual options if provided
    let finalOptions = options;
    if (option_a && option_b && option_c && option_d) {
      finalOptions = [option_a, option_b, option_c, option_d];
    }

    const { data, error } = await supabase
      .from("questions")
      .insert({
        text: questionText,
        answer: correctAnswer,
        test_id: finalTestId || null,
        passage: passage || null,
        options: finalOptions || [],
        type: type || 'multiple-choice',
        module: module || 'm1',
        skill: skill || null,
        explanation: explanation || null,
        image_url: imageUrl || null,
        subject: section || subject || 'math',
        option_images: optionImages || [],
        difficulty: difficulty || 'medium'
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ question: data, success: true });
  } catch (err) {
    console.error("Error creating question:", err);
    const status = err.status || 401;
    res.status(status).json({ error: status === 401 ? "unauthenticated" : "failed_to_create_question", message: err.message });
  }
});

app.put("/api/questions/:id", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { id } = req.params;
    const { text, answer, testId, passage, options, type, module, skill, explanation, imageUrl, subject, optionImages } = req.body || {};

    const { error } = await supabase
      .from("questions")
      .update({
        text,
        answer,
        test_id: testId || null,
        passage: passage || null,
        options: options || [],
        type: type || 'multiple-choice',
        module: module || 'm1',
        skill: skill || null,
        explanation: explanation || null,
        image_url: imageUrl || null,
        subject: subject || (module?.startsWith('math') ? 'math' : 'rw'),
        option_images: optionImages || [],
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "update_failed", message: err.message });
  }
});

app.delete("/api/questions/:id", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { id } = req.params;
    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "delete_failed", message: err.message });
  }
});

app.get("/api/results", async (req, res) => {
  try {
    const { userEmail } = req.query || {};
    let query = supabase.from("results").select("*");

    if (userEmail) {
      query = query.ilike("user_email", userEmail);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ results: data });
  } catch (err) {
    res.status(500).json({ error: "failed_to_list_results", message: err.message });
  }
});

app.get("/api/olympiad/leaderboard", async (req, res) => {
  try {
    const { testId } = req.query;
    let query = supabase
      .from("results")
      .select("id, name, score, user_email, phone, created_at, photo_url, time_taken_seconds")
      .eq("is_olympiad", true);

    if (testId) {
      query = query.eq("test_id", testId);
    }

    const { data, error } = await query
      .order("score", { ascending: false })
      .order("time_taken_seconds", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) throw error;
    res.json({ leaderboard: data });
  } catch (err) {
    res.status(500).json({ error: "failed_to_fetch_leaderboard", message: err.message });
  }
});

app.post("/api/results", async (req, res) => {
  try {
    let { name: reqName, score: reqScore, improvement, note, photoUrl, userEmail, testId, responses, timeTaken } = req.body || {};
    if (!reqScore && reqScore !== 0) return res.status(400).json({ error: "score_required" });

    // Check if it's an olympiad test
    let is_olympiad = false;
    if (testId) {
      const { data: testData } = await supabase.from("tests").select("is_olympiad").eq("id", testId).single();
      if (testData?.is_olympiad) is_olympiad = true;
    }

    let olympiadPhone = null;
    let finalName = reqName || "Student";

    if (userEmail && testId) {
      // Check if already submitted
      const { data: existingResult } = await supabase
        .from("results")
        .select("id")
        .eq("test_id", testId)
        .ilike("user_email", userEmail)
        .maybeSingle();

      const isAdmin = allowList.includes(userEmail?.toLowerCase());

      // ONLY block duplicate submissions for Olympiad tests
      if (existingResult && !isAdmin && is_olympiad) {
        return res.status(400).json({ error: "already_submitted", message: "You have already submitted this test. Only one attempt is permitted." });
      }
    }

    if (is_olympiad && userEmail) {
      // 1. Get user_id and profile to capture full_name and phone
      const { data: regData } = await supabase
        .from("olympiad_registrations")
        .select("user_id")
        .eq("test_id", testId)
        .ilike("user_email", userEmail)
        .maybeSingle();

      if (regData?.user_id) {
        const { data: profileData } = await supabase
          .from("olympiad_profiles")
          .select("full_name, phone, country_code")
          .eq("id", regData.user_id)
          .maybeSingle();

        if (profileData?.full_name) {
          finalName = profileData.full_name;
        }

        if (profileData?.phone) {
          olympiadPhone = `${profileData.country_code || ''} ${profileData.phone}`.trim();
        }

        // 2. Mark registration as completed
        await supabase
          .from("olympiad_registrations")
          .update({ completed: true })
          .eq("user_id", regData.user_id)
          .eq("test_id", testId);
      }
    }

    const { data: savedResult, error: insertError } = await supabase
      .from("results")
      .insert({
        name: finalName,
        score: reqScore,
        improvement: improvement || "+0",
        note: note || "",
        photo_url: photoUrl || null,
        user_email: userEmail || null,
        phone: olympiadPhone || null,
        test_id: testId || null,
        is_olympiad: is_olympiad,
        responses: responses || [],
        time_taken_seconds: timeTaken || 0
      })
      .select()
      .single();

    if (insertError) throw insertError;
    res.json({ result: savedResult });
  } catch (err) {
    console.error("Result save error:", err);
    res.status(500).json({ error: "failed_to_save_result", message: err.message });
  }
});

app.post("/api/olympiad/register", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) throw new Error("Missing bearer token");
    const token = match[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) throw new Error("Unauthenticated");

    const { testId } = req.body;
    if (!testId) return res.status(400).json({ error: "test_id_required" });

    // Check if test exists and is olympiad
    const { data: testData, error: testError } = await supabase
      .from("tests")
      .select("is_olympiad")
      .eq("id", testId)
      .single();

    if (testError || !testData || !testData.is_olympiad) {
      return res.status(400).json({ error: "invalid_olympiad_test" });
    }

    // Check existing registration
    const { data: existing } = await supabase
      .from("olympiad_registrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("test_id", testId)
      .maybeSingle();

    if (existing) {
      return res.json({ success: true, message: "already_registered" });
    }

    const { error: insertError } = await supabase
      .from("olympiad_registrations")
      .insert({
        user_id: user.id,
        user_email: user.email,
        test_id: testId
      });

    if (insertError) throw insertError;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "registration_failed", message: err.message });
  }
});

app.get("/api/olympiad/registrations", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { testId } = req.query;

    // Fetch registrations
    let regQuery = supabase.from("olympiad_registrations").select("*");
    if (testId) {
      regQuery = regQuery.eq("test_id", testId);
    }
    const { data: regs, error: regError } = await regQuery.order("registered_at", { ascending: false });
    if (regError) throw regError;

    // Enhance with profile data
    const userIds = [...new Set(regs.map(r => r.user_id))];
    const { data: profiles, error: profError } = await supabase
      .from("olympiad_profiles")
      .select("id, full_name, phone, country_code")
      .in("id", userIds);

    const enhancedRegs = regs.map(reg => {
      const profile = profiles?.find(p => p.id === reg.user_id);
      return {
        ...reg,
        full_name: profile?.full_name || "Unverified",
        phone: profile ? `${profile.country_code} ${profile.phone}` : "No Phone"
      };
    });

    res.json({ registrations: enhancedRegs });
  } catch (e) {
    console.error("DEBUG: Fetch registrations failed:", e);
    res.status(500).json({ error: "fetch_failed", message: e.message });
  }
});

app.get("/api/olympiad/status", async (req, res) => {
  try {
    const { testId, userEmail } = req.query;
    if (!testId || !userEmail) return res.status(400).json({ error: "missing_params" });

    const [registration, result] = await Promise.all([
      supabase.from("olympiad_registrations").select("id").eq("test_id", testId).ilike("user_email", userEmail).maybeSingle(),
      supabase.from("results").select("id, score").eq("test_id", testId).ilike("user_email", userEmail).maybeSingle()
    ]);

    res.json({
      registered: !!registration.data,
      completed: !!result.data,
      score: result.data?.score,
      isAdmin: allowList.includes(userEmail?.toLowerCase())
    });
  } catch (err) {
    res.status(500).json({ error: "status_check_failed", message: err.message });
  }
});

// --- OLYMPIAD AUTH ENDPOINTS ---

app.get("/api/olympiad/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) throw new Error("Missing bearer token");
    const token = match[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthenticated");

    const { data, error } = await supabase
      .from("olympiad_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;
    res.json({ profile: data });
  } catch (err) {
    res.status(500).json({ error: "fetch_profile_failed", message: err.message });
  }
});

app.post("/api/olympiad/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) throw new Error("Missing bearer token");
    const token = match[1];

    // Debug Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth Error for token:", token.substring(0, 10) + "...");
      console.error("Supabase Error:", authError);
      throw new Error("Unauthenticated");
    }

    const { phone, country_code, full_name } = req.body;

    const { data, error } = await supabase
      .from("olympiad_profiles")
      .upsert({
        id: user.id,
        phone,
        country_code,
        full_name,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ profile: data });
  } catch (err) {
    res.status(500).json({ error: "update_profile_failed", message: err.message });
  }
});

app.post("/api/olympiad/verify-phone", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) throw new Error("Missing bearer token");
    const token = match[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthenticated");

    const { code } = req.body;

    // MOCK VERIFICATION for now
    // In real world, check SMS provider
    if (code === '123456') {
      const { data, error } = await supabase
        .from("olympiad_profiles")
        .update({
          phone_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, profile: data });
    } else {
      res.status(400).json({ error: "invalid_code", message: "Invalid OTP code" });
    }
  } catch (err) {
    res.status(500).json({ error: "verification_failed", message: err.message });
  }
});

app.put("/api/results/:id", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { id } = req.params;
    const { name, score, improvement, note, photoUrl } = req.body || {};

    const { error } = await supabase
      .from("results")
      .update({
        name: name || "Student",
        score,
        improvement: improvement || "+0",
        note: note || "",
        photo_url: photoUrl || null
      })
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "update_result_failed", message: err.message });
  }
});

app.delete("/api/results/:id", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { id } = req.params;
    const { error } = await supabase
      .from("results")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "delete_result_failed", message: err.message });
  }
});


// --- SAT IMPORT PIPELINE ENDPOINTS ---

app.post("/api/admin/import/upload", upload.single('file'), async (req, res) => {
  try {
    const user = await verifyAdmin(req);
    if (!req.file) return res.status(400).json({ error: "no_file" });

    const { testId, testType } = req.body;

    // 1. Create Import Job
    const { data: job, error: jobError } = await supabase
      .from("import_jobs")
      .insert({
        admin_id: user.id,
        filename: req.file.originalname,
        status: 'extracting',
        destination_test_id: testId || null,
        config: { testType: testType || 'sat-math' }
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // 2. Respond immediately to the client
    res.json({ success: true, jobId: job.id });

    // 3. Background process (Direct PDF -> Multimodal AI)
    (async () => {
      try {
        await supabase.from("import_jobs").update({ status: 'candidate_split' }).eq("id", job.id);

        // We now pass the buffer directly to Gemini 1.5 Flash
        // It handles PDF parsing and image extraction natively
        const candidates = await processPdfCandidates(req.file.buffer, req.file.mimetype);

        await supabase.from("import_jobs").update({
          status: 'normalizing',
          total_questions: candidates.length,
          processed_questions: 0
        }).eq("id", job.id);

        let successCount = 0;
        const results = [];

        // Pre-convert PDF to images (Optionally optimization: do this once per page if we track page numbers)
        // For now, simpler to do on demand or just load the doc once.
        // Actually processing PDF to images is heavy. 
        // Let's assume Gemini returns the result. But Gemini doesn't return page numbers reliably unless asked.
        // Simplification: We will only support cropping if we know the page number. 
        // Wait, the current prompt doesn't ask for Page Number. 
        // Let's update the prompt in processor.js? No, let's just try to match text?
        // Actually, without page number, we can't crop from the correct page.
        // Gemini 1.5 Flash *can* return page numbers. 

        // Let's skip complex cropping for this iteration and just save the bbox for now? 
        // No, user wants IMAGES. 

        // REVISION: We need page numbers. 
        // Updated plan inside this tool call: I will assume the prompt *will* return Page Number if I add it to the prompt later.
        // But for now, let's implement the logic assuming we can get the image.

        // ALTERNATIVE: Use the image directly if Gemini could return it (it can't).

        // CRITICAL FIX: I need to update processor.js to ask for PAGE NUMBER too.
        // for now, let's implement the loop and logic.

        for (const candidateText of candidates) {
          try {
            const normalized = await normalizeQuestion(candidateText);

            // Don't insert into questions table yet - wait for admin approval
            // Just save the candidate with normalized data for review
            await supabase.from("import_candidates").insert({
              job_id: job.id,
              raw_text: candidateText,
              normalized_json: normalized,
              status: 'review_required'
            });

            successCount++;
            await supabase.from("import_jobs").update({
              processed_questions: successCount
            }).eq("id", job.id);
          } catch (normError) {
            console.error("Candidate normalization failed:", normError);
          }
        }

        await supabase.from("import_jobs").update({ status: 'review_required' }).eq("id", job.id);
      } catch (err) {
        console.error("Background import processing failed:", err);
        await supabase.from("import_jobs").update({
          status: 'failed',
          error_message: err.message
        }).eq("id", job.id);
      }
    })();

  } catch (err) {
    console.error("Import upload error:", err);
    res.status(500).json({ error: "import_failed", message: err.message });
  }
});

app.get("/api/admin/import/jobs", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { data, error } = await supabase
      .from("import_jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ jobs: data });
  } catch (err) {
    res.status(500).json({ error: "list_jobs_failed", message: err.message });
  }
});

app.get("/api/admin/import/jobs/:id/candidates", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { id } = req.params;
    const { data, error } = await supabase
      .from("import_candidates")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.json({ candidates: data });
  } catch (err) {
    res.status(500).json({ error: "list_candidates_failed", message: err.message });
  }
});

app.post("/api/admin/import/candidates/:id/approve", async (req, res) => {
  const logFile = path.join(path.resolve(), 'backend_debug.log');
  const log = (msg) => {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(logFile, line);
  };

  try {
    log(`DEBUG: Received POST /api/admin/import/candidates/${req.params.id}/approve`);
    await verifyAdmin(req);
    const { id } = req.params;
    const { editData } = req.body;

    // 1. Get candidate
    const { data: candidate, error: fetchError } = await supabase
      .from("import_candidates")
      .select("*, import_jobs(destination_test_id)")
      .eq("id", id)
      .single();

    if (fetchError) {
      log(`DEBUG: Candidate fetch error: ${JSON.stringify(fetchError)}`);
      throw fetchError;
    }

    const rawData = editData || candidate.normalized_json;
    log(`DEBUG: rawData: ${JSON.stringify(rawData)}`);

    // Robust Normalization
    const questionData = {
      text: rawData.text || "No question text provided.",
      passage: rawData.passage || null,
      answer: String(rawData.correct_answer || "TBD"),
      explanation: rawData.explanation || "",
      subject: rawData.subject || "math",
      difficulty: rawData.difficulty || "medium",
      type: rawData.type || "multiple-choice",
      tags: rawData.skill_tags || []
    };

    // Ensure options is an array or null
    let finalOptions = rawData.options;
    if (finalOptions && typeof finalOptions === 'object' && !Array.isArray(finalOptions)) {
      log("DEBUG: Converting options object to array");
      finalOptions = Object.values(finalOptions);
    }
    questionData.options = finalOptions || (questionData.type === 'multiple-choice' ? ["", "", "", ""] : null);

    log(`DEBUG: Normalized questionData for insert: ${JSON.stringify(questionData)}`);

    // 2. Insert into questions table
    const testId = candidate.import_jobs?.destination_test_id;

    const { data: question, error: qError } = await supabase
      .from("questions")
      .insert({
        text: questionData.text,
        passage: questionData.passage,
        options: questionData.options,
        answer: questionData.answer,
        explanation: questionData.explanation,
        subject: questionData.subject,
        type: questionData.type,
        skill: rawData.skill_tags ? rawData.skill_tags.join(', ') : null,
        test_id: testId || null,
        module: rawData.module || 'm1'
      })
      .select()
      .single();

    if (qError) {
      log(`DEBUG: Question insert error: ${JSON.stringify(qError)}`);
      throw qError;
    }

    // 3. Link to test if destination_test_id exists
    if (testId) {
      // Get current max order
      const { data: currentQuestions, error: orderError } = await supabase
        .from("test_questions")
        .select("order_index")
        .eq("test_id", testId)
        .order("order_index", { ascending: false })
        .limit(1);

      if (orderError) log(`DEBUG: Order lookup error: ${JSON.stringify(orderError)}`);

      const nextOrder = (currentQuestions?.[0]?.order_index ?? -1) + 1;
      log(`DEBUG: Linking question ${question.id} to test ${testId} at index ${nextOrder}`);

      const { error: linkError } = await supabase.from("test_questions").insert({
        test_id: testId,
        question_id: question.id,
        order_index: nextOrder
      });

      if (linkError) log(`DEBUG: Linking error: ${JSON.stringify(linkError)}`);
      else log("DEBUG: Link successful.");
    }

    // 4. Update candidate status
    await supabase.from("import_candidates").update({ status: 'approved' }).eq("id", id);

    res.json({ success: true, questionId: question.id });
  } catch (err) {
    log(`DEBUG: Approval error: ${err.message}`);
    log(`DEBUG: Approval error details: ${JSON.stringify(err, null, 2)}`);
    res.status(500).json({
      error: "approval_failed",
      message: err.message,
      details: err.details || null,
      code: err.code || null
    });
  }
});

app.post("/api/admin/import/candidates/:id/reject", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { id } = req.params;
    await supabase.from("import_candidates").update({ status: 'rejected' }).eq("id", id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "rejection_failed", message: err.message });
  }
});


app.get("/api/content", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("site_content")
      .select("*");

    if (error) {
      // If table doesn't exist, return empty
      if (error.code === '42P01' || error.message.includes("does not exist")) {
        return res.json({ content: {} });
      }
      throw error;
    }

    // Convert array of {key, value} to object { key: value }
    const contentMap = {};
    data.forEach(item => {
      contentMap[item.key] = item.value;
    });

    res.json({ content: contentMap });
  } catch (err) {
    console.error("Content fetch failed:", err);
    res.status(500).json({ error: "fetch_content_failed", message: err.message });
  }
});

app.post("/api/content", async (req, res) => {
  try {
    await verifyAdmin(req);
    const updates = req.body; // Expect object { key: value, key2: value2 }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "no_updates_provided" });
    }

    const { error } = await supabase
      .from("site_content")
      .upsert(
        Object.entries(updates).map(([key, value]) => ({
          key,
          value,
          updated_at: new Date().toISOString()
        }))
      );

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("Content update failed:", err);
    res.status(500).json({ error: "update_content_failed", message: err.message });
  }
});

// --- VOCABULARY MASTER ENDPOINTS ---

// Helper function to verify user authentication
const verifyUser = async (req) => {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    throw Object.assign(new Error("Missing bearer token"), { status: 401 });
  }
  const token = match[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw Object.assign(new Error("Unauthenticated"), { status: 401 });
  }
  return user;
};

// Get all vocabulary sets for a user
app.get("/api/vocabulary/sets", async (req, res) => {
  try {
    const user = await verifyUser(req);

    const { data, error } = await supabase
      .from("vocabulary_sets")
      .select("*, vocabulary_words(count)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Add word count to each set
    const setsWithCount = data.map(set => ({
      ...set,
      word_count: set.vocabulary_words?.[0]?.count || 0
    }));

    res.json({ sets: setsWithCount });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "fetch_sets_failed", message: err.message });
  }
});

// Create a new vocabulary set
app.post("/api/vocabulary/sets", async (req, res) => {
  const logFile = path.join(__dirname, 'backend_debug.log');
  const log = (msg) => {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(logFile, line);
  };

  try {
    log("DEBUG: Received POST /api/vocabulary/sets");
    log(`DEBUG: Body: ${JSON.stringify(req.body)}`);

    // Check Auth Header explicitly
    const authHeader = req.headers.authorization;
    log(`DEBUG: Auth Header: ${authHeader ? 'Present' : 'Missing'}`);

    const user = await verifyUser(req);
    log(`DEBUG: User verified: ${user.id}`);

    const { title, description, coverImageUrl } = req.body;

    if (!title) {
      log("DEBUG: Missing title");
      return res.status(400).json({ error: "title_required" });
    }

    log(`DEBUG: Inserting user_id: ${user.id}`);

    const { data, error } = await supabase
      .from("vocabulary_sets")
      .insert({
        user_id: user.id,
        title,
        description: description || "",
        cover_image_url: coverImageUrl || null
      })
      .select()
      .single();

    if (error) {
      log(`DEBUG: Supabase Insert Error: ${JSON.stringify(error)}`);
      throw error;
    }

    log(`DEBUG: Set created successfully: ${JSON.stringify(data)}`);
    res.json({ set: data });
  } catch (err) {
    log(`DEBUG: Route Error: ${err.message}`);
    log(`DEBUG: Route Error Stack: ${err.stack}`);
    const status = err.status || 500;
    res.status(status).json({ error: "create_set_failed", message: err.message });
  }
});

// Update a vocabulary set
app.put("/api/vocabulary/sets/:id", async (req, res) => {
  try {
    const user = await verifyUser(req);
    const { id } = req.params;
    const { title, description, coverImageUrl } = req.body;

    const updates = {
      updated_at: new Date().toISOString()
    };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (coverImageUrl !== undefined) updates.cover_image_url = coverImageUrl;

    const { error } = await supabase
      .from("vocabulary_sets")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    res.json({ success: true, id });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "update_set_failed", message: err.message });
  }
});

// Delete a vocabulary set
app.delete("/api/vocabulary/sets/:id", async (req, res) => {
  try {
    const user = await verifyUser(req);
    const { id } = req.params;

    const { error } = await supabase
      .from("vocabulary_sets")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    res.json({ success: true, id });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "delete_set_failed", message: err.message });
  }
});

// Get all words in a set
app.get("/api/vocabulary/sets/:id/words", async (req, res) => {
  try {
    const user = await verifyUser(req);
    const { id } = req.params;

    // Verify user owns this set
    const { data: setData, error: setError } = await supabase
      .from("vocabulary_sets")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (setError || !setData) {
      return res.status(404).json({ error: "set_not_found" });
    }

    const { data, error } = await supabase
      .from("vocabulary_words")
      .select("*")
      .eq("set_id", id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ words: data });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "fetch_words_failed", message: err.message });
  }
});

// Add a word to a set
app.post("/api/vocabulary/sets/:id/words", async (req, res) => {
  try {
    const user = await verifyUser(req);
    const { id } = req.params;
    const { word, definition, example, theme, mastered } = req.body;

    if (!word || !definition) {
      return res.status(400).json({ error: "word_and_definition_required" });
    }

    // Verify user owns this set
    const { data: setData, error: setError } = await supabase
      .from("vocabulary_sets")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (setError || !setData) {
      return res.status(404).json({ error: "set_not_found" });
    }

    const { data, error } = await supabase
      .from("vocabulary_words")
      .insert({
        set_id: id,
        word,
        definition,
        example: example || "",
        theme: theme || "Standard",
        mastered: mastered || false
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ word: data });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "add_word_failed", message: err.message });
  }
});

// Update a word
app.put("/api/vocabulary/words/:id", async (req, res) => {
  try {
    const user = await verifyUser(req);
    const { id } = req.params;
    const { word, definition, example, theme, mastered } = req.body;

    const updates = {
      updated_at: new Date().toISOString()
    };
    if (word !== undefined) updates.word = word;
    if (definition !== undefined) updates.definition = definition;
    if (example !== undefined) updates.example = example;
    if (theme !== undefined) updates.theme = theme;
    if (mastered !== undefined) updates.mastered = mastered;

    // Verify user owns the set containing this word
    const { data: wordData, error: wordError } = await supabase
      .from("vocabulary_words")
      .select("set_id")
      .eq("id", id)
      .single();

    if (wordError || !wordData) {
      return res.status(404).json({ error: "word_not_found" });
    }

    const { data: setData, error: setError } = await supabase
      .from("vocabulary_sets")
      .select("id")
      .eq("id", wordData.set_id)
      .eq("user_id", user.id)
      .single();

    if (setError || !setData) {
      return res.status(403).json({ error: "unauthorized" });
    }

    const { error } = await supabase
      .from("vocabulary_words")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true, id });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "update_word_failed", message: err.message });
  }
});

// Delete a word
app.delete("/api/vocabulary/words/:id", async (req, res) => {
  try {
    const user = await verifyUser(req);
    const { id } = req.params;

    // Verify user owns the set containing this word
    const { data: wordData, error: wordError } = await supabase
      .from("vocabulary_words")
      .select("set_id")
      .eq("id", id)
      .single();

    if (wordError || !wordData) {
      return res.status(404).json({ error: "word_not_found" });
    }

    const { data: setData, error: setError } = await supabase
      .from("vocabulary_sets")
      .select("id")
      .eq("id", wordData.set_id)
      .eq("user_id", user.id)
      .single();

    if (setError || !setData) {
      return res.status(403).json({ error: "unauthorized" });
    }

    const { error } = await supabase
      .from("vocabulary_words")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true, id });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "delete_word_failed", message: err.message });
  }
});

// Upload vocabulary set cover image
app.post("/api/vocabulary/upload-image", upload.single('image'), async (req, res) => {
  try {
    const user = await verifyUser(req);
    if (!req.file) return res.status(400).json({ error: "no_file" });

    const fileName = `vocabulary/${user.id}/${Date.now()}-${req.file.originalname}`;

    const { data, error } = await supabase.storage
      .from("images")
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);

    res.json({ url: publicUrl });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "upload_failed", message: err.message });
  }
});



// Serve static files from the 'dist' directory (Vite build)
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Serve static files from 'dist' (root) or '../dist' (if running from backend/)
// Try root dist first (Docker/local standard)
let distPath = path.join(__dirname, "dist");
// Check if it exists, if not try ../dist (Node native deployment)

if (!fs.existsSync(distPath)) {
  distPath = path.join(__dirname, "../dist");
}

console.log("DEBUG: Current __dirname:", __dirname);
console.log("DEBUG: Resolved distPath:", distPath);
if (fs.existsSync(distPath)) {
  console.log("DEBUG: Dist contents:", fs.readdirSync(distPath));
} else {
  console.error("DEBUG: DIST FOLDER NOT FOUND!");
}

app.use(express.static(distPath));

app.get("/api/settings", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .single();

    if (error) {
      // PGRST116: No rows found
      // 42P01: Table does not exist (PostgreSQL)
      // code 404: Table not found (PostgREST)
      const isMissingTable = error.code === 'PGRST116' ||
        error.status === 404 ||
        (error.message && (
          error.message.includes("relation \"settings\" does not exist") ||
          error.message.includes("schema cache") ||
          error.message.includes("not found")
        ));

      if (isMissingTable) {
        console.log("Settings table missing or empty, returning defaults.");
        return res.json({ settings: { high_scores: 42, score_variance: "+178", architectural_mean: 1547 } });
      }
      throw error;
    }
    res.json({ settings: data || { high_scores: 42, score_variance: "+178", architectural_mean: 1547 } });
  } catch (err) {
    console.error("Settings GET error:", err);
    res.status(500).json({ error: "failed_to_get_settings", message: err.message });
  }
});

app.put("/api/settings", async (req, res) => {
  try {
    console.log("Updating settings with payload:", req.body);
    await verifyAdmin(req);
    const { high_scores, score_variance, architectural_mean } = req.body || {};

    const { data: existing, error: fetchError } = await supabase.from("settings").select("id").limit(1).maybeSingle();

    if (fetchError) {
      const isMissingTable = fetchError.status === 404 ||
        (fetchError.message && (
          fetchError.message.includes("relation \"settings\" does not exist") ||
          fetchError.message.includes("schema cache")
        ));

      if (isMissingTable) {
        return res.status(404).json({
          error: "table_not_found",
          message: "The 'settings' table does not exist in Supabase. Please run the SQL migration provided in the Admin Panel or Walkthrough."
        });
      }
      console.error("Error fetching existing settings:", fetchError);
    }

    let result;
    if (existing) {
      console.log("Updating existing settings ID:", existing.id);
      result = await supabase
        .from("settings")
        .update({
          high_scores: parseInt(high_scores),
          score_variance,
          architectural_mean: parseInt(architectural_mean),
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      console.log("No existing settings found, inserting new row.");
      result = await supabase
        .from("settings")
        .insert({
          high_scores: parseInt(high_scores),
          score_variance,
          architectural_mean: parseInt(architectural_mean)
        });
    }

    if (result.error) {
      console.error("Supabase settings update error:", result.error);
      throw result.error;
    }

    console.log("Settings successfully updated.");
    res.json({ success: true });
  } catch (err) {
    console.error("Update settings failed:", err);
    res.status(err.status || 500).json({ error: "update_settings_failed", message: err.message });
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// All other GET requests should return the index.html from 'dist'
app.get("*", (req, res) => {
  console.log("DEBUG: Hit catch-all route. Serving:", path.join(distPath, "index.html"));
  res.sendFile(path.join(distPath, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Admin backend listening on ${port}`);
});
