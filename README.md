# SATValley - Digital SAT Ecosystem

SATValley is a high-fidelity, adaptive Digital SAT preparation platform designed to simulate the exact experience of the official College Board SAT.

## 🚀 Quick Links
- **Portal:** [satvalley.com](https://satvalley.com)
- **Admin Access:** [satvalley.com/admin](https://satvalley.com/admin)
- **Telegram Support:** [@satvalley_admin](https://t.me/satvalley_admin)

---

## 🛠 Tech Stack

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** Vanilla CSS3 + TailwindCSS (utility-first components)
- **Icons:** Lucide React
- **Client:** Supabase Auth Helpers

### Backend
- **Runtime:** Node.js
- **Server:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (JWT based)
- **Storage:** Supabase Buckets (for question/student images)

---

## 🏗 System Architecture

### 1. Adaptive Testing Engine
The platform simulates the adaptive nature of the Digital SAT.
- **Module 1:** Standard questions.
- **Module 2:** Logic calculates performance from Module 1 and redirects the user to either the "Easy" or "Hard" variant of Module 2.
- **Scoring:** High-precision scoring algorithm based on domain weightage.

### 2. Admin Portal
A comprehensive dashboard for managing the entire ecosystem:
- **Test Manager:** Create, edit, and delete tests.
- **Question Bank:** Add Math/RW questions with images and explanations.
- **Results Tracking:** View and manage student performance.
- **Site Content:** Dynamic editing of text, prizes, and home page statistics without code changes.

### 3. SAT Olympiad
A competitive module designed for large-scale testing.
- **Registration:** Limited to one attempt per user per Olympiad.
- **Anti-Cheat:** Fullscreen enforcement, tab-switching detection, and camera-ready UI.
- **Leaderboard:** Real-time "Global Grid" showing top performers with profile names.

---

## ⚙️ Configuration & Deployment

### Environment Variables
#### Frontend (`.env`)
- `VITE_SUPABASE_URL`: Your Supabase Project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
- `VITE_BACKEND_URL`: The URL where your Node.js backend is hosted (e.g., Render URL)
- `VITE_ADMIN_EMAILS`: List of emails allowed to access admin features

#### Backend (`backend/.env`)
- `SUPABASE_URL`: Same as above
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations
- `ADMIN_EMAILS`: List of admin emails (mirrored from frontend)

### Deployment (Render.com)
The project is configured for a **unified deployment**:
1. The backend serves the static frontend files from the `dist` folder.
2. Render uses the `Dockerfile` in the root directory for a multi-stage build.
3. Ensure all environment variables are set in the Render "Environment" settings.

---

## 🎨 Customization Guide

### Changing Site Text/Stats
Navigate to the **Admin > Settings** tab. No developer knowledge is required to:
- Update Hero section text.
- Change Olympiad seasonal details and prizes.
- Update the Home Page statistics cards (Students, Perfect Scores).

### Managing Questions
Questions can be added via the **Admin > Practice Tests** or **Olympiad Admin** tabs. Each question supports:
- Rich text content.
- Image uploads for prompts or options.
- Detailed explanations for students.

---

## 🔐 Security
- **RLS (Row Level Security):** Enabled in Supabase to ensure users can only access their own results.
- **Admin Verification:** All sensitive endpoints (creating tests, deleting results) are protected by a server-side `verifyAdmin` middleware.

---
*Created with ❤️ for SATValley.*
