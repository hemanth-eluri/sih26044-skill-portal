const crypto = require('crypto');
const { sanitizeHttpUrl } = require('../hackathons/urlValidator');

const skillAliases = new Map([
  ['javascript', ['javascript', 'js']], ['typescript', ['typescript']], ['react', ['react', 'react.js', 'reactjs']],
  ['node.js', ['node.js', 'nodejs']], ['python', ['python']], ['java', ['java']], ['c++', ['c++']],
  ['sql', ['sql']], ['mongodb', ['mongodb']], ['postgresql', ['postgresql', 'postgres']],
  ['aws', ['aws', 'amazon web services']], ['azure', ['azure']], ['docker', ['docker']], ['kubernetes', ['kubernetes']],
  ['git', ['git']], ['html', ['html']], ['css', ['css']], ['machine learning', ['machine learning']],
  ['data analysis', ['data analysis']], ['rest api', ['rest api', 'restful api']]
]);

function cleanText(value, maxLength = 50000) {
  if (value === null || value === undefined) return null;
  return String(value).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength) || null;
}

function normalizeLabel(value) {
  return cleanText(value, 300)?.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim() || '';
}

function validDate(value) {
  if (!value) return null;
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sentenceFor(text, position) {
  const start = Math.max(0, text.lastIndexOf('.', position) + 1);
  const next = text.indexOf('.', position);
  return cleanText(text.slice(start, next === -1 ? Math.min(text.length, position + 180) : next + 1), 300) || text.slice(position, position + 100);
}

function extractRequirements(sourceText, tags = []) {
  const text = cleanText(sourceText) || '';
  const lower = text.toLowerCase();
  const requiredSkills = [];
  for (const [normalizedName, aliases] of skillAliases) {
    const alias = aliases.find(candidate => new RegExp(`(^|[^a-z0-9])${candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(lower));
    if (alias) {
      const position = lower.search(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      requiredSkills.push({ name: normalizedName, normalizedName, sourceText: sentenceFor(text, position) });
    }
  }
  for (const tag of tags) {
    const normalizedName = normalizeLabel(tag);
    if (normalizedName && !requiredSkills.some(skill => skill.normalizedName === normalizedName)) {
      requiredSkills.push({ name: cleanText(tag, 100), normalizedName, sourceText: `Source tag: ${cleanText(tag, 100)}` });
    }
  }
  const sentences = text.split(/(?<=[.!?])\s+/);
  const educationRequirements = sentences.filter(value => /\b(degree|bachelor|master|b\.?(?:tech|sc)|m\.?(?:tech|sc))\b/i.test(value)).slice(0, 5).map(value => ({ sourceText: cleanText(value, 500) }));
  const experienceRequirements = sentences.filter(value => /\b(?:\d+\+?\s*(?:years?|yrs?)|experience (?:in|with))\b/i.test(value)).slice(0, 5).map(value => ({ sourceText: cleanText(value, 500) }));
  return { requiredSkills, preferredSkills: [], educationRequirements, experienceRequirements };
}

function normalizeArbeitnow(raw, fetchedAt = new Date()) {
  const externalId = cleanText(raw.slug || raw.id, 500);
  const title = cleanText(raw.title, 300);
  const companyName = cleanText(raw.company_name, 300);
  const sourceUrl = sanitizeHttpUrl(raw.url);
  const rawSourceText = cleanText(raw.description);
  if (!externalId || !title || !companyName || !sourceUrl || !rawSourceText) {
    throw new Error('Provider record is missing id, title, company, description, or a safe source URL');
  }
  const requirements = extractRequirements(rawSourceText, Array.isArray(raw.tags) ? raw.tags : []);
  return {
    sourceName: 'Arbeitnow', sourceType: 'external-api', externalId,
    canonicalKey: `arbeitnow:${crypto.createHash('sha256').update(externalId.toLowerCase()).digest('hex')}`,
    companyName, normalizedCompanyName: normalizeLabel(companyName), title, normalizedRole: normalizeLabel(title),
    description: rawSourceText, rawSourceText, ...requirements,
    location: cleanText(raw.location, 300), remote: raw.remote === true,
    employmentTypes: [...new Set((raw.job_types || []).map(value => cleanText(value, 100)).filter(Boolean))],
    sourceUrl, applicationUrl: sourceUrl, postedAt: validDate(raw.created_at), lastFetchedAt: fetchedAt,
    active: true, dataQuality: 'source-observed'
  };
}

module.exports = { cleanText, normalizeLabel, extractRequirements, normalizeArbeitnow };
