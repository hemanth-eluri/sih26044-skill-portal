const mongoose = require('mongoose');

const HackathonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, trim: true },
  description: { type: String, trim: true },
  organizer: { type: String, trim: true },
  organizerType: { type: String, enum: ['official-organizer', 'university', 'company', 'community', 'government', 'other'], default: 'other' },
  sourceType: { type: String, enum: ['official-api', 'rss', 'public-structured-data', 'permitted-public-page', 'platform-curated'], required: true },
  sourceName: { type: String, required: true, index: true },
  sourceUrl: { type: String, required: true },
  registrationUrl: String,
  externalId: { type: String, required: true },
  canonicalKey: { type: String, required: true, unique: true },
  startDate: Date,
  endDate: Date,
  registrationDeadline: Date,
  status: { type: String, enum: ['upcoming', 'registration-open', 'registration-closed', 'ongoing', 'completed', 'unknown'], default: 'unknown', index: true },
  mode: { type: String, enum: ['online', 'offline', 'hybrid', 'unknown'], default: 'unknown' },
  location: {
    venue: String,
    city: String,
    state: String,
    country: String
  },
  eligibility: {
    degrees: [String],
    branches: [String],
    years: [Number],
    minimumAge: Number,
    maximumAge: Number,
    otherRequirements: [String]
  },
  domains: [{ type: String, index: true }],
  skills: [{ type: String, index: true }],
  teamSizeMin: Number,
  teamSizeMax: Number,
  prizeInformation: String,
  registrationFee: Number,
  isFree: Boolean,
  officialWebsite: String,
  bannerImage: String,
  tags: [String],
  lastFetchedAt: { type: Date, required: true },
  lastVerifiedAt: Date,
  dataQuality: { type: String, enum: ['verified-source', 'partial', 'curated', 'stale'], default: 'partial' },
  rawSourceReference: String
}, { timestamps: true });

HackathonSchema.index({ startDate: 1 });
HackathonSchema.index({ registrationDeadline: 1 });
HackathonSchema.index({ sourceName: 1, externalId: 1 }, { unique: true });

module.exports = mongoose.model('Hackathon', HackathonSchema);
