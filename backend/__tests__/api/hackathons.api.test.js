const request = require('supertest');
const express = require('express');
const User = require('../../models/User');
const Student = require('../../models/Student');
const Hackathon = require('../../models/Hackathon');
const HackathonActivity = require('../../models/HackathonActivity');
const { syncHackathons } = require('../../services/hackathons/hackathonAggregator');

const app = express();
app.use(express.json());
app.use('/api/auth', require('../../routes/auth'));
app.use('/api/students', require('../../routes/students'));
app.use('/api/hackathons', require('../../routes/hackathons'));

const rawHackathon = {
  id: 'provider-event-1', slug: 'health-ai-challenge', url: 'https://hackalendar.com/e/health-ai-challenge', name: 'Health AI Challenge',
  description: 'Build healthcare tools', startAt: '2026-10-10T00:00:00Z', endAt: '2026-10-12T00:00:00Z', mode: 'online',
  themes: ['ai', 'health'], isFree: true, registrationUrl: 'https://official.example/health-ai', organizer: 'Example University', lastVerifiedAt: '2026-08-29T00:00:00Z'
};

const fakeProvider = items => ({
  getSourceMetadata: () => ({ name: 'Hackalendar', type: 'public-structured-data' }),
  fetchHackathons: async () => items
});

async function register(name, email) {
  return request(app).post('/api/auth/register').send({ name, email, password: 'SecurePass123', confirmPassword: 'SecurePass123', role: 'student' });
}

describe('Hackathon discovery API', () => {
  test('syncs real-shaped provider data and updates instead of duplicating', async () => {
    const first = await syncHackathons({ providers: [fakeProvider([rawHackathon])], now: new Date('2026-08-30') });
    const second = await syncHackathons({ providers: [fakeProvider([{ ...rawHackathon, description: 'Updated source description' }])], now: new Date('2026-08-31') });

    expect(first[0]).toMatchObject({ status: 'success', inserted: 1 });
    expect(second[0]).toMatchObject({ status: 'success', updated: 1 });
    expect(await Hackathon.countDocuments()).toBe(1);
    expect((await Hackathon.findOne()).description).toBe('Updated source description');
  });

  test('filters and paginates database records', async () => {
    await syncHackathons({ providers: [fakeProvider([rawHackathon])], now: new Date('2026-08-30') });
    const response = await request(app).get('/api/hackathons?domain=AI%2FML&mode=online&page=1&limit=10');

    expect(response.status).toBe(200);
    expect(response.body.hackathons).toHaveLength(1);
    expect(response.body.pagination).toMatchObject({ page: 1, limit: 10, total: 1 });
  });

  test('gives different explainable recommendations from isolated profiles', async () => {
    await syncHackathons({ providers: [fakeProvider([rawHackathon])], now: new Date('2026-08-30') });
    const userA = await register('Student A', 'hack-a@example.com');
    const userB = await register('Student B', 'hack-b@example.com');
    await request(app).put('/api/students/me/profile').set('Authorization', `Bearer ${userA.body.token}`).send({ degree: 'B.Tech', branch: 'CSE', currentYear: 2, fieldsOfInterest: ['Web Development'], skills: [{ name: 'Java' }, { name: 'SQL' }] });
    await request(app).put('/api/students/me/profile').set('Authorization', `Bearer ${userB.body.token}`).send({ degree: 'B.Sc', fieldsOfInterest: ['Healthcare'], skills: [{ name: 'Statistics' }] });

    const recommendationsA = await request(app).get('/api/hackathons/recommended').set('Authorization', `Bearer ${userA.body.token}`);
    const recommendationsB = await request(app).get('/api/hackathons/recommended').set('Authorization', `Bearer ${userB.body.token}`);
    expect(recommendationsA.status).toBe(200);
    expect(recommendationsB.status).toBe(200);
    expect(recommendationsB.body.recommendations[0].recommendation.matchedReasons.join(' ')).toContain('Healthcare');
    expect(recommendationsB.body.recommendations[0].recommendation.matchScore).toBeGreaterThan(recommendationsA.body.recommendations[0].recommendation.matchScore);
  });

  test('persists saved and self-reported registration statuses per student', async () => {
    await syncHackathons({ providers: [fakeProvider([rawHackathon])], now: new Date('2026-08-30') });
    const hackathon = await Hackathon.findOne();
    const userA = await register('Student A', 'activity-a@example.com');
    const userB = await register('Student B', 'activity-b@example.com');
    const saved = await request(app).post(`/api/hackathons/${hackathon._id}/save`).set('Authorization', `Bearer ${userA.body.token}`);
    const registered = await request(app).post(`/api/hackathons/${hackathon._id}/status`).set('Authorization', `Bearer ${userA.body.token}`).send({ status: 'registered-self-reported' });
    const mineA = await request(app).get('/api/students/me/hackathons').set('Authorization', `Bearer ${userA.body.token}`);
    const mineB = await request(app).get('/api/students/me/hackathons').set('Authorization', `Bearer ${userB.body.token}`);

    expect(saved.status).toBe(201);
    expect(registered.body.selfReported).toBe(true);
    expect(mineA.body.activities).toHaveLength(1);
    expect(mineA.body.activities[0].status).toBe('registered-self-reported');
    expect(mineB.body.activities).toHaveLength(0);
    expect(await HackathonActivity.countDocuments()).toBe(1);
  });
});
