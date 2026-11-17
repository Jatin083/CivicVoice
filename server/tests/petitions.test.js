const { request, app, login, auth } = require('./helpers');
const resetDb = require('./resetDb');
const pool = require('../src/config/db');

beforeAll(resetDb);
afterAll(() => pool.end());

describe('browse', () => {
  test('API07 popular sort with limit 2', async () => {
    const res = await request(app).get('/api/petitions?sort=popular&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 2 });
  });

  test('API08 search library across all public statuses', async () => {
    const res = await request(app).get('/api/petitions?q=library&status=all');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Improve College Library Facilities');
  });

  test('status=all never includes drafts', async () => {
    const token = await login('aarav@gmail.com');
    await request(app).post('/api/petitions').set(auth(token)).send({
      categoryId: 1, title: 'Secret draft petition', description: 'This one is still a draft and private.', status: 'draft',
    });
    const res = await request(app).get('/api/petitions?status=all&limit=50');
    expect(res.body.data.map((p) => p.status)).not.toContain('draft');
  });

  test('detail tells a logged-in user whether they signed', async () => {
    const guest = await request(app).get('/api/petitions/1');
    expect(guest.body.data.signedByMe).toBe(false);
    expect(guest.body.data.problem_statement).toBeTruthy();
    const token = await login('priya@gmail.com');
    const res = await request(app).get('/api/petitions/1').set(auth(token));
    expect(res.body.data.signedByMe).toBe(true);
  });
});

describe('signing', () => {
  test('API09 sign without a token is 401', async () => {
    const res = await request(app).post('/api/petitions/1/sign');
    expect(res.status).toBe(401);
  });

  test('API10 a new user signs and the count goes up', async () => {
    const reg = await request(app).post('/api/auth/register').send({ fullName: 'Signer One', email: 'signer@gmail.com', password: 'Password@123' });
    const res = await request(app).post('/api/petitions/1/sign').set(auth(reg.body.data.token));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ petitionId: 1, total_signatures: 3, progress_percentage: 0.6, signedByMe: true });
  });

  test('API11 a user cannot sign the same petition twice', async () => {
    const token = await login('priya@gmail.com'); // Priya already signed petition 1 in seed data
    const res = await request(app).post('/api/petitions/1/sign').set(auth(token));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('45409');
  });

  test('API12 signing an under-review petition is rejected', async () => {
    const token = await login('rohan@gmail.com');
    const res = await request(app).post('/api/petitions/3/sign').set(auth(token));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('45400');
  });

  test('API13 signing a missing petition is 404', async () => {
    const token = await login('rohan@gmail.com');
    const res = await request(app).post('/api/petitions/99/sign').set(auth(token));
    expect(res.status).toBe(404);
  });
});

describe('create, edit, status', () => {
  let aarav;
  let newId;
  beforeAll(async () => {
    aarav = await login('aarav@gmail.com');
  });

  test('create a petition', async () => {
    const res = await request(app).post('/api/petitions').set(auth(aarav)).send({
      categoryId: 2, title: 'Clean the Sector 14 Lake', description: 'The lake is full of plastic and sewage every monsoon.',
      targetSignatures: 250, location: 'Gurugram, Haryana', status: 'published',
    });
    expect(res.status).toBe(201);
    newId = res.body.data.petitionId;
  });

  test('validation: short title, past end date, target 0', async () => {
    const res = await request(app).post('/api/petitions').set(auth(aarav)).send({
      categoryId: 2, title: 'Hi', description: 'too short', endDate: '2020-01-01', targetSignatures: 0,
    });
    expect(res.status).toBe(422);
    const fields = res.body.error.fields.map((f) => f.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'description', 'endDate']));
  });

  test('API20 a user cannot edit someone else\'s petition', async () => {
    const priya = await login('priya@gmail.com');
    const res = await request(app).patch(`/api/petitions/${newId}`).set(auth(priya)).send({ title: 'Hijacked title' });
    expect(res.status).toBe(403);
  });

  test('owner can edit while published', async () => {
    const res = await request(app).patch(`/api/petitions/${newId}`).set(auth(aarav)).send({ title: 'Clean the Sector 14 Lake now' });
    expect(res.status).toBe(200);
  });

  test('creator cannot move published to under_review', async () => {
    const res = await request(app).patch(`/api/petitions/${newId}/status`).set(auth(aarav)).send({ status: 'under_review' });
    expect(res.status).toBe(400);
    expect(res.body.error.allowed).toEqual(['closed']);
  });

  test('creator closes it, then it is locked for edits and signing', async () => {
    const close = await request(app).patch(`/api/petitions/${newId}/status`).set(auth(aarav)).send({ status: 'closed' });
    expect(close.status).toBe(200);
    const edit = await request(app).patch(`/api/petitions/${newId}`).set(auth(aarav)).send({ title: 'Edited after close' });
    expect(edit.status).toBe(400);
    const sign = await request(app).post(`/api/petitions/${newId}/sign`).set(auth(await login('rohan@gmail.com')));
    expect(sign.status).toBe(400);
  });
});

describe('comments, reports, feedback, dashboard', () => {
  test('comment then list', async () => {
    const token = await login('rohan@gmail.com');
    const post = await request(app).post('/api/petitions/2/comments').set(auth(token)).send({ text: 'Fully support this.' });
    expect(post.status).toBe(201);
    const list = await request(app).get('/api/petitions/2/comments');
    expect(list.body.data[0].comment_text).toBe('Fully support this.');
  });

  test('API18 report with both targets is 422', async () => {
    const token = await login('rohan@gmail.com');
    const res = await request(app).post('/api/reports').set(auth(token)).send({ petitionId: 1, commentId: 3, reason: 'Spam' });
    expect(res.status).toBe(422);
  });

  test('valid comment report starts pending', async () => {
    const token = await login('rohan@gmail.com');
    const res = await request(app).post('/api/reports').set(auth(token)).send({ commentId: 3, reason: 'Spam', details: 'Same message everywhere' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
  });

  test('API19 feedback rating 6 is 422', async () => {
    const token = await login('rohan@gmail.com');
    const res = await request(app).post('/api/feedback').set(auth(token)).send({ subject: 'Search', message: 'Add a location filter', rating: 6 });
    expect(res.status).toBe(422);
  });

  test('dashboard counts', async () => {
    const token = await login('rohan@gmail.com');
    const res = await request(app).get('/api/users/me/dashboard').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.counts).toMatchObject({ petitions_created: 1, petitions_signed: 2, comments_posted: 2 });
  });
});
