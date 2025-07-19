// components/Obstacles.jsx
import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { useControls } from "leva";
import * as THREE from "three";

// Individual Obstacle Components
export function JumpBarrier({ position, color = "#8B4513", height = 0.8, width = 2 }) {
  return (
    <RigidBody type="fixed" position={position}>
      <group>
        {/* Main barrier */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, 0.2]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        
        {/* Support posts */}
        <mesh position={[-width/2 + 0.1, -height/2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, height, 0.3]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
        <mesh position={[width/2 - 0.1, -height/2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, height, 0.3]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
        
        {/* Warning stripes */}
        <mesh position={[0, 0, 0.11]}>
          <boxGeometry args={[width * 0.8, 0.1, 0.01]} />
          <meshBasicMaterial color="#FFD700" />
        </mesh>
        <mesh position={[0, -0.2, 0.11]}>
          <boxGeometry args={[width * 0.8, 0.1, 0.01]} />
          <meshBasicMaterial color="#FFD700" />
        </mesh>
      </group>
    </RigidBody>
  );
}

export function DuckBarrier({ position, color = "#FF4500", height = 2.5, width = 2 }) {
  return (
    <RigidBody type="fixed" position={position}>
      <group>
        {/* Main overhead barrier */}
        <mesh position={[0, height - 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, 0.3, 0.2]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        
        {/* Hanging elements to make it more obvious */}
        <mesh position={[-0.4, height - 0.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.4, 0.1]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, height - 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.6, 0.1]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0.4, height - 0.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.4, 0.1]} />
          <meshStandardMaterial color={color} />
        </mesh>
        
        {/* Support poles */}
        <mesh position={[-width/2, height/2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.15, height, 0.15]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
        <mesh position={[width/2, height/2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.15, height, 0.15]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
        
        {/* Warning signs */}
        <mesh position={[0, height - 0.5, 0.15]}>
          <boxGeometry args={[0.4, 0.2, 0.01]} />
          <meshBasicMaterial color="#FFD700" />
        </mesh>
      </group>
    </RigidBody>
  );
}

export function MovingBarrier({ position, color = "#9932CC", type = "horizontal" }) {
  const barrierRef = useRef();
  const timeRef = useRef(0);
  
  useFrame((state, delta) => {
    if (!barrierRef.current) return;
    
    timeRef.current += delta;
    
    if (type === "horizontal") {
      // Move side to side
      barrierRef.current.setTranslation({
        x: position[0] + Math.sin(timeRef.current * 2) * 1.5,
        y: position[1],
        z: position[2]
      });
    } else if (type === "vertical") {
      // Move up and down
      barrierRef.current.setTranslation({
        x: position[0],
        y: position[1] + Math.sin(timeRef.current * 3) * 0.8 + 1,
        z: position[2]
      });
    }
  });
  
  return (
    <RigidBody ref={barrierRef} type="kinematicPosition" position={position}>
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.3, 1.5, 0.3]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
        </mesh>
        
        {/* Glowing effect */}
        <mesh>
          <boxGeometry args={[0.35, 1.55, 0.35]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} />
        </mesh>
        
        {/* Energy particles effect */}
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>
    </RigidBody>
  );
}

// Obstacle Course Manager
export function ObstacleCourse() {
  const { 
    OBSTACLE_DENSITY,
    COURSE_LENGTH,
    SHOW_OBSTACLES 
  } = useControls("Obstacles", {
    OBSTACLE_DENSITY: { value: 8, min: 3, max: 20, step: 1, label: "Number of Obstacles" },
    COURSE_LENGTH: { value: 100, min: 50, max: 200, step: 10, label: "Course Length" },
    SHOW_OBSTACLES: { value: true, label: "Show Obstacles" }
  });
  
  // Generate obstacle positions
  const obstacles = useMemo(() => {
    const obstacleList = [];
    const spacing = COURSE_LENGTH / OBSTACLE_DENSITY;
    
    for (let i = 0; i < OBSTACLE_DENSITY; i++) {
      const z = -8 + (i * spacing); // Start at z=-8 (right at starting position!)
      const obstacleType = Math.random();
      
      if (obstacleType < 0.4) {
        // Jump barriers (40% chance)
        obstacleList.push({
          type: "jump",
          position: [0, 0.4, z],
          id: `jump-${i}`
        });
      } else if (obstacleType < 0.7) {
        // Duck barriers (30% chance)
        obstacleList.push({
          type: "duck",
          position: [0, 0, z],
          id: `duck-${i}`
        });
      } else if (obstacleType < 0.85) {
        // Moving horizontal barriers (15% chance)
        obstacleList.push({
          type: "moving-horizontal",
          position: [0, 0.5, z],
          id: `moving-h-${i}`
        });
      } else {
        // Moving vertical barriers (15% chance)
        obstacleList.push({
          type: "moving-vertical",
          position: [0, 0, z],
          id: `moving-v-${i}`
        });
      }
    }
    
    return obstacleList;
  }, [OBSTACLE_DENSITY, COURSE_LENGTH]);
  
  if (!SHOW_OBSTACLES) return null;
  
  return (
    <group>
      {obstacles.map((obstacle) => {
        switch (obstacle.type) {
          case "jump":
            return (
              <JumpBarrier 
                key={obstacle.id}
                position={obstacle.position}
                color="#8B4513"
                height={0.8}
                width={1.8}
              />
            );
          case "duck":
            return (
              <DuckBarrier 
                key={obstacle.id}
                position={obstacle.position}
                color="#FF4500"
                height={2.5}
                width={1.8}
              />
            );
          case "moving-horizontal":
            return (
              <MovingBarrier 
                key={obstacle.id}
                position={obstacle.position}
                color="#9932CC"
                type="horizontal"
              />
            );
          case "moving-vertical":
            return (
              <MovingBarrier 
                key={obstacle.id}
                position={obstacle.position}
                color="#FF1493"
                type="vertical"
              />
            );
          default:
            return null;
        }
      })}
    </group>
  );
}

// Enhanced Character Controller with Ducking
export function EnhancedCharacterController({ 
  playerId, 
  isControlled, 
  color = "#ffffff"
}) {
  // ... (existing useControls and refs code) ...
  
  const [animation, setAnimation] = useState("idle");
  const [isDucking, setIsDucking] = useState(false);
  
  // ... (existing initialization code) ...
  
  useFrame(({ camera }, delta) => {
    if (!rb.current) return;

    if (isControlled) {
      const vel = rb.current.linvel();
      const pos = rb.current.translation();
      
      // Update jump cooldown
      jumpCooldown.current = Math.max(0, jumpCooldown.current - delta);
      
      // Get input
      const forward = get().forward;
      const backward = get().backward;
      const run = get().run;
      const jump = get().jump;
      const duck = get().duck; // New duck input
      
      let movement = 0;
      if (forward) movement = 1;
      if (backward) movement = -1;

      // Default Y velocity - keep current
      let targetY = vel.y;
      
      // Simple ground check
      const isGrounded = Math.abs(vel.y) < 1;
      
      // DUCKING LOGIC
      setIsDucking(duck && isGrounded);
      
      // JUMP LOGIC - Can't jump while ducking
      if (jump && isGrounded && jumpCooldown.current <= 0 && !duck) {
        console.log(`${playerId} jumping! Setting Y velocity to ${JUMP_FORCE}`);
        targetY = JUMP_FORCE;
        jumpCooldown.current = 0.5;
        setAnimation("jump");
      }

      // MOVEMENT LOGIC
      const speed = (run ? RUN_SPEED : WALK_SPEED) * (duck ? 0.5 : 1); // Slower when ducking
      const currentPos = rb.current.translation();
      
      // Lane correction
      const laneOffset = currentPos.x - laneX;
      const laneCorrectionForce = -laneOffset * 2;
      
      // SINGLE setLinvel call that controls everything
      rb.current.setLinvel({
        x: laneCorrectionForce,
        y: targetY,
        z: movement * speed
      }, true);
      
      // Animation logic
      if (targetY > 5) {
        setAnimation("jump");
      } else if (duck && isGrounded) {
        setAnimation("duck"); // New duck animation
      } else if (movement !== 0) {
        setAnimation(speed === RUN_SPEED ? "run" : "walk");
      } else {
        setAnimation("idle");
      }

      // ... (existing camera and GameState code) ...
      
    } else {
      // ... (existing non-controlled logic) ...
    }
  });

  return (
    <RigidBody 
      ref={rb}
      colliders={false}
      lockRotations
      linearDamping={0.4}
      angularDamping={4}
      gravityScale={1.8}
    >
      {/* Smaller collider when ducking */}
      <CapsuleCollider 
        args={isDucking ? [0.2, 0.15] : [0.3, 0.2]} 
        position={isDucking ? [0, 0.3, 0] : [0, 0.5, 0]} 
      />
      
      <group ref={container}>
        {/* ... (existing camera and character code) ... */}
        <group ref={character}>
          <Character 
            scale={0.25} 
            position-y={0.1} 
            animation={animation} 
            isCrouching={isDucking}
            visible={!isControlled || !POV_MODE}
            color={color}
          />
        </group>
        
        {/* ... (existing visual indicators) ... */}
      </group>
    </RigidBody>
  );
}

export default ObstacleCourse;