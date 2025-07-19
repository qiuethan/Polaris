# Pose Tracking API

React hook and utilities for connecting to the pose tracking WebSocket server.

## Quick Start

```jsx
import { usePoseWebSocket, getLeftPlayer, getActionEmoji } from '@/api';

function PoseTracker() {
    const { poseData, connectionStatus, error } = usePoseWebSocket();
    
    if (!poseData) return <div>Loading...</div>;
    
    const leftPlayer = getLeftPlayer(poseData);
    const rightPlayer = getRightPlayer(poseData);
    
    return (
        <div>
            <div>Status: {connectionStatus}</div>
            <div>Left Player: {getActionEmoji(leftPlayer.action)} {leftPlayer.action}</div>
            <div>Right Player: {getActionEmoji(rightPlayer.action)} {rightPlayer.action}</div>
        </div>
    );
}
```

## API Reference

### `usePoseWebSocket(url, options)`

Main hook for connecting to the pose tracking WebSocket.

**Parameters:**
- `url` (string, optional): WebSocket URL (default: `ws://localhost:8000/ws/pose`)
- `options` (object, optional): Configuration options
  - `maxReconnectAttempts` (number): Max reconnection attempts (default: 5)
  - `reconnectInterval` (number): Base reconnection interval in ms (default: 1000)
  - `autoReconnect` (boolean): Enable auto-reconnection (default: true)

**Returns:**
- `poseData`: Latest pose data from server
- `connectionStatus`: 'connecting' | 'connected' | 'disconnected' | 'error'
- `error`: Error message if any
- `reconnect()`: Manual reconnection function
- `disconnect()`: Manual disconnection function
- `reconnectAttempts`: Current number of reconnection attempts

### Utility Functions

#### Player Data
- `getPlayer(poseData, index)` - Get player by index (0 = left, 1 = right)
- `getLeftPlayer(poseData)` - Get left side player
- `getRightPlayer(poseData)` - Get right side player

#### Actions
- `isPlayerDoing(player, action)` - Check if player is doing specific action
- `getActiveActions(poseData)` - Get all active actions
- `isAnyPlayerDoing(poseData, action)` - Check if any player is doing action
- `getActionEmoji(action)` - Get emoji for action

#### Display Helpers
- `getFormattedHeadAngles(player)` - Get formatted head angles
- `getFormattedArmAngles(player)` - Get formatted arm angles
- `getConnectionStatus(status)` - Get status emoji and color
- `getTimeSinceUpdate(timestamp)` - Calculate time since last update

#### Validation
- `isValidPoseData(data)` - Validate pose data structure

## Examples

### Basic Usage

```jsx
import { usePoseWebSocket } from '@/api';

function BasicExample() {
    const { poseData, connectionStatus } = usePoseWebSocket();
    
    return (
        <div>
            <div>Status: {connectionStatus}</div>
            {poseData && (
                <div>
                    Player 1: {poseData.players[0].action}
                    Player 2: {poseData.players[1].action}
                </div>
            )}
        </div>
    );
}
```

### Game Integration

```jsx
import { usePoseWebSocket, isPlayerDoing, POSE_ACTIONS } from '@/api';

function GameComponent() {
    const { poseData } = usePoseWebSocket();
    
    useEffect(() => {
        if (!poseData) return;
        
        const leftPlayer = poseData.players[0];
        const rightPlayer = poseData.players[1];
        
        // Control game based on actions
        if (isPlayerDoing(leftPlayer, POSE_ACTIONS.JUMP)) {
            triggerJump('player1');
        }
        
        if (isPlayerDoing(rightPlayer, POSE_ACTIONS.RUN)) {
            movePlayer('player2', rightPlayer.speed);
        }
        
    }, [poseData]);
    
    return <GameCanvas />;
}
```

### Custom Configuration

```jsx
import { usePoseWebSocket } from '@/api';

function CustomExample() {
    const { poseData, connectionStatus, error, reconnect } = usePoseWebSocket(
        'ws://your-server.com/ws/pose',
        {
            maxReconnectAttempts: 10,
            reconnectInterval: 2000,
            autoReconnect: true
        }
    );
    
    return (
        <div>
            {error && (
                <div>
                    Error: {error}
                    <button onClick={reconnect}>Retry</button>
                </div>
            )}
            {/* Your UI */}
        </div>
    );
}
```

### Full Dashboard Example

```jsx
import { 
    usePoseWebSocket, 
    getLeftPlayer, 
    getRightPlayer,
    getFormattedHeadAngles,
    getConnectionStatus,
    getActionEmoji 
} from '@/api';

function PoseDashboard() {
    const { poseData, connectionStatus, error } = usePoseWebSocket();
    
    if (!poseData) {
        return <div className="loading">Connecting to pose tracker...</div>;
    }
    
    const leftPlayer = getLeftPlayer(poseData);
    const rightPlayer = getRightPlayer(poseData);
    const status = getConnectionStatus(connectionStatus);
    
    return (
        <div className="dashboard">
            <header>
                <h1>🎯 Pose Tracker Dashboard</h1>
                <div className={status.color}>
                    {status.emoji} {status.text}
                </div>
            </header>
            
            <div className="players">
                <div className="player-card">
                    <h2>Player 1 (Left)</h2>
                    <div className="action">
                        {getActionEmoji(leftPlayer.action)} {leftPlayer.action || 'None'}
                    </div>
                    <div>Speed: {leftPlayer.speed}</div>
                    <div>Head: {JSON.stringify(getFormattedHeadAngles(leftPlayer))}</div>
                </div>
                
                <div className="player-card">
                    <h2>Player 2 (Right)</h2>
                    <div className="action">
                        {getActionEmoji(rightPlayer.action)} {rightPlayer.action || 'None'}
                    </div>
                    <div>Speed: {rightPlayer.speed}</div>
                    <div>Head: {JSON.stringify(getFormattedHeadAngles(rightPlayer))}</div>
                </div>
            </div>
            
            {error && <div className="error">Error: {error}</div>}
        </div>
    );
}
```

## Data Structure

The `poseData` object has this structure:

```javascript
{
  "players": [
    {
      "player": 1,
      "action": "run" | "jump" | "crouch" | "mountain_climber" | null,
      "speed": 8.5,
      "head": {
        "pitch": -12.3,
        "yaw": 15.7,
        "roll": 2.1
      },
      "arms": {
        "left": {
          "shoulder_angle": 145.2,
          "elbow_angle": 90.5
        },
        "right": {
          "shoulder_angle": 150.8,
          "elbow_angle": 85.3
        }
      }
    },
    // Player 2 has same structure...
  ],
  "timestamp": 1642534567.123
}
```

## Constants

```javascript
import { POSE_ACTIONS, CONNECTION_STATUS } from '@/api';

// Available actions
POSE_ACTIONS.RUN           // 'run'
POSE_ACTIONS.JUMP          // 'jump'
POSE_ACTIONS.CROUCH        // 'crouch'
POSE_ACTIONS.MOUNTAIN_CLIMBER // 'mountain_climber'
POSE_ACTIONS.UNKNOWN       // 'unknown'

// Connection statuses
CONNECTION_STATUS.CONNECTED    // 'connected'
CONNECTION_STATUS.CONNECTING   // 'connecting'
CONNECTION_STATUS.DISCONNECTED // 'disconnected'
CONNECTION_STATUS.ERROR        // 'error'
``` 