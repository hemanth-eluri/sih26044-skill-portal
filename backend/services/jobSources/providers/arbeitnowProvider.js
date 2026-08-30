const JobProviderBase = require('./providerBase');

class ArbeitnowProvider extends JobProviderBase {
  constructor({ endpoint = 'https://www.arbeitnow.com/api/job-board-api', fetchImpl = global.fetch } = {}) {
    super();
    this.endpoint = endpoint;
    this.fetchImpl = fetchImpl;
  }

  getSourceMetadata() {
    return { name: 'Arbeitnow', type: 'external-api', endpoint: this.endpoint };
  }

  async fetchJobs() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await this.fetchImpl(this.endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'ISOTOPES-SIH26044/1.0 (+job-requirement-research)' },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Arbeitnow returned HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload || !Array.isArray(payload.data)) throw new Error('Arbeitnow response did not contain a data array');
      return payload.data;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = ArbeitnowProvider;
