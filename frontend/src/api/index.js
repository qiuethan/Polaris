/**
 * Pose Tracking API - Main exports
 * 
 * Usage:
 * import { usePoseWebSocket, getLeftPlayer, getActionEmoji } from '@/api';
 * 
 * or
 * 
 * import usePoseWebSocket from '@/api/usePoseWebSocket';
 * import * as poseUtils from '@/api/poseUtils';
 */

// Main hook
export { default as usePoseWebSocket } from './usePoseWebSocket';

// Utility functions
export {
    getPlayer,
    getLeftPlayer,
    getRightPlayer,
    isPlayerDoing,
    getActiveActions,
    isAnyPlayerDoing,
    getMaxSpeed,
    getFormattedHeadAngles,
    getFormattedArmAngles,
    getActionEmoji,
    getConnectionStatus,
    getTimeSinceUpdate,
    isValidPoseData
} from './poseUtils';

// Constants
export const POSE_ACTIONS = {
    RUN: 'run',
    JUMP: 'jump',
    CROUCH: 'crouch',
    MOUNTAIN_CLIMBER: 'mountain_climber',
    UNKNOWN: 'unknown'
};

export const CONNECTION_STATUS = {
    CONNECTED: 'connected',
    CONNECTING: 'connecting',
    DISCONNECTED: 'disconnected',
    ERROR: 'error'
};

export const DEFAULT_WEBSOCKET_URL = 'ws://localhost:8000/ws/pose'; 