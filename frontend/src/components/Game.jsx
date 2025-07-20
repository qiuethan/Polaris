// components/Game.jsx
'use client';

import { KeyboardControls, Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { Suspense, useEffect, useState } from "react";
import { Vector3 } from "three";
import { proxy } from "valtio";
import { useControls } from "leva";
import { CharacterController } from "./CharacterController";
import { PoseCharacterController } from "./PoseCharacterController";
import { PoseDebugDisplay } from "./PoseDebugDisplay";
import { PoseWebSocketProvider, usePoseWebSocket } from "../api/usePoseWebSocket";
import { getConnectionStatus } from "../api/poseUtils";
import { Map } from "./Map";
import { Minimap, maps } from "./Minimap";
import { DualLaneSystem } from "./DualLaneSystem";
import { PositionDisplay } from "./PositionDisplay";
import { ObstacleCourse } from "./Obstacles";

// Create game state
export const GameState = proxy({
  map: "medieval_fantasy_book",
  player1: {
    position: new Vector3(0, 1, 0),
    rotation: 0,
    pathProgress: 0,
  },
  player2: {
    position: new Vector3(3, 1, 0),
    rotation: 0,
    pathProgress: 0.1,
  },
  gameStatus: {
    isFinished: false,
    winner: null,
    raceStartTime: null,
  },
});

// Shared Scene Components
function SharedScene({ playerId, usePoseControl = false, showPositionInfo = false, onGameWin }) {
  // Use shared game state instead of duplicate controls
  const map = "medieval_fantasy_book"; // Default map
  const physicsDebug = false; // Will be controlled by main Game component
  
  useEffect(() => {
    GameState.map = map;
    // Reset player path progress when map changes
    GameState.player1.pathProgress = 0;
    GameState.player2.pathProgress = 0.1;
    // Reset game status
    GameState.gameStatus.isFinished = false;
    GameState.gameStatus.winner = null;
    console.log("Map changed to:", map, "- Resetting player path progress and game status");
  }, [map]);
  
  const CharacterComponent = usePoseControl ? PoseCharacterController : CharacterController;
  
  return (
    <>
      {/* Sky color */}
      <color attach="background" args={["#87CEEB"]} />
      
      {/* Fog for depth */}
      <fog attach="fog" args={["#87CEEB", 10, 100]} />
      
      {/* Environment lighting */}
      <Environment preset="sunset" />
      
      {/* Main directional light */}
      <directionalLight
        intensity={0.65}
        castShadow
        position={[-15, 10, 15]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.00005}
      />
      
      {/* Ambient light to brighten everything */}
      <ambientLight intensity={0.5} />
      
      {/* The map */}
      <Map
        scale={maps[map].scale}
        position={maps[map].position}
        model={`models/${map}.glb`}
      />
      
      {/* Characters - using the selected control method */}
      <CharacterComponent 
        playerId="player1" 
        isControlled={playerId === "player1"}
        color="#3b82f6"
      />
      <CharacterComponent 
        playerId="player2" 
        isControlled={playerId === "player2"}
        color="#ef4444"
      />
      
              {/* Obstacle Course with proper game end handling */}
        <ObstacleCourse onGameWin={onGameWin} />
      
      {/* Lane markers for reference - extend both ways, closer together */}
      <mesh position={[-0.5, 0.1, 0]}>
        <boxGeometry args={[0.1, 0.1, 100]} />
        <meshBasicMaterial color="#3b82f6" opacity={0.3} transparent />
      </mesh>
      <mesh position={[0.5, 0.1, 0]}>
        <boxGeometry args={[0.1, 0.1, 100]} />
        <meshBasicMaterial color="#ef4444" opacity={0.3} transparent />
      </mesh>
      
      {/* Position display for debugging */}
      {showPositionInfo && playerId === "player1" && <PositionDisplay playerId="player1" />}
      {showPositionInfo && playerId === "player2" && <PositionDisplay playerId="player2" />}
    </>
  );
}

// Unified keyboard map with ALL controls for both players
const unifiedKeyboardMap = [
  // Player 1 controls
  { name: "p1_forward", keys: ["KeyW"] },
  { name: "p1_backward", keys: ["KeyS"] },
  { name: "p1_run", keys: ["ShiftLeft"] },
  { name: "p1_jump", keys: ["Space", "KeyJ", "KeyF"] },
  { name: "p1_crouch", keys: ["KeyC"] },
  
  // Player 2 controls
  { name: "p2_forward", keys: ["ArrowUp"] },
  { name: "p2_backward", keys: ["ArrowDown"] },
  { name: "p2_run", keys: ["ShiftRight"] },
  { name: "p2_jump", keys: ["Enter", "KeyL", "KeyK"] },
  { name: "p2_crouch", keys: ["Slash"] },
];

// Enhanced Player Label Component with Connection Status
function PlayerLabel({ playerId, usePoseControl }) {
  const { connectionStatus, error, reconnectAttempts } = usePoseWebSocket();
  const connectionInfo = getConnectionStatus(connectionStatus);
  
  const isPlayer1 = playerId === "player1";
  const baseClasses = `absolute top-4 px-4 py-2 rounded-lg font-bold shadow-lg ${
    isPlayer1 ? 'left-56 bg-blue-600' : 'right-56 bg-red-600'
  } text-white`;
  
  return (
    <div className={baseClasses}>
      <div className="flex items-center gap-2">
        <span>
          {isPlayer1 ? 'Player 1' : 'Player 2'} {usePoseControl ? "(Pose Control)" : isPlayer1 ? "(W/S + Space/J/F + C)" : "(↑/↓ + Enter/L/K + /)"}
        </span>
        
        {usePoseControl && (
          <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white border-opacity-30">
            <span className={`text-lg ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`}>
              {connectionInfo.emoji}
            </span>
            <span className={`text-xs font-medium ${
              connectionStatus === 'connected' ? 'text-green-200' : 
              connectionStatus === 'connecting' ? 'text-yellow-200' : 
              'text-red-200'
            }`}>
              {connectionStatus === 'connected' ? '✓ Connected' :
               connectionStatus === 'connecting' ? 'Connecting...' :
               connectionStatus === 'error' ? '✗ Error' : '✗ Disconnected'}
            </span>
            {reconnectAttempts > 0 && (
              <span className="text-xs text-yellow-200 animate-pulse">
                (#{reconnectAttempts})
              </span>
            )}
          </div>
        )}
      </div>
      
      {usePoseControl && error && (
        <div className="text-xs text-red-200 mt-1 opacity-90">
          {error.length > 50 ? error.substring(0, 50) + '...' : error}
        </div>
      )}
    </div>
  );
}

export default function Game({ onReturnToMenu, containerSize }) {
  // Local state for debug toggles
  const [poseDebugState, setPoseDebugState] = useState(false);
  const [positionInfoState, setPositionInfoState] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const { physicsDebug, controlMode } = useControls("Map & Debug", {
    physicsDebug: { 
      value: false,
      label: "🔧 Physics Debug"
    },
    controlMode: {
      value: "keyboard",
      options: ["keyboard", "pose"],
      label: "🎮 Control Mode"
    }
  });

  // Also add Leva controls that sync with state
  useControls("Debug Displays", {
    showPoseDebug: {
      value: poseDebugState,
      label: "🎭 Show Pose Debug",
      onChange: (value) => setPoseDebugState(value)
    },
    showPositionInfo: {
      value: positionInfoState,
      label: "📍 Show Position Info", 
      onChange: (value) => setPositionInfoState(value)
    }
  });

  const usePoseControl = controlMode === "pose";
  const showPoseDebug = poseDebugState;
  const showPositionInfo = positionInfoState;

  // Keyboard shortcuts for debug toggles
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Only trigger if not typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
      
      switch (event.key.toLowerCase()) {
        case 'p':
          if (usePoseControl) {
            setPoseDebugState(prev => !prev);
          }
          break;
        case 'i':
          setPositionInfoState(prev => !prev);
          break;
        case 'h':
          // Hide all debug displays
          setPoseDebugState(false);
          setPositionInfoState(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [usePoseControl]);

  const handleGameWin = (winnerId) => {
    console.log(`🏆 Game won by ${winnerId}!`);
    
    // Update game state
    GameState.gameStatus.isFinished = true;
    GameState.gameStatus.winner = winnerId;
    
    // Prevent multiple triggers
    if (isTransitioning) return;
    setIsTransitioning(true);
    
    // Show victory for a moment before returning to menu
    setTimeout(() => {
      console.log("Returning to menu...");
      if (onReturnToMenu) {
        onReturnToMenu();
      }
    }, 3000); // 3 second delay to show victory
  };



  return (
    <PoseWebSocketProvider>
      <div 
        className="flex bg-black relative"
        style={containerSize ? {
          width: containerSize.width,
          height: containerSize.height,
          position: 'relative',
          overflow: 'hidden'
        } : {
          width: '100%',
          height: '100%'
        }}
      >
        {/* Player 1 View - Left Side */}
        <div className="relative w-1/2 h-full">
          <Canvas
            shadows
            camera={{ position: [2, 1.5, -2], near: 0.01, fov: 60 }}
            gl={{ antialias: true }}
            style={{ width: '100%', height: '100%' }}
            resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
            key="player1-canvas"
          >
            <KeyboardControls map={unifiedKeyboardMap}>
              <Suspense fallback={null}>
                <Physics debug={physicsDebug} gravity={[0, -30, 0]}>
                  <SharedScene 
                    playerId="player1" 
                    usePoseControl={usePoseControl} 
                    showPositionInfo={showPositionInfo}
                    onGameWin={handleGameWin}
                    physicsDebug={physicsDebug}
                  />
                </Physics>
              </Suspense>
            </KeyboardControls>
          </Canvas>
          
          {/* Player 1 Minimap */}
          <div className="absolute w-48 h-48 top-4 left-4 shadow-2xl border-2 border-white rounded-lg overflow-hidden">
            <Canvas 
              gl={{ antialias: false }}
              style={{ width: '100%', height: '100%' }}
            >
              <Minimap playerId="player1" />
            </Canvas>
          </div>
          
          {/* Player 1 Label with Connection Status */}
          <PlayerLabel playerId="player1" usePoseControl={usePoseControl} />
          
          {/* Pose Debug Display for Player 1 */}
          {showPoseDebug && usePoseControl && (
            <PoseDebugDisplay playerId="player1" position="bottom-left" />
          )}
        </div>

        {/* Divider */}
        <div className="w-1 bg-white" />

        {/* Player 2 View - Right Side */}
        <div className="relative w-1/2 h-full">
          <Canvas
            shadows
            camera={{ position: [2, 1.5, -2], near: 0.01, fov: 60 }}
            gl={{ antialias: true }}
            style={{ width: '100%', height: '100%' }}
            resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
            key="player2-canvas"
          >
            <KeyboardControls map={unifiedKeyboardMap}>
              <Suspense fallback={null}>
                <Physics debug={physicsDebug} gravity={[0, -30, 0]}>
                  <SharedScene 
                    playerId="player2" 
                    usePoseControl={usePoseControl} 
                    showPositionInfo={showPositionInfo}
                    onGameWin={handleGameWin}
                  />
                </Physics>
              </Suspense>
            </KeyboardControls>
          </Canvas>
          
          {/* Player 2 Minimap */}
          <div className="absolute w-48 h-48 top-4 right-4 shadow-2xl border-2 border-white rounded-lg overflow-hidden">
            <Canvas 
              gl={{ antialias: false }}
              style={{ width: '100%', height: '100%' }}
            >
              <Minimap playerId="player2" />
            </Canvas>
          </div>
          
          {/* Player 2 Label with Connection Status */}
          <PlayerLabel playerId="player2" usePoseControl={usePoseControl} />
          
          {/* Pose Debug Display for Player 2 */}
          {showPoseDebug && usePoseControl && (
            <PoseDebugDisplay playerId="player2" position="bottom-right" />
          )}
        </div>
        
        {/* Compact Control Mode Display */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-center pointer-events-none">
          <div className="text-sm font-semibold mb-1">
            {usePoseControl ? "🎭 POSE CONTROL" : "⌨️ KEYBOARD"}
          </div>
          <div className="text-xs text-gray-300">
            {usePoseControl ? 
              "Move your body to play!" : 
              "Use keyboard controls"
            }
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Press P for debug • I for info • H to hide
          </div>
        </div>
        
        {/* Debug Controls Overlay */}
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {usePoseControl && (
            <button
              onClick={() => setPoseDebugState(!poseDebugState)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors shadow ${
                showPoseDebug 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🎭 {showPoseDebug ? 'ON' : 'OFF'}
            </button>
          )}
          
          <button
            onClick={() => setPositionInfoState(!positionInfoState)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors shadow ${
              showPositionInfo 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📍 {showPositionInfo ? 'ON' : 'OFF'}
          </button>
          
          <button
            onClick={() => {
              setPoseDebugState(false);
              setPositionInfoState(false);
            }}
            className="px-2 py-1 rounded text-xs font-medium transition-colors shadow bg-red-600 text-white hover:bg-red-700"
          >
            🧹 Hide
          </button>
        </div>
        
        {/* Victory Overlay */}
        {GameState.gameStatus.isFinished && GameState.gameStatus.winner && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="text-center">
              <div className={`text-8xl font-bold mb-4 ${GameState.gameStatus.winner === 'player1' ? 'text-blue-500' : 'text-red-500'}`}>
                🏆 {GameState.gameStatus.winner === 'player1' ? 'PLAYER 1' : 'PLAYER 2'} WINS! 🏆
              </div>
              <div className="text-2xl text-white">
                Returning to menu...
              </div>
            </div>
          </div>
        )}
      </div>
    </PoseWebSocketProvider>
  );
}