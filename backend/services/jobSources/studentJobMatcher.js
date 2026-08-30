const { normalizeLabel } = require('./jobNormalizer');
const { reason } = require('../explanations/reasonBuilder');

function compareStudentToJob(student, job) {
  const skills = new Map((student.skills || []).map(skill => [normalizeLabel(skill.name), skill]));
  const required = job.requiredSkills || [];
  const matchedSkills = [];
  const missingSkills = [];
  for (const requirement of required) {
    const studentSkill = skills.get(requirement.normalizedName);
    const result = {
      name: requirement.name,
      sourceText: requirement.sourceText,
      evidenceBacked: Boolean(studentSkill?.evidence?.length)
    };
    if (studentSkill) matchedSkills.push(result);
    else missingSkills.push(result);
  }
  const skillMatchPercentage = required.length ? Math.round((matchedSkills.length / required.length) * 100) : null;
  const reasons = [];
  if (matchedSkills.length) reasons.push(reason('PROFILE', `${matchedSkills.length} explicitly observed skill(s) appear in your saved profile.`));
  if (missingSkills.length) reasons.push(reason('JOB_POSTING', `${missingSkills.length} explicitly observed skill(s) are not listed in your saved profile.`, 'gap'));
  if (!required.length) reasons.push(reason('JOB_POSTING', 'The source posting did not provide requirements that ISOTOPES could extract safely.', 'unknown'));
  return {
    skillMatchPercentage,
    matchedSkills,
    missingSkills,
    educationRequirements: job.educationRequirements || [],
    experienceRequirements: job.experienceRequirements || [],
    eligibilityStatus: (job.educationRequirements?.length || job.experienceRequirements?.length) ? 'review-required' : 'not-specified-by-source',
    reasons,
    explanation: required.length
      ? `${matchedSkills.length} of ${required.length} explicitly observed skills appear in your saved profile.`
      : 'The source posting did not provide requirements that ISOTOPES could extract safely.'
  };
}

module.exports = { compareStudentToJob };
