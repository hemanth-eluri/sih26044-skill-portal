const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

// Get company profile
router.get('/profile', auth, authorize('industry'), async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user.userId })
      .populate('opportunities');
    if (!company) {
      return res.status(404).json({ error: 'Company profile not found' });
    }
    res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch company profile: ' + err.message });
  }
});

// Update company profile
router.put('/profile', auth, authorize('industry'), async (req, res) => {
  try {
    const {
      companyName,
      industry,
      website,
      description,
      companySize,
      size,
      headquarters,
      location,
      foundedYear,
      employees,
      about
    } = req.body;

    const company = await Company.findOneAndUpdate(
      { userId: req.user.userId },
      {
        companyName,
        industry,
        website,
        description,
        companySize: companySize || size,
        size: size || companySize,
        headquarters: headquarters || location,
        location: location || headquarters,
        foundedYear,
        employees,
        about,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update company profile: ' + err.message });
  }
});

// Get company's posted opportunities
router.get('/opportunities', auth, authorize('industry'), async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user.userId });
    if (!company) {
      return res.status(404).json({ error: 'Company profile not found' });
    }
    const Opportunity = require('../models/Opportunity');
    const opportunities = await Opportunity.find({
      $or: [{ companyId: company._id }, { company: company._id }]
    });
    const formatted = opportunities.map(opp => {
      const obj = opp.toObject();
      obj.company = obj.company || obj.companyId;
      obj.companyId = obj.companyId || obj.company;
      return obj;
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch company opportunities: ' + err.message });
  }
});

// Get all companies (public)
router.get('/', async (req, res) => {
  try {
    const companies = await Company.find({ verificationStatus: 'verified' })
      .select('companyName industry companySize website logo about')
      .limit(50);
    res.json({ success: true, companies });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch companies: ' + err.message });
  }
});

// Get specific company
router.get('/:id', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('opportunities');
    if (!company) {
      return res.status(404).json({ error: 'Company profile not found' });
    }
    res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch company: ' + err.message });
  }
});

module.exports = router;
