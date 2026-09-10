# univerz Task Board - 6-Person Company Task Management Web App

A modern, collaborative Task Management Web App built with **React**, **Tailwind CSS**, **Lucide Icons**, and **Supabase Realtime**.

![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?style=flat&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?style=flat&logo=supabase&logoColor=white)

---

## 🚀 Features

- **Task Categories**:
  - 📋 **Daily Tasks**: Operational checklists with daily focus.
  - 🎯 **Weekly Tasks**: Sprint goals and milestone deliverables.
  - 🏢 **HR & Department Tasks**: Leave requests, policy paperwork, and performance reviews.
  - 💡 **General Tasks**: Cross-functional and company culture items.

- **1-Click Task Completion & Tick Actions**:
  - Single-click checkbox with animated checkmark and strikethrough styling.
  - Timestamp recording (e.g. `Done 10:45 AM`) and celebration micro-confetti.
  - Completion notes modal to log handover details or PR references.

- **Manager & Team Views**:
  - 📊 **Manager Overview Board**: Live cards with progress bars and completion percentages for all 6 team members (*Alex, Sarah, Marcus, Elena, David, Priya*).
  - ✍️ **Task Creator Form**: Assign tasks with category, priority (`Urgent`, `High`, `Medium`, `Low`), due dates, and tags.
  - 👤 **Staff "My Tasks" View**: Personal checklist with category tabs, pending counters, and quick tick-actions.
  - 🔄 **Role / User Switcher**: 1-click switcher in the top bar to easily switch between Manager and any staff member.

- **Supabase Backend & Realtime Sync**:
  - Complete schema with `profiles`, `tasks`, RLS policies, and realtime triggers in `supabase_schema.sql`.
  - Seamless zero-config local demo fallback engine.

---

## 🛠️ Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Run local development server
```bash
npm run dev
```

### 3. Build for production
```bash
npm run build
```

---

## 🗄️ Supabase Setup (Optional)

1. Create a project on [Supabase](https://supabase.com/).
2. Run the SQL script from `supabase_schema.sql` in the **SQL Editor**.
3. Create a `.env` file from `.env.example`:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. Start the app — tasks and profile statuses will sync in real-time across all devices!
