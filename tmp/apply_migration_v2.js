import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    const sql = `
    -- 1. Add banner_url to profiles
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;

    -- 2. Create Premium Class Tables
    CREATE TABLE IF NOT EXISTS public.class_assignments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        due_date TIMESTAMP WITH TIME ZONE NOT NULL,
        total_marks INTEGER NOT NULL DEFAULT 100,
        teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        content JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.class_submissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        assignment_id UUID REFERENCES public.class_assignments(id) ON DELETE CASCADE,
        student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        submission_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        content TEXT,
        score INTEGER,
        feedback TEXT,
        graded_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(assignment_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS public.class_performance (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
        quiz_scores JSONB DEFAULT '[]'::jsonb,
        homework_scores JSONB DEFAULT '[]'::jsonb,
        overall_score NUMERIC(5,2) DEFAULT 0,
        improvement_percentage NUMERIC(5,2) DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.class_leaderboard (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
        points INTEGER DEFAULT 0,
        rank INTEGER,
        badges JSONB DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.class_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        message_text TEXT NOT NULL,
        is_group_chat BOOLEAN DEFAULT FALSE,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.class_todo_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        task TEXT NOT NULL,
        due_date TIMESTAMP WITH TIME ZONE,
        completed BOOLEAN DEFAULT FALSE,
        assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.class_exam_dates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        exam_date TIMESTAMP WITH TIME ZONE NOT NULL,
        subject TEXT NOT NULL,
        UNIQUE(student_id, subject)
    );
    `;

    console.log("Attempting to run migration via 'exec_sql' RPC...");
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }); // Try common names

    if (error) {
        console.error("RPC 'exec_sql' failed or doesn't exist:", error.message);
        console.log("\n--- ACTION REQUIRED ---");
        console.log("Please copy the SQL above and run it in your Supabase SQL Editor.");
        console.log("This is required for the Premium Class Section to function correctly.");
    } else {
        console.log("Migration successful!");
    }
}
migrate();
