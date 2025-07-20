import React, { useMemo, useState, useEffect } from "react";
import { useControls } from "leva";
import * as THREE from "three";
import { GameState } from "./Game";
import { JumpBarrier } from "./JumpBarrier";
import { RampBarrier } from "./RampBarrier";

// Obstacle Course Manager with Enhanced Finish Detection and 3 Obstacle Types
export function ObstacleCourse({ onGameWin }) {
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  
  const { 
    OBSTACLE_START,
    OBSTACLE_SPACING,
    OBSTACLE_COUNT,
    SHOW_OBSTACLES,
    LANE_SEPARATION,
    RESET_GAME
  } = useControls("Obstacles", {
    OBSTACLE_START: { value: -14, min: -20, max: 5, step: 0.5, label: "Start Distance" },
    OBSTACLE_SPACING: { value: 2, min: 1, max: 10, step: 0.5, label: "Spacing" },
    OBSTACLE_COUNT: { value: 8, min: 5, max: 30, step: 1, label: "Number" },
    SHOW_OBSTACLES: { value: true, label: "Show Obstacles" },
    LANE_SEPARATION: { value: 1, min: 0.5, max: 3, step: 0.1, label: "Lane Width" },
    RESET_GAME: { value: false, label: "Reset Race" }
  });
  
  // Reset game when button is pressed
  useEffect(() => {
    if (RESET_GAME) {
      setGameEnded(false);
      setWinner(null);
      // Reset player positions
      if (GameState.player1) {
        GameState.player1.position.set(-LANE_SEPARATION/2, 5, -10);
      }
      if (GameState.player2) {
        GameState.player2.position.set(LANE_SEPARATION/2, 5, -10);
      }
    }
  }, [RESET_GAME, LANE_SEPARATION]);
  
  // Handle player finishing - immediate and definitive
  const handlePlayerFinish = (playerId) => {
    if (gameEnded) return; // Prevent multiple calls
    
    console.log(`🏁 RACE FINISHED! ${playerId} WINS!`);
    setGameEnded(true);
    setWinner(playerId);
    
    // Immediate callback to end the game
    setTimeout(() => {
      if (onGameWin) {
        onGameWin(playerId);
      }
    }, 1500); // Slightly longer delay to show victory effect
  };
  
  // Generate obstacle positions with better variety including ramps
  const obstacles = useMemo(() => {
    const obstacleList = [];
    
    const lane1X = -LANE_SEPARATION/2;
    const lane2X = LANE_SEPARATION/2;
    
    for (let i = 0; i < OBSTACLE_COUNT; i++) {
      const z = OBSTACLE_START + (i * OBSTACLE_SPACING);
      
      // More varied obstacle patterns with 3 types: jump, duck, ramp
      const pattern = i % 9; // Increased patterns for 3 obstacle types
      
      if (pattern === 0 || pattern === 3 || pattern === 6) {
        // Both lanes have jump obstacles
        obstacleList.push({
          type: "jump",
          position: [0, 0.2, z],
          laneOffset: lane1X,
          id: `jump-p1-${i}`
        });
        obstacleList.push({
          type: "jump",
          position: [0, 0.2, z],
          laneOffset: lane2X,
          id: `jump-p2-${i}`
        });
      } else if (pattern === 1 || pattern === 4 || pattern === 7) {
        // Both lanes have duck obstacles
        obstacleList.push({
          type: "duck",
          position: [0, 0, z],
          laneOffset: lane1X,
          id: `duck-p1-${i}`
        });
        obstacleList.push({
          type: "duck",
          position: [0, 0, z],
          laneOffset: lane2X,
          id: `duck-p2-${i}`
        });
      } else if (pattern === 2 || pattern === 5 || pattern === 8) {
        // Both lanes have ramp obstacles
        obstacleList.push({
          type: "ramp",
          position: [0, 0, z],
          laneOffset: lane1X,
          id: `ramp-p1-${i}`
        });
        obstacleList.push({
          type: "ramp",
          position: [0, 0, z],
          laneOffset: lane2X,
          id: `ramp-p2-${i}`
        });
      }
      
      // Occasional mixed patterns for variety
      if (i % 10 === 9) {
        // Mix: duck in lane 1, jump in lane 2
        obstacleList.push({
          type: "duck",
          position: [0, 0, z + OBSTACLE_SPACING * 0.5],
          laneOffset: lane1X,
          id: `duck-mix-p1-${i}`
        });
        obstacleList.push({
          type: "jump",
          position: [0, 0.2, z + OBSTACLE_SPACING * 0.5],
          laneOffset: lane2X,
          id: `jump-mix-p2-${i}`
        });
      }
    }
    
    return obstacleList;
  }, [OBSTACLE_COUNT, OBSTACLE_START, OBSTACLE_SPACING, LANE_SEPARATION]);
  
  // Calculate finish line position
  const finishLineZ = OBSTACLE_START + (OBSTACLE_COUNT * OBSTACLE_SPACING) + 3;
  
  if (!SHOW_OBSTACLES) return null;
  
  return (
    <group>
      {/* Enhanced lane guides */}
      <mesh position={[-LANE_SEPARATION/2, 0.02, finishLineZ / 2]}>
        <boxGeometry args={[0.08, 0.02, finishLineZ + 15]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[LANE_SEPARATION/2, 0.02, finishLineZ / 2]}>
        <boxGeometry args={[0.08, 0.02, finishLineZ + 15]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.1} />
      </mesh>
      
      {/* Enhanced start line */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[LANE_SEPARATION * 2.5, 0.03, 0.3]} />
          <meshStandardMaterial color="#00FF00" emissive="#00FF00" emissiveIntensity={0.3} />
        </mesh>
        
        {/* Start line posts with flags */}
        <mesh position={[-LANE_SEPARATION * 1.5, 1, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 2]} />
          <meshStandardMaterial color="#00FF00" />
        </mesh>
        <mesh position={[LANE_SEPARATION * 1.5, 1, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 2]} />
          <meshStandardMaterial color="#00FF00" />
        </mesh>
        
        {/* Start flags */}
        <mesh position={[-LANE_SEPARATION * 1.5, 1.7, 0.1]}>
          <planeGeometry args={[0.4, 0.3]} />
          <meshStandardMaterial color="#00FF00" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[LANE_SEPARATION * 1.5, 1.7, 0.1]}>
          <planeGeometry args={[0.4, 0.3]} />
          <meshStandardMaterial color="#00FF00" side={THREE.DoubleSide} />
        </mesh>
      </group>
      
      {/* Obstacles with enhanced appearance and 3 types */}
      {obstacles.map((obstacle) => {
        switch (obstacle.type) {
          case "jump":
            return (
              <JumpBarrier 
                key={obstacle.id}
                position={obstacle.position}
                laneOffset={obstacle.laneOffset}
                color="#8B4513"
                height={0.6}
                width={0.8}
              />
            );
          case "duck":
            return (
              <JumpBarrier 
                key={obstacle.id}
                position={obstacle.position}
                laneOffset={obstacle.laneOffset}
                color="#8B4513"
                height={0.3}
                width={0.8}
              />
            );
          case "ramp":
            return (
              <JumpBarrier 
                key={obstacle.id}
                position={obstacle.position}
                laneOffset={obstacle.laneOffset}
                color="#8B4513"
                height={0.9}
                width={0.8}
              />
            );
          default:
            return null;
        }
      })}
      
    
      {/* Game status overlay */}
      {gameEnded && winner && (
        <group position={[0, 8, finishLineZ - 5]}>
          <mesh>
            <planeGeometry args={[10, 3]} />
            <meshBasicMaterial 
              color="#000000" 
              transparent 
              opacity={0.9} 
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0.5, 0.01]}>
            <planeGeometry args={[8, 1.5]} />
            <meshBasicMaterial 
              color={winner === "player1" ? "#3b82f6" : "#ef4444"}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, -0.5, 0.01]}>
            <planeGeometry args={[6, 0.8]} />
            <meshBasicMaterial 
              color="#FFD700"
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default ObstacleCourse;