const express = require('express');
const Analytics = require('../models/Analytics');
const UserData = require('../models/UserData');
const router = express.Router();

// GET /api/analytics/stats - Get overall statistics
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // Get total users
    const totalUsers = await UserData.countDocuments({ isActive: true });
    
    // Get new users in date range
    const newUsers = await UserData.countDocuments({
      ...dateFilter,
      isActive: true
    });

    // Get event counts by type
    const eventStats = await Analytics.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get top universities
    const topUniversities = await UserData.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$university',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get top organizations
    const topOrganizations = await UserData.aggregate([
      { $match: { isActive: true, 'organization.name': { $exists: true } } },
      {
        $group: {
          _id: '$organization.name',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get daily activity for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyActivity = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalUsers,
      newUsers,
      eventStats,
      topUniversities,
      topOrganizations,
      dailyActivity
    });

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
    const { 
      page = 1, 
      limit = 50, 
      eventType, 
      university, 
      organization,
      startDate,
      endDate 
    } = req.query;
    
    let query = {};
    
    if (eventType) {
      query.eventType = eventType;
    }
    
    if (university) {
      query.university = new RegExp(university, 'i');
    }
    
    if (organization) {
      query.organization = new RegExp(organization, 'i');
    }
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const events = await Analytics.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Analytics.countDocuments(query);

    res.json({
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
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
    
    const recentEvents = await Analytics.find({
      timestamp: { $gte: oneHourAgo }
    })
    .sort({ timestamp: -1 })
    .limit(20)
    .populate('userId', 'name username');

    const activeUsers = await UserData.countDocuments({
      lastActive: { $gte: oneHourAgo }
    });

    res.json({
      recentEvents,
      activeUsers,
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