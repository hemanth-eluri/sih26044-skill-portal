const JobPosting = require('../../models/JobPosting');
const JobSyncRun = require('../../models/JobSyncRun');
const ArbeitnowProvider = require('./providers/arbeitnowProvider');
const { normalizeArbeitnow } = require('./jobNormalizer');

async function syncJobs({ providers = [new ArbeitnowProvider()], now = new Date() } = {}) {
  const summaries = [];
  for (const provider of providers) {
    const metadata = provider.getSourceMetadata();
    const run = await JobSyncRun.create({ sourceName: metadata.name, startedAt: now });
    try {
      const rawItems = await provider.fetchJobs();
      run.fetched = rawItems.length;
      for (const raw of rawItems) {
        try {
          const normalized = metadata.name === 'Arbeitnow' ? normalizeArbeitnow(raw, now) : raw;
          const existing = await JobPosting.exists({ canonicalKey: normalized.canonicalKey });
          await JobPosting.findOneAndUpdate(
            { canonicalKey: normalized.canonicalKey }, { $set: normalized },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
          );
          if (existing) run.updated += 1;
          else run.inserted += 1;
        } catch (error) {
          run.skipped += 1;
          run.syncErrors.push(String(error.message).slice(0, 500));
        }
      }
      run.status = run.syncErrors.length ? 'partial' : 'success';
    } catch (error) {
      run.status = 'failed';
      run.syncErrors.push(String(error.message).slice(0, 500));
    }
    run.completedAt = new Date();
    await run.save();
    summaries.push(run.toObject());
  }
  return summaries;
}

module.exports = { syncJobs };
