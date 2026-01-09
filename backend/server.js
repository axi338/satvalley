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

app.get("/api/tests", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ tests: data });
  } catch (err) {
    res.status(500).json({ error: "failed_to_list_tests", message: err.message });
  }
});

app.post("/api/tests", async (req, res) => {
  try {
    await verifyAdmin(req);
    const { title, difficulty, description, sections, mathq, readingq, writingq } = req.body || {};
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
        writingq: writingq || "0"
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
    const { title, difficulty, description, sections, mathq, readingq, writingq } = req.body || {};

    const { error } = await supabase
      .from("tests")
      .update({
        title,
        difficulty: difficulty || "Medium",
        description: description || "",
        sections: sections || [],
        mathq: mathq || "0",
        readingq: readingq || "0",
        writingq: writingq || "0",
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "update_test_failed", message: err.message });
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
    const { text, answer, testId, passage, options, type, module, skill, explanation, imageUrl, subject, optionImages } = req.body || {};
    if (!text || !answer) return res.status(400).json({ error: "text_and_answer_required" });

    const { data, error } = await supabase
      .from("questions")
      .insert({
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
        subject: subject || 'rw',
        option_images: optionImages || []
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ question: data });
  } catch (err) {
    const status = err.status || 401;
    res.status(status).json({ error: status === 401 ? "unauthenticated" : "forbidden", message: err.message });
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

// Serve static files from the 'dist' directory (Vite build)
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use(express.static(path.join(__dirname, "../dist")));

// All other GET requests should return the index.html from 'dist'
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist", "index.html"));
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Admin backend listening on ${port}`);
});
