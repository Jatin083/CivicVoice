# CivicVoice: Project Context

> **Online Petition & Community Feedback Platform** · Full-stack web app (React + Node.js/Express + MySQL)
> MCA Software Engineering TA project · Author: Jatin, SGT University

This is the single source of truth for building CivicVoice. It covers what to build, the rules, the database, the API contract, the screens, security, testing and the order of work. Keep it in the repo root.

**Verified:** the SQL in Appendix A was executed on MySQL 8.0.46, and the backend code in Section 10 was run against it. Every request/response example marked ✅ is real output from that run.

---

## Table of contents

1. [Project summary](#1-project-summary)
2. [Scope](#2-scope)
3. [Users, roles and permissions](#3-users-roles-and-permissions)
4. [Features and acceptance criteria](#4-features-and-acceptance-criteria)
5. [Business rules](#5-business-rules)
6. [Tech stack](#6-tech-stack)
7. [Architecture](#7-architecture)
8. [Repository structure](#8-repository-structure)
9. [Database](#9-database)
10. [Backend](#10-backend)
11. [API reference](#11-api-reference)
12. [Frontend](#12-frontend)
13. [Security checklist](#13-security-checklist)
14. [Testing](#14-testing)
15. [Build plan (TA1 → TA3)](#15-build-plan-ta1--ta3)
16. [Deployment](#16-deployment)
17. [Conventions](#17-conventions)
18. [Future scope](#18-future-scope)
19. [Software engineering artefacts (for the TA report)](#19-software-engineering-artefacts-for-the-ta-report)
- [Appendix A: Complete SQL](#appendix-a-complete-sql-schema-v2)

---

## 1. Project summary

**Problem.** Citizens raise local issues (roads, buses, pollution, college facilities) on WhatsApp groups, social media and paper petitions. Support can't be verified (one person can sign many times), nobody can track what happened, and authorities get noise instead of measurable public opinion.

**Solution.** CivicVoice is a web platform where:
- citizens **create petitions** with a problem statement, proposed solution, category, location, signature target and end date;
- registered users **sign each petition exactly once**; signatures are blocked for closed, rejected, under-review or expired petitions;
- everyone sees **live progress** (signatures / target, %);
- users **comment**, **report** inappropriate content and give **rated feedback** on the platform;
- **admins moderate** petitions, comments, reports, feedback and user accounts, and see platform statistics.

**Name and tagline.** CivicVoice: *turn scattered complaints into verified, trackable public demand.*

---

## 2. Scope

### In scope (TA deliverable)
- Email + password authentication with JWT; roles `user` and `admin`.
- Petitions: create, list, search, filter, sort, paginate, view detail, edit own petition while it is `draft` or `published`.
- Signing with one-signature-per-user enforcement in the database.
- Comments with moderation states (`visible`, `hidden`, `removed`).
- Content reports on a petition **or** a comment.
- Platform feedback with a 1–5 rating.
- User dashboard (my petitions, my signatures, my comment count).
- Admin panel: petition status changes, comment moderation, report handling, feedback review, user suspension, statistics.
- Responsive UI (mobile first).

### Out of scope (see [Future scope](#18-future-scope))
Email/SMS notifications, OTP verification, password reset by email, file/image uploads, official government accounts, maps, multilingual UI, AI moderation.

---

## 3. Users, roles and permissions

| Role | How identified | Summary |
|---|---|---|
| **Guest** | No token | Read-only access to public content |
| **User** | JWT, `users.role = 'user'`, `account_status = 'active'` | Participates: creates, signs, comments, reports, gives feedback |
| **Admin** | JWT, `users.role = 'admin'` | Everything a user can do + moderation and statistics |

A **suspended** user can still log in? **No.** Login returns 403, and every authenticated request re-checks `account_status`, so suspension takes effect immediately even for an already-issued token.

### Permission matrix

| Action | Guest | User | Admin |
|---|:-:|:-:|:-:|
| Browse / search / view petitions (published, approved, closed, under_review) | ✅ | ✅ | ✅ |
| View `draft` / `rejected` petitions | ❌ | own only | ✅ |
| Register / log in | ✅ | – | – |
| Create petition | ❌ | ✅ | ✅ |
| Edit petition (title, description, problem, solution, location, end date, target) | ❌ | own, while `draft`/`published` | ✅ |
| Sign petition | ❌ | ✅ (once) | ✅ (once) |
| Comment | ❌ | ✅ | ✅ |
| Report petition / comment | ❌ | ✅ | ✅ |
| Submit feedback | ❌ | ✅ | ✅ |
| Personal dashboard | ❌ | ✅ | ✅ |
| Change petition status | ❌ | own: `draft→published`, `published→closed` | any valid transition |
| Hide / remove / restore comments | ❌ | ❌ | ✅ |
| Review reports and feedback | ❌ | ❌ | ✅ |
| Suspend / reactivate users | ❌ | ❌ | ✅ (not themselves) |
| Platform statistics | ❌ | ❌ | ✅ |

---

## 4. Features and acceptance criteria

Each feature lists the **requirement ID** used in the TA slides (FR1–FR12) and testable acceptance criteria (AC).

### F1 · Authentication (FR1)
- AC1 Register with full name (2–100 chars), email (valid, unique, stored lowercase), password (≥ 8 chars), optional phone.
- AC2 Duplicate email → 409 "An account with this email already exists".
- AC3 Login with wrong email **or** password → the same 401 message (don't reveal which).
- AC4 Successful register/login returns `{ token, user }`; token expires after `JWT_EXPIRES_IN` (default 1 day).
- AC5 Suspended account → 403 on login and on any authenticated request.
- AC6 `GET /api/auth/me` returns the current user; the frontend calls it on page load to restore the session.

### F2 · Browse, search and filter (FR2)
- AC1 Home lists petitions with status `published` by default, 10 per page.
- AC2 Search `q` matches title, description or location (case-insensitive).
- AC3 Filter by `category` and `status` (`published`, `approved`, `under_review`, `closed`, or `all` = all public statuses).
- AC4 Sort: `newest` (default), `popular` (most signatures), `ending` (soonest end date).
- AC5 Each card shows title, category, location, signatures/target, progress bar, status badge, days left.

### F3 · Create and edit petition (FR3)
- AC1 Required: title (5–200), description (≥ 20), category. Optional: problem statement, proposed solution, location, end date (must be in the future), target (1–1,000,000, default 100).
- AC2 Choose **Save as draft** (`draft`) or **Publish** (`published`).
- AC3 The creator can edit while the petition is `draft` or `published`; after that it is locked.

### F4 · Sign petition (FR4)
- AC1 Only logged-in, active users can sign.
- AC2 Signing is allowed only when status is `published` or `approved` **and** `end_date` is empty or not in the past.
- AC3 A second signature by the same user → 409 "You have already signed this petition"; the count does not change.
- AC4 After signing, the UI shows the new count and percentage without a page reload, and the button becomes "Signed ✓" (disabled).
- AC5 Petition detail tells a logged-in user whether they have already signed (`signedByMe`).

### F5 · Comments (FR5)
- AC1 Logged-in users can comment (1–1,000 chars) on any public petition that is not `rejected`.
- AC2 Only `visible` comments are shown publicly; admins see all with their state.

### F6 · Content reports (FR6)
- AC1 A report targets **exactly one** of a petition or a comment (enforced by a CHECK constraint).
- AC2 Reason chosen from: `Spam`, `Abusive or hateful`, `Misleading`, `Duplicate petition`, `Other` (+ optional details).
- AC3 New reports start as `pending`.

### F7 · Feedback (FR7)
- AC1 Subject (3–150), message (≥ 5), rating 1–5 (optional). Rating outside 1–5 → 400.
- AC2 Starts as `new`; admin can mark `reviewed` or `resolved`.

### F8 · User dashboard (FR8)
- AC1 Shows counts from `v_user_dashboard`: petitions created, petitions signed, comments posted.
- AC2 Lists my petitions (any status) with progress and status, and petitions I signed.

### F9 · Admin: petition moderation (FR9)
- AC1 Admin can move a petition along the allowed transitions (Section 5.1) and add an optional `admin_note` (shown to the creator).
- AC2 Invalid transition → 400 with the allowed next states.

### F10 · Admin: comments and reports (FR10)
- AC1 Admin can set a comment to `visible`, `hidden` or `removed`.
- AC2 Admin can list reports by status and resolve them as `reviewed`, `dismissed` or `action_taken` with a note.
- AC3 Admin can list feedback and set `reviewed` / `resolved` (closes the gap noted in the TA slides).

### F11 · Admin: users (FR11)
- AC1 Admin can list/search users and suspend or reactivate them.
- AC2 An admin cannot suspend their own account (400).

### F12 · Admin: statistics (FR12)
- AC1 Totals: users, petitions (by status), signatures, comments, pending reports, new feedback, average feedback rating.
- AC2 Top 5 petitions by signatures.

---

## 5. Business rules

### 5.1 Petition lifecycle

```
           creator            admin               admin
  draft ─────────────▶ published ─────────▶ under_review ─────▶ approved ──┐
    ▲                    │  │                    │                 │       │ admin / creator
    │ (create as draft)  │  └──── admin ─────────┴──▶ rejected     │       ▼
                         │                                         └────▶ closed
                         └──────────── creator / admin ───────────────────▶ closed
```

| From | Allowed next states | Who |
|---|---|---|
| `draft` | `published` | creator, admin |
| `published` | `under_review`, `rejected`, `closed` | admin (`closed` also by creator) |
| `under_review` | `approved`, `rejected` | admin |
| `approved` | `closed` | admin, creator |
| `rejected` | — (final) | — |
| `closed` | — (final) | — |

Keep this table as a constant in the backend (`ALLOWED_TRANSITIONS`) and validate every status change against it.

**Signing is open** only in `published` and `approved` (and not past `end_date`). This rule lives in `sp_sign_petition` so it can't be bypassed.

> Default status for a new petition is `published` (matches the TA schema). If your teacher wants pre-moderation, change the default to `under_review` and let admins publish.

### 5.2 Signatures
- One row per (petition, user): `UNIQUE (petition_id, user_id)`.
- All signing goes through `CALL sp_sign_petition(user_id, petition_id)`; the API never inserts into `signatures` directly.
- Signatures are never edited; withdrawing a signature is out of scope.

### 5.3 Progress
`progress_percentage = ROUND(total_signatures × 100 / target_signatures, 2)`, computed by `v_petition_summary`. It can exceed 100 (show "Goal reached 🎉" at ≥ 100).

### 5.4 Comments, reports, feedback
- Comment states: `visible` (default) → `hidden` (admin, reversible) / `removed` (admin, shown as "comment removed by moderator").
- Report states: `pending` → `reviewed` / `dismissed` / `action_taken`.
- Feedback states: `new` → `reviewed` → `resolved`. `user_id` becomes NULL if the user is deleted (feedback is kept).

### 5.5 Accounts
- Passwords are stored only as bcrypt hashes (cost 10).
- Emails are stored lowercase and are unique.
- Users are never hard-deleted from the UI; admins suspend them instead.

---

## 6. Tech stack

| Layer | Choice | Version used for verification / recommended |
|---|---|---|
| Frontend | React + Vite | React 18, Vite 5 |
| Routing | React Router | 6.x |
| HTTP client | Axios | 1.x |
| Styling | Tailwind CSS | 3.x |
| Backend | Node.js + Express | Node 20+ (verified on 22), Express **4.21.2** |
| DB driver | mysql2 (promise API) | **3.11.5** |
| Auth | jsonwebtoken + bcryptjs | **9.0.2** + **2.4.3** |
| Validation | express-validator | **7.2.1** |
| Security middleware | helmet, cors, express-rate-limit | **8.0.0**, **2.8.5**, **7.5.0** |
| Logging / config | morgan, dotenv | **1.10.0**, **16.4.7** |
| Database | MySQL | **8.0** (verified on 8.0.46) |
| Testing | Jest + Supertest (API), Postman (manual) | Jest 29, Supertest 7 |
| Tools | Git/GitHub, VS Code, MySQL Workbench | – |

Bold versions were installed and run together while preparing this file.

**Why MySQL and not MongoDB (MERN)?** Signatures need relational guarantees: `UNIQUE(petition_id, user_id)`, foreign keys with cascades, CHECK constraints, views and a stored procedure that validates a signature atomically. MySQL gives all of these out of the box.

---

## 7. Architecture

```
┌──────────────────────┐   HTTPS + JSON    ┌───────────────────────────┐   mysql2 pool    ┌──────────────────────┐
│  React SPA (Vite)    │ ────────────────▶ │  Express REST API         │ ───────────────▶ │  MySQL 8             │
│  pages, components   │   Authorization:  │  routes → controllers     │  parameterised   │  7 tables            │
│  AuthContext (JWT)   │   Bearer <JWT>    │  requireAuth/requireAdmin │  queries, CALL   │  2 views             │
│  Axios interceptor   │ ◀──────────────── │  express-validator        │ ◀─────────────── │  sp_sign_petition    │
└──────────────────────┘   { data } /      │  errorHandler (SQL→HTTP)  │                  └──────────────────────┘
                            { error }      └───────────────────────────┘
```

### Request flow: signing a petition
1. User clicks **Sign this petition** → React calls `POST /api/petitions/:id/sign` with the JWT.
2. `requireAuth` verifies the token and re-reads `role` and `account_status` from `users`.
3. Controller runs `CALL sp_sign_petition(userId, petitionId)`.
4. The procedure checks: user active (else `45403`) → petition exists (`45404`) → open for signing (`45400`) → not expired (`45400`) → inserts; a duplicate is caught and raised as `45409`.
5. `errorHandler` maps the SQLSTATE to HTTP (403/404/400/409); success returns `201` with the new count and percentage.
6. React updates the counter and progress bar and disables the button.

---

## 8. Repository structure

```
civicvoice/
├── PROJECT_CONTEXT.md            ← this file
├── README.md                     ← setup + run instructions
├── database/
│   └── civicvoice_schema_v2.sql  ← Appendix A
├── server/
│   ├── server.js                 ← loads .env, starts app
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── app.js                ← express app (no listen) – used by tests
│   │   ├── config/db.js          ← mysql2 pool
│   │   ├── constants.js          ← ALLOWED_TRANSITIONS, REPORT_REASONS
│   │   ├── middleware/
│   │   │   ├── auth.js           ← requireAuth, requireAdmin, optionalAuth
│   │   │   ├── validate.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── index.js          ← mounts all routers under /api
│   │   │   ├── auth.routes.js
│   │   │   ├── category.routes.js
│   │   │   ├── petition.routes.js
│   │   │   ├── comment.routes.js
│   │   │   ├── report.routes.js
│   │   │   ├── feedback.routes.js
│   │   │   ├── user.routes.js
│   │   │   └── admin.routes.js
│   │   ├── controllers/          ← one file per router
│   │   └── utils/
│   │       ├── ApiError.js
│   │       └── asyncHandler.js
│   └── tests/
│       ├── auth.test.js
│       ├── petitions.test.js
│       └── admin.test.js
└── client/
    ├── index.html
    ├── package.json
    ├── .env.example              ← VITE_API_URL
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx               ← routes
        ├── api/client.js         ← axios instance + interceptors
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── Navbar.jsx  Footer.jsx
        │   ├── PetitionCard.jsx  ProgressBar.jsx  StatusBadge.jsx
        │   ├── CommentList.jsx  CommentForm.jsx
        │   ├── ReportDialog.jsx  Pagination.jsx  EmptyState.jsx
        │   ├── ProtectedRoute.jsx  AdminRoute.jsx
        │   └── StatCard.jsx
        ├── pages/
        │   ├── Home.jsx  PetitionDetail.jsx  CreatePetition.jsx  EditPetition.jsx
        │   ├── Login.jsx  Register.jsx  Dashboard.jsx  Feedback.jsx  NotFound.jsx
        │   └── admin/
        │       ├── AdminLayout.jsx  AdminOverview.jsx  AdminPetitions.jsx
        │       ├── AdminComments.jsx  AdminReports.jsx  AdminFeedback.jsx  AdminUsers.jsx
        └── utils/format.js       ← daysLeft(), formatDate(), pct()
```

---

## 9. Database

The full, tested script is in [Appendix A](#appendix-a-complete-sql-schema-v2) (also delivered as `civicvoice_schema_v2.sql`). It drops and recreates the `civicvoice` database, then creates tables, views, the procedure and seed data.

### 9.1 Tables

| Table | Purpose | Key columns and constraints |
|---|---|---|
| `users` | Citizens and admins | `user_id` PK · `email` UNIQUE · `role` ENUM(`user`,`admin`) · `account_status` ENUM(`active`,`suspended`) |
| `categories` | Petition topics | `category_name` UNIQUE |
| `petitions` | Petition content and lifecycle | FK `creator_id`, `category_id` · `target_signatures` CHECK > 0 · `status` ENUM(6) · `admin_note` · `updated_at` |
| `signatures` | Who signed what | `UNIQUE(petition_id, user_id)` · FKs ON DELETE CASCADE |
| `petition_comments` | Discussion | `comment_status` ENUM(`visible`,`hidden`,`removed`) |
| `feedback` | Platform feedback | `rating` CHECK 1–5 or NULL · `user_id` ON DELETE SET NULL |
| `content_reports` | Flags | CHECK exactly one of `petition_id` / `comment_id` · `report_status` ENUM(4) · `admin_note` |

### 9.2 Relationships (ER summary)
- users 1 — N petitions (creator)
- categories 1 — N petitions
- users N — M petitions **through** signatures
- users 1 — N petition_comments, petitions 1 — N petition_comments
- users 1 — N feedback (optional)
- users 1 — N content_reports (reporter); petitions 1 — N content_reports; petition_comments 1 — N content_reports

### 9.3 Views
- **`v_petition_summary`**: one row per petition with `category_name`, `creator_name`, `total_signatures`, `progress_percentage`, `end_date`. **Use it for every list and detail read.**
- **`v_user_dashboard`**: per user: `petitions_created`, `petitions_signed`, `comments_posted`.

### 9.4 Stored procedure `sp_sign_petition(p_user_id, p_petition_id)`

| SQLSTATE | Message | HTTP |
|---|---|---|
| `45403` | User does not exist / User account is not active | 403 |
| `45404` | Petition does not exist | 404 |
| `45400` | Petition is not open for signing / Petition has expired | 400 |
| `45409` | You have already signed this petition | 409 |

### 9.5 What changed from the original TA schema (v1 → v2)
| Change | Why |
|---|---|
| Distinct SQLSTATEs (`45400/403/404/409`) instead of one `45000` | The API maps each failure to the correct HTTP status without parsing messages |
| `EXIT HANDLER FOR 1062` inside the procedure | Duplicate signatures return a clear message instead of a raw MySQL error |
| `petitions.updated_at`, `petitions.admin_note`, `content_reports.admin_note` | Track edits; let admins explain decisions |
| Indexes on status, category, created_at, signatures(user_id), comments(petition_id, status), reports(status) | Fast filters and dashboards |
| `category_id`, `creator_id`, `end_date` added to `v_petition_summary` | Filtering by category and showing "days left" without extra joins |
| `NOT NULL` on enum/status columns, utf8mb4 database | No NULL states; full Unicode (Hindi text, emoji) |
| Real bcrypt hash in seed data | Demo accounts can actually log in |

### 9.6 Seed data and demo accounts
All demo accounts use the password **`Password@123`**.

| Name | Email | Role |
|---|---|---|
| Aarav Sharma | aarav@gmail.com | user |
| Priya Verma | priya@gmail.com | user |
| Admin User | admin@civicvoice.com | admin |
| Rohan Singh | rohan@gmail.com | user |

Seeded: 5 categories, 3 petitions (2 `published`, 1 `under_review`), 6 signatures, 4 comments, 3 feedback entries.

---

## 10. Backend

### 10.1 Setup
```bash
mysql -u root -p < database/civicvoice_schema_v2.sql
# create an app user instead of using root
mysql -u root -p -e "CREATE USER 'civic'@'localhost' IDENTIFIED BY 'civicpass'; GRANT ALL ON civicvoice.* TO 'civic'@'localhost';"

cd server
npm init -y
npm install express@4 mysql2@3 jsonwebtoken@9 bcryptjs@2 express-validator@7 cors helmet express-rate-limit dotenv morgan
npm install -D nodemon jest supertest
```
`package.json` scripts:
```json
"scripts": { "dev": "nodemon server.js", "start": "node server.js", "test": "jest --runInBand" }
```

### 10.2 Environment (`server/.env.example`)
```dotenv
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=civic
DB_PASSWORD=civicpass
DB_NAME=civicvoice
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
```

### 10.3 Response format
- Success: `{ "data": ... }`, plus `"meta": { page, limit, total }` for lists.
- Error: `{ "error": { "message": "...", "code": "...", "fields": [ { field, message } ] } }` (`fields` only for 422).

| HTTP | When |
|---|---|
| 200 / 201 | OK / created |
| 400 | Rule violated (closed petition, CHECK constraint, bad status transition, FK to missing row) |
| 401 | No token, bad token, wrong credentials |
| 403 | Suspended account, not admin, not the owner |
| 404 | Resource or route not found |
| 409 | Duplicate (email, signature) |
| 422 | Input validation failed |
| 429 | Rate limit on `/api/auth/*` |
| 500 | Unexpected error (logged, generic message to client) |

### 10.4 Core files (verified ✅)

These files were run against the Appendix A database and produced the ✅ responses in Section 11.

**`server/server.js`**
```js
require('dotenv').config();
const app = require('./src/app');
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`CivicVoice API listening on :${port}`));
```

**`server/src/app.js`**
```js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50 })); // slow down password guessing

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);
app.use((req, res) => res.status(404).json({ error: { message: 'Route not found' } }));
app.use(errorHandler);

module.exports = app;
```

**`server/src/config/db.js`**
```js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,    // DATE/TIMESTAMP come back as strings, not JS Dates
  decimalNumbers: true, // DECIMAL (e.g. progress_percentage) comes back as a number
});

module.exports = pool;
```

**`server/src/utils/ApiError.js`** and **`asyncHandler.js`**
```js
class ApiError extends Error {
  constructor(status, message, code = undefined) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
module.exports = ApiError;
```
```js
// Express 4 does not catch rejected promises; this forwards them to the error handler.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

**`server/src/middleware/auth.js`**
```js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the JWT and re-reads role/status from the DB on every request,
// so a suspended user or a role change takes effect immediately.
const requireAuth = asyncHandler(async (req, res, next) => {
  const [type, token] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !token) throw new ApiError(401, 'Login required');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const [rows] = await pool.query(
    'SELECT user_id, full_name, role, account_status FROM users WHERE user_id = ?',
    [payload.sub]
  );
  if (!rows.length) throw new ApiError(401, 'User no longer exists');
  if (rows[0].account_status !== 'active') throw new ApiError(403, 'Your account is suspended');

  req.user = { id: rows[0].user_id, name: rows[0].full_name, role: rows[0].role };
  next();
});

const requireAdmin = (req, res, next) =>
  req.user?.role === 'admin' ? next() : next(new ApiError(403, 'Admin access only'));

module.exports = { requireAuth, requireAdmin };
```

**`server/src/middleware/validate.js`**
```js
const { validationResult } = require('express-validator');

// Put after a list of express-validator checks; returns 422 with field errors.
module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return res.status(422).json({
    error: { message: 'Validation failed', fields: result.array().map((e) => ({ field: e.path, message: e.msg })) },
  });
};
```

**`server/src/middleware/errorHandler.js`**
```js
const ApiError = require('../utils/ApiError');

// SQLSTATEs raised by sp_sign_petition (see schema) -> HTTP status
const SQLSTATE_TO_HTTP = { 45400: 400, 45403: 403, 45404: 404, 45409: 409 };

// MySQL error numbers -> HTTP status
const ERRNO_TO_HTTP = {
  1062: 409, // ER_DUP_ENTRY (duplicate email, duplicate signature, ...)
  1452: 400, // ER_NO_REFERENCED_ROW_2 (FK points to a missing row)
  3819: 400, // ER_CHECK_CONSTRAINT_VIOLATED
};

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { message: err.message, code: err.code } });
  }
  if (err.sqlState && SQLSTATE_TO_HTTP[err.sqlState]) {
    return res.status(SQLSTATE_TO_HTTP[err.sqlState]).json({ error: { message: err.sqlMessage, code: err.sqlState } });
  }
  if (err.errno && ERRNO_TO_HTTP[err.errno]) {
    return res.status(ERRNO_TO_HTTP[err.errno]).json({ error: { message: friendly(err), code: err.code } });
  }
  console.error(err);
  return res.status(500).json({ error: { message: 'Something went wrong' } });
};

function friendly(err) {
  if (err.errno === 1062 && /email/.test(err.sqlMessage)) return 'An account with this email already exists';
  if (err.errno === 1062) return 'This record already exists';
  if (err.errno === 3819) return 'A value is outside the allowed range';
  return 'Invalid reference to a related record';
}
```

**`server/src/controllers/auth.controller.js`**
```js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const ApiError = require('../utils/ApiError');

const sign = (user) =>
  jwt.sign({ sub: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

const publicUser = (u) => ({ id: u.user_id, fullName: u.full_name, email: u.email, role: u.role });

exports.register = async (req, res) => {
  const { fullName, email, password, phone } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query(
    'INSERT INTO users (full_name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
    [fullName, email.toLowerCase(), hash, phone || null]
  );
  const user = { user_id: r.insertId, full_name: fullName, email: email.toLowerCase(), role: 'user' };
  res.status(201).json({ data: { token: sign(user), user: publicUser(user) } });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, 'Incorrect email or password');
  }
  if (user.account_status !== 'active') throw new ApiError(403, 'Your account is suspended');
  res.json({ data: { token: sign(user), user: publicUser(user) } });
};
```

**`server/src/controllers/petition.controller.js`** (list, detail, sign)
```js
const pool = require('../config/db');
const ApiError = require('../utils/ApiError');

const SORTS = { newest: 'created_at DESC', popular: 'total_signatures DESC', ending: 'end_date ASC' };

// GET /api/petitions?q=&category=&status=&sort=&page=&limit=
exports.list = async (req, res) => {
  const { q, category, status = 'published', sort = 'newest' } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

  const where = [];
  const params = [];
  if (status !== 'all') { where.push('status = ?'); params.push(status); }
  if (category) { where.push('category_id = ?'); params.push(Number(category)); }
  if (q) { where.push('(title LIKE ? OR description LIKE ? OR location LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM v_petition_summary ${whereSql}`, params);
  const [rows] = await pool.query(
    `SELECT * FROM v_petition_summary ${whereSql} ORDER BY ${SORTS[sort] || SORTS.newest} LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );
  res.json({ data: rows, meta: { page, limit, total } });
};

// POST /api/petitions/:id/sign
exports.sign = async (req, res) => {
  const petitionId = Number(req.params.id);
  await pool.query('CALL sp_sign_petition(?, ?)', [req.user.id, petitionId]);
  const [[summary]] = await pool.query(
    'SELECT total_signatures, progress_percentage FROM v_petition_summary WHERE petition_id = ?',
    [petitionId]
  );
  res.status(201).json({ data: { petitionId, ...summary, signedByMe: true } });
};

// GET /api/petitions/:id
exports.getOne = async (req, res) => {
  const [[p]] = await pool.query('SELECT * FROM v_petition_summary WHERE petition_id = ?', [req.params.id]);
  if (!p) throw new ApiError(404, 'Petition not found');
  res.json({ data: p });
};
```

**Routes used in verification** (in the full project, split these into the per-feature route files from Section 8)
```js
const router = require('express').Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const auth = require('../controllers/auth.controller');
const petitions = require('../controllers/petition.controller');

router.post('/auth/register',
  body('fullName').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().isLength({ max: 150 }),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate, asyncHandler(auth.register));
router.post('/auth/login', body('email').isEmail(), body('password').notEmpty(), validate, asyncHandler(auth.login));

router.get('/petitions', query('sort').optional().isIn(['newest', 'popular', 'ending']), validate, asyncHandler(petitions.list));
router.get('/petitions/:id', param('id').isInt({ min: 1 }), validate, asyncHandler(petitions.getOne));
router.post('/petitions/:id/sign', requireAuth, param('id').isInt({ min: 1 }), validate, asyncHandler(petitions.sign));

module.exports = router;
```

### 10.5 Remaining backend pieces to write

Follow the same pattern (validator chain → `validate` → `asyncHandler(controller)`; parameterised SQL only).

**`src/constants.js`**
```js
exports.ALLOWED_TRANSITIONS = {
  draft: ['published'],
  published: ['under_review', 'rejected', 'closed'],
  under_review: ['approved', 'rejected'],
  approved: ['closed'],
  rejected: [],
  closed: [],
};
// creator may only do these; admin may do any ALLOWED_TRANSITIONS move
exports.CREATOR_TRANSITIONS = { draft: ['published'], published: ['closed'], approved: ['closed'] };
exports.PUBLIC_STATUSES = ['published', 'under_review', 'approved', 'closed'];
exports.REPORT_REASONS = ['Spam', 'Abusive or hateful', 'Misleading', 'Duplicate petition', 'Other'];
```

**`optionalAuth` middleware**: like `requireAuth` but never throws; if a valid token is present it sets `req.user`. Use it on `GET /api/petitions/:id` so the response can include `signedByMe` and so owners/admins can see their `draft`/`rejected` petitions.

**Key queries**
```sql
-- signedByMe for petition detail
SELECT 1 FROM signatures WHERE petition_id = ? AND user_id = ? LIMIT 1;

-- public comments for a petition (newest first)
SELECT c.comment_id, c.comment_text, c.created_at, u.user_id, u.full_name
FROM petition_comments c JOIN users u ON u.user_id = c.user_id
WHERE c.petition_id = ? AND c.comment_status = 'visible'
ORDER BY c.created_at DESC;

-- my petitions (dashboard)
SELECT * FROM v_petition_summary WHERE creator_id = ? ORDER BY created_at DESC;

-- petitions I signed
SELECT v.* , s.signed_at FROM signatures s
JOIN v_petition_summary v ON v.petition_id = s.petition_id
WHERE s.user_id = ? ORDER BY s.signed_at DESC;

-- admin statistics
SELECT
  (SELECT COUNT(*) FROM users)                                   AS total_users,
  (SELECT COUNT(*) FROM petitions)                               AS total_petitions,
  (SELECT COUNT(*) FROM signatures)                              AS total_signatures,
  (SELECT COUNT(*) FROM petition_comments)                       AS total_comments,
  (SELECT COUNT(*) FROM content_reports WHERE report_status='pending') AS pending_reports,
  (SELECT COUNT(*) FROM feedback WHERE feedback_status='new')    AS new_feedback,
  (SELECT ROUND(AVG(rating),2) FROM feedback)                    AS avg_rating;
SELECT status, COUNT(*) AS count FROM petitions GROUP BY status;
SELECT petition_id, title, total_signatures, progress_percentage
FROM v_petition_summary ORDER BY total_signatures DESC LIMIT 5;
```

**Status change (admin or creator)**: load the petition, check `ALLOWED_TRANSITIONS[current].includes(next)` (and `CREATOR_TRANSITIONS` if the caller is the creator but not admin), else `400 { message: "Cannot change from X to Y", allowed: [...] }`; then `UPDATE petitions SET status = ?, admin_note = ? WHERE petition_id = ?`.

**Edit petition**: allowed only if the caller is the creator (or admin) **and** status is `draft` or `published`; update only whitelisted fields.

---

## 11. API reference

Base URL: `http://localhost:5000/api` · Auth header: `Authorization: Bearer <token>`
Access: **P** = public, **U** = logged-in active user, **A** = admin. ✅ = verified output.

### 11.1 Endpoint list

| # | Method | Path | Access | Purpose |
|---|---|---|:-:|---|
| 1 | GET | `/health` | P | Health check ✅ |
| 2 | POST | `/auth/register` | P | Create account, returns token ✅ |
| 3 | POST | `/auth/login` | P | Log in, returns token ✅ |
| 4 | GET | `/auth/me` | U | Current user |
| 5 | GET | `/categories` | P | All categories |
| 6 | GET | `/petitions` | P | List / search / filter / sort / paginate ✅ |
| 7 | GET | `/petitions/:id` | P (optionalAuth) | Detail + `signedByMe` ✅ (detail) |
| 8 | POST | `/petitions` | U | Create petition |
| 9 | PATCH | `/petitions/:id` | U (owner) / A | Edit while `draft`/`published` |
| 10 | PATCH | `/petitions/:id/status` | U (owner, limited) / A | Change status (Section 5.1) |
| 11 | POST | `/petitions/:id/sign` | U | Sign via `sp_sign_petition` ✅ |
| 12 | GET | `/petitions/:id/comments` | P | Visible comments |
| 13 | POST | `/petitions/:id/comments` | U | Add comment |
| 14 | POST | `/reports` | U | Report a petition or comment |
| 15 | POST | `/feedback` | U | Submit feedback |
| 16 | GET | `/users/me/dashboard` | U | Counts + my petitions + signed petitions |
| 17 | GET | `/admin/stats` | A | Platform statistics |
| 18 | GET | `/admin/petitions?status=` | A | All petitions incl. draft/rejected |
| 19 | GET | `/admin/comments?status=` | A | All comments with state |
| 20 | PATCH | `/admin/comments/:id` | A | `{ status: visible\|hidden\|removed }` |
| 21 | GET | `/admin/reports?status=` | A | Reports with target info |
| 22 | PATCH | `/admin/reports/:id` | A | `{ status, adminNote }` |
| 23 | GET | `/admin/feedback?status=` | A | Feedback list |
| 24 | PATCH | `/admin/feedback/:id` | A | `{ status: reviewed\|resolved }` |
| 25 | GET | `/admin/users?q=` | A | Users list/search |
| 26 | PATCH | `/admin/users/:id` | A | `{ accountStatus: active\|suspended }` |

(The TA slides show the 15 core endpoints; this list adds the supporting ones needed for a complete app.)

### 11.2 Examples

**POST `/auth/register`** ✅
```json
// request
{ "fullName": "Neha Gupta", "email": "neha@gmail.com", "password": "Password@123", "phone": "9876500000" }
// 201
{ "data": { "token": "eyJhbGciOi...", "user": { "id": 5, "fullName": "Neha Gupta", "email": "neha@gmail.com", "role": "user" } } }
// 409 (same email again)
{ "error": { "message": "An account with this email already exists", "code": "ER_DUP_ENTRY" } }
// 422 (password "123")
{ "error": { "message": "Validation failed", "fields": [ { "field": "password", "message": "Password must be at least 8 characters" } ] } }
```

**POST `/auth/login`** ✅
```json
// request
{ "email": "priya@gmail.com", "password": "Password@123" }
// 200
{ "data": { "token": "eyJhbGciOi...", "user": { "id": 2, "fullName": "Priya Verma", "email": "priya@gmail.com", "role": "user" } } }
// 401 (wrong password)
{ "error": { "message": "Incorrect email or password" } }
```

**GET `/petitions?q=library&status=all&sort=popular&page=1&limit=10`** ✅ (one item shown)
```json
{
  "data": [{
    "petition_id": 1, "title": "Improve College Library Facilities",
    "description": "We request better library facilities for students.",
    "location": "Gurugram, Haryana", "status": "published",
    "category_id": 1, "category_name": "Education",
    "creator_id": 1, "creator_name": "Aarav Sharma",
    "target_signatures": 500, "total_signatures": 2, "progress_percentage": 0.4,
    "end_date": "2027-01-16", "created_at": "2026-11-17 04:16:57"
  }],
  "meta": { "page": 1, "limit": 10, "total": 1 }
}
```
Query params: `q`, `category` (id), `status` (`published` default, or `approved`, `under_review`, `closed`, `all`), `sort` (`newest` | `popular` | `ending`), `page`, `limit` (≤ 50).
> In the full app, `status=all` must mean *all public statuses* (`PUBLIC_STATUSES`), not drafts/rejected.

**GET `/petitions/:id`** (with optionalAuth)
```json
{ "data": { "petition_id": 1, "title": "...", "problem_statement": "...", "proposed_solution": "...",
            "total_signatures": 2, "progress_percentage": 0.4, "status": "published",
            "end_date": "2027-01-16", "signedByMe": false, "canEdit": false } }
```
(The detail query must also select `problem_statement`, `proposed_solution` and `admin_note` from `petitions`, since the view does not include them.)

**POST `/petitions`**
```json
// request
{ "categoryId": 2, "title": "Clean the Sector 14 Lake", "description": "The lake is full of plastic and sewage ...",
  "problemStatement": "...", "proposedSolution": "...", "targetSignatures": 250,
  "location": "Gurugram, Haryana", "endDate": "2027-02-28", "status": "published" }
// 201
{ "data": { "petitionId": 4 } }
```

**POST `/petitions/:id/sign`** ✅
```json
// 201 (first signature by this user)
{ "data": { "petitionId": 1, "total_signatures": 3, "progress_percentage": 0.6, "signedByMe": true } }
// 409 same user again
{ "error": { "message": "You have already signed this petition", "code": "45409" } }
// 400 petition under review / closed / expired
{ "error": { "message": "Petition is not open for signing", "code": "45400" } }
// 404
{ "error": { "message": "Petition does not exist", "code": "45404" } }
// 401 no token
{ "error": { "message": "Login required" } }
// 403 suspended user
{ "error": { "message": "Your account is suspended" } }
```

**POST `/petitions/:id/comments`**
```json
{ "text": "Fully support this. The buses at 9 am are always full." }
// 201 → { "data": { "commentId": 5 } }
```

**POST `/reports`**
```json
{ "commentId": 3, "reason": "Spam", "details": "Same message posted on many petitions" }
// or { "petitionId": 2, "reason": "Duplicate petition" }   — never both
// 201 → { "data": { "reportId": 1, "status": "pending" } }
```

**POST `/feedback`**
```json
{ "subject": "Search", "message": "Please add a filter by location.", "rating": 4 }
// 400 if rating = 6 → { "error": { "message": "A value is outside the allowed range", "code": "ER_CHECK_CONSTRAINT_VIOLATED" } }
```

**PATCH `/petitions/:id/status`**
```json
{ "status": "approved", "adminNote": "Forwarded to the transport department." }
// 400 invalid move
{ "error": { "message": "Cannot change from published to approved", "allowed": ["under_review", "rejected", "closed"] } }
```

**GET `/admin/stats`**
```json
{ "data": { "totals": { "users": 4, "petitions": 3, "signatures": 6, "comments": 4, "pendingReports": 0, "newFeedback": 3, "avgRating": 4.67 },
            "byStatus": { "published": 2, "under_review": 1 },
            "topPetitions": [ { "petition_id": 1, "title": "Improve College Library Facilities", "total_signatures": 2 } ] } }
```

---

## 12. Frontend

### 12.1 Setup
```bash
npm create vite@latest client -- --template react
cd client
npm install react-router-dom axios
npm install -D tailwindcss@3 postcss autoprefixer && npx tailwindcss init -p
```
`client/.env.example`
```dotenv
VITE_API_URL=http://localhost:5000/api
```

### 12.2 Routes

| Path | Page | Access |
|---|---|---|
| `/` | Home: hero, search, filters, petition grid, pagination | public |
| `/petitions/:id` | PetitionDetail: info, progress, sign, comments, report | public (sign/comment need login) |
| `/petitions/new` | CreatePetition | user |
| `/petitions/:id/edit` | EditPetition | owner/admin |
| `/login`, `/register` | Auth forms (redirect back after login) | guest |
| `/dashboard` | My stats, my petitions, signed petitions | user |
| `/feedback` | Feedback form with star rating | user |
| `/admin` | AdminOverview: stat cards, petitions by status, top 5 | admin |
| `/admin/petitions` | Table + status change dialog with note | admin |
| `/admin/comments` | Table + visible/hidden/removed toggle | admin |
| `/admin/reports` | Pending first; open target; resolve with note | admin |
| `/admin/feedback` | List + mark reviewed/resolved | admin |
| `/admin/users` | Search + suspend/reactivate | admin |
| `*` | NotFound | public |

### 12.3 Auth handling
- `AuthContext` stores `{ user, token }`; token kept in `localStorage` (simple, acceptable for the TA; mention httpOnly cookies as an improvement).
- On app start: if a token exists, call `GET /auth/me`; on 401 clear it.
- `ProtectedRoute` redirects guests to `/login?next=<path>`; `AdminRoute` also checks `user.role === 'admin'`.

`src/api/client.js`
```js
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,                       // components receive { data, meta }
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:logout'));
    }
    const e = err.response?.data?.error || { message: 'Network error, please try again' };
    return Promise.reject(e);              // { message, code, fields? }
  }
);

export default api;
```

### 12.4 Key components
| Component | Props / behaviour |
|---|---|
| `PetitionCard` | petition summary row; title, category chip, location, `ProgressBar`, "x of y signatures", `StatusBadge`, days left |
| `ProgressBar` | `value` (0–100+), clamps width at 100%, label "0.40%"; green "Goal reached" at ≥ 100 |
| `StatusBadge` | colour per status: published=teal, under_review=amber, approved=green, rejected=red, closed=grey, draft=slate |
| `SignButton` | states: guest → "Log in to sign" (link); open → "Sign this petition"; loading; signed → "Signed ✓" disabled; closed/expired → disabled with reason |
| `CommentList` / `CommentForm` | newest first; empty state; 1,000-char counter |
| `ReportDialog` | reason radio list + details; sends `petitionId` **or** `commentId` |
| `StatCard` | big number + label (admin and dashboard) |

### 12.5 UI states to handle on every page
Loading (skeletons), empty ("No petitions match your search"), error (message from `error.message` + retry), and success toasts ("Signature added", "Comment posted").

### 12.6 Design tokens (match the TA deck)
| Token | Hex | Use |
|---|---|---|
| `ink` | `#0B3C49` | navbar, headings, dark cards |
| `teal` | `#137C6B` | primary actions, progress bars |
| `saffron` | `#F2994A` | sign button, highlights |
| `plum` | `#8E5572` | admin accents |
| `mint` | `#E7F2EF` | card backgrounds |
| `danger` | `#C0392B` | errors, reject |
| `success` | `#2E9E5B` | approve, signed |
Fonts: headings **Cambria/serif**, body **Inter or system sans**. Rounded cards (`rounded-xl`), soft shadows, generous spacing.

### 12.7 Screen sketches
- **Home:** navbar (logo, Explore, Start a petition, Login/Avatar) → hero "Raise your voice for your community" + search → category chips → sort dropdown → 3-column grid of `PetitionCard` → pagination.
- **Petition detail:** title, category, location, creator, dates → two columns: left = description, problem, proposed solution, admin note; right (sticky) = big signature count, progress bar, days left, **Sign** button, share link, report → comments below.
- **Admin overview:** 4 stat cards (users, petitions, signatures, comments) + pending reports/new feedback badges → petitions-by-status bar → "Needs action" list with Approve/Reject buttons.

---

## 13. Security checklist

- [x] Passwords hashed with bcrypt (cost 10); hashes never returned by the API.
- [x] JWT signed with a long random `JWT_SECRET` from `.env`; expiry 1 day.
- [x] `requireAuth` re-checks `account_status` and `role` from the DB on every request.
- [x] `requireAdmin` on every `/api/admin/*` route.
- [x] All SQL uses `?` placeholders (no string concatenation of user input). The only interpolated SQL is `ORDER BY`, which comes from a fixed whitelist (`SORTS`).
- [x] Input validation with express-validator; 422 with field errors.
- [x] Duplicate signatures blocked in three layers: disabled button → 409 from API → `UNIQUE(petition_id, user_id)`.
- [x] `helmet` security headers; CORS restricted to `CLIENT_URL`; JSON body limit 100 kb.
- [x] Rate limit on `/api/auth/*` (50 requests / 15 min / IP).
- [x] Generic 500 messages; details only in server logs.
- [ ] React escapes output by default; never use `dangerouslySetInnerHTML` for comments/descriptions.
- [ ] `.env` in `.gitignore`; commit only `.env.example`.
- [ ] Ownership checks: a user may edit/close only their own petition.

---

## 14. Testing

### 14.1 Database test cases (all executed ✅ on MySQL 8.0.46)

| ID | Scenario | Input | Expected / actual result |
|---|---|---|---|
| TC01 | Active user signs open petition | `CALL sp_sign_petition(3, 1)` | Signature saved; count 2 → 3 |
| TC02 | Same user signs twice | `CALL sp_sign_petition(2, 1)` | `45409` You have already signed this petition |
| TC03 | Sign petition under review | `CALL sp_sign_petition(1, 3)` | `45400` Petition is not open for signing |
| TC04 | Sign non-existent petition | `CALL sp_sign_petition(1, 99)` | `45404` Petition does not exist |
| TC05 | Non-existent user signs | `CALL sp_sign_petition(99, 1)` | `45403` User does not exist |
| TC06 | Suspended user signs | set `suspended`, then CALL | `45403` User account is not active |
| TC07 | Sign expired petition | `end_date` = yesterday, then CALL | `45400` Petition has expired |
| TC08 | Feedback rating 6 | INSERT feedback rating 6 | CHECK `feedback_chk_1` violated |
| TC09 | Report with no target | both ids NULL | CHECK `content_reports_chk_1` violated |
| TC10 | Valid comment report | `comment_id = 3` | Saved as `pending` |
| TC11 | Petition target 0 | `target_signatures = 0` | CHECK `petitions_chk_1` violated |
| TC12 | Duplicate email | `aarav@gmail.com` again | Error 1062 duplicate entry |

(TC02–TC07 show the v2 SQLSTATEs; the v1 TA schema returned `45000`, and `1062` for duplicates.)

### 14.2 API test cases (✅ = executed against the reference backend)

| ID | Request | Expected |
|---|---|---|
| API01 ✅ | `GET /health` | 200 `{status:"ok"}` |
| API02 ✅ | Login with correct demo credentials | 200 + token |
| API03 ✅ | Login wrong password | 401 |
| API04 ✅ | Register with 3-char password | 422 with field error |
| API05 ✅ | Register new user | 201 + token |
| API06 ✅ | Register same email again | 409 |
| API07 ✅ | List with `sort=popular&limit=2` | 200, 2 items, `meta.total` |
| API08 ✅ | Search `q=library&status=all` | 200, 1 match |
| API09 ✅ | Sign without token | 401 |
| API10 ✅ | Sign as new user | 201, count +1 |
| API11 ✅ | Sign again as Priya | 409 |
| API12 ✅ | Sign `under_review` petition | 400 |
| API13 ✅ | Sign petition 99 | 404 |
| API14 ✅ | Suspended user signs (old token) | 403 |
| API15 ✅ | Unknown route | 404 |
| API16 | Non-admin calls `/admin/stats` | 403 |
| API17 | Admin approves `published` directly | 400 with `allowed` list |
| API18 | Report with both `petitionId` and `commentId` | 422 (validator) / 400 (CHECK) |
| API19 | Feedback rating 6 | 422 (validator) |
| API20 | User edits someone else's petition | 403 |
| API21 | Admin suspends self | 400 |

### 14.3 Automated tests (Jest + Supertest)
Use a separate database `civicvoice_test` (run the Appendix A script with the database name changed), set `NODE_ENV=test`, and reset it before each test file.

```js
// tests/petitions.test.js
require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const app = require('../src/app');

const login = async (email) =>
  (await request(app).post('/api/auth/login').send({ email, password: 'Password@123' })).body.data.token;

test('a user cannot sign the same petition twice', async () => {
  const token = await login('priya@gmail.com');          // Priya already signed petition 1 in seed data
  const res = await request(app).post('/api/petitions/1/sign').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(409);
  expect(res.body.error.code).toBe('45409');
});

test('signing an under-review petition is rejected', async () => {
  const token = await login('rohan@gmail.com');
  const res = await request(app).post('/api/petitions/3/sign').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(400);
});
```
(Add `afterAll(() => require('../src/config/db').end())` so Jest exits cleanly.)

### 14.4 User acceptance testing (UAT) checklist
Give classmates the demo accounts and these tasks; record pass/fail and comments.
1. As a guest, find the library petition using search and read it.
2. Register, then sign the library petition. The count increases by 1 and the button changes to "Signed ✓".
3. Try to sign it again; a clear message says you already signed.
4. Create a petition in "Environment" with a target of 50 and an end date next month.
5. Comment on someone else's petition, then report a comment as spam.
6. Give feedback with 4 stars.
7. As admin: move the new petition to `under_review`, then `approved` with a note; hide the reported comment; resolve the report; mark the feedback reviewed; suspend a test user.
8. As the suspended user, try to sign; you are told the account is suspended.
9. Check the dashboard counts match what you did.

---

## 15. Build plan (TA1 → TA3)

Each step ends with something you can demo. Tick as you go.

### TA1 · Analysis & design
- [ ] Requirements (Sections 3–5), process model justification, use case / class / sequence / ER diagrams, Use Case Points estimate (see the TA deck)
- [ ] Run Appendix A; confirm the 12 DB test cases

### TA2 · Implementation
1. [ ] **Backend skeleton:** `app.js`, db pool, `/health`, error handler (Section 10.4)
2. [ ] **Auth:** register, login, `/auth/me`, `requireAuth`, `requireAdmin`
3. [ ] **Read APIs:** categories, petition list (filters, sort, pagination), detail with `optionalAuth` + `signedByMe`, comments list
4. [ ] **Write APIs:** create/edit petition, sign, comment, report, feedback, dashboard
5. [ ] **Admin APIs:** stats, petition status (transition table), comments, reports, feedback, users
6. [ ] **Frontend skeleton:** Vite + Tailwind + Router, Navbar, AuthContext, axios client, Login/Register
7. [ ] **Public pages:** Home (cards, search, filters, pagination), PetitionDetail (sign, comments, report)
8. [ ] **User pages:** CreatePetition, EditPetition, Dashboard, Feedback
9. [ ] **Admin pages:** layout + 6 screens
10. [ ] **Polish:** loading/empty/error states, toasts, responsive check at 375 px

### TA3 · Testing & delivery
- [ ] Postman collection for all 26 endpoints (save as `server/tests/civicvoice.postman_collection.json`)
- [ ] Jest + Supertest for auth, signing, admin access
- [ ] UAT with 3–5 classmates (Section 14.4), fix issues
- [ ] Deploy (Section 16); add live URL + demo accounts to README
- [ ] Final report: screenshots, test results, limitations, future scope

---

## 16. Deployment

| Part | Option (free tier) | Notes |
|---|---|---|
| Database | Aiven for MySQL, Railway MySQL, or TiDB Serverless (MySQL-compatible) | Run Appendix A once; some hosts don't allow `DROP/CREATE DATABASE`, so remove those two lines and run the rest inside the provided DB; procedures need `DELIMITER` support (use the host's SQL console or `mysql` CLI) |
| API | Render (Web Service) | Build `npm install`, start `node server.js`; set all `.env` vars; `CLIENT_URL` = frontend URL |
| Frontend | Vercel or Netlify | Build `npm run build`, output `dist`; set `VITE_API_URL`; add SPA rewrite (all routes → `/index.html`) |

Checklist: HTTPS everywhere · CORS `CLIENT_URL` matches exactly · strong `JWT_SECRET` · DB SSL if the host requires it (`ssl: { rejectUnauthorized: true }` in the pool) · change demo passwords in production.

---

## 17. Conventions

- **Naming:** DB `snake_case`; JS `camelCase`; React components `PascalCase.jsx`. Controllers return DB rows as-is for views (snake_case) or map to camelCase consistently. Pick one and keep it (the reference code returns view rows unchanged).
- **Routes:** plural nouns, nested for ownership (`/petitions/:id/comments`), admin under `/admin`.
- **Errors:** throw `ApiError(status, message)` in controllers; never `res.status(500)` by hand.
- **Git:** branches `feature/<name>`; commits like `feat(api): sign petition endpoint`, `fix(ui): disable sign button after signing`.
- **No secrets in code**; `.env` is git-ignored.
- **Dates:** store UTC timestamps; `end_date` is a DATE; show "x days left" using the user's local date.

---

## 18. Future scope
- Email/SMS when a petition reaches its target (requested in seed feedback)
- Phone OTP verification at sign-up (stronger one-person-one-signature)
- Password reset by email
- Verified official accounts that can respond to petitions
- Map view of petitions by location; share buttons
- Hindi and regional languages
- AI help: detect duplicate petitions and flag abusive comments
- Petition images/attachments (cloud storage)

---

## 19. Software engineering artefacts (for the TA report)

| Artefact | Content |
|---|---|
| Process model | Evolutionary prototyping. Community features (comments, reports, feedback) are refined from real user engagement; each TA phase is one increment: (1) users, categories, petitions, signing; (2) comments, reports, feedback; (3) admin moderation, dashboards, hardening |
| Use case diagram | Actors Guest, Registered User (inherits Guest), Admin; use cases = Section 3 matrix |
| Class diagram | User, Petition, Category, Signature, Comment, Feedback, ContentReport (one class per table) |
| Sequence diagram | Signing flow in Section 7 |
| ER diagram | Section 9.2 |
| Cost estimation (UCP) | UAW 9 (3 complex actors) · UUCW 75 (5 simple × 5 + 5 average × 10) · UUCP 84 · TCF 0.99 (TF 39) · ECF 0.89 (EF 17) · **UCP 74.01** · effort ≈ 1,480 person-hours at 20 h/UCP · ≈ ₹3.70 lakh at an assumed ₹250/h |
| Testing focus | Functional (signing/voting), security (duplicate prevention, suspended users, admin-only routes), UAT |

---

## Appendix A: Complete SQL (schema v2)

Tested on MySQL 8.0.46. Running it **drops and recreates** the `civicvoice` database.

```sql
-- =========================================================
-- CIVICVOICE · Online Petition & Community Feedback Platform
-- Schema v2 (MySQL 8.0+)
-- Based on the TA schema; v2 adds:
--   * updated_at on petitions, admin_note on petitions/reports
--   * indexes for common filters
--   * distinct SQLSTATE codes in sp_sign_petition so the API can map
--     each failure to the right HTTP status
--   * duplicate signature handled inside the procedure (45409)
-- =========================================================

DROP DATABASE IF EXISTS civicvoice;
CREATE DATABASE civicvoice CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE civicvoice;

-- ---------- users ----------
CREATE TABLE users (
    user_id        INT AUTO_INCREMENT PRIMARY KEY,
    full_name      VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    phone          VARCHAR(20),
    role           ENUM('user','admin') NOT NULL DEFAULT 'user',
    account_status ENUM('active','suspended') NOT NULL DEFAULT 'active',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- categories ----------
CREATE TABLE categories (
    category_id   INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description   VARCHAR(255)
);

-- ---------- petitions ----------
CREATE TABLE petitions (
    petition_id        INT AUTO_INCREMENT PRIMARY KEY,
    creator_id         INT NOT NULL,
    category_id        INT NOT NULL,
    title              VARCHAR(200) NOT NULL,
    description        TEXT NOT NULL,
    problem_statement  TEXT,
    proposed_solution  TEXT,
    target_signatures  INT NOT NULL DEFAULT 100,
    status ENUM('draft','published','under_review','approved','rejected','closed')
                       NOT NULL DEFAULT 'published',
    location           VARCHAR(150),
    end_date           DATE,
    admin_note         VARCHAR(500),
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id)  REFERENCES users(user_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    CHECK (target_signatures > 0),
    INDEX idx_petitions_status (status),
    INDEX idx_petitions_category (category_id),
    INDEX idx_petitions_created (created_at)
);

-- ---------- signatures (one per user per petition) ----------
CREATE TABLE signatures (
    signature_id INT AUTO_INCREMENT PRIMARY KEY,
    petition_id  INT NOT NULL,
    user_id      INT NOT NULL,
    signed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (petition_id) REFERENCES petitions(petition_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)     REFERENCES users(user_id)         ON DELETE CASCADE,
    UNIQUE KEY uq_signature (petition_id, user_id),
    INDEX idx_signatures_user (user_id)
);

-- ---------- petition_comments ----------
CREATE TABLE petition_comments (
    comment_id     INT AUTO_INCREMENT PRIMARY KEY,
    petition_id    INT NOT NULL,
    user_id        INT NOT NULL,
    comment_text   TEXT NOT NULL,
    comment_status ENUM('visible','hidden','removed') NOT NULL DEFAULT 'visible',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (petition_id) REFERENCES petitions(petition_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)     REFERENCES users(user_id)         ON DELETE CASCADE,
    INDEX idx_comments_petition (petition_id, comment_status)
);

-- ---------- feedback ----------
CREATE TABLE feedback (
    feedback_id     INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT,
    subject         VARCHAR(150) NOT NULL,
    message         TEXT NOT NULL,
    rating          INT,
    feedback_status ENUM('new','reviewed','resolved') NOT NULL DEFAULT 'new',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
);

-- ---------- content_reports ----------
CREATE TABLE content_reports (
    report_id     INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id   INT NOT NULL,
    petition_id   INT,
    comment_id    INT,
    reason        VARCHAR(150) NOT NULL,
    details       TEXT,
    report_status ENUM('pending','reviewed','dismissed','action_taken') NOT NULL DEFAULT 'pending',
    admin_note    VARCHAR(500),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (petition_id) REFERENCES petitions(petition_id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id)  REFERENCES petition_comments(comment_id) ON DELETE CASCADE,
    CHECK ((petition_id IS NOT NULL AND comment_id IS NULL)
        OR (petition_id IS NULL AND comment_id IS NOT NULL)),
    INDEX idx_reports_status (report_status)
);

-- ---------- views ----------
CREATE VIEW v_petition_summary AS
SELECT
    p.petition_id, p.title, p.description, p.location, p.status,
    p.category_id, c.category_name,
    p.creator_id, u.full_name AS creator_name,
    p.target_signatures,
    COUNT(s.signature_id) AS total_signatures,
    ROUND(COUNT(s.signature_id) * 100.0 / p.target_signatures, 2) AS progress_percentage,
    p.end_date, p.created_at
FROM petitions p
JOIN users u      ON p.creator_id  = u.user_id
JOIN categories c ON p.category_id = c.category_id
LEFT JOIN signatures s ON p.petition_id = s.petition_id
GROUP BY p.petition_id, p.title, p.description, p.location, p.status,
         p.category_id, c.category_name, p.creator_id, u.full_name,
         p.target_signatures, p.end_date, p.created_at;

CREATE VIEW v_user_dashboard AS
SELECT
    u.user_id, u.full_name, u.email, u.role,
    (SELECT COUNT(*) FROM petitions p         WHERE p.creator_id = u.user_id) AS petitions_created,
    (SELECT COUNT(*) FROM signatures s        WHERE s.user_id    = u.user_id) AS petitions_signed,
    (SELECT COUNT(*) FROM petition_comments c WHERE c.user_id    = u.user_id) AS comments_posted
FROM users u;

-- ---------- stored procedure ----------
-- SQLSTATE codes (API maps them to HTTP):
--   45403 user missing / not active   -> 403
--   45404 petition does not exist     -> 404
--   45400 petition closed or expired  -> 400
--   45409 already signed              -> 409
DELIMITER $$
CREATE PROCEDURE sp_sign_petition(IN p_user_id INT, IN p_petition_id INT)
BEGIN
    DECLARE v_status VARCHAR(30);
    DECLARE v_end_date DATE;
    DECLARE v_account_status VARCHAR(20);
    DECLARE EXIT HANDLER FOR 1062
        SIGNAL SQLSTATE '45409' SET MESSAGE_TEXT = 'You have already signed this petition';

    SELECT account_status INTO v_account_status FROM users WHERE user_id = p_user_id;
    IF v_account_status IS NULL THEN
        SIGNAL SQLSTATE '45403' SET MESSAGE_TEXT = 'User does not exist';
    ELSEIF v_account_status <> 'active' THEN
        SIGNAL SQLSTATE '45403' SET MESSAGE_TEXT = 'User account is not active';
    END IF;

    SELECT status, end_date INTO v_status, v_end_date FROM petitions WHERE petition_id = p_petition_id;
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45404' SET MESSAGE_TEXT = 'Petition does not exist';
    ELSEIF v_status NOT IN ('published','approved') THEN
        SIGNAL SQLSTATE '45400' SET MESSAGE_TEXT = 'Petition is not open for signing';
    ELSEIF v_end_date IS NOT NULL AND v_end_date < CURDATE() THEN
        SIGNAL SQLSTATE '45400' SET MESSAGE_TEXT = 'Petition has expired';
    END IF;

    INSERT INTO signatures (petition_id, user_id) VALUES (p_petition_id, p_user_id);
END$$
DELIMITER ;

-- ---------- seed data ----------
-- Demo accounts all use the password: Password@123  (bcrypt hash, cost 10)
SET @demo_hash = '$2a$10$hisQnrQLza9K5wAad168Zu/2vH1jdjyXXV2CAySGrqrMUcvKI/0/.';

INSERT INTO users (full_name, email, password_hash, phone, role) VALUES
('Aarav Sharma', 'aarav@gmail.com',      @demo_hash, '9876543210', 'user'),
('Priya Verma',  'priya@gmail.com',      @demo_hash, '9876543211', 'user'),
('Admin User',   'admin@civicvoice.com', @demo_hash, '9876543212', 'admin'),
('Rohan Singh',  'rohan@gmail.com',      @demo_hash, '9876543213', 'user');

INSERT INTO categories (category_name, description) VALUES
('Education', 'Schools, colleges and educational facilities'),
('Environment', 'Pollution and environmental protection'),
('Healthcare', 'Public healthcare and medical facilities'),
('Public Transport', 'Roads, buses and transportation'),
('Community Development', 'Local development and public facilities');

INSERT INTO petitions (creator_id, category_id, title, description, problem_statement,
                       proposed_solution, target_signatures, status, location, end_date) VALUES
(1, 1, 'Improve College Library Facilities', 'We request better library facilities for students.',
 'The library has limited seating and outdated books.', 'Provide more seating, new books and extended hours.',
 500, 'published', 'Gurugram, Haryana', DATE_ADD(CURDATE(), INTERVAL 60 DAY)),
(2, 2, 'Make Our Neighbourhood Plastic-Free', 'We want to reduce plastic pollution.',
 'Plastic waste is increasing in public areas.', 'Install recycling bins and organise awareness campaigns.',
 300, 'published', 'Gurugram, Haryana', DATE_ADD(CURDATE(), INTERVAL 45 DAY)),
(4, 4, 'Increase Local Bus Services', 'Residents need more frequent public buses.',
 'Long waiting times create commuting difficulties.', 'Increase bus frequency during peak hours.',
 1000, 'under_review', 'Gurugram, Haryana', DATE_ADD(CURDATE(), INTERVAL 90 DAY));

INSERT INTO signatures (petition_id, user_id) VALUES (1,2),(1,4),(2,1),(2,4),(3,1),(3,2);

INSERT INTO petition_comments (petition_id, user_id, comment_text) VALUES
(1, 2, 'I support better library facilities.'),
(1, 4, 'More books and study spaces are needed.'),
(2, 1, 'We should keep our neighbourhood clean.'),
(3, 2, 'Better bus services will help students.');

INSERT INTO feedback (user_id, subject, message, rating) VALUES
(1, 'Website Design', 'The website is easy to use and understand.', 5),
(2, 'New Feature', 'Please add petition search and filters.', 4),
(4, 'Suggestion', 'Add notifications when petitions reach their goals.', 5);
```
