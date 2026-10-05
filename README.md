# TechEve Portal

A production-ready Academy Portal for students, instructors, and administrators built with Next.js App Router, Tailwind CSS, and Supabase.

---

## 🚀 Deploying to Vercel

Follow these steps to deploy this project live on [Vercel](https://vercel.com):

### 1. Import Project to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Connect your GitHub account and select the **`techeve-portal`** repository.
3. Keep the default settings (**Framework Preset**: `Next.js`).

### 2. Configure Environment Variables in Vercel
In the Vercel project configuration page (or under **Settings &rarr; Environment Variables**), add the following:

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | `https://xyzcompany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client anon key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Private admin service role key | `eyJhbGciOi...` |
| `NEXT_PUBLIC_SITE_URL` | Your live Vercel domain or custom domain | `https://techeve-portal.vercel.app` |

> ⚠️ **Important**: Do not prefix `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_` to keep it secure on the server side.

### 3. Configure Supabase Auth Redirects
In your [Supabase Dashboard](https://supabase.com/dashboard):
1. Navigate to **Authentication &rarr; URL Configuration**.
2. Set **Site URL** to your Vercel deployment URL (e.g. `https://techeve-portal.vercel.app`).
3. Under **Redirect URLs**, add:
   - `https://techeve-portal.vercel.app/**`
   - `https://techeve-portal.vercel.app/set-password`
   - `https://techeve-portal.vercel.app/auth/confirm`

### 4. Database Setup (If not already configured)
Run the SQL migration scripts in Supabase **SQL Editor**:
1. `supabase/schema.sql` (Core database tables, RLS policies, and triggers)
2. `supabase/migration-001.sql` (Capstones multi-reviews, profile details sync)

---

## 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env.local

# 3. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Tech Stack
- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Styling**: Tailwind CSS & Lucide Icons
- **Charts**: Recharts
- **Notifications**: Sonner
