// components/Character.jsx - ADORABLE POLAR BEAR EDITION! 🐻‍❄️
import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Character({ animation = "idle", color = "#ffffff", isCrouching = false, leftArmAction = null, rightArmAction = null, ...props }) {
  console.log(`🐻 Character rendering: animation=${animation}, color=${color}, crouching=${isCrouching}`);
  const group = useRef();
  const bodyRef = useRef();
  const headRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();
  const tailRef = useRef();
  const scarfRef = useRef();
  const leftEarRef = useRef();
  const rightEarRef = useRef();
  const leftEyeRef = useRef();
  const rightEyeRef = useRef();
  const animationTime = useRef(0);
  
  // Adorable polar bear materials
  const furMaterial = new THREE.MeshStandardMaterial({ 
    color: "#fefefe", // Pure white fluffy fur
    roughness: 0.9,
    metalness: 0.0
  });
  
  const innerMaterial = new THREE.MeshStandardMaterial({ 
    color: "#fff5f5", // Slightly pink inner
    roughness: 0.95 
  });
  
  const noseMaterial = new THREE.MeshStandardMaterial({ 
    color: "#1a1a1a",
    roughness: 0.3,
    metalness: 0.1
  });
  
  const eyeMaterial = new THREE.MeshStandardMaterial({ 
    color: "#000000",
    roughness: 0.1,
    metalness: 0.8
  });
  
  // Scarf colors based on player
  const scarfMaterial = new THREE.MeshStandardMaterial({ 
    color: color === "#3b82f6" ? "#2563eb" : "#dc2626", // Bright blue or red
    roughness: 0.7,
    metalness: 0.0
  });
  
  const scarfStripeMaterial = new THREE.MeshStandardMaterial({ 
    color: "#ffffff",
    roughness: 0.7,
    metalness: 0.0
  });
  
  useFrame((state, delta) => {
    if (!group.current) return;
    
    animationTime.current += delta;
    const t = animationTime.current;
    
    // Reset all positions and rotations
    if (bodyRef.current) {
      bodyRef.current.position.set(0, 0, 0);
      bodyRef.current.rotation.set(0, 0, 0);
      bodyRef.current.scale.set(1, 1, 1);
    }
    if (headRef.current) {
      headRef.current.position.set(0, 0.8, 0.15);
      headRef.current.rotation.set(0, 0, 0);
    }
    if (leftArmRef.current) leftArmRef.current.rotation.set(0, 0, 0);
    if (rightArmRef.current) rightArmRef.current.rotation.set(0, 0, 0);
    if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
    if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);
    if (tailRef.current) tailRef.current.rotation.set(0.3, 0, 0);
    if (scarfRef.current) scarfRef.current.rotation.set(0, 0, 0);
    
    // Crouching modifications
    if (isCrouching) {
      if (bodyRef.current) {
        bodyRef.current.position.y = -0.3;
        bodyRef.current.scale.y = 0.7;
        bodyRef.current.scale.x = 1.2;
        bodyRef.current.scale.z = 1.2;
      }
      if (headRef.current) {
        headRef.current.position.y = 0.4;
        headRef.current.rotation.x = 0.3;
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.8;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.8;
    }
    
    // Individual arm actions
    if (leftArmAction === "wave") {
      if (leftArmRef.current) {
        leftArmRef.current.rotation.z = 0.8 + Math.sin(t * 8) * 0.4;
        leftArmRef.current.rotation.x = Math.sin(t * 8) * 0.2;
      }
    } else if (leftArmAction === "point") {
      if (leftArmRef.current) {
        leftArmRef.current.rotation.z = 0.5;
        leftArmRef.current.rotation.x = -0.3;
      }
    } else if (leftArmAction === "thumbsup") {
      if (leftArmRef.current) {
        leftArmRef.current.rotation.z = 0.3;
        leftArmRef.current.rotation.x = -0.5;
      }
    }
    
    if (rightArmAction === "wave") {
      if (rightArmRef.current) {
        rightArmRef.current.rotation.z = -0.8 - Math.sin(t * 8) * 0.4;
        rightArmRef.current.rotation.x = Math.sin(t * 8) * 0.2;
      }
    } else if (rightArmAction === "point") {
      if (rightArmRef.current) {
        rightArmRef.current.rotation.z = -0.5;
        rightArmRef.current.rotation.x = -0.3;
      }
    } else if (rightArmAction === "thumbsup") {
      if (rightArmRef.current) {
        rightArmRef.current.rotation.z = -0.3;
        rightArmRef.current.rotation.x = -0.5;
      }
    }
    
    // Base animations (only if no individual arm actions)
    switch (animation) {
      case "idle":
        // Adorable breathing
        if (bodyRef.current && !isCrouching) {
          bodyRef.current.scale.x = 1 + Math.sin(t * 2) * 0.03;
          bodyRef.current.scale.z = 1 + Math.sin(t * 2) * 0.03;
        }
        
        // Head slight bob
        if (headRef.current) {
          headRef.current.position.y = (isCrouching ? 0.4 : 0.8) + Math.sin(t * 1.5) * 0.02;
          headRef.current.rotation.y = Math.sin(t * 0.8) * 0.05;
        }
        
        // Ears wiggle
        if (leftEarRef.current) leftEarRef.current.rotation.z = Math.sin(t * 3) * 0.1;
        if (rightEarRef.current) rightEarRef.current.rotation.z = -Math.sin(t * 3 + 0.5) * 0.1;
        
        // Tail wag
        if (tailRef.current) {
          tailRef.current.rotation.y = Math.sin(t * 2) * 0.3;
        }
        
        // Gentle arm sway (if no individual actions)
        if (!leftArmAction && leftArmRef.current) {
          leftArmRef.current.rotation.z = Math.sin(t * 1.2) * 0.08;
        }
        if (!rightArmAction && rightArmRef.current) {
          rightArmRef.current.rotation.z = -Math.sin(t * 1.2 + 0.3) * 0.08;
        }
        
        // Scarf gentle sway
        if (scarfRef.current) {
          scarfRef.current.rotation.y = Math.sin(t * 1.5) * 0.05;
        }
        break;
        
      case "walk":
        // Cute waddle walk
        if (bodyRef.current && !isCrouching) {
          bodyRef.current.rotation.z = Math.sin(t * 6) * 0.08;
          bodyRef.current.position.y = Math.abs(Math.sin(t * 12)) * 0.08;
        }
        
        // Head bob with walking
        if (headRef.current) {
          headRef.current.position.y = (isCrouching ? 0.4 : 0.8) + Math.sin(t * 12) * 0.06;
          headRef.current.rotation.x = Math.sin(t * 6) * 0.05;
        }
        
        // Arms swing (if no individual actions)
        if (!leftArmAction && leftArmRef.current) {
          leftArmRef.current.rotation.x = Math.sin(t * 6) * 0.6;
          leftArmRef.current.rotation.z = Math.sin(t * 6) * 0.1;
        }
        if (!rightArmAction && rightArmRef.current) {
          rightArmRef.current.rotation.x = -Math.sin(t * 6) * 0.6;
          rightArmRef.current.rotation.z = -Math.sin(t * 6) * 0.1;
        }
        
        // Legs waddle
        if (leftLegRef.current) {
          leftLegRef.current.rotation.x = (isCrouching ? 0.8 : 0) + (-Math.sin(t * 6) * 0.4);
        }
        if (rightLegRef.current) {
          rightLegRef.current.rotation.x = (isCrouching ? 0.8 : 0) + (Math.sin(t * 6) * 0.4);
        }
        
        // Tail bounce
        if (tailRef.current) {
          tailRef.current.rotation.y = Math.sin(t * 6) * 0.2;
          tailRef.current.rotation.x = 0.3 + Math.sin(t * 12) * 0.1;
        }
        
        // Scarf flutter
        if (scarfRef.current) {
          scarfRef.current.rotation.y = Math.sin(t * 8) * 0.1;
          scarfRef.current.rotation.z = Math.sin(t * 6) * 0.05;
        }
        break;
        
      case "run":
        // Energetic running
        if (bodyRef.current && !isCrouching) {
          bodyRef.current.rotation.z = Math.sin(t * 12) * 0.15;
          bodyRef.current.position.y = Math.abs(Math.sin(t * 24)) * 0.15;
          bodyRef.current.rotation.x = -0.1; // Lean forward
        }
        
        // Head determined look
        if (headRef.current) {
          headRef.current.position.y = (isCrouching ? 0.4 : 0.8) + Math.sin(t * 24) * 0.1;
          headRef.current.rotation.x = -0.1 + Math.sin(t * 12) * 0.08;
        }
        
        // Fast arm pumping (if no individual actions)
        if (!leftArmAction && leftArmRef.current) {
          leftArmRef.current.rotation.x = Math.sin(t * 12) * 1.0;
          leftArmRef.current.rotation.z = Math.sin(t * 12) * 0.2;
        }
        if (!rightArmAction && rightArmRef.current) {
          rightArmRef.current.rotation.x = -Math.sin(t * 12) * 1.0;
          rightArmRef.current.rotation.z = -Math.sin(t * 12) * 0.2;
        }
        
        // Fast leg movement
        if (leftLegRef.current) {
          leftLegRef.current.rotation.x = (isCrouching ? 0.8 : 0) + (-Math.sin(t * 12) * 0.8);
        }
        if (rightLegRef.current) {
          rightLegRef.current.rotation.x = (isCrouching ? 0.8 : 0) + (Math.sin(t * 12) * 0.8);
        }
        
        // Excited tail
        if (tailRef.current) {
          tailRef.current.rotation.y = Math.sin(t * 16) * 0.4;
          tailRef.current.rotation.x = 0.3 + Math.sin(t * 20) * 0.2;
        }
        
        // Scarf flying
        if (scarfRef.current) {
          scarfRef.current.rotation.y = Math.sin(t * 15) * 0.3;
          scarfRef.current.rotation.z = Math.sin(t * 12) * 0.15;
          scarfRef.current.position.z = -Math.sin(t * 10) * 0.1;
        }
        break;
        
      case "jump":
        // Dramatic jump pose
        if (headRef.current) {
          headRef.current.rotation.x = -0.2;
          headRef.current.position.y = (isCrouching ? 0.4 : 0.8) + 0.1;
        }
        
        // Arms up for jump (if no individual actions)
        if (!leftArmAction && leftArmRef.current) {
          leftArmRef.current.rotation.z = 0.8;
          leftArmRef.current.rotation.x = -0.3;
        }
        if (!rightArmAction && rightArmRef.current) {
          rightArmRef.current.rotation.z = -0.8;
          rightArmRef.current.rotation.x = -0.3;
        }
        
        // Legs tucked
        if (leftLegRef.current) leftLegRef.current.rotation.x = -0.5;
        if (rightLegRef.current) rightLegRef.current.rotation.x = -0.5;
        
        // Tail straight up
        if (tailRef.current) {
          tailRef.current.rotation.x = -0.2;
          tailRef.current.rotation.y = 0;
        }
        
        // Scarf flowing
        if (scarfRef.current) {
          scarfRef.current.rotation.z = 0.2;
          scarfRef.current.position.z = -0.1;
        }
        break;
        
      case "celebrate":
        // Victory dance!
        if (bodyRef.current && !isCrouching) {
          bodyRef.current.rotation.z = Math.sin(t * 8) * 0.2;
          bodyRef.current.position.y = Math.abs(Math.sin(t * 8)) * 0.2;
        }
        
        // Happy head bob
        if (headRef.current) {
          headRef.current.position.y = (isCrouching ? 0.4 : 0.8) + Math.sin(t * 8) * 0.15;
          headRef.current.rotation.y = Math.sin(t * 4) * 0.3;
        }
        
        // Arms celebrate (if no individual actions)
        if (!leftArmAction && leftArmRef.current) {
          leftArmRef.current.rotation.z = 0.5 + Math.sin(t * 8) * 0.5;
          leftArmRef.current.rotation.x = Math.sin(t * 8 + 1) * 0.3;
        }
        if (!rightArmAction && rightArmRef.current) {
          rightArmRef.current.rotation.z = -0.5 - Math.sin(t * 8) * 0.5;
          rightArmRef.current.rotation.x = Math.sin(t * 8 + 1) * 0.3;
        }
        
        // Happy tail wag
        if (tailRef.current) {
          tailRef.current.rotation.y = Math.sin(t * 12) * 0.6;
          tailRef.current.rotation.x = 0.3 + Math.sin(t * 8) * 0.3;
        }
        break;
    }
    
    // Always animate ears and eyes for life
    if (leftEarRef.current) leftEarRef.current.rotation.z = Math.sin(t * 3) * 0.05;
    if (rightEarRef.current) rightEarRef.current.rotation.z = -Math.sin(t * 3 + 0.5) * 0.05;
    
    // Blinking eyes
    const blinkTime = Math.sin(t * 0.8) > 0.95;
    if (leftEyeRef.current) leftEyeRef.current.scale.y = blinkTime ? 0.1 : 1;
    if (rightEyeRef.current) rightEyeRef.current.scale.y = blinkTime ? 0.1 : 1;
  });
  
  return (
    <group ref={group} {...props} scale={0.2}> {/* Made 50% bigger! */}
      
      {/* Main Body - Fluffy and round */}
      <group ref={bodyRef}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.6, 20, 20]} />
          <primitive object={furMaterial} />
        </mesh>
        
        {/* Belly - Pink inner */}
        <mesh position={[0, -0.1, 0.25]} castShadow receiveShadow>
          <sphereGeometry args={[0.45, 16, 16]} />
          <primitive object={innerMaterial} />
        </mesh>
      </group>
      
      {/* Head - Bigger and cuter */}
      <group ref={headRef} position={[0, 0.8, 0.15]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.4, 20, 20]} />
          <primitive object={furMaterial} />
        </mesh>
        
        {/* Snout - More pronounced */}
        <mesh position={[0, -0.1, 0.32]} castShadow receiveShadow>
          <sphereGeometry args={[0.2, 12, 12]} />
          <primitive object={innerMaterial} />
        </mesh>
        
        {/* Nose - Bigger and shinier */}
        <mesh position={[0, -0.08, 0.45]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <primitive object={noseMaterial} />
        </mesh>
        
        {/* Eyes - Bigger and more expressive */}
        <group ref={leftEyeRef}>
          <mesh position={[-0.12, 0.08, 0.32]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <primitive object={eyeMaterial} />
          </mesh>
          {/* Eye shine */}
          <mesh position={[-0.11, 0.1, 0.37]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
        
        <group ref={rightEyeRef}>
          <mesh position={[0.12, 0.08, 0.32]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <primitive object={eyeMaterial} />
          </mesh>
          {/* Eye shine */}
          <mesh position={[0.11, 0.1, 0.37]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
        
        {/* Ears - Fluffy and round */}
        <group ref={leftEarRef}>
          <mesh position={[-0.22, 0.25, 0.05]} castShadow receiveShadow>
            <sphereGeometry args={[0.12, 12, 12]} />
            <primitive object={furMaterial} />
          </mesh>
          <mesh position={[-0.22, 0.25, 0.08]} castShadow receiveShadow>
            <sphereGeometry args={[0.08, 10, 10]} />
            <primitive object={innerMaterial} />
          </mesh>
        </group>
        
        <group ref={rightEarRef}>
          <mesh position={[0.22, 0.25, 0.05]} castShadow receiveShadow>
            <sphereGeometry args={[0.12, 12, 12]} />
            <primitive object={furMaterial} />
          </mesh>
          <mesh position={[0.22, 0.25, 0.08]} castShadow receiveShadow>
            <sphereGeometry args={[0.08, 10, 10]} />
            <primitive object={innerMaterial} />
          </mesh>
        </group>
      </group>
      
      {/* Scarf - Adorable team colors! */}
      <group ref={scarfRef} position={[0, 0.5, 0.3]}>
        {/* Main scarf loop */}
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.35, 0.08, 8, 20]} />
          <primitive object={scarfMaterial} />
        </mesh>
        
        {/* Scarf stripes */}
        <mesh rotation={[0, 0, 0]} position={[0, 0, 0.01]}>
          <torusGeometry args={[0.35, 0.03, 8, 20]} />
          <primitive object={scarfStripeMaterial} />
        </mesh>
        
        {/* Scarf tails */}
        <mesh position={[0.25, -0.1, 0]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.12, 0.4, 0.06]} />
          <primitive object={scarfMaterial} />
        </mesh>
        <mesh position={[-0.25, -0.1, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.12, 0.4, 0.06]} />
          <primitive object={scarfMaterial} />
        </mesh>
      </group>
      
      {/* Left Arm - Chubby and cute */}
      <group ref={leftArmRef} position={[-0.45, 0.2, 0]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.15, 0.4, 12, 20]} />
          <primitive object={furMaterial} />
        </mesh>
        {/* Paw - Bigger and rounder */}
        <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.18, 12, 12]} />
          <primitive object={furMaterial} />
        </mesh>
        {/* Paw pads */}
        <mesh position={[0, -0.35, 0.12]} castShadow receiveShadow>
          <sphereGeometry args={[0.08, 8, 8]} />
          <primitive object={innerMaterial} />
        </mesh>
      </group>
      
      {/* Right Arm */}
      <group ref={rightArmRef} position={[0.45, 0.2, 0]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.15, 0.4, 12, 20]} />
          <primitive object={furMaterial} />
        </mesh>
        <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.18, 12, 12]} />
          <primitive object={furMaterial} />
        </mesh>
        <mesh position={[0, -0.35, 0.12]} castShadow receiveShadow>
          <sphereGeometry args={[0.08, 8, 8]} />
          <primitive object={innerMaterial} />
        </mesh>
      </group>
      
      {/* Left Leg - Stubby and adorable */}
      <group ref={leftLegRef} position={[-0.25, -0.5, 0]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.16, 0.3, 12, 20]} />
          <primitive object={furMaterial} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.2, 12, 12]} />
          <primitive object={furMaterial} />
        </mesh>
        <mesh position={[0, -0.3, 0.15]} castShadow receiveShadow>
          <sphereGeometry args={[0.1, 8, 8]} />
          <primitive object={innerMaterial} />
        </mesh>
      </group>
      
      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.25, -0.5, 0]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.16, 0.3, 12, 20]} />
          <primitive object={furMaterial} />
        </mesh>
        <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.2, 12, 12]} />
          <primitive object={furMaterial} />
        </mesh>
        <mesh position={[0, -0.3, 0.15]} castShadow receiveShadow>
          <sphereGeometry args={[0.1, 8, 8]} />
          <primitive object={innerMaterial} />
        </mesh>
      </group>
      
      {/* Tail - Fluffy and animated */}
      <group ref={tailRef}>
        <mesh position={[0, -0.3, -0.5]} rotation={[0.3, 0, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.15, 12, 12]} />
          <primitive object={furMaterial} />
        </mesh>
      </group>
    </group>
  );
}

export default Character;