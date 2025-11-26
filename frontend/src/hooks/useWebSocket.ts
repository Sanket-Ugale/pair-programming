import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  setConnected,
  handleCodeUpdate,
  handleUserJoined,
  handleUserLeft,
  handleRoomState,
  handleLanguageChange,
  updateRemoteCursor,
  addChatMessage,
  addTypingUser,
  removeTypingUser,
  setError,
} from '../store/slices/editorSlice';
import { updateRoomActiveUsers } from '../store/slices/roomSlice';
import {
  WebSocketMessage,
  CodeUpdatePayload,
  UserJoinedPayload,
  UserLeftPayload,
  RoomStatePayload,
  CursorUpdatePayload,
  ChatMessagePayload,
  TypingPayload,
  ChatMessage,
} from '../types';
import { getWsBaseUrl } from '../services/api';

// Get WebSocket URL dynamically
const getWebSocketUrl = (): string => {
  // For development, use localhost:8000 directly
  if (import.meta.env.DEV && !import.meta.env.VITE_WS_URL) {
    return 'ws://localhost:8000/ws';
  }
  return getWsBaseUrl();
};

const WS_BASE_URL = getWebSocketUrl();

export const useWebSocket = (roomId: string | null) => {
  const dispatch = useDispatch<AppDispatch>();
  const { userId, username } = useSelector((state: RootState) => state.editor);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnectedState] = useState(false);
  const mountedRef = useRef(true);
  const connectingRef = useRef(false);

  const sendMessage = useCallback((type: string, payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const sendCodeUpdate = useCallback((code: string, cursorPosition: number) => {
    sendMessage('code_update', { code, cursorPosition });
  }, [sendMessage]);

  const sendCursorUpdate = useCallback((cursorPosition: number, selection?: { start: number; end: number } | null) => {
    sendMessage('cursor_update', { cursorPosition, selection });
  }, [sendMessage]);

  const sendChatMessage = useCallback((content: string, messageType: string = 'message') => {
    sendMessage('chat_message', { content, messageType });
  }, [sendMessage]);

  const sendTypingStart = useCallback(() => {
    sendMessage('typing_start', {});
  }, [sendMessage]);

  const sendTypingStop = useCallback(() => {
    sendMessage('typing_stop', {});
  }, [sendMessage]);

  const sendLanguageChange = useCallback((language: string) => {
    sendMessage('language_change', { language });
  }, [sendMessage]);

  // Single effect to manage connection lifecycle
  useEffect(() => {
    mountedRef.current = true;
    
    if (!roomId || !userId || !username) {
      return;
    }

    // Prevent multiple connection attempts
    if (connectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const connectWebSocket = () => {
      if (!mountedRef.current || connectingRef.current) {
        return;
      }

      // Close any existing connection
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
        wsRef.current = null;
      }

      connectingRef.current = true;
      const wsUrl = `${WS_BASE_URL}/${roomId}?userId=${encodeURIComponent(userId)}&username=${encodeURIComponent(username)}`;
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        
        connectingRef.current = false;
        console.log('WebSocket connected successfully');
        setIsConnectedState(true);
        dispatch(setConnected(true));
        dispatch(setError(null));

        // Start ping interval to keep connection alive
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message.type);
          
          switch (message.type) {
            case 'room_state':
              dispatch(handleRoomState(message.payload as unknown as RoomStatePayload));
              dispatch(updateRoomActiveUsers((message.payload as unknown as RoomStatePayload).activeUsers));
              break;
            
            case 'code_update':
              dispatch(handleCodeUpdate(message.payload as unknown as CodeUpdatePayload));
              break;
            
            case 'cursor_update':
              const cursorPayload = message.payload as unknown as CursorUpdatePayload;
              dispatch(updateRemoteCursor({
                userId: cursorPayload.userId,
                cursor: {
                  position: cursorPayload.cursorPosition,
                  username: cursorPayload.username,
                  selection: cursorPayload.selection,
                },
              }));
              break;
            
            case 'user_joined':
              dispatch(handleUserJoined(message.payload as unknown as UserJoinedPayload));
              dispatch(updateRoomActiveUsers((message.payload as unknown as UserJoinedPayload).activeUsers));
              break;
            
            case 'user_left':
              dispatch(handleUserLeft(message.payload as unknown as UserLeftPayload));
              dispatch(updateRoomActiveUsers((message.payload as unknown as UserLeftPayload).activeUsers));
              break;
            
            case 'chat_message':
              const chatPayload = message.payload as unknown as ChatMessagePayload;
              dispatch(addChatMessage(chatPayload.message as ChatMessage));
              break;
            
            case 'typing_start':
              const typingStartPayload = message.payload as unknown as TypingPayload;
              dispatch(addTypingUser(typingStartPayload.username));
              break;
            
            case 'typing_stop':
              const typingStopPayload = message.payload as unknown as TypingPayload;
              dispatch(removeTypingUser(typingStopPayload.username));
              break;
            
            case 'language_change':
              dispatch(handleLanguageChange(message.payload as unknown as { language: string; userId: string; username: string }));
              break;
            
            case 'pong':
              // Connection is alive
              break;
            
            case 'error':
              dispatch(setError((message.payload as { message: string }).message));
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        connectingRef.current = false;
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        connectingRef.current = false;
        
        if (!mountedRef.current) return;
        
        setIsConnectedState(false);
        dispatch(setConnected(false));

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt to reconnect if not intentionally closed and component is still mounted
        if (event.code !== 1000 && mountedRef.current && roomId) {
          console.log('Will attempt reconnect in 2 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              console.log('Attempting to reconnect...');
              connectWebSocket();
            }
          }, 2000);
        }
      };
    };

    // Small delay to ensure room data is loaded first
    const connectTimeout = setTimeout(connectWebSocket, 200);

    // Cleanup function
    return () => {
      console.log('Cleanup: Disconnecting WebSocket...');
      mountedRef.current = false;
      connectingRef.current = false;
      
      clearTimeout(connectTimeout);
      
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close(1000, 'User disconnected');
        wsRef.current = null;
      }

      setIsConnectedState(false);
      dispatch(setConnected(false));
    };
  }, [roomId, userId, username, dispatch]);

  const disconnect = useCallback(() => {
    console.log('Manual disconnect requested...');
    mountedRef.current = false;
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setIsConnectedState(false);
    dispatch(setConnected(false));
  }, [dispatch]);

  const connect = useCallback(() => {
    // This is now handled by the effect
    console.log('Manual connect requested - handled by effect');
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    sendCodeUpdate,
    sendCursorUpdate,
    sendChatMessage,
    sendTypingStart,
    sendTypingStop,
    sendLanguageChange,
  };
};
