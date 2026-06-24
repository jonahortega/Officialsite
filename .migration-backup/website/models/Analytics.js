const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  // Event tracking
  eventType: {
    type: String,
    required: true,
    enum: [
      'user_signup',
      'user_login',
      'screen_view',
      'organization_view',
      'event_view',
      'message_sent',
      'profile_update',
      'app_launch',
      'error',
      'feature_usage'
    ]
  },
  
  // User context
  userId: {
    type: String,
    index: true
  },
  username: String,
  university: String,
  organization: String,
  
  // Event details
  eventData: {
    screen: String,
    duration: Number,
    action: String,
    target: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // Device and app info
  deviceInfo: {
    platform: String,
    userAgent: String,
    screenSize: String,
    appVersion: String
  },
  
  // Session info
  sessionId: String,
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now
  },
  
  // Source
  source: {
    type: String,
    default: 'greek-life-app'
  }
}, {
  timestamps: true
});

// Indexes
analyticsSchema.index({ eventType: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ university: 1, timestamp: -1 });
analyticsSchema.index({ organization: 1, timestamp: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema); 