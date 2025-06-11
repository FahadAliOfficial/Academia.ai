-- Enable real-time for the messages table
-- Run these commands in your Supabase SQL Editor

-- 1. Enable real-time replication for the messages table
ALTER TABLE messages REPLICA IDENTITY FULL;

-- 2. Enable real-time publication for the messages table
-- (This should already be enabled by default in Supabase, but just in case)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 3. Make sure Row Level Security is enabled and has appropriate policies
-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'messages';

-- Enable RLS if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for real-time access
-- Allow authenticated users to read messages
CREATE POLICY "Allow authenticated users to read messages" ON messages
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert messages
CREATE POLICY "Allow authenticated users to insert messages" ON messages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own messages
CREATE POLICY "Allow users to update their own messages" ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- Allow users to delete their own messages
CREATE POLICY "Allow users to delete their own messages" ON messages
    FOR DELETE USING (auth.uid() = sender_id);

-- 5. Grant necessary permissions for real-time
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;

-- 6. Verify the setup
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrls
FROM pg_tables 
WHERE tablename = 'messages';

-- Check policies
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'messages';
