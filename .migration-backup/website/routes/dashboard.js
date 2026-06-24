const express = require('express');
const router = express.Router();

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // This would typically fetch from your database
    // For now, return mock data
    res.json({
      totalSubmissions: 0,
      newSubmissions: 0,
      universities: 0,
      conversionRate: 0
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats'
    });
  }
});

module.exports = router; 