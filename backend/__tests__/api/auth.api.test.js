/**
 * API Tests for Authentication
 * Tests register, login, and JWT functionality
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Student = require('../../models/Student');
const Company = require('../../models/Company');

// Create minimal Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', require('../../routes/auth'));

describe('Authentication API', () => {

  describe('POST /api/auth/register', () => {
    
    test('should register a new student successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Student',
          email: 'student@test.com',
          password: 'SecurePass123',
          confirmPassword: 'SecurePass123',
          role: 'student'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('student@test.com');
      expect(response.body.user.role).toBe('student');

      // Verify user saved to DB
      const savedUser = await User.findById(response.body.user.id);
      expect(savedUser).toBeDefined();
      expect(savedUser.email).toBe('student@test.com');
    });

    test('should register a new industry user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Company',
          email: 'company@test.com',
          password: 'SecurePass123',
          confirmPassword: 'SecurePass123',
          role: 'industry'
        });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('industry');

      const savedUser = await User.findById(response.body.user.id);
      expect(savedUser.role).toBe('industry');
    });

    test('should create corresponding Student profile after student registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Profile Test',
          email: 'profile@test.com',
          password: 'SecurePass123',
          confirmPassword: 'SecurePass123',
          role: 'student'
        });

      const student = await Student.findOne({ userId: response.body.user.id });
      expect(student).toBeDefined();
    });

    test('should create corresponding Company profile after industry registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Company Profile Test',
          email: 'companyprofile@test.com',
          password: 'SecurePass123',
          confirmPassword: 'SecurePass123',
          role: 'industry'
        });

      const company = await Company.findOne({ userId: response.body.user.id });
      expect(company).toBeDefined();
    });

    test('should reject registration with duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'First User',
          email: 'duplicate@test.com',
          password: 'SecurePass123',
          confirmPassword: 'SecurePass123',
          role: 'student'
        });

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Second User',
          email: 'duplicate@test.com',
          password: 'SecurePass123',
          confirmPassword: 'SecurePass123',
          role: 'student'
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('EMAIL_ALREADY_REGISTERED');
      expect(response.body.message).toContain('account already exists');
    });

    test('should reject registration with mismatched passwords', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'mismatch@test.com',
          password: 'SecurePass123',
          confirmPassword: 'DifferentPass123',
          role: 'student'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Passwords do not match');
    });

    test('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'incomplete@test.com'
          // Missing password, confirmPassword, role
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required fields');
    });

  });

  describe('POST /api/auth/login', () => {

    beforeEach(async () => {
      // Create a user for login tests
      const user = new User({
        name: 'Login Test User',
        email: 'login@test.com',
        password: 'SecurePass123',
        role: 'student'
      });
      await user.save();
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'SecurePass123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('login@test.com');
    });

    test('should return valid JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'SecurePass123'
        });

      const token = response.body.token;
      const decoded = jwt.decode(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBeDefined();
      expect(decoded.email).toBe('login@test.com');
    });

    test('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid email or password');
    });

    test('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SecurePass123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid email or password');
    });

    test('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('email and password');
    });

    test('should reject login with empty email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: '',
          password: 'SecurePass123'
        });

      expect(response.status).toBe(400);
    });

  });

  describe('JWT Token Validation', () => {

    test('should create token with correct payload', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Token Test',
          email: 'token@test.com',
          password: 'SecurePass123',
          confirmPassword: 'SecurePass123',
          role: 'student'
        });

      const token = response.body.token;
      const decoded = jwt.decode(token);

      expect(decoded.userId).toBe(response.body.user.id);
      expect(decoded.email).toBe('token@test.com');
      expect(decoded.role).toBe('student');
      expect(decoded.exp).toBeDefined(); // Has expiration
    });

  });

});
