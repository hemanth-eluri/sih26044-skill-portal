const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  opportunityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity'
  },
  opportunity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity'
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  status: {
    type: String,
    enum: ['applied', 'shortlisted', 'rejected', 'accepted', 'offer_received', 'offer_accepted'],
    default: 'applied'
  },
  applicationDate: {
    type: Date,
    default: Date.now
  },
  coverLetter: String,
  skillMatch: {
    matchPercentage: Number,
    matchedSkills: [String],
    missingSkills: [String],
    matchExplanation: String
  },
  timeline: [
    {
      status: String,
      date: {
        type: Date,
        default: Date.now
      },
      notes: String
    }
  ],
  interviewDetails: {
    stage: Number,
    date: Date,
    type: String,
    interviewer: String,
    feedback: String
  },
  offerDetails: {
    position: String,
    salary: Number,
    currency: String,
    startDate: Date,
    offerDate: Date,
    expiryDate: Date,
    terms: String
  },
  studentNotes: String,
  companyNotes: String,
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

ApplicationSchema.pre('validate', function(next) {
  if (!this.studentId && this.student) this.studentId = this.student;
  if (!this.student && this.studentId) this.student = this.studentId;
  if (!this.opportunityId && this.opportunity) this.opportunityId = this.opportunity;
  if (!this.opportunity && this.opportunityId) this.opportunity = this.opportunityId;
  if (!this.companyId && this.company) this.companyId = this.company;
  if (!this.company && this.companyId) this.company = this.companyId;
  next();
});

ApplicationSchema.index({ studentId: 1, opportunityId: 1 }, { unique: true });

module.exports = mongoose.model('Application', ApplicationSchema);
