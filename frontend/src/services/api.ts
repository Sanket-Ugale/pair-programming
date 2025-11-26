import { Room, CreateRoomRequest, AutocompleteRequest, AutocompleteResponse, ExecutionRequest, ExecutionResult } from '../types';

// Get API URL from environment or use relative path
const getApiBaseUrl = (): string => {
  // Check for Vite environment variable
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }
  // Use relative path (works with proxy or same-origin)
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// Export for WebSocket URL construction
export const getWsBaseUrl = (): string => {
  if (import.meta.env.VITE_WS_URL) {
    return `${import.meta.env.VITE_WS_URL.replace('http', 'ws')}/ws`;
  }
  // Construct from window location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Room endpoints
  async createRoom(data: CreateRoomRequest = {}): Promise<Room> {
    return this.request<Room>('/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRoom(roomId: string): Promise<Room> {
    return this.request<Room>(`/rooms/${roomId}`);
  }

  async getRooms(): Promise<Room[]> {
    return this.request<Room[]>('/rooms');
  }

  // Autocomplete endpoint
  async getAutocomplete(data: AutocompleteRequest): Promise<AutocompleteResponse> {
    return this.request<AutocompleteResponse>('/autocomplete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Execute code endpoint
  async executeCode(data: ExecutionRequest): Promise<ExecutionResult> {
    return this.request<ExecutionResult>('/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiService();
