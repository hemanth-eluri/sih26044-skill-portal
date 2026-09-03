const mongoose = require('mongoose');

const OpportunitySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  type: {
    type: String,
    enum: ['internship', 'job', 'fellowship'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  skills: [
    {
      name: String,
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        default: 'intermediate'
      },
      importance: {
        type: String,
        default: 'medium'
      }
    }
  ],
  requiredSkills: [
    {
      name: String,
      level: {
        type: String,
        default: 'intermediate'
      },
      importance: {
        type: String,
        default: 'medium'
      }
    }
  ],
  location: String,
  locationType: {
    type: String,
    default: 'hybrid'
  },
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'INR'
    }
  },
  stipend: {
    min: Number,
    max: Number
  },
  duration: String, // e.g., "3-6 months" for internship
  startDate: Date,
  endDate: Date,
  applicationDeadline: Date,
  experienceRequired: mongoose.Schema.Types.Mixed,

  education: mongoose.Schema.Types.Mixed,
  aboutRole: String,
  responsibilities: [String],
  benefits: [String],
  applicationCount: {
    type: Number,
    default: 0
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'filled'],
    default: 'open'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

OpportunitySchema.pre('validate', function(next) {
  if (!this.companyId && this.company) {
    this.companyId = this.company;
  }
  if (!this.company && this.companyId) {
    this.company = this.companyId;
  }
  if ((!this.skills || this.skills.length === 0) && this.requiredSkills && this.requiredSkills.length > 0) {
    this.skills = this.requiredSkills;
  }
  if ((!this.requiredSkills || this.requiredSkills.length === 0) && this.skills && this.skills.length > 0) {
    this.requiredSkills = this.skills;
  }
  if (this.isOpen !== undefined && !this.status) {
    this.status = this.isOpen ? 'open' : 'closed';
  }
  if (this.status) {
    this.isOpen = (this.status === 'open');
  }
  if (!this.companyId && !this.company) {
    return next(new Error('companyId or company is required'));
  }
  next();
});

module.exports = mongoose.model('Opportunity', OpportunitySchema);

