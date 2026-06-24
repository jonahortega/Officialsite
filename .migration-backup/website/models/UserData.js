const mongoose = require('mongoose');

const userDataSchema = new mongoose.Schema({
  // Basic user info
  username: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  
  // University info
  university: {
    type: String,
    required: true
  },
  
  // Greek organization info
  organization: {
    name: String,
    type: String, // Fraternity, Sorority, Club
    id: String
  },
  
  // Academic info
  year: String,
  major: String,
  bio: String,
  
  // Profile info
  image: String,
  
  // App usage data
  appVersion: String,
  deviceInfo: {
    platform: String,
    userAgent: String
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  // Analytics data
  screenViews: [{
    screen: String,
    timestamp: Date,
    duration: Number
  }],
  
  events: [{
    type: String, // login, signup, view_organization, etc.
    timestamp: Date,
    data: mongoose.Schema.Types.Mixed
  }],
  
  // Source tracking
  source: {
    type: String,
    default: 'greek-life-app'
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
userDataSchema.index({ createdAt: -1 });
userDataSchema.index({ university: 1 });
userDataSchema.index({ 'organization.name': 1 });
userDataSchema.index({ lastActive: -1 });

module.exports = mongoose.model('UserData', userDataSchema); 