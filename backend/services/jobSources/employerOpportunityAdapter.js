const crypto = require('crypto');
const JobPosting = require('../../models/JobPosting');
const Company = require('../../models/Company');
const { cleanText, normalizeLabel } = require('./jobNormalizer');

function opportunityRequirements(opportunity) {
  return (opportunity.skills || []).filter(skill => skill.name).map(skill => ({
    name: cleanText(skill.name, 100),
    normalizedName: normalizeLabel(skill.name),
    sourceText: `Employer listed skill: ${cleanText(skill.name, 100)} (${skill.importance || 'importance not specified'})`
  }));
}

async function syncEmployerOpportunity(opportunityInput) {
  const opportunity = opportunityInput.populate ? opportunityInput : null;
  const company = await Company.findById(opportunityInput.companyId).select('companyName');
  if (!company) throw new Error('Company profile not found for opportunity normalization');
  const externalId = String(opportunityInput._id);
  const description = cleanText([opportunityInput.description, opportunityInput.aboutRole, ...(opportunityInput.responsibilities || [])].filter(Boolean).join(' ')) || 'No additional description supplied by employer.';
  const sourceUrl = `isotopes://opportunities/${externalId}`;
  const record = {
    sourceName: 'ISOTOPES Employer', sourceType: 'employer-provided', externalId,
    canonicalKey: `isotopes-opportunity:${crypto.createHash('sha256').update(externalId).digest('hex')}`,
    opportunityId: opportunityInput._id, companyName: company.companyName,
    normalizedCompanyName: normalizeLabel(company.companyName), title: opportunityInput.title,
    normalizedRole: normalizeLabel(opportunityInput.title), description, rawSourceText: description,
    requiredSkills: opportunityRequirements(opportunityInput), preferredSkills: [],
    educationRequirements: opportunityInput.education?.minDegree ? [{ sourceText: `Employer minimum degree: ${opportunityInput.education.minDegree}` }] : [],
    experienceRequirements: opportunityInput.experienceRequired ? [{ sourceText: `Employer experience requirement: ${opportunityInput.experienceRequired}` }] : [],
    location: opportunityInput.location, remote: opportunityInput.locationType === 'remote',
    employmentTypes: [opportunityInput.type], sourceUrl,
    postedAt: opportunityInput.createdAt, lastFetchedAt: new Date(), active: opportunityInput.status === 'open', dataQuality: 'source-observed'
  };
  return JobPosting.findOneAndUpdate({ canonicalKey: record.canonicalKey }, { $set: record }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
}

module.exports = { opportunityRequirements, syncEmployerOpportunity };
