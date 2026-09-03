# Spec: Premium 3D Motion & Animation Layer

## Problem
The Affiliate System is functionally complete (Login, Register, Checkout, Affiliate Portal with 6 pages, Admin Console with 10 pages) but visually flat. All UI surfaces are standard 2D cards and tables with basic CSS hover color changes. The product needs to feel like a premium 2026 enterprise SaaS product while preserving **100% of existing behavior**.

## Users
- **Admin users** — manage affiliates, coupons, commissions, payouts, fraud, reports, settings
- **Affiliate users** — view dashboard, coupon, orders, commissions, payouts, profile
- **Customer users** — browse checkout, apply coupon, place order, confirm payment

## Goals
1. Add a reusable **3D motion/animation system** that feels native to the existing design (white/slate surfaces, brand-blue primary, emerald/amber/red status).
2. Animate every major interaction and page entrance while remaining fast, accessible, and CPU-conscious.
3. Preserve every existing route, component, API call, field, validation, calculation, permission, business rule, and status.
4. The animation layer must be **additive only** — if all animation code is removed, the application functions identically.

## Non-Goals
- ❌ No redesign of layout, navigation, or information architecture
- ❌ No new features, routes, forms, fields, API endpoints
- ❌ No changes to business logic (commissions, coupons, payouts, fraud, reports, settings, auth, validation)
- ❌ No changes to backend dependencies or code
- ❌ No introduction of large rendering frameworks (e.g., Three.js) unless absolutely necessary (CSS 3D transforms preferred)
- ❌ No gaming-style gimmickry; animations must communicate meaning

---

## Functional Requirements (FR)

### FR-1 Reusable Animation System
- **FR-1.1** Create a shared animation module (HOCs / hooks / components) under `frontend/src/components/anim/` or similar.
- **FR-1.2** Provide reusable primitives: `PageTransition`, `DepthCard`/`TiltCard` (3D hover tilt, damped, low-angle, touch+reduced-motion disabled), `Reveal3D` (stagger entrance), `FloatingLayer`, `AnimatedCounter` (KPI count-up), `StatusTransition` (animated status badges), `Modal3D` (depth-scale modal entrance), `TableReveal` (staggered row entrance), `Progress3D` (dimensional progress bar), `PerspectivePanel` (depth-based step transitions).
- **FR-1.3** All primitives accept existing children without modification; existing component props are preserved.

### FR-2 Global System Setup
- **FR-2.1** Extend `index.css` with CSS 3D variables (`--perspective`, `--tilt-max`, `--depth-1`…`--depth-4`, GPU-friendly transform layers), animation keyframes for reveal/tilt/glow/sweep, and `@media (prefers-reduced-motion: reduce)` overrides that disable parallax, tilt, continuous particles, and reduce page transitions.
- **FR-2.2** Extend existing Tailwind classes (`.btn`, `.input`, `.card`, `.nav-link`, `.badge`, `.table tr`, `.modal`) with tactile hover/active depth transforms (hover-lift, press-compress, focus-depth-lift, input-error-lateral-shake) using GPU-friendly properties.
- **FR-2.3** Install `framer-motion` (minimal ~40KB) as the single animation dependency (permitted by §43 — genuinely required for declarative staggered entrance, status transitions, layout animations). No other dependencies.

### FR-3 Entry / Authentication
- **FR-3.1** Login page: 3D background composition (floating translucent planes, low-density CSS particle field, subtle light sweep, depth grid) rendered on mount.
- **FR-3.2** Login entrance choreography (bg → layers settle → container rises with slight rotateY → content fades up in sequence < 500ms → form immediately interactive).
- **FR-3.3** Login interactions: email/password focus lifts inputs; show/hide password toggle animates icon rotation; sign-in button compresses on press + lifts on hover; quick-login buttons tilt+lift; register link micro-lift.
- **FR-3.4** Registration: step transitions use perspective flip (current recedes back, next approaches from depth); progress bar uses dimensional slide; on submission success → form recedes, success panel scales forward with drawable checkmark + sequential content layers.

### FR-4 Affiliate Portal (6 pages)
- **FR-4.1** Dashboard: staggered 3D composition (heading → coupon panel emerges from depth → KPI cards enter with perspective tilt one-by-one → secondary cards follow → status breakdown → orders & payout summary last); KPI values count-up on first data load.
- **FR-4.2** Active Coupon (signature moment): layered 3D card with floating front surface, internal light sweep, hover perspective; copying → button depresses + coupon shifts forward + copied state transitions.
- **FR-4.3** Coupon Page: 3D coupon/card presentation, subtle rotating depth, dimensional status badge, elegant share interactions (discount ≠ commission visually distinct per §553).
- **FR-4.4** Orders: table container enters from shallow depth; rows stagger 40ms; status badges use StatusTransition; pagination/filters slide smoothly.
- **FR-4.5** Commissions: ledger rows reveal with stagger; PENDING→APPROVED→PAID status transitions animate the status indicator forward visually; ON_HOLD pause visual; REVERSED reverse movement.
- **FR-4.6** Payouts: threshold progress → dimensional bar (gradient fill + glow) with fluid progression; all payout summary KPIs count-up.
- **FR-4.7** Profile: sections reveal in order; input focus depth; save-state success transition.

### FR-5 Admin Console (10 pages)
- **FR-5.1** Dashboard: analytical 3D composition; KPI cards with depth grouping; Quick Actions have stronger press/lift feedback; mandatory demo area visualizes pipeline nodes.
- **FR-5.2** Affiliates: search/filter dimensional slide; status choreography PENDING→ACTIVE→SUSPENDED→DEACTIVATED→REJECTED all use StatusTransition.
- **FR-5.3** Affiliate Detail: layered profile cards; commission breakdown restrained animated viz; coupon/new-coupon modals depth-scale entrance.
- **FR-5.4** Coupons: filter transitions dimensional; edit/new modal 3D entrance; table row stagger; status changes animate.
- **FR-5.5** Commissions: ledger-feel animation; PENDING↓APPROVED forward step, ON_HOLD freeze pause, REVERSED controlled reverse, REJECTED/CANCELLED recede.
- **FR-5.6** Payouts: Mark Paid → payout card comes forward, status transitions, payment indicator completes; strong but professional confirmation.
- **FR-5.7** Reports & Analytics: bar-growth + line-drawing on mount; metric count-up; tooltip depth; panel staggered entrance.
- **FR-5.8** Fraud Investigation: flagged cases single soft pulse on mount; severity badges controlled emphasis; detail panels unfold in depth; resolve action → clear state transition. No flashing red.
- **FR-5.9** Settings: animated toggle switches; section reveals on first view; save-state animation only.
- **FR-5.10** Checkout Demo (§28 — Master Cinematic Flow): the 4-step pipeline `Coupon → Order → Payment → Commission` choreographed as a 3D connected journey with nodes, connecting lines, status glow, and subtle moving data tokens. Correct values: Coupon ALEX10, 10% disc, 5% comm, €200→€20 discount→€180 pay→€9 commission.

### FR-6 Customer Checkout (signature animation §25–27)
- **FR-6.1** Coupon application (ALEX10 valid): field → dimensional state → validation indicator sweep across → accepted ✓ → discount appears → summary total number fluidly transitions → saved amount subtle success emphasis. Fail: restrained 3D error shake (original error text).
- **FR-6.2** Order creation (Place Order): order panel moves forward slightly, order number enters from depth, total locks visually, status badge transitions to CREATED.
- **FR-6.3** Payment success (strongest customer journey moment): order settles → confirmation layer appears → checkmark draws → success circle subtle expansion → thank-you text → order number fades up → summary settles. **Commission info never shown to customer**.

### FR-7 Layout / Shell
- **FR-7.1** Sidebar: active nav-link gets depth indicator + subtle icon nudge + smooth active slide (150–250ms); hover elevation; no labels/routes changed.
- **FR-7.2** Topbar: controlled shadow movement + fixed backdrop-blur depth; no layout change.
- **FR-7.3** Cards: all `.card` structures get optional depth behavior; low-angle pointer-following tilt on hover only for appropriate surfaces (not large dashboard aggregates); disabled on touch + reduced-motion.
- **FR-7.4** Modals: depth scale + slight perspective rotate + opacity entrance; backdrop separation; reverse exit.
- **FR-7.5** Page transitions (§35): smooth 250–600ms depth movement between existing routes using Outlet context (shell stays stable); no full shell re-mount.
- **FR-7.6** Loading/Empty states: subtle spatial entrance only; no fake progress bars; no % implication if unknown.

---

## Non-Functional Requirements (NFR)

### NFR-1 Performance
- **NFR-1.1 (rule)** All animation uses GPU-friendly `transform`, `opacity`, `perspective`, `translate3d`, `rotate3d`, `scale`. Never animates width/height/top/left.
- **NFR-1.2 (rule)** Continuous animation loops ≤ 3 total across the app (e.g., login bg sweep). No per-component loops.
- **NFR-1.3 (rule)** RAF/anim observers cleaned up on unmount (no memory leaks).
- **NFR-1.4 (rule)** Particle counts low: login bg ≤ 30 particles, pipeline flow ≤ 8 active tokens, fraud pulse once-only.
- **NFR-1.5 (rule)** Build succeeds (`cd frontend && npm run build`) with no errors.

### NFR-2 Accessibility / Reduced Motion
- **NFR-2.1 (rule)** Under `@media (prefers-reduced-motion: reduce)`: parallax disabled, 3D tilt disabled, continuous particles disabled, page transitions reduced to ≤150ms opacity fades, tilt cards remain perfectly readable.
- **NFR-2.2 (rule)** Existing keyboard navigation, focus rings, ARIA semantics preserved.
- **NFR-2.3 (rule)** Animation is never the sole source of information (e.g., status change shows both text badge + animation).

### NFR-3 Responsive / Mobile
- **NFR-3.1 (rule)** Under viewport < 768px: pointer-following tilt disabled, heavy depth effects reduced, taps preserved, scrolling smooth, no horizontal overflow, tables use existing responsive behavior.
- **NFR-3.2 (rule)** No horizontal scroll on 375px viewport.

### NFR-4 Security / Data Safety
- **NFR-4.1 (rule)** Customer UI never reveals affiliate commission, payout account, audit data, or fraud investigation internals. Permission boundaries match the existing app exactly.
- **NFR-4.2 (rule)** Commission values remain server-calculated; the animation layer never recalculates business values (only animates existing numbers).

### NFR-5 No Feature Drift (§49)
- **NFR-5.1 (rule)** Every existing route still works; every existing page still exists; every navigation item still present; every form field unchanged; every API call unchanged (same URLs, payloads, methods).
- **NFR-5.2 (rule)** Every calculation, validation, permission, business rule unchanged.
- **NFR-5.3 (rubric, scale 0-3, threshold 2)** Cohesion quality: `3` = entire app feels designed-from-beginning with depth; `2` = premium native feel, no animation tacked on; `1` = functional but some spots feel bolted on; `0` = jarring/gimmicky.

---

## Constraints
- CSS 3D preferred; single new dependency permitted: `framer-motion`
- Backend: zero changes
- Existing design tokens (brand, slate, emerald, amber, red) preserved exactly
- Tailwind classes extended, never replaced

## Assumptions
- `framer-motion` compatible with React 18 + Vite 5 (confirmed v11 compatible)
- Users with reduced-motion queries are uncommon, but must work fully
- The existing API will continue returning the exact same payloads

---

## Acceptance Criteria

### Rule ACs
- **AC-1 (rule)** Login with customer@example.dev / customer123 → lands on /checkout (not permission denied).
- **AC-2 (rule)** Login with admin@affiliate.dev / admin123 → lands on /admin; all 9 nav items work.
- **AC-3 (rule)** Login with alex@affiliate.dev / alex1234 → lands on /affiliate; all 6 nav items work.
- **AC-4 (rule)** Customer Checkout enters ALEX10 → Apply → validates via existing API → success UI + discount applied correctly (€200 → €180). Number shown never includes commission.
- **AC-5 (rule)** Admin → Checkout Demo → Run mandatory scenario → correct values (€20 → €180 paid → €9 commission).
- **AC-6 (rule)** Commissions page: status transitions (PENDING→APPROVED→PAID) animate the badge with StatusTransition, no state machine logic altered.
- **AC-7 (rule)** Payouts: threshold progress bar renders as dimensional Progress3D with correct €50 threshold value.
- **AC-8 (rule)** `prefers-reduced-motion: reduce` in browser DevTools → tilt, particles, and page transitions reduce per NFR-2.1.
- **AC-9 (rule)** Frontend `npm run build` exits 0.
- **AC-10 (rule)** All 24 existing pages (Login, Register, Checkout, 6 affiliate, 10 admin, NotFound) still exist and render. No routes changed.
- **AC-11 (rule)** Existing quick-login buttons on LoginPage still populate email/password exactly as before.
- **AC-12 (rule)** Registration steps 0-3 preserve all fields, validation, next/prev behavior; submission still calls POST /affiliate/register.
- **AC-13 (rule)** Fraud page: no flashing red effects. Severity badges use controlled StatusTransition emphasis.
- **AC-14 (rule)** Modal on any page opens with depth-scale + slight rotate + backdrop; exits in reverse. Existing modal form fields unchanged.
- **AC-15 (rule)** Buttons compress vertically by ~2px (scaleY 0.97) on :active; lift translate3d(0,-2px,0) + shadow increase on :hover.

### Rubric ACs
- **AC-16 (rubric, 0-3, threshold 2)** Login 3D background quality. `3` = calm premium depth, no distraction; `2` = nice spatial feel; `1` = acceptable; `0` = gimmicky/overdone.
- **AC-17 (rubric, 0-3, threshold 2)** Affiliate dashboard entrance choreography (staggered composition, KPI count-up, coupon signature moment). `3` = cinematic but fast (<800ms total); `2` = polished; `1` = ok; `0` = slow/unreadable.
- **AC-18 (rubric, 0-3, threshold 2)** Coupon application signature animation (§25). `3` = elegant + communicates validation flow; `2` = polished success emphasis; `1` = works; `0` = confusing or fakes validation before API.
- **AC-19 (rubric, 0-3, threshold 2)** Payment success moment (§27). `3` = satisfying but calm; `2` = good success; `1` = works; `0` = excessive.
- **AC-20 (rubric, 0-3, threshold 2)** Admin Checkout Demo pipeline choreography (§28). `3` = clear connected journey with correct € values; `2` = visible nodes + flow; `1` = animated; `0` = misleading.
- **AC-21 (rubric, 0-3, threshold 2)** Reusability of animation system. `3` = every page uses the same small set of primitives; `2` = shared primitives with a few one-offs; `1` = some sharing but many inline animations; `0` = every page reinvents.
- **AC-22 (rubric, 0-3, threshold 2)** Performance. `3` = near 60fps on normal laptop, console clean, no layout shifts; `2` = smooth; `1` = acceptable; `0` = jank/leaks.
