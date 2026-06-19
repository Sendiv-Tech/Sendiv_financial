# SendivTech Finance Ledger — Deployment Guide

Full deployment walkthrough: database, two-factor login, live hosting.

Architecture at a glance:
- Vercel     — hosts the live website
- Supabase   — Postgres database + file storage + login + email OTP
- GitHub     — stores the code; Vercel auto-redeploys when you push

Login flow (every single session):
  1. Enter email + password  →  if wrong, you're blocked immediately
  2. A 6-digit code is emailed to you immediately after the password is accepted
  3. Enter that code on the next screen
  4. Only then does the dashboard become accessible
  5. After 12 hours, or when you sign out, both layers are cleared and you
     must do both steps again on your next visit

---

## STEP 1 — Set up Supabase database

1. Go to supabase.com/dashboard and open your project
2. Left sidebar → SQL Editor → New query
3. Open the file `supabase-schema.sql` from this project, copy everything,
   paste it into the query box, click Run
4. You should see "Success. No rows returned" — that means it worked

---

## STEP 2 — Enable email OTP (critical for 2FA)

This is the most important step and the most commonly missed one.
Supabase sends email OTP codes by default as a "magic link" (a button you
click). You need to switch it to a 6-digit numeric code instead.

1. In Supabase, go to Authentication → Email Templates
2. Click on the "Magic Link" template
3. You'll see a template with {{ .ConfirmationURL }}
4. Change it to use {{ .Token }} instead — this is what makes it send
   a numeric code, not a clickable link.
   Replace the body with something like:

   Your SendivTech verification code is: {{ .Token }}
   This code expires in 10 minutes.

5. Save the template

Then also enable OTP sign-in:
6. Go to Authentication → Providers → Email
7. Make sure "Enable Email provider" is ON
8. Turn ON "Enable email OTP" (or "OTP expiry" — set it to 600 seconds = 10 min)
9. Save

---

## STEP 3 — Set up Supabase email sending (so OTPs actually arrive)

By default, Supabase has a rate-limited test email sender — fine for
development but you should connect a real sender before using this seriously.

Option A — Use Resend (recommended, free tier is plenty):
1. Go to resend.com, create a free account
2. Create an API key
3. In Supabase → Settings → Auth → SMTP Settings
4. Enable custom SMTP and fill in Resend's SMTP details:
   - Host: smtp.resend.com
   - Port: 465
   - Username: resend
   - Password: your Resend API key
   - Sender email: something@yourdomain.com (must be a domain you own and
     have verified with Resend)
5. Save and send a test email

Option B — Use Supabase's built-in sender (easiest, fine for personal use):
No setup needed. It just works but is rate-limited to a few emails per hour.
For your own personal finance tool, this is completely fine.

---

## STEP 4 — Get your Supabase API keys

1. In Supabase → Settings → API
2. Copy:
   - Project URL  (looks like https://xxxxx.supabase.co)
   - anon public key  (long string starting with eyJ...)

Keep this tab open — you'll need these in Step 6.

---

## STEP 5 — Push code to GitHub

1. Go to github.com → New repository
2. Name it sendivtech-finance, set to Private, click Create
3. On your computer, open a terminal in this project folder and run:

   git init
   git add .
   git commit -m "Initial commit — SendivTech Finance Ledger with 2FA"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/sendivtech-finance.git
   git push -u origin main

   (GitHub shows you this exact command on the new repo page too)

---

## STEP 6 — Deploy to Vercel

1. Go to vercel.com, sign in with GitHub
2. Click Add New → Project
3. Select the sendivtech-finance repo
4. Before clicking Deploy, open Environment Variables and add:

   NEXT_PUBLIC_SUPABASE_URL        →  paste your Project URL from Step 4
   NEXT_PUBLIC_SUPABASE_ANON_KEY   →  paste your anon public key from Step 4

5. Click Deploy

Vercel builds the site in about 2 minutes and gives you a live URL like
sendivtech-finance.vercel.app — that is your finance dashboard.

---

## STEP 7 — Create your login

1. Open your live URL
2. Click "First time here? Create an account"
3. Enter your email and a strong password (at least 8 characters recommended)
4. Supabase sends a confirmation email — click the link in it to activate
   your account (this only happens once, at signup)
5. Come back to the site and sign in:
   - Enter your email + password → click Continue
   - A 6-digit code arrives in your email within a few seconds
   - Enter the code → click Verify and sign in
   - You're in

From now on, every time you sign in, both steps are required.

---

## Running locally (test on your own computer before deploying)

1. Install Node.js from nodejs.org if you don't have it
2. In this project folder, duplicate .env.local.example and rename the
   copy to .env.local — fill in your real Supabase URL and key
3. In terminal:

   npm install
   npm run dev

4. Open http://localhost:3000

Any changes you push to GitHub will automatically redeploy on Vercel.

---

## Security summary — what this actually protects

PROTECTS YOU FROM:
- Someone who only knows your password (they still need the email code)
- Someone who only has access to your email (they still need the password)
- Someone who finds the live URL (they need both to get past the login)
- Database intrusion — row-level security means Postgres itself refuses to
  return any data row that doesn't belong to the authenticated user, even
  with direct database access
- Receipt file access — files are in a private storage bucket, only served
  as 5-minute signed links after login verification passes

DOES NOT PROTECT AGAINST:
- Someone who has access to both your email inbox AND knows your password
- Someone who physically has your logged-in device (12-hour OTP cookie is active)
- A Supabase-side breach of their infrastructure (out of your control)

For a personal business finance tracker, this is genuinely strong protection.
It is not the same as a regulated financial system with audit logging and
compliance controls — but for tracking SendivTech's income and expenses, it
is more than sufficient.

---

## File structure quick reference

sendivtech-finance/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── check-password/route.ts  ← stage 1: verify password, send OTP
│   │   │   ├── verify-otp/route.ts      ← stage 2: verify OTP code, set cookie
│   │   │   └── signout/route.ts         ← clears both session + OTP cookie
│   │   ├── expenses/route.ts            ← list + create expenses
│   │   ├── expenses/[id]/route.ts       ← update + delete expense
│   │   ├── income/route.ts              ← list + create projects
│   │   ├── income/[id]/route.ts         ← update + delete project
│   │   ├── upload/route.ts              ← upload receipt to Supabase Storage
│   │   └── receipt-url/route.ts         ← generate 5-min signed URL to view receipt
│   ├── login/page.tsx                   ← two-stage login UI (password → OTP)
│   ├── dashboard.tsx                    ← main finance app (overview, expenses, income)
│   ├── page.tsx                         ← root page (renders dashboard)
│   ├── layout.tsx                       ← HTML shell + fonts
│   ├── globals.css                      ← Tailwind base
│   └── types.ts                         ← shared TypeScript types
├── lib/
│   ├── supabase-browser.ts              ← Supabase client for React components
│   └── supabase-server.ts               ← Supabase client for API routes
├── middleware.ts                         ← enforces password+OTP gate on every route
├── supabase-schema.sql                   ← run once in Supabase SQL editor
├── .env.local.example                    ← copy → .env.local, fill in your keys
├── .gitignore                            ← keeps secrets and node_modules off GitHub
├── package.json                          ← dependencies
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
