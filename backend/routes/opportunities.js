const express = require('express');
const router = express.Router();
const Opportunity = require('../models/Opportunity');
const Company = require('../models/Company');
const { auth, authorize } = require('../middleware/auth');
const { syncEmployerOpportunity } = require('../services/jobSources/employerOpportunityAdapter');

// Get all opportunities (with filters)
router.get('/', async (req, res) => {
  try {
    const { type, location, skills } = req.query;
    let filter = { status: 'open' };

    if (type) filter.type = type;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (skills) {
      filter['skills.name'] = { $in: skills.split(',') };
    }

    const opportunities = await Opportunity.find(filter)
      .populate('companyId', 'companyName website logo')
      .sort({ createdAt: -1 });

    res.json({ success: true, opportunities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunities: ' + err.message });
  }
});

// Get specific opportunity
router.get('/:id', async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id)
      .populate('companyId');
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    res.json({ success: true, opportunity });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunity: ' + err.message });
  }
});

// Create opportunity (industry only)
router.post('/', auth, authorize('industry'), async (req, res) => {
  try {
    const { type, title, description, skills, location, locationType, salary, duration, experienceRequired, education } = req.body;

    const company = await Company.findOne({ userId: req.user.userId });
    if (!company) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const opportunity = new Opportunity({
      companyId: company._id,
      type,
      title,
      description,
      skills,
      location,
      locationType,
      salary,
      duration,
      experienceRequired,
      education
    });

    await opportunity.save();
    await syncEmployerOpportunity(opportunity);

    // Add to company's opportunities
    company.opportunities.push(opportunity._id);
    await company.save();

    res.status(201).json({ success: true, opportunity });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create opportunity: ' + err.message });
  }
});

// Update opportunity (industry only)
router.put('/:id', auth, authorize('industry'), async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const company = await Company.findOne({ userId: req.user.userId });
    if (!company || company._id.toString() !== opportunity.companyId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedOpportunity = await Opportunity.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    await syncEmployerOpportunity(updatedOpportunity);

    res.json({ success: true, opportunity: updatedOpportunity });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update opportunity: ' + err.message });
  }
});

// Close opportunity
router.patch('/:id/close', auth, authorize('industry'), async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const company = await Company.findOne({ userId: req.user.userId });
    if (!company || company._id.toString() !== opportunity.companyId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    opportunity.status = 'closed';
    await opportunity.save();
    await syncEmployerOpportunity(opportunity);

    res.json({ success: true, opportunity });
  } catch (err) {
    res.status(500).json({ error: 'Failed to close opportunity: ' + err.message });
  }
});

module.exports = router;
