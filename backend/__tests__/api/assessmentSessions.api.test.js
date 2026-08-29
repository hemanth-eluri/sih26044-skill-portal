const request = require('supertest');
const express = require('express');
const AssessmentQuestion = require('../../models/AssessmentQuestion');
const CareerRole = require('../../models/CareerRole');

const app = express();
app.use(express.json());
app.use('/api/auth', require('../../routes/auth'));
app.use('/api/students', require('../../routes/students'));
app.use('/api/assessments', require('../../routes/assessments'));
app.use('/api/skills', require('../../routes/skills'));

async function register(name, email) {
  return request(app).post('/api/auth/register').send({
    name,
    email,
    password: 'SecurePass123',
    confirmPassword: 'SecurePass123',
    role: 'student'
  });
}

async function seedQuestions() {
  return AssessmentQuestion.create([
    { skill: 'SQL', topic: 'Queries', difficulty: 'easy', questionText: 'Which keyword reads rows?', options: ['SELECT', 'DELETE', 'DROP', 'ALTER'], correctAnswer: 'SELECT', verificationStatus: 'verified' },
    { skill: 'SQL', topic: 'Joins', difficulty: 'medium', questionText: 'Which join keeps every left row?', options: ['INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'SELF JOIN'], correctAnswer: 'LEFT JOIN', verificationStatus: 'verified' },
    { skill: 'Python', topic: 'Collections', difficulty: 'easy', questionText: 'Which literal creates a list?', options: ['[]', '{}', '()', '<>'], correctAnswer: '[]', verificationStatus: 'verified' },
    { skill: 'Python', topic: 'Functions', difficulty: 'medium', questionText: 'Which keyword defines a function?', options: ['def', 'func', 'method', 'lambda-only'], correctAnswer: 'def', verificationStatus: 'verified' }
  ]);
}

describe('Database-backed assessment sessions', () => {
  test('returns a database-derived skill catalog', async () => {
    await seedQuestions();
    await CareerRole.create({ title: 'Backend Developer', requiredSkills: [{ name: 'REST APIs', importance: 'high' }] });
    const response = await request(app).get('/api/skills');

    expect(response.status).toBe(200);
    expect(response.body.skills.map(skill => skill.name)).toEqual(['Python', 'REST APIs', 'SQL']);
  });

  test('creates a profile-skills session, hides answers, scores it, and persists history and analysis', async () => {
    const role = await CareerRole.create({
      title: 'Backend Developer',
      requiredSkills: [
        { name: 'SQL', level: 'intermediate', importance: 'critical' },
        { name: 'REST APIs', level: 'beginner', importance: 'high' }
      ]
    });
    await seedQuestions();
    const registration = await register('User A', 'user-a@example.com');
    const token = registration.body.token;
    await request(app).put('/api/students/me/profile').set('Authorization', `Bearer ${token}`).send({
      skills: [
        { name: 'Java', selfDeclaredLevel: 'intermediate' },
        { name: 'SQL', selfDeclaredLevel: 'beginner', wantToImprove: true }
      ],
      targetRoleId: role._id
    });

    const created = await request(app).post('/api/assessments/session')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'profile-skills', skills: ['SQL'], questionCount: 2 });

    expect(created.status).toBe(201);
    expect(created.body.session.selectedSkills).toEqual(['SQL']);
    expect(created.body.session.questions).toHaveLength(2);
    expect(created.body.session.questions.every(question => question.skill === 'SQL')).toBe(true);
    expect(created.body.session.questions[0].correctAnswer).toBeUndefined();

    const answers = created.body.session.questions.map(question => ({
      questionId: question.id,
      selectedAnswer: question.options[0]
    }));
    const submitted = await request(app).post(`/api/assessments/session/${created.body.session.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers });

    expect(submitted.status).toBe(201);
    expect(submitted.body.result.score).toBe(50);
    expect(submitted.body.result.skillScores).toEqual([expect.objectContaining({ skill: 'SQL', score: 50 })]);

    const history = await request(app).get('/api/assessments/history').set('Authorization', `Bearer ${token}`);
    expect(history.status).toBe(200);
    expect(history.body.results).toHaveLength(1);
    expect(history.body.results[0].skillsAssessed).toEqual(['SQL']);

    const analysis = await request(app).get('/api/students/me/skill-analysis').set('Authorization', `Bearer ${token}`);
    expect(analysis.status).toBe(200);
    expect(analysis.body.analysis.skillsNeedingImprovement).toEqual([expect.objectContaining({ skill: 'SQL', score: 50 })]);
    expect(analysis.body.analysis.missingSkills).toEqual([expect.objectContaining({ skill: 'REST APIs' })]);
    expect(analysis.body.analysis.recommendations[0].message).toContain('50%');
  });

  test('isolates sessions between users and selects only each user’s requested skills', async () => {
    await seedQuestions();
    const userA = await register('User A', 'isolation-a@example.com');
    const userB = await register('User B', 'isolation-b@example.com');
    await request(app).put('/api/students/me/profile').set('Authorization', `Bearer ${userA.body.token}`).send({ skills: [{ name: 'SQL', selfDeclaredLevel: 'beginner' }] });
    await request(app).put('/api/students/me/profile').set('Authorization', `Bearer ${userB.body.token}`).send({ skills: [{ name: 'Python', selfDeclaredLevel: 'intermediate' }] });
    const sessionA = await request(app).post('/api/assessments/session').set('Authorization', `Bearer ${userA.body.token}`).send({ mode: 'profile-skills', questionCount: 2 });
    const sessionB = await request(app).post('/api/assessments/session').set('Authorization', `Bearer ${userB.body.token}`).send({ mode: 'profile-skills', questionCount: 2 });

    expect(sessionA.body.session.questions.every(question => question.skill === 'SQL')).toBe(true);
    expect(sessionB.body.session.questions.every(question => question.skill === 'Python')).toBe(true);
    const forbidden = await request(app).get(`/api/assessments/session/${sessionA.body.session.id}`).set('Authorization', `Bearer ${userB.body.token}`);
    expect(forbidden.status).toBe(404);
  });

  test('returns the required empty-profile message and creates no session', async () => {
    await seedQuestions();
    const user = await register('User C', 'empty@example.com');
    const response = await request(app).post('/api/assessments/session')
      .set('Authorization', `Bearer ${user.body.token}`)
      .send({ mode: 'profile-skills' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Add skills to your profile before starting a profile-skills assessment.');
  });
});
