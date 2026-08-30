const mongoose = require('mongoose');

const HackathonParticipationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  hackathonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hackathon',
    default: null
  },
  hackathonName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  date: {
    type: Date,
    required: true
  },
  role: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  projectName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  techStackUsed: [{
    type: String,
    trim: true,
    maxlength: 80
  }],
  outcome: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  }
}, { timestamps: true });

HackathonParticipationSchema.index({ studentId: 1, date: -1 });

module.exports = mongoose.model('HackathonParticipation', HackathonParticipationSchema);
