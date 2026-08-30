const mongoose = require('mongoose');

const RoadmapTaskSchema = new mongoose.Schema({
  key: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  skill: String,
  source: { type: String, enum: ['TARGET_ROLE', 'TARGET_COMPANY', 'ASSESSMENT', 'PROFILE'], required: true },
  evidence: { type: String, required: true },
  status: { type: String, enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'], default: 'NOT_STARTED' },
  completedAt: Date
}, { _id: true });

const CareerRoadmapSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  targetRoleId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareerRole' },
  targetRoleTitle: String,
  targetCompanyName: String,
  targetDate: Date,
  tasks: [RoadmapTaskSchema],
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('CareerRoadmap', CareerRoadmapSchema);
