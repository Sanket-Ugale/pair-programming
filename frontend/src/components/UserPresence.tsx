import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { getColorForUser } from '../types';

interface UserPresenceProps {
  collapsed?: boolean;
}

const UserPresence = ({ collapsed = false }: UserPresenceProps) => {
  const { users, userId, activeUsers } = useSelector((state: RootState) => state.editor);
  
  const userList = Object.values(users);
  const onlineUsers = userList.filter(u => u.id !== userId);

  if (collapsed) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, 3).map((user) => (
            <div
              key={user.id}
              className="w-7 h-7 rounded-full border-2 border-editor-bg flex items-center justify-center text-xs font-bold text-white relative"
              style={{ backgroundColor: user.color || getColorForUser(user.id) }}
              title={user.username}
            >
              {user.username[0].toUpperCase()}
              {user.isTyping && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-editor-bg" />
              )}
            </div>
          ))}
          {onlineUsers.length > 3 && (
            <div className="w-7 h-7 rounded-full bg-gray-600 border-2 border-editor-bg flex items-center justify-center text-xs font-bold text-white">
              +{onlineUsers.length - 3}
            </div>
          )}
        </div>
        <span className="text-xs text-gray-400 ml-1">
          {activeUsers} online
        </span>
      </div>
    );
  }

  return (
    <div className="bg-editor-sidebar border-l border-editor-border p-4">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
        </svg>
        Online ({activeUsers})
      </h3>
      
      <div className="space-y-3">
        {/* Current user */}
        <div className="flex items-center gap-3 p-2 bg-primary-600/20 rounded-lg border border-primary-600/30">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white relative"
            style={{ backgroundColor: getColorForUser(userId || '') }}
          >
            You
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-editor-sidebar" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">You</p>
            <p className="text-xs text-gray-400">Editing</p>
          </div>
        </div>

        {/* Other users */}
        {onlineUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white relative"
              style={{ backgroundColor: user.color || getColorForUser(user.id) }}
            >
              {user.username[0].toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-editor-sidebar" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.username}</p>
              <p className="text-xs text-gray-400">
                {user.isTyping ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <span className="flex space-x-0.5">
                      <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    Typing
                  </span>
                ) : (
                  'Online'
                )}
              </p>
            </div>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: user.color || getColorForUser(user.id) }}
            />
          </div>
        ))}

        {onlineUsers.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm">Waiting for collaborators</p>
            <p className="text-xs mt-1">Share the room link to invite others</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPresence;
