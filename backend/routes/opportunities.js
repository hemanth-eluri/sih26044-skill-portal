const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Opportunity = require('../models/Opportunity');
const Company = require('../models/Company');
const { auth, authorize } = require('../middleware/auth');
const { syncEmployerOpportunity } = require('../services/jobSources/employerOpportunityAdapter');

// Get all opportunities (with filters)
router.get('/', async (req, res) => {
  try {
    const { type, location, locationType, skills } = req.query;
    let filter = {
      $and: [
        {
          $or: [
            { status: 'open' },
            { isOpen: true },
            { status: { $exists: false }, isOpen: { $ne: false } }
          ]
        },
        { status: { $ne: 'closed' } },
        { isOpen: { $ne: false } }
      ]
    };

    if (type) filter.type = type;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (locationType) filter.locationType = locationType;
    if (skills) {
      filter['skills.name'] = { $in: skills.split(',') };
    }

    const opportunities = await Opportunity.find(filter)
      .populate('companyId', 'companyName website logo')
      .populate('company', 'companyName website logo')
      .sort({ createdAt: -1 });

    const formatted = opportunities.map(opp => {
      const obj = opp.toObject();
      obj.company = obj.company || obj.companyId;
      obj.companyId = obj.companyId || obj.company;
      obj.requiredSkills = (obj.requiredSkills && obj.requiredSkills.length) ? obj.requiredSkills : obj.skills;
      return obj;
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunities: ' + err.message });
  }
});

// Get specific opportunity
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    const opportunity = await Opportunity.findById(req.params.id)
      .populate('companyId')
      .populate('company');
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    const obj = opportunity.toObject();
    obj.company = obj.company || obj.companyId;
    obj.companyId = obj.companyId || obj.company;
    obj.requiredSkills = (obj.requiredSkills && obj.requiredSkills.length) ? obj.requiredSkills : obj.skills;
    res.json({ ...obj, success: true, opportunity: obj });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunity: ' + err.message });
  }
});

// Create opportunity (industry only)
router.post('/', auth, authorize('industry'), async (req, res) => {
  try {
    const company = await Company.findOne({ userId: req.user.userId });
    if (!company) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const {
      type,
      title,
      description,
      skills,
      requiredSkills,
      location,
      locationType,
      salary,
      stipend,
      duration,
      experienceRequired,
      education,
      isOpen
    } = req.body;

    const opportunity = new Opportunity({
      companyId: company._id,
      company: company._id,
      type,
      title,
      description,
      skills: skills || requiredSkills,
      requiredSkills: requiredSkills || skills,
      location,
      locationType,
      salary,
      stipend,
      duration,
      experienceRequired,
      education,
      isOpen: isOpen !== undefined ? isOpen : true,
      status: 'open'
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
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const company = await Company.findOne({ userId: req.user.userId });
    const oppCompanyId = (opportunity.companyId || opportunity.company).toString();
    if (!company || oppCompanyId !== company._id.toString()) {
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
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const company = await Company.findOne({ userId: req.user.userId });
    const oppCompanyId = (opportunity.companyId || opportunity.company).toString();
    if (!company || oppCompanyId !== company._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    opportunity.status = 'closed';
    opportunity.isOpen = false;
    await opportunity.save();
    await syncEmployerOpportunity(opportunity);

    res.json({ success: true, opportunity });
  } catch (err) {
    res.status(500).json({ error: 'Failed to close opportunity: ' + err.message });
  }
});

module.exports = router;
