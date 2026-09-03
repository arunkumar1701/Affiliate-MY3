# Develop Project from PDF Specification

> **Workspace:** c:\Users\Karthikeya\Downloads\Affiliate Project

---

**User**

`/c:/Users/Karthikeya/Downloads/Affiliate Project/Affiliate.pdf`Go through the entire pdf and follow the naming and structure and architecture presented in it. Make sure to follow only what is asked in the pdf and do not do any extra developments.  Finish this project and make sure that it is production ready. If you need any database and other urls, ask me.

**Assistant**

I'll start by exploring the current project structure and then reading the PDF to understand the requirements.

I need to extract text from the PDF. Let me use Python with a PDF parsing library to read the content.

Now let me extract text from the PDF:

The script ran successfully (41 pages extracted). Let me check the output file:

Now I've read the complete PDF specification. This is a comprehensive Affiliate & Referral System with 41 pages of detailed requirements covering: affiliate registration, approval workflow, unique coupon codes, **independent X% customer discount / Y% affiliate commission**, configurable commission calculation base, order snapshots (historical protection), commission ledger with 6 statuses, payout system with thresholds, fraud detection, reporting/export, notifications, audit logs, RBAC security, and 15+ edge cases.

Before I begin implementing this production-ready system, I need to ask you a few critical questions about the technology choices and infrastructure:

Good choices. Let me check if there's an existing Supabase project integration, and then set up the comprehensive project plan.

---

**User**

postgresql://postgres.kzvltpdjxccsgirnrzlc:Arun@9963133@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres

This is the supabase(database) url

`https://kzvltpdjxccsgirnrzlc.supabase.co`

This is the latest development of this project url

**Assistant**

Excellent! Let me first set up the Supabase integration to get the proper credentials, then create a comprehensive implementation plan.

---

**User**

ok then start doing

**Assistant**

Excellent! Let me start by getting the Supabase project credentials and then building the complete system. I'll use SPEC MODE to manage this complex, multi-component project with proper traceability.

---

**User**

ok

**Assistant**

Now I have everything I need. Let me create a comprehensive plan and start building this production-ready Affiliate & Referral System with the exact architecture, naming, and structure specified in the PDF.

Let me build the entire project. I'll start with the monorepo structure and backend infrastructure, using parallel execution where possible.

Now let me create the Prisma schema with ALL tables from the PDF:

Now let me build the backend core (config, utils, server, middleware):

Now let me build the middleware, errors, audit logger, notification service, then the main entry, and all modules:

Now let me build the coupon validation engine and commission engine services, then all routes and controllers:

Now let me build all the route handlers (controllers) in one batch:

Now the Admin routes - the largest module:

Now let me create the main Express server entry and seed file:

Now let me build the frontend. I'll create the entire React + Vite + Tailwind setup:

Now let me build the frontend infrastructure (API client, AuthContext, routing, layout components) and all the page components:

Now shared UI components and the main App with routing:

Now the App with routing and protected routes:

Now let me create all the page components. I'll write them in parallel batches to be efficient:

Now the Affiliate pages (6 pages) and Admin pages (9 pages). I'll write them in batches:

I'll continue with the project build. The 9 Admin frontend pages need to be created next. Let me create them in parallel.

Let me check the existing directory structure first to confirm the paths, then create all 10 admin pages in parallel.

---

**User**

continue
