# MedField Admin Platform Context

The MedField Admin platform is a separate web application designed to manage the MedField pharmacy e-commerce platform. It connects to the same Supabase backend as the main customer PWA.

## Architecture
- It uses **React (Vite) + Tailwind CSS**.
- **AuthContext.tsx** handles authentication and role detection. It determines if a logged-in user is an `admin` or a `partner`.
- **App.tsx** acts as a route state machine. It renders the `LoginScreen` if unauthenticated. If authenticated, it renders either the admin layout (Sidebar + TopNavbar) or the partner layout (TopNavbar only) depending on the role.

## Roles & Permissions
1. **Admin**
   - Access to all screens (`Dashboard`, `Orders`, `Users`, `Products`, `Banners`, `Partners`).
   - Can assign orders to partners.
   - Verified by checking the `admin_users` table in Supabase.
2. **Partner**
   - Access only to `PartnerDashboardScreen`.
   - Sees only active deliveries assigned to them (`assigned_partner_id = their partner id`).
   - Can mark orders as 'delivered' and add delivery notes.
   - Verified by checking the `partners` table in Supabase.

## Key Screens
- **DashboardScreen:** Uses `recharts` for the revenue area chart.
- **OrdersScreen:** Includes a modal to assign unassigned orders to regional partners.
- **UsersScreen:** Uses a split layout (list on the left, detail view on the right).
- **ProductsScreen:** Full CRUD operations for medicines.
- **PartnersScreen:** Used by admins to create and manage delivery partners across 4 regions (`city_north`, `city_south`, `city_east`, `city_west`).

## Design System
The admin panel uses a slightly different design system than the main app, characterized by a dark navy sidebar (`#0b1c30`), `Inter` font for text, and `JetBrains Mono` for IDs and codes. All design tokens are defined in `src/index.css`.

## Recent Updates
- **Mobile Optimizations**: Enforced stacking (`flex-col`) on mobile viewports for modals, lists, and forms to eliminate overflow, and implemented `overflow-x-hidden` at the root to lock the width to the device viewport.
- **Delivery Date Tracking**: Refactored the Dashboard order fetching logic to correctly attribute "Today's Revenue" by querying `updated_at` (the timestamp when an order transitions to `Delivered`) instead of `created_at`.
- **UI Clean-up**: Stripped all mentions of `Delivery Fee` or `Subtotal` from the payment summaries in the Admin Orders and Partner dashboard, reflecting the new business rules where delivery fees are purely visual in the PWA.

## Production Checklist
- [x] Test complete end-to-end PWA flow and ensure admin panel instantly updates and catches new orders.
- [x] Verify Supabase RLS policies are permissive enough to allow admin inserts to `products`, `banners`, and `partners`.
- [x] Run `ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP` in production DB and attach trigger to power the dashboard.
- [x] Review layout sizing on real mobile devices (horizontal scroll locked).
- [x] Confirm `npm run build` succeeds without TS warnings.
