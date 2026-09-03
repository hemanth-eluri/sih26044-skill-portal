/**
 * API Tests for Applications
 * Tests job/internship applications and tracking
 */

const request = require('supertest');
const express = require('express');
const User = require('../../models/User');
const Student = require('../../models/Student');
const Company = require('../../models/Company');
const Opportunity = require('../../models/Opportunity');
const Application = require('../../models/Application');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/api/applications', require('../../routes/applications'));

describe('Application API', () => {
  let studentToken;
  let studentId;
  let industryToken;
  let opportunityId;
  let companyId;

  beforeEach(async () => {
    // Create student
    const studentUser = new User({
      name: 'Test Student',
      email: 'appstudent@test.com',
      password: 'SecurePass123',
      role: 'student'
    });
    await studentUser.save();

    const student = new Student({
      userId: studentUser._id,
      skills: [
        { name: 'JavaScript', level: 'intermediate' },
        { name: 'React', level: 'intermediate' }
      ]
    });
    await student.save();
    studentId = student._id;

    studentToken = jwt.sign(
      { userId: studentUser._id, email: studentUser.email, role: 'student' },
      process.env.JWT_SECRET || 'isotopes_sih26044_jwt_secret_key_change_in_production',
      { expiresIn: '7d' }
    );

    // Create company
    const companyUser = new User({
      name: 'Test Company',
      email: 'appcompany@test.com',
      password: 'SecurePass123',
      role: 'industry'
    });
    await companyUser.save();

    const company = new Company({
      userId: companyUser._id,
      companyName: 'Tech Corp'
    });
    await company.save();
    companyId = company._id;

    industryToken = jwt.sign(
      { userId: companyUser._id, email: companyUser.email, role: 'industry' },
      process.env.JWT_SECRET || 'isotopes_sih26044_jwt_secret_key_change_in_production',
      { expiresIn: '7d' }
    );

    // Create opportunity
    const opp = new Opportunity({
      title: 'Frontend Developer',
      type: 'internship',
      company: company._id,
      description: 'Frontend role',
      requiredSkills: [
        { name: 'JavaScript', importance: 'critical' },
        { name: 'React', importance: 'critical' },
        { name: 'CSS', importance: 'important' }
      ],
      location: 'Remote',
      isOpen: true
    });
    await opp.save();
    opportunityId = opp._id;
  });

  describe('POST /api/applications', () => {

    test('should apply for opportunity as student', async () => {
      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.application.student.toString()).toBe(studentId.toString());
      expect(response.body.application.opportunity.toString()).toBe(opportunityId.toString());
    });

    test('should calculate skill match on application', async () => {
      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      expect(response.body.application.skillMatch).toBeDefined();
      expect(response.body.application.skillMatch.matchPercentage).toBeDefined();
      expect(response.body.application.skillMatch.matchPercentage).toBe(66); // 2/3 skills
    });

    test('should identify matched and missing skills', async () => {
      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      expect(response.body.application.skillMatch.matchedSkills).toContain('JavaScript');
      expect(response.body.application.skillMatch.matchedSkills).toContain('React');
      expect(response.body.application.skillMatch.missingSkills).toContain('CSS');
    });

    test('should set initial status to applied', async () => {
      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      expect(response.body.application.status).toBe('applied');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send({
          opportunityId: opportunityId.toString()
        });

      expect(response.status).toBe(401);
    });

    test('should prevent duplicate applications', async () => {
      // First application
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      // Duplicate application
      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already applied');
    });

  });

  describe('GET /api/applications/student', () => {

    test('should get student applications', async () => {
      // Create application first
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      const response = await request(app)
        .get('/api/applications/student')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].opportunity.title).toBe('Frontend Developer');
    });

    test('should show skill match in application list', async () => {
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      const response = await request(app)
        .get('/api/applications/student')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.body[0].skillMatch.matchPercentage).toBe(66);
    });

    test('should filter by status', async () => {
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      const response = await request(app)
        .get('/api/applications/student?status=applied')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.body.length).toBe(1);
      expect(response.body[0].status).toBe('applied');
    });

  });

  describe('GET /api/applications/company', () => {

    test('should get company applications', async () => {
      // Student applies
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      const response = await request(app)
        .get('/api/applications/company')
        .set('Authorization', `Bearer ${industryToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
    });

    test('should show skill match for company', async () => {
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      const response = await request(app)
        .get('/api/applications/company')
        .set('Authorization', `Bearer ${industryToken}`);

      expect(response.body[0].skillMatch.matchPercentage).toBeDefined();
    });

  });

  describe('PATCH /api/applications/:id/status', () => {

    test('should update application status', async () => {
      const appResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      const appId = appResponse.body.application._id;

      const response = await request(app)
        .patch(`/api/applications/${appId}/status`)
        .set('Authorization', `Bearer ${industryToken}`)
        .send({
          status: 'shortlisted'
        });

      expect(response.status).toBe(200);

      const updatedApplication = await Application.findById(appId);
      expect(updatedApplication.status).toBe('shortlisted');
    });


    test('should only allow company to update status', async () => {
      const appResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      const appId = appResponse.body.application._id;

      // Student tries to update
      const response = await request(app)
        .patch(`/api/applications/${appId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          status: 'shortlisted'
        });

      expect(response.status).toBe(403);
    });

    test('should accept valid status updates', async () => {
      const appResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      const appId = appResponse.body.application._id;
      const validStatuses = ['shortlisted', 'rejected', 'accepted'];

      for (const status of validStatuses) {
        const response = await request(app)
          .patch(`/api/applications/${appId}/status`)
          .set('Authorization', `Bearer ${industryToken}`)
          .send({ status });

        expect(response.status).toBe(200);
      }
    });

  });

  describe('Application Timeline', () => {

    test('should track application status changes', async () => {
      const appResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      const appId = appResponse.body.application._id;

      await request(app)
        .patch(`/api/applications/${appId}/status`)
        .set('Authorization', `Bearer ${industryToken}`)
        .send({ status: 'shortlisted' });

      const updatedApp = await Application.findById(appId);
      expect(updatedApp.timeline).toBeDefined();
      expect(updatedApp.timeline.length).toBeGreaterThan(0);
    });


  });

});
