# Univerz CRM — Design System &amp; UI Notes

This is the look-and-feel spec for the CRM. It documents *what* the design is and, more usefully, *why* — so when someone extends it later, the tool still feels like one deliberate thing instead of a pile of components.

---

## 1. The brief, in one line

A practical internal call tool for a 6-person creative agency. It is **read by scanning** — names, numbers, times — and used in short bursts between phone calls. So it should feel like a well-built workshop bench, not a marketing website.

### What we are deliberately *not* doing

A lot of generated dashboards land in the same place: a violet→indigo gradient, glassy frosted cards, everything in `rounded-2xl`, Inter everywhere, an emoji in every heading, huge empty hero space, and a "✨ AI-powered" badge. It looks impressive in a screenshot and tiring to use every day.

This design goes the other way on purpose:

- **No gradients as decoration.** Flat surfaces. Colour is used to *mean* something (overdue = clay red), never just to look modern.
- **System fonts, not a trendy webfont.** The UI uses the operating system's own typeface. It loads instantly, costs nothing, works offline, and reads as honest and plain — exactly the "normal, hand-built" feeling that was asked for. The only second face is a **monospace for data** (phone numbers, times, counts), because a CRM lives and dies by reading numbers cleanly.
- **Modest corners and real borders.** 7px radius, hairline warm borders. Not pill-shaped everything.
- **Density over air.** Internal tools earn their keep by showing a lot at once without feeling cramped. Generous whitespace is for landing pages.
- **One accent, one alarm.** Teal for "this is the brand / the primary action", clay for "this needs attention now". That's it. Restraint is the style.

The signature is not a graphic flourish — it's the **call queue with the coloured status spine and monospace timing**. That's the one memorable thing, and everything around it stays quiet.

---

## 2. Colour tokens

Warm paper base (not cold grey, not the over-used cream), dark slate ink, and a tight accent set. All defined as CSS variables in `:root` so they're swappable in one place.

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#faf8f4` | App background (warm off-white) |
| `--surface` | `#ffffff` | Cards, tables, modals |
| `--surface-2` | `#f3f0e9` | Hovers, table headers, sunken panels |
| `--ink` | `#20262e` | Primary text |
| `--ink-soft` | `#444b54` | Secondary text |
| `--muted` | `#6f6a60` | Labels, captions, meta |
| `--line` | `#e7e1d6` | Hairline borders (warm, not grey) |
| `--line-strong` | `#d8d1c2` | Input borders |
| `--teal` | `#1f5c5a` | **Primary** — brand, main buttons, active nav |
| `--teal-deep` | `#174644` | Pressed / hover of primary |
| `--teal-wash` | `#e8f0ef` | Active nav background, web service tag |
| `--clay` | `#bb472b` | **Alarm** — overdue, destructive, "do not call" |
| `--clay-wash` | `#f7e7e1` | Soft alarm backgrounds |
| `--amber` | `#9a6a14` | "Due today", social service tag |
| `--green` | `#3c7a4e` | Success, "won", photography tag |
| `--purple-ish` | `#5a466a` | Videography tag (the one cool accent, used tiny) |

**Service colour coding** (consistent everywhere a service appears):
Web = teal · Social = amber · Photography = green · Videography = muted purple.
This lets the team scan a list and see the *kind* of work without reading.

**Rule:** colour must carry meaning. If you're adding colour just to brighten something up, don't.

---

## 3. Typography

```
UI / body:  system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
Data:       ui-monospace, "SF Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace
```

- **Body/UI** is the system sans. No webfont download, no FOUT, no licence. It reads as "a tool someone built", which is the requested vibe.
- **Mono** is reserved for **phone numbers, times, dates, counts, IDs** and the big stat numbers. This is the one real typographic decision and it does real work: numbers line up, they're easy to read aloud during a call, and the contrast between sans labels and mono data gives the whole thing a quiet engineered character.

Type scale (px): 25 (stat numbers) · 16 (page title) · 14 (base) · 13.5 (controls) · 12.5 (meta) · 11 (uppercase labels). Weights: 400 body, 550–600 emphasis, 650–700 headings. Sentence case everywhere — never Title Case On Buttons.

---

## 4. Layout

```
┌──────────┬───────────────────────────────────────────────┐
│  SIDEBAR │  TOPBAR: title + crumb · search · [New contact]│
│          ├───────────────────────────────────────────────┤
│  brand   │                                               │
│          │   stat strip  (4 small counters)              │
│  Work    │                                               │
│  ▸ Today │   ── Overdue ───────────────────  3           │
│  Contacts│   [ queue card ] [ queue card ] …             │
│  Appts   │                                               │
│  Pipeline│   ── Due today ─────────────────  4           │
│          │   [ queue card ] …                            │
│  Team    │                                               │
│ ──────── │                                               │
│ acting as│                                               │
└──────────┴───────────────────────────────────────────────┘
```

- **Fixed left sidebar** (228px): brand, grouped nav, "acting as" switch pinned to the bottom. The nav badge on *Today's calls* shows the number due — it's the first thing you should look at.
- **Sticky topbar**: page title + one-line description, a single search box, and the one primary action (New contact). Only one primary button on screen at a time.
- **Content area** scrolls; sections are separated by a label + count + a thin rule, not big gaps.
- **Mobile (&lt;880px):** sidebar becomes a horizontal nav strip, stats go 2-up, the board stacks, queue cards drop their side action bar to a full-width row.

---

## 5. Components

**Queue card (the signature).**
A 4px coloured **spine** on the left encodes urgency (clay = overdue, amber = due today, teal = coming up) — readable before you read a single word. Body shows name · company · service pill · stage pill, then a meta row with the mono phone number, the timing, the owner dot. Right edge holds the two actions. Overdue cards swap the time for a blunt "2d overdue" in clay.

**Pills.** Tiny uppercase tags. Service pills are colour-coded (see §2); stage pills are neutral grey, sentence case.

**Stat tiles.** Small. Mono number, muted label, a 3px progress bar. The overdue tile turns its number clay so a bad morning is obvious.

**Table (contacts).** Uppercase muted headers on a sunken header row, hairline row dividers, hover tint, mono phone column, owner shown as colour-dot + name. Row hover is the only motion.

**Appointment row.** A left date block (big mono day + short month), title with a type pill, a meta line with mono time/duration, the linked person, location, assigned staff dot. Done ones dim and strike through.

**Pipeline board.** Five sunken columns, white draggable cards, a dashed teal drop-outline when you drag over a column.

**Modals.** White sheet, rounded 11px, header / padded body / sunken footer. The footer keeps cancel + one primary on the right; destructive (delete) sits far left. Backdrop is a dark wash, click-outside and Esc both close.

**Disposition chips.** In the log-call modal the outcomes are chips, not a dropdown — faster to hit, and the tone colours (green = good, clay = bad) give instant feedback. Picking certain outcomes slides open the relevant sub-panel (next-call scheduler or appointment booker) so the flow stays in one place.

**Toast.** Dark pill bottom-right, green tick dot, auto-dismiss. Confirms an action without a blocking dialog.

---

## 6. Motion

Animation is used sparingly and always for a reason. Overdo it and the tool starts to feel "AI-generated" again, so the rule is: motion explains, it doesn't perform.

| Where | What | Why |
|---|---|---|
| View change | cards/rows rise + fade, lightly staggered | shows the list rebuilding, gives a sense of "fresh data" |
| Stat strip | staggered rise on load | draws the eye to the numbers first |
| Modal open | backdrop fade + sheet pops up 14px | clear "a thing opened" without being slow |
| Sub-panels | slide open when a disposition needs them | keeps the call flow on one screen |
| Toast | slides in from the right, fades out | non-blocking confirmation |
| Buttons | 1px press, slight background shift | physical feedback |
| Pipeline | card fades while dragging, column shows dashed drop zone | makes drag-and-drop legible |

Durations are short (150–320ms) with a soft ease. **`prefers-reduced-motion: reduce` switches every animation and transition off** — non-negotiable accessibility floor.

---

## 7. Voice &amp; copy

- Plain verbs that say what happens: **Log call, Save call, Book the appointment, Mark done.** The button that says "Save call" produces a toast that says "Call logged" — same idea, no surprises.
- Name things the way a caller thinks: "How did it go?" not "Select disposition". "Next call" not "Follow-up scheduling".
- Empty states give a next step, not a mood: *"Nothing in the queue — open a contact and set a next-call time, or add a new contact."*
- No exclamation marks, no "Oops!", no emoji in the chrome. (A location 📍 pin on an appointment is the one allowed pictograph, because it genuinely aids scanning.)

---

## 8. Accessibility floor

- Visible focus outline on inputs (teal wash ring).
- Contrast meets AA for text on its background.
- Targets are comfortably tappable on mobile.
- Reduced-motion respected (see §6).
- Colour is never the *only* signal — overdue also carries the "Nd overdue" text, service pills carry the label, not just the hue.

---

## 9. How to extend without breaking the feel

1. **Reuse the tokens.** Never hardcode a hex; pull from `:root`. New status? Add a token, give it meaning.
2. **One primary action per screen.** If you need a second important button, ask whether the screen is doing too much.
3. **Numbers go mono.** Anything you read aloud or compare belongs in the mono face.
4. **Earn every animation.** If it doesn't help someone understand what changed, cut it.
5. **Density first.** Before adding whitespace, ask if a busy caller would rather see one more row.

The whole thing is one CSS block at the top of `univerz-crm.html` — tokens, components, motion, responsive — so the design lives in one readable place.
