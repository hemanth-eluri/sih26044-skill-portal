const express = require('express');
const router = express.Router();
const AssessmentQuestion = require('../models/AssessmentQuestion');
const CareerRole = require('../models/CareerRole');

router.get('/', async (req, res) => {
  try {
    const [questionSkills, roles] = await Promise.all([
      AssessmentQuestion.distinct('skill', { active: true, verificationStatus: 'verified' }),
      CareerRole.find().select('requiredSkills.name niceToHaveSkills.name')
    ]);
    const names = new Map();
    const add = name => {
      const value = String(name || '').trim();
      if (value) names.set(value.toLowerCase(), value);
    };
    questionSkills.forEach(add);
    roles.forEach(role => {
      role.requiredSkills.forEach(skill => add(skill.name));
      role.niceToHaveSkills.forEach(skill => add(skill.name));
    });
    const skills = [...names.values()].sort((a, b) => a.localeCompare(b)).map(name => ({ name }));
    res.json({ success: true, skills });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch skills: ' + err.message });
  }
});

module.exports = router;
