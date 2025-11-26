import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { getColorForUser } from '../types';

interface RoomInfoProps {
  roomId: string;
}

const RoomInfo = ({ roomId }: RoomInfoProps) => {
  const { isConnected, activeUsers, userId, remoteCursors, language } = useSelector(
    (state: RootState) => state.editor
  );

  const copyRoomLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link);
    // Could add a toast notification here
  };

  return (
    <div className="bg-editor-sidebar border-b border-editor-border px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Room Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}
            />
            <span className="text-sm text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="h-4 w-px bg-editor-border" />
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Room:</span>
            <code className="text-sm text-primary-400 bg-editor-bg px-2 py-0.5 rounded">
              {roomId.slice(0, 8)}...
            </code>
            <button
              onClick={copyRoomLink}
              className="text-gray-400 hover:text-white transition-colors"
              title="Copy room link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          
          <div className="h-4 w-px bg-editor-border" />
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Language:</span>
            <span className="text-sm text-white capitalize">{language}</span>
          </div>
        </div>
        
        {/* Active Users */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {activeUsers} user{activeUsers !== 1 ? 's' : ''} online
          </span>
          
          <div className="flex items-center gap-1">
            {/* Current user */}
            {userId && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white border-2"
                style={{ 
                  backgroundColor: getColorForUser(userId),
                  borderColor: getColorForUser(userId)
                }}
                title={`You (${userId})`}
              >
                Y
              </div>
            )}
            
            {/* Remote users */}
            {Object.keys(remoteCursors).map((cursorUserId) => (
              <div
                key={cursorUserId}
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white border-2"
                style={{ 
                  backgroundColor: getColorForUser(cursorUserId),
                  borderColor: getColorForUser(cursorUserId)
                }}
                title={`User ${cursorUserId}`}
              >
                {cursorUserId.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomInfo;
