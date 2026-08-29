const { sanitizeHttpUrl } = require('../../services/hackathons/urlValidator');
const { normalizeHackalendar, deriveStatus } = require('../../services/hackathons/hackathonNormalizer');
const { eligibilityFor, matchHackathon } = require('../../services/hackathons/hackathonMatcher');

describe('Hackathon normalization and matching', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');

  test('accepts only safe HTTP(S) URLs', () => {
    expect(sanitizeHttpUrl('https://example.com/register')).toBe('https://example.com/register');
    expect(sanitizeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeHttpUrl('data:text/html,test')).toBeNull();
  });

  test('normalizes observed provider fields without inventing missing values', () => {
    const result = normalizeHackalendar({
      id: 'real-1', slug: 'real-event', url: 'https://hackalendar.com/e/real-event', name: '<b>Real Event</b>',
      description: '<script>bad()</script> Build useful things', startAt: '2026-09-10T00:00:00Z', endAt: '2026-09-12T00:00:00Z',
      mode: 'online', themes: ['ai', 'health'], prizePool: null, registrationDeadline: null, isFree: true,
      registrationUrl: 'https://official.example/register', organizer: 'Example Organizer', lastVerifiedAt: '2026-08-29T00:00:00Z'
    }, now);

    expect(result).toMatchObject({ title: 'Real Event', domains: ['AI/ML', 'Healthcare'], mode: 'online', prizeInformation: null, registrationDeadline: null, status: 'upcoming', dataQuality: 'verified-source' });
    expect(result.description).not.toContain('<script>');
    expect(result.canonicalKey).toBe('url:https://official.example/register');
  });

  test('derives status only from actual dates', () => {
    expect(deriveStatus({ registrationDeadline: new Date('2026-08-29') }, now)).toBe('registration-closed');
    expect(deriveStatus({ startDate: new Date('2026-08-29'), endDate: new Date('2026-09-01') }, now)).toBe('ongoing');
    expect(deriveStatus({}, now)).toBe('unknown');
  });

  test('separates eligibility from relevance and explains recommendations', () => {
    const student = { degree: 'B.Tech', branch: 'CSE', currentYear: 2, fieldsOfInterest: ['AI/ML'], skills: [{ name: 'Java' }], targetRole: { title: 'AI Engineer' } };
    const hackathon = { domains: ['AI/ML'], skills: ['Python'], mode: 'online', eligibility: { degrees: ['B.Tech'], branches: ['CSE'], years: [2] } };
    const eligibility = eligibilityFor(student, hackathon);
    const match = matchHackathon(student, hackathon, now);

    expect(eligibility.status).toBe('eligible');
    expect(match.matchScore).toBeGreaterThan(0);
    expect(match.matchedReasons.join(' ')).toContain('AI/ML');
    expect(match.learningOpportunities).toEqual(['Python may be useful but is not currently listed in your skills']);
  });
});
