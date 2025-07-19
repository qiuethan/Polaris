// components/PositionDisplay.jsx
import React from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useSnapshot } from "valtio";
import { GameState } from "./Game";
import { useControls } from "leva";

export function PositionDisplay({ playerId }) {
  const gameState = useSnapshot(GameState);
  const player = gameState[playerId];
  
  const { SHOW_POSITION } = useControls("Debug Info", {
    SHOW_POSITION: { value: true, label: "Show Position Info" }
  });
  
  if (!SHOW_POSITION || !player?.position) return null;
  
  return (
    <Html
      position={[0, 10, 0]}
      center
      style={{
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '14px',
        fontFamily: 'monospace',
        userSelect: 'text',
        pointerEvents: 'none'
      }}
    >
      <div>
        <strong>{playerId} Position:</strong><br/>
        X: {player.position.x.toFixed(2)}<br/>
        Y: {player.position.y.toFixed(2)}<br/>
        Z: {player.position.z.toFixed(2)}<br/>
        {player.pathProgress !== undefined && (
          <>Progress: {(player.pathProgress * 100).toFixed(1)}%</>
        )}
      </div>
    </Html>
  );
}