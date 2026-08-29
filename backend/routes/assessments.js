const express = require('express');
const router = express.Router();
const { Assessment, AssessmentResult } = require('../models/Assessment');
const AssessmentQuestion = require('../models/AssessmentQuestion');
const AssessmentSession = require('../models/AssessmentSession');
const Student = require('../models/Student');
const { auth, authorize } = require('../middleware/auth');

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function questionFingerprint(question) {
  return String(question.questionText || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function publicAssessment(assessment) {
  const value = assessment.toObject ? assessment.toObject() : assessment;
  return {
    ...value,
    questions: value.questions.map(question => ({
      _id: question._id,
      questionText: question.questionText,
      type: question.type,
      options: question.options,
      skillTested: question.skillTested
    }))
  };
}

const normalizeSkill = value => String(value || '').trim().toLowerCase();

function publicQuestion(question) {
  return {
    id: question._id,
    skill: question.skill,
    topic: question.topic,
    difficulty: question.difficulty,
    questionType: question.questionType,
    questionText: question.questionText,
    options: question.options
  };
}

function publicSession(session, questions = []) {
  return {
    id: session._id,
    mode: session.mode,
    selectedSkills: session.selectedSkills,
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    resultId: session.resultId,
    questions: questions.map(publicQuestion)
  };
}

function difficultyPlan(level, count) {
  const ratios = level === 'advanced' ? [0.2, 0.5, 0.3]
    : level === 'intermediate' ? [0.3, 0.5, 0.2]
      : [0.5, 0.4, 0.1];
  const easy = Math.round(count * ratios[0]);
  const hard = Math.round(count * ratios[2]);
  return { easy, medium: Math.max(0, count - easy - hard), hard };
}

async function resolveSessionSkills(student, mode, requestedSkills) {
  const profileByName = new Map(student.skills.map(skill => [normalizeSkill(skill.name), skill]));
  if (mode === 'profile-skills') {
    const selected = requestedSkills.length ? requestedSkills : student.skills.map(skill => skill.name);
    const skills = selected.map(normalizeSkill).map(skill => profileByName.get(skill)?.name).filter(Boolean);
    if (!skills.length) throw Object.assign(new Error('Add skills to your profile before starting a profile-skills assessment.'), { status: 400 });
    return [...new Set(skills)];
  }
  if (mode === 'target-role') {
    await student.populate('targetRole');
    if (!student.targetRole) throw Object.assign(new Error('Select a target career role before starting a target-role assessment.'), { status: 400 });
    return [...new Set(student.targetRole.requiredSkills.map(skill => skill.name).filter(Boolean))];
  }
  const skills = [...new Set(requestedSkills.map(skill => String(skill).trim()).filter(Boolean))];
  if (!skills.length) throw Object.assign(new Error('Select at least one skill for a custom assessment.'), { status: 400 });
  return skills;
}

async function selectQuestions(student, skills, count) {
  const skillLookup = new Map(skills.map(skill => [normalizeSkill(skill), skill]));
  const candidates = await AssessmentQuestion.find({
    skill: { $in: [...skillLookup.values()].map(skill => new RegExp(`^${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) },
    active: true,
    verificationStatus: 'verified'
  });
  if (!candidates.length) throw Object.assign(new Error('No verified questions are available for the selected skills.'), { status: 400 });

  const recentSessions = await AssessmentSession.find({ studentId: student._id }).sort({ createdAt: -1 }).limit(5).select('questionIds');
  const recentlyUsed = new Set(recentSessions.flatMap(session => session.questionIds).map(String));
  const selected = [];
  const perSkill = Math.max(1, Math.floor(count / skills.length));
  for (const skill of skills) {
    const profileSkill = student.skills.find(item => normalizeSkill(item.name) === normalizeSkill(skill));
    const plan = difficultyPlan(profileSkill?.selfDeclaredLevel || profileSkill?.level || 'beginner', perSkill);
    const pool = candidates.filter(question => normalizeSkill(question.skill) === normalizeSkill(skill));
    for (const difficulty of ['easy', 'medium', 'hard']) {
      const available = shuffle(pool.filter(question => question.difficulty === difficulty && !recentlyUsed.has(String(question._id))));
      selected.push(...available.slice(0, plan[difficulty]));
    }
    const already = new Set(selected.map(question => String(question._id)));
    selected.push(...shuffle(pool.filter(question => !already.has(String(question._id)) && !recentlyUsed.has(String(question._id)))).slice(0, Math.max(0, perSkill - selected.filter(question => normalizeSkill(question.skill) === normalizeSkill(skill)).length)));
  }
  const selectedIds = new Set(selected.map(question => String(question._id)));
  const fallback = shuffle(candidates.filter(question => !selectedIds.has(String(question._id))));
  selected.push(...fallback.slice(0, Math.max(0, count - selected.length)));
  return shuffle(selected).slice(0, count);
}

router.post('/session', auth, authorize('student'), async (req, res) => {
  try {
    const mode = req.body.mode;
    if (!['profile-skills', 'target-role', 'custom'].includes(mode)) {
      return res.status(400).json({ error: 'mode must be profile-skills, target-role, or custom' });
    }
    const requestedSkills = Array.isArray(req.body.skills) ? req.body.skills : [];
    const requestedCount = Number(req.body.questionCount || 10);
    const questionCount = Number.isInteger(requestedCount) ? Math.min(20, Math.max(1, requestedCount)) : 10;
    const student = await Student.findOne({ userId: req.user.userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    const skills = await resolveSessionSkills(student, mode, requestedSkills);
    const questions = await selectQuestions(student, skills, questionCount);
    const session = await AssessmentSession.create({
      studentId: student._id,
      mode,
      selectedSkills: skills,
      questionIds: questions.map(question => question._id),
      status: 'in-progress'
    });
    res.status(201).json({ success: true, session: publicSession(session, questions) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to create assessment session' });
  }
});

router.get('/session/:id', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.userId });
    const session = student && await AssessmentSession.findOne({ _id: req.params.id, studentId: student._id });
    if (!session) return res.status(404).json({ error: 'Assessment session not found' });
    const questions = await AssessmentQuestion.find({ _id: { $in: session.questionIds } });
    const byId = new Map(questions.map(question => [String(question._id), question]));
    const ordered = session.questionIds.map(id => byId.get(String(id))).filter(Boolean);
    res.json({ success: true, session: publicSession(session, ordered) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assessment session: ' + err.message });
  }
});

router.post('/session/:id/submit', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.userId });
    const session = student && await AssessmentSession.findOne({ _id: req.params.id, studentId: student._id });
    if (!session) return res.status(404).json({ error: 'Assessment session not found' });
    if (session.status === 'scored') return res.status(409).json({ error: 'Assessment session has already been submitted' });
    if (!Array.isArray(req.body.answers)) return res.status(400).json({ error: 'Answers must be an array' });
    const submitted = new Map(req.body.answers.map(answer => [String(answer.questionId), answer.selectedAnswer]));
    if (session.questionIds.some(id => !submitted.has(String(id))) || submitted.size !== session.questionIds.length) {
      return res.status(400).json({ error: 'Please submit exactly one answer for every question' });
    }
    const questions = await AssessmentQuestion.find({ _id: { $in: session.questionIds } }).select('+correctAnswer');
    const byId = new Map(questions.map(question => [String(question._id), question]));
    const stats = new Map();
    const topics = new Map();
    let correctAnswers = 0;
    const answers = session.questionIds.map(id => {
      const question = byId.get(String(id));
      const selectedAnswer = submitted.get(String(id));
      const isCorrect = Boolean(question) && selectedAnswer === question.correctAnswer;
      if (isCorrect) correctAnswers += 1;
      const skillStat = stats.get(question.skill) || { correct: 0, total: 0 };
      skillStat.total += 1;
      if (isCorrect) skillStat.correct += 1;
      stats.set(question.skill, skillStat);
      const topicStat = topics.get(question.topic) || { correct: 0, total: 0 };
      topicStat.total += 1;
      if (isCorrect) topicStat.correct += 1;
      topics.set(question.topic, topicStat);
      return { questionId: id, selectedAnswer, isCorrect };
    });
    const toScore = data => data.total ? Math.round((data.correct / data.total) * 100) : 0;
    const skillScores = [...stats].map(([skill, data]) => {
      const score = toScore(data);
      return { skill, score, level: score >= 75 ? 'advanced' : score >= 50 ? 'intermediate' : 'beginner' };
    });
    const topicScores = [...topics].map(([topic, data]) => ({ topic, correctAnswers: data.correct, totalQuestions: data.total, score: toScore(data) }));
    const score = Math.round((correctAnswers / session.questionIds.length) * 100);
    const result = await AssessmentResult.create({
      studentId: student._id,
      assessmentSessionId: session._id,
      mode: session.mode,
      skillsAssessed: session.selectedSkills,
      startedAt: session.startedAt,
      completedAt: Date.now(),
      totalQuestions: session.questionIds.length,
      correctAnswers,
      score,
      passed: score >= 60,
      answers,
      skillScores,
      topicScores
    });
    session.responses = req.body.answers;
    session.status = 'scored';
    session.completedAt = result.completedAt;
    session.resultId = result._id;
    await session.save();
    student.assessmentResults.addToSet(result._id);
    for (const skillScore of skillScores) {
      const skill = student.skills.find(item => normalizeSkill(item.name) === normalizeSkill(skillScore.skill));
      if (skill) {
        skill.level = skillScore.level;
        skill.evidence.push({ type: 'assessment', title: `${session.mode} assessment`, score: skillScore.score, date: result.completedAt });
      }
    }
    await student.save();
    res.status(201).json({ success: true, result: { id: result._id, mode: result.mode, skillsAssessed: result.skillsAssessed, score, passed: result.passed, correctAnswers, totalQuestions: result.totalQuestions, skillScores, topicScores } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit assessment session: ' + err.message });
  }
});

router.get('/history', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    const results = await AssessmentResult.find({ studentId: student._id }).sort({ completedAt: -1 });
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assessment history: ' + err.message });
  }
});

// Get all assessments
router.get('/', async (req, res) => {
  try {
    const assessments = await Assessment.find().select('-questions');
    res.json({ success: true, assessments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assessments: ' + err.message });
  }
});

router.post('/generate', auth, authorize('student'), async (req, res) => {
  try {
    const requestedSkills = Array.isArray(req.body.skills) ? req.body.skills : [];
    const student = await Student.findOne({ userId: req.user.userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const profileSkills = student.skills.map(skill => skill.name);
    const profileSkillLookup = new Map(profileSkills.map(skill => [skill.toLowerCase(), skill]));
    const skills = [...new Set(requestedSkills.map(skill => String(skill).trim().toLowerCase()).map(skill => profileSkillLookup.get(skill)).filter(Boolean))];
    if (!skills.length) return res.status(400).json({ error: 'Select at least one skill from your profile' });

    const sourceAssessments = await Assessment.find({ 'questions.skillTested': { $in: skills } });
    const questions = sourceAssessments.flatMap(source => source.questions.filter(question => skills.some(skill => skill.toLowerCase() === question.skillTested?.toLowerCase())));
    if (questions.length < 1) return res.status(400).json({ error: 'Not enough questions are currently available for the selected skills.' });
    const previousAssessments = await Assessment.find({ title: /^Profile skills assessment:/, skillsAssessed: { $all: skills } }).select('questions');
    const previouslyUsed = new Set(previousAssessments.flatMap(item => item.questions).map(questionFingerprint));
    const unseenQuestions = questions.filter(question => !previouslyUsed.has(questionFingerprint(question)));
    const selectedQuestions = shuffle(unseenQuestions.length ? unseenQuestions : questions).slice(0, Math.min(questions.length, 10));
    const assessment = await Assessment.create({
      title: `Profile skills assessment: ${skills.join(', ')}`,
      category: 'programming',
      description: 'Curated Question Bank assessment based on your selected profile skills.',
      questions: selectedQuestions,
      skillsAssessed: skills
    });

    res.status(201).json({ success: true, assessment: publicAssessment(assessment), source: 'Curated Question Bank' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create assessment: ' + err.message });
  }
});

// Get student assessment results
router.get('/results/me', auth, authorize('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    const results = await AssessmentResult.find({ studentId: student._id })
      .populate('assessmentId', 'title category')
      .sort({ completedAt: -1 });
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch results: ' + err.message });
  }
});

router.get('/results/:studentId', auth, async (req, res) => {
  try {
    if (req.user.role === 'student') {
      const student = await Student.findOne({ userId: req.user.userId });
      if (!student || student._id.toString() !== req.params.studentId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    const results = await AssessmentResult.find({ studentId: req.params.studentId })
      .populate('assessmentId', 'title category');
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch results: ' + err.message });
  }
});

// Get specific assessment
router.get('/:id', async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.json({ success: true, assessment: publicAssessment(assessment) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assessment: ' + err.message });
  }
});

// Submit assessment
router.post('/:id/submit', auth, authorize('student'), async (req, res) => {
  try {
    const { answers, timeSpent } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers must be an array' });
    }
    const assessment = await Assessment.findById(req.params.id);

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    if (answers.length !== assessment.questions.length) {
      return res.status(400).json({ error: 'Please submit an answer for every question' });
    }

    // Calculate score
    let correctAnswers = 0;
    let skillScores = {};

    assessment.skillsAssessed.forEach(skill => {
      skillScores[skill] = { score: 0, count: 0 };
    });

    const answerRecords = answers.map((answer, index) => {
      const question = assessment.questions[index];
      if (!question) return null;
      const skill = question.skillTested;
      if (skillScores[skill]) skillScores[skill].count += 1;
      const answerIndex = Number(answer);
      const selectedAnswer = Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < question.options.length
        ? question.options[answerIndex]
        : answer;
      const isCorrect = selectedAnswer === question.correctAnswer;
      if (isCorrect) {
        correctAnswers++;
        if (skillScores[skill]) {
          skillScores[skill].score += 1;
        }
      }
      return { questionId: question._id, selectedAnswer, isCorrect };
    });

    const score = Math.round((correctAnswers / assessment.questions.length) * 100);
    const passed = score >= assessment.passingScore;

    // Calculate skill levels
    const skillScoresArray = Object.entries(skillScores).map(([skill, data]) => {
      const percent = data.count === 0 ? 0 : Math.round((data.score / data.count) * 100);
      let level = 'beginner';
      if (percent >= 75) level = 'advanced';
      else if (percent >= 50) level = 'intermediate';
      return { skill, score: percent, level };
    });

    const student = await Student.findOne({ userId: req.user.userId });
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Create result
    const result = new AssessmentResult({
      studentId: student._id,
      assessmentId: assessment._id,
      completedAt: Date.now(),
      timeSpent,
      totalQuestions: assessment.questions.length,
      correctAnswers,
      score,
      passed,
      answers: answerRecords.filter(Boolean),
      skillScores: skillScoresArray
    });

    await result.save();

    // Update student profile with assessment results
    student.assessmentResults.push(result._id);

    // Update skills based on assessment
    skillScoresArray.forEach(skillData => {
      const existingSkill = student.skills.find(s => s.name === skillData.skill);
      if (existingSkill) {
        existingSkill.level = skillData.level;
        existingSkill.evidence.push({
          type: 'assessment',
          title: assessment.title,
          score: skillData.score,
          date: Date.now()
        });
      } else {
        student.skills.push({
          name: skillData.skill,
          level: skillData.level,
          evidence: [{
            type: 'assessment',
            title: assessment.title,
            score: skillData.score,
            date: Date.now()
          }]
        });
      }
    });

    await student.save();

    res.status(201).json({
      success: true,
      result: {
        score,
        passed,
        correctAnswers,
        totalQuestions: assessment.questions.length,
        skillScores: skillScoresArray
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit assessment: ' + err.message });
  }
});

module.exports = router;
