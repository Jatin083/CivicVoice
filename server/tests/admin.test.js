const { request, app, login, auth } = require('./helpers');
const resetDb = require('./resetDb');
const pool = require('../src/config/db');

let admin;
beforeAll(async () => {
  await resetDb();
  admin = await login('admin@civicvoice.com');
});
afterAll(() => pool.end());

test('API16 a non-admin calling /admin/stats is 403', async () => {
  const token = await login('priya@gmail.com');
  const res = await request(app).get('/api/admin/stats').set(auth(token));
  expect(res.status).toBe(403);
});

test('admin stats match the seed data', async () => {
  const res = await request(app).get('/api/admin/stats').set(auth(admin));
  expect(res.status).toBe(200);
  expect(res.body.data.totals).toMatchObject({ users: 4, petitions: 3, signatures: 6, comments: 4, pendingReports: 0, newFeedback: 3, avgRating: 4.67 });
  expect(res.body.data.byStatus).toEqual({ published: 2, under_review: 1 });
  expect(res.body.data.topPetitions.length).toBe(3);
});

test('API17 admin approving a published petition directly is 400 with the allowed list', async () => {
  const res = await request(app).patch('/api/petitions/1/status').set(auth(admin)).send({ status: 'approved' });
  expect(res.status).toBe(400);
  expect(res.body.error.message).toBe('Cannot change from published to approved');
  expect(res.body.error.allowed).toEqual(['under_review', 'rejected', 'closed']);
});

test('admin moves under_review -> approved with a note', async () => {
  const res = await request(app).patch('/api/petitions/3/status').set(auth(admin)).send({ status: 'approved', adminNote: 'Forwarded to the transport department.' });
  expect(res.status).toBe(200);
  const detail = await request(app).get('/api/petitions/3');
  expect(detail.body.data.admin_note).toBe('Forwarded to the transport department.');
});

test('hide a comment: it disappears from the public list', async () => {
  const res = await request(app).patch('/api/admin/comments/1').set(auth(admin)).send({ status: 'hidden' });
  expect(res.status).toBe(200);
  const list = await request(app).get('/api/petitions/1/comments');
  expect(list.body.data.map((c) => c.comment_id)).not.toContain(1);
});

test('resolve a report and mark feedback reviewed', async () => {
  const rohan = await login('rohan@gmail.com');
  const rep = await request(app).post('/api/reports').set(auth(rohan)).send({ petitionId: 2, reason: 'Duplicate petition' });
  const resolve = await request(app).patch(`/api/admin/reports/${rep.body.data.reportId}`).set(auth(admin)).send({ status: 'dismissed', adminNote: 'Not a duplicate' });
  expect(resolve.status).toBe(200);
  const fb = await request(app).patch('/api/admin/feedback/1').set(auth(admin)).send({ status: 'reviewed' });
  expect(fb.status).toBe(200);
});

test('API21 admin cannot suspend themselves', async () => {
  const res = await request(app).patch('/api/admin/users/3').set(auth(admin)).send({ accountStatus: 'suspended' });
  expect(res.status).toBe(400);
});

test('API14 a suspended user with an old token gets 403', async () => {
  const rohan = await login('rohan@gmail.com');
  const sus = await request(app).patch('/api/admin/users/4').set(auth(admin)).send({ accountStatus: 'suspended' });
  expect(sus.status).toBe(200);
  const sign = await request(app).post('/api/petitions/2/sign').set(auth(rohan));
  expect(sign.status).toBe(403);
  const relogin = await request(app).post('/api/auth/login').send({ email: 'rohan@gmail.com', password: 'Password@123' });
  expect(relogin.status).toBe(403);
});

test('draft and rejected petitions are hidden from guests but visible to admins', async () => {
  await request(app).patch('/api/petitions/2/status').set(auth(admin)).send({ status: 'rejected', adminNote: 'Duplicate' });
  const guest = await request(app).get('/api/petitions/2');
  expect(guest.status).toBe(404);
  const asAdmin = await request(app).get('/api/petitions/2').set(auth(admin));
  expect(asAdmin.status).toBe(200);
  const owner = await request(app).get('/api/petitions/2').set(auth(await login('priya@gmail.com')));
  expect(owner.status).toBe(200);
});
