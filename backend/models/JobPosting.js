const mongoose = require('mongoose');

const RequirementSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  normalizedName: { type: String, required: true, trim: true },
  sourceText: { type: String, required: true, trim: true }
}, { _id: false });

const JobPostingSchema = new mongoose.Schema({
  sourceName: { type: String, required: true, index: true },
  sourceType: { type: String, enum: ['external-api', 'employer-provided'], required: true },
  externalId: { type: String, required: true },
  canonicalKey: { type: String, required: true, unique: true },
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
  companyName: { type: String, required: true, trim: true, index: true },
  normalizedCompanyName: { type: String, required: true, trim: true, index: true },
  title: { type: String, required: true, trim: true },
  normalizedRole: { type: String, required: true, trim: true, index: true },
  description: { type: String, trim: true },
  rawSourceText: { type: String, required: true },
  requiredSkills: [RequirementSchema],
  preferredSkills: [RequirementSchema],
  educationRequirements: [{ sourceText: { type: String, required: true } }],
  experienceRequirements: [{ sourceText: { type: String, required: true } }],
  location: String,
  remote: { type: Boolean, default: false },
  employmentTypes: [String],
  sourceUrl: { type: String, required: true },
  applicationUrl: String,
  postedAt: Date,
  lastFetchedAt: { type: Date, required: true },
  active: { type: Boolean, default: true, index: true },
  dataQuality: { type: String, enum: ['source-observed', 'partial', 'stale'], default: 'partial' }
}, { timestamps: true });

JobPostingSchema.index({ sourceName: 1, externalId: 1 }, { unique: true });

module.exports = mongoose.model('JobPosting', JobPostingSchema);
