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
import { PoseWebSocketProvider } from "../api/usePoseWebSocket";
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
function SharedScene({ playerId, usePoseControl = false, onGameWin }) {
  const { map, physicsDebug } = useControls("Map & Debug", {
    map: {
      value: "medieval_fantasy_book",
      options: Object.keys(maps),
    },
    physicsDebug: {
      value: false,
      label: "Show Physics Debug"
    },
  });
  
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
      {playerId === "player1" && <PositionDisplay playerId="player1" />}
      {playerId === "player2" && <PositionDisplay playerId="player2" />}
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

export default function Game({ containerSize, onReturnToMenu }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Ensure component is mounted before rendering Canvas
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const { physicsDebug, controlMode, showPoseDebug } = useControls("Map & Debug", {
    physicsDebug: { value: false },
    controlMode: {
      value: "keyboard",
      options: ["keyboard", "pose"],
      label: "Control Mode"
    },
    showPoseDebug: {
      value: true,
      label: "Show Pose Debug"
    }
  });

  const usePoseControl = controlMode === "pose";

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

  // Don't render until mounted
  if (!isMounted) {
    return <div className="w-full h-full bg-black flex items-center justify-center text-white">Loading...</div>;
  }

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
                    onGameWin={handleGameWin}
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
          
          {/* Player 1 Label */}
          <div className="absolute top-4 left-56 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
            Player 1 {usePoseControl ? "(Pose Control)" : "(W/S + Space/J/F + C)"}
          </div>
          
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
          
          {/* Player 2 Label */}
          <div className="absolute top-4 right-56 bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
            Player 2 {usePoseControl ? "(Pose Control)" : "(↑/↓ + Enter/L/K + /)"}
          </div>
          
          {/* Pose Debug Display for Player 2 */}
          {showPoseDebug && usePoseControl && (
            <PoseDebugDisplay playerId="player2" position="bottom-right" />
          )}
        </div>
        
        {/* Global Control Info */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded-lg font-bold text-center pointer-events-none">
          <div className="text-lg mb-1">
            {usePoseControl ? "🎭 POSE CONTROL MODE" : "⌨️ KEYBOARD MODE"}
          </div>
          <div className="text-sm text-gray-300">
            {usePoseControl ? 
              "Move your body to control characters!" : 
              "Player 1: W/S/Shift/Space/C | Player 2: ↑/↓/RShift/Enter//"
            }
          </div>
          {usePoseControl ? (
            <div className="text-xs text-gray-400 mt-1">
              Run • Jump • Crouch • Mountain Climber
            </div>
          ) : (
            <div className="text-xs text-gray-400 mt-1">
              Forward • Backward • Run • Jump • Crouch
            </div>
          )}
          <div className="text-xs text-yellow-400 mt-2">
            🏃‍♂️ Jump | 🦆 Duck | 🔺 Ramp
          </div>
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