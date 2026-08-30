const request = require('supertest');
const express = require('express');
const JobPosting = require('../../models/JobPosting');
const Student = require('../../models/Student');
const User = require('../../models/User');
const Company = require('../../models/Company');
const Opportunity = require('../../models/Opportunity');
const JobActivity = require('../../models/JobActivity');
const { syncJobs } = require('../../services/jobSources/jobAggregator');
const { syncEmployerOpportunity } = require('../../services/jobSources/employerOpportunityAdapter');

const app = express();
app.use(express.json());
app.use('/api/auth', require('../../routes/auth'));
app.use('/api/students', require('../../routes/students'));
app.use('/api/jobs', require('../../routes/jobs'));

const rawJob = {
  slug: 'example-backend-engineer',
  company_name: 'Example Systems',
  title: 'Backend Engineer',
  description: '<p>We require Node.js, SQL and Docker. Bachelor degree required. 2+ years experience in backend systems.</p>',
  remote: true,
  url: 'https://www.arbeitnow.com/jobs/example-backend-engineer',
  tags: ['API'],
  job_types: ['full-time'],
  location: 'Remote',
  created_at: 1788048000
};

const fakeProvider = items => ({
  getSourceMetadata: () => ({ name: 'Arbeitnow', type: 'external-api' }),
  fetchJobs: async () => items
});

async function registerStudent() {
  return request(app).post('/api/auth/register').send({
    name: 'Job Student', email: 'job-student@example.com', password: 'SecurePass123',
    confirmPassword: 'SecurePass123', role: 'student'
  });
}

describe('Real job posting proof slice', () => {
  test('normalizes, stores, and updates a provider-shaped posting without duplication', async () => {
    const first = await syncJobs({ providers: [fakeProvider([rawJob])], now: new Date('2026-08-30') });
    const second = await syncJobs({ providers: [fakeProvider([{ ...rawJob, location: 'Berlin or Remote' }])], now: new Date('2026-08-31') });
    const stored = await JobPosting.findOne();

    expect(first[0]).toMatchObject({ status: 'success', fetched: 1, inserted: 1 });
    expect(second[0]).toMatchObject({ status: 'success', fetched: 1, updated: 1 });
    expect(await JobPosting.countDocuments()).toBe(1);
    expect(stored.location).toBe('Berlin or Remote');
    expect(stored.sourceUrl).toBe(rawJob.url);
    expect(stored.rawSourceText).toContain('Node.js');
    expect(stored.requiredSkills.map(skill => skill.normalizedName)).toEqual(expect.arrayContaining(['node.js', 'sql', 'docker', 'api']));
  });

  test('lists the persisted posting with source traceability', async () => {
    await syncJobs({ providers: [fakeProvider([rawJob])], now: new Date('2026-08-30') });
    const response = await request(app).get('/api/jobs?remote=true&company=example');

    expect(response.status).toBe(200);
    expect(response.body.pagination.total).toBe(1);
    expect(response.body.jobs[0]).toMatchObject({ sourceName: 'Arbeitnow', sourceType: 'external-api', companyName: 'Example Systems' });
  });

  test('compares explicit posting requirements with the authenticated persisted profile', async () => {
    await syncJobs({ providers: [fakeProvider([rawJob])], now: new Date('2026-08-30') });
    const job = await JobPosting.findOne();
    const registration = await registerStudent();
    await request(app).put('/api/students/me/profile')
      .set('Authorization', `Bearer ${registration.body.token}`)
      .send({ degree: 'B.Tech', branch: 'CSE', skills: [{ name: 'Node.js' }, { name: 'SQL' }] });
    const student = await Student.findOne({ userId: registration.body.user.id });
    student.skills.find(skill => skill.name === 'Node.js').evidence.push({ type: 'project', title: 'API', date: new Date('2026-08-01') });
    await student.save();

    const response = await request(app).get(`/api/jobs/${job._id}/compare`)
      .set('Authorization', `Bearer ${registration.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body.comparison.matchedSkills.map(skill => skill.name)).toEqual(expect.arrayContaining(['node.js', 'sql']));
    expect(response.body.comparison.missingSkills.map(skill => skill.name)).toEqual(expect.arrayContaining(['docker', 'API']));
    expect(response.body.comparison.matchedSkills.find(skill => skill.name === 'node.js').evidenceBacked).toBe(true);
    expect(response.body.comparison.eligibilityStatus).toBe('review-required');
    expect(response.body.comparison.explanation).toContain('explicitly observed skills');
  });

  test('records provider failure without deleting existing jobs', async () => {
    await syncJobs({ providers: [fakeProvider([rawJob])] });
    const failedProvider = { getSourceMetadata: () => ({ name: 'Arbeitnow' }), fetchJobs: async () => { throw new Error('temporary outage'); } };
    const result = await syncJobs({ providers: [failedProvider] });

    expect(result[0].status).toBe('failed');
    expect(result[0].syncErrors[0]).toContain('temporary outage');
    expect(await JobPosting.countDocuments()).toBe(1);
  });

  test('persists isolated target-company goals and uses them in recommendations', async () => {
    await syncJobs({ providers: [fakeProvider([rawJob])] });
    const studentA = await registerStudent();
    const studentB = await request(app).post('/api/auth/register').send({ name: 'Other Student', email: 'other-job@example.com', password: 'SecurePass123', confirmPassword: 'SecurePass123', role: 'student' });
    const saved = await request(app).put('/api/students/me/company-goal').set('Authorization', `Bearer ${studentA.body.token}`).send({ companyName: 'Example Systems', role: 'Backend Engineer' });
    const recommendations = await request(app).get('/api/jobs/recommended/me').set('Authorization', `Bearer ${studentA.body.token}`);
    const otherGoal = await request(app).get('/api/students/me/company-goal').set('Authorization', `Bearer ${studentB.body.token}`);

    expect(saved.status).toBe(200);
    expect(saved.body.goal.normalizedCompanyName).toBe('example systems');
    expect(recommendations.body.recommendations[0].reasons.join(' ')).toContain('target company');
    expect(otherGoal.body.goal).toBeNull();
  });

  test('mirrors employer opportunities with stronger provenance and aggregates cited requirements', async () => {
    const industryUser = await User.create({ name: 'Industry Owner', email: 'industry-owner@example.com', password: 'hashed-placeholder', role: 'industry' });
    const company = await Company.create({ userId: industryUser._id, companyName: 'ISOTOPES Labs' });
    const opportunity = await Opportunity.create({ companyId: company._id, type: 'job', title: 'Platform Engineer', description: 'Build reliable services.', skills: [{ name: 'Docker', importance: 'critical' }], status: 'open' });
    const mirrored = await syncEmployerOpportunity(opportunity);
    const analysis = await request(app).get('/api/jobs/company-requirements/analysis?company=ISOTOPES%20Labs&role=Platform');

    expect(mirrored).toMatchObject({ sourceType: 'employer-provided', opportunityId: opportunity._id, active: true });
    expect(analysis.status).toBe(200);
    expect(analysis.body.postingCount).toBe(1);
    expect(analysis.body.requirements[0]).toMatchObject({ name: 'Docker', count: 1, observedInPercentage: 100 });
    expect(analysis.body.requirements[0].evidence[0].sourceName).toBe('ISOTOPES Employer');
  });

  test('keeps job activity private to its authenticated student and labels self reports', async () => {
    await syncJobs({ providers: [fakeProvider([rawJob])] });
    const job = await JobPosting.findOne();
    const studentA = await registerStudent();
    const studentB = await request(app).post('/api/auth/register').send({ name: 'Activity B', email: 'activity-job-b@example.com', password: 'SecurePass123', confirmPassword: 'SecurePass123', role: 'student' });
    const activity = await request(app).put(`/api/jobs/${job._id}/activity`).set('Authorization', `Bearer ${studentA.body.token}`).send({ status: 'applied-self-reported' });
    const studentARecord = await Student.findOne({ userId: studentA.body.user.id });
    const studentBRecord = await Student.findOne({ userId: studentB.body.user.id });

    expect(activity.status).toBe(200);
    expect(activity.body.selfReported).toBe(true);
    expect(await JobActivity.countDocuments({ studentId: studentARecord._id })).toBe(1);
    expect(await JobActivity.countDocuments({ studentId: studentBRecord._id })).toBe(0);
  });
});
