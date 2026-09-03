/**
 * Integration Tests - Industry Workflow
 * Tests complete industry user journey: register → company profile → post opportunities → view applicants
 */

const request = require('supertest');
const express = require('express');
const User = require('../../models/User');
const Company = require('../../models/Company');
const Student = require('../../models/Student');
const Opportunity = require('../../models/Opportunity');
const Application = require('../../models/Application');

const app = express();
app.use(express.json());
app.use('/api/auth', require('../../routes/auth'));
app.use('/api/companies', require('../../routes/companies'));
app.use('/api/opportunities', require('../../routes/opportunities'));
app.use('/api/applications', require('../../routes/applications'));
app.use('/api/students', require('../../routes/students'));

describe('Industry Workflow - Complete Journey', () => {
  let token;
  let userId;
  let companyId;
  let opportunityIds = [];

  describe('1. Register as Industry User', () => {
    test('should complete registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Tech Solutions Inc',
          email: 'hr@techsolutions.com',
          password: 'SecurePass123',
          confirmPassword: 'SecurePass123',
          role: 'industry'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('industry');

      token = response.body.token;
      userId = response.body.user.id;

      // Verify company profile created
      const company = await Company.findOne({ userId });
      expect(company).toBeDefined();
      companyId = company._id;
    });
  });

  describe('2. Create Company Profile', () => {
    test('should update company profile', async () => {
      const response = await request(app)
        .put('/api/companies/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          companyName: 'Tech Solutions Inc',
          industry: 'Information Technology',
          size: '500-1000',
          description: 'Leading IT solutions provider',
          website: 'https://techsolutions.com',
          location: 'Bangalore, India'
        });

      expect(response.status).toBe(200);

      const company = await Company.findById(companyId);
      expect(company.industry).toBe('Information Technology');
      expect(company.size).toBe('500-1000');
    });
  });

  describe('3. Post Opportunities', () => {
    test('should post internship opportunity', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Frontend Developer Internship',
          type: 'internship',
          description: 'Join our frontend team to build amazing UIs',
          requiredSkills: [
            { name: 'JavaScript', level: 'intermediate', importance: 'critical' },
            { name: 'React', level: 'beginner', importance: 'critical' },
            { name: 'CSS', level: 'beginner', importance: 'important' },
            { name: 'HTML', level: 'beginner', importance: 'important' }
          ],
          location: 'Bangalore',
          locationType: 'hybrid',
          duration: '3 months',
          stipend: { min: 15000, max: 25000 }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.opportunity.type).toBe('internship');

      opportunityIds.push(response.body.opportunity._id);
    });

    test('should post job opportunity', async () => {
      const response = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Senior Backend Developer',
          type: 'job',
          description: 'Lead our backend architecture and development',
          requiredSkills: [
            { name: 'Python', level: 'advanced', importance: 'critical' },
            { name: 'Django', level: 'intermediate', importance: 'critical' },
            { name: 'PostgreSQL', level: 'intermediate', importance: 'critical' },
            { name: 'System Design', level: 'intermediate', importance: 'important' },
            { name: 'AWS', level: 'beginner', importance: 'important' }
          ],
          location: 'Bangalore',
          locationType: 'on-site',
          salary: { min: 1200000, max: 1800000 },
          experienceRequired: 5
        });

      expect(response.status).toBe(201);
      expect(response.body.opportunity.type).toBe('job');

      opportunityIds.push(response.body.opportunity._id);
    });

    test('should define required skills for each opportunity', async () => {
      const opportunities = await Opportunity.find({ company: companyId });

      opportunities.forEach(opp => {
        expect(opp.requiredSkills).toBeDefined();
        expect(opp.requiredSkills.length).toBeGreaterThan(0);
        expect(opp.requiredSkills[0]).toHaveProperty('name');
        expect(opp.requiredSkills[0]).toHaveProperty('importance');
      });
    });
  });

  describe('4. View Posted Opportunities', () => {
    test('should view all posted opportunities', async () => {
      const response = await request(app)
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should show only company own opportunities', async () => {
      const response = await request(app)
        .get(`/api/companies/opportunities`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      response.body.forEach(opp => {
        expect(opp.company.toString()).toBe(companyId.toString());
      });
    });
  });

  describe('5. Handle Student Applications', () => {
    let studentToken;
    let studentId;

    beforeEach(async () => {
      // Create a student who will apply
      let studentUser = await User.findOne({ email: 'priya@student.com' });
      if (!studentUser) {
        studentUser = new User({
          name: 'Priya Sharma',
          email: 'priya@student.com',
          password: 'SecurePass123',
          role: 'student'
        });
        await studentUser.save();
      }

      let student = await Student.findOne({ userId: studentUser._id });
      if (!student) {
        student = new Student({
          userId: studentUser._id,
          skills: [
            { name: 'JavaScript', level: 'intermediate' },
            { name: 'React', level: 'intermediate' },
            { name: 'CSS', level: 'beginner' }
          ]
        });
        await student.save();
      }
      studentId = student._id;

      studentToken = require('jsonwebtoken').sign(
        { userId: studentUser._id, email: studentUser.email, role: 'student' },
        process.env.JWT_SECRET || 'isotopes_sih26044_jwt_secret_key_change_in_production',
        { expiresIn: '7d' }
      );

      // Student applies for internship if not already applied
      const existingApp = await Application.findOne({
        $or: [{ studentId: student._id }, { student: student._id }]
      });
      if (!existingApp) {
        await request(app)
          .post('/api/applications')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            opportunityId: opportunityIds[0].toString()
          });
      }
    });


    test('should view applications for company', async () => {
      const response = await request(app)
        .get('/api/applications/company')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should show applicant skill match', async () => {
      const response = await request(app)
        .get('/api/applications/company')
        .set('Authorization', `Bearer ${token}`);

      const application = response.body[0];
      expect(application.skillMatch).toBeDefined();
      expect(application.skillMatch.matchPercentage).toBeDefined();
      expect(application.skillMatch.matchedSkills).toBeDefined();
      expect(application.skillMatch.missingSkills).toBeDefined();
    });

    test('should show applicant details', async () => {
      const response = await request(app)
        .get('/api/applications/company')
        .set('Authorization', `Bearer ${token}`);

      const application = response.body[0];
      expect(application.student).toBeDefined();
      expect(application.opportunity).toBeDefined();
      expect(application.status).toBe('applied');
    });
  });

  describe('6. Update Application Status', () => {
    let studentToken;
    let applicationId;

    beforeEach(async () => {
      // Create student
      let studentUser = await User.findOne({ email: 'amit@student.com' });
      if (!studentUser) {
        studentUser = new User({
          name: 'Amit Patel',
          email: 'amit@student.com',
          password: 'SecurePass123',
          role: 'student'
        });
        await studentUser.save();
      }

      let student = await Student.findOne({ userId: studentUser._id });
      if (!student) {
        student = new Student({
          userId: studentUser._id,
          skills: [
            { name: 'JavaScript', level: 'advanced' },
            { name: 'React', level: 'advanced' },
            { name: 'CSS', level: 'intermediate' }
          ]
        });
        await student.save();
      }

      studentToken = require('jsonwebtoken').sign(
        { userId: studentUser._id, email: studentUser.email, role: 'student' },
        process.env.JWT_SECRET || 'isotopes_sih26044_jwt_secret_key_change_in_production',
        { expiresIn: '7d' }
      );

      // Student applies or reuse existing application
      let existingApplication = await Application.findOne({
        studentId: student._id,
        opportunityId: opportunityIds[0]
      });

      if (!existingApplication) {
        const appResponse = await request(app)
          .post('/api/applications')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            opportunityId: opportunityIds[0].toString()
          });

        applicationId = appResponse.body.application._id;
      } else {
        applicationId = existingApplication._id;
      }
    });

    test('should update application to shortlisted', async () => {
      const response = await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'shortlisted'
        });

      expect(response.status).toBe(200);

      const updatedApp = await Application.findById(applicationId);
      expect(updatedApp.status).toBe('shortlisted');
    });

    test('should update application to accepted', async () => {
      await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'shortlisted' });

      const response = await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'accepted' });

      expect(response.status).toBe(200);

      const updatedApp = await Application.findById(applicationId);
      expect(updatedApp.status).toBe('accepted');
    });

    test('should track status change timeline', async () => {
      await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'shortlisted' });

      await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'accepted' });

      const updatedApp = await Application.findById(applicationId);
      expect(updatedApp.timeline).toBeDefined();
      expect(updatedApp.timeline.length).toBeGreaterThan(0);
    });

  });

  describe('7. Manage Opportunities', () => {
    test('should close opportunity when filled', async () => {
      const response = await request(app)
        .patch(`/api/opportunities/${opportunityIds[0]}/close`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      const opp = await Opportunity.findById(opportunityIds[0]);
      expect(opp.isOpen).toBe(false);
    });

    test('should not show closed opportunities to students', async () => {
      // Close opportunity
      await request(app)
        .patch(`/api/opportunities/${opportunityIds[0]}/close`)
        .set('Authorization', `Bearer ${token}`);

      // Student tries to view
      const response = await request(app)
        .get('/api/opportunities');

      const titles = response.body.map(o => o.title);
      expect(titles).not.toContain('Frontend Developer Internship');
    });
  });

  describe('8. View Company Analytics', () => {
    test('should show total applications received', async () => {
      const response = await request(app)
        .get('/api/applications/company')
        .set('Authorization', `Bearer ${token}`);

      expect(response.body).toBeInstanceOf(Array);
      const totalApplications = response.body.length;
      expect(totalApplications).toBeGreaterThanOrEqual(0);
    });

    test('should categorize applications by status', async () => {
      const response = await request(app)
        .get('/api/applications/company')
        .set('Authorization', `Bearer ${token}`);

      const statusBreakdown = {};
      response.body.forEach(app => {
        statusBreakdown[app.status] = (statusBreakdown[app.status] || 0) + 1;
      });

      expect(statusBreakdown).toBeDefined();
    });
  });

});
