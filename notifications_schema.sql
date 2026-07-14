-- Create Notifications Table in Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_type TEXT NOT NULL, -- 'all_users', 'all_partners', 'all', 'user', 'partner', 'admin'
    recipient_id TEXT, -- optional: target specific user/partner/admin ID
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'order_placed', 'order_delivered', 'push', 'system', 'refill'
    link TEXT, -- optional deep link e.g. '/orders'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for full app functionality
CREATE POLICY "Enable all access for notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
