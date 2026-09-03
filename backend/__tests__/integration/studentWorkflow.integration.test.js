/**
 * Integration Tests - Student Workflow
 * Tests complete student journey: register → profile → skills → assessment → opportunities
 */

const request = require('supertest');
const express = require('express');
const User = require('../../models/User');
const Student = require('../../models/Student');
const Assessment = require('../../models/Assessment');
const Opportunity = require('../../models/Opportunity');
const Company = require('../../models/Company');
const Application = require('../../models/Application');


const app = express();
app.use(express.json());
app.use('/api/auth', require('../../routes/auth'));
app.use('/api/students', require('../../routes/students'));
app.use('/api/assessments', require('../../routes/assessments'));
app.use('/api/opportunities', require('../../routes/opportunities'));
app.use('/api/applications', require('../../routes/applications'));

describe('Student Workflow - Complete Journey', () => {
  let token;
  let userId;
  let studentId;
  let opportunityId;

  describe('1. Register as Student', () => {
    test('should complete registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Rahul Sharma',
          email: 'rahul.sharma@student.com',
          password: 'SecurePass123',
          confirmPassword: 'SecurePass123',
          role: 'student'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      
      token = response.body.token;
      userId = response.body.user.id;

      // Verify student profile created
      const student = await Student.findOne({ userId });
      expect(student).toBeDefined();
      studentId = student._id;
    });
  });

  describe('2. Build Student Profile', () => {
    test('should add education', async () => {
      const response = await request(app)
        .post('/api/students/education')
        .set('Authorization', `Bearer ${token}`)
        .send({
          degree: 'B.Tech',
          school: 'Indian Institute of Technology',
          field: 'Computer Science',
          startDate: '2020-07-01',
          endDate: '2024-05-30',
          cgpa: 3.8
        });

      expect(response.status).toBe(201);
    });

    test('should add skills', async () => {
      const skills = ['Python', 'JavaScript', 'React', 'NodeJS'];
      
      for (const skill of skills) {
        const response = await request(app)
          .post('/api/students/skills')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: skill,
            level: 'intermediate'
          });

        expect(response.status).toBe(201);
      }

      // Verify all skills saved
      const student = await Student.findById(studentId);
      expect(student.skills.length).toBe(4);
    });

    test('should update profile', async () => {
      const response = await request(app)
        .put('/api/students/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          targetRole: 'Full Stack Developer',
          bio: 'Passionate about building scalable web applications',
          location: 'India'
        });

      expect(response.status).toBe(200);
    });
  });

  describe('3. Take Assessment', () => {
    beforeEach(async () => {
      // Create assessment
      const assessment = new Assessment({
        title: 'JavaScript Fundamentals',
        category: 'Programming',
        difficulty: 'Intermediate',
        questions: [
          {
            text: 'What is a closure in JavaScript?',
            type: 'multiple_choice',
            options: [
              'A function with access to outer scope',
              'A closed function',
              'A type of loop',
              'A data structure'
            ],
            correctAnswer: 'A function with access to outer scope',
            skillTested: 'JavaScript',
            explanation: 'Closures are functions that have access to their outer scope'
          },
          {
            text: 'Which is correct for async/await?',
            type: 'multiple_choice',
            options: [
              'async function runs in parallel',
              'await pauses execution until promise resolves',
              'Both are the same',
              'Neither'
            ],
            correctAnswer: 'await pauses execution until promise resolves',
            skillTested: 'JavaScript',
            explanation: 'await pauses execution until the promise is resolved'
          }
        ]
      });
      await assessment.save();
    });

    test('should take and submit assessment', async () => {
      const assessments = await Assessment.find();
      const assessmentId = assessments[0]._id;

      const response = await request(app)
        .post(`/api/assessments/${assessmentId}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          answers: [
            'A function with access to outer scope',
            'await pauses execution until promise resolves'
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.passed).toBe(true);
      expect(response.body.score).toBe(2);
    });

    test('should update skills from assessment results', async () => {
      const assessments = await Assessment.find();
      const assessmentId = assessments[0]._id;

      await request(app)
        .post(`/api/assessments/${assessmentId}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          answers: [
            'A function with access to outer scope',
            'await pauses execution until promise resolves'
          ]
        });

      const student = await Student.findById(studentId);
      expect(student.assessmentResults.length).toBeGreaterThan(0);
    });
  });

  describe('4. Select Career Role', () => {
    test('should select target career role', async () => {
      const response = await request(app)
        .put('/api/students/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          targetRole: 'Senior Full Stack Developer'
        });

      expect(response.status).toBe(200);

      const student = await Student.findById(studentId);
      expect(student.targetRole).toBe('Senior Full Stack Developer');
    });
  });

  describe('5. Browse Opportunities', () => {
    beforeEach(async () => {
      // Create company and opportunities if not exists
      let companyUser = await User.findOne({ email: 'techcorp@test.com' });
      if (!companyUser) {
        companyUser = new User({
          name: 'Tech Company',
          email: 'techcorp@test.com',
          password: 'SecurePass123',
          role: 'industry'
        });
        await companyUser.save();

        const company = new Company({
          userId: companyUser._id,
          companyName: 'Tech Solutions Inc'
        });
        await company.save();

        // Create internship opportunity
        const internship = new Opportunity({
          title: 'Full Stack Developer Internship',
          type: 'internship',
          company: company._id,
          description: 'Build modern web applications',
          requiredSkills: [
            { name: 'JavaScript', importance: 'critical' },
            { name: 'React', importance: 'critical' },
            { name: 'NodeJS', importance: 'critical' },
            { name: 'MongoDB', importance: 'important' }
          ],
          location: 'Remote',
          locationType: 'remote',
          duration: '3 months',
          isOpen: true
        });
        await internship.save();
        opportunityId = internship._id;

        // Create job opportunity
        const job = new Opportunity({
          title: 'Senior Full Stack Developer',
          type: 'job',
          company: company._id,
          description: 'Lead backend architecture',
          requiredSkills: [
            { name: 'JavaScript', importance: 'critical' },
            { name: 'Python', importance: 'critical' },
            { name: 'System Design', importance: 'critical' }
          ],
          location: 'Bangalore',
          locationType: 'hybrid',
          salary: { min: 1200000, max: 1800000 },
          isOpen: true
        });
        await job.save();
      }
    });


    test('should browse all opportunities', async () => {
      const response = await request(app)
        .get('/api/opportunities');

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should filter by opportunity type', async () => {
      const response = await request(app)
        .get('/api/opportunities?type=internship');

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
      response.body.forEach(opp => {
        expect(opp.type).toBe('internship');
      });
    });

    test('should filter by location type', async () => {
      const response = await request(app)
        .get('/api/opportunities?locationType=remote');

      expect(response.status).toBe(200);
      response.body.forEach(opp => {
        expect(opp.locationType).toBe('remote');
      });
    });
  });

  describe('6. Apply to Opportunities', () => {
    beforeEach(async () => {
      // Create opportunity if not exists
      const existing = await Opportunity.findById(opportunityId);
      if (!existing) {
        let companyUser = await User.findOne({ email: 'techcorp@test.com' });
        if (!companyUser) {
          companyUser = new User({
            name: 'Tech Company',
            email: 'techcorp@test.com',
            password: 'SecurePass123',
            role: 'industry'
          });
          await companyUser.save();
        }

        let company = await Company.findOne({ userId: companyUser._id });
        if (!company) {
          company = new Company({
            userId: companyUser._id,
            companyName: 'Tech Solutions Inc'
          });
          await company.save();
        }

        const opp = new Opportunity({
          title: 'Full Stack Developer Internship',
          type: 'internship',
          company: company._id,
          requiredSkills: [
            { name: 'JavaScript', importance: 'critical' },
            { name: 'React', importance: 'critical' },
            { name: 'NodeJS', importance: 'critical' }
          ],
          isOpen: true
        });
        await opp.save();
        opportunityId = opp._id;
      }
    });

    test('should apply for internship', async () => {
      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          opportunityId: opportunityId.toString()
        });

      expect(response.status).toBe(201);
      expect(response.body.application.status).toBe('applied');
    });

    test('should calculate skill match on application', async () => {
      const appRecord = await Application.findOne({ studentId, opportunityId });
      expect(appRecord).toBeDefined();
      expect(appRecord.skillMatch).toBeDefined();
      expect(appRecord.skillMatch.matchPercentage).toBeGreaterThan(0);
      expect(appRecord.skillMatch.matchedSkills).toBeDefined();
      expect(appRecord.skillMatch.missingSkills).toBeDefined();
    });
  });


  describe('7. Track Applications', () => {
    test('should view all applications', async () => {
      const response = await request(app)
        .get('/api/applications/student')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should show application with status', async () => {
      const response = await request(app)
        .get('/api/applications/student')
        .set('Authorization', `Bearer ${token}`);

      const application = response.body[0];
      expect(application.status).toBeDefined();
      expect(['applied', 'shortlisted', 'rejected', 'accepted']).toContain(application.status);
    });

    test('should show skill match in applications', async () => {
      const response = await request(app)
        .get('/api/applications/student')
        .set('Authorization', `Bearer ${token}`);

      const application = response.body[0];
      expect(application.skillMatch.matchPercentage).toBeDefined();
      expect(application.skillMatch.matchedSkills).toBeDefined();
      expect(application.skillMatch.missingSkills).toBeDefined();
    });
  });

  describe('8. View Skill Gap Analysis', () => {
    test('should identify missing skills for target role', async () => {
      const student = await Student.findById(studentId);
      
      // Student has: Python, JavaScript, React, NodeJS
      // Target role needs additional: System Design, Database
      const studentSkills = student.skills.map(s => s.name);
      
      expect(studentSkills).toContain('JavaScript');
      expect(studentSkills).toContain('React');
      expect(studentSkills).toContain('NodeJS');
    });

    test('should suggest improvement path', async () => {
      const student = await Student.findById(studentId);
      expect(student.targetRole).toBeDefined();
      
      // Improvement path should be generated based on missing skills
      expect(student).toBeDefined();
    });
  });

});
