// components/Game.jsx
'use client';

import { KeyboardControls, Environment, OrthographicCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useRef, useEffect } from "react";
import { Vector3 } from "three";
import { proxy } from "valtio";
import { useControls } from "leva";
import { CharacterController } from "./CharacterController";
import { Map } from "./Map";
import { Minimap, maps } from "./Minimap";

// Create game state
export const GameState = proxy({
  map: "castle_on_hills",
  player1: {
    position: new Vector3(-2, 0, 0),
    rotation: 0,
  },
  player2: {
    position: new Vector3(2, 0, 0),
    rotation: 0,
  },
});

// Shared Scene Components
function SharedScene({ playerId }) {
  const { map } = useControls("Map", {
    map: {
      value: "castle_on_hills",
      options: Object.keys(maps),
    },
  });
  
  useEffect(() => {
    GameState.map = map;
  }, [map]);
  
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
      
      {/* Both players */}
      <CharacterController 
        playerId="player1" 
        isControlled={playerId === "player1"}
        color="#3b82f6"
      />
      <CharacterController 
        playerId="player2" 
        isControlled={playerId === "player2"}
        color="#ef4444"
      />
    </>
  );
}

// Player 1 controls (WASD + Shift + Space)
const player1KeyboardMap = [
  { name: "forward", keys: ["KeyW"] },
  { name: "backward", keys: ["KeyS"] },
  { name: "left", keys: ["KeyA"] },
  { name: "right", keys: ["KeyD"] },
  { name: "run", keys: ["ShiftLeft"] },
  { name: "jump", keys: ["Space"] },
];

// Player 2 controls (Arrow keys + Right Shift + Enter)
const player2KeyboardMap = [
  { name: "forward", keys: ["ArrowUp"] },
  { name: "backward", keys: ["ArrowDown"] },
  { name: "left", keys: ["ArrowLeft"] },
  { name: "right", keys: ["ArrowRight"] },
  { name: "run", keys: ["ShiftRight"] },
  { name: "jump", keys: ["Enter"] },
];

export default function Game() {
  return (
    <div className="w-full h-screen flex bg-black">
      {/* Player 1 View - Left Side */}
      <div className="relative w-1/2 h-full">
        <KeyboardControls map={player1KeyboardMap}>
          <Canvas
            shadows
            camera={{ position: [3, 3, 3], near: 0.1, fov: 40 }}
            gl={{ antialias: true }}
          >
            <Suspense fallback={null}>
              <Physics debug={false}>
                <SharedScene playerId="player1" />
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
          Player 1 (WASD + Space)
        </div>
      </div>

      {/* Divider */}
      <div className="w-1 bg-white" />

      {/* Player 2 View - Right Side */}
      <div className="relative w-1/2 h-full">
        <KeyboardControls map={player2KeyboardMap}>
          <Canvas
            shadows
            camera={{ position: [3, 3, 3], near: 0.1, fov: 40 }}
            gl={{ antialias: true }}
          >
            <Suspense fallback={null}>
              <Physics debug={false}>
                <SharedScene playerId="player2" />
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
          Player 2 (Arrows + Enter)
        </div>
      </div>
    </div>
  );
}