# Univerz CRM — Requirements Specification

**Product:** Internal call &amp; appointment CRM
**Company:** Univerz (Private) Ltd — web design, social media marketing, photography &amp; videography
**Users:** 6 (single team, one office)
**Document type:** Software Requirements Specification (SRS) + scope notes
**Status:** v1 — for build

---

## 1. Why this exists (the one job)

Univerz gets leads from referrals, Facebook/Instagram, the website form, expos and cold lists. Today those leads live in WhatsApp chats, phone contacts and a couple of spreadsheets. People get called twice, or never. Nobody knows who promised to call a lodge owner back on Thursday.

This system has **one core job**: *make sure the right person at Univerz calls the right lead at the right time, books the meeting or shoot, and never loses the thread.*

Everything else — pipeline, reports, fancy dashboards — is secondary. If the tool nails the call queue and the appointment booking, it has earned its place. The design and the build are both organised around that.

The shape of the daily loop:

```
Lead comes in ─▶ assigned to an owner ─▶ shows up in their call queue
      ▲                                              │
      │                                              ▼
   convert  ◀── appointment happens ◀── call logged with an outcome
   to client                                         │
                                                      ├─ set next call (call back later)
                                                      ├─ book appointment (meeting / shoot)
                                                      └─ close or drop (won / not interested)
```

---

## 2. Scope

### In scope (v1 / MVP)
- Contact &amp; lead records (the people we call)
- A **call queue** — who is due and who is overdue, sorted oldest-first
- **Log a call** with an outcome (disposition) in one short flow
- From that same flow: **set the next call** OR **book an appointment**
- **Appointments** for meetings, photo/video shoots and site visits, assigned to a team member
- A simple **pipeline board** (drag a card to move its stage)
- **6 users** with names, roles and a colour, plus an "acting as" switch
- Basic **activity feed** (who called whom, who has what booked)
- **Search** across name / company / phone
- Works on a laptop and is usable on a phone

### Phase 2 (after the team is living in it)
- Login / authentication and real per-user permissions
- WhatsApp "click to chat" and call-from-phone deep links
- Reminders / notifications (browser, email, or WhatsApp)
- Quotation &amp; service-package linkage
- Reporting exports (calls per person, conversion by source)
- Import contacts from CSV / Google Contacts
- Recurring follow-up cadences

### Out of scope (deliberately, for now)
- Full accounting / invoicing (Univerz has separate tools)
- Project / production task management after a deal is won
- Email marketing campaigns
- Client-facing portal

Keeping v1 narrow is the point. A 6-person team will not adopt a 40-screen system. They will adopt a fast call queue.

---

## 3. Users &amp; roles

Six seats, mapped to how Univerz actually works. Roles are about *what you can change*, not job titles.

| # | Person (example) | Role in the tool | Can do |
|---|---|---|---|
| 1 | Subodha (Director) | **Admin** | Everything: settings, all contacts, reassign owners, see all reports |
| 2 | Account manager | **Manager** | All contacts, assign/reassign, pipeline, appointments for anyone |
| 3 | Telecaller | **Caller** | Own + assigned contacts, work the call queue, log calls, book appointments |
| 4 | Telecaller | **Caller** | Same as above |
| 5 | Project coordinator | **Coordinator** | Read all, manage appointments &amp; shoot scheduling, assign field staff |
| 6 | Photographer / videographer | **Field** | See own appointments &amp; shoot schedule, mark them done, read contact details for those jobs |

> In the v1 prototype there is no login — everyone shares the screen and uses the **"acting as"** switch (bottom-left) so a call is logged under the right name. Real role enforcement comes with auth in Phase 2 (see §8).

---

## 4. Functional requirements

Each requirement has an ID so you can tick them off during build/testing.

### 4.1 Contacts &amp; leads
- **FR-C1** Create a contact with: name, company, phone (required-ish: name is the only hard-required field), email (optional), service needed, stage, owner, source, notes.
- **FR-C2** Service needed is one of: **Web, Social media, Photography, Videography** (matches Univerz's four service lines).
- **FR-C3** Edit and delete a contact.
- **FR-C4** Each contact has an **owner** (one of the 6) shown with a colour dot everywhere.
- **FR-C5** Each contact can carry a **next-call** date/time, or none.
- **FR-C6** A contact can be flagged **Do not call** — it then drops out of the queue permanently until un-flagged.
- **FR-C7** Contacts list is searchable and sortable; default sort = soonest next-call first.

### 4.2 The call queue (core)
- **FR-Q1** "Today's calls" shows every contact with a next-call time, grouped into **Overdue**, **Due today**, **Coming up**.
- **FR-Q2** Overdue is sorted oldest-first (the call you've been avoiding longest is on top) and visually flagged in the alarm colour with a "Nd overdue" label.
- **FR-Q3** Each queue card shows name, company, service, stage, phone (monospace, easy to read aloud), owner, and the last outcome.
- **FR-Q4** One click "Log call" opens the call flow; one click "Open" edits the contact.
- **FR-Q5** Top-of-page counters: overdue, due today, calls logged today, appointments today.
- **FR-Q6** Do-not-call and contacts with no next-call never appear here.

### 4.3 Logging a call (the most-used flow)
- **FR-L1** From one modal, the caller picks an **outcome** from a fixed list:

  | Outcome | What happens automatically |
  |---|---|
  | Spoke — interested | Stage nudges New → Contacted; prompts you to set next step |
  | Call back later | Opens "schedule next call" with quick buttons (3h / tomorrow / 3 days / next week) |
  | No answer | Opens "schedule next call" |
  | Busy / engaged | Opens "schedule next call" |
  | Booked appointment | Opens the inline appointment booker |
  | Closed — won | Stage → Won, removed from queue |
  | Not now | Opens "schedule next call" |
  | Not interested | Removed from queue |
  | Wrong number | Removed from queue |
  | Do not call | Sets do-not-call flag, removed from queue |

- **FR-L2** A free-text **note** is always available.
- **FR-L3** Setting the next call from quick buttons (e.g. "Tomorrow") fills the date/time field so the caller doesn't have to type.
- **FR-L4** "Booked appointment" lets the caller create the appointment (type, who it's assigned to, date/time, duration, location) **without leaving the call flow**.
- **FR-L5** Every saved call is recorded against the contact (who, when, outcome, note) and shown in activity.
- **FR-L6** The call is attributed to the **currently acting user**.

### 4.4 Appointments
- **FR-A1** An appointment has: linked contact, assigned team member, title/type, date &amp; time, duration, location, notes, status.
- **FR-A2** Types reflect agency reality: **Discovery meeting, Shoot / site visit, Proposal review, Follow-up call, Handover**.
- **FR-A3** Appointments can be created from a call (FR-L4) or from the appointments screen.
- **FR-A4** Appointments list is sorted by date with a clear date block, time, person and assigned staff.
- **FR-A5** Mark an appointment **done**; done appointments stay visible but dimmed.
- **FR-A6** A field staff member (photographer) can see and complete their own appointments.

### 4.5 Pipeline
- **FR-P1** Five stages: **New lead → Contacted → Qualified → Proposal → Won.**
- **FR-P2** Board view with one column per stage and a count per column.
- **FR-P3** **Drag a card** to another column to change its stage; the change is saved immediately.
- **FR-P4** Cards show name, company, service tag and owner colour.

### 4.6 Team &amp; activity
- **FR-T1** People screen lists all 6 with role, contacts owned, calls today, scheduled appointments.
- **FR-T2** Recent activity feed: latest calls and appointments across the team.
- **FR-T3** "Acting as" switcher changes whose name actions are logged under.

### 4.7 Search
- **FR-S1** A single search box filters the current view by name, company or phone.

### 4.8 Data &amp; persistence
- **FR-D1** v1 stores everything in the browser (localStorage) so it runs with zero setup — open the file and it works.
- **FR-D2** Sample Sri Lankan agency data is seeded on first run so the team can see the shape immediately.
- **FR-D3** Phase 2 moves data to a shared database (Supabase) so all 6 see the same thing in real time — see code guide.

---

## 5. Non-functional requirements

- **NFR-1 Speed.** Opening the queue and logging a call must feel instant. No spinner for a 9-contact list. Target: any action under 150 ms on a normal laptop.
- **NFR-2 Few clicks.** Logging a "no answer + call tomorrow" should take 3 clicks: *Log call → No answer → Tomorrow → Save.* (4 incl. save.) This is the single most important usability target.
- **NFR-3 Readable numbers.** Phone numbers, times and counts are in a monospace face so they're easy to read aloud and scan. (Design decision, see design doc.)
- **NFR-4 Works offline-ish.** v1 has no server dependency; it keeps working without internet.
- **NFR-5 Mobile usable.** Callers sometimes work from a phone — the layout collapses to one column and stays tappable.
- **NFR-6 No training needed.** A new telecaller should understand the queue in under two minutes without a manual.
- **NFR-7 Accessibility floor.** Visible keyboard focus, sensible contrast, `prefers-reduced-motion` respected (animations turn off for people who ask the OS to reduce motion).
- **NFR-8 Small footprint.** Single HTML file, no build step, no external CDN — it can't break because a CDN went down.
- **NFR-9 Safe by default (Phase 2).** When auth is added, a caller can't see or edit contacts that aren't theirs unless they're a Manager/Admin (row-level security).

---

## 6. Data model

Plain shapes. This maps 1:1 to the prototype's store and to a Supabase schema later.

**Contact**
```
id, name, company, phone, email,
service   (web | social | photo | video),
stage     (new | contacted | qualified | proposal | won),
owner     (user id),
source    (free text: referral, facebook, expo…),
notes,
nextCallAt        (timestamp | null),
lastDisposition   (disposition id),
doNotCall         (true | false),
createdAt
```

**Call**
```
id, contactId, userId, at, disposition, note, durationSec
```

**Appointment**
```
id, contactId, userId, title, type, at, durationMin,
location, notes, status (scheduled | done | cancelled)
```

**User**
```
id, name, role (admin | manager | caller | coordinator | field),
color, initials
```

Relationships: a Contact has many Calls and many Appointments; each Call and Appointment belongs to one User (who did it / is assigned).

---

## 7. Key workflows (acceptance scenarios)

**W1 — Morning call run.** Ishara opens the tool, lands on Today, sees 3 overdue and 4 due today. She works top-down: clicks Log call, picks an outcome, sets the next call or books a meeting, saves, moves to the next card. *Pass when she can clear the queue without ever leaving the Today screen.*

**W2 — Booking a shoot from a call.** Kavindu calls a villa owner who's ready. He picks "Booked appointment", chooses *Shoot / site visit*, assigns Roshan, sets the date and the Kandy location, saves. *Pass when the appointment appears on Roshan's list and the contact moves to Qualified.*

**W3 — Reschedule.** A lead says "call me next week." Caller picks "Call back later" → "Next week" → Save. *Pass when the contact disappears from today and reappears in the queue next week.*

**W4 — Dead lead.** "Not interested." One click removes it from the queue but keeps the history. "Do not call" additionally blocks it forever. *Pass when it's gone from the queue but still findable in Contacts.*

**W5 — Manager view.** Subodha opens People &amp; activity and sees calls-today per person and the live activity feed. *Pass when he can tell, at a glance, who's been calling and who hasn't.*

---

## 8. Phasing &amp; build order

1. **Phase 1 (this delivery).** Single-file working prototype, localStorage, seeded data, all of §4 except auth. Use it as the real internal tool for one team for a week and as the clickable spec for the real build.
2. **Phase 2 — shared backend.** Move the data model to Supabase (Postgres + Auth + Realtime + Row-Level Security). Same screens, real login, the 6 people all see one shared database live. The code guide shows the exact swap.
3. **Phase 3 — reach out from the tool.** WhatsApp click-to-chat, tel: links, browser/WhatsApp reminders, CSV import, basic reports.

---

## 9. Glossary

- **Disposition / outcome** — the result of a call (no answer, interested, booked, etc.).
- **Owner** — the one Univerz person responsible for a contact.
- **Queue** — the list of contacts due or overdue for a call.
- **Acting as** — temporary "log in" in the prototype: whose name actions are saved under.
- **Stage** — where a lead sits in the pipeline (New → Won).
- **Field staff** — photographer / videographer who works appointments out of office.

---

*Prepared for Univerz (Private) Ltd. Pair this with `Univerz-CRM-Design-System.md` (look &amp; feel) and `Univerz-CRM-Code-Guide.md` (how the prototype is built and how to take it to a shared database).*
