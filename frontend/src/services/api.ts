import { Room, CreateRoomRequest, AutocompleteRequest, AutocompleteResponse, ExecutionRequest, ExecutionResult } from '../types';

const API_BASE_URL = '/api';

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
