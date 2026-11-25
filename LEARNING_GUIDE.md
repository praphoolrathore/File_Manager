# 📚 Node.js Beginner-to-Pro Learning Guide
### For the File Manager Project — From Noob to Professional

> **Who this is for:** You just started Node.js today. This guide takes you from zero to confident professional, step by step. Every concept is explained simply first, then in depth, then shown with real code from *your own project*.

---

## 📋 Recommended 7-Step (+ Bonus) Learning Path

```
Step 1: Node.js Internals & Event Loop
   ↓
Step 2: Express.js & Middleware Pipeline
   ↓
Step 3: MVC Architecture
   ↓
Step 4: JWT Authentication & Password Hashing (bcrypt)
   ↓
Step 5: File Uploads with Multer (multipart/form-data)
   ↓
Step 6: SQLite & Prepared Statements (better-sqlite3)
   ↓
Step 7: Testing REST APIs with Jest & Supertest
   ↓
Step 8 (Bonus): AWS S3 & LocalStack
```

---

## 🗂️ Project File Map (For Reference)

```
File_Manager/
├── server.js                        ← Entry point, middleware chain, error handler
├── config/
│   └── db.js                        ← Opens SQLite, sets pragmas, creates tables
├── models/
│   ├── user.js                      ← DB queries for users (prepared statements)
│   └── file.js                      ← DB queries for files (prepared statements)
├── controllers/
│   ├── authController.js            ← register/login business logic
│   └── fileController.js            ← upload/list/download/update/delete logic
├── routes/
│   ├── authRoutes.js                ← Maps /api/auth/* URLs to auth controllers
│   ├── fileRoutes.js                ← Maps /api/files/* URLs to file controllers
│   └── viewRoutes.js                ← Serves HTML pages
├── middleware/
│   └── authMiddleware.js            ← JWT verification for protected routes
├── views/
│   ├── login.html                   ← Login/Register page
│   └── dashboard.html               ← File manager page
├── public/                          ← Static CSS, JS, images
├── uploads/                         ← Where uploaded files are saved on disk
├── tests/
│   └── auth.test.js                 ← 19 Jest + Supertest integration tests
├── data/
│   └── app.db                       ← SQLite database file
└── package.json                     ← All dependencies and scripts
```

---

# Step 1: Node.js Internals & Event Loop

> **Why your mentor asks this:** She wants to know if you understand *why* Node.js is special — why it can handle thousands of requests without freezing, even though it has only one JavaScript thread.

## 🔍 Exact YouTube Searches
- `"Node.js Event Loop explained"`
- `"What the heck is the event loop anyway Philip Roberts"` ← **The gold standard 25-min talk**
- `"Node.js Architecture V8 Libuv Piyush Garg"` or `"Chai aur code Node.js internals"`

---

## 🟢 Beginner Level — What Is Node.js?

**Simple Analogy:** Imagine a restaurant with one super-fast waiter (Node.js). Instead of waiting at a table until food is cooked, this waiter takes your order and immediately goes to serve another table. When the kitchen is done, the waiter comes back to deliver your food. The waiter never stands idle.

**Traditional web servers (PHP, Java before async):** One waiter per customer. If you have 1000 customers, you need 1000 waiters (threads). That's expensive.

**Node.js:** One waiter, never blocks, delegates kitchen work (disk, network, database) to helpers in the background, and handles results when ready.

### What is Node.js exactly?
- Node.js is a **runtime environment** that lets you run JavaScript *outside* the browser.
- Before Node.js (2009), JavaScript only ran inside browsers (Chrome, Firefox).
- Ryan Dahl built Node.js by combining two things:
  1. **V8 Engine** — Google Chrome's JavaScript engine. Turns JS into fast machine code.
  2. **Libuv** — A C library that handles all the "slow" stuff like file reading, network requests, and timers using background threads.

```
Your JavaScript Code
        ↓
   V8 Engine (executes JS)
        ↓
   Libuv (handles I/O, timers, file system)
        ↓
   Operating System (actual disk, network)
```

---

## 🔵 Intermediate Level — The Event Loop

This is the most important concept in Node.js. Everything else depends on understanding this.

### The Call Stack
When JavaScript calls a function, it is pushed onto the **Call Stack**. When the function returns, it is popped off.

```javascript
function greet() {
  console.log('Hello');   // 2. popped after printing
}
greet();                   // 1. pushed onto call stack
```

The Call Stack can only hold one thing at a time. **This is why Node.js is "single-threaded"** — there is only one Call Stack.

### The Problem: What If a Function Is Slow?
```javascript
// BAD: This would freeze everything for 5 seconds
const data = fs.readFileSync('bigfile.txt');  // blocks the call stack
console.log(data);
```

If the Call Stack is blocked, **no other code can run** — no other requests can be served.

### The Solution: Asynchronous + Callback
```javascript
// GOOD: This does NOT block
fs.readFile('bigfile.txt', (err, data) => {
  console.log(data);  // runs LATER, when file is ready
});
console.log('This runs immediately, without waiting!');
```

Here's what actually happens:
1. `fs.readFile()` is called → pushed to Call Stack → immediately handed off to **Libuv** (background)
2. Popped off Call Stack. Node.js continues executing other code.
3. When file reading is done, Libuv puts the callback in a **queue**.
4. The **Event Loop** picks the callback from the queue and pushes it onto the Call Stack.
5. The callback runs and `console.log(data)` executes.

### The Event Loop — 6 Phases (In Order)
The Event Loop continuously checks if the Call Stack is empty, then processes queues:

```
   ┌─────────────────────────┐
   │         timers          │  ← setTimeout, setInterval callbacks
   └─────────────┬───────────┘
                 │
   ┌─────────────▼───────────┐
   │     pending callbacks   │  ← I/O error callbacks from last iteration
   └─────────────┬───────────┘
                 │
   ┌─────────────▼───────────┐
   │      idle, prepare      │  ← Internal use by Node.js only
   └─────────────┬───────────┘
                 │
   ┌─────────────▼───────────┐
   │          poll           │  ← NEW I/O events (file read, network) ← MOST IMPORTANT
   └─────────────┬───────────┘
                 │
   ┌─────────────▼───────────┐
   │          check          │  ← setImmediate callbacks
   └─────────────┬───────────┘
                 │
   ┌─────────────▼───────────┐
   │      close callbacks    │  ← socket.on('close'), stream ended
   └─────────────┘
```

**Poll Phase** is where most of your app's work happens: completed file reads, incoming HTTP requests, database responses.

### Microtasks vs Macrotasks (Critical Interview Question!)

**Microtasks run BEFORE the next event loop phase** — they have priority.

| Priority | Queue | Example |
|---|---|---|
| 1st (highest) | `process.nextTick` queue | `process.nextTick(cb)` |
| 2nd | Microtask queue | `Promise.then(cb)`, `async/await` |
| 3rd | Timers | `setTimeout(cb, 0)` |
| 4th | Check | `setImmediate(cb)` |

```javascript
console.log('1. Start');

setTimeout(() => console.log('4. setTimeout'), 0);

Promise.resolve().then(() => console.log('3. Promise.then'));

process.nextTick(() => console.log('2. process.nextTick'));

console.log('5. End... wait no:');
// Output order: 1, 5, 2, 3, 4
// (Actually: "1. Start", "5. End...", "2. process.nextTick", "3. Promise.then", "4. setTimeout")
```

---

## 🔴 Advanced Level — Libuv Thread Pool

> **Key insight:** Node.js is single-threaded for JavaScript, but NOT for I/O.

Libuv maintains a **thread pool** of 4 worker threads (by default) for tasks that cannot be done asynchronously by the OS:
- File system operations (`fs.readFile`, `fs.writeFile`, `fs.unlink`)
- DNS lookups (`dns.lookup`)
- **bcrypt hashing** (CPU intensive)
- Crypto operations (`crypto.randomBytes`)

```
JavaScript (1 thread)         Libuv Thread Pool (4 threads)
─────────────────────         ──────────────────────────────
Your app code runs here   →   Thread 1: Reading file.txt
                          →   Thread 2: bcrypt.hash() computing
                          →   Thread 3: DNS lookup for db host
                          →   Thread 4: Available
```

You can increase thread pool size: `UV_THREADPOOL_SIZE=8 node server.js`

---

## 🟣 Pro Level — How This Project Uses These Concepts

### bcrypt uses the thread pool (authController.js)
```javascript
// controllers/authController.js
const SALT_ROUNDS = 10;
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
```
`bcrypt.hash()` is CPU-intensive — it deliberately does thousands of rounds of computation (that's what makes it secure). It runs in Libuv's thread pool so it **does not block** your server from handling other requests while hashing.

### File deletion is non-blocking (fileController.js)
```javascript
// controllers/fileController.js
await fs.promises.unlink(absolutePath);  // non-blocking file delete
```
`fs.promises.unlink()` sends the file deletion request to the OS via Libuv. Your JavaScript thread is free while the OS does the actual disk work.

### `require.main === module` guard (server.js)
```javascript
// server.js (last 4 lines)
if (require.main === module) {
  app.listen(PORT, () => console.log(`Application running on http://localhost:${PORT}`));
}
module.exports = app;
```
**What this does:** When you run `node server.js`, `require.main === module` is `true`, so the server starts listening on port 5000. When Jest imports `server.js` via `require('../server')`, `require.main` is Jest's module, NOT `server.js`, so `require.main === module` is `false` and the port never opens. **This is what prevents Jest tests from freezing.**

### Key Concepts Summary (What to Tell Your Mentor)
| Concept | Explanation |
|---|---|
| Single-threaded JS | Only one call stack. One function runs at a time. |
| Non-blocking I/O | Slow operations (file, network) are handed to Libuv. JS continues running. |
| Event Loop | The loop that picks up completed I/O callbacks and runs them. |
| Thread Pool | 4 background threads in Libuv for crypto, file system ops. |
| Microtask priority | `process.nextTick` > `Promise.then` > `setTimeout` > `setImmediate` |

---

# Step 2: Express.js & Middleware Pipeline

> **Why your mentor asks this:** She wants to know the journey of a request from browser to response. Middleware is the core of how Express works.

## 🔍 Exact YouTube Searches
- `"Express.js middleware explained Dave Gray"` or `"Web Dev Simplified Express middleware"`
- `"Express request response lifecycle"`

---

## 🟢 Beginner Level — What Is Express?

Node.js has a built-in `http` module to create servers:
```javascript
// Raw Node.js (without Express)
const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/api/users' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ users: [] }));
  }
  // You have to handle EVERY route manually. No built-in parsing, no routing.
});
server.listen(5000);
```

**Express is a framework on top of Node's `http` module** that gives you:
- Clean routing (`app.get('/users', handler)`)
- Middleware system (functions that run before your route handler)
- Request body parsing (`express.json()`)
- Static file serving (`express.static()`)
- Error handling

```javascript
// Same thing with Express:
const express = require('express');
const app = express();
app.use(express.json());
app.get('/api/users', (req, res) => {
  res.json({ users: [] });  // Express adds .json(), .status(), .send()
});
app.listen(5000);
```

---

## 🔵 Intermediate Level — What Is Middleware?

**Simple Analogy:** An airport security checkpoint. Before you reach the gate (route handler), you pass through multiple checkpoints (middleware): ticket check, ID check, luggage scan. If any checkpoint fails, you're turned back. If all pass, you reach the gate.

Middleware is a function with three parameters:
```javascript
function myMiddleware(req, res, next) {
  // Do something with req or res
  // Then call next() to pass control to the next middleware
  // OR send a response to end the chain
  next();
}
```

The three parameters:
- `req` — The incoming request (URL, headers, body, params, query string)
- `res` — The response you will send back
- `next` — A function you call to pass control to the next middleware. **If you don't call `next()` and don't send a response, the request hangs forever.**

### The Middleware Chain in This Project

When a request hits `POST /api/files`, here is the EXACT chain in `server.js`:

```
Browser sends: POST /api/files
                    ↓
① express.static()          ← Checks if URL matches a static file. No match, calls next().
                    ↓
② express.json()            ← Parses JSON body. For multipart (file upload), skips. Calls next().
                    ↓
③ viewRoutes                ← Checks if URL is /, /dashboard. No match. Calls next().
                    ↓
④ authRoutes (/api/auth)    ← Checks if URL starts with /api/auth. No match. Calls next().
                    ↓
⑤ fileRoutes (/api/files)   ← URL MATCHES! Enters file router.
                    ↓
   ⑤a authMiddleware        ← Checks JWT token. If invalid → 401 response (STOPS HERE).
                    ↓
   ⑤b upload.single('file') ← Multer parses multipart body, saves file to disk.
                    ↓
   ⑤c uploadFile controller ← Business logic. Saves metadata to DB. Sends 201 response.
                    ↓
⑥ 404 handler              ← Only reached if NO route above sent a response.
                    ↓
⑦ Error handler            ← Only reached if something threw an error.
```

---

## 🔴 Advanced Level — 4-Argument Error Handler

This is a critical concept. Express identifies error-handling middleware by the number of arguments:

```javascript
// server.js — The Central Error Handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {           // ← MUST have exactly 4 parameters
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    return res
      .status(tooLarge ? 413 : 400)
      .json({ message: tooLarge ? 'File is too large' : `Upload error: ${err.message}` });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? 'Server error' : err.message });
});
```

**Why 4 parameters?** Express looks at the function's `.length` property. If it has exactly 4 parameters starting with `err`, Express knows it is an error handler and only calls it when an error occurs. If you write 3 parameters by mistake, Express treats it as a normal middleware and it never catches errors.

### How errors reach this handler:

**Express 4 (old way):** You had to manually call `next(err)` or use try/catch.
```javascript
// Express 4 — verbose
const uploadFile = async (req, res, next) => {
  try {
    const result = await someDbOperation();
    res.json(result);
  } catch (err) {
    next(err);  // manually forward to error handler
  }
};
```

**Express 5 (what this project uses):** Async errors are automatically forwarded.
```javascript
// Express 5 — clean (what this project uses)
const uploadFile = async (req, res) => {
  const result = await someDbOperation();  // if this throws, Express 5 auto-catches it
  res.json(result);
  // No try/catch needed!
};
```

This project uses Express 5.3.0, so all async errors automatically reach the central error handler.

### Creating Custom Errors with Status Codes
```javascript
// In controllers/fileController.js (pattern used throughout)
const id = parseId(req.params.id);
const file = id && File.findByIdAndUser(id, req.user.id);
if (!file) return res.status(404).json({ message: 'File not found' });
```

For errors that need to reach the central handler:
```javascript
// In routes/fileRoutes.js — Multer fileFilter
const err = new Error('File type not allowed');
err.status = 400;  // set a status property
return cb(err);    // Express picks up err.status in the central error handler
```

---

## 🟣 Pro Level — Rate Limiting Middleware

```javascript
// routes/authRoutes.js
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
router.post('/login', authLimiter, login);
```

The login route has an **extra middleware** between the route definition and the handler: `authLimiter`. This middleware:
- Counts how many times an IP address has hit `/api/auth/login` in the last 15 minutes.
- If count > 10, it automatically returns HTTP 429 (Too Many Requests) **without even calling the `login` handler**.
- Protects against brute-force password attacks.

### Key Concepts Summary
| Concept | Detail |
|---|---|
| `(req, res, next)` | Standard middleware signature. Must call `next()` or send response. |
| `next()` | Passes control to the next middleware in the chain. |
| `next(err)` | Passes an error to the error handler (skips normal middleware). |
| 4-argument handler | `(err, req, res, next)` — Express error handler. Never call it, Express calls it. |
| `app.use()` | Registers middleware for ALL methods. |
| `app.get/post/put/delete()` | Registers middleware for specific HTTP method. |
| Express 5 | Async errors auto-forwarded — no try/catch boilerplate. |

---

# Step 3: MVC Architecture

> **Why your mentor asks this:** She explicitly asked about "structure of the project — MVC structure". This is about professional code organisation.

## 🔍 Exact YouTube Searches
- `"MVC Architecture in Node.js Express Traversy Media"`
- `"MVC pattern in Node js Chai aur Code"`

---

## 🟢 Beginner Level — What Is MVC?

**MVC stands for Model-View-Controller.**

**Simple Analogy:** Think of a restaurant again:
- **Model** = The kitchen. It knows how to make food (data operations). It doesn't care who ordered or how the food looks on the plate.
- **View** = The table presentation. The plate, garnish, how it looks to the customer. Doesn't know how food was made.
- **Controller** = The waiter. Takes order from customer (HTTP request), tells kitchen what to make (Model), and brings the food to the table (View/Response).

**Without MVC (Spaghetti Code):**
```javascript
// Everything in one file — impossible to maintain
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }
  // ... database query directly here
  // ... bcrypt comparison here
  // ... token generation here
  // ... response sending here
  // 200 lines in one route handler!
});
```

**With MVC (Clean Code):**
Each concern has its own file. The route handler (`controller`) is 5 lines. The DB query (`model`) is in another file. The HTML (`view`) is in its own folder.

---

## 🔵 Intermediate Level — MVC in This Project

### Model Layer — `models/`

Models ONLY do database operations. They receive data, talk to the database, and return results. **No HTTP concepts here** — no `req`, no `res`.

```javascript
// models/user.js — Only database queries
const User = {
  create(username, passwordHash) {
    const result = insertUser.run(username, passwordHash);  // DB insert
    return selectById.get(result.lastInsertRowid);           // DB select
  },
  findByUsername(username) {
    return selectByUsername.get(username);  // DB select
  },
  findById(id) {
    return selectById.get(id);             // DB select
  },
};
```

```javascript
// models/file.js — Only file database queries
const File = {
  create(data) { ... },              // INSERT
  findByUser(userId) { ... },        // SELECT WHERE uploaded_by = userId
  findByIdAndUser(id, userId) { ... }, // SELECT WHERE id = ? AND uploaded_by = ?
  updateByIdAndUser(...) { ... },    // UPDATE with COALESCE
  deleteByIdAndUser(id, userId) { ... }, // DELETE WHERE id = ? AND uploaded_by = ?
};
```

### View Layer — `views/`

Views are what the user sees in the browser. In this project, views are plain HTML files:
- `views/login.html` — The login/register page
- `views/dashboard.html` — The file manager dashboard

The HTML files use vanilla JavaScript (fetch API) to call the backend REST API. This is a **SPA-style** approach (Single Page Application).

### Controller Layer — `controllers/`

Controllers contain business logic. They receive `req` from the route, call Model methods, and send back `res`.

```javascript
// controllers/authController.js — register business logic
const register = async (req, res) => {
  // 1. Extract data from request
  const { username, password } = req.body || {};

  // 2. Validate input (business rule)
  const error = validateCredentials(username, password);
  if (error) return res.status(400).json({ message: error });

  // 3. Check if user exists (calls MODEL)
  if (User.findByUsername(cleanUsername)) {
    return res.status(409).json({ message: 'Username already taken' });
  }

  // 4. Hash password (business logic, not DB-specific)
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 5. Create user (calls MODEL)
  const user = User.create(cleanUsername, passwordHash);

  // 6. Send response (back to VIEW / client)
  res.status(201).json({ token: generateToken(user.id), user: { id: user.id, username: user.username } });
};
```

### Route Layer — `routes/`

Routes map URLs to controller functions. **No logic here** — just the mapping.

```javascript
// routes/authRoutes.js — Just URL-to-controller mapping
router.post('/register', register);
router.post('/login', authLimiter, login);
```

```javascript
// routes/fileRoutes.js — Auth middleware + Multer + controller mapping
router.use(authMiddleware);                              // all routes protected
router.post('/', upload.single('file'), uploadFile);     // POST /api/files
router.get('/', listFiles);                              // GET /api/files
router.get('/:id/download', downloadFile);               // GET /api/files/5/download
router.put('/:id', upload.single('file'), updateFile);   // PUT /api/files/5
router.delete('/:id', deleteFile);                       // DELETE /api/files/5
```

---

## 🔴 Advanced Level — Why MVC Matters

### Single Responsibility Principle
Each file does exactly one thing:
- `models/user.js` → User database operations ONLY
- `controllers/authController.js` → Auth business logic ONLY
- `routes/authRoutes.js` → URL mapping ONLY

### How They Connect
```
HTTP Request: POST /api/auth/register
       ↓
routes/authRoutes.js    (finds the handler: register)
       ↓
controllers/authController.js  (register function: validates, hashes, calls Model)
       ↓
models/user.js          (User.create: SQL INSERT)
       ↓
config/db.js            (better-sqlite3 connection)
       ↓
data/app.db             (the actual SQLite file on disk)
       ↓ (back up the chain)
controllers/authController.js  (builds response: { token, user })
       ↓
HTTP Response: 201 { token: "...", user: { id: 1, username: "john" } }
```

---

## 🟣 Pro Level — `toPublic()` — Never Leak Internal Data

```javascript
// controllers/fileController.js
const toPublic = (file) => ({
  id: file.id,
  original_name: file.original_name,
  display_name: file.display_name || file.original_name,
  mime_type: file.mime_type,
  size: file.size,
  uploaded_at: toIso(file.uploaded_at),
  // ← Notice: `path`, `stored_name` are DELIBERATELY omitted
  // If the client knew stored_name, they could try path traversal attacks
});
```

The database row has fields like `path: "uploads/550e8400-e29b-41d4-a716-446655440000.jpg"` and `stored_name`. These are **internal server details**. The `toPublic()` function acts as a filter — the client only gets what they need.

Similarly in `models/user.js`:
```javascript
// selectById deliberately does NOT include password_hash
const selectById = db.prepare(
  'SELECT id, username, created_at FROM users WHERE id = ?'  // no password_hash!
);
```

### Key Concepts Summary
| Layer | File(s) | Responsibility | Has req/res? |
|---|---|---|---|
| Model | `models/*.js` | DB queries only | ❌ No |
| View | `views/*.html` | UI shown to user | ❌ No (HTML) |
| Controller | `controllers/*.js` | Business logic | ✅ Yes |
| Route | `routes/*.js` | URL → Controller mapping | Passes them |

---

# Step 4: JWT Authentication & Password Hashing (bcrypt)

> **Why your mentor asks this:** Authentication is the most security-sensitive part. She wants to know if you understand how tokens work, why passwords are hashed, and what security risks exist.

## 🔍 Exact YouTube Searches
- `"JWT Authentication Node.js Web Dev Simplified"`
- `"How JWT works ByteByteGo"`
- `"Password Hashing with bcrypt Node.js"`

---

## 🟢 Beginner Level — Why Authentication?

**Without authentication:** Anyone who knows the URL can call `GET /api/files` and see everyone's files, or `DELETE /api/files/5` and delete anyone's file.

**With authentication:** Every API request must carry proof of identity. That proof is a **JWT token**.

### Traditional Session vs JWT

| | Sessions (old way) | JWT (this project) |
|---|---|---|
| Storage | Server stores session in memory/DB | Server stores NOTHING |
| Token | A session ID cookie | A signed JSON token |
| Scaling | Hard (need shared session store) | Easy (each server can verify independently) |
| Revocation | Easy (delete session from DB) | Hard (token valid until expiry) |

---

## 🔵 Intermediate Level — What Is a JWT?

JWT (JSON Web Token) has three parts, separated by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9   .   eyJpZCI6MSwidXNlcm5hbWUiOiJqb2huIn0   .   SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
        ↑ Header (base64)                           ↑ Payload (base64)                        ↑ Signature (HMAC-SHA256)
```

**Header** — Algorithm used:
```json
{ "alg": "HS256", "typ": "JWT" }
```

**Payload** — The data stored in the token:
```json
{ "id": 1, "iat": 1700000000, "exp": 1700086400 }
```
- `iat` = "issued at" (Unix timestamp)
- `exp` = "expires at" (Unix timestamp, 1 day later in this project)

**Signature** — What makes the token tamper-proof:
```
HMAC-SHA256(base64(header) + "." + base64(payload), JWT_SECRET)
```
The server signs the token with a secret key stored in `.env`. If anyone changes the payload (e.g., changes `id: 1` to `id: 999`), the signature no longer matches and the token is rejected.

---

## 🔴 Advanced Level — JWT in This Project

### Signing a Token (authController.js)
```javascript
// controllers/authController.js
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
```

Notice: The payload only contains `{ id: userId }`. NOT username, NOT email, NOT role. **Minimum necessary data** — the less in the token, the smaller the attack surface.

### Verifying a Token (authMiddleware.js)
```javascript
// middleware/authMiddleware.js
const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  // Must be: Authorization: Bearer <token>
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = header.slice(7).trim();  // Remove "Bearer " prefix (7 characters)

  try {
    // algorithms: ['HS256'] — ALGORITHM PINNING — prevents "alg: none" attack
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    // The user id comes from the TOKEN, never from req.body or URL params
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Token expired, please log in again'
      : 'Invalid token';
    return res.status(401).json({ message });
  }
};
```

**Why `req.user = { id: decoded.id }` matters:** The ID comes from the cryptographically signed token, not from the request body. A client cannot fake their user ID by sending `{ "userId": 999 }` in the body because the route handler uses `req.user.id` (from the token), not `req.body.userId`.

### Algorithm Pinning — What Is the "alg: none" Attack?
JWT has a known vulnerability: an attacker could craft a token with `{ "alg": "none" }` in the header and no signature. Some old JWT libraries would accept this! By explicitly specifying `{ algorithms: ['HS256'] }`, we reject any token that doesn't use HS256.

### Token Flow
```
1. User registers/logs in → Server calls generateToken(user.id)
2. Server responds with:  { token: "eyJ...", user: { id: 1, username: "john" } }
3. Browser stores token in localStorage: localStorage.setItem('token', token)

4. Browser makes API request:
   GET /api/files
   Authorization: Bearer eyJ...

5. authMiddleware verifies token → sets req.user = { id: 1 }
6. listFiles controller runs → File.findByUser(req.user.id) → returns only user 1's files
```

---

## 🟣 Pro Level — bcrypt Deep Dive

### Why Not MD5 or SHA256?
MD5 and SHA256 are **fast hashing algorithms** — a modern GPU can compute billions per second. This means an attacker with a leaked database can try billions of passwords per second (brute force).

bcrypt is **intentionally slow**. With `SALT_ROUNDS = 10`, it does 2^10 = 1024 iterations. This makes brute force impractical.

### How bcrypt Works
```javascript
// controllers/authController.js
const SALT_ROUNDS = 10;

// Registration:
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
// Output: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
//          ↑ version ↑ cost ↑ 22-char salt + 31-char hash

// Login:
const passwordOk = user ? await bcrypt.compare(password, user.password_hash) : false;
```

The hash includes the **salt** — a random string added before hashing. Even if two users have the same password, their hashes are different because of the unique salt.

### Timing-Safe Comparison (Anti-Timing Attack)
```javascript
// WRONG approach (vulnerable to timing attack):
if (user.password_hash === md5(password)) { ... }  // string comparison stops at first mismatch

// bcrypt.compare() is timing-safe:
const passwordOk = user ? await bcrypt.compare(password, user.password_hash) : false;
```

A timing attack works by measuring how long a comparison takes. If `===` returns false immediately when the first character differs, an attacker can figure out the correct hash character by character based on response time. `bcrypt.compare()` always takes the same amount of time regardless of where the mismatch occurs.

### User Enumeration Prevention
```javascript
// controllers/authController.js — login
const user = User.findByUsername(username.trim());
const passwordOk = user ? await bcrypt.compare(password, user.password_hash) : false;

// Same message for BOTH wrong username AND wrong password:
if (!passwordOk) {
  return res.status(401).json({ message: 'Invalid username or password' });
}
```

If the message was different for "user not found" vs "wrong password", attackers could scan for valid usernames. By returning the same message for both cases, we prevent **user enumeration**.

**The subtle trick:** Even when `user` is `undefined` (username doesn't exist), we still call `bcrypt.compare()` with `false` — but wait, actually we don't. The check is: `user ? bcrypt.compare(...) : false`. If no user, we skip bcrypt entirely but still check `if (!passwordOk)`. This avoids a **timing attack** where the login for a non-existent user returns faster than for an existing user (because bcrypt is skipped). Some implementations do `bcrypt.compare(password, FAKE_HASH)` to equalize timing.

### 72-Byte Limit
bcrypt has a maximum input of **72 bytes**. Any input longer than 72 bytes is silently truncated. This means passwords "AAAA...A" (73 chars) and "AAAA...A" (72 chars) + "B" would have the SAME hash! Our validation prevents this:
```javascript
if (password.length < 6 || password.length > 72) {
  return 'Password must be 6-72 characters';
}
```

### Key Concepts Summary
| Concept | Detail |
|---|---|
| JWT structure | `base64(header).base64(payload).HMAC-SHA256-signature` |
| `jwt.sign()` | Creates a token signed with the secret key |
| `jwt.verify()` | Checks signature + expiry. Throws on failure. |
| Algorithm pinning | `{ algorithms: ['HS256'] }` prevents "alg: none" attack |
| `req.user = { id }` | ID from token only. Client cannot fake it. |
| SALT_ROUNDS = 10 | 2^10 = 1024 bcrypt iterations. Intentionally slow. |
| `bcrypt.compare()` | Timing-safe comparison. Same time regardless of match. |
| Generic error message | "Invalid username or password" for both wrong user and wrong password |
| 72-byte limit | bcrypt max input. We validate `password.length <= 72`. |
| Token in localStorage | Vulnerable to XSS. `httpOnly` cookie would be safer (production). |

---

---

# Step 5: File Uploads with Multer (multipart/form-data)

> **Why your mentor asks this:** You were asked to build file uploads. Multer is the middleware that makes this possible. Understanding *how* it works under the hood is essential.

## 🔍 Exact YouTube Searches
- `"File upload using Multer in Node.js Express"`
- `"Multer crash course Web Dev Simplified"`

---

## 🟢 Beginner Level — Why Can't We Use `express.json()` for Files?

When you submit a login form with a username and password, the browser sends data as `application/json`:
```
POST /api/auth/login
Content-Type: application/json

{ "username": "john", "password": "secret123" }
```
`express.json()` can parse this easily.

But a **file is binary data** — it's not JSON text. It could be megabytes of image pixels. Files are sent in a completely different format called **multipart/form-data**:

```
POST /api/files
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="photo.jpg"
Content-Type: image/jpeg

<binary image data here: 0xFF 0xD8 0xFF 0xE0 ...>
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

**Multer** is the middleware that reads this multipart format and:
1. Saves the binary file data to disk (or memory)
2. Makes it available as `req.file` (single file) or `req.files` (multiple)
3. Makes text fields available in `req.body`

---

## 🔵 Intermediate Level — Multer Configuration in This Project

### diskStorage vs memoryStorage

```javascript
// routes/fileRoutes.js

// OPTION A: diskStorage (what this project uses)
// Saves file directly to disk. req.file.path is the saved file path.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    cb(null, crypto.randomUUID() + ALLOWED_TYPES[file.mimetype]);
    // e.g., "550e8400-e29b-41d4-a716-446655440000.jpg"
  },
});

// OPTION B: memoryStorage (used for S3/cloud uploads)
// Keeps file in RAM as a Buffer. req.file.buffer contains binary data.
// const storage = multer.memoryStorage();
```

**When to use each:**
| | diskStorage | memoryStorage |
|---|---|---|
| Use case | Local disk storage | Cloud (S3, GCS) |
| Memory usage | Low (streams to disk) | High (whole file in RAM) |
| `req.file` has | `.path` (disk path) | `.buffer` (binary data) |
| Risk | None | Out-of-memory if file is large |

### The Complete Multer Setup Explained Line by Line

```javascript
// routes/fileRoutes.js

const ALLOWED_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};
// Key: MIME type (from browser)
// Value: Extension WE choose (never from the user's filename)
```

```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // cb is a callback: cb(error, value)
  // cb(null, UPLOAD_DIR) means: no error, save to UPLOAD_DIR

  filename: (req, file, cb) => {
    cb(null, crypto.randomUUID() + ALLOWED_TYPES[file.mimetype]);
    // crypto.randomUUID() generates: "550e8400-e29b-41d4-a716-446655440000"
    // ALLOWED_TYPES[file.mimetype] is: ".jpg" (from our trusted map, not from user input!)
    // Result: "550e8400-e29b-41d4-a716-446655440000.jpg"
  },
});
```

```javascript
const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES[file.mimetype]) {
    const err = new Error('File type not allowed');
    err.status = 400;
    return cb(err);       // reject with error
  }
  cb(null, true);         // accept file
};
```

```javascript
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,  // 5 * 1024 * 1024 = 5,242,880 bytes = 5MB
    files: 1,                                  // only 1 file per request
  },
});
```

```javascript
// Routes:
router.post('/', upload.single('file'), uploadFile);
//                              ↑
//                     field name in the form
// The HTML form must have: <input type="file" name="file">
// The JavaScript fetch must use: formData.append('file', fileObject)
```

### What `req.file` Looks Like After Multer Processes It

```javascript
req.file = {
  fieldname: 'file',                                    // name attribute in the form
  originalname: 'my photo.jpg',                         // original filename from browser
  encoding: '7bit',
  mimetype: 'image/jpeg',                               // browser-reported type
  destination: 'C:\\...\\File_Manager\\uploads',
  filename: '550e8400-e29b-41d4-a716-446655440000.jpg', // what WE stored it as
  path: 'C:\\...\\uploads\\550e8400...jpg',             // full path on disk
  size: 204800,                                         // bytes
}
```

---

## 🔴 Advanced Level — Security Details

### Path Traversal Attack (Why We Use `crypto.randomUUID()`)

**What if we stored the file with the user's original filename?**
```javascript
// DANGEROUS — Never do this:
filename: (req, file, cb) => cb(null, file.originalname)
// User could name their file: "../../server.js"
// Result: they overwrite your server code!
```

By using `crypto.randomUUID()`, we:
1. Prevent overwrite collisions (every file gets a unique name)
2. Prevent path traversal (UUID contains no slashes or special characters)
3. Prevent information disclosure (stored name reveals nothing about the original)

### Why Extension Comes From ALLOWED_TYPES, Not User Input
```javascript
// DANGEROUS:
filename: (req, file, cb) => cb(null, uuid + path.extname(file.originalname))
// User uploads "malware.php.jpg" → stored as "uuid.jpg" ✓ (this is actually ok)
// But user uploads "file.php" and sets Content-Type: image/jpeg
// → stored as "uuid.jpeg" ✓ (also ok, but we might execute .php files)

// SAFE (what this project does):
filename: (req, file, cb) => cb(null, uuid + ALLOWED_TYPES[file.mimetype])
// Extension comes ONLY from our trusted ALLOWED_TYPES map
// Even if user sends mimetype: image/jpeg for a PHP file,
// the extension is .jpg (not executable)
```

### MIME Type Validation Limitation
```javascript
const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES[file.mimetype]) { ... }
};
```

**Important caveat:** `file.mimetype` comes from the HTTP request header sent by the browser — it is what the client *claims* the file type is. A sophisticated attacker could send `Content-Type: image/jpeg` for a file containing PHP code.

**More secure validation:** Check "magic bytes" — the first few bytes of the file that identify its true type:
```javascript
// Production-grade: use the 'file-type' package
import { fileTypeFromBuffer } from 'file-type';
const type = await fileTypeFromBuffer(req.file.buffer);
if (type.mime !== req.file.mimetype) {
  // Client lied about file type!
}
```

This project uses client-reported MIME type (acceptable for a learning project, note in production).

### Auth BEFORE Multer — Security Design Choice

```javascript
// routes/fileRoutes.js

// Authentication runs FIRST for every route below
// so an unauthenticated request is rejected BEFORE Multer writes anything to disk.
router.use(authMiddleware);  // ← runs first

router.post('/', upload.single('file'), uploadFile);  // ← Multer runs second
```

If Multer ran before authentication, an anonymous attacker could:
1. Send huge file uploads to fill your disk
2. Waste server resources processing files that will be rejected anyway

### The Orphan File Problem

When a file is saved to disk by Multer but the **database insert fails**, we have an orphan file — a file on disk with no database record. We clean it up:

```javascript
// controllers/fileController.js — uploadFile
let fileRecord;
try {
  fileRecord = File.create({
    original_name: rawOriginalName,
    display_name: rawDisplayName,
    stored_name: req.file.filename,
    mime_type: req.file.mimetype,
    size: req.file.size,
    path: path.posix.join('uploads', req.file.filename),
    uploaded_by: req.user.id,
  });
} catch (err) {
  // If the database insert failed: don't leave an orphan.
  await fs.promises.unlink(req.file.path).catch(() => { });
  throw err;
}
```

### Encoding Fix — UTF-8 Filenames
```javascript
// controllers/fileController.js
const fixFilenameEncoding = (name) => Buffer.from(name, 'latin1').toString('utf8');

const rawOriginalName = fixFilenameEncoding(req.file.originalname).slice(0, 255);
```

Browsers send filenames in UTF-8 (e.g., Hindi names, accented characters like "résumé.pdf"). Multer reads multipart headers as Latin-1 by default. This causes "résumé.pdf" to be stored as "rÃ©sumÃ©.pdf". The fix: re-interpret the Latin-1-decoded bytes as UTF-8.

### `resolveStoredPath()` — Path Traversal in Reverse

```javascript
// controllers/fileController.js
const resolveStoredPath = (storedPath) => {
  const absolute = path.resolve(ROOT_DIR, storedPath);
  return absolute.startsWith(UPLOAD_DIR + path.sep) ? absolute : null;
};
```

When downloading a file, we resolve the path stored in the database to an absolute path and **verify it is inside the uploads directory**. If a database entry somehow had `path: "../../etc/passwd"`, `resolveStoredPath()` would return `null` and the download would be refused.

### Key Concepts Summary
| Concept | Detail |
|---|---|
| `multipart/form-data` | HTTP encoding for files. NOT `application/json`. |
| `multer.diskStorage()` | Saves file to disk. `req.file.path` available. |
| `multer.memoryStorage()` | Keeps file in `req.file.buffer`. Use for cloud uploads. |
| `crypto.randomUUID()` | Unique, safe filename. Prevents path traversal & collisions. |
| `fileFilter` | Validates MIME type before saving. |
| `limits.fileSize` | Multer stops reading after 5MB. Throws `MulterError`. |
| Auth before Multer | Prevents anonymous uploads wasting disk space. |
| Orphan file cleanup | `fs.promises.unlink()` on DB failure. |
| MIME type validation | Client-side only. Magic bytes check is more secure (production). |
| `fixFilenameEncoding()` | Fixes UTF-8 filename garbling from Multer's Latin-1 parsing. |
| `resolveStoredPath()` | Verifies file path is inside uploads/. Prevents directory traversal. |

---

# Step 6: SQLite & Prepared Statements (better-sqlite3)

> **Why your mentor asks this:** She specified "better-sqlite3 or any db of choice". You need to explain what a database is, why prepared statements prevent SQL injection, and what WAL mode does.

## 🔍 Exact YouTube Searches
- `"SQL Injection explained and how to prevent it Computerphile"`
- `"Prepared statements SQL explanation"`
- `"SQLite WAL mode explained"`

---

## 🟢 Beginner Level — What Is a Database and Why SQLite?

A database is a structured place to store data permanently. When your server restarts, files on disk and database records survive.

**SQLite** is special:
- It's a database stored in a **single file** (`data/app.db`) — no separate database server needed
- Perfect for learning, small-to-medium apps
- Used in production by Android, iOS, browsers, Electron apps

**Other databases you might encounter:**
| Database | Type | Use case |
|---|---|---|
| SQLite | File-based SQL | Learning, small apps |
| PostgreSQL | Server-based SQL | Production web apps |
| MySQL | Server-based SQL | Production web apps |
| MongoDB | NoSQL (documents) | Flexible schema |

### Why `better-sqlite3`?
There are two Node.js SQLite packages:
- `sqlite3` — Asynchronous, callback-based
- `better-sqlite3` — **Synchronous**, simpler API

Since better-sqlite3 runs synchronously (blocking), it's perfectly fine for SQLite because:
1. SQLite is an embedded database — no network round trip
2. The operation is so fast it doesn't matter
3. The API is much simpler (no callbacks or Promises needed)

---

## 🔵 Intermediate Level — Database Setup in This Project

### Pragmas (Database Settings)

```javascript
// config/db.js
const db = new Database(dbPath);

// SQLite does NOT enforce foreign keys unless this is switched on for each connection.
db.pragma('foreign_keys = ON');

// WAL mode lets reads and writes happen at the same time without blocking each other.
db.pragma('journal_mode = WAL');
```

**What is a pragma?** A SQLite-specific command to configure the database's behaviour. It's not SQL — it's a SQLite setting.

### Table Schema Explained

```sql
-- config/db.js (inside db.exec())
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,  -- Auto-incrementing unique ID
  username      TEXT NOT NULL UNIQUE,                -- Must be unique, cannot be null
  password_hash TEXT NOT NULL,                       -- The bcrypt hash
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))  -- Auto-set to current UTC time
);

CREATE TABLE IF NOT EXISTS files (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT NOT NULL,                       -- What user named the file
  display_name  TEXT,                                -- Custom name user chose (nullable)
  stored_name   TEXT NOT NULL UNIQUE,                -- UUID filename on disk
  mime_type     TEXT NOT NULL,                       -- e.g., "image/jpeg"
  size          INTEGER NOT NULL,                    -- bytes
  path          TEXT NOT NULL,                       -- relative path: "uploads/uuid.jpg"
  uploaded_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- ↑ Foreign key: uploaded_by must be a valid user id
  -- ON DELETE CASCADE: if the user is deleted, all their files are deleted too
  uploaded_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
-- ↑ Speeds up queries: "SELECT * FROM files WHERE uploaded_by = ?"
-- Without index: SQLite scans ALL rows. With index: jumps directly to user's files.
```

---

## 🔴 Advanced Level — Prepared Statements & SQL Injection

### What Is SQL Injection?

**Without prepared statements (vulnerable):**
```javascript
// NEVER DO THIS
const username = req.body.username;  // user inputs: admin' OR '1'='1
const query = `SELECT * FROM users WHERE username = '${username}'`;
// Final SQL: SELECT * FROM users WHERE username = 'admin' OR '1'='1'
//            ↑ Always true! Returns ALL users. Authentication bypassed.
db.exec(query);
```

Another example — Dropping the database:
```
Input: '; DROP TABLE users; --
Final SQL: SELECT * FROM users WHERE username = ''; DROP TABLE users; --'
```
The semicolon ends the first statement, then drops the entire users table!

### How Prepared Statements Prevent This

```javascript
// models/user.js — SAFE
const selectByUsername = db.prepare(
  'SELECT id, username, password_hash, created_at FROM users WHERE username = ?'
  //                                                                           ↑
  //                                              This "?" is a placeholder, not raw string
);

// When you call:
selectByUsername.get(username);
// SQLite compiles the SQL ONCE, then fills in "?" as a literal value
// No matter what username contains, it's treated as a plain string, never as SQL code
// Input: "admin' OR '1'='1"  → treated as: WHERE username = "admin' OR '1'='1"
//                                                                    ↑ literal string, not SQL
```

### Named Parameters (Used in models/file.js)

```javascript
// models/file.js
const insertFile = db.prepare(`
  INSERT INTO files (original_name, display_name, stored_name, mime_type, size, path, uploaded_by)
  VALUES (@original_name, @display_name, @stored_name, @mime_type, @size, @path, @uploaded_by)
`);

// Usage:
insertFile.run({
  original_name: 'photo.jpg',
  display_name: 'My Photo',
  stored_name: 'uuid.jpg',
  mime_type: 'image/jpeg',
  size: 204800,
  path: 'uploads/uuid.jpg',
  uploaded_by: 1,
});
```

`@paramName` is like `?` but named. Easier to read with many parameters.

### COALESCE for Partial Updates

```sql
-- models/file.js — updateFileQuery
UPDATE files
SET original_name = COALESCE(@original_name, original_name),
    display_name  = COALESCE(@display_name, display_name),
    stored_name   = COALESCE(@stored_name, stored_name),
    ...
WHERE id = @id AND uploaded_by = @uploaded_by
```

`COALESCE(a, b)` returns `a` if `a` is not null, otherwise returns `b`.

This allows partial updates: if you pass `{ display_name: 'New Name', original_name: null }`, only `display_name` changes. The `original_name` stays the same because `COALESCE(null, original_name) = original_name`.

```javascript
// models/file.js — called with null for unchanged fields
updateFileQuery.run({
  id: 5,
  uploaded_by: 1,
  original_name: null,     // COALESCE(null, original_name) → keeps existing
  display_name: 'New Name',// COALESCE('New Name', display_name) → 'New Name' wins
  stored_name: null,
  mime_type: null,
  size: null,
  path: null,
});
```

### IDOR Prevention (Insecure Direct Object Reference)

```javascript
// models/file.js
const selectByIdAndUser = db.prepare(
  'SELECT * FROM files WHERE id = ? AND uploaded_by = ?'
  //                                   ↑ CRITICAL: always filter by user
);

// Called with:
File.findByIdAndUser(id, req.user.id);
```

What if we only used `WHERE id = ?`? User A could request `GET /api/files/5/download` to download user B's file (id=5). By including `AND uploaded_by = req.user.id`, the query returns `undefined` if the file belongs to someone else. The file "doesn't exist" for the requesting user.

This is called **IDOR prevention** — users can only access their own resources.

### WAL Mode — Write-Ahead Logging

```javascript
db.pragma('journal_mode = WAL');
```

**Default SQLite journal mode (DELETE mode):**
- When writing: SQLite locks the ENTIRE database file
- Readers must wait for the writer to finish
- Writers must wait for all readers to finish
- Under concurrent load: slowdowns and timeouts

**WAL Mode:**
- Writers write to a separate WAL file
- Readers read from the original database file
- **Readers never block writers, writers never block readers**
- Periodically (at a checkpoint), WAL changes are merged into the main database file

For a web server handling multiple concurrent requests, WAL mode is essential.

### Migration Guard — Adding Columns Safely

```javascript
// config/db.js
const fileColumns = db.prepare('PRAGMA table_info(files)').all();
if (!fileColumns.some((col) => col.name === 'display_name')) {
  db.exec('ALTER TABLE files ADD COLUMN display_name TEXT;');
}
```

The `display_name` column was added after the initial schema. If a user already has an `app.db` from an earlier version without this column, the `ALTER TABLE` adds it. `CREATE TABLE IF NOT EXISTS` only creates the full schema on a fresh database.

### Key Concepts Summary
| Concept | Detail |
|---|---|
| `better-sqlite3` | Synchronous SQLite. No async/await needed for DB calls. |
| `db.pragma()` | SQLite configuration commands (not SQL). |
| `foreign_keys = ON` | Enforces relationships. Prevents orphan records. |
| `journal_mode = WAL` | Concurrent reads and writes without blocking. |
| `db.prepare()` | Compiles SQL once. Reused many times. |
| `?` or `@param` | Placeholders for safe parameter substitution. |
| SQL injection | Attack using malicious input as SQL code. Prepared statements prevent it. |
| `COALESCE(a, b)` | Returns `a` if not null, else `b`. Used for partial updates. |
| IDOR | Accessing others' data via ID manipulation. Prevented by `AND uploaded_by = ?`. |
| `ON DELETE CASCADE` | Deleting a user automatically deletes their files. |
| `CREATE INDEX` | Speeds up `WHERE uploaded_by = ?` queries. |

---

# Step 7: Testing REST APIs with Jest & Supertest

> **Why your mentor asks this:** She explicitly asked to "Write test cases for at least one API using JEST". Tests prove your code works correctly and continues to work after changes.

## 🔍 Exact YouTube Searches
- `"Testing Express API with Jest and Supertest"`
- `"Jest crash course Traversy Media"`

---

## 🟢 Beginner Level — Why Write Tests?

**Without tests:** You change one piece of code and accidentally break something else. You only find out when a user complains.

**With tests:** Every time you change code, you run `npm test`. All 19 tests run in seconds. If anything breaks, a test fails immediately and tells you exactly what broke.

### Types of Testing
| Type | What it tests | Example |
|---|---|---|
| Unit test | A single function in isolation | Does `validateCredentials('ab', 'pass')` return an error? |
| Integration test | Multiple parts working together | Does `POST /api/auth/register` → save to DB → return a JWT? |
| End-to-end test | The whole app from browser to DB | Does clicking the register button create a user? |

This project uses **integration tests** — real HTTP requests against the real app with the real database.

---

## 🔵 Intermediate Level — Jest Fundamentals

### Core Functions

```javascript
// tests/auth.test.js

// describe() groups related tests
describe('Authentication & Security API Tests', () => {

  // test() (or it()) defines a single test case
  test('should register a new user successfully', async () => {

    // expect() makes assertions
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe(testUsername);
    expect(res.body.user).not.toHaveProperty('password_hash');
    //                   ↑ NOT check: password hash must NEVER reach the client
  });

  // beforeAll() runs ONCE before ALL tests in the describe block
  // (not shown in this describe, but it stores the token from login for later tests)

  // afterAll() runs ONCE AFTER ALL tests complete
  afterAll(() => {
    const { db } = require('../config/db');
    // Clean up: delete test users created during tests
    db.prepare("DELETE FROM users WHERE username LIKE 'user_%' OR username LIKE 'trimmed_%'").run();
  });
});
```

### Common `expect()` Matchers

```javascript
expect(value).toBe(201)                    // strict equality (===)
expect(value).toEqual({ id: 1 })           // deep equality (objects/arrays)
expect(value).toHaveProperty('token')      // object has this key
expect(value).not.toHaveProperty('hash')  // object does NOT have this key
expect(value).toMatch(/already taken/i)   // matches regex (case-insensitive)
expect(Array.isArray(value)).toBe(true)   // value is an array
expect(value).toBeNull()                  // value is null
expect(value).toBeDefined()               // value is not undefined
expect(fn).toThrow()                      // function throws an error
```

---

## 🔴 Advanced Level — Supertest + The Full Test Suite

### Why Supertest?

Supertest lets you make real HTTP requests to your Express app **without starting a live server** on a port. It directly talks to the Express app object.

```javascript
const request = require('supertest');
const app = require('../server');  // the Express app (no listen() called because of require.main guard)

// Making a POST request with Supertest:
const res = await request(app)
  .post('/api/auth/register')
  .send({ username: 'john', password: 'secret123' });  // JSON body

// Making a GET request with an Authorization header:
const res = await request(app)
  .get('/api/files')
  .set('Authorization', `Bearer ${authToken}`);  // set a header

// Checking the response:
console.log(res.statusCode);  // 200, 201, 400, 401, etc.
console.log(res.body);        // parsed JSON response body
```

### The 19 Tests — Explained

#### Group 1: Registration Tests (8 tests)

```javascript
describe('POST /api/auth/register', () => {
  const uniqueId = Date.now();
  const testUsername = `user_${uniqueId}`;  // e.g., "user_1700000000000"
  // Why unique? So tests don't fail because "user already exists" from a previous run.

  it('should register a new user successfully and return a valid JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: testUsername, password: 'Password123' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe(testUsername);
    expect(res.body.user).not.toHaveProperty('password_hash');
    // ↑ Critical: password hash must never reach the client
  });

  it('should reject registration if the username is already taken', async () => {
    // Register the SAME username again
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: testUsername, password: 'Password123' });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/already taken/i);
  });

  it('should reject registration when username or password fields are missing', ...);
  it('should reject registration if username is too short (< 3 characters)', ...);
  it('should reject registration if username is too long (> 30 characters)', ...);
  it('should reject registration if password is too short (< 6 characters)', ...);
  it('should reject registration if password exceeds bcrypt limit (> 72 characters)', ...);
  it('should sanitize and trim leading/trailing whitespace from username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: '   john   ', password: 'Password123' });  // spaces around name

    expect(res.statusCode).toBe(201);
    expect(res.body.user.username).toBe('john');  // spaces trimmed
  });
});
```

#### Group 2: Login Tests (4 tests)

```javascript
describe('POST /api/auth/login', () => {
  it('should log in successfully with valid credentials and return a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: testUsername, password: testPassword });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    authToken = res.body.token;  // save for JWT tests
  });

  it('should reject login with the wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: testUsername, password: 'WrongPassword!' });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/Invalid username or password/i);
  });

  it('should reject login for non-existent user with generic message (prevents user enumeration)', async () => {
    // Same error message as wrong password — no way to know which is which
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/Invalid username or password/i);
  });
});
```

#### Group 3: JWT Middleware Tests (7 tests)

```javascript
describe('JWT Verification & Protected Route Guard (GET /api/files)', () => {
  it('should block access with 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/api/files');  // no Authorization header
    expect(res.statusCode).toBe(401);
  });

  it('should block access with 401 when token scheme is not "Bearer "', async () => {
    const res = await request(app)
      .get('/api/files')
      .set('Authorization', 'Basic dXNlcjpwYXNz');  // Basic auth, not Bearer
    expect(res.statusCode).toBe(401);
  });

  it('should block access with 401 when Bearer token is empty', async () => {
    const res = await request(app)
      .get('/api/files')
      .set('Authorization', 'Bearer    ');  // spaces only
    expect(res.statusCode).toBe(401);
  });

  it('should block access with 401 when token is malformed', async () => {
    const res = await request(app)
      .get('/api/files')
      .set('Authorization', 'Bearer not-a-valid-jwt-token');
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/Invalid token/i);
  });

  it('should block access with 401 when token is forged with wrong secret key', async () => {
    const forgedToken = jwt.sign({ id: 9999 }, 'wrong_fake_secret_key', {
      expiresIn: '1h', algorithm: 'HS256',
    });
    const res = await request(app)
      .get('/api/files')
      .set('Authorization', `Bearer ${forgedToken}`);
    expect(res.statusCode).toBe(401);  // signature mismatch
  });

  it('should block access with 401 when token has expired', async () => {
    const expiredToken = jwt.sign({ id: 9999 }, process.env.JWT_SECRET, {
      expiresIn: '0s',  // expires immediately
      algorithm: 'HS256',
    });
    const res = await request(app)
      .get('/api/files')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/Token expired/i);
  });

  it('should allow access with 200 when valid JWT token is supplied', async () => {
    const res = await request(app)
      .get('/api/files')
      .set('Authorization', `Bearer ${authToken}`);  // token from successful login
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);  // returns array of files
  });
});
```

---

## 🟣 Pro Level — Test Configuration & Edge Cases

### Why `--runInBand`?

```json
// package.json
"scripts": {
  "test": "jest --runInBand --detectOpenHandles"
}
```

By default, Jest runs test **files** in parallel (multiple processes). But this project has only one database file (`data/app.db`). If two test files run simultaneously and both try to write to the SQLite file, you get locking errors.

`--runInBand` runs all test files **sequentially** in the same process, sharing the database connection safely.

### Why `--detectOpenHandles`?

When Jest finishes all tests, it checks if the Node.js process can exit cleanly. If something (like an open database connection or unclosed server) is keeping the process alive, `--detectOpenHandles` reports what it is.

Without the `require.main === module` guard, `app.listen(PORT, ...)` would open a network socket during tests. That socket keeps the process alive, and Jest hangs after tests complete. `--detectOpenHandles` tells you exactly what's holding it open.

### Why `afterAll` Cleanup?

```javascript
afterAll(() => {
  const { db } = require('../config/db');
  db.prepare("DELETE FROM users WHERE username LIKE 'user_%' OR username LIKE 'trimmed_%'").run();
});
```

Tests create real database records (real users). Without cleanup:
- Each test run accumulates more and more test users
- The database grows unnecessarily
- If a future test checks "how many users exist", it fails due to stale data

The `LIKE 'user_%'` pattern matches all usernames that start with "user_" — which is the pattern used by `const testUsername = \`user_${uniqueId}\`` in the tests.

### `Date.now()` for Unique Test Data

```javascript
const uniqueId = Date.now();
const testUsername = `user_${uniqueId}`;
// e.g., "user_1700000000000"
```

If you ran `'user_test'` as the username every time, the second test run would fail with "Username already taken" (because the first run created it and cleanup might not have run). Using `Date.now()` guarantees a different username every millisecond.

### Key Concepts Summary
| Concept | Detail |
|---|---|
| `describe()` | Groups related tests. Can be nested. |
| `test()` / `it()` | Defines one test case. Same function, different name. |
| `expect()` | Makes an assertion. Test fails if assertion is false. |
| `beforeAll()` | Runs once before all tests in a `describe`. Setup. |
| `afterAll()` | Runs once after all tests in a `describe`. Cleanup. |
| `request(app)` | Supertest: makes HTTP requests to Express app without starting a server. |
| `.send()` | Sets the request body. |
| `.set()` | Sets a request header. |
| `--runInBand` | Sequential test execution. Required for shared SQLite database. |
| `--detectOpenHandles` | Finds what's keeping the process alive after tests finish. |
| `require.main === module` | Prevents `app.listen()` from running during tests. |
| Integration test | Tests the full stack: HTTP → middleware → controller → model → DB → response. |

---

# Step 8 (Bonus): AWS S3 & LocalStack

> **Why your mentor asks this:** "Good to have: run AWS services locally and store the file in S3 directly". This shows real-world cloud skills.

## 🔍 Exact YouTube Searches
- `"What is AWS S3 in 5 minutes"`
- `"LocalStack tutorial for beginners Docker"`
- `"AWS S3 Pre-signed URLs explained"`

---

## 🟢 Beginner Level — What Is Amazon S3?

**S3 (Simple Storage Service)** is Amazon's cloud file storage. Instead of saving files to your server's hard disk, you save them to Amazon's servers.

**Why use S3 over local disk?**
| | Local Disk | Amazon S3 |
|---|---|---|
| Availability | Only on that server | Available from anywhere |
| Scalability | Limited by disk size | Unlimited |
| Redundancy | Single point of failure | Replicated across data centres |
| CDN integration | Manual setup | Built-in with CloudFront |
| Cost | Server cost | Pay per GB stored + per request |

### S3 Key Concepts

**Bucket** — Like a folder at the top level. You create a bucket in a specific AWS region.
```
Bucket: "my-file-manager"
Region: "us-east-1"
```

**Object** — A file stored in a bucket. Has a **key** (the file's path within the bucket).
```
Key: "uploads/user1/photo.jpg"
Value: <binary image data>
```

**Object URL:**
```
https://my-file-manager.s3.us-east-1.amazonaws.com/uploads/user1/photo.jpg
```

---

## 🔵 Intermediate Level — What Is LocalStack?

**Problem:** Developing against real AWS costs money, requires internet, and risks accidentally modifying production resources.

**LocalStack** is a Docker container that runs on your laptop and **simulates most AWS services** (S3, DynamoDB, Lambda, etc.) locally for FREE.

### Setting Up LocalStack

**Step 1: Install Docker Desktop** (if not installed)

**Step 2: Start LocalStack**
```bash
docker run -d -p 4566:4566 --name localstack localstack/localstack
```
- Port 4566 is LocalStack's default "edge" port for all AWS services
- `-d` runs it in the background (detached)

**Step 3: Create a bucket in LocalStack using AWS CLI**
```bash
# Install AWS CLI first (or use the LocalStack built-in awslocal)
aws --endpoint-url=http://localhost:4566 s3 mb s3://my-file-manager
# "mb" = make bucket
```

**Step 4: Install AWS SDK v3 in your Node.js project**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## 🔴 Advanced Level — S3 Integration Code

### Configure S3 Client

```javascript
// config/s3.js (new file you would create)
const { S3Client } = require('@aws-sdk/client-s3');

const isLocal = process.env.USE_LOCALSTACK === 'true';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  // When using LocalStack:
  endpoint: isLocal ? 'http://localhost:4566' : undefined,
  forcePathStyle: isLocal,  // Required for LocalStack: use path-style URLs
  credentials: isLocal
    ? { accessKeyId: 'test', secretAccessKey: 'test' }  // LocalStack accepts any credentials
    : undefined,  // Real AWS uses environment variables or IAM roles
});

module.exports = { s3 };
```

### Upload a File to S3

```javascript
// When using S3, change Multer to memoryStorage (not diskStorage)
// So req.file.buffer contains the binary data

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3 } = require('../config/s3');

const uploadToS3 = async (file, userId) => {
  const key = `uploads/${userId}/${crypto.randomUUID()}${ALLOWED_TYPES[file.mimetype]}`;
  // e.g., "uploads/1/550e8400-e29b-41d4-a716-446655440000.jpg"

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,  // "my-file-manager"
    Key: key,                            // the "path" within the bucket
    Body: file.buffer,                   // binary data from req.file.buffer
    ContentType: file.mimetype,          // "image/jpeg"
  }));

  return key;  // store this key in the database instead of a local path
};
```

### Download via Pre-signed URL

**Problem:** You can't just give the browser the S3 URL — the bucket is private. The browser can't access it without AWS credentials.

**Solution: Pre-signed URL** — A temporary URL that grants access to one specific object for a limited time.

```javascript
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const getDownloadUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });

  // This URL is valid for 5 minutes (300 seconds)
  const url = await getSignedUrl(s3, command, { expiresIn: 300 });
  return url;
  // e.g., "https://my-file-manager.s3.amazonaws.com/uploads/1/uuid.jpg?X-Amz-Algorithm=...&X-Amz-Expires=300&..."
};
```

The pre-signed URL contains:
- The object key
- Expiry time
- A cryptographic signature made with your AWS credentials

Anyone with this URL can download the file for the next 5 minutes, then the URL expires.

### Delete from S3

```javascript
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

const deleteFromS3 = async (key) => {
  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  }));
};
```

### Comparison: Local Disk vs S3

```javascript
// LOCAL DISK (current implementation):
// routes/fileRoutes.js
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),  // local folder
  filename: (req, file, cb) => cb(null, crypto.randomUUID() + ext),
});

// Upload:
const fileRecord = File.create({
  path: 'uploads/uuid.jpg',  // relative path on this server
  ...
});

// Download:
res.download(absolutePath, downloadFilename);  // stream from local disk


// S3 (what you would change to):
// routes/fileRoutes.js
const storage = multer.memoryStorage();  // keep in RAM buffer

// Upload:
const key = await uploadToS3(req.file, req.user.id);  // push to S3
const fileRecord = File.create({
  path: key,  // S3 key: "uploads/1/uuid.jpg"
  ...
});

// Download:
const url = await getDownloadUrl(key);  // get pre-signed URL
res.redirect(url);  // redirect browser to S3 download URL
```

---

## 🟣 Pro Level — `.env` Configuration for Both Modes

```
# .env

# --- S3 / LocalStack ---
USE_LOCALSTACK=true          # false in production with real AWS
AWS_REGION=us-east-1
S3_BUCKET_NAME=my-file-manager
AWS_ACCESS_KEY_ID=test       # LocalStack accepts anything
AWS_SECRET_ACCESS_KEY=test
# In real AWS: use IAM roles or real credentials — NEVER commit to git
```

### IAM Roles in Production (Pro Knowledge)
In real AWS production environments, you **never hardcode AWS credentials in code or `.env`** files. Instead:
- Your EC2 instance or Lambda has an **IAM Role** attached
- The AWS SDK automatically reads credentials from the instance metadata service
- Zero credential management needed

### S3 Storage Class Considerations
For long-term storage, use cheaper storage classes:
```javascript
await s3.send(new PutObjectCommand({
  Bucket: BUCKET,
  Key: key,
  Body: buffer,
  StorageClass: 'STANDARD_IA',  // Infrequent Access — cheaper for rarely accessed files
  // or 'GLACIER' for archival
}));
```

### Key Concepts Summary
| Concept | Detail |
|---|---|
| S3 Bucket | Top-level container for objects. Created in a specific AWS region. |
| Object Key | The "path" of a file within a bucket. e.g., `"uploads/user1/photo.jpg"` |
| LocalStack | Docker container that simulates AWS locally. Free. Port 4566. |
| `memoryStorage()` | Required for S3: file must be in `req.file.buffer` to upload to cloud. |
| `PutObjectCommand` | Uploads an object to S3. |
| `GetObjectCommand` | Downloads an object from S3. |
| `DeleteObjectCommand` | Deletes an object from S3. |
| Pre-signed URL | Temporary signed URL for direct browser-to-S3 download. |
| `expiresIn: 300` | Pre-signed URL valid for 300 seconds (5 minutes). |
| `forcePathStyle` | Required for LocalStack. Uses path-style URLs instead of subdomain. |
| IAM Role | Production way to give AWS services permissions without credentials in code. |

---

# 🎯 Final Exam Prep: Quick-Reference Table

## HTTP Status Codes Used in This Project

| Code | Meaning | Where in Project |
|---|---|---|
| 200 | OK | GET /api/files, POST /api/auth/login |
| 201 | Created | POST /api/auth/register, POST /api/files |
| 400 | Bad Request | Missing fields, invalid input, wrong file type |
| 401 | Unauthorized | Missing/invalid/expired JWT token |
| 404 | Not Found | File not found, unknown API route |
| 409 | Conflict | Username already taken |
| 413 | Payload Too Large | File exceeds 5MB limit |
| 429 | Too Many Requests | Login rate limit exceeded |
| 500 | Internal Server Error | Unhandled server error |

## The Complete Request Journey

**Example: `POST /api/files` (upload a file)**

```
1. Browser selects a file and clicks "Upload"
2. Browser builds a multipart/form-data request with the file
3. Browser adds: Authorization: Bearer eyJ... (JWT from localStorage)

4. Request arrives at Node.js HTTP server (via TCP socket)
5. Event loop picks up the incoming connection (poll phase)
6. Express Router processes the request URL: POST /api/files

7. Middleware chain:
   a. express.static()     → no match, calls next()
   b. express.json()       → skips (multipart, not JSON), calls next()
   c. viewRoutes           → no match, calls next()
   d. authRoutes           → no match, calls next()
   e. fileRoutes router    → URL matches! Enter file router
      i.  authMiddleware   → verify JWT → set req.user = { id: 1 } → next()
      ii. upload.single()  → Multer reads multipart body, saves file to disk
                          → sets req.file = { path, size, mimetype, ... }
                          → next()
      iii. uploadFile()    → controller:
                             - fixFilenameEncoding(req.file.originalname)
                             - File.create({...}) → SQL INSERT
                             - res.status(201).json(toPublic(fileRecord))

8. Response flows back:
   - JSON: { id: 5, original_name: "photo.jpg", size: 204800, ... }
   - Status: 201 Created

9. Browser receives response
10. dashboard.html JS updates the file list in the UI
```

## Project Dependencies — Why Each One Exists

| Package | Version | Why It's Here |
|---|---|---|
| `express` | 5.3.0 | Web framework. Routing, middleware, response helpers. |
| `better-sqlite3` | 13.2.0 | SQLite database. Synchronous API. Single file DB. |
| `bcryptjs` | 3.0.3 | Password hashing. Intentionally slow. Timing-safe. |
| `jsonwebtoken` | 9.0.3 | JWT creation and verification. Stateless authentication. |
| `multer` | 2.5.0 | File upload middleware. Parses multipart/form-data. |
| `dotenv` | 18.0.10 | Loads `.env` file into `process.env`. Keeps secrets out of code. |
| `express-rate-limit` | 8.7.5 | Brute-force protection on login endpoint. |
| `jest` | 30.5.2 | Testing framework. Test runner. Assertions. |
| `supertest` | 7.3.2 | Makes HTTP requests to Express app in tests (no live server needed). |

---

# 📝 Common Interview Questions & Answers

## Q: What is the difference between `require.main === module` and `module.exports`?

**A:** `require.main` is the module that was directly run by Node (`node server.js`). `module.exports` is what a module exposes to others who `require()` it. `require.main === module` checks "was this file the entry point, or was it imported by someone else?". In this project, it prevents `app.listen()` from running when Jest imports `server.js` during tests.

## Q: Why do we use `crypto.randomUUID()` for file names instead of the original file name?

**A:** Three reasons: (1) Prevents path traversal attacks — a UUID contains no slashes or special characters, so a user can't name their file `../../server.js` and overwrite server code. (2) Prevents filename collisions — two users can upload `photo.jpg` without overwriting each other. (3) Prevents information disclosure — the stored name reveals nothing about the original file.

## Q: What happens if Multer saves a file to disk but the database insert fails?

**A:** We have an orphan file — a file on disk with no database record. The controller catches this in a try/catch and calls `fs.promises.unlink(req.file.path)` to delete the orphan file from disk.

## Q: Why does the `selectById` query in `models/user.js` NOT include `password_hash`?

**A:** Because the model is used in two contexts: (a) looking up user info to include in responses to clients, and (b) finding the user to verify their password at login. For case (a), we must NEVER expose the password hash. By having `selectById` exclude it, we eliminate the risk of accidentally sending it in a response.

## Q: What is the difference between `401 Unauthorized` and `403 Forbidden`?

**A:** `401` means "you are not authenticated — I don't know who you are." It expects you to log in and retry. `403` means "I know who you are, but you don't have permission to access this." For example, a logged-in user trying to access another user's file would get `403` (but this project returns `404` instead — to not reveal that the file exists for someone else).

## Q: Why does the login endpoint return the same error message for wrong password AND non-existent user?

**A:** To prevent user enumeration. If the response was "user not found" for one and "wrong password" for the other, an attacker could scan through millions of usernames to find which ones exist, then target those accounts with password attacks. A generic message makes this impossible.

## Q: What is WAL mode in SQLite and why do we use it?

**A:** WAL (Write-Ahead Logging) is a SQLite journaling mode where write operations go to a separate WAL file first, allowing readers to continue reading the main database file simultaneously. Without WAL, any write operation locks the entire database file, forcing all readers to wait. For a web server handling concurrent requests, WAL mode prevents those lock contention slowdowns.

## Q: What is algorithm pinning in JWT and why is it necessary?

**A:** Algorithm pinning means explicitly specifying which algorithm the JWT library should accept when verifying tokens: `{ algorithms: ['HS256'] }`. Without it, an attacker could craft a token with `{ "alg": "none" }` in the header, which some JWT libraries would accept without verifying the signature at all. By pinning to `['HS256']`, we reject any token that isn't signed with HMAC-SHA256.

## Q: How does `COALESCE` work in the UPDATE query?

**A:** `COALESCE(a, b)` returns `a` if `a` is not null, otherwise returns `b`. In the UPDATE query, `SET original_name = COALESCE(@original_name, original_name)` means: if we pass a new value for `original_name`, use it; otherwise, keep the existing value. This allows partial updates where only some fields are changed.

---

*This guide was created to accompany the File Manager project at `C:\Users\ASUS\OneDrive\Desktop\File_Manager`. All code examples are from the actual project source files.*
