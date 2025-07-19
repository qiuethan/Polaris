// components/Character.jsx
import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Character({ animation = "idle", color = "#ffffff", ...props }) {
  const group = useRef();
  const bodyRef = useRef();
  const headRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();
  const animationTime = useRef(0);
  
  // Create materials with the player color
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: color === "#3b82f6" ? "#e0f2ff" : "#ffe0e0", // Light blue or light red tint
    roughness: 0.8 
  });
  
  const whiteMaterial = new THREE.MeshStandardMaterial({ 
    color: "#ffffff",
    roughness: 0.9 
  });
  
  const blackMaterial = new THREE.MeshStandardMaterial({ 
    color: "#000000",
    roughness: 0.3 
  });
  
  useFrame((state, delta) => {
    if (!group.current) return;
    
    animationTime.current += delta;
    const t = animationTime.current;
    
    // Reset positions
    if (bodyRef.current) bodyRef.current.position.y = 0;
    if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
    if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
    if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
    if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
    
    // Apply animations based on state
    switch (animation) {
      case "idle":
        // Gentle breathing motion
        if (bodyRef.current) {
          bodyRef.current.scale.x = 1 + Math.sin(t * 2) * 0.02;
          bodyRef.current.scale.z = 1 + Math.sin(t * 2) * 0.02;
        }
        // Slight arm sway
        if (leftArmRef.current) leftArmRef.current.rotation.z = Math.sin(t * 1.5) * 0.05;
        if (rightArmRef.current) rightArmRef.current.rotation.z = -Math.sin(t * 1.5) * 0.05;
        break;
        
      case "walk":
        // Walking animation
        if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t * 5) * 0.5;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(t * 5) * 0.5;
        if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.sin(t * 5) * 0.5;
        if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(t * 5) * 0.5;
        // Bob motion
        if (bodyRef.current) bodyRef.current.position.y = Math.abs(Math.sin(t * 10)) * 0.05;
        break;
        
      case "run":
        // Running animation - faster and more pronounced
        if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t * 10) * 0.8;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(t * 10) * 0.8;
        if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.sin(t * 10) * 0.8;
        if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(t * 10) * 0.8;
        // Bounce motion
        if (bodyRef.current) bodyRef.current.position.y = Math.abs(Math.sin(t * 20)) * 0.1;
        // Slight body rotation
        if (group.current) group.current.rotation.z = Math.sin(t * 10) * 0.05;
        break;
        
      case "jump":
        // Jump animation
        if (leftArmRef.current) leftArmRef.current.rotation.z = 0.5;
        if (rightArmRef.current) rightArmRef.current.rotation.z = -0.5;
        if (leftLegRef.current) leftLegRef.current.rotation.x = -0.3;
        if (rightLegRef.current) rightLegRef.current.rotation.x = -0.3;
        break;
    }
  });
  
  return (
    <group ref={group} {...props}>
      {/* Body */}
      <group ref={bodyRef}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.5, 16, 16]} />
          <primitive object={bodyMaterial} />
        </mesh>
        
        {/* Belly */}
        <mesh position={[0, -0.1, 0.2]} castShadow receiveShadow>
          <sphereGeometry args={[0.35, 16, 16]} />
          <primitive object={whiteMaterial} />
        </mesh>
      </group>
      
      {/* Head */}
      <group ref={headRef} position={[0, 0.6, 0.1]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.3, 16, 16]} />
          <primitive object={bodyMaterial} />
        </mesh>
        
        {/* Snout */}
        <mesh position={[0, -0.05, 0.25]} castShadow receiveShadow>
          <sphereGeometry args={[0.15, 8, 8]} />
          <primitive object={whiteMaterial} />
        </mesh>
        
        {/* Nose */}
        <mesh position={[0, -0.05, 0.35]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <primitive object={blackMaterial} />
        </mesh>
        
        {/* Eyes */}
        <mesh position={[-0.1, 0.05, 0.25]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <primitive object={blackMaterial} />
        </mesh>
        <mesh position={[0.1, 0.05, 0.25]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <primitive object={blackMaterial} />
        </mesh>
        
        {/* Ears */}
        <mesh position={[-0.15, 0.2, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.08, 8, 8]} />
          <primitive object={bodyMaterial} />
        </mesh>
        <mesh position={[0.15, 0.2, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.08, 8, 8]} />
          <primitive object={bodyMaterial} />
        </mesh>
      </group>
      
      {/* Left Arm */}
      <group ref={leftArmRef} position={[-0.4, 0.2, 0]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.12, 0.3, 8, 16]} />
          <primitive object={bodyMaterial} />
        </mesh>
        {/* Paw */}
        <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.13, 8, 8]} />
          <primitive object={bodyMaterial} />
        </mesh>
      </group>
      
      {/* Right Arm */}
      <group ref={rightArmRef} position={[0.4, 0.2, 0]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.12, 0.3, 8, 16]} />
          <primitive object={bodyMaterial} />
        </mesh>
        {/* Paw */}
        <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.13, 8, 8]} />
          <primitive object={bodyMaterial} />
        </mesh>
      </group>
      
      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.2, -0.4, 0]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.13, 0.25, 8, 16]} />
          <primitive object={bodyMaterial} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.14, 8, 8]} />
          <primitive object={bodyMaterial} />
        </mesh>
      </group>
      
      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.2, -0.4, 0]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.13, 0.25, 8, 16]} />
          <primitive object={bodyMaterial} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.14, 8, 8]} />
          <primitive object={bodyMaterial} />
        </mesh>
      </group>
      
      {/* Tail */}
      <mesh position={[0, -0.2, -0.4]} rotation={[0.3, 0, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.1, 8, 8]} />
        <primitive object={whiteMaterial} />
      </mesh>
    </group>
  );
}

// No preload needed since we're not loading external files
export default Character;