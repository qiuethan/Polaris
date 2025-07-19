// components/CharacterController.jsx - IMPROVED VERSION
import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { useControls } from "leva";
import { useEffect, useRef, useState } from "react";
import { MathUtils, Vector3 } from "three";
import { Character } from "./Character";
import { GameState } from "./Game";

export const CharacterController = ({ 
  playerId, 
  isControlled, 
  color = "#ffffff"
}) => {
  const { 
    WALK_SPEED, 
    RUN_SPEED, 
    JUMP_FORCE, 
    LANE_SEPARATION,
    CAMERA_DISTANCE,
    CAMERA_HEIGHT,
    CAMERA_LERP_SPEED,
    POV_MODE,
    GROUND_DETECTION_DISTANCE
  } = useControls(
    "Character Control",
    {
      WALK_SPEED: { value: 3.0, min: 0.5, max: 8, step: 0.1 },
      RUN_SPEED: { value: 6.0, min: 1, max: 15, step: 0.1 },
      JUMP_FORCE: { value: 8, min: 3, max: 15, step: 0.5 },
      LANE_SEPARATION: { value: 1, min: 0.5, max: 3, step: 0.1 },
      CAMERA_DISTANCE: { value: 3, min: 1, max: 15, step: 0.5 },
      CAMERA_HEIGHT: { value: 2, min: 0.5, max: 10, step: 0.5 },
      CAMERA_LERP_SPEED: { value: 0.2, min: 0.01, max: 0.5, step: 0.01 },
      POV_MODE: { value: false, label: "First Person View" },
      GROUND_DETECTION_DISTANCE: { value: 0.7, min: 0.3, max: 2, step: 0.1, label: "Ground Detection" },
    }
  );
  
  const rb = useRef();
  const container = useRef();
  const character = useRef();
  const cameraTarget = useRef();
  const cameraPosition = useRef();

  const [animation, setAnimation] = useState("idle");
  const [isGrounded, setIsGrounded] = useState(false);
  
  const cameraWorldPosition = useRef(new Vector3());
  const cameraLookAtWorldPosition = useRef(new Vector3());
  const cameraLookAt = useRef(new Vector3());
  
  const [, get] = useKeyboardControls();
  const jumpCooldown = useRef(0);
  const groundCheckTimer = useRef(0);

  // Fixed lane positions
  const laneX = playerId === "player1" ? -LANE_SEPARATION/2 : LANE_SEPARATION/2;

  // Initialize position
  useEffect(() => {
    if (rb.current && GameState[playerId]) {
      const timer = setTimeout(() => {
        rb.current.setTranslation({
          x: laneX,
          y: 5,
          z: -10
        });
        console.log(`Initialized ${playerId} at lane X=${laneX}`);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [playerId, laneX]);

  // Better ground detection using raycast
  const checkGrounded = () => {
    if (!rb.current) return false;
    
    const pos = rb.current.translation();
    const vel = rb.current.linvel();
    
    // Simple ground detection: low Y velocity + not too high off ground
    const isLowVelocity = Math.abs(vel.y) < 2;
    const isReasonableHeight = pos.y < 10; // Adjust based on your world
    
    return isLowVelocity && isReasonableHeight;
  };

  useFrame(({ camera }, delta) => {
    if (!rb.current) return;

    if (isControlled) {
      const vel = rb.current.linvel();
      const pos = rb.current.translation();
      
      // Update timers
      jumpCooldown.current = Math.max(0, jumpCooldown.current - delta);
      groundCheckTimer.current += delta;
      
      // Check grounded state periodically
      if (groundCheckTimer.current > 0.1) { // Check every 100ms
        setIsGrounded(checkGrounded());
        groundCheckTimer.current = 0;
      }

      // Get input
      const forward = get().forward;
      const backward = get().backward;
      const run = get().run;
      const jump = get().jump;
      
      let movement = 0;
      if (forward) movement = 1;
      if (backward) movement = -1;

      // JUMP LOGIC - Much simpler and more reliable
      if (jump && isGrounded && jumpCooldown.current <= 0) {
        console.log(`${playerId} jumping! (grounded: ${isGrounded})`);
        
        // Simple impulse jump - don't mess with velocities
        rb.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
        
        jumpCooldown.current = 0.5; // Longer cooldown prevents spam
        setAnimation("jump");
        setIsGrounded(false); // Immediately set to false after jump
      }

      // MOVEMENT LOGIC - Cleaner separation between air and ground
      const speed = run ? RUN_SPEED : WALK_SPEED;
      const currentPos = rb.current.translation();
      
      // Lane correction (always apply, but gentler)
      const laneOffset = currentPos.x - laneX;
      const laneCorrectionForce = -laneOffset * 3; // Gentler correction
      
      if (isGrounded) {
        // GROUNDED MOVEMENT - Full control
        if (movement !== 0) {
          rb.current.setLinvel({
            x: laneCorrectionForce,
            y: vel.y, // Don't touch Y when grounded
            z: movement * speed
          }, true);
          
          setAnimation(speed === RUN_SPEED ? "run" : "walk");
        } else {
          // Idle - just lane correction
          rb.current.setLinvel({
            x: laneCorrectionForce,
            y: vel.y,
            z: 0
          }, true);
          
          setAnimation("idle");
        }
      } else {
        // AIRBORNE MOVEMENT - Limited air control
        const airControl = 0.3; // Reduced air control
        
        rb.current.setLinvel({
          x: MathUtils.lerp(vel.x, laneCorrectionForce, 0.1), // Gentle lane correction in air
          y: vel.y, // Never touch Y velocity in air
          z: MathUtils.lerp(vel.z, movement * speed * airControl, 0.1) // Limited air control
        }, true);
        
        // Animation based on Y velocity
        if (vel.y > 1) {
          setAnimation("jump");
        } else if (vel.y < -1) {
          setAnimation("fall"); // If you have a fall animation
        }
      }

      // Character rotation
      if (character.current) {
        character.current.rotation.y = 0;
      }
      container.current.rotation.y = 0;

      // Update GameState
      GameState[playerId].position.set(currentPos.x, currentPos.y, currentPos.z);
      GameState[playerId].rotation = 0;

      // Camera follow (unchanged)
      if (cameraPosition.current && cameraTarget.current) {
        if (POV_MODE) {
          cameraPosition.current.position.set(0, 1.5, 0.2);
          cameraTarget.current.position.set(0, 1.5, 5);
        } else {
          cameraPosition.current.position.set(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
          cameraTarget.current.position.set(0, CAMERA_HEIGHT * 0.5, CAMERA_DISTANCE * 0.6);
        }
        
        cameraPosition.current.getWorldPosition(cameraWorldPosition.current);
        camera.position.lerp(cameraWorldPosition.current, CAMERA_LERP_SPEED);
        
        cameraTarget.current.getWorldPosition(cameraLookAtWorldPosition.current);
        cameraLookAt.current.lerp(cameraLookAtWorldPosition.current, CAMERA_LERP_SPEED);
        camera.lookAt(cameraLookAt.current);
      }
    } else {
      // Non-controlled character syncs from GameState (unchanged)
      const state = GameState[playerId];
      if (state && state.position) {
        const currentPos = rb.current.translation();
        
        rb.current.setTranslation({
          x: MathUtils.lerp(currentPos.x, state.position.x, 0.2),
          y: MathUtils.lerp(currentPos.y, state.position.y, 0.2),
          z: MathUtils.lerp(currentPos.z, state.position.z, 0.2)
        });
        
        container.current.rotation.y = 0;
        
        const dx = state.position.x - currentPos.x;
        const dy = state.position.y - currentPos.y;
        const dz = state.position.z - currentPos.z;
        const moveSpeed = Math.sqrt(dx * dx + dz * dz);
        
        if (Math.abs(dy) > 0.1) {
          setAnimation("jump");
        } else if (moveSpeed > 0.1) {
          setAnimation("run");
        } else if (moveSpeed > 0.02) {
          setAnimation("walk");
        } else {
          setAnimation("idle");
        }
      }
    }
  });

  return (
    <RigidBody 
      ref={rb}
      colliders={false}
      lockRotations
      linearDamping={0.4} // Slightly higher damping for more control
      angularDamping={4}
      gravityScale={1.8}
    >
      <CapsuleCollider args={[0.3, 0.2]} position={[0, 0.5, 0]} />
      
      <group ref={container}>
        {isControlled && (
          <>
            <group ref={cameraTarget} position-z={1} />
            <group ref={cameraPosition} position-y={2} position-z={-3} />
          </>
        )}
        <group ref={character}>
          <Character 
            scale={0.18} 
            position-y={0.1} 
            animation={animation} 
            visible={!isControlled || !POV_MODE}
          />
        </group>
        
        {/* Visual indicator for grounded state */}
        <mesh position={[0, 0.9, 0]} visible={!isControlled || !POV_MODE}>
          <coneGeometry args={[0.1, 0.2, 4]} />
          <meshBasicMaterial color={isGrounded ? color : "#666666"} />
        </mesh>
        
        {/* Debug: Show grounded state */}
        {isControlled && (
          <mesh position={[0, 1.2, 0]} visible={!POV_MODE}>
            <sphereGeometry args={[0.05]} />
            <meshBasicMaterial color={isGrounded ? "#00ff00" : "#ff0000"} />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
};