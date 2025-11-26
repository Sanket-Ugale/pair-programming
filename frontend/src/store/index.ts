import { configureStore } from '@reduxjs/toolkit';
import editorReducer from './slices/editorSlice';
import roomReducer from './slices/roomSlice';

export const store = configureStore({
  reducer: {
    editor: editorReducer,
    room: roomReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types (WebSocket related)
        ignoredActions: ['editor/setWebSocket'],
        // Ignore these paths in the state
        ignoredPaths: ['editor.ws'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
