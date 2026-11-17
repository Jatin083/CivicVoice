const { request, app, login, auth } = require('./helpers');
const resetDb = require('./resetDb');
const pool = require('../src/config/db');

beforeAll(resetDb);
afterAll(() => pool.end());

describe('auth', () => {
  test('API01 health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('API02 login with demo credentials returns a token', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'priya@gmail.com', password: 'Password@123' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user).toMatchObject({ id: 2, fullName: 'Priya Verma', role: 'user' });
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  test('API03 wrong password and unknown email give the same 401', async () => {
    const a = await request(app).post('/api/auth/login').send({ email: 'priya@gmail.com', password: 'nope-nope' });
    const b = await request(app).post('/api/auth/login').send({ email: 'nobody@gmail.com', password: 'Password@123' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  test('API04 short password is a 422 with a field error', async () => {
    const res = await request(app).post('/api/auth/register').send({ fullName: 'Test', email: 't@x.com', password: '123' });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toContainEqual({ field: 'password', message: 'Password must be at least 8 characters' });
  });

  test('API05/API06 register, then the same email again is 409', async () => {
    const body = { fullName: 'Neha Gupta', email: 'Neha@Gmail.com', password: 'Password@123', phone: '9876500000' };
    const first = await request(app).post('/api/auth/register').send(body);
    expect(first.status).toBe(201);
    expect(first.body.data.user.email).toBe('neha@gmail.com'); // stored lowercase
    const again = await request(app).post('/api/auth/register').send({ ...body, email: 'neha@gmail.com' });
    expect(again.status).toBe(409);
    expect(again.body.error.message).toBe('An account with this email already exists');
  });

  test('GET /auth/me returns the current user', async () => {
    const token = await login('aarav@gmail.com');
    const res = await request(app).get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('aarav@gmail.com');
  });

  test('a bad token is 401', async () => {
    const res = await request(app).get('/api/auth/me').set(auth('not-a-token'));
    expect(res.status).toBe(401);
  });

  test('API15 unknown route is 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
  });
});
