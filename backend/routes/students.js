const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const User = require('../models/User');
const CareerRole = require('../models/CareerRole');
const { AssessmentResult } = require('../models/Assessment');
const HackathonActivity = require('../models/HackathonActivity');
const { normalizeLabel } = require('../services/jobSources/jobNormalizer');
const { reason } = require('../services/explanations/reasonBuilder');
const CareerRoadmap = require('../models/CareerRoadmap');
const JobPosting = require('../models/JobPosting');
const { buildRoadmapTasks } = require('../services/careerRoadmap/roadmapBuilder');
const { auth, authorize } = require('../middleware/auth');

async function getAuthenticatedStudent(userId) {
  return Student.findOne({ userId })
    .populate('targetRole')
    .populate('primaryTargetRole')
    .populate('secondaryTargetRoles');
}

function normalizeStringArray(value, field) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    const error = new Error(`${field} must be an array of strings`);
    error.status = 400;
    throw error;
  }
  return [...new Set(value.map(item => item.trim()).filter(Boolean))];
}

function validateOptionalYear(value, field) {
  if (value === undefined || value === null || value === '') return undefined;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1 || year > 3000) {
    const error = new Error(`${field} must be a valid year`);
    error.status = 400;
    throw error;
  }
  return year;
}

async function readProfile(req, res) {
  try {
    const student = await getAuthenticatedStudent(req.user.userId);
    const user = await User.findById(req.user.userId).select('name email phone location bio');
    if (!student) return res.json({ success: true, profileExists: false, user });
    res.json({ success: true, profileExists: true, student, user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch profile: ' + err.message });
  }
}

async function saveProfile(req, res) {
  try {
    const { name, phone, location, bio, headline, contactEmail, institution, degree, branch, skills, targetRoleId, primaryTargetRole, secondaryTargetRoles } = req.body;
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ success: false, error: 'Name cannot be empty' });
    }
    const update = { updatedAt: Date.now() };
    if (contactEmail !== undefined) {
      if (typeof contactEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
        return res.status(400).json({ success: false, error: 'Please enter a valid contact email' });
      }
      update.contactEmail = contactEmail.trim().toLowerCase();
    }
    for (const field of ['headline', 'institution', 'degree', 'branch']) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    const currentYear = validateOptionalYear(req.body.currentYear, 'currentYear');
    const graduationYear = validateOptionalYear(req.body.graduationYear, 'graduationYear');
    if (currentYear !== undefined) update.currentYear = currentYear;
    if (graduationYear !== undefined) update.graduationYear = graduationYear;
    for (const field of ['fieldsOfInterest', 'industriesOfInterest', 'preferredRoles']) {
      const values = normalizeStringArray(req.body[field], field);
      if (values !== undefined) update[field] = values;
    }
    if (skills !== undefined) {
      if (!Array.isArray(skills)) return res.status(400).json({ success: false, error: 'skills must be an array' });
      const existingStudent = await Student.findOne({ userId: req.user.userId }).select('skills');
      const existingSkills = new Map((existingStudent?.skills || []).map(skill => [skill.name.toLowerCase(), skill.toObject()]));
      update.skills = skills.map(skill => {
        const input = typeof skill === 'string' ? { name: skill } : skill;
        const name = input.name?.trim();
        if (!name) return null;
        const existing = existingSkills.get(name.toLowerCase());
        const selfDeclaredLevel = input.selfDeclaredLevel || input.level || existing?.selfDeclaredLevel || 'beginner';
        return {
          ...(existing || {}),
          name,
          selfDeclaredLevel,
          level: existing?.level || input.level || selfDeclaredLevel,
          wantToImprove: input.wantToImprove === undefined ? Boolean(existing?.wantToImprove) : Boolean(input.wantToImprove),
          evidence: existing?.evidence || []
        };
      }).filter(Boolean);
    }
    const roleId = targetRoleId || primaryTargetRole;
    if (roleId !== undefined) {
      const role = await CareerRole.findById(roleId);
      if (!role) return res.status(400).json({ success: false, error: 'Target career role not found' });
      update.primaryTargetRole = role._id;
      update.targetRole = role._id;
    }
    if (secondaryTargetRoles !== undefined) {
      const roles = await CareerRole.find({ _id: { $in: secondaryTargetRoles } }).select('_id');
      if (roles.length !== secondaryTargetRoles.length) return res.status(400).json({ success: false, error: 'One or more secondary career roles were not found' });
      update.secondaryTargetRoles = roles.map(role => role._id);
    }
    const student = await Student.findOneAndUpdate({ userId: req.user.userId }, { $set: update }, { new: true, runValidators: true }).populate('targetRole').populate('primaryTargetRole').populate('secondaryTargetRoles');
    if (!student) return res.status(404).json({ success: false, error: 'Student profile not found' });
    const user = await User.findByIdAndUpdate(req.user.userId, { name, phone, location, bio, updatedAt: Date.now() }, { new: true, runValidators: true }).select('name email phone location bio');
    res.json({ success: true, profileExists: true, student, user });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

router.get('/me', auth, authorize('student'), readProfile);
router.put('/me/profile', auth, authorize('student'), saveProfile);

router.get('/me/company-goal', auth, authorize('student'), async (req, res) => {
  const student = await Student.findOne({ userId: req.user.userId }).select('targetCompanyGoal');
  if (!student) return res.status(404).json({ error: 'Student profile not found' });
  res.json({ success: true, goal: student.targetCompanyGoal?.enabled ? student.targetCompanyGoal : null });
});

router.put('/me/company-goal', auth, authorize('student'), async (req, res) => {
  try {
    const companyName = typeof req.body.companyName === 'string' ? req.body.companyName.trim() : '';
    const role = typeof req.body.role === 'string' ? req.body.role.trim() : '';
    if (!companyName || companyName.length > 200 || !role || role.length > 200) {
      return res.status(400).json({ error: 'Company name and target role are required and must be under 200 characters' });
    }
    const goal = { enabled: true, companyName, normalizedCompanyName: normalizeLabel(companyName), role, updatedAt: new Date() };
    const student = await Student.findOneAndUpdate({ userId: req.user.userId }, { $set: { targetCompanyGoal: goal, updatedAt: new Date() } }, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    res.json({ success: true, goal: student.targetCompanyGoal });
  } catch (err) {
    res.status(500).json({ error: `Failed to save target company: ${err.message}` });
  }
});

router.delete('/me/company-goal', auth, authorize('student'), async (req, res) => {
  const student = await Student.findOneAndUpdate({ userId: req.user.userId }, { $unset: { targetCompanyGoal: 1 }, $set: { updatedAt: new Date() } }, { new: true });
  if (!student) return res.status(404).json({ error: 'Student profile not found' });
  res.json({ success: true });
});

router.get('/me/skill-analysis', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.userId }).populate('targetRole');
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    const results = await AssessmentResult.find({ studentId: student._id }).sort({ completedAt: -1 });
    const latestScores = new Map();
    for (const result of results) {
      for (const item of result.skillScores || []) {
        const key = item.skill.toLowerCase();
        if (!latestScores.has(key)) latestScores.set(key, { skill: item.skill, score: item.score, assessedAt: result.completedAt });
      }
    }
    const declared = new Map(student.skills.map(skill => [skill.name.toLowerCase(), skill]));
    const strongSkills = [...latestScores.values()].filter(item => item.score >= 75);
    const skillsNeedingImprovement = [...latestScores.values()].filter(item => item.score < 60);
    const requiredSkills = student.targetRole?.requiredSkills || [];
    const missingSkills = requiredSkills.filter(required => !declared.has(required.name.toLowerCase()) && !latestScores.has(required.name.toLowerCase())).map(required => ({
      skill: required.name,
      requiredLevel: required.level,
      importance: required.importance
    }));
    const prioritySkills = [
      ...skillsNeedingImprovement.map(item => ({ skill: item.skill, reason: `Assessment evidence is ${item.score}%`, score: item.score })),
      ...missingSkills.filter(item => ['critical', 'high'].includes(item.importance)).map(item => ({ skill: item.skill, reason: `${item.importance} requirement for ${student.targetRole.title}`, score: null }))
    ];
    for (const skill of student.skills.filter(item => item.wantToImprove)) {
      if (!prioritySkills.some(item => item.skill.toLowerCase() === skill.name.toLowerCase())) {
        prioritySkills.push({ skill: skill.name, reason: 'Marked by you as a skill to improve', score: latestScores.get(skill.name.toLowerCase())?.score ?? null });
      }
    }
    const recommendations = prioritySkills.slice(0, 5).map(item => {
      const target = student.targetRole ? ` for your ${student.targetRole.title} goal` : '';
      return {
        skill: item.skill,
        reasons: [reason(item.score === null ? 'TARGET_ROLE' : 'ASSESSMENT', item.reason, item.score === null ? 'gap' : 'priority')],
        message: item.score === null
          ? `Build evidence in ${item.skill}${target}; no verified assessment evidence is available yet.`
          : `Prioritize ${item.skill}${target} because your latest verified assessment score is ${item.score}%.`
      };
    });
    res.json({
      success: true,
      analysis: {
        targetRole: student.targetRole ? { id: student.targetRole._id, title: student.targetRole.title } : null,
        strongSkills,
        skillsNeedingImprovement,
        missingSkills,
        prioritySkills,
        recommendations,
        hasAssessmentEvidence: results.length > 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze skills: ' + err.message });
  }
});

router.get('/me/skill-passport', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    const results = await AssessmentResult.find({ studentId: student._id }).sort({ completedAt: -1 });
    const assessmentBySkill = new Map();
    for (const result of results) for (const item of result.skillScores || []) {
      const key = item.skill.toLowerCase();
      const current = assessmentBySkill.get(key) || { attempts: 0, latestScore: null, bestScore: null, lastEvidenceDate: null };
      current.attempts += 1;
      if (current.latestScore === null) { current.latestScore = item.score; current.lastEvidenceDate = result.completedAt; }
      current.bestScore = current.bestScore === null ? item.score : Math.max(current.bestScore, item.score);
      assessmentBySkill.set(key, current);
    }
    const passportSkills = student.skills.map(skill => {
      const key = skill.name.toLowerCase();
      const explicitEvidence = skill.evidence || [];
      const projects = (student.projects || []).filter(project => (project.skills || []).some(name => name.toLowerCase() === key));
      const certifications = (student.certifications || []).filter(item => item.name?.toLowerCase() === key);
      const datedEvidence = [
        ...explicitEvidence.map(item => item.date),
        ...projects.flatMap(item => [item.endDate, item.startDate]),
        ...certifications.map(item => item.issueDate),
        assessmentBySkill.get(key)?.lastEvidenceDate
      ].filter(Boolean).map(value => new Date(value)).filter(value => !Number.isNaN(value.getTime()));
      const lastEvidenceDate = datedEvidence.length ? new Date(Math.max(...datedEvidence.map(value => value.getTime()))) : null;
      return {
        name: skill.name,
        selfDeclaredLevel: skill.selfDeclaredLevel,
        assessedLevel: skill.level,
        assessment: assessmentBySkill.get(key) || { attempts: 0, latestScore: null, bestScore: null, lastEvidenceDate: null },
        evidence: {
          projects: projects.length,
          certifications: certifications.length,
          internships: explicitEvidence.filter(item => item.type === 'internship').length,
          externalPlatforms: 0,
          employerChallenges: 0
        },
        lastEvidenceDate,
        evidenceLabels: [...new Set(explicitEvidence.map(item => item.type))],
        limitations: ['External platform evidence is not connected.', 'Employer challenge evidence is not available.']
      };
    });
    res.json({
      success: true,
      passport: {
        studentId: student._id,
        generatedAt: new Date(),
        skills: passportSkills,
        summary: { totalSkills: passportSkills.length, evidenceBackedSkills: passportSkills.filter(skill => skill.lastEvidenceDate).length, assessmentsCompleted: results.length },
        shareable: false,
        message: passportSkills.length ? 'Evidence is reported by source type; no overall verification claim is made.' : 'No skills are saved yet.'
      }
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to build skill passport: ${err.message}` });
  }
});

router.get('/me/career-roadmap', auth, authorize('student'), async (req, res) => {
  try {
    const student = await getAuthenticatedStudent(req.user.userId);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    const goal = student.targetCompanyGoal?.enabled ? student.targetCompanyGoal : null;
    const postings = goal ? await JobPosting.find({ active: true, normalizedCompanyName: new RegExp(`^${goal.normalizedCompanyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), ...(goal.role ? { normalizedRole: new RegExp(goal.role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } : {}) }).limit(100) : [];
    const generated = buildRoadmapTasks(student, postings);
    const existing = await CareerRoadmap.findOne({ studentId: student._id });
    const progress = new Map((existing?.tasks || []).map(item => [item.key, { status: item.status, completedAt: item.completedAt }]));
    const tasks = generated.map(item => ({ ...item, ...(progress.get(item.key) || {}) }));
    const roadmap = await CareerRoadmap.findOneAndUpdate(
      { studentId: student._id },
      { $set: { targetRoleId: student.targetRole?._id || student.primaryTargetRole?._id, targetRoleTitle: student.targetRole?.title || student.primaryTargetRole?.title, targetCompanyName: goal?.companyName, tasks, generatedAt: new Date() }, $setOnInsert: { targetDate: null } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, roadmap, context: { companyPostingsAnalyzed: postings.length }, message: tasks[0]?.key === 'select-role' ? 'Choose a target role to unlock a gap-specific roadmap.' : null });
  } catch (err) {
    res.status(500).json({ error: `Failed to build career roadmap: ${err.message}` });
  }
});

router.put('/me/career-roadmap/settings', auth, authorize('student'), async (req, res) => {
  const student = await Student.findOne({ userId: req.user.userId });
  if (!student) return res.status(404).json({ error: 'Student profile not found' });
  const targetDate = req.body.targetDate ? new Date(req.body.targetDate) : null;
  if (targetDate && (Number.isNaN(targetDate.getTime()) || targetDate <= new Date())) return res.status(400).json({ error: 'Target date must be a valid future date' });
  const roadmap = await CareerRoadmap.findOneAndUpdate({ studentId: student._id }, { $set: { targetDate } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  res.json({ success: true, roadmap });
});

router.patch('/me/career-roadmap/tasks/:taskId', auth, authorize('student'), async (req, res) => {
  try {
    const allowed = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid roadmap task status' });
    const student = await Student.findOne({ userId: req.user.userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    const roadmap = await CareerRoadmap.findOne({ studentId: student._id, 'tasks._id': req.params.taskId });
    if (!roadmap) return res.status(404).json({ error: 'Roadmap task not found' });
    const task = roadmap.tasks.id(req.params.taskId); task.status = req.body.status; task.completedAt = req.body.status === 'COMPLETED' ? new Date() : null;
    await roadmap.save();
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ error: `Failed to update roadmap task: ${err.message}` });
  }
});

router.get('/me/hackathons', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    const filter = { studentId: student._id };
    if (req.query.status) filter.status = req.query.status;
    const activities = await HackathonActivity.find(filter).populate('hackathonId').sort({ updatedAt: -1 });
    res.json({ success: true, activities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your hackathons: ' + err.message });
  }
});

function validateEducation({ degree, institution, startDate, endDate, cgpa }) {
  if (!degree || !degree.trim() || !institution || !institution.trim()) {
    return 'Degree and institution are required';
  }
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return 'End date must be after start date';
  }
  if (cgpa !== undefined && cgpa !== '' && (!Number.isFinite(Number(cgpa)) || Number(cgpa) < 0 || Number(cgpa) > 10)) {
    return 'CGPA must be between 0 and 10';
  }
  return null;
}

// Get student profile
router.get('/profile', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.userId }).populate('targetRole');
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }
    const user = await User.findById(req.user.userId).select('name email phone location bio');
    res.json({ success: true, student, user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile: ' + err.message });
  }
});

// Update basic info
router.put('/profile', auth, authorize('student'), async (req, res) => {
  try {
    const { headline, name, phone, location, bio, contactEmail } = req.body;
    if (contactEmail !== undefined && (typeof contactEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim()))) {
      return res.status(400).json({ success: false, error: 'Please enter a valid contact email' });
    }
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }

    const student = await Student.findOneAndUpdate(
      { userId: req.user.userId },
      { headline, ...(contactEmail === undefined ? {} : { contactEmail: contactEmail.trim().toLowerCase() }), updatedAt: Date.now() },
      { new: true }
    );
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, phone, location, bio, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select('name email phone location bio');

    res.json({ success: true, student, user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
});

// Add education
router.post('/education', auth, authorize('student'), async (req, res) => {
  try {
    const { degree, institution, startDate, endDate, cgpa, description } = req.body;
    const validationError = validateEducation({ degree, institution, startDate, endDate, cgpa });
    if (validationError) return res.status(400).json({ error: validationError });
    const student = await Student.findOneAndUpdate(
      { userId: req.user.userId },
      {
        $push: {
          education: { degree, institution, startDate, endDate, cgpa, description }
        },
        updatedAt: Date.now()
      },
      { new: true }
    );
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    res.status(201).json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add education: ' + err.message });
  }
});

// Update education
router.put('/education/:id', auth, authorize('student'), async (req, res) => {
  try {
    const { degree, institution, startDate, endDate, cgpa, description } = req.body;
    const validationError = validateEducation({ degree, institution, startDate, endDate, cgpa });
    if (validationError) return res.status(400).json({ error: validationError });
    const student = await Student.findOneAndUpdate(
      { userId: req.user.userId, 'education._id': req.params.id },
      {
        $set: {
          'education.$.degree': degree,
          'education.$.institution': institution,
          'education.$.startDate': startDate,
          'education.$.endDate': endDate,
          'education.$.cgpa': cgpa,
          'education.$.description': description,
          updatedAt: Date.now()
        }
      },
      { new: true }
    );
    if (!student) return res.status(404).json({ error: 'Education record not found' });
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update education: ' + err.message });
  }
});

// Delete education
router.delete('/education/:id', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { userId: req.user.userId, 'education._id': req.params.id },
      { $pull: { education: { _id: req.params.id } }, updatedAt: Date.now() },
      { new: true }
    );
    if (!student) return res.status(404).json({ error: 'Education record not found' });
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete education: ' + err.message });
  }
});

// Add experience
router.post('/experience', auth, authorize('student'), async (req, res) => {
  try {
    const { jobTitle, company, duration, description, startDate, endDate } = req.body;
    const student = await Student.findOneAndUpdate(
      { userId: req.user.userId },
      {
        $push: { experience: { jobTitle, company, duration, description, startDate, endDate } },
        updatedAt: Date.now()
      },
      { new: true }
    );
    res.status(201).json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add experience: ' + err.message });
  }
});

// Delete experience
router.delete('/experience/:id', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { userId: req.user.userId },
      { $pull: { experience: { _id: req.params.id } }, updatedAt: Date.now() },
      { new: true }
    );
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete experience: ' + err.message });
  }
});

// Add project
router.post('/projects', auth, authorize('student'), async (req, res) => {
  try {
    const { title, description, skills, link, startDate, endDate } = req.body;
    const student = await Student.findOneAndUpdate(
      { userId: req.user.userId },
      {
        $push: { projects: { title, description, skills, link, startDate, endDate } },
        updatedAt: Date.now()
      },
      { new: true }
    );
    res.status(201).json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add project: ' + err.message });
  }
});

// Delete project
router.delete('/projects/:id', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { userId: req.user.userId },
      { $pull: { projects: { _id: req.params.id } }, updatedAt: Date.now() },
      { new: true }
    );
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project: ' + err.message });
  }
});

// Add certification
router.post('/certifications', auth, authorize('student'), async (req, res) => {
  try {
    const { name, provider, issueDate, expiryDate, link } = req.body;
    if (!name || !String(name).trim() || !provider || !String(provider).trim()) {
      return res.status(400).json({ error: 'Certification name and provider are required' });
    }
    const student = await Student.findOneAndUpdate(
      { userId: req.user.userId },
      {
        $push: { certifications: { name: String(name).trim(), provider: String(provider).trim(), issueDate, expiryDate, link } },
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    res.status(201).json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add certification: ' + err.message });
  }
});

// Delete certification
router.delete('/certifications/:id', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { userId: req.user.userId },
      { $pull: { certifications: { _id: req.params.id } }, updatedAt: Date.now() },
      { new: true }
    );
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete certification: ' + err.message });
  }
});

// Add skill
router.post('/skills', auth, authorize('student'), async (req, res) => {
  try {
    const { name, level = 'beginner', wantToImprove = false } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    const existingStudent = await Student.findOne({ userId: req.user.userId });
    if (!existingStudent) {
      return res.status(404).json({ error: 'Student profile not found' });
    }
    if (existingStudent.skills.some((skill) => skill.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(400).json({ error: 'This skill is already on your profile' });
    }

    const student = await Student.findOneAndUpdate(
      { userId: req.user.userId },
      {
        $push: { skills: { name: name.trim(), selfDeclaredLevel: level, level, wantToImprove: Boolean(wantToImprove), evidence: [], endorsements: 0 } },
        updatedAt: Date.now()
      },
      { new: true }
    );
    res.status(201).json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add skill: ' + err.message });
  }
});

// Delete skill
router.delete('/skills/:id', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { userId: req.user.userId },
      { $pull: { skills: { _id: req.params.id } }, updatedAt: Date.now() },
      { new: true }
    );
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete skill: ' + err.message });
  }
});

module.exports = router;
