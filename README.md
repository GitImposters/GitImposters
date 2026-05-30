# GitImposters

GitImposters analyzes GitHub repositories across 6 engineering dimensions and generates an **Imposter Score** — telling you whether a developer's work reflects genuine skill or assembled appearances. Built for hiring managers, recruiters, and teams vetting freelancers.

## Tech Stack

- **Frontend:** Next.js 16 App Router (React + TypeScript), Tailwind CSS v4, shadcn/ui
- **Backend/DB:** Supabase (Postgres, Auth, Row Level Security, Edge Functions)
- **AI:** Groq API (`llama-3.3-70b-versatile`) for authorship analysis, README scoring, and plain-English summaries
- **GitHub Data:** GitHub REST API + GitHub App for private repo access
- **Deployment:** Vercel (frontend) + Supabase (backend + edge functions)

---

## Local Development Setup

### 1. Clone and install

```bash
git clone https://github.com/adityadipakpatel/gitimposters.git
cd gitimposters
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in every value (see sections below for how to get each one).

### 3. Supabase project

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key into `.env.local`
3. Copy your service role key into `.env.local`
4. Open the **SQL Editor** and run the full contents of `supabase/migrations/001_initial_schema.sql`

### 4. GitHub OAuth App (user login)

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Set **Homepage URL:** `http://localhost:3000`
3. Set **Authorization callback URL:** `http://localhost:3000/api/auth/callback`
4. Copy **Client ID** and **Client Secret** into `.env.local`
5. In your Supabase project: **Authentication → Providers → GitHub**, enable it and paste the Client ID and Secret

### 5. GitHub App (private repo access)

1. Go to **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**
2. Set **Webhook URL:** `https://your-domain.com/api/github/webhook` (use a tunnel like ngrok locally)
3. Set **Webhook secret** (any strong random string) and add to `.env.local`
4. Set permissions:
   - Repository: **Contents** (Read), **Metadata** (Read), **Pull requests** (Read)
5. Install the app on your account
6. Generate and download the **private key** (.pem file)
7. Copy **App ID** and the contents of the .pem file into `.env.local` (replace newlines with `\n`)

### 6. Groq API key

Sign up at [console.groq.com](https://console.groq.com), create an API key, and add it to `.env.local`.

### 7. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with GitHub.

---

## Setting yourself as admin

After logging in once, open your Supabase **SQL Editor** and run:

```sql
UPDATE public.users SET role = 'admin' WHERE github_username = 'your-github-username';
```

Then visit `/admin` to access the admin dashboard.

---

## Deployment

### Vercel (frontend)

1. Push to GitHub and import the repo on [vercel.com](https://vercel.com)
2. Add all environment variables from `.env.local` to the Vercel project settings
3. Deploy — Vercel auto-detects Next.js and runs `npm run build`

### Supabase Edge Functions

Deploy the analysis function:

```bash
supabase functions deploy analyze-repo
```

Set the required secrets in Supabase:

```bash
supabase secrets set GROQ_API_KEY=your-key
supabase secrets set GITHUB_APP_ID=your-id
supabase secrets set GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
supabase secrets set GITHUB_APP_WEBHOOK_SECRET=your-secret
supabase secrets set GITHUB_PAT=your-personal-access-token
```

### Production environment variables

Update `NEXT_PUBLIC_APP_URL` in Vercel to your production domain (e.g. `https://gitimposters.com`).

---

## Analysis Modules

| Module | Weight | What it measures |
|--------|--------|-----------------|
| Commit Quality | 20% | Message quality, vague/empty commits, large monolithic commits |
| Code Authorship | 20% | Style consistency, AI-generated signals, copy-paste patterns (via Groq) |
| PR & Review Habits | 15% | Description quality, self-merge ratio, review activity, merge speed |
| Repo Hygiene | 15% | README quality (via Groq), .gitignore, LICENSE, folder structure |
| Contribution Consistency | 15% | Temporal patterns, bulk uploads, gap-then-burst behavior |
| Testing & CI/CD | 15% | Test file presence, CI configuration detection |

**Imposter Score** = `100 − weighted_average`. Higher = more red flags.
