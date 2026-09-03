# Tasks: 3D Motion & Animation Layer Implementation

Map: each task maps 1-to-many from spec ACs. Status starts `pending` unless dependent.

---

## Task 1: Install dependency + base CSS system (NFR, FR-2)

- **Status:** pending
- **Priority:** high
- **Depends on:** —
- **Covers:** FR-2.1, FR-2.2, NFR-1.1, NFR-2.1, AC-15, AC-8 partial
- **Read paths first:**
  - [package.json](file:///c:/Users/Mounindra/Downloads/Affiliate%20Project/frontend/package.json)
  - [tailwind.config.js](file:///c:/Users/Mounindra/Downloads/Affiliate%20Project/frontend/tailwind.config.js)
  - [index.css](file:///c:/Users/Mounindra/Downloads/Affiliate%20Project/frontend/src/index.css)

### What to do
1. `cd frontend && npm install framer-motion@^11`.
2. In `tailwind.config.js` theme.extend: add `perspective: { '800': '800px', '1000': '1000px' }`, `backdropBlur` no change needed, `keyframes` + `animation` sections for `fade-up`, `sweep`, `float-y`, `pulse-soft`, `glow`, `shake-x`, `shrink-in`, `draw-check`, `slide-in-right`, `depth-pop`.
3. In `index.css` **append** (don't replace existing `.card`/`.btn`/`.input`/`.nav-link`/`.badge` definitions — layer new CSS on top):
   - CSS custom properties `:root { --perspective: 1000px; --tilt-max: 4deg; --depth-1: 4px; --depth-2: 8px; --depth-3: 16px; --depth-4: 24px; }`
   - `@media (prefers-reduced-motion: reduce) { :root { --tilt-max: 0deg; } * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; } .particle, .bg-plane { display: none !important; } }`
   - `.btn:hover { transform: translate3d(0,-2px,0); } .btn:active { transform: translate3d(0,1px,0) scaleY(0.97); } .btn { transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease, color .18s ease; transform-style: preserve-3d; }`
   - `.input { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; } .input:focus { transform: translate3d(0,-1px,0); box-shadow: 0 6px 18px -10px rgba(59,130,246,.35); } .input-error-anim { animation: shake-x .35s ease; }`
   - `.card { transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease, border-color .3s ease; transform-style: preserve-3d; will-change: transform; } .card-hover:hover { transform: translate3d(0,-4px,0); box-shadow: 0 20px 40px -18px rgba(15,23,42,.18); }`
   - `.nav-link { transition: transform .18s ease, background-color .18s ease, color .18s ease; } .nav-link:hover { transform: translate3d(2px,0,0); } .nav-link-active { box-shadow: inset 3px 0 0 theme('colors.brand.600'), 0 6px 18px -12px rgba(59,130,246,.45); }`
   - `.badge { transition: transform .25s ease, filter .25s ease; transform-style: preserve-3d; } .badge-pop { animation: depth-pop .45s cubic-bezier(.2,.8,.2,1); }`
   - `@keyframes shake-x { 0,100%{transform:translateX(0)} 20,60%{transform:translateX(-4px)} 40,80%{transform:translateX(4px)} }`
   - `@keyframes sweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }`
   - `@keyframes float-y { 0,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`
   - `@keyframes depth-pop { 0%{transform:scale(.6) rotateX(-10deg);opacity:0} 60%{transform:scale(1.1) rotateX(4deg)} 100%{transform:scale(1) rotateX(0);opacity:1} }`
   - `@keyframes fade-up { from{opacity:0;transform:translate3d(0,14px,0)} to{opacity:1;transform:translate3d(0,0,0)} }`
   - `@keyframes draw-check { from{stroke-dashoffset:100} to{stroke-dashoffset:0} }`
   - `.perspective-1000 { perspective: 1000px; } .preserve-3d { transform-style: preserve-3d; }`

### Test Requirements
- **TR-1 (rule):** after install, `cd frontend && npm run build` exits 0.
- **TR-2 (rule):** inspect index.css — existing `.btn-primary`, `.card`, `.nav-link` class definitions are PRESERVED (new rules appended, not replacing).
- **TR-3 (rule):** open devtools with `prefers-reduced-motion: reduce` → `.particle`/`.bg-plane` are `display:none;` and all animation durations are forced to near-zero.
- **TR-4 (rubric, 0-2, threshold 1):** how cleanly CSS hooks extend (don't replace) existing classes. `2` = no style regression, additive only; `1` = mostly ok, 1-2 minor override points; `0` = broken overrides.

---

## Task 2: Build shared animation primitives (FR-1)

- **Status:** pending
- **Priority:** high
- **Depends on:** Task 1
- **Covers:** FR-1.1, FR-1.2, FR-1.3, AC-21

### What to do
Create folder `frontend/src/components/anim/` with these files:

#### `hooks.js`
```
- useReducedMotion() — hook returns bool from media match
- useTilt(ref, opts={max:4, disabled:false}) — tracks pointer on element + sets rotateX/rotateY via transform with requestAnimationFrame, damped (lerp 0.15), disabled automatically when !pointer:fine, on unmount cancels RAF
- useCountUp(target, duration=900, startDelay=0) — returns animated number 0→target using rAF + easeOutCubic; skips if reducedMotion; cleans up rAF on unmount
```

#### `index.jsx` — export all primitives; each accepts `children` + optional `className` + optional `delay`

| Component | Behavior |
|---|---|
| `<PageTransition>` | Wraps page content. On mount fades-up (700ms, from translate3d(0,14px,0) → 0) + gentle scaleZ 0.98 → 1 in a motion.div. Children untouched. |
| `<DepthCard hover tilt>` | motion.div that wraps children; class "card card-hover preserve-3d perspective-1000". If `tilt` → calls useTilt; if `hover` → on mouse enter translate3d(0,-4px,0), leave → 0. Always `preserve-3d`. |
| `<TiltCard>` | Alias of DepthCard with tilt=true, hover=true. Use for KPI cards only (not large aggregate cards). |
| `<Reveal3D stagger=60 delay=0 from=14>` | motion.div wrapper; maps children to stagger initial + fade-up transform. Works for dashboard grids, lists, sections. If child has no key, wraps with Fragment. Skips stagger if reducedMotion. |
| `<FloatingLayer>` | absolute-positioned translucent plane (color + opacity props) floating with `float-y` animation (6s). Use in login bg only. |
| `<AnimatedCounter value duration prefix suffix decimals>` | span with useCountUp hook; keeps plain text final value; no format drift (Intl done by caller). |
| `<StatusTransition status key>` | motion.span wrapping a Badge/status node; `keyed` on status value so when status changes → exits with scale 0.6 + opacity 0, enters with depth-pop animation (450ms). Existing child Badge content fully preserved. |
| `<Modal3D open onClose>` | Replaces internal wrapper div of Modal in ui.jsx ONLY (Modal structure API: open/onClose/title/children/footer/size unchanged). Backdrop fade 200ms; content depth-pop + rotateX -4°→0° on entrance, reverse on exit. |
| `<TableReveal rowsStagger=30>` | Wraps tbody; rows reveal from opacity 0 + translateY 4px → 1 with stagger using AnimatePresence keyed by row id. Works with existing <table> markup. |
| `<DataFlow steps activeStep>` | 3D pipeline flow visualizer. Steps array of `{label, amount?}`. Renders as connected nodes in a horizontal flex; each node has a circle + line; particles move from previous to current step when activeStep advances. Used for CheckoutDemo + commission flow. Correct values come from caller. |
| `<Progress3D value min=0 max=100 tone=brand>` | Dimensional progress bar: outer "track" (rounded, inset shadow), inner "bar" (gradient + subtle glow, 3D translate forward on fill). Number value stays whatever caller computed — no recalc. |
| `<ParticleField count=24 size=2 color=rgba(59,130,246,.25)>` | 24 absolutely-positioned dots with randomized transform + float-y staggered delays. display:none under reducedMotion. |
| `<PerspectivePanel step index>` | Used in registration step transitions. If active (`step===index`) → translateZ(0) + opacity 1. Else translateZ(-40px) rotateY(4deg) + opacity 0. Used with AnimatePresence. |
| `<CheckDraw size=64 strokeWidth=4>` | Animated SVG checkmark (stroke-dasharray animation draw-check, 600ms). Used in registration success + payment success. Place existing <CheckCircle> component ALONGSIDE for non-animated fallback (reduced motion). |

Critical: ALL children of these primitives render exactly as passed. No props are stripped.

### Test Requirements
- **TR-5 (rule):** `GetDiagnostics` on `frontend/src/components/anim/` → 0 type/import errors.
- **TR-6 (rule):** `<StatusTransition status="PENDING"><Badge>Pending</Badge></StatusTransition>` → changing status prop causes new badge to depth-pop enter, old exit.
- **TR-7 (rule):** `<AnimatedCounter value={180} />` starts at 0 and within 900ms displays 180 (or near 180); at 1000ms after mount exactly 180.
- **TR-8 (rule):** useTilt hook automatically disabled when window.matchMedia('(pointer:fine)').false.
- **TR-9 (rubric, 0-2, threshold 1):** Primitive API surface ergonomics. `2` = components feel idiomatic, all wrap children transparently; `1` = usable but some rough API; `0` = leaky / breaks existing children.

---

## Task 3: Enhance existing UI primitives (ui.jsx, Layout.jsx)

- **Status:** pending
- **Priority:** high
- **Depends on:** Task 2
- **Covers:** FR-2.2, FR-7.1, FR-7.2, FR-7.3, FR-7.4, FR-7.6, AC-14, AC-15 partial

### What to do

#### ui.jsx — preserve existing APIs, layer animation
- `KpiCard`: wrap outer `<div className="kpi-card">` with `<motion.div whileHover={reduced ? {} : { y: -3, scale: 1.008 }} transition={{ type: "spring", stiffness: 320, damping: 24 }} style={{ transformStyle: "preserve-3d" }}>`. Value → wrapped in `<AnimatedCounter>`. Icon → wrapped in small 3D tilt (or fixed depth shadow).
- `Badge`: add className check — if rendered as status from `statusBadge`, opt-in animation via `StatusTransition` wrapper (only when caller passes `animated` prop or when used within Commissions/Orders/Payouts tables; keep default opt-in disabled via StatusTransition `disabled` in plain Badge to avoid breaking all usages — we'll activate it per-page).
- `Modal`: replace inner backdrop/content with Modal3D behavior (AnimatePresence + motion.div entrance/exit with depth-pop + slight rotateX). Keep existing `open`, `onClose`, `title`, `children`, `footer`, `size` props and structure exactly. Title/close button unchanged.
- `CopyButton`: on copied=true → add subtle scale 1.07 + badge-pop animation class on button; icon nudge (no text change).
- `Alert`: slide-in-from-top-8px + fade entrance on mount via motion.div.

#### Layout.jsx
- **Sidebar nav-link**: existing `<NavLink>` className already applies `nav-link nav-link-active`. Wrap inner content in a small motion.span that on `isActive` translates icon +2px X (visual nudge, layout stable). Keep labels exactly. Add active indicator: small before/after pseudo via tailwind, or 3px inset box-shadow (already defined in index.css — verify existing `.nav-link-active` box-shadow works).
- **Topbar**: keep sticky/blur; add subtle "on scroll" shadow change if possible (simple listener). No layout change.
- **AppLayout shell**: wrap `<main>` content in a `<PageTransition>` scoped by route location (use `useLocation().pathname` as PageTransition key, so navigating changes the key → re-trigger animation). Do NOT remount Sidebar/Topbar.

### Test Requirements
- **TR-10 (rule):** Opening any existing modal (Affiliate Detail → New Coupon, etc.) → modal scales forward with slight rotateX, backdrop fades. Closing → reverse.
- **TR-11 (rule):** Clicking existing CopyButton (Coupon page share) → copied state animates button scale 1.07.
- **TR-12 (rule):** After Sidebar animation change, all 9 admin + 6 affiliate labels still match their pre-existing text exactly.
- **TR-13 (rule):** Route navigation (admin dashboard → affiliates → commissions) → Sidebar/Topbar stable DOM, only <main> content triggers PageTransition.

---

## Task 4: Login & Registration (FR-3, FR-3.4)

- **Status:** pending
- **Priority:** high
- **Depends on:** Task 2, Task 3
- **Covers:** FR-3.1, FR-3.2, FR-3.3, FR-3.4, AC-16, AC-12

### What to do

#### LoginPage.jsx — preserve inputs, buttons, quickAccounts, error handling EXACTLY
1. Wrap the whole screen in a relative `<div>`. Add absolutely-positioned `<FloatingLayer>` x3 (brand-500 5% opacity planes) + `<ParticleField count=20>` + a subtle depth grid background (`linear-gradient + background-size` CSS). All bg layers z-index below content.
2. Login "card" container: motion.div with entrance from `translate3d(0,30px,0) rotateX(-6deg) opacity 0` → `translate3d(0,0,0) rotateX(0) opacity 1` (600ms cubic-bezier 0.2,0.8,0.2,1).
3. Internal form elements (logo, h1, p, alert, form, quickAccounts grid) each wrapped in staggered `<Reveal3D stagger=80>` — so they fade-up in sequence.
4. Email/password inputs: on focus, animate container lift (wrap input in motion.div with `whileFocus={{ y: -1 }}` if possible, or rely on CSS rules from Task 1). Show/hide password Eye → rotate 180° on toggle (transition).
5. Sign in button: `whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}`.
6. Quick-login buttons: `whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }}`.
7. Keep quickAccounts default email/password population behavior (onClick sets state) UNCHANGED.

#### RegisterPage.jsx — preserve steps, fields, onSubmit, validation EXACTLY
1. Same bg system as login (3 FloatingLayer + ParticleField, behind content).
2. Header (h1 + icon) fade-up stagger entrance.
3. Step progress bar: Progress3D for each step's bar segment. On step advance → segment fills with glow.
4. `<PerspectivePanel>` for each of 4 steps (keys by step index). When `step===index` the panel is in front; otherwise it's translated back and rotated with opacity 0. Use `<AnimatePresence mode="wait">` to cross-fade step transitions with perspective.
5. Keep next/prev/submit button behavior identical (step boundaries, validation triggers, API call).
6. On `submitted===true` success view: the outer form recedes (opacity 0 scale 0.97, then unmounted), success card approaches (depth-pop). Checkmark replaced with `<CheckDraw size=64 strokeWidth=4>`. "What happens next?" list → staggered `<Reveal3D stagger=90>` reveal.
7. "Continue to login" button preserves original navigate('/login') behavior.

### Test Requirements
- **TR-14 (rule):** Login quick-login buttons → onClick still populates email/password state. Credentials: `admin@affiliate.dev/admin123`, `alex@affiliate.dev/alex1234`, `john@affiliate.dev/john1234`, `customer@example.dev/customer123`.
- **TR-15 (rule):** Registration step 0→1→2→3 preserve all original fields. Submitting with valid data still calls POST /affiliate/register with same payload.
- **TR-16 (rubric, 0-3, threshold 2):** Login 3D bg quality (AC-16 scale).
- **TR-17 (rule):** Registration on success → form recedes, CheckDraw animates, "What happens next?" is sequential.

---

## Task 5: Affiliate Portal Pages (FR-4) — 6 pages

- **Status:** pending
- **Priority:** high
- **Depends on:** Task 2, Task 3
- **Covers:** FR-4.1..FR-4.7, AC-17, AC-6 partial, AC-7 partial

### What to do

For each page wrap the JSX return in `<PageTransition key={useLocation().pathname}>` (imported from anim). Then layer animations without changing existing content/data:

#### `affiliate/Dashboard.jsx`
- Active coupon panel → `<DepthCard tilt>` with a `whileHover={{ y: -4 }}`. Coupon code block with subtle light-sweep overlay (pseudo-element with gradient moving from left → right on a 6s loop; only when `user.affiliateStatus === 'ACTIVE'`).
- KPI grid (Total Referrals, Total Orders, Total Sales, Total Commission) → each in `<TiltCard>` wrapping the existing `<KpiCard>` (which already gets AnimatedCounter from Task 3).
- Commission status breakdown (Pending/Approved/Paid Out/Cancelled/Reversed) → wrap each stat block in `<Reveal3D stagger=70>`.
- "Recent Orders" table + "Payout Summary" card → enter after KPI cards (delay 350ms via Reveal3D).

#### `affiliate/Coupon.jsx`
- Coupon overview card → `<DepthCard tilt hover>` with light sweep (like Dashboard).
- Customer Discount value and My Commission value MUST be visually distinct (different tone badges, not merged). Status → `<StatusTransition>` wrapped around existing `<Badge>` with status keyed on coupon.status.
- Usage counts → `<AnimatedCounter>`.
- Share section copy button preserves existing copy behavior.

#### `affiliate/Orders.jsx`
- Filter row → reveal with slide-in-from-top-4px.
- Table tbody → `<TableReveal rowsStagger=30>`.
- Each row's status badge → `<StatusTransition>` around existing `<statusBadge(order.status)>`.

#### `affiliate/Commissions.jsx`
- Summary cards (Pending/Approved/Paid/Reversed) → `<TiltCard>` wrap + `<AnimatedCounter>`.
- Table rows → `<TableReveal>`.
- Every row's status badge → `<StatusTransition key={row.id + row.status} status={row.status}><statusBadge row.status /></StatusTransition>`.

#### `affiliate/Payouts.jsx`
- "Available for payout" summary + "Minimum payout threshold" progress → replace existing `<progress>` or plain div with `<Progress3D value={available} max={threshold} tone="brand" />`. Value+threshold unchanged (pass existing props exactly).
- Summary KPI cards → `<TiltCard>` + `<AnimatedCounter>`.
- Payout history table → `<TableReveal>`.

#### `affiliate/Profile.jsx`
- Sections (Contact Details, Payout Details) → `<Reveal3D stagger=60>` wrapper.
- Inputs rely on Task 1 CSS focus-depth rules.
- Save action: on success response → animate save button briefly scale 1.06 (motion.whileTap) + Alert slide-in (Task 3 Alert).

### Test Requirements
- **TR-18 (rule):** Affiliate dashboard 6 KPIs — numbers match server data exactly (animated counter only animates the same number after API load, never a different value).
- **TR-19 (rule):** Coupon page Customer Discount value ≠ My Commission value rendered in the same style (must differ via background/badge tone as they already do).
- **TR-20 (rule):** On Payouts page, existing threshold value €50 is passed unchanged to `<Progress3D>` (no hard-coded override in Progress3D implementation — Progress3D takes `value`/`max` from caller).
- **TR-21 (rubric, 0-3, threshold 2):** AC-17 Affiliate dashboard entrance choreography score.

---

## Task 6: Admin Console Pages (FR-5) — 10 pages

- **Status:** pending
- **Priority:** high
- **Depends on:** Task 2, Task 3
- **Covers:** FR-5.1..FR-5.10, AC-20, AC-6, AC-7, AC-13

### What to do

All pages wrap return in `<PageTransition key={useLocation().pathname}>`. Keep all existing logic/state/APIs intact.

#### `admin/Dashboard.jsx`
- 4-top KPIs → `<TiltCard>` wrap + AnimatedCounter.
- Quick Actions (Create Affiliate, Create Coupon, etc.) → `whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.98 }}` (motion.button or wrap with motion.div).
- Mandatory demo area (the scenario cards) → wrap each scenario card in `<DepthCard hover>`; on click of the "Run" button animate card forward slightly (y: -4, scale: 1.01) before existing onClick runs.

#### `admin/Affiliates.jsx`
- Filters → slide-in entrance.
- Table rows → `<TableReveal>`.
- Affiliates with `status=PENDING/ACTIVE/SUSPENDED/DEACTIVATED/REJECTED` → `<StatusTransition key={r.id + r.status}><statusBadge r.status /></StatusTransition>`.
- Approve/Reject/Suspend/Reactivate/Deactivate action buttons keep original onClick handlers and state machine behavior unchanged; add press/hover transforms via CSS (Task 1 rules).

#### `admin/AffiliateDetail.jsx`
- Profile Info card + Commission Breakdown + Coupons + Recent Orders + Recent Payouts → `<Reveal3D stagger=80>` sections.
- Any existing modal trigger (New Coupon, Edit) uses the already-enhanced `<Modal>` from Task 3 → depth entrance.

#### `admin/Coupons.jsx`
- Filters → slide-in.
- Table → `<TableReveal>`.
- Status badges → `<StatusTransition>`.
- Create/Edit coupon modal (if existing) → already enhanced by Task 3 Modal.

#### `admin/Commissions.jsx` (LEDGER — most important)
- 7 status tabs (Pending/On Hold/Approved/Paid/Rejected/Cancelled/Reversed) → tab content entrance slide-in.
- Table rows → `<TableReveal>`.
- Status badges → `<StatusTransition>` keyed on `row.id + row.status` so the badge re-pops on status change.
- ON_HOLD rows → subtle additional background tint (amber-50) + a slight freeze visual (CSS: `filter: saturate(.92)` applied once, NO continuous animation).
- REVERSED rows → once on row mount animate content translateX(-2px) translateX(+2px) translateX(0) single shake-then-settle (class single-shot keyframe).
- Approve/Reject/Reverse/Hold action buttons → preserve original `openAction` / `doAction` state flow. Add press-scale via Task 1 CSS rules.

#### `admin/Payouts.jsx`
- New Payout / Pending / Processing / Paid / Rejected tabs → slide-in.
- "Mark Paid" confirmation: the existing action success → briefly scales that row's status badge forward via `<StatusTransition>` to next state. Dimensional confirmation.
- Payout progress bars (if any) → `<Progress3D>`.

#### `admin/Reports.jsx`
- Tab transitions (Sales/Commissions/Coupons) → `<PageTransition>`-like content crossfade.
- If using recharts → wrap each chart in motion.div with `initial={{ opacity: 0, scaleY: .8 }} animate={{ opacity: 1, scaleY: 1 }} transition={{ duration: .6, ease: "easeOut" }}` on mount. Bars grow naturally via recharts if isAnimationActive default true; keep that.
- Metric KPI top-row → `<TiltCard>` + `<AnimatedCounter>`.
- Tooltip depth: add box-shadow depth on tooltip (Recharts).

#### `admin/Fraud.jsx` — no flashing red (§23)
- Filters → slide-in.
- Table rows → `<TableReveal>`.
- Flagged rows (status=OPEN) → on row mount: a single ONE-TIME pulse (scale 1→1.015→1, duration 600ms; then never again). Use motion.initial/animate once per mount (keyed by row.id), no loop.
- Severity badges (HIGH/MEDIUM/LOW) → `<StatusTransition>` (controlled emphasis; no flashing).
- Resolve modal → Task 3 enhanced Modal. Resolution success → StatusTransition to RESOLVED.

#### `admin/Settings.jsx`
- 5 sections → `<Reveal3D stagger=70>` sequential reveal.
- Toggle switches: CSS only (input checked changes). Add small slide-in thumb animation (transition transform 220ms).
- Save/Reset: press-scale via CSS.

#### `admin/CheckoutDemo.jsx` — MASTER CINEMATIC FLOW (§28, §29)
- Each scenario card: `<DepthCard hover tilt>`.
- Pipeline visualization area — render `<DataFlow>` with steps = `['Validate Coupon\nALEX10 (10%)', 'Create Order\n€200 → €180', 'Simulate Payment', 'Commission Generated\n€9 (5%)']` — labels contain existing correct values from the page.
- `activeStep` driven by existing scenario state (as each step completes).
- When the user clicks "Run End-to-End Demo", animate each DataFlow node light up in sequence with 700ms spacing AND render `<Progress3D>` per step micro-progress.
- Keep all existing API calls (validate, create order, payment success, commission read) UNCHANGED — pass the returned values as-is to display.

### Test Requirements
- **TR-22 (rule):** Admin Commission status change (PENDING→APPROVED→PAID) on click-through UI: the `<StatusTransition>` pop triggers for each new status, but actual backend state change is driven entirely by original `doAction` + `fetchCommissions()` flow — StatusTransition never calls APIs.
- **TR-23 (rule):** Fraud page pulse occurs only once per row mount (not continuously). DevTools → computed → animation-iteration-count = 1.
- **TR-24 (rule):** Reports charts animation — no values are faked; actual data from API passed through unchanged.
- **TR-25 (rule):** Settings toggle switches — persisting still calls PUT /admin/settings with the exact same payload and field keys.
- **TR-26 (rule):** Checkout Demo scenario pipeline numbers match mandatory scenario: Coupon 10%, €200 product, €20 discount, €180 pay, €9 commission, €50 threshold.
- **TR-27 (rubric, 0-3, threshold 2):** Checkout Demo pipeline choreography (AC-20 scale).
- **TR-28 (rubric, 0-2, threshold 1):** Commission ON_HOLD / REVERSED feel (§20). `2` = communicates state clearly with restrained one-shot viz; `1` = acceptable animation; `0` = excessive.

---

## Task 7: Customer Checkout Signature Animations (FR-6) + NotFound wrap

- **Status:** pending
- **Priority:** high
- **Depends on:** Task 2, Task 3
- **Covers:** FR-6.1, FR-6.2, FR-6.3, AC-18, AC-19, AC-4, NFR-4.1

### What to do

#### `CheckoutPage.jsx` — entire existing cart/apply/place/pay flow intact
1. Wrap page in `<PageTransition>`.
2. **Order card**: `<DepthCard hover>`. Cart items → staggered reveal.
3. **Coupon apply flow (FR-6.1)**:
   - On enter coupon input → CSS focus lift (Task 1).
   - On `loading===true` (applying) → coupon section border changes to brand-200, and a sweep pseudo-element crosses the coupon card once (class toggle).
   - On `applied.success=true` (API returned 200 with success):
     - coupon badge enters via `<StatusTransition>` with "Active".
     - discount amount label fades-in via motion.div from opacity 0 + translateY(6px) → 0 (400ms delay 150ms).
     - Summary "Total" amount in right sidebar: wrap in `<AnimatedCounter>` that transitions from old subtotal → new discounted total (only animates when `applied` changes — not on every render).
     - saved amount text → slight scale 1.0→1.05→1 emphasis (depth-pop class single-shot).
   - On error → coupon input gains `.input-error-anim` shake class (Task 1 keyframe) once per error. Original error text `setError(...)` unchanged.
4. **Order creation (Place Order → success) (FR-6.2)**:
   - Order Created card appears with depth-pop.
   - Order number → fade-up from below.
   - Status badge "CREATED" → `<StatusTransition>`.
5. **Payment success (FR-6.3) — strongest customer moment**:
   - "Payment successful" card emerges with depth-pop.
   - Large `<CheckDraw size=56 strokeWidth=3.5>` draws itself over 600ms.
   - "Payment successful! Thank you 🎉" → fade-up (delay 200ms).
   - Order number → fade-up (delay 400ms).
   - Order summary section → `<Reveal3D stagger=70>` (delay 600ms).
   - **CRITICAL:** Never show `paymentResult.commission` value to customer (preserve existing existing behavior: it already renders commission line only with `text-slate-400 text-xs` + wording "affiliate commission handled internally" — that's fine; do NOT add a numeric value).

#### `NotFoundPage.jsx` — small polish
- Wrap content in `<PageTransition>` + `<DepthCard tilt>` around the 404 block. No content change.

### Test Requirements
- **TR-29 (rule):** Coupon apply flow — validation/shake/discount-appear animations ONLY run AFTER the existing `/coupon/apply` API returns (never start animations on optimistic click).
- **TR-30 (rule):** CheckoutPage after "Simulate Successful Payment", `paymentResult.commission.amount` is never printed as a customer-visible number. (Existing code only prints a muted description — keep that.)
- **TR-31 (rubric, 0-3, threshold 2):** Coupon animation quality (AC-18 scale).
- **TR-32 (rubric, 0-3, threshold 2):** Payment success moment quality (AC-19 scale).

---

## Task 8: Final QA — Build + Run Mandatory Scenario + Diagnostics

- **Status:** pending
- **Priority:** high
- **Depends on:** Tasks 1,2,3,4,5,6,7
- **Covers:** all ACs + NFR, §49/50

### What to do

1. Run `cd frontend && npm run build` — MUST exit 0.
2. Start both servers (`backend npm run dev`, `frontend npm run dev`) and run the **complete mandatory scenario**:
   1. Login as admin@affiliate.dev → Checkout Demo
   2. Run Mandatory Scenario (ALEX10, €200 → €20 disc → €180 pay → €9 commission)
   3. Approve the commission → Commission ledger status PENDING→APPROVED
   4. Create payout → mark paid → commission PAID
   5. Trigger a refund of €80 → verify reversal €4, remaining €5
3. DevTools console check: 0 uncaught runtime errors, no React warnings, no animation RAF leaks (after 2 minutes idle).
4. Open mobile view 375px width → scroll every page: no horizontal overflow.
5. Set `prefers-reduced-motion: reduce` → navigate every major page: tilt disabled, particles hidden, transitions 150ms opacity; content instantly readable.
6. Route inventory check: 25 pages present (/login, /register, /checkout, /404, 6×/affiliate/*, 10×/admin/*) — all still accessible (no route removed).
7. GetDiagnostics — 0 errors.

### Test Requirements
- **TR-33 (rule):** `frontend npm run build` → exit code 0.
- **TR-34 (rule):** Mandatory scenario numbers correct end-to-end: €20 discount, €180 payment, €9 commission → approved → paid → €80 refund → €4 reversal → €5 remaining.
- **TR-35 (rule):** DevTools Console, 2 minutes into idle state: 0 uncaught errors, 0 React key warnings, 0 memory-leaking RAF (can be inferred from stable JS Heap after idle).
- **TR-36 (rule):** 375px viewport width on Login + Admin Dashboard + Affiliate Dashboard + Checkout → no `document.documentElement.scrollWidth > viewport.width` (no horizontal overflow).
- **TR-37 (rule):** With `prefers-reduced-motion: reduce` enabled, navigate Affiliate Dashboard → Orders → Commissions: page transition duration ≤ 150ms; no tilt cursor follow; ParticleField hidden (display:none).
- **TR-38 (rubric, 0-3, threshold 2):** Overall cohesion (NFR-5.3 scale).
- **TR-39 (rubric, 0-3, threshold 2):** Performance (AC-22 scale).
