import React from "react";
import { RigidBody } from "@react-three/rapier";
import { useGLTF } from "@react-three/drei";

// Ramp Barrier - Load 3D model or fallback to procedural
export function RampBarrier({ position, laneOffset = 0, color = "#A0522D", height = 0.5, width = 1.2, length = 2.0 }) {
  // Try to load a ramp model - fallback to procedural if not found
  let model;
  try {
    model = useGLTF('/models/ramp.glb');
  } catch (error) {
    console.log("Ramp model not found, using procedural ramp");
    model = null;
  }

  return (
    <RigidBody type="fixed" position={[position[0] + laneOffset, position[1], position[2]]}>
      <group>
        {model && model.scene ? (
          // Use the loaded GLB model
          <primitive 
            object={model.scene.clone()} 
            scale={[width * 0.5, height * 0.5, length * 0.5]} // Much smaller scale
            castShadow 
            receiveShadow
          />
        ) : (
          // Fallback to procedural ramp if GLB not available
          <>
            {/* Main ramp structure */}
            <mesh 
              position={[0, height/2, 0]} 
              rotation={[-Math.PI * 0.05, 0, 0]} // Slight upward angle
              castShadow 
              receiveShadow
            >
              <boxGeometry args={[width, height, length]} />
              <meshStandardMaterial 
                color={color}
                roughness={0.8}
                metalness={0.1}
                emissive="#4A2C17"
                emissiveIntensity={0.05}
              />
            </mesh>
            
            {/* Ramp support structure underneath */}
            <mesh position={[0, height/4, length/4]} castShadow receiveShadow>
              <boxGeometry args={[width * 0.8, height/2, 0.2]} />
              <meshStandardMaterial 
                color="#654321" 
                roughness={0.9}
                metalness={0}
              />
            </mesh>
            
            {/* Side rails for safety */}
            <mesh position={[-width/2, height * 0.75, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.1, height/2, length]} />
              <meshStandardMaterial 
                color="#2F1B14" 
                roughness={0.95}
                metalness={0}
              />
            </mesh>
            <mesh position={[width/2, height * 0.75, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.1, height/2, length]} />
              <meshStandardMaterial 
                color="#2F1B14" 
                roughness={0.95}
                metalness={0}
              />
            </mesh>
            
            {/* Anti-slip texture strips */}
            {Array.from({ length: 4 }, (_, i) => (
              <mesh 
                key={i} 
                position={[0, height + 0.01, (i - 1.5) * (length/4)]}
                rotation={[-Math.PI * 0.05, 0, 0]}
              >
                <boxGeometry args={[width * 0.9, 0.02, 0.1]} />
                <meshStandardMaterial 
                  color="#FFD700" 
                  emissive="#FFD700"
                  emissiveIntensity={0.2}
                  metalness={0.8}
                  roughness={0.3}
                />
              </mesh>
            ))}
            
            {/* Warning signs on the sides */}
            <mesh position={[-width/2 - 0.05, height, 0]}>
              <planeGeometry args={[0.3, 0.2]} />
              <meshBasicMaterial 
                color="#FF4500" 
                transparent 
                opacity={0.8}
              />
            </mesh>
            <mesh position={[width/2 + 0.05, height, 0]}>
              <planeGeometry args={[0.3, 0.2]} />
              <meshBasicMaterial 
                color="#FF4500" 
                transparent 
                opacity={0.8}
              />
            </mesh>
          </>
        )}
        
        {/* Collision geometry that matches the visual ramp */}
        <mesh 
          visible={false} 
          position={[0, height/2, 0]} 
          rotation={[-Math.PI * 0.05, 0, 0]}
        >
          <boxGeometry args={[width, height, length]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </group>
    </RigidBody>
  );
}