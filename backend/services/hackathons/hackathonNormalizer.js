const crypto = require('crypto');
const { sanitizeHttpUrl } = require('./urlValidator');

const domainNames = {
  ai: 'AI/ML', web3: 'Blockchain', climate: 'Sustainability', health: 'Healthcare',
  data: 'Data Science', hardware: 'IoT', student: 'Student Innovation', creative: 'Open Innovation'
};

function cleanText(value, maxLength = 10000) {
  if (value === null || value === undefined) return null;
  return String(value).replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength) || null;
}

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function deriveStatus({ startDate, endDate, registrationDeadline }, now = new Date()) {
  if (registrationDeadline && registrationDeadline < now) return 'registration-closed';
  if (startDate && endDate && startDate <= now && endDate >= now) return 'ongoing';
  if (endDate && endDate < now) return 'completed';
  if (registrationDeadline && registrationDeadline >= now) return 'registration-open';
  if (startDate && startDate > now) return 'upcoming';
  return 'unknown';
}

function canonicalKey(record) {
  if (record.registrationUrl) return `url:${record.registrationUrl.toLowerCase()}`;
  if (record.officialWebsite) return `website:${record.officialWebsite.toLowerCase()}`;
  const conservative = [record.sourceName, record.externalId].join('|').toLowerCase();
  return `source:${crypto.createHash('sha256').update(conservative).digest('hex')}`;
}

function normalizeHackalendar(raw, fetchedAt = new Date()) {
  const title = cleanText(raw.name, 300);
  const sourceUrl = sanitizeHttpUrl(raw.url);
  const registrationUrl = sanitizeHttpUrl(raw.registrationUrl);
  if (!raw.id || !title || !sourceUrl) throw new Error('Provider record is missing id, name, or a safe source URL');
  const dates = {
    startDate: validDate(raw.startAt),
    endDate: validDate(raw.endAt),
    registrationDeadline: validDate(raw.registrationDeadline)
  };
  const record = {
    title,
    slug: cleanText(raw.slug, 300),
    description: cleanText(raw.description),
    organizer: cleanText(raw.organizer, 300),
    organizerType: 'other',
    sourceType: 'public-structured-data',
    sourceName: 'Hackalendar',
    sourceUrl,
    registrationUrl,
    externalId: String(raw.id),
    ...dates,
    mode: ['online', 'hybrid'].includes(raw.mode) ? raw.mode : raw.mode === 'in_person' ? 'offline' : 'unknown',
    location: { venue: cleanText(raw.venue, 300), city: cleanText(raw.cityLabel || raw.city, 150), country: cleanText(raw.countryCode, 100) },
    eligibility: { degrees: [], branches: [], years: [], otherRequirements: [] },
    domains: [...new Set((raw.themes || []).map(theme => domainNames[String(theme).toLowerCase()] || cleanText(theme, 100)).filter(Boolean))],
    skills: [],
    prizeInformation: raw.prizePool === null || raw.prizePool === undefined ? null : cleanText(raw.prizePool, 500),
    isFree: typeof raw.isFree === 'boolean' ? raw.isFree : null,
    officialWebsite: registrationUrl,
    tags: (raw.themes || []).map(theme => cleanText(theme, 100)).filter(Boolean),
    lastFetchedAt: fetchedAt,
    lastVerifiedAt: validDate(raw.lastVerifiedAt),
    dataQuality: raw.lastVerifiedAt ? 'verified-source' : 'partial',
    rawSourceReference: sourceUrl
  };
  record.status = deriveStatus(record, fetchedAt);
  record.canonicalKey = canonicalKey(record);
  return record;
}

module.exports = { cleanText, validDate, deriveStatus, canonicalKey, normalizeHackalendar };
