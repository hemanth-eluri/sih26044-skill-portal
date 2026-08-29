class ProviderBase {
  getSourceMetadata() { throw new Error('getSourceMetadata must be implemented'); }
  async fetchHackathons() { throw new Error('fetchHackathons must be implemented'); }
}

module.exports = ProviderBase;
