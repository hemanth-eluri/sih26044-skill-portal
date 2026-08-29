/**
 * ISOTOPES Backend Server
 * SIH26044 - Portal for Academia–Industry Collaboration
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const connectDatabase = () => mongoose.connect(
  process.env.MONGODB_URI || 'mongodb://localhost:27017/isotopes'
);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/assessments', require('./routes/assessments'));
app.use('/api/career-roles', require('./routes/careerRoles'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/opportunities', require('./routes/opportunities'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/companies', require('./routes/companies'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running ✅' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ISOTOPES Backend API',
    version: '1.0.0',
    problem: 'SIH26044',
    description: 'Portal for Academia–Industry Collaboration for Skill Mapping, Internships and Placement'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Only connect and listen when this file is started directly. This keeps the
// Express app reusable by Supertest and prevents tests from opening a second
// database connection or HTTP server.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectDatabase()
    .then(() => {
      console.log('✅ MongoDB Connected');
      app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    })
    .catch((err) => {
      console.error('❌ MongoDB Connection Error:', err);
      process.exitCode = 1;
    });
}

module.exports = app;
module.exports.connectDatabase = connectDatabase;
