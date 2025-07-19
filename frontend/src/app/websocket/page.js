'use client';

import React from 'react';
import { usePoseWebSocket, PoseWebSocketProvider } from '../../api/usePoseWebSocket';
import { getPlayer, getConnectionStatus, getActionEmoji, getTimeSinceUpdate } from '../../api/poseUtils';

function WebSocketTestContent() {
  const { poseData, connectionStatus, error, reconnectAttempts, reconnect, disconnect } = usePoseWebSocket();
  
  const connectionInfo = getConnectionStatus(connectionStatus);
  const player1Data = getPlayer(poseData, 0);
  const player2Data = getPlayer(poseData, 1);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">🎭 Pose WebSocket Test</h1>
          <p className="text-gray-300">
            Test the connection to your pose tracking server before playing the game
          </p>
        </div>

        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Connection Status</h2>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl">{connectionInfo.emoji}</span>
            <div>
              <div className={`text-lg font-semibold ${connectionInfo.color}`}>
                {connectionInfo.text}
              </div>
              {reconnectAttempts > 0 && (
                <div className="text-yellow-400 text-sm">
                  Reconnection attempt: {reconnectAttempts}
                </div>
              )}
            </div>
          </div>
          
          {error && (
            <div className="bg-red-900 border border-red-700 rounded p-3 mb-4">
              <div className="font-semibold text-red-200">Error:</div>
              <div className="text-red-300">{error}</div>
            </div>
          )}
          
          <div className="flex gap-4">
            <button 
              onClick={reconnect}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold"
            >
              Reconnect
            </button>
            <button 
              onClick={disconnect}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold"
            >
              Disconnect
            </button>
            <a 
              href="/play"
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold inline-block"
            >
              Launch Game
            </a>
          </div>
        </div>

        {/* Player Data */}
        {poseData && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Player 1 */}
            <PlayerDataCard 
              title="🔵 Player 1 (Left Side)" 
              playerData={player1Data}
              playerIndex={0}
            />
            
            {/* Player 2 */}
            <PlayerDataCard 
              title="🔴 Player 2 (Right Side)" 
              playerData={player2Data} 
              playerIndex={1}
            />
          </div>
        )}

        {/* Debug Information */}
        {poseData?.debug && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Debug Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Left Side Repetitions</h3>
                <pre className="bg-gray-900 p-3 rounded text-sm">
                  {JSON.stringify(poseData.debug.left_reps, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Right Side Repetitions</h3>
                <pre className="bg-gray-900 p-3 rounded text-sm">
                  {JSON.stringify(poseData.debug.right_reps, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-900 border border-blue-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">📋 Instructions</h2>
          <div className="space-y-3 text-blue-100">
            <p><strong>1. Start the Server:</strong> Run the pose tracking server with <code className="bg-blue-800 px-2 py-1 rounded">python pose_websocket_server.py</code></p>
            <p><strong>2. Position Yourself:</strong> Stand in front of your camera, making sure your full body is visible</p>
            <p><strong>3. Test Actions:</strong> Try the following movements to see if they're detected:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>🏃 Run:</strong> Run in place with alternating leg movements</li>
              <li><strong>🦘 Jump:</strong> Jump with both feet off the ground</li>
              <li><strong>🦵 Crouch:</strong> Squat down with bent knees</li>
              <li><strong>🧗 Mountain Climber:</strong> Get in plank position and alternate bringing knees to chest</li>
            </ul>
            <p><strong>4. Check the Data:</strong> Watch the real-time data above to ensure actions are being detected</p>
            <p><strong>5. Launch Game:</strong> Click "Launch Game" above to start playing with pose controls!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerDataCard({ title, playerData, playerIndex }) {
  if (!playerData) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <div className="text-gray-400 text-center py-8">
          No data available for this player
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      
      {/* Current Action */}
      <div className="bg-gray-700 rounded p-4 mb-4">
        <h3 className="font-semibold mb-2">Current Action</h3>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{getActionEmoji(playerData.action)}</span>
          <div>
            <div className="text-lg capitalize text-green-400">
              {playerData.action || "none"}
            </div>
            <div className="text-sm text-gray-400">
              Speed: {playerData.speed?.toFixed(1) || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Head Angles */}
      <div className="bg-gray-700 rounded p-4 mb-4">
        <h3 className="font-semibold mb-2">Head Tracking</h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="text-center">
            <div className="text-gray-400">Pitch</div>
            <div className="text-blue-400 font-mono">
              {playerData.head?.pitch !== null ? `${playerData.head.pitch.toFixed(1)}°` : 'N/A'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Yaw</div>
            <div className="text-green-400 font-mono">
              {playerData.head?.yaw !== null ? `${playerData.head.yaw.toFixed(1)}°` : 'N/A'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Roll</div>
            <div className="text-purple-400 font-mono">
              {playerData.head?.roll !== null ? `${playerData.head.roll.toFixed(1)}°` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Arm Angles */}
      <div className="bg-gray-700 rounded p-4 mb-4">
        <h3 className="font-semibold mb-2">Arm Tracking</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400 mb-1">Left Arm</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Shoulder:</span>
                <span className="text-blue-400 font-mono">
                  {playerData.arms?.left?.shoulder_angle !== null ? 
                    `${playerData.arms.left.shoulder_angle.toFixed(1)}°` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Elbow:</span>
                <span className="text-cyan-400 font-mono">
                  {playerData.arms?.left?.elbow_angle !== null ? 
                    `${playerData.arms.left.elbow_angle.toFixed(1)}°` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Right Arm</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Shoulder:</span>
                <span className="text-red-400 font-mono">
                  {playerData.arms?.right?.shoulder_angle !== null ? 
                    `${playerData.arms.right.shoulder_angle.toFixed(1)}°` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Elbow:</span>
                <span className="text-orange-400 font-mono">
                  {playerData.arms?.right?.elbow_angle !== null ? 
                    `${playerData.arms.right.elbow_angle.toFixed(1)}°` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-400 text-center">
        Last Update: {getTimeSinceUpdate(playerData.timestamp)}
      </div>
    </div>
  );
} 

export default function WebSocketTestPage() {
  return (
    <PoseWebSocketProvider>
      <WebSocketTestContent />
    </PoseWebSocketProvider>
  );
} 