const mongoose = require('mongoose');

const AssessmentQuestionSchema = new mongoose.Schema({
  skill: { type: String, required: true, trim: true, index: true },
  topic: { type: String, required: true, trim: true },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
    index: true
  },
  questionText: { type: String, required: true, trim: true },
  questionType: { type: String, enum: ['mcq'], default: 'mcq' },
  options: {
    type: [String],
    validate: {
      validator: options => Array.isArray(options) && options.length >= 2,
      message: 'An MCQ must provide at least two options'
    }
  },
  correctAnswer: { type: String, required: true, select: false },
  explanation: String,
  sourceType: {
    type: String,
    enum: ['curated', 'verified-database', 'approved-api', 'ai'],
    default: 'curated'
  },
  sourceReference: String,
  verificationStatus: {
    type: String,
    enum: ['verified', 'pending', 'rejected'],
    default: 'pending',
    index: true
  },
  active: { type: Boolean, default: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

AssessmentQuestionSchema.index({ skill: 1, difficulty: 1, active: 1, verificationStatus: 1 });

module.exports = mongoose.model('AssessmentQuestion', AssessmentQuestionSchema);
