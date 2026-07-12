-- 1. Create Admin Users Table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'superadmin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Partners Table
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    region TEXT NOT NULL,
    city TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Banners Table
CREATE TABLE banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    image_url TEXT,
    bg_color TEXT NOT NULL DEFAULT '#a7f3d0',
    link TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Update Orders Table (add assigned_partner_id)
ALTER TABLE orders 
ADD COLUMN assigned_partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

-- 5. Enable Row Level Security (RLS) on new tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- 6. Create permissive policies for the Admin portal (simplification for MVP)
-- In a production environment, you would restrict these based on auth.uid() matching admin_users
CREATE POLICY "Enable all for authenticated users" ON admin_users FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON partners FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable read access for all users" ON banners FOR SELECT TO public USING (true);
CREATE POLICY "Enable all for authenticated users" ON banners FOR ALL TO authenticated USING (true);
