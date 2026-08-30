const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  headline: String,
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid contact email']
  },
  institution: String,
  degree: String,
  branch: String,
  currentYear: Number,
  graduationYear: Number,
  fieldsOfInterest: [String],
  industriesOfInterest: [String],
  preferredRoles: [String],
  targetCompanyGoal: {
    enabled: { type: Boolean, default: false },
    companyName: { type: String, trim: true },
    normalizedCompanyName: { type: String, trim: true },
    role: { type: String, trim: true },
    updatedAt: Date
  },
  primaryTargetRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CareerRole'
  },
  secondaryTargetRoles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CareerRole'
  }],
  education: [
    {
      degree: String,
      institution: String,
      startDate: Date,
      endDate: Date,
      cgpa: Number,
      description: String
    }
  ],
  experience: [
    {
      jobTitle: String,
      company: String,
      duration: String,
      description: String,
      startDate: Date,
      endDate: Date
    }
  ],
  projects: [
    {
      title: String,
      description: String,
      skills: [String],
      link: String,
      startDate: Date,
      endDate: Date
    }
  ],
  certifications: [
    {
      name: String,
      selfDeclaredLevel: String,
      confidenceLevel: Number,
      yearsOfExperience: Number,
      interestLevel: Number,
      provider: String,
      issueDate: Date,
      expiryDate: Date,
      link: String
    }
  ],
  skills: [
    {
      name: String,
      selfDeclaredLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        default: 'beginner'
      },
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        default: 'beginner'
      },
      wantToImprove: {
        type: Boolean,
        default: false
      },
      endorsements: {
        type: Number,
        default: 0
      },
      evidence: [
        {
          type: {
            type: String,
            enum: ['assessment', 'project', 'certification', 'internship'],
            default: 'assessment'
          },
          title: String,
          score: Number,
          date: Date
        }
      ]
    }
  ],
  targetRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CareerRole'
  },
  assessmentResults: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentResult'
    }
  ],
  applications: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    }
  ],
  profileCompletion: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Student', StudentSchema);
