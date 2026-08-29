const mongoose = require('mongoose');

const HackathonActivitySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true, index: true },
  status: {
    type: String,
    enum: ['saved', 'interested', 'registered-self-reported', 'participating', 'completed'],
    default: 'saved'
  },
  registrationReference: String,
  notes: String
}, { timestamps: true });

HackathonActivitySchema.index({ studentId: 1, hackathonId: 1 }, { unique: true });

module.exports = mongoose.model('HackathonActivity', HackathonActivitySchema);
