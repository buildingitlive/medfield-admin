-- Drop the incorrect policies first so we can replace them
DROP POLICY IF EXISTS "Partners can view assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Partners can update assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Partners can view assigned order items" ON public.order_items;

-- 2. Allow Partners to read orders assigned to them (matching by email from JWT)
CREATE POLICY "Partners can view assigned orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  assigned_partner_id IN (
    SELECT id FROM public.partners WHERE email = auth.jwt() ->> 'email'
  )
);

-- 3. Allow Partners to update orders assigned to them
CREATE POLICY "Partners can update assigned orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  assigned_partner_id IN (
    SELECT id FROM public.partners WHERE email = auth.jwt() ->> 'email'
  )
);

-- 4. Allow Partners to read order items for orders assigned to them
CREATE POLICY "Partners can view assigned order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.assigned_partner_id IN (
      SELECT id FROM public.partners WHERE email = auth.jwt() ->> 'email'
    )
  )
);
