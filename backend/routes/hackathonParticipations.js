const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Hackathon = require('../models/Hackathon');
const HackathonParticipation = require('../models/HackathonParticipation');
const Student = require('../models/Student');
const { auth, authorize } = require('../middleware/auth');

const clean = (value, maxLength) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);

function normalizeTechStack(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Map(values.map(item => clean(item, 80)).filter(Boolean).map(item => [item.toLowerCase(), item])).values()].slice(0, 30);
}

async function studentFor(userId) {
  return Student.findOne({ userId }).select('_id');
}

async function participationPayload(body) {
  const date = new Date(body.date);
  if (!body.date || Number.isNaN(date.getTime())) throw Object.assign(new Error('A valid participation date is required'), { status: 400 });
  if (date > new Date()) throw Object.assign(new Error('Participation date cannot be in the future'), { status: 400 });
  const payload = {
    hackathonName: clean(body.hackathonName, 200),
    date,
    role: clean(body.role, 120),
    projectName: clean(body.projectName, 200),
    techStackUsed: normalizeTechStack(body.techStackUsed),
    outcome: clean(body.outcome, 120)
  };
  for (const field of ['hackathonName', 'role', 'projectName', 'outcome']) {
    if (!payload[field]) throw Object.assign(new Error(`${field} is required`), { status: 400 });
  }
  if (body.hackathonId) {
    if (!mongoose.isValidObjectId(body.hackathonId) || !await Hackathon.exists({ _id: body.hackathonId })) {
      throw Object.assign(new Error('Referenced hackathon was not found'), { status: 400 });
    }
    payload.hackathonId = body.hackathonId;
  }
  return payload;
}

function publicParticipation(document) {
  const value = document.toObject ? document.toObject() : document;
  return { id: value._id, hackathonId: value.hackathonId, hackathonName: value.hackathonName, date: value.date, role: value.role, projectName: value.projectName, techStackUsed: value.techStackUsed, outcome: value.outcome, createdAt: value.createdAt, updatedAt: value.updatedAt };
}

router.get('/', auth, authorize('student'), async (req, res) => {
  try {
    const student = await studentFor(req.user.userId);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    const participations = await HackathonParticipation.find({ studentId: student._id }).sort({ date: -1, createdAt: -1 });
    res.json({ success: true, count: participations.length, participations: participations.map(publicParticipation) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hackathon participations: ' + error.message });
  }
});

router.post('/', auth, authorize('student'), async (req, res) => {
  try {
    const student = await studentFor(req.user.userId);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    const payload = await participationPayload(req.body);
    const participation = await HackathonParticipation.create({ studentId: student._id, ...payload });
    res.status(201).json({ success: true, participation: publicParticipation(participation) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to add hackathon participation' });
  }
});

router.put('/:id', auth, authorize('student'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Participation not found' });
    const student = await studentFor(req.user.userId);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    const payload = await participationPayload(req.body);
    const participation = await HackathonParticipation.findOneAndUpdate({ _id: req.params.id, studentId: student._id }, { $set: payload }, { new: true, runValidators: true });
    if (!participation) return res.status(404).json({ error: 'Participation not found' });
    res.json({ success: true, participation: publicParticipation(participation) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to update hackathon participation' });
  }
});

router.delete('/:id', auth, authorize('student'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Participation not found' });
    const student = await studentFor(req.user.userId);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    const deleted = await HackathonParticipation.findOneAndDelete({ _id: req.params.id, studentId: student._id });
    if (!deleted) return res.status(404).json({ error: 'Participation not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hackathon participation: ' + error.message });
  }
});

module.exports = router;
