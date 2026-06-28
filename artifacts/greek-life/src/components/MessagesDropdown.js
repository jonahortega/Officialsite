import React, { useState, useEffect } from 'react';
import './MessagesDropdown.css';

const MessagesDropdown = ({ conversations, onNavigate, onStartConversation }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const count = (conversations || []).filter(conv => conv.unread > 0).length;
    setUnreadCount(count);
  }, [conversations]);

  const handleToggle = () => {
    // Navigate directly to messages screen instead of opening dropdown
    onNavigate('messages');
  };

  const handleConversationClick = (conversation) => {
    onNavigate('messages', { conversationId: conversation.id });
    setIsOpen(false);
  };

  const handleNewMessage = () => {
    onNavigate('messages');
    setIsOpen(false);
  };

  const getConversationIcon = (type) => {
    switch (type) {
      case 'individual':
        return '👤';
      case 'group':
        return '👥';
      case 'organization':
        return '🏛️';
      case 'Fraternity':
        return '🏛️';
      case 'Sorority':
        return '🏛️';
      case 'Sports Club':
        return '⚽';
      case 'Academic Club':
        return '📚';
      case 'Creative Club':
        return '🎨';
      case 'Service Club':
        return '🤝';
      default:
        return '💬';
    }
  };

  return (
    <div className="messages-dropdown-container">
      {/* Messages Icon */}
      <div className="messages-icon" onClick={handleToggle}>
        <span className="message-icon">💬</span>
        {unreadCount > 0 && (
          <span className="message-badge">{unreadCount}</span>
        )}
      </div>

      {/* Messages Panel */}
      {isOpen && (
        <div className="messages-panel">
          <div className="messages-header">
            <h3>Messages</h3>
            <button 
              className="close-btn"
              onClick={handleToggle}
            >
              ✕
            </button>
          </div>
          
          <div className="messages-list">
            {conversations.length === 0 ? (
              <div className="no-messages">
                <span className="no-messages-icon">💬</span>
                <p>No messages yet</p>
                <button className="new-message-btn" onClick={handleNewMessage}>
                  Start a conversation
                </button>
              </div>
            ) : (
              <>
                {conversations.slice(0, 5).map(conversation => (
                  <div 
                    key={conversation.id} 
                    className={`message-item ${conversation.unread > 0 ? 'unread' : ''}`}
                    onClick={() => handleConversationClick(conversation)}
                  >
                    <div className="message-avatar">
                      {conversation.type === 'individual' ? (
                        <img src={conversation.avatar} alt={conversation.name} />
                      ) : (
                        <div className="group-avatar" style={{ backgroundColor: conversation.color }}>
                          {getConversationIcon(conversation.type)}
                        </div>
                      )}
                      <span className={`status-dot ${conversation.isOnline ? 'online' : 'offline'}`}></span>
                    </div>
                    <div className="message-content">
                      <h4>{conversation.shortName || conversation.name}</h4>
                      <p>{conversation.lastMessage || 'No messages yet'}</p>
                      <span className="message-time">{conversation.time || 'Now'}</span>
                    </div>
                    {conversation.unread > 0 && (
                      <div className="unread-badge">
                        {conversation.unread > 9 ? '9+' : conversation.unread}
                      </div>
                    )}
                  </div>
                ))}
                {conversations.length > 5 && (
                  <button className="view-all-messages" onClick={handleNewMessage}>
                    View all {conversations.length} conversations
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesDropdown; 