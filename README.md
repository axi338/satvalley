# SatValley 🚀

SatValley is a modern, comprehensive platform designed to help students master the SAT. Featuring practice tests, score calculators, and an interactive review system, it provides a premium experience for exam preparation.

## ✨ Features

- **Practice Tests**: Full-length SAT practice tests with a realistic UI.
- **Score Calculator**: Accurate score projections based on practice performance.
- **Admin Panel**: Comprehensive management for questions, users, and results.
- **Modern UI**: Dark-themed, responsive design built for visual excellence.
- **Detailed Review**: In-depth analysis of test performance with question-by-question breakdowns.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TypeScript, Vanilla CSS
- **Backend**: Node.js, Express (Hosted on Render.com)
- **Database/Auth**: Supabase (PostgreSQL, Auth, Storage)
- **Styling**: Modern CSS with custom design tokens

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Render.com account (for backend hosting)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/axi338/satvalley.git
   cd satvalley
   ```

2. **Install dependencies**:
   ```bash
   npm install
   cd backend && npm install
   ```

3. **Environment Setup**:
   Create a `.env.local` file in the root directory and add your Supabase and Backend configuration:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_BACKEND_URL=your_render_backend_url
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 📂 Project Structure

- `/src`: Frontend React application
- `/backend`: Node.js/Express server (handles uploads and data processing)
- `/public`: Static assets

---

Developed with ❤️ by Axliddin.
