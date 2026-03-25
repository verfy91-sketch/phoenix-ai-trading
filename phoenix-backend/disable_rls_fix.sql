-- =====================================================
-- Phoenix AI Trading System - Disable RLS for users table
-- =====================================================
-- This fixes registration failures caused by Row Level Security

-- Disable RLS on users table (temporary fix for registration)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Alternative: Create a permissive policy if you want to keep RLS enabled
-- CREATE POLICY "Allow insert" ON users FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow select" ON users FOR SELECT USING (true);

-- =====================================================
-- RLS Fix Complete!
-- =====================================================
