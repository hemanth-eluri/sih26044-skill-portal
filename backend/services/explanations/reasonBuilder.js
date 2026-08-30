const SOURCES = ['PROFILE', 'ASSESSMENT', 'TARGET_ROLE', 'TARGET_COMPANY', 'JOB_POSTING', 'HACKATHON_SOURCE', 'ELIGIBILITY'];

function reason(source, evidence, effect = 'supports') {
  if (!SOURCES.includes(source)) throw new Error(`Unsupported explanation source: ${source}`);
  return { source, evidence: String(evidence), effect };
}

module.exports = { SOURCES, reason };
