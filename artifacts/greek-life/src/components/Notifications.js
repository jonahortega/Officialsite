import React, { useState, useEffect } from 'react';
import './Notifications.css';

const Notifications = ({ notifications, onDismiss, onMarkAsRead, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const count = (notifications || []).filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = (notificationId) => {
    onMarkAsRead(notificationId);
  };

  const handleDismiss = (notificationId) => {
    onDismiss(notificationId);
  };

  const handleRespondToInvitation = (notification, response) => {
    // Mark as read and handle the response
    onMarkAsRead(notification.id);
    
    // In a real app, this would send the response to the backend
    console.log(`Responding to invitation from ${notification.organization}: ${response}`);
    
    // Show feedback
    // Invitation response handled - silent
    
    // Navigate to events screen for accepted invitations
    if (response === 'accept' && onNavigate) {
      onNavigate('events');
    }
  };

  const handleOpenMessage = (notification) => {
    // Mark as read
    onMarkAsRead(notification.id);
    
    // Navigate to messages screen
    if (onNavigate) {
      onNavigate('messages');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'event':
      case 'event-invitation':
        return '📅';
      case 'message':
        return '💬';
      case 'member':
        return '👋';
      case 'reminder':
        return '⏰';
      case 'alert':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  return (
    <div className="notifications-container">
      {/* Notification Bell */}
      <div className="notification-bell" onClick={handleToggle}>
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </div>

      {/* Notification Panel */}
      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button 
              className="close-btn"
              onClick={handleToggle}
            >
              ✕
            </button>
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <span className="no-notifications-icon">🔕</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <span className="notification-time">{notification.time}</span>
                    
                    {/* Action buttons for specific notification types */}
                    {notification.type === 'event-invitation' && !notification.read && (
                      <div className="notification-invitation-actions">
                        <button 
                          className="accept-btn"
                          onClick={() => handleRespondToInvitation(notification, 'accept')}
                        >
                          Accept
                        </button>
                        <button 
                          className="decline-btn"
                          onClick={() => handleRespondToInvitation(notification, 'decline')}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    
                    {notification.type === 'message' && !notification.read && (
                      <div className="notification-message-actions">
                        <button 
                          className="reply-btn"
                          onClick={() => handleOpenMessage(notification)}
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="notification-actions">
                    {!notification.read && (
                      <button 
                        className="mark-read-btn"
                        onClick={() => handleMarkAsRead(notification.id)}
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    <button 
                      className="dismiss-btn"
                      onClick={() => handleDismiss(notification.id)}
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications; 