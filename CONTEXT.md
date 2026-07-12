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
