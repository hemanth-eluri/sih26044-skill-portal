const request = require('supertest'); const express = require('express');
const CareerRole = require('../../models/CareerRole');
const app = express(); app.use(express.json()); app.use('/api/auth', require('../../routes/auth')); app.use('/api/students', require('../../routes/students'));
async function register(name, email) { return request(app).post('/api/auth/register').send({ name, email, password: 'SecurePass123', confirmPassword: 'SecurePass123', role: 'student' }); }

describe('Gap-derived career roadmap', () => {
  test('generates from real role gaps and preserves progress after regeneration', async () => {
    const role = await CareerRole.create({ title: 'Backend Developer', requiredSkills: [{ name: 'SQL', importance: 'critical' }, { name: 'REST APIs', importance: 'high' }] });
    const user = await register('Roadmap A', 'roadmap-a@example.com');
    await request(app).put('/api/students/me/profile').set('Authorization', `Bearer ${user.body.token}`).send({ targetRoleId: role._id, skills: [{ name: 'SQL' }] });
    const first = await request(app).get('/api/students/me/career-roadmap').set('Authorization', `Bearer ${user.body.token}`);
    const restTask = first.body.roadmap.tasks.find(item => item.skill === 'REST APIs');
    expect(first.status).toBe(200); expect(first.body.roadmap.tasks.map(item => item.key)).toEqual(expect.arrayContaining(['role-evidence:sql', 'role-gap:rest apis']));
    const updated = await request(app).patch(`/api/students/me/career-roadmap/tasks/${restTask._id}`).set('Authorization', `Bearer ${user.body.token}`).send({ status: 'COMPLETED' });
    const reload = await request(app).get('/api/students/me/career-roadmap').set('Authorization', `Bearer ${user.body.token}`);
    expect(updated.body.task.status).toBe('COMPLETED'); expect(reload.body.roadmap.tasks.find(item => item.key === restTask.key).status).toBe('COMPLETED');
  });
  test('isolates roadmaps between students', async () => {
    const role = await CareerRole.create({ title: 'Data Analyst', requiredSkills: [{ name: 'SQL', importance: 'high' }] });
    const a = await register('Roadmap A', 'roadmap-iso-a@example.com'); const b = await register('Roadmap B', 'roadmap-iso-b@example.com');
    await request(app).put('/api/students/me/profile').set('Authorization', `Bearer ${a.body.token}`).send({ targetRoleId: role._id });
    const ra = await request(app).get('/api/students/me/career-roadmap').set('Authorization', `Bearer ${a.body.token}`); const rb = await request(app).get('/api/students/me/career-roadmap').set('Authorization', `Bearer ${b.body.token}`);
    expect(ra.body.roadmap.tasks[0].skill).toBe('SQL'); expect(rb.body.roadmap.tasks[0].key).toBe('select-role');
  });
  test('returns actionable empty-goal state and validates target date', async () => {
    const user = await register('Roadmap Empty', 'roadmap-empty@example.com');
    const roadmap = await request(app).get('/api/students/me/career-roadmap').set('Authorization', `Bearer ${user.body.token}`);
    const invalid = await request(app).put('/api/students/me/career-roadmap/settings').set('Authorization', `Bearer ${user.body.token}`).send({ targetDate: '2020-01-01' });
    expect(roadmap.body.message).toContain('Choose a target role'); expect(invalid.status).toBe(400);
  });
});
