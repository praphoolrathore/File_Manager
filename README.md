# File Manager (Express + SQLite + Vanilla Multi-Page MVC)

A fast, lightweight, and secure personal file management application built strictly following the **Model-View-Controller (MVC)** architectural pattern. Users register and log in, then upload, list, update, download, and delete **their own** files with full ownership isolation.

The frontend is built with pure **HTML5, CSS3, and Vanilla JavaScript** with **dedicated pages for Login, Register, and Dashboard** — completely eliminating React, Vite, bundlers, and centralized API wrappers. Every page directly calls standard `fetch()` for maximum simplicity and performance.

---

## MVC Architecture & Multi-Page Directory Structure

The project strictly separates concerns across **Models**, **Views**, and **Controllers**, giving each frontend page its own dedicated View, CSS stylesheet, and JavaScript logic:

```text
file_manager/
├── config/
│   └── db.js                 # Database configuration & table initialization
├── models/                   # [M] MODEL: Data access layer & business entities
│   ├── user.js               # User entity (database queries & constraints)
│   └── file.js               # File metadata entity (database queries, updates & ownership filters)
├── views/                    # [V] VIEW: Dedicated semantic HTML5 pages
│   ├── login.html            # Login page view (/login)
│   ├── register.html         # Registration page view (/register)
│   └── dashboard.html        # Dashboard repository view (/dashboard)
├── controllers/              # [C] CONTROLLER: Request handling & business logic
│   ├── authController.js     # User registration & login logic
│   ├── fileController.js     # Upload, list, update/replace, download & delete file logic
│   └── viewController.js     # Serves dedicated page views (renderLogin, renderRegister, renderDashboard)
├── routes/                   # HTTP routing mapping endpoints to controllers
│   ├── authRoutes.js         # /api/auth routes
│   ├── fileRoutes.js         # /api/files routes
│   └── viewRoutes.js         # Page view routes (/, /login, /register, /dashboard)
├── middleware/               # Express middleware
│   └── authMiddleware.js     # JWT Bearer token authentication guard
├── public/                   # Client-side static assets (served by Express)
│   ├── css/                  # Dedicated page stylesheets
│   │   ├── login.css         # Login page styling
│   │   ├── register.css      # Register page styling
│   │   └── dashboard.css     # Dashboard & table styling
│   └── js/                   # Dedicated page scripts (direct fetch calls, no api.js)
│       ├── login.js          # Login form logic & session initiation
│       ├── register.js       # Register form logic & validation
│       └── dashboard.js      # Dashboard controller (upload, update, delete, stream download)
├── uploads/                  # Secure disk storage for uploaded files (UUID naming)
├── data/                     # SQLite database storage (app.db)
├── .env                      # Environment configuration
├── .env.example              # Environment template for setup
├── .gitignore                # Git exclusions
├── package.json              # Application dependencies & scripts
├── server.js                 # Express application entry point
└── README.md
```

---

## Page Routes

| Route | View File | CSS File | JS File | Purpose |
|---|---|---|---|---|
| `GET /` | — | — | — | Automatically redirects to `/login` |
| `GET /login` | `views/login.html` | `public/css/login.css` | `public/js/login.js` | User login form |
| `GET /register` | `views/register.html` | `public/css/register.css` | `public/js/register.js` | User registration form |
| `GET /dashboard` | `views/dashboard.html` | `public/css/dashboard.css` | `public/js/dashboard.js` | Authenticated file management dashboard |

---

## Technology Stack

- **Runtime & Server:** Node.js (v22+), Express 5
- **Database:** SQLite via `better-sqlite3` (WAL mode enabled)
- **Security & Auth:** `bcryptjs` (password hashing), `jsonwebtoken` (JWT tokens)
- **File Uploads:** `multer` (disk storage with UUID renaming & extension whitelisting)
- **Frontend:** Pure HTML5, CSS3, Vanilla JavaScript (No React, Vite, or external JS libraries)

---

## Installation & Setup

### 1. Prerequisites
- Node.js 22 or newer.

### 2. Configure Environment
Verify or create a `.env` file in the project root:
```env
PORT=5000
DB_PATH=./data/app.db
JWT_SECRET=your_super_secret_random_key_here
JWT_EXPIRES_IN=1d
MAX_FILE_SIZE_MB=5
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Application
```bash
# Start server
npm start

# Or in development mode with automatic reload:
npm run dev
```

Open your browser at: **`http://localhost:5000`** (automatically redirects to `http://localhost:5000/login`).

---

## Key Features

1. **Dedicated Multi-Page Views:** Each screen (`/login`, `/register`, `/dashboard`) has its own independent HTML, CSS, and JS file.
2. **Direct `fetch()` Calls:** No intermediary API layer or wrapper functions. Every page script directly dispatches native browser `fetch()` calls.
3. **Custom File Display Names:** Users can assign a custom display name when uploading a file (e.g., *"Q4 Balance Sheet"*), displayed prominently on the UI.
4. **File Update & Replacement:** An **"✏ Update"** button on each row allows users to:
   - **Replace the file** if the wrong file was originally uploaded (the old physical file is cleanly deleted from disk).
   - **Edit/Rename the display name** on the UI.
5. **Strict Ownership Isolation:** All queries for files enforce `WHERE uploaded_by = ?`. Users cannot view, update, download, or delete other users' files.
6. **Secure File Uploads:**
   - Whitelist allowed file types (PNG, JPEG, GIF, WebP, PDF, TXT, CSV, DOCX, XLSX).
   - Server-side extension enforcement (never trusts client-supplied extensions).
   - Saved under randomized UUIDs to prevent directory traversal and file collisions.
7. **Authenticated Streaming Downloads:** Downloads utilize the verified JWT Bearer token and browser Blob streaming.
8. **Session Management:**
   - Tokens stored in `localStorage`.
   - Automatic redirect from `/dashboard` to `/login` if token is absent or expired (HTTP 401).
9. **Drag-and-Drop Interface:** Interactive dropzone with file preview, size formatting, and upload progress indicator.
10. **Deletion Confirmation:** Built-in HTML5 modal confirmation dialog before irreversible deletions.

---

## API Reference

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/` | No | Redirects to `/login` |
| `GET` | `/login` | No | Serves Login page view |
| `GET` | `/register` | No | Serves Register page view |
| `GET` | `/dashboard` | No | Serves Dashboard page view |
| `GET` | `/api/health` | No | Health check status endpoint |
| `POST` | `/api/auth/register` | No | Creates a user account (`username`, `password`) |
| `POST` | `/api/auth/login` | No | Authenticates user and returns JWT token |
| `GET` | `/api/files` | Yes (`Bearer <token>`) | Lists all files belonging to authenticated user |
| `POST` | `/api/files` | Yes (`Bearer <token>`) | Uploads a file (multipart/form-data: `file`, optional `display_name`) |
| `PUT` | `/api/files/:id` | Yes (`Bearer <token>`) | Updates file (optional replacement `file`, optional `display_name`) |
| `GET` | `/api/files/:id/download` | Yes (`Bearer <token>`) | Streams the requested file for download |
| `DELETE` | `/api/files/:id` | Yes (`Bearer <token>`) | Deletes database record and physical disk file |
