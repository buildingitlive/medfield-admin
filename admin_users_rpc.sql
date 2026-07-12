-- Create a secure function to fetch users along with their auth emails
-- This function can only be run by users who exist in the admin_users table.

CREATE OR REPLACE FUNCTION get_admin_users_with_email()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  member_tier text,
  created_at timestamptz,
  avatar_url text
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Join public.profiles with auth.users to get the email
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    u.email::text,
    p.phone::text,
    p.member_tier::text,
    p.created_at,
    p.avatar_url::text
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;
