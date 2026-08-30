const express = require('express');
const mongoose = require('mongoose');
const JobPosting = require('../models/JobPosting');
const Student = require('../models/Student');
const JobActivity = require('../models/JobActivity');
const { auth, authorize } = require('../middleware/auth');
const { syncJobs } = require('../services/jobSources/jobAggregator');
const { compareStudentToJob } = require('../services/jobSources/studentJobMatcher');
const { reason } = require('../services/explanations/reasonBuilder');

const router = express.Router();
const activityStatuses = ['saved', 'viewed', 'applied-self-reported', 'interviewing-self-reported', 'offered-self-reported', 'rejected-self-reported', 'withdrawn-self-reported'];
const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = { active: true };
    if (req.query.company) filter.normalizedCompanyName = new RegExp(escapeRegex(req.query.company), 'i');
    if (req.query.role) filter.normalizedRole = new RegExp(escapeRegex(req.query.role), 'i');
    if (req.query.location) filter.location = new RegExp(escapeRegex(req.query.location), 'i');
    if (req.query.remote === 'true') filter.remote = true;
    const [jobs, total] = await Promise.all([
      JobPosting.find(filter).sort({ postedAt: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      JobPosting.countDocuments(filter)
    ]);
    res.json({ success: true, jobs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(400).json({ error: `Failed to fetch jobs: ${error.message}` });
  }
});

router.post('/sync', auth, authorize('institution'), async (req, res) => {
  try {
    if (process.env.JOB_SYNC_SECRET && req.get('X-Job-Sync-Secret') !== process.env.JOB_SYNC_SECRET) {
      return res.status(403).json({ error: 'Invalid synchronization secret' });
    }
    const runs = await syncJobs();
    const failed = runs.every(run => run.status === 'failed');
    res.status(failed ? 502 : 200).json({ success: !failed, runs });
  } catch (error) {
    res.status(500).json({ error: `Job synchronization failed: ${error.message}` });
  }
});

router.get('/recommended/me', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    const jobs = await JobPosting.find({ active: true }).sort({ postedAt: -1 }).limit(500);
    const goal = student.targetCompanyGoal?.enabled ? student.targetCompanyGoal : null;
    const ranked = jobs.map(job => {
      const comparison = compareStudentToJob(student, job);
      let relevanceBoost = 0;
      const reasons = [];
      const structuredReasons = [];
      if (goal && job.normalizedCompanyName.includes(goal.normalizedCompanyName)) { const text = `Matches your target company: ${goal.companyName}`; relevanceBoost += 30; reasons.push(text); structuredReasons.push(reason('TARGET_COMPANY', text)); }
      if (goal && job.normalizedRole.includes(String(goal.role).toLowerCase())) { const text = `Matches your target role: ${goal.role}`; relevanceBoost += 20; reasons.push(text); structuredReasons.push(reason('TARGET_ROLE', text)); }
      const base = comparison.skillMatchPercentage ?? 0;
      return { job, comparison, recommendationScore: Math.min(100, base + relevanceBoost), reasons, structuredReasons };
    }).sort((a, b) => b.recommendationScore - a.recommendationScore).slice(0, 50);
    const activities = await JobActivity.find({ studentId: student._id, jobPostingId: { $in: ranked.map(item => item.job._id) } });
    const activityMap = new Map(activities.map(item => [String(item.jobPostingId), item.status]));
    res.json({ success: true, recommendations: ranked.map(item => ({ ...item.job.toObject(), comparison: item.comparison, recommendationScore: item.recommendationScore, reasons: item.reasons, structuredReasons: item.structuredReasons, activityStatus: activityMap.get(String(item.job._id)) || null })) });
  } catch (error) {
    res.status(500).json({ error: `Failed to recommend jobs: ${error.message}` });
  }
});

router.get('/company-requirements/analysis', async (req, res) => {
  try {
    const company = String(req.query.company || '').trim();
    const role = String(req.query.role || '').trim();
    if (!company) return res.status(400).json({ error: 'company query is required' });
    const filter = { active: true, normalizedCompanyName: new RegExp(escapeRegex(company), 'i') };
    if (role) filter.normalizedRole = new RegExp(escapeRegex(role), 'i');
    const postings = await JobPosting.find(filter).sort({ postedAt: -1 }).limit(100);
    const counts = new Map();
    for (const posting of postings) for (const skill of posting.requiredSkills) {
      const item = counts.get(skill.normalizedName) || { name: skill.name, count: 0, evidence: [] };
      item.count += 1;
      if (item.evidence.length < 3) item.evidence.push({ jobId: posting._id, title: posting.title, sourceName: posting.sourceName, sourceUrl: posting.sourceUrl, sourceText: skill.sourceText, postedAt: posting.postedAt });
      counts.set(skill.normalizedName, item);
    }
    const requirements = [...counts.values()].sort((a, b) => b.count - a.count).map(item => ({ ...item, observedInPercentage: postings.length ? Math.round(item.count / postings.length * 100) : 0 }));
    res.json({ success: true, company, role: role || null, postingCount: postings.length, requirements, message: postings.length ? 'Aggregated only from identifiable stored postings.' : 'No recent identifiable postings are available for this company and role.' });
  } catch (error) {
    res.status(500).json({ error: `Failed to analyze company requirements: ${error.message}` });
  }
});

router.put('/:id/activity', auth, authorize('student'), async (req, res) => {
  try {
    if (!activityStatuses.includes(req.body.status)) return res.status(400).json({ error: 'Invalid job activity status' });
    const student = await Student.findOne({ userId: req.user.userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    if (!mongoose.isValidObjectId(req.params.id) || !await JobPosting.exists({ _id: req.params.id })) return res.status(404).json({ error: 'Job posting not found' });
    const activity = await JobActivity.findOneAndUpdate(
      { studentId: student._id, jobPostingId: req.params.id },
      { $set: { status: req.body.status, notes: req.body.notes } },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, activity, selfReported: req.body.status.includes('self-reported') });
  } catch (error) {
    res.status(500).json({ error: `Failed to update job activity: ${error.message}` });
  }
});

router.get('/:id/compare', auth, authorize('student'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Job posting not found' });
    const [job, student] = await Promise.all([
      JobPosting.findById(req.params.id),
      Student.findOne({ userId: req.user.userId })
    ]);
    if (!job) return res.status(404).json({ error: 'Job posting not found' });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    res.json({ success: true, job, comparison: compareStudentToJob(student, job) });
  } catch (error) {
    res.status(500).json({ error: `Failed to compare job: ${error.message}` });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Job posting not found' });
    const job = await JobPosting.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job posting not found' });
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch job: ${error.message}` });
  }
});

module.exports = router;
