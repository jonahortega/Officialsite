import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import './MessagesScreen.css';

const MessagesScreen = ({ user, onNavigate, conversations, setConversations, activeConversation, setActiveConversation, navigationData }) => {
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConversationSearch, setNewConversationSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [updatedConversations, setUpdatedConversations] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversationId]);

  // Organization data
  const organizationData = {
    greekOrganizations: [
      {
        id: 'alpha-sigma-phi',
        name: 'Alpha Sigma Phi Fraternity',
        shortName: 'Alpha Sigma Phi',
        type: 'Fraternity',
        avatar: '🏛️',
        members: 45,
        isOnline: true,
        lastMessage: 'Hey brothers! Hope you\'re having a great Fall Semester, we\'re holding our first Greek interest event for any newcomers looking to rush and meet the brothers',
        time: '2:15 PM',
        unread: 5,
        color: '#667eea'
      }
    ],
    academicClubs: [
      {
        id: 'computer-science-club',
        name: 'Computer Science Club',
        shortName: 'CS Club',
        type: 'Academic Club',
        avatar: '💻',
        members: 28,
        isOnline: true,
        lastMessage: 'Great job at the hackathon everyone! We\'re hosting a workshop next week for new members',
        time: '11:15 AM',
        unread: 0,
        color: '#43e97b'
      }
    ]
  };

  // Enhanced organization group chats with detailed messages - Only for user's organizations
  const generateOrganizationChats = useCallback(() => {
    const chats = [];
    
    // Pre-populated conversations for demonstration
    const sampleConversations = [
      {
        id: 'alpha-sigma-phi',
        name: 'Alpha Sigma Phi Fraternity',
        shortName: 'Alpha Sigma Phi',
        type: 'Fraternity',
        avatar: '🏛️',
        members: 45,
        isOnline: true,
        lastMessage: 'Great job at the philanthropy event everyone! 🎉',
        time: '2:15 PM',
        unread: 3,
        color: '#667eea',
        messages: [
          {
            id: 1,
            sender: 'system',
            content: 'You joined the Alpha Sigma Phi Fraternity group chat',
            timestamp: '2024-01-15T10:00:00Z',
            type: 'system',
            avatar: 'https://i.pravatar.cc/150?img=1'
          },
          {
            id: 2,
            sender: 'Brother Mike',
            content: 'Hey brothers! Hope everyone had a great weekend',
            timestamp: '2024-01-15T10:05:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=2'
          },
          {
            id: 3,
            sender: 'Brother Alex',
            content: 'Weekend was awesome! Ready for the week ahead 💪',
            timestamp: '2024-01-15T10:07:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=3'
          },
          {
            id: 4,
            sender: 'Brother Chris',
            content: 'Don\'t forget about the philanthropy event this Friday!',
            timestamp: '2024-01-15T10:10:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=4'
          },
          {
            id: 5,
            sender: 'Brother David',
            content: 'I\'ll bring the supplies for the event',
            timestamp: '2024-01-15T10:12:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=5'
          },
          {
            id: 6,
            sender: 'Brother Mike',
            content: 'Perfect! Great job at the philanthropy event everyone! 🎉',
            timestamp: '2024-01-15T14:15:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=2'
          }
        ]
      },
      {
        id: 'computer-science-club',
        name: 'Computer Science Club',
        shortName: 'CS Club',
        type: 'Academic Club',
        avatar: '💻',
        members: 28,
        isOnline: true,
        lastMessage: 'Hackathon planning meeting tomorrow at 3 PM!',
        time: '11:30 AM',
        unread: 0,
        color: '#43e97b',
        messages: [
          {
            id: 1,
            sender: 'system',
            content: 'You joined the Computer Science Club group chat',
            timestamp: '2024-01-10T09:00:00Z',
            type: 'system',
            avatar: 'https://i.pravatar.cc/150?img=6'
          },
          {
            id: 2,
            sender: 'Sarah (President)',
            content: 'Welcome everyone to the CS Club! 👋',
            timestamp: '2024-01-10T09:05:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=7'
          },
          {
            id: 3,
            sender: 'John',
            content: 'Excited to be here! What projects are we working on?',
            timestamp: '2024-01-10T09:08:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=8'
          },
          {
            id: 4,
            sender: 'Sarah (President)',
            content: 'We\'re planning a hackathon next month!',
            timestamp: '2024-01-10T09:10:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=7'
          },
          {
            id: 5,
            sender: 'Emily',
            content: 'That sounds amazing! I\'m in! 🚀',
            timestamp: '2024-01-10T09:12:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=9'
          },
          {
            id: 6,
            sender: 'Sarah (President)',
            content: 'Hackathon planning meeting tomorrow at 3 PM!',
            timestamp: '2024-01-15T11:30:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=7'
          }
        ]
      },
      {
        id: 'delta-epsilon-zeta',
        name: 'Delta Epsilon Zeta Sorority',
        shortName: 'DEZ',
        type: 'Sorority',
        avatar: '🌸',
        members: 52,
        isOnline: false,
        lastMessage: 'Sisterhood retreat this weekend! Pack your bags! 🎒',
        time: '9:45 AM',
        unread: 7,
        color: '#ff6b9d',
        messages: [
          {
            id: 1,
            sender: 'system',
            content: 'You joined the Delta Epsilon Zeta Sorority group chat',
            timestamp: '2024-01-12T14:00:00Z',
            type: 'system',
            avatar: 'https://i.pravatar.cc/150?img=10'
          },
          {
            id: 2,
            sender: 'Sister Jessica',
            content: 'Hi sisters! 💕',
            timestamp: '2024-01-12T14:05:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=11'
          },
          {
            id: 3,
            sender: 'Sister Amanda',
            content: 'Hey everyone! How was your weekend?',
            timestamp: '2024-01-12T14:07:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=12'
          },
          {
            id: 4,
            sender: 'Sister Rachel',
            content: 'Weekend was perfect! Ready for the week! ✨',
            timestamp: '2024-01-12T14:10:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=13'
          },
          {
            id: 5,
            sender: 'Sister Jessica',
            content: 'Don\'t forget about the sisterhood retreat!',
            timestamp: '2024-01-12T14:15:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=11'
          },
          {
            id: 6,
            sender: 'Sister Amanda',
            content: 'Sisterhood retreat this weekend! Pack your bags! 🎒',
            timestamp: '2024-01-15T09:45:00Z',
            type: 'message',
            avatar: 'https://i.pravatar.cc/150?img=12'
          }
        ]
      }
    ];
    
    // Add sample conversations to the chats array
    chats.push(...sampleConversations);
    
    return chats;
  }, [user]);

  // Enhanced individual conversations
  const individualConversations = useMemo(() => [
    {
      id: 'individual-1',
      type: 'individual',
      name: 'Sarah Johnson',
      role: 'Theta KI President',
      lastMessage: 'Great meeting everyone! Don\'t forget about the social this weekend.',
      time: '2:30 PM',
      unread: 2,
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      isOnline: true,
      status: 'Active now'
    },
    {
      id: 'individual-2',
      type: 'individual',
      name: 'Michael Chen',
      role: 'Soccer Club Captain',
      lastMessage: 'What time does the practice start tomorrow?',
      time: '1:45 PM',
      unread: 1,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      isOnline: false,
      status: 'Last seen 2 hours ago'
    },
    {
      id: 'individual-3',
      type: 'individual',
      name: 'Jessica Lee',
      role: 'Debate Club VP',
      lastMessage: 'The tournament schedule has been updated. Check your email!',
      time: '11:20 AM',
      unread: 0,
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      isOnline: true,
      status: 'Active now'
    },
    {
      id: 'individual-4',
      type: 'individual',
      name: 'Ryan Thompson',
      role: 'Volunteer Corps Leader',
      lastMessage: 'Thanks for helping with the cleanup event!',
      time: '10:15 AM',
      unread: 3,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      isOnline: false,
      status: 'Last seen 30 min ago'
    }
  ], []);

  // Combine organization chats with individual conversations
  const allConversations = useMemo(() => {
    const baseConversations = [
      ...generateOrganizationChats(),
      ...individualConversations
    ];
    
    // Apply any updates from updatedConversations
    return baseConversations.map(conv => {
      if (updatedConversations[conv.id]) {
        return { ...conv, ...updatedConversations[conv.id] };
      }
      return conv;
    });
  }, [generateOrganizationChats, individualConversations, updatedConversations]);

  // Helper to get the selected conversation object
  const selectedConversation = allConversations.find(c => c.id === selectedConversationId) || null;

  // Filter conversations to only show organization group chats and filter by search term
  const filteredConversations = allConversations.filter(conversation => {
    // Only show organization group chats (not individual conversations)
    const isOrganizationChat = conversation.type !== 'individual';
    
    // Filter by search term
    const matchesSearch = conversation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conversation.shortName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conversation.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    
    return isOrganizationChat && matchesSearch;
  });

  // Set active conversation if provided from props
  useEffect(() => {
    if (activeConversation && !selectedConversationId) {
      const conversation = allConversations.find(conv => conv.id === activeConversation);
      if (conversation) {
        setSelectedConversationId(conversation.id);
      }
    }
  }, [activeConversation, allConversations, selectedConversationId]);

  // Handle conversationId from navigation data
  useEffect(() => {
    if (navigationData?.conversationId && !selectedConversationId) {
      const conversation = allConversations.find(conv => conv.id === navigationData.conversationId);
      if (conversation) {
        setSelectedConversationId(conversation.id);
      }
    }
  }, [navigationData, allConversations, selectedConversationId]);

  // Close modals when entering a conversation
  useEffect(() => {
    if (selectedConversationId) {
      setShowGroupMembers(false);
      setShowNewConversation(false);
      setNewConversationSearch('');
    }
  }, [selectedConversationId]);

  // Enhanced messages for different conversations
  const getConversationMessages = (conversation) => {
    // Safety check to prevent runtime errors
    if (!conversation) {
      console.warn('getConversationMessages called with null/undefined conversation');
      return [];
    }
    
    // Check if this conversation has updated messages
    const updatedConv = updatedConversations[conversation.id];
    
    console.log('Getting messages for conversation:', conversation.id);
    console.log('Updated conv:', updatedConv);
    
    // If conversation has updated messages, use those
    if (updatedConv && updatedConv.messages && updatedConv.messages.length > 0) {
      console.log('Using updated messages:', updatedConv.messages);
      return updatedConv.messages.map(msg => ({
        id: msg.id,
        sender: msg.sender,
        senderRole: msg.sender === 'You' ? 'You' : 'Member',
        message: msg.content || msg.message, // Handle both content and message fields
        time: msg.time,
        isOwn: msg.isOwn,
        type: msg.type || 'message',
        reactions: msg.reactions || [],
        avatar: msg.avatar
      }));
    }
    
    // If conversation has a messages array, use it (for pre-populated messages)
    if (conversation.messages && conversation.messages.length > 0) {
      return conversation.messages.map(msg => ({
        id: msg.id,
        sender: msg.sender === 'system' ? 'System' : msg.sender,
        senderRole: msg.sender === 'system' ? 'System' : (msg.sender.includes('Brother') ? 'Member' : msg.sender.includes('Sister') ? 'Member' : 'Member'),
        message: msg.content,
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: false,
        type: msg.type || 'message',
        reactions: msg.reactions || [],
        avatar: msg.avatar
      }));
    }
    
    // Handle new organization conversations from props
    if (conversation.type === 'organization' && conversation.messages) {
      return conversation.messages.map(msg => ({
        id: msg.id,
        sender: msg.sender === 'system' ? 'System' : conversation.name,
        senderRole: msg.sender === 'system' ? 'System' : 'Organization',
        message: msg.content,
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: false,
        type: msg.type || 'message',
        reactions: msg.reactions || [],
        avatar: msg.avatar
      }));
    }
    
    // Default empty array if no messages found
    return [];
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation && !isSending) {
      setIsSending(true);
      const messageId = Date.now();
      const timestamp = new Date().toISOString();
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Create the new message
      const newMessageObj = {
        id: messageId,
        sender: user?.name || 'You',
        content: newMessage,
        timestamp,
        time: currentTime,
        isOwn: true,
        type: 'message',
        avatar: 'https://i.pravatar.cc/150?img=1' // Default avatar for user
      };
      
      // Get existing messages for this conversation
      const existingMessages = selectedConversation.messages || [];
      
      // Update the updatedConversations state with existing + new message
      setUpdatedConversations(prev => {
        const currentMessages = prev[selectedConversation.id]?.messages || existingMessages;
        const newState = {
          ...prev,
          [selectedConversation.id]: {
            messages: [...currentMessages, newMessageObj],
            lastMessage: newMessage,
            time: currentTime
          }
        };
        console.log('Updated conversations:', newState);
        return newState;
      });
      
      // Clear input and typing state
      setNewMessage('');
      setIsTyping(false);
      
      // Scroll to bottom after a short delay to ensure the message is rendered
      setTimeout(() => {
        scrollToBottom();
        setIsSending(false);
      }, 100);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
    }
  };

  const startNewConversation = () => {
    setShowNewConversation(true);
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Handle file upload
      console.log('File selected:', file.name);
    }
  };

  const handleGroupMembersClick = (conversation, e) => {
    e.stopPropagation();
    console.log('Members button clicked for:', conversation);
    try {
      if (!conversation) {
        console.error('No conversation provided to handleGroupMembersClick');
        return;
      }
      console.log('Setting selectedGroup to:', conversation);
      setSelectedGroup(conversation);
      setShowGroupMembers(true);
      console.log('Members modal should now be visible');
    } catch (error) {
      console.error('Error in handleGroupMembersClick:', error);
      // Don't crash the app, just log the error
    }
  };

  const handleProfileClick = (conversation) => {
    if (conversation.type === 'individual') {
      // Navigate to user profile
      onNavigate('profile', { userId: conversation.id });
    } else {
      // Navigate to organization profile
      onNavigate('organization-profile', { organizationId: conversation.id });
    }
  };

  const generateGroupMembers = (group) => {
    try {
      if (!group) {
        console.error('No group provided to generateGroupMembers');
        return [];
      }
      
      const members = [];
      const roles = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Member'];
      const years = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
      const majors = ['Computer Science', 'Business', 'Engineering', 'Psychology', 'Biology'];
      
      const memberCount = group.members || 10;
      
      for (let i = 0; i < memberCount; i++) {
        members.push({
          id: `member-${i}`,
          name: `Member ${i + 1}`,
          role: roles[i % roles.length],
          year: years[i % years.length],
          major: majors[i % majors.length],
          avatar: `https://i.pravatar.cc/150?img=${i + 1}`,
          isOnline: Math.random() > 0.5
        });
      }
      
      return members;
    } catch (error) {
      console.error('Error in generateGroupMembers:', error);
      return [];
    }
  };

  const renderConversationsList = () => (
    <div className="clean-messages-container">
      {/* Clean Header with Search and New Message */}
      <div className="clean-header">
        <div className="search-new-row">
          <div className="search-container">
            <div className="search-icon">🔍</div>
            <input
              type="text"
              placeholder="Search your organization chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="clean-search-input"
            />
          </div>
          <button className="new-message-btn" onClick={startNewConversation}>
            <span className="plus-icon">+</span>
          </button>
        </div>
      </div>

      {/* Clean Conversations List */}
      <div className="clean-conversations">
        {filteredConversations.length > 0 ? (
          filteredConversations.map(conversation => (
            <div 
              key={conversation.id} 
              className={`clean-conversation-item ${selectedConversationId === conversation.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedConversationId(conversation.id);
                setShowGroupMembers(false);
                setSelectedGroup(null);
                setShowNewConversation(false);
                setNewMessage('');
              }}
            >
              <div className="conversation-avatar">
                <div className="avatar-circle" style={{ backgroundColor: conversation.color }}>
                  {conversation.avatar}
                </div>
                {conversation.isOnline && <div className="online-dot"></div>}
              </div>
              
              <div className="conversation-content">
                <div className="conversation-header">
                  <h3 className="conversation-name">{conversation.shortName || conversation.name}</h3>
                  <span className="conversation-time">{conversation.time}</span>
                </div>
                <p className="conversation-preview">{conversation.lastMessage}</p>
                <div className="conversation-meta">
                  <span className="member-count">{conversation.members} members</span>
                  <span className="organization-type">{conversation.type}</span>
                </div>
              </div>
              
              {conversation.unread > 0 && (
                <div className="unread-badge">
                  <span>{conversation.unread}</span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>No conversations yet</h3>
            <p>Start chatting with your organizations to see them here</p>
            <button className="start-chat-btn" onClick={startNewConversation}>
              Start Your First Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderChatView = () => {
    // Safety check to prevent runtime errors
    if (!selectedConversation) {
      return (
        <div className="clean-chat-view">
          <div className="clean-chat-header">
            <button 
              className="back-btn"
              onClick={() => setSelectedConversationId(null)}
            >
              ←
            </button>
            <div className="chat-info">
              <div className="chat-details">
                <h3>Conversation not found</h3>
              </div>
            </div>
          </div>
          <div className="clean-chat-messages">
            <div className="empty-state">
              <p>This conversation could not be loaded.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="clean-chat-view">
        <div className="clean-chat-header">
          <button 
            className="back-btn"
            onClick={() => setSelectedConversationId(null)}
          >
            ←
          </button>
          <div className="chat-info">
            <div className="chat-avatar">
              <div className="avatar-circle" style={{ backgroundColor: selectedConversation.color || '#667eea' }}>
                {selectedConversation.avatar || '🏛️'}
              </div>
              {selectedConversation.isOnline && <div className="online-dot"></div>}
            </div>
            <div className="chat-details">
              <h3>{selectedConversation.name || 'Unknown'}</h3>
              <span className="chat-status">
                {selectedConversation.type === 'individual' ? (
                  selectedConversation.status || 'Online'
                ) : (
                  `${selectedConversation.members || 0} members`
                )}
              </span>
            </div>
          </div>
          <div className="chat-actions">
            <div className="more-options-container">
              <button 
                className="action-btn more-options-btn" 
                title="More Options"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreOptions(!showMoreOptions);
                }}
              >
                ⋯
              </button>
              {showMoreOptions && (
                <div className="more-options-dropdown">
                  <button 
                    className="dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGroupMembersClick(selectedConversation, e);
                      setShowMoreOptions(false);
                    }}
                  >
                    👥 View Members
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedConversation) {
                        handleProfileClick(selectedConversation);
                      }
                      setShowMoreOptions(false);
                    }}
                  >
                    👤 Visit Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="clean-chat-messages">
          {getConversationMessages(selectedConversation).map(message => (
            <div key={message.id} className={`clean-message ${message.isOwn ? 'own' : ''} ${message.type}`}>
              {!message.isOwn && message.avatar && (
                <div className="message-avatar">
                  <img src={message.avatar} alt={message.sender} />
                </div>
              )}
              <div className="clean-message-content">
                {!message.isOwn && (
                  <div className="message-sender">
                    <span className="sender-name">{message.sender}</span>
                    {message.senderRole && (
                      <span className="sender-role">{message.senderRole}</span>
                    )}
                  </div>
                )}
                <div className="message-text">{message.message}</div>
                {message.reactions && (
                  <div className="message-reactions">
                    {Object.entries(message.reactions).map(([emoji, count]) => (
                      <span key={emoji} className="reaction">
                        {emoji} {count}
                      </span>
                    ))}
                  </div>
                )}
                <div className="message-time">{message.time}</div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="clean-message typing">
              <div className="clean-message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="clean-chat-input">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button className="clean-input-btn attachment-btn" onClick={handleFileUpload} title="Attach file">
            📎
          </button>
          <div className="clean-input-container">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="clean-message-input"
            />
            <button
              className="clean-input-btn emoji-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add emoji"
            >
              😊
            </button>
          </div>
          <button
            className="clean-input-btn send-btn"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            title="Send message"
          >
            📤
          </button>
        </div>
      </div>
    );
  };

  const renderGroupMembersModal = () => {
    try {
      if (!showGroupMembers || !selectedGroup) {
        console.log('Modal not showing - showGroupMembers:', showGroupMembers, 'selectedGroup:', selectedGroup);
        return null;
      }
      
      console.log('Rendering members modal for:', selectedGroup);
      const members = generateGroupMembers(selectedGroup);
      
      return (
        <div className="group-members-modal-overlay" onClick={() => setShowGroupMembers(false)}>
          <div className="group-members-modal modern-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header modern-header">
              <div className="modal-title-section">
                <div className="modal-org-avatar">
                  <div className="modal-avatar-circle" style={{ backgroundColor: selectedGroup.color || '#667eea' }}>
                    {selectedGroup.avatar || '🏛️'}
                  </div>
                </div>
                <div className="modal-title-content">
                  <h3>{selectedGroup.name} Members</h3>
                  <span className="modal-subtitle">{selectedGroup.members} members • {selectedGroup.type}</span>
                </div>
              </div>
              <button 
                className="close-modal-btn modern-close-btn"
                onClick={() => setShowGroupMembers(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="members-list modern-members-list">
              <div className="members-header modern-members-header">
                <h4>Organization Members</h4>
                <div className="members-search">
                  <input 
                    type="text" 
                    placeholder="Search members..." 
                    className="member-search-input"
                  />
                </div>
              </div>
              
              <div className="members-grid modern-members-grid">
                {members.map(member => (
                  <div key={member.id} className="member-item modern-member-item">
                    <div className="member-avatar modern-member-avatar">
                      <img src={member.avatar} alt={member.name} />
                      <span className={`status-dot modern-status-dot ${member.isOnline ? 'online' : 'offline'}`}></span>
                    </div>
                    <div className="member-info modern-member-info">
                      <h5 className="member-name">{member.name}</h5>
                      <span className="member-role modern-role">{member.role}</span>
                      <span className="member-status modern-status">{member.year} • {member.major}</span>
                    </div>
                    <div className="member-actions">
                      <button 
                        className="message-member-btn modern-message-btn" 
                        title="Send message"
                        onClick={() => {
                          try {
                            // Create a new individual conversation
                            const newConversation = {
                              id: `member-${member.id}`,
                              type: 'individual',
                              name: member.name,
                              avatar: member.avatar,
                              isOnline: member.isOnline,
                              lastMessage: '',
                              time: 'Now',
                              unread: 0
                            };
                            setConversations(prev => [newConversation, ...prev]);
                            setSelectedConversationId(newConversation.id);
                            setShowGroupMembers(false);
                          } catch (error) {
                            console.error('Error creating new conversation:', error);
                          }
                        }}
                      >
                        💬
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error in renderGroupMembersModal:', error);
      return null;
    }
  };

  const renderNewConversationModal = () => {
    if (!showNewConversation) return null;
    
    const allOrganizations = generateOrganizationChats();
    
    // Filter organizations based on search
    const filteredOrganizations = allOrganizations.filter(org => 
      org.name.toLowerCase().includes(newConversationSearch.toLowerCase()) ||
      org.type.toLowerCase().includes(newConversationSearch.toLowerCase())
    );
    
    return (
      <div className="group-members-modal-overlay" onClick={() => setShowNewConversation(false)}>
        <div className="group-members-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Start New Conversation</h3>
            <button 
              className="close-modal-btn"
              onClick={() => setShowNewConversation(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="members-list">
            <div className="members-header">
              <h4>Your Organization Group Chats</h4>
              <p className="members-subtitle">Join group chats for organizations you're part of</p>
              <div className="members-filter">
                <input 
                  type="text" 
                  placeholder="Search your organizations..." 
                  className="member-search"
                  value={newConversationSearch}
                  onChange={(e) => setNewConversationSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="members-grid">
              {filteredOrganizations.map(org => (
                <div key={org.id} className="member-item">
                  <div className="member-avatar">
                    <div className="group-avatar" style={{ backgroundColor: org.color }}>
                      {org.avatar}
                    </div>
                    <span className={`status-dot ${org.isOnline ? 'online' : 'offline'}`}></span>
                  </div>
                  <div className="member-info">
                    <h5>{org.name}</h5>
                    <span className="member-role">{org.type}</span>
                    <span className="member-status">{org.members} members</span>
                  </div>
                  <button 
                    className="message-member-btn" 
                    title="Join group chat"
                    onClick={() => {
                      // Create a new group conversation
                      const newConversation = {
                        ...org,
                        lastMessage: '',
                        time: 'Now',
                        unread: 0
                      };
                      setConversations(prev => [newConversation, ...prev]);
                      setSelectedConversationId(newConversation.id);
                      setShowNewConversation(false);
                    }}
                  >
                    💬
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="messages-screen">
        <div className="messages-container">
          <div className="messages-content">
            {!selectedConversationId ? renderConversationsList() : renderChatView()}
          </div>
        </div>
      </div>
      
      {/* Render modals outside the main container to prevent interference */}
      {renderGroupMembersModal()}
      {renderNewConversationModal()}
    </>
  );
};

export default MessagesScreen;