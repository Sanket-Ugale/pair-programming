// User types
export interface User {
  id: string;
  username: string;
  color: string;
  avatar?: string;
  isTyping?: boolean;
  lastActive?: string;
}

// Room types
export interface Room {
  roomId: string;
  name?: string;
  language: string;
  codeContent: string;
  activeUsers: number;
  createdAt: string;
  isPrivate?: boolean;
  ownerId?: string;
}

export interface CreateRoomRequest {
  language?: string;
  name?: string;
  isPrivate?: boolean;
}

// Autocomplete types
export interface AutocompleteRequest {
  code: string;
  cursorPosition: number;
  language: string;
}

export interface AutocompleteResponse {
  suggestion: string;
  startPosition: number;
  endPosition: number;
  description: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  type: 'message' | 'system' | 'code';
}

// Code execution types
export interface ExecutionRequest {
  code: string;
  language: string;
}

export interface ExecutionResult {
  output: string;
  error?: string;
  executionTime: number;
}

// WebSocket message types
export type WebSocketMessageType = 
  | 'code_update'
  | 'cursor_update'
  | 'user_joined'
  | 'user_left'
  | 'room_state'
  | 'chat_message'
  | 'typing_start'
  | 'typing_stop'
  | 'execution_result'
  | 'language_change'
  | 'ping'
  | 'pong'
  | 'error';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: Record<string, unknown>;
}

export interface CodeUpdatePayload {
  code: string;
  cursorPosition: number;
  userId: string;
  username: string;
  timestamp: string;
}

export interface CursorUpdatePayload {
  userId: string;
  username: string;
  cursorPosition: number;
  selection?: {
    start: number;
    end: number;
  } | null;
}

export interface UserJoinedPayload {
  userId: string;
  username: string;
  color: string;
  activeUsers: number;
  users: Record<string, User>;
  cursors: Record<string, CursorInfo>;
}

export interface UserLeftPayload {
  userId: string;
  username: string;
  activeUsers: number;
}

export interface RoomStatePayload {
  code: string;
  language: string;
  activeUsers: number;
  users: Record<string, User>;
  cursors: Record<string, CursorInfo>;
  userId: string;
  chatHistory: ChatMessage[];
}

export interface CursorInfo {
  position: number;
  username?: string;
  color?: string;
  selection?: {
    start: number;
    end: number;
  } | null;
}

export interface ChatMessagePayload {
  message: ChatMessage;
}

export interface TypingPayload {
  userId: string;
  username: string;
}

// Editor state
export interface EditorState {
  code: string;
  language: string;
  cursorPosition: number;
  isConnected: boolean;
  activeUsers: number;
  userId: string | null;
  username: string | null;
  userColor: string | null;
  users: Record<string, User>;
  remoteCursors: Record<string, CursorInfo>;
  autocompleteSuggestion: AutocompleteResponse | null;
  chatMessages: ChatMessage[];
  typingUsers: string[];
  executionResult: ExecutionResult | null;
  isExecuting: boolean;
  isLoading: boolean;
  error: string | null;
}

// User colors for remote cursors
export const USER_COLORS = [
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96c93d',
  '#f9ca24',
  '#f0932b',
  '#eb4d4b',
  '#6c5ce7',
  '#a29bfe',
  '#fd79a8',
  '#00b894',
  '#0984e3',
  '#e17055',
  '#fdcb6e',
];

export const getColorForUser = (userId: string): string => {
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
};

export const generateUsername = (): string => {
  const adjectives = ['Swift', 'Clever', 'Bright', 'Quick', 'Sharp', 'Bold', 'Calm', 'Eager'];
  const nouns = ['Coder', 'Dev', 'Hacker', 'Ninja', 'Wizard', 'Guru', 'Pro', 'Master'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
};

export const SUPPORTED_LANGUAGES = [
  { id: 'python', name: 'Python', extension: '.py' },
  { id: 'javascript', name: 'JavaScript', extension: '.js' },
  { id: 'typescript', name: 'TypeScript', extension: '.ts' },
  { id: 'java', name: 'Java', extension: '.java' },
  { id: 'cpp', name: 'C++', extension: '.cpp' },
  { id: 'go', name: 'Go', extension: '.go' },
  { id: 'rust', name: 'Rust', extension: '.rs' },
  { id: 'ruby', name: 'Ruby', extension: '.rb' },
];
