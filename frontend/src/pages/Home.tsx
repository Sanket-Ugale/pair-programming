import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { createRoom, fetchRoom } from '../store/slices/roomSlice';
import { setUsername } from '../store/slices/editorSlice';
import { SUPPORTED_LANGUAGES } from '../types';

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.room);
  const { username } = useSelector((state: RootState) => state.editor);
  
  const [joinRoomId, setJoinRoomId] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(username || '');

  const handleCreateRoom = async () => {
    try {
      const result = await dispatch(createRoom({ language: selectedLanguage })).unwrap();
      navigate(`/room/${result.roomId}`);
    } catch {
      console.error('Failed to create room');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    
    try {
      await dispatch(fetchRoom(joinRoomId.trim())).unwrap();
      navigate(`/room/${joinRoomId.trim()}`);
    } catch {
      console.error('Failed to join room');
    }
  };

  const handleSaveUsername = () => {
    if (newUsername.trim()) {
      dispatch(setUsername(newUsername.trim()));
    }
    setEditingUsername(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-editor-bg via-editor-bg to-gray-900">
      <div className="max-w-5xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600/20 rounded-full text-primary-400 text-sm mb-6">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4" />
            </svg>
            Real-time collaboration
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Code Together,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
              Build Faster
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            A powerful pair programming platform with real-time sync, live cursors, 
            chat, and AI-powered suggestions. No account required.
          </p>
        </div>

        {/* Username Section */}
        <div className="flex justify-center mb-8">
          <div className="bg-editor-sidebar border border-editor-border rounded-xl px-6 py-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
              {username?.[0]?.toUpperCase() || 'U'}
            </div>
            {editingUsername ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="bg-editor-bg border border-editor-border rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter username"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername()}
                />
                <button
                  onClick={handleSaveUsername}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingUsername(false)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-400">Coding as</p>
                  <p className="text-white font-medium">{username}</p>
                </div>
                <button
                  onClick={() => { setNewUsername(username || ''); setEditingUsername(true); }}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Edit username"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Create Room Card */}
          <div className="bg-editor-sidebar border border-editor-border rounded-2xl p-8 hover:border-primary-500/50 transition-colors">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create Room</h2>
                <p className="text-gray-400">Start a new coding session</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Programming Language
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-editor-bg border border-editor-border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>{lang.name}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleCreateRoom}
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating Room...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Create Room
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Join Room Card */}
          <div className="bg-editor-sidebar border border-editor-border rounded-2xl p-8 hover:border-green-500/50 transition-colors">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Join Room</h2>
                <p className="text-gray-400">Enter a room ID or paste link</p>
              </div>
            </div>
            
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room ID or Link
                </label>
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => {
                    // Extract room ID from URL if pasted
                    const value = e.target.value;
                    const match = value.match(/room\/([a-f0-9-]+)/i);
                    setJoinRoomId(match ? match[1] : value);
                  }}
                  placeholder="Paste room link or enter ID..."
                  className="w-full bg-editor-bg border border-editor-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !joinRoomId.trim()}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Joining...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    Join Room
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-center flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Features Section */}
        <div className="grid md:grid-cols-4 gap-6">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
              title: 'Real-Time Sync',
              description: 'See changes instantly',
              color: 'primary',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              ),
              title: 'Live Cursors',
              description: 'See where others are editing',
              color: 'yellow',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              ),
              title: 'Built-in Chat',
              description: 'Communicate while coding',
              color: 'green',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              ),
              title: 'AI Suggestions',
              description: 'Smart code completion',
              color: 'purple',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-editor-sidebar/50 border border-editor-border rounded-xl p-5 text-center hover:bg-editor-sidebar transition-colors"
            >
              <div className={`w-12 h-12 bg-${feature.color}-600/20 rounded-lg flex items-center justify-center mx-auto mb-3 text-${feature.color}-400`}>
                {feature.icon}
              </div>
              <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
              <p className="text-sm text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
