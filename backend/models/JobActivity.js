const mongoose = require('mongoose');

const JobActivitySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  jobPostingId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', required: true, index: true },
  status: {
    type: String,
    enum: ['saved', 'viewed', 'applied-self-reported', 'interviewing-self-reported', 'offered-self-reported', 'rejected-self-reported', 'withdrawn-self-reported'],
    required: true
  },
  notes: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: true });

JobActivitySchema.index({ studentId: 1, jobPostingId: 1 }, { unique: true });

module.exports = mongoose.model('JobActivity', JobActivitySchema);
