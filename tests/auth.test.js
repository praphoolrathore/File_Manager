const request = require('supertest');
const app = require('../server');

describe('Authentication & Protected Route API Tests', () => {
    // Use a unique random username each run so tests never conflict with existing DB data
    const testUsername = `user_${Date.now()}`;
    const testPassword = 'Password123';
    let authToken = '';

    // --- 1. REGISTRATION TESTS ---
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully and return a JWT token', async () => {
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

        it('should reject registration if password is too short (< 6 chars)', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: `short_${Date.now()}`,
                    password: '123',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/Password must be 6-72 characters/i);
        });
    });

    // --- 2. LOGIN TESTS ---
    describe('POST /api/auth/login', () => {
        it('should log in with valid credentials and return a token', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    username: testUsername,
                    password: testPassword,
                });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('token');
            authToken = res.body.token; // Save token for protected route test below
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
    });

    // --- 3. PROTECTED ROUTE (MIDDLEWARE) TESTS ---
    describe('GET /api/files (Protected Route)', () => {
        it('should block access with 401 when no token is provided', async () => {
            const res = await request(app).get('/api/files');

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toMatch(/Authentication required/i);
        });

        it('should allow access with 200 when a valid JWT token is provided', async () => {
            const res = await request(app)
                .get('/api/files')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});