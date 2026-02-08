import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const useWebSocket = () => {
    const { user, token } = useAuth();
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const pingIntervalRef = useRef(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        if (!user || !token) {
            console.log('[WS] No user or token, skipping connection');
            return;
        }

        mountedRef.current = true;
        console.log('[WS] Effect running, user:', user.id);

        // Build WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = 'localhost:8000';
        const wsUrl = `${protocol}//${host}/messages/ws/${user.id}`;

        const connect = () => {
            if (!mountedRef.current) {
                console.log('[WS] Component unmounted, skipping connect');
                return;
            }

            // Clear any existing socket
            if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
                console.log('[WS] Closing existing socket');
                socketRef.current.close(1000, 'Reconnecting');
                socketRef.current = null;
            }

            console.log('[WS] Creating new WebSocket connection to:', wsUrl);
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('[WS] ✅ Connected successfully');
                setIsConnected(true);
                reconnectAttemptsRef.current = 0;

                // Send a ping every 30 seconds to keep connection alive
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                }
                pingIntervalRef.current = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN && mountedRef.current) {
                        console.log('[WS] Sending ping');
                        socket.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 30000);
            };

            socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('[WS] Received message:', message);
                    // Ignore pong responses
                    if (message.type !== 'pong') {
                        setLastMessage(message);
                    }
                } catch (e) {
                    console.error('[WS] Failed to parse message', e);
                }
            };

            socket.onclose = (event) => {
                console.log('[WS] ❌ Disconnected. Code:', event.code, 'Reason:', event.reason, 'Clean:', event.wasClean);
                setIsConnected(false);

                // Clear ping interval
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }

                // Only reconnect if component is still mounted and it wasn't a manual close
                if (mountedRef.current && event.code !== 1000) {
                    const timeout = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
                    console.log(`[WS] Scheduling reconnect in ${timeout}ms (attempt ${reconnectAttemptsRef.current + 1})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (mountedRef.current) {
                            reconnectAttemptsRef.current += 1;
                            connect();
                        }
                    }, timeout);
                } else {
                    console.log('[WS] Not reconnecting (mounted:', mountedRef.current, 'code:', event.code, ')');
                }
            };

            socket.onerror = (error) => {
                console.error('[WS] Error:', error);
            };
        };

        connect();

        return () => {
            console.log('[WS] Cleanup running');
            mountedRef.current = false;

            // Clear ping interval
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }

            // Clear reconnect timeout
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            // Close socket with normal closure code
            if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
                console.log('[WS] Closing socket on cleanup');
                socketRef.current.close(1000, 'Component unmounting');
                socketRef.current = null;
            }
        };
    }, [user?.id, token]); // Only depend on user.id, not the whole user object

    const sendMessage = useCallback((message) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            console.log('[WS] Sending message:', message);
            socketRef.current.send(JSON.stringify(message));
        } else {
            console.warn('[WS] Cannot send, socket not open. State:', socketRef.current?.readyState);
        }
    }, []);

    return { isConnected, lastMessage, sendMessage };
};

export default useWebSocket;
