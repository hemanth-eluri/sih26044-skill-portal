const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Hackathon = require('../models/Hackathon');
const HackathonActivity = require('../models/HackathonActivity');
const Student = require('../models/Student');
const { auth, authorize } = require('../middleware/auth');
const { matchHackathon } = require('../services/hackathons/hackathonMatcher');
const { syncHackathons } = require('../services/hackathons/hackathonAggregator');

const activityStatuses = ['saved', 'interested', 'registered-self-reported', 'participating', 'completed'];
const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildFilter(query) {
  const filter = {};
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: pattern }, { organizer: pattern }, { domains: pattern }];
  }
  if (query.domain) filter.domains = new RegExp(`^${escapeRegex(query.domain)}$`, 'i');
  if (query.mode) filter.mode = query.mode;
  if (query.status) filter.status = query.status;
  if (query.location) {
    const pattern = new RegExp(escapeRegex(query.location), 'i');
    filter.$or = [...(filter.$or || []), { 'location.city': pattern }, { 'location.country': pattern }, { 'location.venue': pattern }];
  }
  if (query.free === 'true') filter.isFree = true;
  if (query.free === 'false') filter.isFree = false;
  if (query.deadlineBefore || query.deadlineAfter) {
    filter.registrationDeadline = {};
    if (query.deadlineBefore) filter.registrationDeadline.$lte = new Date(query.deadlineBefore);
    if (query.deadlineAfter) filter.registrationDeadline.$gte = new Date(query.deadlineAfter);
  }
  return filter;
}

function pagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

router.get('/', async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const { page, limit, skip } = pagination(req.query);
    const sort = req.query.sort === 'deadline' ? { registrationDeadline: 1 } : req.query.sort === 'start' ? { startDate: 1 } : { createdAt: -1 };
    const [hackathons, total] = await Promise.all([Hackathon.find(filter).sort(sort).skip(skip).limit(limit), Hackathon.countDocuments(filter)]);
    res.json({ success: true, hackathons, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(400).json({ error: 'Failed to fetch hackathons: ' + err.message });
  }
});

router.get('/recommended', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.userId }).populate('targetRole').populate('primaryTargetRole');
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    const { page, limit } = pagination(req.query);
    const hackathons = await Hackathon.find(buildFilter(req.query)).limit(500);
    let ranked = hackathons.map(hackathon => ({ hackathon, recommendation: matchHackathon(student, hackathon) }));
    if (req.query.eligibleOnly === 'true') ranked = ranked.filter(item => item.recommendation.eligibilityStatus !== 'not-eligible');
    ranked.sort((a, b) => b.recommendation.matchScore - a.recommendation.matchScore || new Date(a.hackathon.startDate || 8640000000000000) - new Date(b.hackathon.startDate || 8640000000000000));
    const total = ranked.length;
    ranked = ranked.slice((page - 1) * limit, page * limit);
    const activities = await HackathonActivity.find({ studentId: student._id, hackathonId: { $in: ranked.map(item => item.hackathon._id) } });
    const activityByHackathon = new Map(activities.map(item => [String(item.hackathonId), item.status]));
    res.json({ success: true, recommendations: ranked.map(item => ({ ...item.hackathon.toObject(), recommendation: item.recommendation, activityStatus: activityByHackathon.get(String(item.hackathon._id)) || null })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to recommend hackathons: ' + err.message });
  }
});

router.post('/sync', auth, authorize('institution'), async (req, res) => {
  try {
    if (process.env.HACKATHON_SYNC_SECRET && req.get('X-Hackathon-Sync-Secret') !== process.env.HACKATHON_SYNC_SECRET) {
      return res.status(403).json({ error: 'Invalid synchronization secret' });
    }
    const runs = await syncHackathons();
    const failed = runs.every(run => run.status === 'failed');
    res.status(failed ? 502 : 200).json({ success: !failed, runs });
  } catch (err) {
    res.status(500).json({ error: 'Hackathon synchronization failed: ' + err.message });
  }
});

router.post('/:id/save', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    if (!mongoose.isValidObjectId(req.params.id) || !await Hackathon.exists({ _id: req.params.id })) return res.status(404).json({ error: 'Hackathon not found' });
    const activity = await HackathonActivity.findOneAndUpdate({ studentId: student._id, hackathonId: req.params.id }, { $set: { status: 'saved' } }, { upsert: true, new: true, runValidators: true });
    res.status(201).json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save hackathon: ' + err.message });
  }
});

router.delete('/:id/save', auth, authorize('student'), async (req, res) => {
  const student = await Student.findOne({ userId: req.user.userId });
  if (!student) return res.status(404).json({ error: 'Student profile not found' });
  await HackathonActivity.deleteOne({ studentId: student._id, hackathonId: req.params.id });
  res.json({ success: true });
});

router.post('/:id/status', auth, authorize('student'), async (req, res) => {
  try {
    if (!activityStatuses.includes(req.body.status)) return res.status(400).json({ error: 'Invalid hackathon activity status' });
    const student = await Student.findOne({ userId: req.user.userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    if (!await Hackathon.exists({ _id: req.params.id })) return res.status(404).json({ error: 'Hackathon not found' });
    const activity = await HackathonActivity.findOneAndUpdate({ studentId: student._id, hackathonId: req.params.id }, { $set: { status: req.body.status, notes: req.body.notes } }, { upsert: true, new: true, runValidators: true });
    res.json({ success: true, activity, selfReported: req.body.status === 'registered-self-reported' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update hackathon status: ' + err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Hackathon not found' });
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) return res.status(404).json({ error: 'Hackathon not found' });
    res.json({ success: true, hackathon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hackathon: ' + err.message });
  }
});

module.exports = router;
