# Stagecoach Canteen React + Supabase

This is a Stagecoach Canteen employee meal ordering app based on the Nungua Market restaurant idea.

## Main features
- Employee sign up and login with Supabase Auth
- Menu/product list from Supabase
- Basket and order form
- Order saved in Supabase and opened in WhatsApp
- Admin dashboard from the frontend
- Admin can add, edit, and delete menu items
- Admin can add or remove admin access by email

Important: deleting an admin in the frontend removes admin access from the `admins` table. It does not delete the user's Supabase Auth account, because deleting Auth users requires a secure backend/service-role key.

## Setup
1. Run `npm install`
2. Create `.env` with:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. In Supabase, run `stagecoach_database.sql` in the SQL Editor.
4. Create a public Storage bucket called `canteen-images`.
5. Open `src/App.jsx` and change:

```
const WHATSAPP_NUMBER = "447000000000";
```

Use the WhatsApp number in international format without `+`.

6. Start locally:

```
npm run dev
```

## Build

```
npm run build
```
