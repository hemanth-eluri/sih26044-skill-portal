const Hackathon = require('../../models/Hackathon');
const HackathonSyncRun = require('../../models/HackathonSyncRun');
const { normalizeHackalendar } = require('./hackathonNormalizer');
const HackalendarProvider = require('./providers/hackalendarProvider');

async function syncHackathons({ providers = [new HackalendarProvider()], now = new Date() } = {}) {
  const summaries = [];
  for (const provider of providers) {
    const metadata = provider.getSourceMetadata();
    const run = await HackathonSyncRun.create({ sourceName: metadata.name, startedAt: now });
    try {
      const rawItems = await provider.fetchHackathons();
      run.fetched = rawItems.length;
      for (const raw of rawItems) {
        try {
          const normalized = metadata.name === 'Hackalendar' ? normalizeHackalendar(raw, now) : raw;
          const existing = await Hackathon.findOne({ canonicalKey: normalized.canonicalKey }).select('_id');
          await Hackathon.findOneAndUpdate(
            { canonicalKey: normalized.canonicalKey },
            { $set: normalized },
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

  const staleBefore = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  await Hackathon.updateMany({ lastFetchedAt: { $lt: staleBefore } }, { $set: { dataQuality: 'stale' } });
  return summaries;
}

module.exports = { syncHackathons };
