# MedField Admin Panel

This is the administrative and partner portal for the MedField pharmacy platform. 
It is built as a separate React + Vite application, sharing the same Supabase backend as the main customer application.

## Tech Stack
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Charts:** Recharts
- **Backend:** Supabase (Auth + PostgreSQL)

## Features
- **Admin Dashboard:** Full overview of sales, orders, users, and active partners.
- **Orders Management:** View, filter, and assign orders to regional delivery partners.
- **Users Management:** View customer profiles, order history, and membership tiers.
- **Products Management:** Full CRUD for the medicine inventory.
- **Banners Management:** Control promotional banners shown on the customer app.
- **Partners Management:** Create and manage delivery partner accounts.
- **Partner Portal:** A dedicated, restricted view for delivery partners to see their assigned active deliveries and mark them as delivered.

## Setup
1. Clone the repository.
2. Run `npm install`.
3. Create a `.env.local` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```
4. Run `npm run dev` to start the development server. (Runs on port 5174 by default).
