const normalize = value => String(value || '').trim().toLowerCase();
const unique = values => [...new Set(values.filter(Boolean))];

function includesLoose(values, candidate) {
  const wanted = normalize(candidate);
  return values.some(value => normalize(value) === wanted || normalize(value).includes(wanted) || wanted.includes(normalize(value)));
}

function eligibilityFor(student, hackathon) {
  const missing = [];
  const eligibility = hackathon.eligibility || {};
  if (eligibility.degrees?.length && !includesLoose(eligibility.degrees, student.degree)) missing.push(`Degree must be one of: ${eligibility.degrees.join(', ')}`);
  if (eligibility.branches?.length && !includesLoose(eligibility.branches, student.branch)) missing.push(`Branch must be one of: ${eligibility.branches.join(', ')}`);
  if (eligibility.years?.length && !eligibility.years.includes(Number(student.currentYear))) missing.push(`Open to study years: ${eligibility.years.join(', ')}`);
  return { status: missing.length ? 'not-eligible' : eligibility.degrees?.length || eligibility.branches?.length || eligibility.years?.length ? 'eligible' : 'unknown', missingRequirements: missing };
}

function matchHackathon(student, hackathon, now = new Date()) {
  const interests = unique([...(student.fieldsOfInterest || []), ...(student.industriesOfInterest || [])]);
  const skills = (student.skills || []).map(skill => skill.name);
  const domains = hackathon.domains || [];
  const eventSkills = hackathon.skills || [];
  const reasons = [];
  const learning = [];
  let score = 0;

  const matchedDomains = domains.filter(domain => includesLoose(interests, domain));
  if (matchedDomains.length) {
    score += Math.min(35, 20 + matchedDomains.length * 5);
    reasons.push(`Matches your ${matchedDomains.join(', ')} interest${matchedDomains.length > 1 ? 's' : ''}`);
  }
  const matchedSkills = eventSkills.filter(skill => includesLoose(skills, skill));
  if (matchedSkills.length) {
    score += Math.min(25, 10 + matchedSkills.length * 5);
    reasons.push(`Uses skills on your profile: ${matchedSkills.join(', ')}`);
  }
  const targetTitle = student.targetRole?.title || student.primaryTargetRole?.title;
  if (targetTitle && domains.some(domain => includesLoose([targetTitle], domain))) {
    score += 20;
    reasons.push(`Relevant to your ${targetTitle} career goal`);
  }
  const eligibility = eligibilityFor(student, hackathon);
  if (eligibility.status === 'eligible') {
    score += 15;
    reasons.push('Matches the published education eligibility');
  } else if (eligibility.status === 'unknown') {
    score += 5;
  }
  if (hackathon.mode === 'online') {
    score += 5;
    reasons.push('Online participation is available');
  }
  if (hackathon.registrationDeadline && hackathon.registrationDeadline >= now) {
    const days = Math.ceil((hackathon.registrationDeadline - now) / 86400000);
    reasons.push(`Registration closes in ${days} day${days === 1 ? '' : 's'}`);
  }
  for (const skill of eventSkills.filter(skill => !includesLoose(skills, skill)).slice(0, 3)) {
    learning.push(`${skill} may be useful but is not currently listed in your skills`);
  }

  return {
    matchScore: Math.min(100, score),
    matchedReasons: reasons,
    learningOpportunities: learning,
    missingRequirements: eligibility.missingRequirements,
    eligibilityStatus: eligibility.status
  };
}

module.exports = { eligibilityFor, matchHackathon };
