# Univerz CRM — Code Guide

How the prototype is built, why it's built that way, and how to take it from "single file on a laptop" to "shared database the whole team uses."

The complete, runnable code is the file **`univerz-crm.html`** — one file, no build step, no framework, no CDN. This guide explains its parts and gives you the snippets you'll actually edit. (The full source isn't pasted here a second time on purpose — one source of truth avoids the two copies drifting apart.)

---

## 1. Why a single hand-written file

The brief asked for something that reads as **hand-coded and normal**, not generated. So:

- **No framework, no build.** Plain HTML + CSS + vanilla JavaScript. You double-click the file and it runs — on any laptop, even with no internet.
- **No CDN, no webfonts.** Nothing to load, nothing to break. The "design system" is one CSS block at the top.
- **Browser storage as the database.** Everything is kept in `localStorage` under one key. First run seeds realistic Sri Lankan agency data so the team sees the shape immediately.

This makes it perfect for two jobs at once: a *real internal tool* one team can use this week, and a *clickable spec* for the proper build.

The trade-off to know: localStorage is **per-browser**. Each person's copy is their own — there's no sharing yet. That's exactly what §5 (Supabase) fixes.

---

## 2. File anatomy

```
univerz-crm.html
├── <style>   one CSS block
│   ├── :root tokens          ← all colours, fonts, radius live here
│   ├── layout shell          ← .app grid, sidebar, topbar
│   ├── components            ← queue cards, table, appts, board, pills, modal, toast
│   ├── @keyframes            ← rise / fade / pop / slidein
│   └── @media                ← reduced-motion + mobile breakpoint
└── <script>  one JS block, top to bottom:
    ├── STORE        constants (services, stages, dispositions), seed(), load/save
    ├── helpers      uid, date formatting, lookups, esc()
    ├── ROUTER       go(view) + draw(); PAGES map
    ├── VIEWS        renderToday / renderContacts / renderAppointments /
    │                renderPipeline / renderTeam
    ├── MODALS       contactForm() and logCallForm()  ← the core flow
    └── EVENTS       click delegation, search, "acting as", badges, toast, boot
```

Read it top to bottom — it's written to be read.

---

## 3. The data store

Everything is one plain object persisted as JSON:

```js
const KEY = "univerz_crm_v1";

function load(){
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch(e){}
  const s = seed(); save(s); return s;            // first run → seed sample data
}
function save(s){ try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e){} }

let DB = load();   // DB.contacts, DB.calls, DB.appointments, DB.users, DB.currentUserId
```

Anywhere you change data you do two things: mutate `DB`, then `save(DB)` and `draw()`. That's the whole state model — no reducers, no virtual DOM. For a 6-person tool with a handful of records, re-rendering the current view on each change is instant and keeps the code obvious.

**To wipe and re-seed during testing:** open the browser console and run
`localStorage.removeItem('univerz_crm_v1')`, then refresh.

---

## 4. The core flow: logging a call

This is the function worth understanding — `logCallForm(contact)`. The pattern:

1. Render the modal with the outcome **chips**, a note box, and two hidden **sub-panels** (next-call scheduler, appointment booker).
2. When an outcome is picked, decide which sub-panel to reveal:

```js
$("#dispo").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  $$("#dispo .chip").forEach(x => x.classList.remove("sel"));
  b.classList.add("sel"); dispo = b.dataset.d;

  const wantsNext = ["callback","noanswer","busy","notnow"].includes(dispo);
  const wantsAppt = dispo === "appt";
  $("#sp-next").classList.toggle("show", wantsNext);   // slide open scheduler
  $("#sp-appt").classList.toggle("show", wantsAppt);   // slide open booker
});
```

3. On save, record the call, apply the side-effects to the contact (set next call, flag do-not-call, advance the stage, create the appointment), then `save(DB)` and `draw()`:

```js
DB.calls.push({ id:uid(), contactId:c.id, userId:DB.currentUserId,
                at:Date.now(), disposition:dispo, note:..., durationSec:0 });
c.lastDisposition = dispo;

if (dispo === "dnc")        { c.doNotCall = true; c.nextCallAt = null; }
else if (dispo === "won")   { c.stage = "won";    c.nextCallAt = null; }
else if ($("#sp-next").classList.contains("show")) {
  c.nextCallAt = chosenDateTime || Date.now() + DAY;   // "call back later"
}
// "booked appointment" → push to DB.appointments, bump stage to qualified
```

The whole design goal — *clear a call in 3–4 clicks* — comes from keeping the next step inside this one modal.

---

## 5. The call queue logic

"Today" is just sorting + grouping. No magic:

```js
const q = DB.contacts
  .filter(c => !c.doNotCall && c.nextCallAt)   // only callable, scheduled contacts
  .filter(matchSearch)
  .sort((a,b) => a.nextCallAt - b.nextCallAt);  // soonest first

const overdue = q.filter(c => c.nextCallAt < now);
const today   = q.filter(c => sameDay(c.nextCallAt, now) && !overdue.includes(c));
const later   = q.filter(c => !overdue.includes(c) && !today.includes(c));
```

Overdue cards get the clay spine and a `"2d overdue"` label via `relOverdue()`.

---

## 6. Where the animations live

All motion is four small keyframes plus a stagger trick — no animation library.

```css
@keyframes rise   { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:none} }
@keyframes fade   { from{opacity:0} to{opacity:1} }
@keyframes pop    { from{opacity:0;transform:translateY(14px) scale(.985)} to{opacity:1;transform:none} }
@keyframes slidein{ from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:none} }
```

Lists stagger by setting a per-item delay from JS:

```html
<div class="qcard" style="--d:0.12s"> … </div>
```
```css
.stagger > * { animation-delay: var(--d, 0s); }
```

And the accessibility kill-switch — one block turns everything off for people who ask their OS to reduce motion:

```css
@media (prefers-reduced-motion: reduce){
  * { animation: none !important; transition: none !important; }
}
```

Keep new motion to this vocabulary so the feel stays consistent (and doesn't tip back into looking machine-generated).

---

## 7. Customising it for your real data

Quick edits, all near the top of the script:

- **Team / the 6 people** → edit the `users` array in `seed()` (name, role, colour, initials).
- **Service lines** → the `SERVICES` constant. (If you change ids, also add a matching `.pill.<id>` colour in the CSS.)
- **Pipeline stages** → the `STAGES` constant.
- **Call outcomes** → the `DISPOSITIONS` constant, and the `wantsNext` / `wantsAppt` lists in `logCallForm` if a new outcome should open a sub-panel.
- **Appointment types** → the `APPT_TYPES` constant.
- **Start empty** instead of seeded → make `seed()` return empty arrays (keep `users`).

---

## 8. Phase 2 — moving to a shared database (Supabase)

The prototype is structured so the jump to a shared backend is a *swap*, not a rewrite. The screens and render functions stay; only `load`/`save` and the few mutation points change to async calls.

### 8.1 Schema (SQL)

```sql
create table app_user (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text check (role in ('admin','manager','caller','coordinator','field')),
  color text, initials text,
  auth_id uuid references auth.users  -- link to Supabase Auth
);

create table contact (
  id uuid primary key default gen_random_uuid(),
  name text not null, company text, phone text, email text,
  service text check (service in ('web','social','photo','video')),
  stage text check (stage in ('new','contacted','qualified','proposal','won')),
  owner uuid references app_user(id),
  source text, notes text,
  next_call_at timestamptz,
  last_disposition text,
  do_not_call boolean default false,
  created_at timestamptz default now()
);

create table call (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contact(id) on delete cascade,
  user_id uuid references app_user(id),
  at timestamptz default now(),
  disposition text, note text, duration_sec int default 0
);

create table appointment (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contact(id) on delete cascade,
  user_id uuid references app_user(id),
  title text, type text,
  at timestamptz, duration_min int default 60,
  location text, notes text,
  status text default 'scheduled' check (status in ('scheduled','done','cancelled'))
);
```

### 8.2 Row-Level Security (this is where roles become real)

```sql
alter table contact enable row level security;

-- callers see contacts they own; managers/admins see all
create policy contact_read on contact for select using (
  exists (select 1 from app_user u
          where u.auth_id = auth.uid()
            and (u.role in ('admin','manager','coordinator')
                 or contact.owner = u.id))
);
```

This delivers **NFR-9** from the requirements: a caller can't see contacts that aren't theirs unless they're a manager/admin.

### 8.3 Swap the store

Replace the localStorage `load`/`save` with Supabase reads/writes. The render functions don't change — they still read from an in-memory `DB`; you just hydrate it from Supabase and push changes back.

```js
import { createClient } from '@supabase/supabase-js';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadDB(){
  const [{data:users},{data:contacts},{data:calls},{data:appointments}] = await Promise.all([
    sb.from('app_user').select('*'),
    sb.from('contact').select('*'),
    sb.from('call').select('*'),
    sb.from('appointment').select('*'),
  ]);
  return { users, contacts, calls, appointments, currentUserId: (await sb.auth.getUser()).data.user.id };
}

// instead of save(DB), write the single thing that changed, e.g.:
await sb.from('contact').update({ next_call_at: iso, stage, last_disposition: dispo }).eq('id', c.id);
await sb.from('call').insert({ contact_id:c.id, user_id:me, disposition:dispo, note });
```

### 8.4 Live updates for all 6

Because Supabase has realtime, when one caller logs a call everyone else's queue updates without a refresh:

```js
sb.channel('crm')
  .on('postgres_changes', { event:'*', schema:'public', table:'contact' },
      async () => { DB = await loadDB(); draw(); })
  .subscribe();
```

That's the whole upgrade: same UI, same flow, now shared and secured. (Map `snake_case` DB columns to the prototype's `camelCase` field names in `loadDB`, or rename the fields once — small, mechanical.)

---

## 9. Phase 3 hooks (small, high-value)

- **WhatsApp click-to-chat** on a contact: `https://wa.me/94XXXXXXXXX` (strip the leading 0, add 94).
- **Tap to dial** on mobile: wrap the phone in `<a href="tel:+94…">`.
- **CSV import**: parse with a tiny reader, map columns to the contact shape, `insert` in a batch.
- **Reminders**: a daily query for overdue calls → browser notification, email (Supabase Edge Function), or a WhatsApp message.

---

## 10. Running &amp; sharing it now

- **Use it:** double-click `univerz-crm.html`. Works offline; data saves in that browser.
- **Put it on a phone/another laptop:** drop the file on any static host (Netlify drop, GitHub Pages, or even open from a shared drive). Until Phase 2, each browser keeps its own data.
- **Reset:** console → `localStorage.removeItem('univerz_crm_v1')` → refresh.

When you're ready for the shared version, the schema and swap in §8 are the whole plan.
