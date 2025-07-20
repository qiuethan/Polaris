import React, { useMemo, useState, useEffect } from "react";
import { useControls } from "leva";
import * as THREE from "three";
import { GameState } from "./Game";
import { JumpBarrier } from "./JumpBarrier";

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
    OBSTACLE_START: { value: -10, min: -30, max: 15, step: 0.5, label: "Start Distance" },
    OBSTACLE_SPACING: { value: 2.5, min: 2, max: 10, step: 0.5, label: "Spacing" },
    OBSTACLE_COUNT: { value: 4, min: 4, max: 8, step: 1, label: "Number" },
    SHOW_OBSTACLES: { value: true, label: "Show Obstacles" },
    LANE_SEPARATION: { value: 1, min: 0.5, max: 3, step: 0.1, label: "Lane Width" },
    RESET_GAME: { value: false, label: "Reset Race" }
  });
  
  // Reset game when button is pressed
  useEffect(() => {
    if (RESET_GAME) {
      console.log(`🔄 Manual reset triggered via Leva controls`);
      setGameEnded(false);
      setWinner(null);
      // Reset player positions
      if (GameState.player1) {
        GameState.player1.position.set(-LANE_SEPARATION/2, 5, -15);
        console.log(`🔵 Player 1 manually reset to:`, GameState.player1.position);
      }
      if (GameState.player2) {
        GameState.player2.position.set(LANE_SEPARATION/2, 5, -15);
        console.log(`🔴 Player 2 manually reset to:`, GameState.player2.position);
      }
      // Reset game status
      GameState.gameStatus.isFinished = false;
      GameState.gameStatus.winner = null;
      console.log(`✅ Manual game reset complete`);
    }
  }, [RESET_GAME, LANE_SEPARATION]);
  
  // Handle player finishing - immediate and definitive
  const handlePlayerFinish = (playerId) => {
    if (gameEnded) return; // Prevent multiple calls
    
    console.log(`🏁 RACE FINISHED! ${playerId} WINS!`);
    console.log(`🔍 onGameWin callback available:`, !!onGameWin);
    setGameEnded(true);
    setWinner(playerId);
    
    // Immediately call onGameWin to show stats screen
    console.log(`🎮 Calling onGameWin with ${playerId}...`);
    if (onGameWin) {
      onGameWin(playerId);
    } else {
      console.error("❌ onGameWin callback not available!");
    }
  };
  
  // Generate obstacle positions with better variety including ramps
  const obstacles = useMemo(() => {
    const obstacleList = [];
    
    const lane1X = -LANE_SEPARATION/2;
    const lane2X = LANE_SEPARATION/2;
    
    // Fixed positions: closer spacing starting at -10
    const obstaclePositions = [-10, -7, -4, -1];
    const obstacleTypes = ["duck", "jump", "duck", "jump"];
    
    for (let i = 0; i < Math.min(OBSTACLE_COUNT, obstaclePositions.length); i++) {
      const z = obstaclePositions[i];
      const obstacleType = obstacleTypes[i];
      
      // Both lanes have the same obstacle type
      obstacleList.push({
        type: obstacleType,
        position: [0, obstacleType === "jump" ? 0.2 : 0, z],
        laneOffset: lane1X,
        id: `${obstacleType}-p1-${i}`
      });
      obstacleList.push({
        type: obstacleType,
        position: [0, obstacleType === "jump" ? 0.2 : 0, z],
        laneOffset: lane2X,
        id: `${obstacleType}-p2-${i}`
      });
    }
    
    return obstacleList;
  }, [OBSTACLE_COUNT, OBSTACLE_START, OBSTACLE_SPACING, LANE_SEPARATION]);
  
  // Calculate finish line position - moved closer after last obstacle
  const finishLineZ = 5;
  
  // Finish line detection logic
  useEffect(() => {
    if (gameEnded) return; // Don't check if game already ended
    
    const checkFinishLine = () => {
      // Check if either player has crossed the finish line
      const player1Z = GameState.player1?.position?.z || -999;
      const player2Z = GameState.player2?.position?.z || -999;
      
      // Debug player positions occasionally
      if (Math.random() < 0.01) { // Log 1% of the time
        console.log(`🏁 [Finish Check] P1: Z=${player1Z.toFixed(2)}, P2: Z=${player2Z.toFixed(2)}, Finish: Z=${finishLineZ}`);
      }
      
      // Check if player 1 crossed the finish line (trigger slightly before the visual line)
      if (player1Z >= finishLineZ - 0.5) {
        console.log(`🏆 Player 1 crossed finish line! Z=${player1Z.toFixed(2)} >= ${finishLineZ - 0.5} (finish at ${finishLineZ})`);
        handlePlayerFinish("player1");
        return;
      }
      
      // Check if player 2 crossed the finish line (trigger slightly before the visual line)
      if (player2Z >= finishLineZ - 0.5) {
        console.log(`🏆 Player 2 crossed finish line! Z=${player2Z.toFixed(2)} >= ${finishLineZ - 0.5} (finish at ${finishLineZ})`);
        handlePlayerFinish("player2");
        return;
      }
    };
    
    // Check finish line every frame
    const intervalId = setInterval(checkFinishLine, 16); // ~60fps checking
    
    return () => clearInterval(intervalId);
  }, [gameEnded, finishLineZ]);
  
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
                height={0.2}
                width={0.8}
                rotation={Math.PI}
              />
            );
          case "duck":
            return (
              <JumpBarrier 
                key={obstacle.id}
                position={[obstacle.position[0], obstacle.position[1] - 0.4, obstacle.position[2]]}
                laneOffset={obstacle.laneOffset}
                color="#FF6B35"
                height={1.8}
                width={0.8}
                rotation={Math.PI}
              />
            );
          default:
            return null;
        }
      })}
      
      {/* Finish Line */}
      <group position={[0, 0, finishLineZ]}>
        {/* Finish line ground marker */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[LANE_SEPARATION * 2.5, 0.05, 0.4]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.4} />
        </mesh>
        
        {/* Finish line poles */}
        <mesh position={[-LANE_SEPARATION * 1.2, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 3]} />
          <meshStandardMaterial color="#FFD700" metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh position={[LANE_SEPARATION * 1.2, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 3]} />
          <meshStandardMaterial color="#FFD700" metalness={0.3} roughness={0.7} />
        </mesh>
        
        {/* Finish line banner */}
        <mesh position={[0, 2.8, 0]}>
          <boxGeometry args={[LANE_SEPARATION * 2.4, 0.6, 0.02]} />
          <meshStandardMaterial color="#FFD700" side={THREE.DoubleSide} />
        </mesh>
        
        {/* Finish line text on banner */}
        <mesh position={[0, 2.8, 0.02]}>
          <planeGeometry args={[LANE_SEPARATION * 2.2, 0.4]} />
          <meshStandardMaterial color="#FF0000" side={THREE.DoubleSide} />
        </mesh>
      </group>
    
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