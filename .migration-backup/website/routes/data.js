const express = require('express');
const { body, validationResult } = require('express-validator');
const UserData = require('../models/UserData');
const Analytics = require('../models/Analytics');
const router = express.Router();

// Middleware to validate API key (optional security)
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return res.status(401).json({ message: 'Invalid API key' });
  }
  next();
};

// POST /api/data/user - Receive user data from app
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
    
    // For now, just log the data and return success
    console.log('Received user submission:', userData);
    
    res.status(201).json({
      success: true,
      message: 'User data received successfully!',
      userId: 'demo-' + Date.now()
    });

  } catch (error) {
    console.error('Error processing user data:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing user data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/data/analytics - Receive analytics events from app
router.post('/analytics', [
  validateApiKey,
  body('eventType').isIn([
    'user_signup', 'user_login', 'screen_view', 'organization_view',
    'event_view', 'message_sent', 'profile_update', 'app_launch',
    'error', 'feature_usage'
  ]).withMessage('Valid event type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const analyticsData = req.body;
    
    const analytics = await Analytics.create({
      ...analyticsData,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Analytics data received',
      analyticsId: analytics._id
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

// GET /api/data/users - Get all users (for dashboard)
router.get('/users', async (req, res) => {
  try {
    // For demo purposes, return mock data
    const mockUsers = [
      {
        _id: 'demo-1',
        name: 'John Smith',
        email: 'john.smith@university.edu',
        university: 'University of California, Berkeley',
        role: 'Greek Life Advisor',
        organization: 'Alpha Beta Gamma',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      },
      {
        _id: 'demo-2',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@college.edu',
        university: 'Stanford University',
        role: 'Student Leader',
        organization: 'Delta Epsilon Zeta',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        lastActive: new Date().toISOString()
      }
    ];

    res.json({
      users: mockUsers,
      totalPages: 1,
      currentPage: 1,
      total: mockUsers.length
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// GET /api/data/user/:id - Get specific user
router.get('/user/:id', async (req, res) => {
  try {
    const user = await UserData.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

module.exports = router; 