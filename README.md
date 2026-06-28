# InternHub 🚀

Intern Management & Operations Platform for **SI Placements Internationals** and **Site4People**.

---

## Quick Start

### 1. Set up Supabase
1. Go to [supabase.com](https://supabase.com) → New Project
2. Open **SQL Editor** → paste and run `server/migrations/001_init.sql`
3. Go to **Project Settings → API** → copy your Project URL and Service Role Key

### 2. Configure Environment
```bash
# Copy the example and fill in your Supabase credentials
cp server/.env.example server/.env
```

Edit `server/.env`:
```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

### 3. Install Dependencies
```bash
# From the internhub root:
npm run install:all
```

### 4. Seed the Database
```bash
cd server
npm run seed
```

### 5. Start Dev Servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# API running on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# App running on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Login Credentials (after seeding)

| Role               | Username    | Password      |
|--------------------|-------------|---------------|
| Admin              | `admin`     | `Admin@123`   |
| IT Intern          | `priya_it`  | `Intern@123`  |
| BD Intern          | `arjun_bd`  | `Intern@123`  |
| Recruitment Intern | `neha_rec`  | `Intern@123`  |

---

## Features by Role

### 🔑 Admin
- Full dashboard with all-company stats
- Create/edit/deactivate all users
- View and mark team attendance
- View all daily reports
- Full access to recruitment and BD pipelines
- Generate Offer Letters & Completion Certificates (PDF)
- Post announcements (targeted by role/company)

### 💻 IT Intern (Site4People)
- Personal dashboard + attendance check-in/out
- View and update assigned tasks (Kanban board)
- Submit daily end-of-day reports
- View announcements

### 📊 BD Intern (Site4People)
- BD Client pipeline (Cold → Deal Cracked)
- Create and manage invoices with line items
- Assign tasks to IT interns
- Submit daily reports

### 📞 Recruitment Intern (SI Placements)
- Candidate pipeline (Called → Selected/Rejected)
- Add/update candidates with full details
- Submit daily reports

---

## Architecture
```
internhub/
├── server/               # Node.js + Express backend
│   ├── src/
│   │   ├── routes/       # 10 route modules
│   │   ├── middleware/   # JWT auth + RBAC
│   │   ├── config/       # Supabase client
│   │   └── seed.js       # Database seeder
│   └── migrations/       # SQL schema
└── client/               # React + Vite + Tailwind frontend
    └── src/
        ├── pages/        # 12 pages
        ├── components/   # Layout: Sidebar, BottomNav, TopBar
        ├── contexts/     # AuthContext
        └── lib/          # Axios API client
```

## Working Hours
**Monday – Saturday, 10:00 AM – 7:00 PM**  
Sunday is OFF. Late check-in is auto-detected after 10:15 AM.
