import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';

// Create WebSocket Context
const PoseWebSocketContext = createContext(null);

/**
 * WebSocket Context Provider - Creates ONE connection shared by all components
 */
export const PoseWebSocketProvider = ({ children, url = 'ws://localhost:8000/ws/pose', options = {} }) => {
    const {
        maxReconnectAttempts = 5,
        reconnectInterval = 1000,
        autoReconnect = true
    } = options;

    // State
    const [poseData, setPoseData] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [error, setError] = useState(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);

    // Refs for cleanup and reconnection
    const ws = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const isManuallyDisconnected = useRef(false);

    // Clear any existing reconnection timeout
    const clearReconnectTimeout = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
    }, []);

    // Connect to WebSocket
    const connect = useCallback(() => {
        // Don't connect if already connecting or connected
        if (ws.current?.readyState === WebSocket.CONNECTING || 
            ws.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            setConnectionStatus('connecting');
            setError(null);

            ws.current = new WebSocket(url);

            ws.current.onopen = () => {
                console.log('🔌 Connected to pose tracker! (SHARED CONNECTION)');
                console.warn('⚠️  If you see this message multiple times, there\'s a bug in the context provider!');
                setConnectionStatus('connected');
                setError(null);
                setReconnectAttempts(0);
                isManuallyDisconnected.current = false;
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Validate data structure
                    if (data.players && Array.isArray(data.players) && data.players.length >= 2) {
                        setPoseData(data);
                    } else {
                        console.warn('Invalid pose data structure received:', data);
                    }
                } catch (err) {
                    console.error('Failed to parse pose data:', err);
                    setError('Invalid data received from server');
                }
            };

            ws.current.onclose = (event) => {
                console.log('🔌 WebSocket closed:', event.code, event.reason);
                setConnectionStatus('disconnected');

                // Only attempt reconnection if not manually disconnected and auto-reconnect is enabled
                if (!isManuallyDisconnected.current && autoReconnect && reconnectAttempts < maxReconnectAttempts) {
                    const delay = Math.min(reconnectInterval * Math.pow(2, reconnectAttempts), 10000); // Exponential backoff with max 10s
                    
                    console.log(`🔄 Reconnecting in ${delay}ms... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        setReconnectAttempts(prev => prev + 1);
                        connect();
                    }, delay);
                } else if (reconnectAttempts >= maxReconnectAttempts) {
                    setError(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
                    setConnectionStatus('error');
                }
            };

            ws.current.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                setError('Connection failed');
                setConnectionStatus('error');
            };

        } catch (err) {
            console.error('❌ Failed to create WebSocket connection:', err);
            setError('Failed to create WebSocket connection');
            setConnectionStatus('error');
        }
    }, [url, autoReconnect, maxReconnectAttempts, reconnectInterval, reconnectAttempts]);

    // Manual reconnection (resets attempt counter)
    const reconnect = useCallback(() => {
        clearReconnectTimeout();
        setReconnectAttempts(0);
        isManuallyDisconnected.current = false;
        
        if (ws.current) {
            ws.current.close();
        }
        
        setTimeout(connect, 100); // Small delay to ensure cleanup
    }, [connect, clearReconnectTimeout]);

    // Manual disconnection
    const disconnect = useCallback(() => {
        isManuallyDisconnected.current = true;
        clearReconnectTimeout();
        
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
        
        setConnectionStatus('disconnected');
        setPoseData(null);
        setError(null);
        setReconnectAttempts(0);
    }, [clearReconnectTimeout]);

    // Initial connection and cleanup
    useEffect(() => {
        connect();

        return () => {
            isManuallyDisconnected.current = true;
            clearReconnectTimeout();
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [connect, clearReconnectTimeout]);

    const contextValue = {
        poseData,
        connectionStatus,
        error,
        reconnect,
        disconnect,
        reconnectAttempts
    };

    return (
        <PoseWebSocketContext.Provider value={contextValue}>
            {children}
        </PoseWebSocketContext.Provider>
    );
};

/**
 * React hook for accessing the shared WebSocket connection
 * 
 * @returns {Object} Hook state and methods
 * @returns {Object|null} poseData - Latest pose data from server
 * @returns {string} connectionStatus - 'connecting' | 'connected' | 'disconnected' | 'error'
 * @returns {string|null} error - Error message if any
 * @returns {Function} reconnect - Manual reconnection function
 * @returns {Function} disconnect - Manual disconnection function
 * @returns {number} reconnectAttempts - Current number of reconnection attempts
 */
export const usePoseWebSocket = () => {
    const context = useContext(PoseWebSocketContext);
    
    if (!context) {
        throw new Error('usePoseWebSocket must be used within a PoseWebSocketProvider');
    }
    
    return context;
}; 