/**
 * Utility functions for working with pose tracking data
 */

/**
 * Get a player's data by index (0 = left side, 1 = right side)
 * @param {Object} poseData - Pose data from usePoseWebSocket
 * @param {number} playerIndex - Player index (0 or 1)
 * @returns {Object|null} Player data or null if not available
 */
export const getPlayer = (poseData, playerIndex) => {
    if (!poseData?.players || !Array.isArray(poseData.players)) {
        return null;
    }
    return poseData.players[playerIndex] || null;
};

/**
 * Get the left side player (player 1)
 * @param {Object} poseData - Pose data from usePoseWebSocket
 * @returns {Object|null} Left player data
 */
export const getLeftPlayer = (poseData) => getPlayer(poseData, 0);

/**
 * Get the right side player (player 2)
 * @param {Object} poseData - Pose data from usePoseWebSocket
 * @returns {Object|null} Right player data
 */
export const getRightPlayer = (poseData) => getPlayer(poseData, 1);

/**
 * Check if a player is performing a specific action
 * @param {Object} player - Player data
 * @param {string} action - Action to check for ('run', 'jump', 'crouch', 'mountain_climber')
 * @returns {boolean} True if player is performing the action
 */
export const isPlayerDoing = (player, action) => {
    return player?.action === action;
};

/**
 * Get all active actions from both players
 * @param {Object} poseData - Pose data from usePoseWebSocket
 * @returns {Array<string>} Array of active actions
 */
export const getActiveActions = (poseData) => {
    if (!poseData?.players) return [];
    
    return poseData.players
        .map(player => player.action)
        .filter(action => action && action !== 'unknown');
};

/**
 * Check if any player is performing a specific action
 * @param {Object} poseData - Pose data from usePoseWebSocket
 * @param {string} action - Action to check for
 * @returns {boolean} True if any player is performing the action
 */
export const isAnyPlayerDoing = (poseData, action) => {
    return getActiveActions(poseData).includes(action);
};

/**
 * Get the highest speed among all players
 * @param {Object} poseData - Pose data from usePoseWebSocket
 * @returns {number} Maximum speed
 */
export const getMaxSpeed = (poseData) => {
    if (!poseData?.players) return 0;
    
    return Math.max(...poseData.players.map(player => player.speed || 0));
};

/**
 * Get formatted head angles for display
 * @param {Object} player - Player data
 * @returns {Object} Formatted head angles with rounded values
 */
export const getFormattedHeadAngles = (player) => {
    if (!player?.head) {
        return { pitch: 'N/A', yaw: 'N/A', roll: 'N/A' };
    }
    
    return {
        pitch: player.head.pitch !== null ? `${player.head.pitch.toFixed(1)}°` : 'N/A',
        yaw: player.head.yaw !== null ? `${player.head.yaw.toFixed(1)}°` : 'N/A',
        roll: player.head.roll !== null ? `${player.head.roll.toFixed(1)}°` : 'N/A'
    };
};

/**
 * Get formatted arm angles for display
 * @param {Object} player - Player data
 * @returns {Object} Formatted arm angles
 */
export const getFormattedArmAngles = (player) => {
    if (!player?.arms) {
        return {
            left: { shoulder: 'N/A', elbow: 'N/A' },
            right: { shoulder: 'N/A', elbow: 'N/A' }
        };
    }
    
    return {
        left: {
            shoulder: player.arms.left?.shoulder_angle !== null 
                ? `${player.arms.left.shoulder_angle.toFixed(1)}°` 
                : 'N/A',
            elbow: player.arms.left?.elbow_angle !== null 
                ? `${player.arms.left.elbow_angle.toFixed(1)}°` 
                : 'N/A'
        },
        right: {
            shoulder: player.arms.right?.shoulder_angle !== null 
                ? `${player.arms.right.shoulder_angle.toFixed(1)}°` 
                : 'N/A',
            elbow: player.arms.right?.elbow_angle !== null 
                ? `${player.arms.right.elbow_angle.toFixed(1)}°` 
                : 'N/A'
        }
    };
};

/**
 * Get action emoji for display
 * @param {string} action - Action name
 * @returns {string} Emoji representing the action
 */
export const getActionEmoji = (action) => {
    const actionEmojis = {
        'run': '🏃',
        'jump': '🦘',
        'crouch': '🦵',
        'mountain_climber': '🧗',
        'unknown': '❓'
    };
    
    return actionEmojis[action] || '❓';
};

/**
 * Get connection status emoji and color
 * @param {string} status - Connection status
 * @returns {Object} Object with emoji and color
 */
export const getConnectionStatus = (status) => {
    const statusMap = {
        'connected': { emoji: '🟢', color: 'text-green-600', text: 'Connected' },
        'connecting': { emoji: '🟡', color: 'text-yellow-600', text: 'Connecting...' },
        'disconnected': { emoji: '🔴', color: 'text-red-600', text: 'Disconnected' },
        'error': { emoji: '❌', color: 'text-red-600', text: 'Error' }
    };
    
    return statusMap[status] || statusMap.disconnected;
};

/**
 * Calculate time since last update
 * @param {number} timestamp - Timestamp from pose data
 * @returns {string} Formatted time difference
 */
export const getTimeSinceUpdate = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    
    return 'Long ago';
};

/**
 * Validate pose data structure
 * @param {Object} data - Raw data from WebSocket
 * @returns {boolean} True if data is valid
 */
export const isValidPoseData = (data) => {
    return (
        data &&
        typeof data === 'object' &&
        Array.isArray(data.players) &&
        data.players.length >= 2 &&
        data.players.every(player => 
            player &&
            typeof player.player === 'number' &&
            typeof player.speed === 'number' &&
            player.head &&
            player.arms
        )
    );
}; 