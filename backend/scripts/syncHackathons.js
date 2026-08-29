const mongoose = require('mongoose');
const { syncHackathons } = require('../services/hackathons/hackathonAggregator');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/isotopes');
  const runs = await syncHackathons();
  console.log(JSON.stringify(runs.map(run => ({ sourceName: run.sourceName, status: run.status, fetched: run.fetched, inserted: run.inserted, updated: run.updated, skipped: run.skipped, syncErrors: run.syncErrors })), null, 2));
  if (runs.every(run => run.status === 'failed')) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => mongoose.disconnect());
