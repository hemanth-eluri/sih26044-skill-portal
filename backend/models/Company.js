const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  industry: String,
  companySize: {
    type: String,
    default: 'medium'
  },
  size: String,
  location: String,
  website: String,
  description: String,
  logo: String,
  headquarters: String,
  foundedYear: Number,
  employees: Number,
  about: String,
  opportunities: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity'
    }
  ],
  applications: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    }
  ],
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

CompanySchema.pre('validate', function(next) {
  if (!this.size && this.companySize) this.size = this.companySize;
  if (!this.companySize && this.size) this.companySize = this.size;
  if (!this.location && this.headquarters) this.location = this.headquarters;
  if (!this.headquarters && this.location) this.headquarters = this.location;
  next();
});

module.exports = mongoose.model('Company', CompanySchema);
