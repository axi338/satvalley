import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

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
        is_olympiad: is_olympiad || false, // Ensure defaults are set if not provided
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
    let query = supabase.from("questions").select("*");

    if (testId && testId !== "undefined" && testId !== "") {
      query = query.eq("test_id", testId);
    }
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
      query = query.eq("user_email", userEmail);
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

app.post("/api/results", async (req, res) => {
  try {
    const { name, score, improvement, note, photoUrl, userEmail, testId, responses } = req.body || {};
    if (!score && score !== 0) return res.status(400).json({ error: "score_required" });

    // Check if it's an olympiad test
    let is_olympiad = false;
    if (testId) {
      const { data: testData } = await supabase.from("tests").select("is_olympiad").eq("id", testId).single();
      if (testData?.is_olympiad) is_olympiad = true;
    }

    if (is_olympiad && userEmail) {
      // Check if already submitted
      const { data: existing } = await supabase
        .from("results")
        .select("id")
        .eq("test_id", testId)
        .eq("user_email", userEmail)
        .maybeSingle(); // Use maybeSingle to avoid error if not found

      if (existing) {
        return res.status(400).json({ error: "already_submitted", message: "You have already submitted this Olympiad test." });
      }
    }

    const { data, error } = await supabase
      .from("results")
      .insert({
        name: name || "Student",
        score: score,
        improvement: improvement || "+0",
        note: note || "",
        photo_url: photoUrl || null,
        user_email: userEmail || null,
        test_id: testId || null,
        is_olympiad: is_olympiad,
        responses: responses || []
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ result: data });
  } catch (err) {
    res.status(500).json({ error: "failed_to_save_result", message: err.message });
  }
});

app.get("/api/olympiad/leaderboard", async (req, res) => {
  try {
    const { testId } = req.query;
    let query = supabase
      .from("results")
      .select("id, name, score, user_email, created_at, photo_url")
      .eq("is_olympiad", true);

    if (testId) {
      query = query.eq("test_id", testId);
    }

    const { data, error } = await query
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) throw error;
    res.json({ leaderboard: data });
  } catch (err) {
    res.status(500).json({ error: "failed_to_fetch_leaderboard", message: err.message });
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
    let query = supabase
      .from("olympiad_registrations")
      .select("*, user:user_id(email)"); // Assuming user_id links to users table if accessible, otherwise just relying on stored user_email

    if (testId) {
      query = query.eq("test_id", testId);
    }

    const { data, error } = await query.order("registered_at", { ascending: false });

    if (error) throw error;
    res.json({ registrations: data });
  } catch (e) {
    res.status(500).json({ error: "fetch_failed", message: e.message });
  }
});

app.get("/api/olympiad/status", async (req, res) => {
  try {
    const { testId, userEmail } = req.query;
    if (!testId || !userEmail) return res.status(400).json({ error: "missing_params" });

    const [registration, result] = await Promise.all([
      supabase.from("olympiad_registrations").select("id").eq("test_id", testId).eq("user_email", userEmail).maybeSingle(),
      supabase.from("results").select("id, score").eq("test_id", testId).eq("user_email", userEmail).maybeSingle()
    ]);

    res.json({
      registered: !!registration.data,
      completed: !!result.data,
      score: result.data?.score
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthenticated");

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


// --- DYNAMIC CONTENT ENDPOINTS ---

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

// Serve static files from the 'dist' directory (Vite build)
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Serve static files from 'dist' (root) or '../dist' (if running from backend/)
// Try root dist first (Docker/local standard)
let distPath = path.join(__dirname, "dist");
// Check if it exists, if not try ../dist (Node native deployment)
import fs from 'fs';
if (!fs.existsSync(distPath)) {
  distPath = path.join(__dirname, "../dist");
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
// All other GET requests should return the index.html from 'dist'
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Admin backend listening on ${port}`);
});
