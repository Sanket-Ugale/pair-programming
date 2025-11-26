import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Room, CreateRoomRequest } from '../../types';
import { api } from '../../services/api';

interface RoomState {
  currentRoom: Room | null;
  rooms: Room[];
  isLoading: boolean;
  error: string | null;
}

const initialState: RoomState = {
  currentRoom: null,
  rooms: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const createRoom = createAsyncThunk(
  'room/create',
  async (data: CreateRoomRequest = {}, { rejectWithValue }) => {
    try {
      const room = await api.createRoom(data);
      return room;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create room');
    }
  }
);

export const fetchRoom = createAsyncThunk(
  'room/fetch',
  async (roomId: string, { rejectWithValue }) => {
    try {
      const room = await api.getRoom(roomId);
      return room;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch room');
    }
  }
);

export const fetchRooms = createAsyncThunk(
  'room/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const rooms = await api.getRooms();
      return rooms;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch rooms');
    }
  }
);

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setCurrentRoom: (state, action: PayloadAction<Room | null>) => {
      state.currentRoom = action.payload;
    },
    clearRoom: (state) => {
      state.currentRoom = null;
    },
    updateRoomActiveUsers: (state, action: PayloadAction<number>) => {
      if (state.currentRoom) {
        state.currentRoom.activeUsers = action.payload;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create room
      .addCase(createRoom.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRoom = action.payload;
        state.rooms.push(action.payload);
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch room
      .addCase(fetchRoom.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRoom.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRoom = action.payload;
      })
      .addCase(fetchRoom.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch all rooms
      .addCase(fetchRooms.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rooms = action.payload;
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentRoom, clearRoom, updateRoomActiveUsers, clearError } = roomSlice.actions;
export default roomSlice.reducer;
