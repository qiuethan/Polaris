// components/Game.jsx
'use client';

import { KeyboardControls, Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { Suspense, useEffect } from "react";
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
});

// Shared Scene Components
function SharedScene({ playerId, usePoseControl = false }) {
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
    console.log("Map changed to:", map, "- Resetting player path progress");
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
      <ObstacleCourse />

      
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

// Player 1 controls (WASD + Shift + Space) - for keyboard fallback
const player1KeyboardMap = [
  { name: "forward", keys: ["KeyW"] },
  { name: "backward", keys: ["KeyS"] },
  { name: "run", keys: ["ShiftLeft"] },
  { name: "jump", keys: ["KeyJ"] },
];

// Player 2 controls (Arrow keys + Right Shift + Enter) - for keyboard fallback
const player2KeyboardMap = [
  { name: "forward", keys: ["ArrowUp"] },
  { name: "backward", keys: ["ArrowDown"] },
  { name: "run", keys: ["ShiftRight"] },
  { name: "jump", keys: ["KeyL"] },
];

export default function Game() {
  const { physicsDebug, controlMode, showPoseDebug } = useControls("Map & Debug", {
    physicsDebug: { value: false },
    controlMode: {
      value: "pose",
      options: ["keyboard", "pose"],
      label: "Control Mode"
    },
    showPoseDebug: {
      value: true,
      label: "Show Pose Debug"
    }
  });

  const usePoseControl = controlMode === "pose";

  return (
    <PoseWebSocketProvider>
      <div className="w-full h-screen flex bg-black">
        {/* Player 1 View - Left Side */}
        <div className="relative w-1/2 h-full">
          <KeyboardControls map={player1KeyboardMap}>
            <Canvas
              shadows
              camera={{ position: [2, 1.5, -2], near: 0.01, fov: 60 }}
              gl={{ antialias: true }}
            >
              <Suspense fallback={null}>
                <Physics debug={physicsDebug} gravity={[0, -30, 0]}>
                  <SharedScene playerId="player1" usePoseControl={usePoseControl} />
                </Physics>
              </Suspense>
            </Canvas>
          </KeyboardControls>
          
          {/* Player 1 Minimap */}
          <div className="absolute w-48 h-48 top-4 left-4 shadow-2xl border-2 border-white rounded-lg overflow-hidden">
            <Canvas gl={{ antialias: false }}>
              <Minimap playerId="player1" />
            </Canvas>
          </div>
          
          {/* Player 1 Label */}
          <div className="absolute top-4 left-56 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
            Player 1 {usePoseControl ? "(Pose Control)" : "(W/S + J)"}
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
          <KeyboardControls map={player2KeyboardMap}>
            <Canvas
              shadows
              camera={{ position: [2, 1.5, -2], near: 0.01, fov: 60 }}
              gl={{ antialias: true }}
            >
              <Suspense fallback={null}>
                <Physics debug={physicsDebug} gravity={[0, -30, 0]}>
                  <SharedScene playerId="player2" usePoseControl={usePoseControl} />
                </Physics>
              </Suspense>
            </Canvas>
          </KeyboardControls>
          
          {/* Player 2 Minimap */}
          <div className="absolute w-48 h-48 top-4 right-4 shadow-2xl border-2 border-white rounded-lg overflow-hidden">
            <Canvas gl={{ antialias: false }}>
              <Minimap playerId="player2" />
            </Canvas>
          </div>
          
          {/* Player 2 Label */}
          <div className="absolute top-4 right-56 bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
            Player 2 {usePoseControl ? "(Pose Control)" : "(↑/↓ + L)"}
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
              "Use keyboard controls to play"
            }
          </div>
          {usePoseControl && (
            <div className="text-xs text-gray-400 mt-1">
              Run • Jump • Crouch • Mountain Climber
            </div>
          )}
        </div>
      </div>
    </PoseWebSocketProvider>
  );
}