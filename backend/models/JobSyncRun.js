const mongoose = require('mongoose');

const JobSyncRunSchema = new mongoose.Schema({
  sourceName: { type: String, required: true, index: true },
  status: { type: String, enum: ['running', 'success', 'partial', 'failed'], default: 'running' },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  fetched: { type: Number, default: 0 },
  inserted: { type: Number, default: 0 },
  updated: { type: Number, default: 0 },
  skipped: { type: Number, default: 0 },
  syncErrors: [String]
});

module.exports = mongoose.model('JobSyncRun', JobSyncRunSchema);
