-- Quick Fix: Add missing user_email column to olympiad_registrations
-- Run this in Supabase SQL Editor

ALTER TABLE olympiad_registrations ADD COLUMN IF NOT EXISTS user_email TEXT;
