const ProviderBase = require('./providerBase');

class HackalendarProvider extends ProviderBase {
  constructor({ endpoint = 'https://hackalendar.com/api/events?limit=200', fetchImpl = global.fetch } = {}) {
    super();
    this.endpoint = endpoint;
    this.fetchImpl = fetchImpl;
  }

  getSourceMetadata() {
    return { name: 'Hackalendar', type: 'public-structured-data', endpoint: this.endpoint };
  }

  async fetchHackathons() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await this.fetchImpl(this.endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'ISOTOPES-SIH26044/1.0 (+hackathon-discovery)' },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Hackalendar returned HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload || !Array.isArray(payload.data)) throw new Error('Hackalendar response did not contain a data array');
      return payload.data;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = HackalendarProvider;
