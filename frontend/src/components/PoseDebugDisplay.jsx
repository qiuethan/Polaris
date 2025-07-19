// components/PoseDebugDisplay.jsx - DEBUG DISPLAY FOR POSE TRACKING
import React from 'react';
import { usePoseWebSocket } from '../api/usePoseWebSocket';
import { getPlayer, getConnectionStatus, getActionEmoji, getTimeSinceUpdate } from '../api/poseUtils';

export const PoseDebugDisplay = ({ playerId, position = "top-left" }) => {
  const { poseData, connectionStatus, error, reconnectAttempts, reconnect } = usePoseWebSocket();
  
  const posePlayerIndex = playerId === "player1" ? 0 : 1;
  const playerData = getPlayer(poseData, posePlayerIndex);
  const connectionInfo = getConnectionStatus(connectionStatus);
  
  // Position classes
  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4", 
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4"
  };
  
  return (
    <div className={`absolute ${positionClasses[position]} bg-black bg-opacity-80 text-white p-4 rounded-lg font-mono text-sm min-w-64 max-w-80`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">
          {playerId === "player1" ? "🔵 Player 1" : "🔴 Player 2"} Pose Debug
        </h3>
        {connectionStatus !== "connected" && (
          <button 
            onClick={reconnect}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
          >
            Reconnect
          </button>
        )}
      </div>
      
      {/* Connection Status */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span>{connectionInfo.emoji}</span>
          <span className={connectionInfo.color}>
            {connectionInfo.text}
          </span>
          {reconnectAttempts > 0 && (
            <span className="text-yellow-400 text-xs">
              (Attempt {reconnectAttempts})
            </span>
          )}
        </div>
        {error && (
          <div className="text-red-400 text-xs break-words">
            Error: {error}
          </div>
        )}
      </div>
      
      {/* Player Data */}
      {playerData ? (
        <div className="space-y-2">
          {/* Current Action */}
          <div className="bg-gray-800 p-2 rounded">
            <div className="font-semibold mb-1">Current Action:</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getActionEmoji(playerData.action)}</span>
              <span className="capitalize text-green-400">
                {playerData.action || "none"}
              </span>
              <span className="text-gray-400">
                (Speed: {playerData.speed?.toFixed(1) || 0})
              </span>
            </div>
          </div>
          
          {/* Head Tracking */}
          <div className="bg-gray-800 p-2 rounded">
            <div className="font-semibold mb-1">Head Angles:</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Pitch:</span><br/>
                <span className="text-blue-400">
                  {playerData.head?.pitch !== null ? `${playerData.head.pitch.toFixed(1)}°` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Yaw:</span><br/>
                <span className="text-green-400">
                  {playerData.head?.yaw !== null ? `${playerData.head.yaw.toFixed(1)}°` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Roll:</span><br/>
                <span className="text-purple-400">
                  {playerData.head?.roll !== null ? `${playerData.head.roll.toFixed(1)}°` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Arm Tracking */}
          <div className="bg-gray-800 p-2 rounded">
            <div className="font-semibold mb-1">Arm Angles:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Left Arm:</span><br/>
                <span className="text-blue-400">
                  S: {playerData.arms?.left?.shoulder_angle !== null ? 
                    `${playerData.arms.left.shoulder_angle.toFixed(1)}°` : 'N/A'}
                </span><br/>
                <span className="text-cyan-400">
                  E: {playerData.arms?.left?.elbow_angle !== null ? 
                    `${playerData.arms.left.elbow_angle.toFixed(1)}°` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Right Arm:</span><br/>
                <span className="text-red-400">
                  S: {playerData.arms?.right?.shoulder_angle !== null ? 
                    `${playerData.arms.right.shoulder_angle.toFixed(1)}°` : 'N/A'}
                </span><br/>
                <span className="text-orange-400">
                  E: {playerData.arms?.right?.elbow_angle !== null ? 
                    `${playerData.arms.right.elbow_angle.toFixed(1)}°` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Timestamp */}
          <div className="text-xs text-gray-400">
            Last Update: {getTimeSinceUpdate(playerData.timestamp)}
          </div>
        </div>
      ) : (
        <div className="text-gray-400 text-center py-4">
          {connectionStatus === "connected" ? "Waiting for pose data..." : "No pose data available"}
        </div>
      )}
      
      {/* Debug Info */}
      {poseData?.debug && (
        <details className="mt-3">
          <summary className="text-xs text-gray-400 cursor-pointer">Debug Info</summary>
          <div className="mt-2 text-xs text-gray-300 space-y-1">
            <div>Player Index: {posePlayerIndex}</div>
            <div>Total Players: {poseData.players?.length || 0}</div>
            {poseData.debug.left_reps && (
              <div>Left Reps: {JSON.stringify(poseData.debug.left_reps)}</div>
            )}
            {poseData.debug.right_reps && (
              <div>Right Reps: {JSON.stringify(poseData.debug.right_reps)}</div>
            )}
          </div>
        </details>
      )}
      
      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-gray-600">
        <div className="text-xs text-gray-400">
          <div>🟢 Connected | 🟡 Connecting | 🔴 Disconnected</div>
          <div>🏃 Run | 🦘 Jump | 🦵 Crouch | 🧗 Mountain Climber</div>
        </div>
      </div>
    </div>
  );
}; 