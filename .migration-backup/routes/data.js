const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Store submissions in memory for demo (in production, use a database)
let submissions = [];
let submissionId = 1;

// Middleware to validate API key (optional security)
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return res.status(401).json({ message: 'Invalid API key' });
  }
  next();
};

// POST /api/data/user - Receive user data from contact form
router.post('/user', [
  validateApiKey,
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('university').notEmpty().withMessage('University is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userData = req.body;
    
    // Create submission object
    const submission = {
      id: submissionId++,
      ...userData,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      source: 'website-contact-form'
    };
    
    // Store in memory
    submissions.push(submission);
    
    console.log('✅ New submission received:', submission);
    
    res.status(201).json({
      success: true,
      message: 'Thank you! Your information has been submitted successfully. We\'ll be in touch soon!',
      submissionId: submission.id
    });

  } catch (error) {
    console.error('Error processing submission:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing submission',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/data/analytics - Receive analytics events
router.post('/analytics', [
  validateApiKey,
  body('eventType').isIn([
    'page_view', 'form_submit', 'button_click', 'demo_video_play'
  ]).withMessage('Valid event type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const analyticsData = req.body;
    
    console.log('📊 Analytics event:', analyticsData);
    
    res.status(201).json({
      success: true,
      message: 'Analytics data received',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error saving analytics data:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving analytics data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/data/users - Get all submissions (for dashboard)
router.get('/users', async (req, res) => {
  try {
    // Add some demo data if no submissions exist
    if (submissions.length === 0) {
      submissions = [
        {
          id: 1,
          name: 'John Smith',
          email: 'john.smith@university.edu',
          university: 'University of California, Berkeley',
          role: 'Greek Life Advisor',
          organization: 'Alpha Beta Gamma',
          greekCount: '11-25',
          message: 'Interested in learning more about your platform for our Greek community.',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          lastActive: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Sarah Johnson',
          email: 'sarah.johnson@college.edu',
          university: 'Stanford University',
          role: 'Student Leader',
          organization: 'Delta Epsilon Zeta',
          greekCount: '26-50',
          message: 'Our Greek community is looking for a better way to manage events and communication.',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          lastActive: new Date().toISOString()
        }
      ];
    }

    res.json({
      users: submissions,
      totalPages: 1,
      currentPage: 1,
      total: submissions.length
    });

  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching submissions'
    });
  }
});

// GET /api/data/user/:id - Get specific submission
router.get('/user/:id', async (req, res) => {
  try {
    const submission = submissions.find(s => s.id == req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    res.json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ message: 'Error fetching submission' });
  }
});

module.exports = router; 