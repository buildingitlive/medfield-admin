-- Add Admin RLS Policies for existing tables

-- 1. Profiles Table: Allow admins to read all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  )
);

-- 2. Orders Table: Allow admins to read and update all orders
CREATE POLICY "Admins can view all orders"
ON orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can update all orders"
ON orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  )
);

-- Note: If you have other tables like 'addresses' or 'prescriptions' that the admin needs to see,
-- you can run similar policies for them!
