const { normalizeLabel } = require('../jobSources/jobNormalizer');

function task(key, title, description, skill, source, evidence) {
  return { key, title, description, skill, source, evidence, status: 'NOT_STARTED' };
}

function buildRoadmapTasks(student, companyPostings = []) {
  const role = student.targetRole || student.primaryTargetRole;
  const declared = new Map((student.skills || []).map(skill => [normalizeLabel(skill.name), skill]));
  const tasks = [];
  for (const requirement of role?.requiredSkills || []) {
    const key = normalizeLabel(requirement.name); const skill = declared.get(key);
    if (!skill) tasks.push(task(`role-gap:${key}`, `Build ${requirement.name}`, `Learn and demonstrate ${requirement.name} for your ${role.title} goal.`, requirement.name, 'TARGET_ROLE', `${requirement.importance || 'listed'} requirement in the selected ISOTOPES career-role catalogue.`));
    else if (!(skill.evidence || []).length) tasks.push(task(`role-evidence:${key}`, `Add evidence for ${requirement.name}`, `Complete an assessment or relevant project demonstrating ${requirement.name}.`, requirement.name, 'PROFILE', `${requirement.name} is saved but has no stored evidence.`));
  }
  const observed = new Map();
  for (const posting of companyPostings) for (const requirement of posting.requiredSkills || []) {
    const item = observed.get(requirement.normalizedName) || { name: requirement.name, count: 0 };
    item.count += 1; observed.set(requirement.normalizedName, item);
  }
  for (const [key, item] of [...observed].sort((a, b) => b[1].count - a[1].count)) {
    if (!declared.has(key) && !tasks.some(entry => entry.skill && normalizeLabel(entry.skill) === key)) tasks.push(task(`company-gap:${key}`, `Prepare ${item.name}`, `Build introductory evidence for ${item.name} before comparing with current vacancies.`, item.name, 'TARGET_COMPANY', `Observed in ${item.count} of ${companyPostings.length} recent stored target-company posting(s).`));
  }
  if (!role) tasks.unshift(task('select-role', 'Choose a primary target role', 'Select a career role to generate a gap-specific roadmap.', null, 'PROFILE', 'No primary target role is saved.'));
  if (role && !tasks.length) tasks.push(task('refresh-evidence', 'Strengthen recent evidence', `Take a ${role.title} assessment or add a relevant project.`, null, 'ASSESSMENT', 'No missing role skills were found; stronger recent evidence is the next actionable step.'));
  return tasks.slice(0, 8);
}

module.exports = { buildRoadmapTasks };
