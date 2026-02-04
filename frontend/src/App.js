// App.js - Fixed React App with FastAPI WebSocket Chat Integration
import React, { useState, useEffect, useRef } from 'react';

// --- API Configuration ---
const API_BASE = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000';

// --- WebSocket Service for FastAPI backend ---
class WebSocketService {
  constructor() {
    this.socket = null;
    this.messageListeners = [];
    this.connectionListeners = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.userId = null;
  }

  connect(userId) {
    this.userId = userId;
    
    try {
      // Connect to FastAPI WebSocket endpoint (no token in URL per your backend)
      this.socket = new WebSocket(`${WS_BASE}/messages/ws/${userId}`);
      
      this.socket.onopen = () => {
        console.log('✅ WebSocket connected to FastAPI');
        this.reconnectAttempts = 0;
        this.connectionListeners.forEach(listener => listener(true));
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📥 Received WebSocket message:', data);
          this.messageListeners.forEach(listener => listener(data));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.socket.onclose = () => {
        console.log('❌ WebSocket disconnected');
        this.connectionListeners.forEach(listener => listener(false));
        this.attemptReconnect();
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        if (this.userId) {
          this.connect(this.userId);
        }
      }, this.reconnectDelay);
    }
  }
  
  sendMessage(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return true;
    }
    console.warn('⚠️ WebSocket is not connected');
    return false;
  }
  
  sendTyping(conversationId) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: "typing",
        conversation_id: conversationId,
        user_id: this.userId
      }));
      return true;
    }
    return false;
  }
  
  addMessageListener(listener) {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }
  
  addConnectionListener(listener) {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.messageListeners = [];
    this.connectionListeners = [];
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

// --- API Configuration ---
const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('access_token');
    const headers = { 
      'Content-Type': 'application/json', 
      ...options.headers 
    };
    
    if (token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, { 
        ...options, 
        headers 
      });

      if (response.status === 401 && !options.skipAuth) {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });
            
            if (refreshResponse.ok) {
              const data = await refreshResponse.json();
              localStorage.setItem('access_token', data.access_token);
              return api.request(endpoint, options);
            }
          } catch (e) {
            console.error('Refresh token error:', e);
          }
        }
        localStorage.clear();
        window.location.href = '/';
        return null;
      }
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `Request failed with status ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  },

  async get(endpoint) { 
    try {
      const r = await this.request(endpoint); 
      if (r.status === 204) return null;
      const data = await r.json();
      return data || [];
    } catch (error) {
      console.error('GET Error:', error);
      throw error;
    }
  },

  async post(endpoint, data, skipAuth = false) {
    try {
      const r = await this.request(endpoint, { 
        method: 'POST', 
        body: JSON.stringify(data), 
        skipAuth 
      });
      if (r.status === 204) return null;
      return r.json();
    } catch (error) {
      console.error('POST Error:', error);
      throw error;
    }
  },

  async put(endpoint, data) { 
    try {
      const r = await this.request(endpoint, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      }); 
      if (r.status === 204) return null;
      return r.json();
    } catch (error) {
      console.error('PUT Error:', error);
      throw error;
    }
  },

  async delete(endpoint) { 
    try {
      await this.request(endpoint, { method: 'DELETE' });
    } catch (error) {
      console.error('DELETE Error:', error);
      throw error;
    }
  },

  async login(formData) {
    try {
      // FastAPI OAuth2PasswordRequestForm expects form data
      const formBody = new URLSearchParams();
      formBody.append('username', formData.email);
      formBody.append('password', formData.password);
      
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Invalid credentials');
      }
      
      return response.json();
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  },

  async signup(formData) {
    return await this.post('/auth/admin', {
      company_name: formData.company_name || 'My Company',
      name: formData.name,
      email: formData.email,
      password: formData.password
    }, true);
  },

  async acceptInvite(token, formData) {
    return await this.post(`/invite/accept/${token}`, {
      name: formData.name,
      password: formData.password
    }, true);
  },

  async getCurrentUser() {
    return await this.get('/me');
  },

  // Chat APIs
  async getConversations() {
    return await this.get('/messages/conversations');
  },

  async createConversation(userId) {
    return await this.post('/messages/conversations', { user_id: userId });
  },

  async getMessages(conversationId, limit = 50, offset = 0) {
    return await this.get(`/messages/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`);
  },

  async sendMessage(conversationId, content) {
    return await this.post(`/messages/conversations/${conversationId}/messages`, { content });
  },

  async getUnreadCount() {
    const response = await this.get('/messages/unread_count');
    return response?.unread_count || 0;
  }
};

// --- Reusable UI Components ---
const Alert = ({ type, children, onClose }) => (
  <div className={`p-4 rounded-lg mb-4 flex items-start gap-3 ${
    type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 
    type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
    'bg-blue-50 text-blue-800 border border-blue-200'
  }`}>
    <div className="flex-1">{children}</div>
    {onClose && (
      <button 
        onClick={onClose} 
        className="opacity-70 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    )}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    'chat': 'max-w-4xl w-full h-[80vh]'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white rounded-lg shadow-2xl w-full ${sizeClasses[size]} overflow-hidden flex flex-col`}>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-0">{children}</div>
      </div>
    </div>
  );
};

const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseClasses = 'font-medium rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', ...props }) => (
  <div 
    className={`bg-white rounded border border-gray-200 shadow-sm ${className}`}
    {...props}
  >
    {children}
  </div>
);

const LoadingSpinner = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  return (
    <div className={`${sizeClasses[size]} animate-spin text-blue-600`}>
      ⟳
    </div>
  );
};

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-3 text-gray-600">Loading...</p>
    </div>
  </div>
);

// --- User Avatar Component ---
const UserAvatar = ({ user, size = 'md', onClick, showChat = true }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-12 h-12 text-lg'
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(user);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={handleClick}
        className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-medium hover:opacity-90 transition-opacity`}
        title={user?.name}
      >
        {user?.name?.[0]?.toUpperCase() || 'U'}
      </button>
      
      {showChat && (
        <div className="absolute -bottom-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-blue-500 text-white p-1 rounded-full text-xs">
            💬
          </div>
        </div>
      )}
    </div>
  );
};

// --- Chat Window Component ---
const ChatWindow = ({ isOpen, onClose, otherUser, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen && otherUser && currentUser) {
      initializeConversation();
      
      // Listen for WebSocket messages
      const unsubscribe = webSocketService.addMessageListener((data) => {
        console.log('📩 Chat window received message:', data);
        if (data.type === 'message' && data.message?.conversation_id === conversation?.id) {
          setMessages(prev => {
            // Avoid duplicates
            const exists = prev.some(m => m.id === data.message.id);
            if (exists) return prev;
            
            return [...prev, {
              id: data.message.id,
              content: data.message.content,
              sender_id: data.message.sender_id,
              conversation_id: data.message.conversation_id,
              created_at: data.message.created_at,
              is_read: false
            }];
          });
        } else if (data.type === 'typing' && data.conversation_id === conversation?.id && data.user_id !== currentUser.id) {
          setIsTyping(true);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 2000);
        }
      });
      
      // Listen for connection status
      const connUnsubscribe = webSocketService.addConnectionListener(setIsConnected);
      
      return () => {
        unsubscribe();
        connUnsubscribe();
        clearTimeout(typingTimeoutRef.current);
      };
    }
  }, [isOpen, otherUser, currentUser, conversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeConversation = async () => {
    try {
      setLoading(true);
      // Get or create conversation
      const conversations = await api.getConversations();
      let existingConv = conversations.find(conv => 
        conv.participants?.some(p => p.user_id === otherUser.id) && 
        conv.participants?.some(p => p.user_id === currentUser.id)
      );
      
      if (!existingConv) {
        existingConv = await api.createConversation(otherUser.id);
      }
      
      setConversation(existingConv);
      
      // Load messages
      await loadMessages(existingConv.id);
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const messagesData = await api.getMessages(conversationId, 50, 0);
      setMessages(messagesData || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = () => {
    if (conversation) {
      webSocketService.sendTyping(conversation.id);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // Send via API (backend will broadcast via WebSocket)
      const sentMessage = await api.sendMessage(conversation.id, messageContent);
      
      // Add to local state if not already added by WebSocket
      setMessages(prev => {
        const exists = prev.some(m => m.id === sentMessage.id);
        if (exists) return prev;
        return [...prev, sentMessage];
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(messageContent); // Restore message on error
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chat with ${otherUser?.name}`} size="chat">
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <UserAvatar user={otherUser} size="lg" showChat={false} />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{otherUser?.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Online' : 'Offline'}
                </span>
                {isTyping && (
                  <span className="text-xs text-blue-600 italic ml-2">
                    typing...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="w-12 h-12 mb-3 opacity-50">💬</div>
              <p>No messages yet</p>
              <p className="text-sm mt-1">Start a conversation with {otherUser?.name}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date}>
                  <div className="flex justify-center mb-4">
                    <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                      {date}
                    </span>
                  </div>
                  
                  {dateMessages.map((message) => {
                    const isOwnMessage = message.sender_id === currentUser.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex mb-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-white border border-gray-200 rounded-tl-none'
                          }`}
                        >
                          <p className="text-sm break-words">{message.content}</p>
                          <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-200' : 'text-gray-500'}`}>
                            {formatTime(message.created_at)}
                            {isOwnMessage && message.is_read && (
                              <span className="ml-1">✓✓</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!isConnected || !conversation}
            />
            
            <Button
              type="submit"
              variant="primary"
              disabled={!newMessage.trim() || !isConnected || !conversation}
            >
              Send
            </Button>
          </form>
          
          {!isConnected && (
            <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
              ⚠️ Connecting to chat server...
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// --- Chat Sidebar ---
const ChatSidebar = ({ isOpen, onClose, currentUser, users = [] }) => {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadConversations();
      loadUnreadCount();
      
      // Listen for new messages
      const unsubscribe = webSocketService.addMessageListener((data) => {
        if (data.type === 'message') {
          loadConversations();
          loadUnreadCount();
        }
      });

      return unsubscribe;
    }
  }, [isOpen, currentUser]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const convs = await api.getConversations();
      setConversations(convs || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await api.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const getOtherUser = (conversation) => {
    if (!conversation.participants) return null;
    const otherParticipant = conversation.participants.find(p => p.user_id !== currentUser.id);
    if (!otherParticipant) return null;
    
    // Try to find user from the participant's user object first
    if (otherParticipant.user) {
      return otherParticipant.user;
    }
    
    // Otherwise find from users list
    return users.find(u => u.id === otherParticipant.user_id);
  };

  const filteredUsers = users.filter(user => 
    user.id !== currentUser.id &&
    (user.name?.toLowerCase().includes(search.toLowerCase()) ||
     user.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  const handleConversationSelect = (conversation) => {
    const otherUser = getOtherUser(conversation);
    if (otherUser) {
      setSelectedUser(otherUser);
    }
  };

  return (
    <>
      <div className={`fixed inset-y-0 right-0 z-40 w-80 bg-white border-l border-gray-200 transform transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Messages</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="mt-3 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</div>
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner />
              </div>
            ) : conversations.length === 0 && filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-3">👥</div>
                <p>No conversations yet</p>
                <p className="text-sm mt-1">Start chatting with team members</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Conversations */}
                {conversations.map(conversation => {
                  const otherUser = getOtherUser(conversation);
                  if (!otherUser) return null;
                  
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => handleConversationSelect(conversation)}
                      className="w-full p-3 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left"
                    >
                      <UserAvatar user={otherUser} size="md" showChat={false} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 truncate">{otherUser.name}</span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {conversation.last_message?.content || 'No messages yet'}
                        </p>
                      </div>
                    </button>
                  );
                })}
                
                {/* Users without conversations */}
                {filteredUsers.map(user => {
                  const hasConversation = conversations.some(conv => 
                    conv.participants?.some(p => p.user_id === user.id)
                  );
                  
                  if (hasConversation) return null;
                  
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className="w-full p-3 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left"
                    >
                      <UserAvatar user={user} size="md" showChat={false} />
                      
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900 block truncate">{user.name}</span>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Window */}
      {selectedUser && (
        <ChatWindow
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          otherUser={selectedUser}
          currentUser={currentUser}
        />
      )}
    </>
  );
};

// --- Login Page ---
const LoginPage = ({ onLogin, onShowSignup }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await onLogin(formData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4">
            <div className="text-2xl">📋</div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ProjectFlow</h1>
          <p className="text-gray-600 mt-2">Sign in to continue</p>
        </div>

        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <LoadingSpinner size="sm" /> : 'Sign In'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onShowSignup}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Don't have an account? Sign up
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// --- Signup Page ---
const SignupPage = ({ onBack, onSuccess }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '',
    company_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await api.signup(formData);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4">
            <div className="text-2xl">👤</div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Join ProjectFlow today</p>
        </div>

        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <input
              type="text"
              required
              value={formData.company_name}
              onChange={(e) => setFormData({...formData, company_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" onClick={onBack} variant="outline" className="flex-1" disabled={loading}>
              Back
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <LoadingSpinner size="sm" /> : 'Create Account'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// --- Main Dashboard ---
const Dashboard = ({ onLogout, currentUser, setCurrentUser }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showChatSidebar, setShowChatSidebar] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    initializeApp();
    
    const unsubscribe = webSocketService.addMessageListener((data) => {
      if (data.type === 'message') {
        loadUnreadCount();
      }
    });

    return unsubscribe;
  }, []);

  const initializeApp = async () => {
    try {
      await loadCurrentUser();
      await loadProjects();
      await loadAllUsers();
      await loadUnreadCount();
    } catch (err) {
      console.error('Initialize error:', err);
      setAlert({ type: 'error', message: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
      
      // Connect WebSocket
      if (user.id) {
        webSocketService.connect(user.id);
      }
    } catch (err) {
      console.error('Failed to load user:', err);
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const loadProjects = async () => {
    try {
      const data = await api.get('/projects');
      setProjects(data || []);
    } catch (err) {
      console.error('Load projects error:', err);
    }
  };

  const loadAllUsers = async () => {
    try {
      const users = await api.get('/user');
      setAllUsers(users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await api.getUnreadCount();
      setUnreadMessages(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      const newProject = await api.post('/projects/', projectData);
      setProjects(prev => [...prev, newProject]);
      setShowCreateProject(false);
      setAlert({ type: 'success', message: 'Project created!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  if (loading) return <LoadingOverlay />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">📋</div>
              <h1 className="text-xl font-bold">ProjectFlow</h1>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowChatSidebar(true)}
                className="relative p-2 hover:bg-gray-100 rounded"
              >
                💬
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </button>
              
              <UserAvatar user={currentUser} size="md" showChat={false} />
              
              <button onClick={onLogout} className="p-2 hover:bg-gray-100 rounded">
                🚪
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {alert && <Alert type={alert.type} onClose={() => setAlert(null)}>{alert.message}</Alert>}

        {selectedProject ? (
          <ProjectDashboard
            project={selectedProject}
            onBack={() => {
              setSelectedProject(null);
              loadProjects();
            }}
            currentUser={currentUser}
            setAlert={setAlert}
            allUsers={allUsers}
          />
        ) : (
          <>
            <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Welcome, {currentUser?.name}!</h2>
                  <p className="text-gray-600">Manage your projects</p>
                </div>
                <Button onClick={() => setShowCreateProject(true)}>
                  + New Project
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Your Projects</h3>
              
              {projects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No projects yet</p>
                  <Button onClick={() => setShowCreateProject(true)} className="mt-3">
                    Create First Project
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map(project => (
                    <Card 
                      key={project.id}
                      className="p-4 hover:shadow-lg cursor-pointer"
                      onClick={() => setSelectedProject(project)}
                    >
                      <h4 className="font-bold text-lg mb-2">{project.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                      <div className="flex justify-between text-sm">
                        <span>{project.progress || 0}% complete</span>
                        <span className="text-blue-600">View →</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </main>

      {/* Chat Sidebar */}
      <ChatSidebar
        isOpen={showChatSidebar}
        onClose={() => setShowChatSidebar(false)}
        currentUser={currentUser}
        users={allUsers}
      />

      {/* Create Project Modal */}
      {showCreateProject && (
        <CreateProjectModal
          onClose={() => setShowCreateProject(false)}
          onSubmit={handleCreateProject}
        />
      )}
    </div>
  );
};

// --- Create Project Modal ---
const CreateProjectModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Project">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Project Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            rows="3"
          />
        </div>

        <div className="flex gap-3">
          <Button type="button" onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? <LoadingSpinner size="sm" /> : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// --- Project Dashboard (Simplified) ---
const ProjectDashboard = ({ project, onBack, currentUser, setAlert, allUsers }) => {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);

  useEffect(() => {
    loadProjectData();
  }, [project]);

  const loadProjectData = async () => {
    try {
      const [tasksData, membersData] = await Promise.all([
        api.get(`/projects/${project.id}/task`),
        api.get(`/projects/${project.id}/members`)
      ]);
      
      setTasks(tasksData || []);
      setMembers(membersData || []);
    } catch (err) {
      console.error('Failed to load project data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const newTask = await api.post(`/projects/${project.id}/task`, taskData);
      setTasks(prev => [newTask, ...prev]);
      setShowCreateTask(false);
      setAlert({ type: 'success', message: 'Task created!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  if (loading) return <LoadingOverlay />;

  const columns = [
    { id: 'todo', title: 'To Do', status: 'todo' },
    { id: 'in-progress', title: 'In Progress', status: 'in-progress' },
    { id: 'done', title: 'Done', status: 'done' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded">←</button>
          <div>
            <h2 className="text-xl font-bold">{project.name}</h2>
            <p className="text-sm text-gray-500">{project.description}</p>
          </div>
        </div>
        
        <Button onClick={() => setShowCreateTask(true)}>+ Create Task</Button>
      </div>

      <Card className="p-4">
        <h3 className="font-bold mb-4">Board</h3>
        
        <div className="flex gap-4 overflow-x-auto">
          {columns.map(column => (
            <div key={column.id} className="flex-1 min-w-[250px] bg-gray-50 rounded p-3">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="font-semibold">{column.title}</h4>
                <span className="bg-white px-2 py-0.5 rounded text-xs">
                  {tasks.filter(t => t.status === column.status).length}
                </span>
              </div>
              
              <div className="space-y-2">
                {tasks
                  .filter(task => task.status === column.status)
                  .map(task => (
                    <Card key={task.id} className="p-3">
                      <div className="font-medium text-sm mb-1">{task.title}</div>
                      <div className="text-xs text-gray-500">{task.description}</div>
                      <div className="mt-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {task.priority || 'medium'}
                        </span>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Members */}
      <Card className="p-6">
        <h3 className="font-bold mb-4">Team Members</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {members.map(member => (
            <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
              <UserAvatar 
                user={allUsers.find(u => u.id === member.user_id) || { name: member.user_name, id: member.user_id }}
                size="md"
              />
              <div>
                <div className="font-medium">{member.user_name}</div>
                <div className="text-sm text-gray-500">{member.role}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Create Task Modal */}
      {showCreateTask && (
        <Modal isOpen={true} onClose={() => setShowCreateTask(false)} title="Create Task">
          <CreateTaskForm
            onSubmit={handleCreateTask}
            onCancel={() => setShowCreateTask(false)}
          />
        </Modal>
      )}
    </div>
  );
};

// --- Create Task Form ---
const CreateTaskForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Title</label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          rows="3"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({...formData, status: e.target.value})}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({...formData, priority: e.target.value})}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" onClick={onCancel} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? <LoadingSpinner size="sm" /> : 'Create'}
        </Button>
      </div>
    </form>
  );
};

// --- Main App Component ---
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState('login');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const hasToken = !!localStorage.getItem('access_token');
    setIsLoggedIn(hasToken);
    setIsLoading(false);
  };

  const handleLogin = async (formData) => {
    try {
      const data = await api.login(formData);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      const user = await api.getCurrentUser();
      setCurrentUser(user);
      setIsLoggedIn(true);
      
      setAlert({ type: 'success', message: 'Login successful!' });
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      webSocketService.disconnect();
      localStorage.clear();
      setCurrentUser(null);
      setIsLoggedIn(false);
    }
  };

  if (isLoading) return <LoadingOverlay />;

  if (isLoggedIn) {
    return (
      <Dashboard 
        onLogout={handleLogout}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />
    );
  }

  switch (screen) {
    case 'signup':
      return (
        <SignupPage
          onBack={() => setScreen('login')}
          onSuccess={() => setIsLoggedIn(true)}
        />
      );
    default:
      return (
        <LoginPage
          onLogin={handleLogin}
          onShowSignup={() => setScreen('signup')}
        />
      );
  }
}

export default App;