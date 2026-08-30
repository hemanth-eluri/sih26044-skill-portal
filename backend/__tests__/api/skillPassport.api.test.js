const request = require('supertest');
const express = require('express');
const Student = require('../../models/Student');
const { AssessmentResult } = require('../../models/Assessment');

const app = express(); app.use(express.json()); app.use('/api/auth', require('../../routes/auth')); app.use('/api/students', require('../../routes/students'));
async function register(name, email) { return request(app).post('/api/auth/register').send({ name, email, password: 'SecurePass123', confirmPassword: 'SecurePass123', role: 'student' }); }

describe('Evidence-based skill passport', () => {
  test('aggregates only persisted explicit evidence and survives reload', async () => {
    const user = await register('Passport A', 'passport-a@example.com');
    await request(app).put('/api/students/me/profile').set('Authorization', `Bearer ${user.body.token}`).send({ skills: [{ name: 'Java', selfDeclaredLevel: 'intermediate' }] });
    const student = await Student.findOne({ userId: user.body.user.id });
    student.projects.push({ title: 'Java API', skills: ['Java'], endDate: new Date('2026-08-01') });
    await student.save();
    await AssessmentResult.create({ studentId: student._id, completedAt: new Date('2026-08-20'), score: 82, skillScores: [{ skill: 'Java', score: 82, level: 'advanced' }] });
    const first = await request(app).get('/api/students/me/skill-passport').set('Authorization', `Bearer ${user.body.token}`);
    const reload = await request(app).get('/api/students/me/skill-passport').set('Authorization', `Bearer ${user.body.token}`);
    expect(first.status).toBe(200);
    expect(first.body.passport.skills[0]).toMatchObject({ name: 'Java', selfDeclaredLevel: 'intermediate', assessment: { attempts: 1, latestScore: 82 }, evidence: { projects: 1, externalPlatforms: 0, employerChallenges: 0 } });
    expect(reload.body.passport.skills[0].assessment.latestScore).toBe(82);
    expect(first.body.passport.shareable).toBe(false);
  });

  test('isolates Student A and B passports', async () => {
    const a = await register('Passport A', 'passport-isolation-a@example.com'); const b = await register('Passport B', 'passport-isolation-b@example.com');
    await request(app).put('/api/students/me/profile').set('Authorization', `Bearer ${a.body.token}`).send({ skills: [{ name: 'SQL' }] });
    await request(app).put('/api/students/me/profile').set('Authorization', `Bearer ${b.body.token}`).send({ skills: [{ name: 'Python' }] });
    const pa = await request(app).get('/api/students/me/skill-passport').set('Authorization', `Bearer ${a.body.token}`); const pb = await request(app).get('/api/students/me/skill-passport').set('Authorization', `Bearer ${b.body.token}`);
    expect(pa.body.passport.skills.map(item => item.name)).toEqual(['SQL']); expect(pb.body.passport.skills.map(item => item.name)).toEqual(['Python']);
  });

  test('returns an honest empty passport', async () => {
    const user = await register('Empty Passport', 'passport-empty@example.com');
    const response = await request(app).get('/api/students/me/skill-passport').set('Authorization', `Bearer ${user.body.token}`);
    expect(response.status).toBe(200); expect(response.body.passport.skills).toEqual([]); expect(response.body.passport.message).toBe('No skills are saved yet.');
  });
});
