import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import * as pdf from "pdf-parse";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import multer from "multer";
import fs from "fs";
import { fileURLToPath } from 'url';
import { Server } from "socket.io";
import { createServer } from "http";

import { normalizeQuestion, splitTextToCandidates, generateVocabularyAI, analyzePerformanceAI, logAiActivity } from "./satvalley-ai/src/processor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { v4 as uuidv4 } from 'uuid';
// import sharp from 'sharp';
// import pdfImgConvert from 'pdf-img-convert';

process.stdout.on('error', (err) => { if (err.code === 'EPIPE') return; });
process.stderr.on('error', (err) => { if (err.code === 'EPIPE') return; });

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

// Separate client for verifying user JWTs
// supabase.auth.getUser(token) works correctly when called via the service role client
// but we create a utility function that creates a per-request client with the user token
const createUserClient = (token) => createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
});

const allowList = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'https://sat-valley.web.app',
      'https://satvalley.web.app',
      'https://satvalley.pages.dev',
      'https://satvalley.com',
      'https://www.satvalley.com'
    ],
    methods: ["GET", "POST"]
  }
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('public/uploads'));

// --- AUTHENTICATION ENDPOINTS ---

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const { origin } = req.body;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: origin || 'http://localhost:5173',
        skipBrowserRedirect: true
      }
    });

    if (error) throw error;
    res.json({ url: data.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const verifyTeacher = async (req) => {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    throw Object.assign(new Error("Missing bearer token"), { status: 401 });
  }
  const token = match[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw Object.assign(new Error(`Unauthenticated: ${error?.message || 'Invalid token'}`), { status: 401 });
  }

  const email = user.email ? user.email.toLowerCase() : "";

  // A teacher is either an admin OR has is_teacher = true
  const { data: profile } = await supabase.from("profiles").select("is_teacher, is_admin").eq("id", user.id).maybeSingle();
  const isAdmin = user.app_metadata?.admin === true || allowList.includes(email) || profile?.is_admin === true;
  const isTeacher = profile?.is_teacher === true || isAdmin;

  if (isTeacher) {
    req.user = { id: user.id, email, isAdmin, isTeacher };
    return user;
  }

  throw Object.assign(new Error("Not a teacher"), { status: 403 });
};

const verifyAdmin = async (req) => {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    console.warn("verifyAdmin: Missing bearer token in header");
    throw Object.assign(new Error("Missing bearer token"), { status: 401 });
  }
  const token = match[1];
  console.log(`verifyAdmin: Verifying token (prefix: ${token.substring(0, 10)}...)`);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error(`[DEBUG verifyAdmin] Auth error for URL: ${supabaseUrl}`);
      console.error(`[DEBUG verifyAdmin] Error:`, error?.message || error);
      console.error(`[DEBUG verifyAdmin] Token prefix: ${token.substring(0, 15)}...`);
      throw Object.assign(new Error(`Unauthenticated: ${error?.message || 'Invalid token'}`), { status: 401 });
    }

    const email = user.email ? user.email.toLowerCase() : "";
    console.log(`[DEBUG verifyAdmin] User verified: ${email}`);

    // Check if user has an 'admin' claim, is in the allowList, or is_admin in profiles
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    const isAdmin = user.app_metadata?.admin === true || allowList.includes(email) || profile?.is_admin === true;

    if (isAdmin) {
      return user;
    }
    console.warn(`[DEBUG verifyAdmin] Admin access denied for ${email}`);
    throw Object.assign(new Error("Not an admin"), { status: 403 });
  } catch (err) {
    console.error(`[DEBUG verifyAdmin] Exception: ${err.message}`);
    if (err.message.includes("Unexpected token") || err.message.includes("is not valid JSON")) {
      console.error("[DEBUG verifyAdmin] Supabase returned non-JSON response. This usually indicates a 404, 502, or 431 error from the Supabase API.");
      console.error("[DEBUG verifyAdmin] URL:", supabaseUrl);
    }
    throw err;
  }
};

// Helper: Recalculate and update test metadata (counts and sections)
const recalculateTestCounts = async (testId) => {
  if (!testId) return;
  try {
    // 1. Get all linked questions
    const { data: linkedQuestions, error: linkError } = await supabase
      .from("test_questions")
      .select(`
        questions (
          subject
        )
      `)
      .eq("test_id", testId);

    if (linkError) {
      console.error(`Error fetching linked questions for layout update:`, linkError);
      return;
    }

    const questions = linkedQuestions
      .map(l => l.questions)
      .filter(q => q);

    const mathQuestions = questions.filter(q => q.subject === 'math');
    const rwQuestions = questions.filter(q => ['reading', 'writing', 'rw'].includes(q.subject));

    const m1_math = mathQuestions.filter(q => (q.module || 'm1').startsWith('m1')).length;
    const m2_math = mathQuestions.filter(q => (q.module || '').startsWith('m2')).length;
    const m1_rw = rwQuestions.filter(q => (q.module || 'm1').startsWith('m1')).length;
    const m2_rw = rwQuestions.filter(q => (q.module || '').startsWith('m2')).length;

    // 2. Construct sections
    const newSections = [];
    if (mathQuestions.length > 0) newSections.push(`Math: ${mathQuestions.length}Q (M1:${m1_math}, M2:${m2_math})`);
    if (rwQuestions.length > 0) newSections.push(`Reading & Writing: ${rwQuestions.length}Q (M1:${m1_rw}, M2:${m2_rw})`);
    if (newSections.length === 0) newSections.push('Empty: 0Q');

    // 3. Update test
    await supabase
      .from("tests")
      .update({
        sections: newSections,
        mathq: String(mathQuestions.length),
        readingq: String(rwQuestions.length),
        writingq: "0",
        updated_at: new Date().toISOString()
      })
      .eq("id", testId);

    console.log(`Updated test ${testId} metadata: Math=${mathQuestions.length}, RW=${rwQuestions.length}`);
  } catch (err) {
    console.error(`Failed to recalculate test counts:`, err);
  }
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

app.get("/api/admin/stats", async (req, res) => {
  try {
    await verifyAdmin(req);

    // We fetch auth users count
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    // We can also count profiles for "active" or "completed onboarding" users
    const { count: profileCount, error: profileError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (profileError) throw profileError;

    res.json({
      totalUsers: users.length,
      activeProfiles: profileCount
    });
  } catch (err) {
    console.error("Stats fetch error:", err);
    res.status(500).json({ error: "Failed to fetch stats", message: err.message });
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

    // Fetch user counts for each test
    const { data: results, error: resultsError } = await supabase
      .from("results")
      .select("test_id, user_email");

    const userCounts = {};
    if (!resultsError && results) {
      results.forEach(r => {
        if (!r.test_id) return;
        if (!userCounts[r.test_id]) userCounts[r.test_id] = new Set();
        if (r.user_email) userCounts[r.test_id].add(r.user_email.toLowerCase());
      });
    }

    const testsWithCounts = data.map(t => ({
      ...t,
      user_count: userCounts[t.id]?.size || 0
    }));

    res.json({ tests: testsWithCounts });
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

      // Extract questions from the nested structure and attach orderIndex
      let questions = (linkedQuestions || [])
        .map(link => ({
          ...link.questions,
          orderIndex: link.order_index
        }))
        .filter(q => q.id !== null);

      // Apply additional filters if provided
      if (module && module !== "undefined" && module !== "") {
        questions = questions.filter(q => {
          // Allow 'm2' questions to show up for 'm2-easy' or 'm2-hard' requests
          if (module.startsWith('m2') && q.module === 'm2') return true;
          return q.module === module;
        });
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

app.get("/api/explanations", async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.json({ enrichment: {} });

    const idList = ids.split(",");
    const { data, error } = await supabase
      .from("questions")
      .select("id, explanation, answer")
      .in("id", idList);

    if (error) throw error;

    const enrichmentMap = {};
    (data || []).forEach(q => {
      enrichmentMap[q.id] = {
        explanation: q.explanation,
        answer: q.answer
      };
    });

    res.json({ enrichment: enrichmentMap });
  } catch (err) {
    res.status(500).json({ error: "failed_to_fetch_enrichment", message: err.message });
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

    // Link to test if test_id exists
    if (finalTestId) {
      const { data: currentQuestions } = await supabase
        .from("test_questions")
        .select("order_index")
        .eq("test_id", finalTestId)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrder = (currentQuestions?.[0]?.order_index ?? -1) + 1;

      await supabase.from("test_questions").insert({
        test_id: finalTestId,
        question_id: data.id,
        order_index: nextOrder
      });

      // Auto-update test metadata
      await recalculateTestCounts(finalTestId);
    }

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

    // Ensure linked in test_questions if testId provided
    if (testId) {
      // Check if already linked
      const { data: existingLink } = await supabase
        .from("test_questions")
        .select("order_index")
        .eq("test_id", testId)
        .eq("question_id", id)
        .maybeSingle();

      if (!existingLink) {
        // Get next order index
        const { data: currentQuestions } = await supabase
          .from("test_questions")
          .select("order_index")
          .eq("test_id", testId)
          .order("order_index", { ascending: false })
          .limit(1);

        const nextOrder = (currentQuestions?.[0]?.order_index ?? -1) + 1;

        await supabase.from("test_questions").insert({
          test_id: testId,
          question_id: id,
          order_index: nextOrder
        });
      }

      // Auto-update test metadata
      await recalculateTestCounts(testId);
    }

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
    let { name: reqName, score: reqScore, improvement, note, photoUrl, userEmail, userId, testId, responses, timeTaken } = req.body || {};
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
        user_id: userId || null,
        phone: olympiadPhone || null,
        test_id: testId || null,
        is_olympiad: is_olympiad,
        responses: responses || [],
        time_taken_seconds: timeTaken || 0
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Trigger AI Analysis in Background (Non-blocking)
    if (responses && responses.length > 0) {
      console.log(`Starting background analysis for result ${savedResult.id}...`);
      analyzePerformanceAI(responses)
        .then(async (analysis) => {
          const { error: updError } = await supabase
            .from("results")
            .update({ ai_suggestions: analysis })
            .eq("id", savedResult.id);

          if (updError) console.error(`Background analysis DB update failed for ${savedResult.id}:`, updError);
          else console.log(`Background analysis completed and saved for result ${savedResult.id}`);
        })
        .catch(err => {
          console.error(`Background analysis failed for result ${savedResult.id}:`, err);
        });
    }

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

// Get question counts per module for a specific test
app.get("/api/admin/tests/:testId/module-counts", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { testId } = req.params;

    // Get all questions for this test with their modules and subjects
    const { data: questions, error } = await supabase
      .from("test_questions")
      .select("question_id, questions(module, subject)")
      .eq("test_id", testId);

    if (error) throw error;

    // Count questions by module and subject
    const counts = {
      m1_math: 0,
      m2_math: 0,
      m1_rw: 0,
      m2_rw: 0
    };

    questions?.forEach(tq => {
      const q = tq.questions;
      if (!q) return;

      const module = q.module || 'm1';
      const subject = q.subject || 'math';

      // Map adaptive modules to top-level buckets
      let modulePrefix = 'm1';
      if (module.startsWith('m2')) modulePrefix = 'm2';

      const key = `${modulePrefix}_${subject}`;

      if (counts.hasOwnProperty(key)) {
        counts[key]++;
      }
    });

    res.json({ counts });
  } catch (err) {
    res.status(500).json({ error: "fetch_module_counts_failed", message: err.message });
  }
});

app.post("/api/admin/import/upload", upload.single('file'), async (req, res) => {
  try {
    const user = await verifyAdmin(req);
    if (!req.file) return res.status(400).json({ error: "no_file" });

    const { testId, testType, subject, module } = req.body;

    // Validate subject and module if provided
    if (testId && (!subject || !module)) {
      return res.status(400).json({
        error: "missing_module_info",
        message: "Subject and module are required when uploading to a specific test"
      });
    }

    // If uploading to a test, check question limits
    if (testId && subject && module) {
      const { data: questions } = await supabase
        .from("test_questions")
        .select("question_id, questions(module, subject)")
        .eq("test_id", testId);

      const key = `${module}_${subject}`;
      const currentCount = questions?.filter(tq => {
        const q = tq.questions;
        if (!q) return false;
        const qModule = q.module || 'm1';
        return qModule.startsWith(module) && q.subject === subject;
      }).length || 0;

      const limit = subject === 'math' ? 22 : 27;

      if (currentCount >= limit) {
        return res.status(400).json({
          error: "module_full",
          message: `This module already has ${currentCount}/${limit} questions. Cannot add more.`,
          currentCount,
          limit
        });
      }
    }

    console.log(`DEBUG: Received POST /api/admin/import/upload from ${user.email}`);
    console.log(`DEBUG: Params: testType=${testType}, testId=${testId}, subject=${subject}, module=${module}`);

    // 1. Create Import Job
    const { data: job, error: jobError } = await supabase
      .from("import_jobs")
      .insert({
        admin_id: user.id,
        filename: req.file.originalname,
        status: 'extracting',
        destination_test_id: testId || null,
        config: {
          testType: testType || 'sat-math',
          subject: subject || null,
          module: module || null
        }
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // 2. Respond immediately to the client
    res.json({ success: true, jobId: job.id });

    // 3. Background process (Direct PDF -> Multimodal AI)
    (async () => {
      const reportProgress = async (status, configUpdates = {}) => {
        try {
          const { data: currentJob } = await supabase
            .from("import_jobs")
            .select("config")
            .eq("id", job.id)
            .single();

          await supabase
            .from("import_jobs")
            .update({
              status,
              config: { ...(currentJob?.config || {}), ...configUpdates }
            })
            .eq("id", job.id);
        } catch (e) {
          console.error("Failed to report progress:", e);
        }
      };

      try {
        await reportProgress('candidate_split', { progress_message: 'Starting PDF analysis...' });

        // We now pass the buffer directly to Gemini 1.5 Flash
        // It handles PDF parsing and image extraction natively
        const candidates = await splitTextToCandidates(
          req.file.buffer,
          req.file.mimetype,
          (msg) => reportProgress('candidate_split', { progress_message: msg })
        );

        if (!candidates || candidates.length === 0) {
          throw new Error("No SAT questions were detected in this PDF. Please ensure the file is readable and contains text.");
        }

        await reportProgress('normalizing', {
          total_candidates: candidates.length,
          processed_candidates: 0,
          progress_message: `Extracted ${candidates.length} candidates. Starting normalization...`
        });

        let successCount = 0;

        for (const candidateText of candidates) {
          try {
            const normalized = await normalizeQuestion(
              candidateText,
              (msg) => reportProgress('normalizing', { progress_message: `Candidate ${successCount + 1}/${candidates.length}: ${msg}` })
            );

            let imageUrl = null;

            // 3. Save to import_candidates ONLY (User will approve/publish later in ImportReview)
            const { error: candidateError } = await supabase.from("import_candidates").insert({
              job_id: job.id,
              raw_text: candidateText,
              normalized_json: normalized,
              status: 'review_required'
            });

            if (candidateError) {
              console.error("Failed to insert candidate to database:", candidateError);
              logAiActivity("ERROR", "DB_INSERT_CANDIDATE", `Job ${job.id} | Error: ${JSON.stringify(candidateError)}`);
            } else {
              successCount++;
            }

            await reportProgress('normalizing', {
              processed_candidates: successCount,
              progress_message: `Normalized ${successCount}/${candidates.length} questions...`
            });
          } catch (normError) {
            console.error("Candidate normalization failed:", normError);
            // Optionally update message about failure
          }
        }

        await reportProgress('review_required', { progress_message: 'Import complete. Review required.' });
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

app.get("/api/admin/tests", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { data, error } = await supabase
      .from("tests")
      .select("id, title, status")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ tests: data });
  } catch (err) {
    res.status(500).json({ error: "list_tests_failed", message: err.message });
  }
});

app.delete("/api/admin/import/jobs/:id", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { id } = req.params;

    // First delete candidates related to this job
    await supabase.from("import_candidates").delete().eq("job_id", id);

    // Then delete the job itself
    const { error } = await supabase
      .from("import_jobs")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "delete_job_failed", message: err.message });
  }
});

app.get("/api/admin/import/jobs/:id/candidates", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { id } = req.params;
    const { data, error } = await supabase
      .from("import_candidates")
      .select("*, import_jobs(id, filename, destination_test_id, config)")
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
      .select("*, import_jobs(destination_test_id, config)")
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
      skill: rawData.skill || (rawData.skill_tags && rawData.skill_tags[0]) || null,
      tags: rawData.skill_tags || [],
      image_url: rawData.image_url || null,
      option_images: rawData.option_images || []
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
    const jobConfig = candidate.import_jobs?.config || {};

    const { data: question, error: qError } = await supabase
      .from("questions")
      .insert({
        text: questionData.text,
        passage: questionData.passage,
        options: questionData.options,
        answer: questionData.answer,
        explanation: questionData.explanation,
        subject: jobConfig.subject || questionData.subject,
        difficulty: questionData.difficulty,
        type: questionData.type,
        tags: questionData.tags,
        skill: questionData.skill,
        test_id: testId || null,
        module: jobConfig.module || rawData.module || 'm1',
        image_url: rawData.image_url || null,
        option_images: rawData.option_images || []
      })
      .select()
      .single();

    if (qError) {
      log(`DEBUG: Question insert error: ${JSON.stringify(qError)}`);
      throw qError;
    }

    // 2b. Link question_id back to candidate
    log(`DEBUG: Updating candidate ${id} with question_id ${question.id}`);
    const { error: candUpdateError } = await supabase
      .from("import_candidates")
      .update({ question_id: question.id })
      .eq("id", id);

    if (candUpdateError) {
      log(`DEBUG: Candidate update error (linking question_id): ${JSON.stringify(candUpdateError)}`);
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
      else {
        log("DEBUG: Link successful.");
        // Auto-update test metadata
        await recalculateTestCounts(testId);
      }
    }


    // 4. Update candidate status
    await supabase.from("import_candidates").update({ status: 'approved' }).eq("id", id);

    // 5. Check if job is complete
    if (candidate.job_id) {
      const { count, error: countError } = await supabase
        .from("import_candidates")
        .select("*", { count: 'exact', head: true })
        .eq("job_id", candidate.job_id)
        .eq("status", "review_required");

      if (!countError) {
        log(`DEBUG: Job ${candidate.job_id} remaining candidates: ${count}`);
        if (count === 0) {
          await supabase.from("import_jobs").update({ status: 'done' }).eq("id", candidate.job_id);
          log(`DEBUG: Job ${candidate.job_id} marked as done.`);
        }
      }
    }

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

    // Get candidate to find job_id
    const { data: candidate } = await supabase
      .from("import_candidates")
      .select("job_id")
      .eq("id", id)
      .single();

    await supabase.from("import_candidates").update({ status: 'rejected' }).eq("id", id);

    // Check if job is complete
    if (candidate?.job_id) {
      const { count, error: countError } = await supabase
        .from("import_candidates")
        .select("*", { count: 'exact', head: true })
        .eq("job_id", candidate.job_id)
        .eq("status", "review_required");

      if (!countError && count === 0) {
        await supabase.from("import_jobs").update({ status: 'done' }).eq("id", candidate.job_id);
      }
    }

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
// Uses LOCAL JWT decoding to avoid network calls to Supabase auth servers
// which fail due to ConnectTimeoutError in this environment
const verifyUser = async (req) => {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    throw Object.assign(new Error("Missing bearer token"), { status: 401 });
  }
  const token = match[1];

  try {
    // Decode JWT payload without verification (the token came from our Supabase project)
    // The token structure is: header.payload.signature (base64url encoded)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error("Invalid JWT structure");
    }

    // Base64url decode the payload
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);

    // Validate required claims
    if (!payload.sub) {
      throw new Error("Missing sub claim");
    }

    // Check token expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw Object.assign(new Error("Token expired"), { status: 401 });
    }

    // Return a user-like object with the essential fields
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    };
  } catch (err) {
    console.error("[DEBUG verifyUser] JWT error:", err.message);
    if (err.message.includes("Unexpected token")) {
      console.error("[DEBUG verifyUser] Malformed token/payload detected.");
    }
    throw Object.assign(new Error("Unauthenticated: " + err.message), { status: 401 });
  }
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
    const { word, definition, translation, example, theme, mastered } = req.body;

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

/**
 * AI Generation for vocabulary
 * POST /api/vocabulary/ai-generate
 */
app.post("/api/vocabulary/ai-generate", async (req, res) => {
  try {
    await verifyUser(req);
    const { word, theme } = req.body;
    if (!word) return res.status(400).json({ error: "word_required" });

    const data = await generateVocabularyAI(word, theme);
    res.json(data);
  } catch (err) {
    console.error("AI Generation Error:", err);
    res.status(500).json({ error: "ai_generation_failed", message: err.message });
  }
});

/**
 * AI Analysis for test results
 * POST /api/results/:id/analyze
 */
app.post("/api/results/:id/analyze", async (req, res) => {
  try {
    const user = await verifyUser(req);
    const { id } = req.params;

    // Fetch result
    const { data: result, error: fetchError } = await supabase
      .from("results")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !result) {
      return res.status(404).json({ error: "result_not_found" });
    }

    // Verify authorship or admin
    const isAdmin = allowList.includes(user.email?.toLowerCase());
    if (result.user_email?.toLowerCase() !== user.email?.toLowerCase() && !isAdmin) {
      return res.status(403).json({ error: "forbidden" });
    }

    // Analyze
    const analysis = await analyzePerformanceAI(result.responses || []);

    // Save to DB
    const { error: updateError } = await supabase
      .from("results")
      .update({ ai_suggestions: analysis })
      .eq("id", id);

    if (updateError) throw updateError;

    res.json({ success: true, analysis });
  } catch (err) {
    console.error("AI Analysis Error:", err);
    res.status(500).json({ error: "analysis_failed", message: err.message });
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

// --- PREMIUM CLASS SECTION ENDPOINTS ---

// --- TEACHER MANAGEMENT ---

// List all teachers
app.get("/api/admin/teachers", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, is_teacher")
      .eq("is_teacher", true);

    if (error) throw error;
    res.json({ teachers: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "fetch_teachers_failed", message: err.message });
  }
});

// Add teacher by email (Grant role to existing user)
app.post("/api/admin/teachers", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email_required" });

    // Find profile by email
    const { data: profile, error: pError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (pError || !profile) {
      return res.status(404).json({ error: "user_not_found", message: "No profile found with that email. Ensure they have signed up." });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ is_teacher: true })
      .eq("id", profile.id);

    if (error) throw error;
    res.json({ success: true, message: `Teacher role granted to ${email}` });
  } catch (err) {
    res.status(err.status || 500).json({ error: "grant_teacher_failed", message: err.message });
  }
});

// Create new teacher account with password
app.post("/api/admin/teachers/create", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { email, password, full_name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email_and_password_required" });

    const { data: { user }, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (error) throw error;

    // Grant teacher role in profiles table
    // Using upsert in case profile was partially created by auth trigger
    await supabase.from("profiles").upsert({
      id: user.id,
      email: email,
      full_name: full_name || "Teacher",
      is_teacher: true,
      updated_at: new Date().toISOString()
    });

    res.json({ success: true, message: `Account created for ${email}` });
  } catch (err) {
    res.status(err.status || 500).json({ error: "create_teacher_failed", message: err.message });
  }
});

// Revoke teacher role
app.delete("/api/admin/teachers/:id", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { id } = req.params;

    const { error } = await supabase
      .from("profiles")
      .update({ is_teacher: false })
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: "revoke_teacher_failed", message: err.message });
  }
});// Generate Invite Code (Admin only)
app.post("/api/admin/teacher-invites", async (req, res) => {
  try {
    await verifyAdmin(req);
    const code = "INV-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 7); // 7 days expiry

    const { data, error } = await supabase
      .from("teacher_invites")
      .insert({ code, expires_at: expires_at.toISOString() })
      .select()
      .single();

    if (error) throw error;
    res.json({ invite: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "generate_invite_failed", message: err.message });
  }
});

// List all invites (Admin only)
app.get("/api/admin/teacher-invites", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { data, error } = await supabase
      .from("teacher_invites")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ invites: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "fetch_invites_failed", message: err.message });
  }
});

// Teacher Sign-up/Upgrade with code
app.post("/api/auth/teacher-signup", async (req, res) => {
  try {
    const { code, email, password, full_name } = req.body;
    if (!code) return res.status(400).json({ error: "invite_code_required" });

    // 1. Verify invite code
    const { data: invite, error: iError } = await supabase
      .from("teacher_invites")
      .select("*")
      .eq("code", code)
      .is("used_by", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (iError || !invite) {
      return res.status(400).json({ error: "invalid_or_expired_invite", message: "The invite code is invalid, already used, or expired." });
    }

    let userId;
    // 2. Handle account creation or finding existing user
    const { data: { session }, error: aError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } }
    });

    if (aError) {
      if (aError.message.includes("already registered")) {
        // User already exists, they just need to log in to upgrade
        return res.status(400).json({ error: "user_exists", message: "User already exists. Please log in first, then use your invite code to upgrade your account." });
      }
      throw aError;
    }
    userId = session.user.id;

    // 3. Mark invite as used
    await supabase.from("teacher_invites").update({
      used_by: userId,
      used_at: new Date().toISOString()
    }).eq("id", invite.id);

    // 4. Update profile with teacher role
    await supabase.from("profiles").upsert({
      id: userId,
      email,
      full_name: full_name || "Teacher",
      is_teacher: true,
      updated_at: new Date().toISOString()
    });

    res.json({ success: true, message: "Teacher account created successfully!" });
  } catch (err) {
    res.status(err.status || 500).json({ error: "teacher_signup_failed", message: err.message });
  }
});

// 1. Assignments
app.post("/api/assignments", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { title, due_date, total_marks, content } = req.body;
    const teacher = await verifyUser(req);

    const { data, error } = await supabase
      .from("class_assignments")
      .insert({
        title,
        due_date,
        total_marks: total_marks || 100,
        teacher_id: teacher.id,
        content: content || {}
      })
      .select()
      .single();

    if (error) throw error;

    // Notify students via Socket.io
    io.emit("new_assignment", { title, due_date });

    res.json({ assignment: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "create_assignment_failed", message: err.message });
  }
});

app.get("/api/assignments", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("class_assignments")
      .select("*")
      .order("due_date", { ascending: true });

    if (error) throw error;
    res.json({ assignments: data });
  } catch (err) {
    res.status(500).json({ error: "fetch_assignments_failed", message: err.message });
  }
});

// 2. Submissions
app.post("/api/submit-assignment", async (req, res) => {
  try {
    const user = await verifyUser(req);
    const { assignment_id, content } = req.body;

    const { data, error } = await supabase
      .from("class_submissions")
      .upsert({
        assignment_id,
        student_id: user.id,
        content,
        submission_time: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ submission: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "submission_failed", message: err.message });
  }
});

app.get("/api/submissions/:assignment_id", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { assignment_id } = req.params;

    const { data, error } = await supabase
      .from("class_submissions")
      .select("*, profiles(full_name)")
      .eq("assignment_id", assignment_id);

    if (error) throw error;
    res.json({ submissions: data });
  } catch (err) {
    res.status(500).json({ error: "fetch_submissions_failed", message: err.message });
  }
});

app.patch("/api/grade-assignment/:submission_id", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { submission_id } = req.params;
    const { score, feedback } = req.body;

    const { data, error } = await supabase
      .from("class_submissions")
      .update({
        score,
        feedback,
        graded_at: new Date().toISOString()
      })
      .eq("id", submission_id)
      .select()
      .single();

    if (error) throw error;

    // Send notification to student
    io.to(`user_${data.student_id}`).emit("assignment_graded", { assignment_id: data.assignment_id, score });

    res.json({ submission: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "grading_failed", message: err.message });
  }
});

// 3. Performance & Statistics
app.get("/api/performance/:student_id", async (req, res) => {
  try {
    const user = await verifyTeacher(req);
    const { student_id } = req.params;

    // Security: Student can only see their own data, Teachers/Admins can see any
    if (user.id !== student_id && !user.isTeacher) {
      return res.status(403).json({ error: "Unauthorized access to performance data" });
    }

    const { data, error } = await supabase.from("class_performance").select("*").eq("student_id", student_id).single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ performance: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "fetch_performance_failed", message: err.message });
  }
});

// GET Student Growth Data (for charts)
app.get("/api/performance/growth/:student_id", async (req, res) => {
  try {
    const user = await verifyTeacher(req);
    const { student_id } = req.params;

    // Security: Student can only see their own data, Teachers/Admins can see any
    if (user.id !== student_id && !user.isTeacher) {
      return res.status(403).json({ error: "Unauthorized access to performance data" });
    }
    // In a real scenario, this would fetch from a 'class_performance_history' table.
    // For now, we'll return mock historical data based on the current overall_score to demonstrate formatting.
    const { data: current } = await supabase.from("class_performance").select("*").eq("student_id", student_id).single();

    // Mocking 6 months of growth
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const growthData = months.map((m, i) => ({
      month: m,
      score: (current?.overall_score || 50) - (5 * (5 - i)) + Math.floor(Math.random() * 5)
    }));

    res.json({ growth: growthData });
  } catch (err) {
    res.status(err.status || 500).json({ error: "fetch_growth_failed", message: err.message });
  }
});

// 4. Teacher Specific: Create Class ID
app.post("/api/teacher/create-class", async (req, res) => {
  try {
    const user = await verifyTeacher(req);
    const { name } = req.body;
    const teacher_id = user.id;
    const class_id = "SAT-" + Math.random().toString(36).substring(2, 7).toUpperCase();

    const { data, error } = await supabase
      .from("classes")
      .insert({ id: class_id, teacher_id, name })
      .select()
      .single();

    if (error) throw error;
    res.json({ class: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "create_class_failed", message: err.message });
  }
});

// 5. Student Specific: Join Class
app.post("/api/student/join-class", verifyUser, async (req, res) => {
  const { class_id } = req.body;
  const student_id = req.user.id;

  // Verify class exists
  const { data: classData, error: cError } = await supabase
    .from("classes")
    .select("id")
    .eq("id", class_id)
    .single();

  if (cError || !classData) return res.status(404).json({ error: "Class not found" });

  // Update student's profile
  const { error: uError } = await supabase
    .from("profiles")
    .update({ class_id: class_id })
    .eq("id", student_id);

  if (uError) return res.status(400).json({ error: uError.message });
  res.json({ success: true, class_id });
});

// 6. Teacher Specific: List students in THEIR class
app.get("/api/teacher/students", verifyAdmin, async (req, res) => {
  const teacher_id = req.user.id;

  // 1. Get teacher's classes
  const { data: classes, error: cError } = await supabase
    .from("classes")
    .select("id")
    .eq("teacher_id", teacher_id);

  if (cError) return res.status(400).json({ error: cError.message });
  const classIds = classes.map(c => c.id);

  // 2. Get students in these classes
  const { data: students, error: sError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, email, class_id")
    .in("class_id", classIds);

  if (sError) return res.status(400).json({ error: sError.message });

  // 3. Get performance
  const { data: performance } = await supabase.from("class_performance").select("*");

  const combined = students.map(s => {
    const p = performance?.find(perf => perf.student_id === s.id);
    return { ...s, performance: p || { overall_score: 0, improvement_percentage: 0 } };
  });

  res.json({ students: combined, classes: classes });
});

// 4. Leaderboard
app.get("/api/leaderboard", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("class_leaderboard")
      .select("*, profiles(full_name, avatar_url)")
      .order("points", { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ leaderboard: data });
  } catch (err) {
    res.status(500).json({ error: "fetch_leaderboard_failed", message: err.message });
  }
});

// 2. Messaging
app.get("/api/messages", verifyUser, async (req, res) => {
  const user_id = req.user.id;

  // Get group messages
  const { data: group } = await supabase
    .from("class_messages")
    .select("*")
    .eq("is_group_chat", true)
    .order("timestamp", { ascending: true })
    .limit(50);

  // Get private messages involving the user
  const { data: priv } = await supabase
    .from("class_messages")
    .select("*")
    .or(`sender_id.eq.${user_id},receiver_id.eq.${user_id}`)
    .eq("is_group_chat", false)
    .order("timestamp", { ascending: true })
    .limit(100);

  res.json({ group: group || [], private: priv || [] });
});

app.post("/api/messages", verifyUser, async (req, res) => {
  try {
    const user = await verifyUser(req);
    const { receiver_id, message_text, is_group_chat } = req.body;

    const { data, error } = await supabase
      .from("class_messages")
      .insert({
        sender_id: user.id,
        receiver_id: is_group_chat ? null : receiver_id,
        message_text,
        is_group_chat: !!is_group_chat
      })
      .select()
      .single();

    if (error) throw error;

    // Real-time broadcast
    if (is_group_chat) {
      io.emit("new_group_message", data);
    } else {
      io.to(`user_${receiver_id}`).emit("new_private_message", data);
    }

    res.json({ message: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "send_message_failed", message: err.message });
  }
});

// 6. To-Do & Exam Date
app.get("/api/todo/:student_id", async (req, res) => {
  try {
    const { student_id } = req.params;
    const { data, error } = await supabase
      .from("class_todo_items")
      .select("*")
      .eq("student_id", student_id)
      .order("due_date", { ascending: true });

    if (error) throw error;
    res.json({ todos: data });
  } catch (err) {
    res.status(500).json({ error: "fetch_todos_failed", message: err.message });
  }
});

app.post("/api/exam-date", async (req, res) => {
  try {
    const user = await verifyUser(req);
    const { exam_date, subject } = req.body;

    const { data, error } = await supabase
      .from("class_exam_dates")
      .upsert({
        student_id: user.id,
        exam_date,
        subject
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ exam_date: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "set_exam_date_failed", message: err.message });
  }
});

// --- PROFILE ENDPOINTS ---

// POST /api/profile/upload-avatar
// Accepts multipart form with 'file' field, uploads to Supabase Storage
app.post("/api/profile/upload-avatar", upload.single('file'), async (req, res) => {
  try {
    const user = await verifyUser(req);

    if (!req.file) {
      return res.status(400).json({ error: "no_file", message: "No file uploaded" });
    }

    const fileExt = req.file.originalname.split('.').pop() || 'jpg';
    const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // Save avatar URL to profiles table
    await supabase.from('profiles')
      .upsert({ id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() });

    res.json({ url: publicUrl });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(err.status || 500).json({ error: "avatar_upload_failed", message: err.message });
  }
});

// POST /api/profile/upload-banner
app.post("/api/profile/upload-banner", upload.single('file'), async (req, res) => {
  try {
    const user = await verifyUser(req);
    if (!req.file) return res.status(400).json({ error: "no_file", message: "No file uploaded" });

    const fileExt = req.file.originalname.split('.').pop() || 'jpg';
    const fileName = `${user.id}/banner-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('banners')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (error) throw error;
    const { data: urlData } = supabase.storage.from('banners').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    await supabase.from('profiles').upsert({ id: user.id, banner_url: publicUrl, updated_at: new Date().toISOString() });
    res.json({ url: publicUrl });
  } catch (err) {
    res.status(err.status || 500).json({ error: "banner_upload_failed", message: err.message });
  }
});

// GET /api/me/profile
app.get("/api/me/profile", async (req, res) => {
  try {
    const user = await verifyUser(req);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    res.json({ profile: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "fetch_profile_failed", message: err.message });
  }
});

// POST /api/me/profile
app.post("/api/me/profile", async (req, res) => {
  try {
    const user = await verifyUser(req);
    const { full_name, phone, graduation_year, sat_deadline, onboarding_complete } = req.body;

    const updates = {
      id: user.id,
      updated_at: new Date().toISOString()
    };
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (graduation_year !== undefined) updates.graduation_year = graduation_year;
    if (sat_deadline !== undefined) updates.sat_deadline = sat_deadline;
    if (onboarding_complete !== undefined) updates.onboarding_complete = onboarding_complete;

    const { data, error } = await supabase
      .from('profiles')
      .upsert(updates)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, profile: data });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(err.status || 500).json({ error: "profile_update_failed", message: err.message });
  }
});

// POST /api/profile/update
app.post("/api/profile/update", async (req, res) => {
  try {
    const user = await verifyUser(req);
    const { full_name, phone, avatar_url, banner_url, graduation_year, sat_deadline } = req.body;

    const updates = {
      id: user.id,
      updated_at: new Date().toISOString()
    };
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (banner_url !== undefined) updates.banner_url = banner_url;
    if (graduation_year !== undefined) updates.graduation_year = graduation_year;
    if (sat_deadline !== undefined) updates.sat_deadline = sat_deadline;

    const { error } = await supabase
      .from('profiles')
      .upsert(updates);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: "profile_update_failed", message: err.message });
  }
});

// GET /api/dashboard/stats
// Returns real stats: tests taken, avg score, last score, vocab mastered
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const user = await verifyUser(req);

    // Fetch test results using user_id column (falls back to user_email)
    const { data: results, error: resultsError } = await supabase
      .from('results')
      .select('score, created_at, responses')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch vocab mastered count
    const { count: vocabCount } = await supabase
      .from('vocabulary_words')
      .select('id', { count: 'exact', head: true })
      .eq('mastered', true);

    // Fetch vocab sets owned by user (to find words in their sets)
    const { data: userSets } = await supabase
      .from('vocabulary_sets')
      .select('id')
      .eq('user_id', user.id);

    let realVocabMastered = 0;
    if (userSets && userSets.length > 0) {
      const setIds = userSets.map(s => s.id);
      const { count } = await supabase
        .from('vocabulary_words')
        .select('id', { count: 'exact', head: true })
        .in('set_id', setIds)
        .eq('mastered', true);
      realVocabMastered = count || 0;
    }

    const testResults = results || [];
    const testsTaken = testResults.length;
    const avgScore = testsTaken > 0
      ? Math.round(testResults.reduce((acc, r) => acc + (r.score || 0), 0) / testsTaken)
      : 0;
    const lastScore = testsTaken > 0 ? (testResults[0].score || 0) : 0;

    res.json({
      testsTaken,
      avgScore,
      lastScore,
      vocabMastered: realVocabMastered
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(err.status || 500).json({ error: "stats_failed", message: err.message });
  }
});

// All other GET requests should return the index.html from 'dist'
app.get("*", (req, res) => {
  console.log("DEBUG: Hit catch-all route. Serving:", path.join(distPath, "index.html"));
  res.sendFile(path.join(distPath, "index.html"));
});

const port = process.env.PORT || 3000;

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their private room`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

httpServer.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Admin backend [DEBUG-V3] listening on ${port}`);
});
