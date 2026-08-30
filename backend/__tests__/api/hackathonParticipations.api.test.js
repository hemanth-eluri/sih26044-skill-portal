const request = require('supertest');
const express = require('express');
const HackathonParticipation = require('../../models/HackathonParticipation');

const app = express();
app.use(express.json());
app.use('/api/auth', require('../../routes/auth'));
app.use('/api/hackathon-participations', require('../../routes/hackathonParticipations'));

async function register(name, email) {
  return request(app).post('/api/auth/register').send({ name, email, password: 'SecurePass123', confirmPassword: 'SecurePass123', role: 'student' });
}

const validParticipation = {
  hackathonName: 'Smart India Hackathon',
  date: '2026-08-20',
  role: 'Backend Developer',
  projectName: 'Skill Intelligence Portal',
  techStackUsed: ['Node.js', 'MongoDB', 'Node.js'],
  outcome: 'Finalist'
};

describe('Hackathon participation tracker API', () => {
  test('creates, returns, and counts a participation', async () => {
    const user = await register('Tracker Student', 'tracker@example.com');
    const created = await request(app).post('/api/hackathon-participations').set('Authorization', `Bearer ${user.body.token}`).send(validParticipation);

    expect(created.status).toBe(201);
    expect(created.body.participation).toMatchObject({ hackathonName: 'Smart India Hackathon', role: 'Backend Developer', projectName: 'Skill Intelligence Portal', techStackUsed: ['Node.js', 'MongoDB'], outcome: 'Finalist' });

    const list = await request(app).get('/api/hackathon-participations').set('Authorization', `Bearer ${user.body.token}`);
    expect(list.status).toBe(200);
    expect(list.body.count).toBe(1);
    expect(list.body.participations).toHaveLength(1);
  });

  test('isolates participation records between students', async () => {
    const userA = await register('Student A', 'participation-a@example.com');
    const userB = await register('Student B', 'participation-b@example.com');
    await request(app).post('/api/hackathon-participations').set('Authorization', `Bearer ${userA.body.token}`).send(validParticipation);

    const listB = await request(app).get('/api/hackathon-participations').set('Authorization', `Bearer ${userB.body.token}`);
    expect(listB.body.count).toBe(0);
    expect(listB.body.participations).toEqual([]);
  });

  test('updates and deletes only an owned participation', async () => {
    const userA = await register('Student A', 'participation-owner@example.com');
    const userB = await register('Student B', 'participation-other@example.com');
    const created = await request(app).post('/api/hackathon-participations').set('Authorization', `Bearer ${userA.body.token}`).send(validParticipation);
    const id = created.body.participation.id;

    const forbiddenUpdate = await request(app).put(`/api/hackathon-participations/${id}`).set('Authorization', `Bearer ${userB.body.token}`).send({ ...validParticipation, outcome: 'Winner' });
    expect(forbiddenUpdate.status).toBe(404);

    const updated = await request(app).put(`/api/hackathon-participations/${id}`).set('Authorization', `Bearer ${userA.body.token}`).send({ ...validParticipation, outcome: 'Winner' });
    expect(updated.status).toBe(200);
    expect(updated.body.participation.outcome).toBe('Winner');

    const forbiddenDelete = await request(app).delete(`/api/hackathon-participations/${id}`).set('Authorization', `Bearer ${userB.body.token}`);
    expect(forbiddenDelete.status).toBe(404);
    const deleted = await request(app).delete(`/api/hackathon-participations/${id}`).set('Authorization', `Bearer ${userA.body.token}`);
    expect(deleted.status).toBe(200);
    expect(await HackathonParticipation.countDocuments()).toBe(0);
  });

  test('rejects missing fields, future dates, and unauthenticated writes', async () => {
    const user = await register('Validation Student', 'participation-validation@example.com');
    const missing = await request(app).post('/api/hackathon-participations').set('Authorization', `Bearer ${user.body.token}`).send({ hackathonName: 'Incomplete' });
    const future = await request(app).post('/api/hackathon-participations').set('Authorization', `Bearer ${user.body.token}`).send({ ...validParticipation, date: '2999-01-01' });
    const unauthenticated = await request(app).post('/api/hackathon-participations').send(validParticipation);

    expect(missing.status).toBe(400);
    expect(future.status).toBe(400);
    expect(unauthenticated.status).toBe(401);
  });
});
