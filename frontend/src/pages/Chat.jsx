import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import useWebSocket from '../hooks/useWebSocket';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getInitials, getAvatarColor, formatDate } from '../utils/helpers';
import SearchBar from '../components/common/SearchBar';

const Chat = () => {
    const { user } = useAuth();
    const { isConnected, lastMessage } = useWebSocket();

    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const messagesEndRef = useRef(null);

    // Fetch conversations on mount
    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await api.get('/messages/conversations');
                setConversations(res.data);
            } catch (err) {
                console.error("Failed to fetch conversations", err);
            } finally {
                setLoading(false);
            }
        };
        fetchConversations();
    }, []);

    // Fetch messages when active conversation changes
    useEffect(() => {
        if (!activeConversation) return;

        const fetchMessages = async () => {
            try {
                const res = await api.get(`/messages/conversations/${activeConversation.id}/messages`);
                setMessages(res.data);
                scrollToBottom();
            } catch (err) {
                console.error("Failed to fetch messages", err);
            }
        };
        fetchMessages();
    }, [activeConversation]);

    // Handle incoming WebSocket messages
    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === 'message') {
            const msg = lastMessage.message;

            if (activeConversation && msg.conversation_id === activeConversation.id) {
                setMessages(prev => [...prev, msg]);
                scrollToBottom();
            }

            setConversations(prev => {
                const prevConv = prev.find(c => c.id === msg.conversation_id);
                if (prevConv) {
                    const others = prev.filter(c => c.id !== msg.conversation_id);
                    return [{ ...prevConv, updated_at: new Date().toISOString() }, ...others];
                }
                return prev;
            });
        }
    }, [lastMessage, activeConversation]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConversation) return;

        try {
            const res = await api.post(`/messages/conversations/${activeConversation.id}/messages`, {
                content: newMessage
            });

            setMessages([...messages, res.data]);
            setNewMessage('');
            scrollToBottom();
        } catch (err) {
            console.error("Failed to send message", err);
        }
    };

    const filteredConversations = useMemo(() => {
        return conversations.filter(conv => {
            const other = conv.participants.find(p => p.user_id !== user.id);
            const name = other?.user?.name || `User ${other?.user_id}`;
            return name.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [conversations, searchTerm, user.id]);

    if (loading) return <LoadingSpinner className="mt-20" />;

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/50">
                <div className="p-6 border-b border-gray-100 bg-white">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
                    <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Find people..." />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.map(conv => {
                        const other = conv.participants.find(p => p.user_id !== user.id);
                        const otherName = other?.user?.name || `User ${other?.user_id}`;
                        const isActive = activeConversation?.id === conv.id;

                        return (
                            <div
                                key={conv.id}
                                onClick={() => setActiveConversation(conv)}
                                className={`p-4 mx-2 my-1 rounded-2xl cursor-pointer transition-all duration-200 group ${isActive ? 'bg-indigo-600 text-white shadow-lg translate-x-1' : 'hover:bg-white hover:shadow-sm'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold shadow-sm ${isActive ? 'bg-white/20' : `${getAvatarColor(otherName)} text-white`}`}>
                                        {getInitials(otherName)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <p className={`font-bold truncate text-sm ${isActive ? 'text-white' : 'text-gray-900'}`}>
                                                {otherName}
                                            </p>
                                            <span className={`text-[10px] lowercase font-medium ${isActive ? 'text-indigo-100' : 'text-gray-400'}`}>
                                                {formatDate(conv.updated_at).split(' ')[0]}
                                            </span>
                                        </div>
                                        <p className={`text-xs truncate ${isActive ? 'text-indigo-100' : 'text-gray-500'}`}>
                                            Click to open chat
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredConversations.length === 0 && (
                        <div className="p-12 text-center">
                            <p className="text-gray-400 text-sm font-medium">No messages found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 flex flex-col bg-white">
                {activeConversation ? (
                    <>
                        <div className="p-4 px-6 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md z-10 sticky top-0">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${getAvatarColor(activeConversation.participants.find(p => p.user_id !== user.id)?.user?.name || 'User')}`}>
                                    {getInitials(activeConversation.participants.find(p => p.user_id !== user.id)?.user?.name || 'User')}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 leading-none">
                                        {activeConversation.participants.find(p => p.user_id !== user.id)?.user?.name || 'Collaborator'}
                                    </p>
                                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Online</span>
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                                {isConnected ? 'Live' : 'Offline'}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
                            {messages.map((msg, i) => {
                                const isMe = msg.sender_id === user.id;
                                const showTime = i === 0 || new Date(msg.created_at) - new Date(messages[i - 1].created_at) > 1000 * 60 * 30;

                                return (
                                    <div key={msg.id} className="space-y-4">
                                        {showTime && (
                                            <div className="text-center">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-full">
                                                    {new Date(msg.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-in`}>
                                            <div className={`max-w-[80%] group ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                                <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm ${isMe
                                                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-100'
                                                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                                    }`}>
                                                    <p className="leading-relaxed">{msg.content}</p>
                                                </div>
                                                <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 px-6 bg-white border-t border-gray-100">
                            <form onSubmit={handleSendMessage} className="flex gap-4 items-center">
                                <Button variant="secondary" className="rounded-full w-10 h-10 p-0 flex items-center justify-center text-xl" type="button">📎</Button>
                                <div className="flex-1 relative">
                                    <input
                                        className="w-full px-6 py-3 bg-gray-50 border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                                        placeholder="Type your message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xl">😊</div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:shadow-none"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center text-6xl mb-8 animate-bounce">💬</div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Select a Chat</h3>
                        <p className="text-gray-500 max-w-sm mt-2 text-sm">Choose a conversation from the sidebar to start collaborating with your team in real-time.</p>
                        <Button className="mt-8 px-8" variant="secondary" onClick={() => setSearchTerm('')}>Browse Contact List</Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;

