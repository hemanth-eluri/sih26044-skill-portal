const mongoose = require('mongoose');

const AssessmentSessionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  mode: {
    type: String,
    enum: ['profile-skills', 'target-role', 'custom'],
    required: true
  },
  selectedSkills: [{ type: String, required: true }],
  questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentQuestion' }],
  responses: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentQuestion' },
    selectedAnswer: String
  }],
  status: {
    type: String,
    enum: ['created', 'in-progress', 'completed', 'scored'],
    default: 'created',
    index: true
  },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  resultId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentResult' }
}, { timestamps: true });

module.exports = mongoose.model('AssessmentSession', AssessmentSessionSchema);
