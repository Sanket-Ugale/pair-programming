import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchRoom } from '../store/slices/roomSlice';
import { setLanguage, setCode, resetEditor } from '../store/slices/editorSlice';
import { CodeEditor, Chat, Toolbar, UserPresence, OutputPanel } from '../components';
import { useWebSocket } from '../hooks';
import { SUPPORTED_LANGUAGES } from '../types';

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const fetchedRef = useRef(false);
  const [showChat, setShowChat] = useState(true);
  const [showUsers, setShowUsers] = useState(false);
  
  const { currentRoom, isLoading, error } = useSelector((state: RootState) => state.room);
  const { language, code, username } = useSelector((state: RootState) => state.editor);
  
  const { 
    sendCodeUpdate, 
    sendCursorUpdate, 
    sendChatMessage, 
    sendTypingStart, 
    sendTypingStop,
    sendLanguageChange,
    isConnected 
  } = useWebSocket(roomId || null);

  // Fetch room data on mount
  useEffect(() => {
    if (roomId && !fetchedRef.current) {
      fetchedRef.current = true;
      dispatch(fetchRoom(roomId))
        .unwrap()
        .then((room) => {
          dispatch(setLanguage(room.language));
          dispatch(setCode(room.codeContent));
        })
        .catch(() => {
          navigate('/');
        });
    }
  }, [roomId, dispatch, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fetchedRef.current = false;
      dispatch(resetEditor());
    };
  }, [dispatch]);

  const handleCodeChange = useCallback(
    (code: string, cursorPosition: number) => {
      sendCodeUpdate(code, cursorPosition);
    },
    [sendCodeUpdate]
  );

  const handleCursorChange = useCallback(
    (cursorPosition: number) => {
      sendCursorUpdate(cursorPosition);
    },
    [sendCursorUpdate]
  );

  const handleLanguageChange = useCallback(
    (newLanguage: string) => {
      sendLanguageChange(newLanguage);
    },
    [sendLanguageChange]
  );

  const handleCopyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
  }, []);

  const handleDownload = useCallback(() => {
    const langInfo = SUPPORTED_LANGUAGES.find(l => l.id === language);
    const extension = langInfo?.extension || '.txt';
    const filename = `code${extension}`;
    
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code, language]);

  if (isLoading && !currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor-bg">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading room...</p>
          <p className="text-gray-500 text-sm mt-2">Setting up your coding environment</p>
        </div>
      </div>
    );
  }

  if (error && !currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor-bg">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Room Not Found</h2>
          <p className="text-gray-400 mb-6">
            The room you're looking for doesn't exist or may have been deleted.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Create New Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-editor-bg">
      {/* Toolbar */}
      <Toolbar 
        onLanguageChange={handleLanguageChange}
        onCopyLink={handleCopyLink}
        onDownload={handleDownload}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Connection banner */}
          {!isConnected && (
            <div className="bg-yellow-600/20 border-b border-yellow-600/50 px-4 py-2 text-center text-yellow-400 text-sm flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Connecting to room...
            </div>
          )}
          
          <CodeEditor
            onCodeChange={handleCodeChange}
            onCursorChange={handleCursorChange}
          />
          
          {/* Output panel */}
          <OutputPanel />
        </div>

        {/* Right sidebar - Chat or Users */}
        <div className="w-80 flex-shrink-0 flex flex-col border-l border-editor-border">
          {/* Sidebar tabs */}
          <div className="flex border-b border-editor-border">
            <button
              onClick={() => { setShowChat(true); setShowUsers(false); }}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                showChat 
                  ? 'text-primary-400 border-b-2 border-primary-400 bg-editor-sidebar' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat
              </span>
            </button>
            <button
              onClick={() => { setShowUsers(true); setShowChat(false); }}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                showUsers 
                  ? 'text-primary-400 border-b-2 border-primary-400 bg-editor-sidebar' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Users
              </span>
            </button>
          </div>
          
          {/* Sidebar content */}
          <div className="flex-1 overflow-hidden">
            {showChat && (
              <Chat
                onSendMessage={sendChatMessage}
                onTypingStart={sendTypingStart}
                onTypingStop={sendTypingStop}
              />
            )}
            {showUsers && <UserPresence />}
          </div>
        </div>
      </div>

      {/* Room info footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-editor-sidebar border-t border-editor-border text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Room: {roomId?.slice(0, 8)}...</span>
          <span>•</span>
          <span>Logged in as: {username}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span>{isConnected ? 'Real-time sync active' : 'Reconnecting...'}</span>
        </div>
      </div>
    </div>
  );
};

export default Room;
