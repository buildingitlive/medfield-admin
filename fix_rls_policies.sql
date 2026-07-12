-- 1. Allow Admins to read all order items
CREATE POLICY "Admins can view all order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid()
  )
);

-- 2. Allow Partners to read orders assigned to them
CREATE POLICY "Partners can view assigned orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  assigned_partner_id = auth.uid()
);

-- 3. Allow Partners to update orders assigned to them
CREATE POLICY "Partners can update assigned orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  assigned_partner_id = auth.uid()
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
    AND orders.assigned_partner_id = auth.uid()
  )
);
