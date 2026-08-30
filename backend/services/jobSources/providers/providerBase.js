class JobProviderBase {
  getSourceMetadata() { throw new Error('getSourceMetadata must be implemented'); }
  async fetchJobs() { throw new Error('fetchJobs must be implemented'); }
}

module.exports = JobProviderBase;
