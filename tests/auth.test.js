const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');

describe('Authentication & Security API Tests', () => {
  // Use timestamped unique names so tests never collide with existing DB records
  const uniqueId = Date.now();
  const testUsername = `user_${uniqueId}`;
  const testPassword = 'Password123';
  let authToken = '';

  // ==========================================
  // 1. REGISTRATION ENDPOINT TESTS
  // ==========================================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return a valid JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: testUsername,
          password: testPassword,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe(testUsername);
      expect(res.body.user).not.toHaveProperty('password_hash');
    });

    it('should reject registration if the username is already taken', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: testUsername,
          password: testPassword,
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toMatch(/already taken/i);
    });

    it('should reject registration when username or password fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: `no_pwd_${uniqueId}` });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Username and password are required/i);
    });

    it('should reject registration if username is too short (< 3 characters)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab',
          password: testPassword,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Username must be 3-30 characters/i);
    });

    it('should reject registration if username is too long (> 30 characters)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'a'.repeat(31),
          password: testPassword,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Username must be 3-30 characters/i);
    });

    it('should reject registration if password is too short (< 6 characters)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: `short_pwd_${uniqueId}`,
          password: '123',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Password must be 6-72 characters/i);
    });

    it('should reject registration if password exceeds bcrypt limit (> 72 characters)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: `long_pwd_${uniqueId}`,
          password: 'x'.repeat(75),
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Password must be 6-72 characters/i);
    });

    it('should sanitize and trim leading/trailing whitespace from username', async () => {
      const trimmedUser = `trimmed_${uniqueId}`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: `   ${trimmedUser}   `,
          password: testPassword,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.user.username).toBe(trimmedUser);
    });
  });

  // ==========================================
  // 2. LOGIN ENDPOINT TESTS
  // ==========================================
  describe('POST /api/auth/login', () => {
    it('should log in successfully with valid credentials and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUsername,
          password: testPassword,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe(testUsername);
      authToken = res.body.token; // Saved for subsequent protected route tests
    });

    it('should reject login when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Username and password are required/i);
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUsername,
          password: 'WrongPassword!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Invalid username or password/i);
    });

    it('should reject login for non-existent user with generic message (prevents user enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: `non_existent_${uniqueId}`,
          password: 'SomePassword123',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Invalid username or password/i);
    });
  });

  // ==========================================
  // 3. JWT AUTHENTICATION MIDDLEWARE & SECURITY TESTS
  // ==========================================
  describe('JWT Verification & Protected Route Guard (GET /api/files)', () => {
    it('should block access with 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/files');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Authentication required/i);
    });

    it('should block access with 401 when token scheme is not "Bearer "', async () => {
      const res = await request(app)
        .get('/api/files')
        .set('Authorization', 'Basic dXNlcjpwYXNz');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Authentication required/i);
    });

    it('should block access with 401 when Bearer token is empty', async () => {
      const res = await request(app)
        .get('/api/files')
        .set('Authorization', 'Bearer    ');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Authentication required/i);
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
        expiresIn: '1h',
        algorithm: 'HS256',
      });

      const res = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Invalid token/i);
    });

    it('should block access with 401 when token has expired', async () => {
      const secret = process.env.JWT_SECRET || 'fallback_secret';
      const expiredToken = jwt.sign({ id: 9999 }, secret, {
        expiresIn: '0s',
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
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
