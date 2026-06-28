const express = require('express');
const router = express.Router();

// GET /api/analytics/stats - Get overall statistics
router.get('/stats', async (req, res) => {
  try {
    // Mock statistics for demo
    const stats = {
      totalUsers: 2,
      newUsers: 1,
      eventStats: [
        { _id: 'page_view', count: 15 },
        { _id: 'form_submit', count: 2 },
        { _id: 'button_click', count: 8 },
        { _id: 'demo_video_play', count: 3 }
      ],
      topUniversities: [
        { _id: 'University of California, Berkeley', count: 1 },
        { _id: 'Stanford University', count: 1 }
      ],
      topOrganizations: [
        { _id: 'Alpha Beta Gamma', count: 1 },
        { _id: 'Delta Epsilon Zeta', count: 1 }
      ],
      dailyActivity: [
        { _id: new Date().toISOString().split('T')[0], count: 2 },
        { _id: new Date(Date.now() - 86400000).toISOString().split('T')[0], count: 1 }
      ]
    };

    res.json(stats);

  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics stats'
    });
  }
});

// GET /api/analytics/events - Get events with filtering
router.get('/events', async (req, res) => {
  try {
    // Mock events data
    const events = [
      {
        eventType: 'page_view',
        timestamp: new Date().toISOString(),
        eventData: { page: 'home' }
      },
      {
        eventType: 'form_submit',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        eventData: { form: 'contact' }
      }
    ];

    res.json({
      events,
      totalPages: 1,
      currentPage: 1,
      total: events.length
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events'
    });
  }
});

// GET /api/analytics/real-time - Get real-time activity
router.get('/real-time', async (req, res) => {
  try {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    // Mock real-time data
    const recentEvents = [
      {
        eventType: 'page_view',
        timestamp: new Date().toISOString(),
        eventData: { page: 'home' }
      }
    ];

    res.json({
      recentEvents,
      activeUsers: 1,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Error fetching real-time data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching real-time data'
    });
  }
});

module.exports = router; 