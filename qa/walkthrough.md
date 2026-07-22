# Virtual Ballot — End-to-End QA Walkthrough

Systematic click-through of every rebuilt screen against a live local stack.
The whole UI was rebuilt screen-by-screen and verified only in isolation (build
+ mockup); this is the first continuous run of the real flows. Do it once at
desktop width and once at **375px** (DevTools device toolbar).

---

## 0. Bring the stack up

Prereqs: Node 24, local PostgreSQL 18 running, backend deps installed
(`cd VBackend && npm install` — already done).

```bash
# 1. Put your Postgres password into VBackend/.env (replace __DB_PASSWORD__)
# 2. Create the database + build schema + demo data:
cd VBackend
node scripts/qa-bootstrap.mjs
npm run db:setup && npm run migrate:open && npm run migrate:paid \
  && npm run migrate:chain && npm run migrate:roster && npm run db:seed
# 3. Start the backend (leave running — OTPs print here):
npm run dev
# 4. In a second terminal, start the frontend:
cd ../Frontend && npm run dev     # http://localhost:5173
```

**Watch the backend terminal** — voter OTPs are logged there (no SMTP needed).

### Seeded test data
| What | Value |
|---|---|
| Org slug | `nuesa` |
| Admin login | `admin@nuesa.edu.ng` / `Admin1234!` |
| Observer PIN | `5566` |
| Voter matrics | `U/25/001`–`U/25/004` (Amina, Chukwuemeka, Fatima, Tunde) |
| Superadmin | `superadmin@virtualballot.app` / secret in `VBackend/.env` (`SUPERADMIN_SECRET`) |

Voter URL: `http://localhost:5173/vote/nuesa` · Admin: `/admin/login` · Observer:
`/observer/login?slug=nuesa` · Committee: `/roster-review` · Staff: `/staff/chat`
· Platform: `/superadmin/login`

---

## 1. Landing & acquisition
- [ ] `/` — hero rings animate; blue accent (no gradient text); sections alternate white/slate-50; the "Honest tie handling" card icon is amber; feature cards lift on hover.
- [ ] "Register your organization" → `/org/register`. Rings background. Type an org name → slug auto-fills; watch the live availability check (green ✓ available / red taken / spinner). URL preview chip appears.
- [ ] Continue → step 2 stepper advances; 8-char password hint visible; type mismatched passwords → red "don't match", matching → green "✓ Passwords match".
- [ ] Submitting a real new org should land on `/admin/login` with the green "Organization registered" banner + voter URL. *(Or skip — the seeded `nuesa` admin already exists.)*

## 2. Admin console (dark sidebar / light content)
- [ ] `/admin/login` — dark ringed Commission card, blue crest. Wrong password → card does `vb-shake`, password clears, specific error. The disabled Observer link shows its "temporarily unavailable" caption.
- [ ] Log in with `admin@nuesa.edu.ng` / `Admin1234!` → console. Sidebar: grouped nav (Election / Console), status chip, admin email footer.
- [ ] **Overview** — NOT_STARTED shows the setup checklist: exactly one blue "next" step with a solid CTA, done steps green, locked "Start" step explains why. KPI hero tile = "Votes cast".
- [ ] **Branding** — selection cards show the radio tick + blue ring; switch Closed↔Open, Free↔Paid (Paid selects **blue**, not amber); logo upload thumbnail; login preview mirrors the real voter login; Observer PIN mismatch shows written error.
- [ ] **Candidates** — add a candidate (name + position `President`; try a photo). Preview chip. Add 2–3 across President. Manifesto inline editor (blue Save). **Remove → confirm modal** (red Confirm). Ballot-preview cards match the real ballot.
- [ ] **Voters** — review panel leads. Add a committee reviewer → row with mono code chip + Copy invite. Upload: toggle replace-mode → row + upload button arm **amber**. Stat tiles act as filters (blue ring + "Filtering ✓"). Remove a voter → **confirm modal**. Lock-registry button caption states what it's waiting on.
- [ ] **Election** — phase stepper; labelled switch rows (broadcast/registry/countdown) with adjacent state text; set a short duration (e.g. 0h 2m) → **Start** (blue) confirm modal → status flips ACTIVE, countdown runs, registry auto-locks. Broadcast toggle → "Live" pill.
- [ ] **Audit Log** — auto-scroll is a **blue** toggle; typed filter pills with counts; Clear → **danger (red) confirm**; light event badges.
- [ ] Header: **New election** confirm is red (destructive); Refresh spins.

## 3. Voter flow (do this while the election is ACTIVE)
- [ ] `/vote/nuesa` — light ringed login. Enter `U/25/001` → Start voting.
- [ ] OTP page — 6 boxes, auto-advance. **Grab the code from the backend terminal.** Wrong code → `vb-shake`, boxes clear, red. Correct → green "✓ Verified" flash → ballot.
- [ ] Ballot — candidate cards, blue selected state + popping check. Open **Compare** on a position with 3+ candidates → modal (Escape + backdrop close; selected panel blue; swap dropdown). Pick each position → review modal → cast.
- [ ] Receipt — self-drawing green check; copy Receipt ID (✓ Copied); if a chain hash exists, the cryptographic-proof block + "Verify my vote →"; Email-me converts to green "Receipt emailed".
- [ ] Results (`/vote/nuesa/results`) — blue "Live" badge, hero "Votes cast" tile, blue leader bar + "Leading"/amber "Tied", VotePulse card while active. Vote as `U/25/002`–`004` to move the bars.
- [ ] Verify (`/verify/nuesa`, or the receipt link) — paste the hash → green "Vote verified" with mono rows; paste a truncated hash → **amber** "Not found" (not red).

## 4. Observer & committee
- [ ] `/observer/login?slug=nuesa` — dark ringed card, read-only note, PIN `5566` → dashboard. Dark header + light content; Live Tally (VotePulse), Vote Ledger (masked matrics, green Recorded), Audit Stream (light badges). Read-only badge always visible.
- [ ] `/roster-review` — light ringed card. Enter a reviewer code (from the Voters tab "Copy invite", or DB). Review the list; **Flag** an entry (amber inline editor). The scroll chip counts "N of M seen" → flips green "Full list seen"; approve gate caption lists what's outstanding; approve → self-drawing check confirmation.

## 5. Open / paid voting (optional — needs an OPEN election)
- [ ] In Branding set the election to **Open** (+ Free), start it, then `/open/nuesa`: light ballot, blue candidate selection, email-tier verify (code in terminal), gate hint names what's missing; cast → receipt-style success; `/open/nuesa/results`.
- [ ] Paid needs real Paystack test keys in `.env`; otherwise the redirect will fail at checkout — verify the ballot/summary UI renders and skip the redirect.

## 6. Support chat (both sides)
- [ ] Staff: `/staff/chat` — dark ringed login (needs a staff account; create via the admin **Staff** tab, or skip if unseeded). Console: dark header, light queue + conversation; urgent = red, waiting = amber, claimed = green; your messages blue.
- [ ] Voter widget: on any voter page, the floating blue launcher (white unread ring). Open → light panel, your-messages-blue / staff white / auto gray; send a message → it should surface in the staff queue.

## 7. Platform console (optional)
- [ ] `/superadmin/login` — dark ringed terminal card, secret-key reveal eye. Log in (secret from `.env`). Console: blue (no violet); "Live now" hero KPI; Organizations table → **Deactivate** opens the inline red reason form (required) → Confirm; Live/Invoices/Audit tabs render.

## 8. Cross-cutting checks
- [ ] **375px**: re-run §2–3 in the device toolbar. Admin sidebar collapses to a dark top bar + scrollable tab strip; ballot/results single-column; no horizontal scroll anywhere.
- [ ] **Modals**: every confirm/alert (GlobalModal) closes on **Escape** and **backdrop click**; destructive ones (end election, clear log, remove candidate/voter, new election, deactivate org) show the **red** Confirm.
- [ ] **Network toast**: DevTools → offline → white pill "No signal" (red, pulsing) bottom-right; back online → green "Back online".
- [ ] **Loaders**: no screen flashes blank on load — VBLoader (blue fingerprint) or skeletons show.
- [ ] **Console**: no React errors/warnings in the browser devtools during the walk.

---

### Known non-blockers
- Two chat consoles and SuperAdmin use `alert()` for action errors (they live outside `AppProvider`) — expected, not a regression.
- A few pre-existing `set-state-in-effect` / `exhaustive-deps` lint items remain in data-loader effects — untouched by the redesign.
