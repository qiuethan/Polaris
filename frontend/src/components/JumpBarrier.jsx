import React from "react";
import { RigidBody } from "@react-three/rapier";
import { useGLTF } from "@react-three/drei";

// GLB Jump Barrier - Load 3D model
export function JumpBarrier({ position, laneOffset = 0, color = "#8B4513", height = 0.6, width = 1.0, rotation = 0 }) {
  // Try to load a fence/barrier model - fallback to procedural if not found
  let model;
  try {
    model = useGLTF('/models/ice_clusters.glb');
  } catch (error) {
    console.log("Fence model not found, using procedural barrier");
    model = null;
  }

  return (
    <RigidBody type="fixed" position={[position[0] + laneOffset, position[1], position[2]]}>
      <group rotation={[0, rotation, 0]}>
        {model && model.scene ? (
          // Use the loaded GLB model
          <primitive 
            object={model.scene.clone()} 
            scale={[width, height, 1]} 
            castShadow 
            receiveShadow
          />
        ) : (
          // Fallback to enhanced procedural barrier if GLB not available
          <>
            {/* Main wooden barrier with enhanced texture */}
            <mesh castShadow receiveShadow position={[0, height/2, 0]}>
              <boxGeometry args={[width, height, 0.2]} />
              <meshStandardMaterial 
                color="#8B4513"
                roughness={0.95}
                metalness={0}
                normalScale={[2.0, 2.0]}
                emissive="#2D1810"
                emissiveIntensity={0.05}
              />
            </mesh>
            
            {/* Support posts with weathered wood texture */}
            <mesh position={[-width/2 + 0.1, height/2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.05, 0.05, height]} />
              <meshStandardMaterial 
                color="#654321" 
                roughness={0.98}
                metalness={0}
                emissive="#1A0E08"
                emissiveIntensity={0.03}
              />
            </mesh>
            <mesh position={[width/2 - 0.1, height/2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.05, 0.05, height]} />
              <meshStandardMaterial 
                color="#654321" 
                roughness={0.98}
                metalness={0}
                emissive="#1A0E08"
                emissiveIntensity={0.03}
              />
            </mesh>
            
            {/* Metal reinforcement strips */}
            <mesh position={[0, height/2, 0.11]}>
              <boxGeometry args={[width * 0.9, 0.05, 0.01]} />
              <meshStandardMaterial 
                color="#444444" 
                metalness={0.9} 
                roughness={0.1}
                emissive="#111111"
                emissiveIntensity={0.1}
                envMapIntensity={1.5}
              />
            </mesh>
            <mesh position={[0, height/2 - 0.2, 0.11]}>
              <boxGeometry args={[width * 0.9, 0.05, 0.01]} />
              <meshStandardMaterial 
                color="#444444" 
                metalness={0.9} 
                roughness={0.1}
                emissive="#111111"
                emissiveIntensity={0.1}
                envMapIntensity={1.5}
              />
            </mesh>
          </>
        )}
        
        {/* Invisible collision box to ensure consistent physics regardless of model complexity */}
        <mesh visible={false}>
          <boxGeometry args={[width, height, 0.2]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </group>
    </RigidBody>
  );
}