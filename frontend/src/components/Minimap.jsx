// components/Minimap.jsx
import {
    Environment,
    Gltf,
    PerspectiveCamera,
  } from "@react-three/drei";
  import { useFrame } from "@react-three/fiber";
  import { useControls } from "leva";
  import { useRef } from "react";
  import { Vector3 } from "three";
  import { useSnapshot } from "valtio";
  import { GameState } from "./Game";
  
  export const maps = {
    castle_on_hills: {
      scale: 3,
      position: [-6, -7, 0],
    },
    animal_crossing_map: {
      scale: 20,
      position: [-15, -1, 10],
    },
    city_scene_tokyo: {
      scale: 0.72,
      position: [0, -1, -3.5],
    },
    de_dust_2_with_real_light: {
      scale: 0.3,
      position: [-5, -3, 13],
    },
    medieval_fantasy_book: {
      scale: 0.4,
      position: [-4, 0, -6],
    },
  };
  
  const tmpVector = new Vector3();
  
  export const Minimap = ({ playerId }) => {
    const gameState = useSnapshot(GameState);
    const { map, player1, player2 } = gameState;
    
    const { autorotateCamera, zoomLevel } = useControls("Minimap 🗺️", {
      autorotateCamera: true,
      zoomLevel: {
        min: 1,
        max: 30,
        value: 12,
      },
    });
    
    const player1Ref = useRef();
    const player2Ref = useRef();
    
    // Get the current player's data
    const currentPlayer = playerId === "player1" ? player1 : player2;
    
    useFrame(({ camera }) => {
      // Center camera on current player
      if (currentPlayer && currentPlayer.position) {
        tmpVector.set(
          currentPlayer.position.x,
          currentPlayer.position.y + zoomLevel,
          currentPlayer.position.z
        );
        camera.position.copy(tmpVector);
        
        tmpVector.set(
          currentPlayer.position.x,
          currentPlayer.position.y,
          currentPlayer.position.z
        );
        camera.lookAt(tmpVector);
        
        // Apply rotation if autorotate is enabled
        if (autorotateCamera) {
          camera.rotation.z = currentPlayer.rotation || 0;
        } else {
          camera.rotation.z = 0;
        }
      }
      
      // Update player 1 indicator
      if (player1Ref.current && player1.position) {
        player1Ref.current.position.set(
          player1.position.x,
          0.1,
          player1.position.z
        );
        // Make the arrow point in the direction the player is facing
        if (autorotateCamera) {
          player1Ref.current.rotation.y = player1.rotation - currentPlayer.rotation;
        } else {
          player1Ref.current.rotation.y = player1.rotation;
        }
      }
      
      // Update player 2 indicator
      if (player2Ref.current && player2.position) {
        player2Ref.current.position.set(
          player2.position.x,
          0.1,
          player2.position.z
        );
        // Make the arrow point in the direction the player is facing
        if (autorotateCamera) {
          player2Ref.current.rotation.y = player2.rotation - currentPlayer.rotation;
        } else {
          player2Ref.current.rotation.y = player2.rotation;
        }
      }
    });
    
    return (
      <>
        <color attach={"background"} args={["#ececec"]} />
        <ambientLight intensity={3} />
        <Environment preset="sunset" />
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        
        {/* Player 1 Indicator */}
        <group ref={player1Ref}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.5, 0.7, 32]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
          {/* Direction arrow */}
          <mesh position={[0, 0, 0.5]} rotation-x={Math.PI / 2}>
            <coneGeometry args={[0.2, 0.4, 3]} />
            <meshBasicMaterial color="#1e40af" />
          </mesh>
          {/* Center dot */}
          <mesh position-y={0.01} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.3, 32]} />
            <meshBasicMaterial color="#60a5fa" />
          </mesh>
        </group>
        
        {/* Player 2 Indicator */}
        <group ref={player2Ref}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.5, 0.7, 32]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          {/* Direction arrow */}
          <mesh position={[0, 0, 0.5]} rotation-x={Math.PI / 2}>
            <coneGeometry args={[0.2, 0.4, 3]} />
            <meshBasicMaterial color="#991b1b" />
          </mesh>
          {/* Center dot */}
          <mesh position-y={0.01} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.3, 32]} />
            <meshBasicMaterial color="#f87171" />
          </mesh>
        </group>
        
        {/* Map */}
        <Gltf
          scale={maps[map].scale}
          position={maps[map].position}
          src={`/models/${map}.glb`}
        />
      </>
    );
  };