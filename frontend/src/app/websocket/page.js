'use client';

import { 
    usePoseWebSocket, 
    getLeftPlayer, 
    getRightPlayer,
    getFormattedHeadAngles,
    getFormattedArmAngles,
    getConnectionStatus,
    getActionEmoji,
    getTimeSinceUpdate 
} from '../../api';

export default function WebSocketPage() {
    const { poseData, connectionStatus, error, reconnect, disconnect, reconnectAttempts } = usePoseWebSocket();
    
    const status = getConnectionStatus(connectionStatus);
    const leftPlayer = getLeftPlayer(poseData);
    const rightPlayer = getRightPlayer(poseData);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">
                        🎯 Pose Tracker WebSocket
                    </h1>
                    <p className="text-sm text-gray-600">
                        Real-time pose tracking data from your camera
                    </p>
                </div>

                {/* Connection Status */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className={`text-lg ${status.color}`}>
                                {status.emoji}
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Connection Status</h2>
                                <p className={`${status.color} font-medium text-sm`}>
                                    {status.text}
                                </p>
                                {reconnectAttempts > 0 && (
                                    <p className="text-xs text-gray-500">
                                        Reconnection attempts: {reconnectAttempts}
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex space-x-2">
                            <button 
                                onClick={reconnect}
                                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            >
                                🔄 Reconnect
                            </button>
                            <button 
                                onClick={disconnect}
                                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                                🔌 Disconnect
                            </button>
                        </div>
                    </div>
                    
                    {error && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                            <p className="text-red-700 text-sm">❌ Error: {error}</p>
                        </div>
                    )}
                </div>

                {/* Pose Data */}
                {poseData ? (
                    <>
                        {/* Data Info */}
                        <div className="bg-white rounded-lg shadow-md p-3 mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-semibold">📊 Live Data</h2>
                                <div className="text-xs text-gray-500">
                                    Last update: {getTimeSinceUpdate(poseData.timestamp)}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-green-50 p-3 rounded">
                                    <div className="text-lg font-bold text-green-600">
                                        {poseData.players?.length || 0}
                                    </div>
                                    <div className="text-sm text-green-700">Players Detected</div>
                                </div>
                                
                                <div className="bg-blue-50 p-3 rounded">
                                    <div className="text-lg font-bold text-blue-600">
                                        30 FPS
                                    </div>
                                    <div className="text-sm text-blue-700">Update Rate</div>
                                </div>
                                
                                <div className="bg-purple-50 p-3 rounded">
                                    <div className="text-lg font-bold text-purple-600">
                                        {Math.round((Date.now() / 1000) - (poseData.timestamp || 0))}ms
                                    </div>
                                    <div className="text-sm text-purple-700">Latency</div>
                                </div>
                            </div>
                        </div>

                        {/* Players */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Player 1 (Left) */}
                            <div className="bg-white rounded-lg shadow-md p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold">🎮 Player 1 (Left)</h2>
                                    <div className="text-2xl">
                                        {getActionEmoji(leftPlayer?.action)}
                                    </div>
                                </div>
                                
                                {leftPlayer ? (
                                    <div className="space-y-3">
                                        <div className="bg-gray-50 p-3 rounded">
                                            <h3 className="font-semibold mb-1 text-sm">Current Action</h3>
                                            <div className="text-lg font-bold text-blue-600">
                                                {leftPlayer.action || 'None'}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gray-50 p-3 rounded">
                                            <h3 className="font-semibold mb-1 text-sm">Speed</h3>
                                            <div className="text-md">
                                                {leftPlayer.speed} units/s
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gray-50 p-3 rounded">
                                            <h3 className="font-semibold mb-1 text-sm">Head Angles</h3>
                                            <div className="grid grid-cols-3 gap-1 text-xs">
                                                {(() => {
                                                    const headAngles = getFormattedHeadAngles(leftPlayer);
                                                    return (
                                                        <>
                                                            <div>Pitch: {headAngles.pitch}</div>
                                                            <div>Yaw: {headAngles.yaw}</div>
                                                            <div>Roll: {headAngles.roll}</div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gray-50 p-3 rounded">
                                            <h3 className="font-semibold mb-1 text-sm">Arm Angles</h3>
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                {(() => {
                                                    const armAngles = getFormattedArmAngles(leftPlayer);
                                                    return (
                                                        <>
                                                            <div>
                                                                <div className="font-medium">Left Arm</div>
                                                                <div>Shoulder: {armAngles.left.shoulder}</div>
                                                                <div>Elbow: {armAngles.left.elbow}</div>
                                                            </div>
                                                            <div>
                                                                <div className="font-medium">Right Arm</div>
                                                                <div>Shoulder: {armAngles.right.shoulder}</div>
                                                                <div>Elbow: {armAngles.right.elbow}</div>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500 text-sm">
                                        No player detected on left side
                                    </div>
                                )}
                            </div>

                            {/* Player 2 (Right) */}
                            <div className="bg-white rounded-lg shadow-md p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold">🎮 Player 2 (Right)</h2>
                                    <div className="text-2xl">
                                        {getActionEmoji(rightPlayer?.action)}
                                    </div>
                                </div>
                                
                                {rightPlayer ? (
                                    <div className="space-y-3">
                                        <div className="bg-gray-50 p-3 rounded">
                                            <h3 className="font-semibold mb-1 text-sm">Current Action</h3>
                                            <div className="text-lg font-bold text-green-600">
                                                {rightPlayer.action || 'None'}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gray-50 p-3 rounded">
                                            <h3 className="font-semibold mb-1 text-sm">Speed</h3>
                                            <div className="text-md">
                                                {rightPlayer.speed} units/s
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gray-50 p-3 rounded">
                                            <h3 className="font-semibold mb-1 text-sm">Head Angles</h3>
                                            <div className="grid grid-cols-3 gap-1 text-xs">
                                                {(() => {
                                                    const headAngles = getFormattedHeadAngles(rightPlayer);
                                                    return (
                                                        <>
                                                            <div>Pitch: {headAngles.pitch}</div>
                                                            <div>Yaw: {headAngles.yaw}</div>
                                                            <div>Roll: {headAngles.roll}</div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gray-50 p-3 rounded">
                                            <h3 className="font-semibold mb-1 text-sm">Arm Angles</h3>
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                {(() => {
                                                    const armAngles = getFormattedArmAngles(rightPlayer);
                                                    return (
                                                        <>
                                                            <div>
                                                                <div className="font-medium">Left Arm</div>
                                                                <div>Shoulder: {armAngles.left.shoulder}</div>
                                                                <div>Elbow: {armAngles.left.elbow}</div>
                                                            </div>
                                                            <div>
                                                                <div className="font-medium">Right Arm</div>
                                                                <div>Shoulder: {armAngles.right.shoulder}</div>
                                                                <div>Elbow: {armAngles.right.elbow}</div>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500 text-sm">
                                        No player detected on right side
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Raw Data */}
                        <div className="mt-4 bg-white rounded-lg shadow-md p-4">
                            <h2 className="text-lg font-semibold mb-3">🔍 Raw Data</h2>
                            <pre className="bg-gray-100 p-3 rounded overflow-auto text-xs max-h-60">
                                {JSON.stringify(poseData, null, 2)}
                            </pre>
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <div className="text-4xl mb-3">🔄</div>
                        <h2 className="text-xl font-semibold mb-2">Waiting for Pose Data</h2>
                        <p className="text-gray-600 mb-4 text-sm">
                            Make sure the pose tracking server is running and your camera is connected.
                        </p>
                        <div className="text-xs text-gray-500">
                            Server URL: ws://localhost:8000/ws/pose
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 