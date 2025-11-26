import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  EditorState, 
  AutocompleteResponse, 
  CursorInfo,
  CodeUpdatePayload,
  UserJoinedPayload,
  UserLeftPayload,
  RoomStatePayload,
  ChatMessage,
  User,
  ExecutionResult,
  getColorForUser,
  generateUsername,
} from '../../types';

// Get or create persistent user identity
const getStoredUsername = (): string => {
  const stored = localStorage.getItem('pairprog_username');
  if (stored) return stored;
  const newUsername = generateUsername();
  localStorage.setItem('pairprog_username', newUsername);
  return newUsername;
};

const getStoredUserId = (): string => {
  const stored = localStorage.getItem('pairprog_userId');
  if (stored) return stored;
  const newId = crypto.randomUUID().slice(0, 8);
  localStorage.setItem('pairprog_userId', newId);
  return newId;
};

const storedUserId = getStoredUserId();
const storedUsername = getStoredUsername();

const initialState: EditorState = {
  code: '# Welcome to Pair Programming!\n# Start coding together...\n\n',
  language: 'python',
  cursorPosition: 0,
  isConnected: false,
  activeUsers: 0,
  userId: storedUserId,
  username: storedUsername,
  userColor: getColorForUser(storedUserId),
  users: {},
  remoteCursors: {},
  autocompleteSuggestion: null,
  chatMessages: [],
  typingUsers: [],
  executionResult: null,
  isExecuting: false,
  isLoading: false,
  error: null,
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    // Code updates
    setCode: (state, action: PayloadAction<string>) => {
      state.code = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setCursorPosition: (state, action: PayloadAction<number>) => {
      state.cursorPosition = action.payload;
    },
    
    // User identity
    setUsername: (state, action: PayloadAction<string>) => {
      state.username = action.payload;
      localStorage.setItem('pairprog_username', action.payload);
    },
    
    // Connection status
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setUserId: (state, action: PayloadAction<string>) => {
      state.userId = action.payload;
    },
    
    // Active users
    setActiveUsers: (state, action: PayloadAction<number>) => {
      state.activeUsers = action.payload;
    },
    
    // Users management
    setUsers: (state, action: PayloadAction<Record<string, User>>) => {
      state.users = action.payload;
    },
    addUser: (state, action: PayloadAction<User>) => {
      state.users[action.payload.id] = action.payload;
    },
    removeUser: (state, action: PayloadAction<string>) => {
      delete state.users[action.payload];
    },
    updateUserTyping: (state, action: PayloadAction<{ userId: string; isTyping: boolean }>) => {
      if (state.users[action.payload.userId]) {
        state.users[action.payload.userId].isTyping = action.payload.isTyping;
      }
    },
    
    // Remote cursors
    setRemoteCursors: (state, action: PayloadAction<Record<string, CursorInfo>>) => {
      state.remoteCursors = action.payload;
    },
    updateRemoteCursor: (state, action: PayloadAction<{ userId: string; cursor: CursorInfo }>) => {
      state.remoteCursors[action.payload.userId] = action.payload.cursor;
    },
    removeRemoteCursor: (state, action: PayloadAction<string>) => {
      delete state.remoteCursors[action.payload];
    },
    
    // Autocomplete
    setAutocompleteSuggestion: (state, action: PayloadAction<AutocompleteResponse | null>) => {
      state.autocompleteSuggestion = action.payload;
    },
    clearAutocompleteSuggestion: (state) => {
      state.autocompleteSuggestion = null;
    },
    
    // Chat
    addChatMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.chatMessages.push(action.payload);
      // Keep last 100 messages
      if (state.chatMessages.length > 100) {
        state.chatMessages = state.chatMessages.slice(-100);
      }
    },
    setChatMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      state.chatMessages = action.payload;
    },
    
    // Typing indicators
    addTypingUser: (state, action: PayloadAction<string>) => {
      if (!state.typingUsers.includes(action.payload)) {
        state.typingUsers.push(action.payload);
      }
    },
    removeTypingUser: (state, action: PayloadAction<string>) => {
      state.typingUsers = state.typingUsers.filter(id => id !== action.payload);
    },
    
    // Code execution
    setExecutionResult: (state, action: PayloadAction<ExecutionResult | null>) => {
      state.executionResult = action.payload;
      state.isExecuting = false;
    },
    setIsExecuting: (state, action: PayloadAction<boolean>) => {
      state.isExecuting = action.payload;
    },
    clearExecutionResult: (state) => {
      state.executionResult = null;
    },
    
    // Loading/Error states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Handle WebSocket messages
    handleCodeUpdate: (state, action: PayloadAction<CodeUpdatePayload>) => {
      const { code, cursorPosition, userId, username } = action.payload;
      state.code = code;
      if (userId && state.userId !== userId) {
        state.remoteCursors[userId] = { 
          position: cursorPosition,
          username,
          color: getColorForUser(userId),
        };
      }
    },
    
    handleUserJoined: (state, action: PayloadAction<UserJoinedPayload>) => {
      const { userId, username, color, activeUsers, users, cursors } = action.payload;
      state.activeUsers = activeUsers;
      
      // Add/update user
      state.users[userId] = { id: userId, username, color };
      
      // Update all users if provided
      if (users) {
        Object.entries(users).forEach(([id, user]) => {
          state.users[id] = user;
        });
      }
      
      // Filter out own cursor from remote cursors
      const filteredCursors: Record<string, CursorInfo> = {};
      Object.entries(cursors || {}).forEach(([id, cursor]) => {
        if (id !== state.userId) {
          filteredCursors[id] = {
            ...cursor,
            username: users?.[id]?.username || id,
            color: users?.[id]?.color || getColorForUser(id),
          };
        }
      });
      state.remoteCursors = filteredCursors;
      
      // Add system message
      if (userId !== state.userId) {
        state.chatMessages.push({
          id: crypto.randomUUID(),
          userId: 'system',
          username: 'System',
          content: `${username} joined the room`,
          timestamp: new Date().toISOString(),
          type: 'system',
        });
      }
    },
    
    handleUserLeft: (state, action: PayloadAction<UserLeftPayload>) => {
      const { userId, username, activeUsers } = action.payload;
      state.activeUsers = activeUsers;
      delete state.remoteCursors[userId];
      delete state.users[userId];
      
      // Add system message
      state.chatMessages.push({
        id: crypto.randomUUID(),
        userId: 'system',
        username: 'System',
        content: `${username || userId} left the room`,
        timestamp: new Date().toISOString(),
        type: 'system',
      });
    },
    
    handleRoomState: (state, action: PayloadAction<RoomStatePayload>) => {
      const { code, language, activeUsers, users, cursors, userId, chatHistory } = action.payload;
      state.code = code;
      if (language) state.language = language;
      state.activeUsers = activeUsers;
      
      // Set users
      if (users) {
        state.users = users;
      }
      
      // Filter out own cursor from remote cursors
      const filteredCursors: Record<string, CursorInfo> = {};
      Object.entries(cursors || {}).forEach(([id, cursor]) => {
        if (id !== userId && id !== state.userId) {
          filteredCursors[id] = {
            ...cursor,
            username: users?.[id]?.username || id,
            color: users?.[id]?.color || getColorForUser(id),
          };
        }
      });
      state.remoteCursors = filteredCursors;
      
      // Load chat history
      if (chatHistory) {
        state.chatMessages = chatHistory;
      }
    },
    
    handleLanguageChange: (state, action: PayloadAction<{ language: string; userId: string; username: string }>) => {
      const { language, userId, username } = action.payload;
      state.language = language;
      
      if (userId !== state.userId) {
        state.chatMessages.push({
          id: crypto.randomUUID(),
          userId: 'system',
          username: 'System',
          content: `${username} changed language to ${language}`,
          timestamp: new Date().toISOString(),
          type: 'system',
        });
      }
    },
    
    // Reset state
    resetEditor: (state) => {
      // Preserve user identity
      const { userId, username, userColor } = state;
      return {
        ...initialState,
        userId,
        username,
        userColor,
      };
    },
  },
});

export const {
  setCode,
  setLanguage,
  setCursorPosition,
  setUsername,
  setConnected,
  setUserId,
  setActiveUsers,
  setUsers,
  addUser,
  removeUser,
  updateUserTyping,
  setRemoteCursors,
  updateRemoteCursor,
  removeRemoteCursor,
  setAutocompleteSuggestion,
  clearAutocompleteSuggestion,
  addChatMessage,
  setChatMessages,
  addTypingUser,
  removeTypingUser,
  setExecutionResult,
  setIsExecuting,
  clearExecutionResult,
  setLoading,
  setError,
  handleCodeUpdate,
  handleUserJoined,
  handleUserLeft,
  handleRoomState,
  handleLanguageChange,
  resetEditor,
} = editorSlice.actions;

export default editorSlice.reducer;
