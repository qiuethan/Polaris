// components/CharacterController.jsx - IMPROVED VERSION
import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { useControls } from "leva";
import { useEffect, useRef, useState } from "react";
import { MathUtils, Vector3 } from "three";
import { Character } from "./Character";
import { GameState } from "./Game";
import { useSimpleStats } from "../hooks/useSimpleStats";

export const CharacterController = ({ 
  playerId, 
  isControlled, 
  color = "#ffffff"
}) => {
  const { addMovement } = useSimpleStats(playerId);
  const { 
    WALK_SPEED, 
    RUN_SPEED, 
    JUMP_FORCE, 
    LANE_SEPARATION,
    CAMERA_DISTANCE,
    CAMERA_HEIGHT,
    CAMERA_LERP_SPEED,
    POV_MODE,
    GROUND_DETECTION_DISTANCE,
    ACCELERATION,
    DECELERATION
  } = useControls(
    "⌨️ Keyboard Character Control",
    {
      WALK_SPEED: { value: 2.0, min: 0.5, max: 8, step: 0.1, label: "Walk Speed" },
      RUN_SPEED: { value: 3.0, min: 1, max: 15, step: 0.1, label: "Run Speed" },
      JUMP_FORCE: { value: 5, min: 1, max: 15, step: 0.5, label: "Jump Force" },
      LANE_SEPARATION: { value: 1, min: 0.5, max: 3, step: 0.1 },
      CAMERA_DISTANCE: { value: 3, min: 1, max: 15, step: 0.5 },
      CAMERA_HEIGHT: { value: 2, min: 0.5, max: 10, step: 0.5 },
      CAMERA_LERP_SPEED: { value: 0.2, min: 0.01, max: 0.5, step: 0.01 },
      POV_MODE: { value: false, label: "First Person View" },
      GROUND_DETECTION_DISTANCE: { value: 0.7, min: 0.3, max: 2, step: 0.1, label: "Ground Detection" },
      ACCELERATION: { value: 5, min: 1, max: 20, step: 0.5, label: "Acceleration" },
      DECELERATION: { value: 4, min: 1, max: 15, step: 0.5, label: "Deceleration" },
    }
  );
  
  const rb = useRef();
  const container = useRef();
  const character = useRef();
  const cameraTarget = useRef();
  const cameraPosition = useRef();

  const [animation, setAnimation] = useState("idle");
  const [isGrounded, setIsGrounded] = useState(false);
  const [isCrouching, setIsCrouching] = useState(false);
  const [prevCrouching, setPrevCrouching] = useState(false);
  const [prevRunning, setPrevRunning] = useState(false);
  
  const cameraWorldPosition = useRef(new Vector3());
  const cameraLookAtWorldPosition = useRef(new Vector3());
  const cameraLookAt = useRef(new Vector3());
  
  const [, get] = useKeyboardControls();
  const jumpCooldown = useRef(0);
  const groundCheckTimer = useRef(0);
  const jumpingFlag = useRef(false); // Prevent movement logic from overriding jump
  
  // Car-like movement variables
  const currentSpeed = useRef(0); // Current forward/backward speed
  const acceleration = useRef(4); // How fast to accelerate
  const deceleration = useRef(3); // How fast to decelerate when no input
  
  // Update acceleration/deceleration from Leva controls
  useEffect(() => {
    acceleration.current = ACCELERATION;
    deceleration.current = DECELERATION;
  }, [ACCELERATION, DECELERATION]);
  
  const doJump = () => {
    const caller = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
    console.log(`🚀 [${playerId}] doJump called from: ${caller}`);
    
    if (!rb.current) {
      console.log(`❌ [${playerId}] rb.current is null!`);
      return;
    }
    
    // Additional safety check for purple button
    if (jumpCooldown.current > 0) {
      console.log(`❌ [${playerId}] Jump blocked - still cooling down: ${jumpCooldown.current.toFixed(2)}s`);
      return;
    }
    
    if (!isGrounded) {
      console.log(`❌ [${playerId}] Jump blocked - not grounded`);
      return;
    }
    
    // Get current state
    const currentVel = rb.current.linvel();
    console.log(`🚀 [${playerId}] Current velocity before jump:`, currentVel);
    
    // Set jumping flag to prevent movement logic from overriding
    jumpingFlag.current = true;
    
    // STAGE 1: Apply only upward velocity first (no forward momentum to avoid wall collision)
    console.log(`🚀 [${playerId}] STAGE 1: Pure upward jump to clear obstacles`);
    rb.current.setLinvel({
      x: currentVel.x,
      y: 10, // Further reduced upward velocity for lower jump height
      z: Math.max(currentVel.z * 0.8, 2) // Slightly reduce forward speed to avoid wall hits
    }, true);
    
    // STAGE 2: Add forward momentum after character is airborne (150ms delay)
    const forwardMomentum = Math.max(currentVel.z + 2, 7); // Further reduced momentum (+2 boost, max 7)
    setTimeout(() => {
      if (rb.current && jumpingFlag.current) {
        const midAirVel = rb.current.linvel();
        // Only apply forward momentum if character is still going up or at peak (y > 0)
        if (midAirVel.y > -2) { // Small tolerance for peak detection
          console.log(`🚀 [${playerId}] STAGE 2: Adding forward momentum at peak - Z: ${forwardMomentum}, Y: ${midAirVel.y.toFixed(1)}`);
          rb.current.setLinvel({
            x: midAirVel.x,
            y: midAirVel.y, // Keep current Y velocity
            z: forwardMomentum // Apply forward momentum when safely airborne
          }, true);
        } else {
          console.log(`⏬ [${playerId}] STAGE 2 SKIPPED: Character already falling (Y: ${midAirVel.y.toFixed(1)})`);
        }
      }
    }, 150); // 150ms delay to ensure character is airborne
    
    // Verify initial velocity was set
    const newVel = rb.current.linvel();
    console.log(`✅ [${playerId}] Stage 1 velocity set:`, newVel);
    
    setAnimation("jump");
    jumpCooldown.current = 1.0; // 1 second cooldown to prevent double jumping
    setIsGrounded(false);
    
    // Clear jumping flag after the full jump sequence is complete
    setTimeout(() => {
      jumpingFlag.current = false;
      console.log(`🕐 [${playerId}] Jumping flag cleared - jump sequence complete`);
    }, 300); // 300ms - ensures both stages of jump are protected
    
    console.log(`✅ [${playerId}] Jump complete - should be moving upward!`);
    
    // Track jump movement
    if (isControlled) {
      addMovement('jump');
    }
  };

  // Make doJump available globally for debugging
  if (isControlled && typeof window !== 'undefined') {
    window[`doJump_${playerId}`] = doJump;
    console.log(`🔧 [${playerId}] doJump function available as window.doJump_${playerId}`);
  }

  // Fixed lane positions
  const laneX = playerId === "player1" ? -LANE_SEPARATION/2 : LANE_SEPARATION/2;

  // Handle crouch momentum boost
  useEffect(() => {
    if (isCrouching && rb.current && isGrounded) {
      const currentVel = rb.current.linvel();
      // Give a useful forward boost when starting to crouch
      const crouchBoost = Math.max(currentVel.z + 3, 6); // Add 3 to current speed or min 6 for obstacle momentum
      rb.current.setLinvel({
        x: currentVel.x,
        y: currentVel.y,
        z: crouchBoost
      }, true);
      console.log(`🛷 [${playerId}] CROUCH SLIDE BOOST! Z velocity: ${crouchBoost} (+3 speed)`);
    }
  }, [isCrouching, playerId, isGrounded]);

  // Initialize position
  useEffect(() => {
    if (rb.current && GameState[playerId]) {
      const timer = setTimeout(() => {
        rb.current.setTranslation({
          x: laneX,
          y: 5,
          z: -15
        });
        console.log(`Initialized ${playerId} at lane X=${laneX}, Z=-5`);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [playerId, laneX]);

  // Smooth ground detection 
  const checkGrounded = () => {
    if (!rb.current) return false;
    
    const pos = rb.current.translation();
    const vel = rb.current.linvel();
    
    // Realistic ground detection
    const isLowYVelocity = Math.abs(vel.y) < 1;
    const isAtGroundLevel = pos.y < 2.5; // Close to ground level
    const isNotFallingFast = vel.y > -3; // Not falling too fast
    
    return isLowYVelocity && isAtGroundLevel && isNotFallingFast;
  };

  useFrame(({ camera }, delta) => {
    if (!rb.current) return;

    if (isControlled) {
      const vel = rb.current.linvel();
      const pos = rb.current.translation();
      
      // Update timers
      jumpCooldown.current = Math.max(0, jumpCooldown.current - delta);
      groundCheckTimer.current += delta;
      
      // Check grounded state more frequently
      if (groundCheckTimer.current > 0.05) { // Check every 50ms for better responsiveness
        const newGroundedState = checkGrounded();
        if (newGroundedState !== isGrounded && isControlled) {
          console.log(`🌍 [${playerId}] Ground state changed: ${isGrounded} → ${newGroundedState}, Y: ${pos.y}, Vel: ${vel.y}`);
        }
        setIsGrounded(newGroundedState);
        groundCheckTimer.current = 0;
      }

      // Get input based on player ID from unified keyboard map
      const playerPrefix = playerId === "player1" ? "p1_" : "p2_";
      
      // Let's debug the get() function and see what it returns
      const allKeys = get();
      if (isControlled && Math.random() < 0.01) { // Log occasionally
        console.log(`🔍 [${playerId}] All available keys:`, Object.keys(allKeys));
        console.log(`🔍 [${playerId}] Looking for: ${playerPrefix}jump`);
        console.log(`🔍 [${playerId}] Jump value:`, allKeys[playerPrefix + "jump"]);
      }
      
      const forward = get()[playerPrefix + "forward"];
      const backward = get()[playerPrefix + "backward"];
      const run = get()[playerPrefix + "run"];
      const jump = get()[playerPrefix + "jump"];
      const crouch = get()[playerPrefix + "crouch"];
      
      // Debug the actual values we're getting
      if (isControlled && (forward || backward || run || jump || crouch)) {
        console.log(`🔍 [${playerId}] Raw values - forward:${forward}, backward:${backward}, run:${run}, jump:${jump}, crouch:${crouch}`);
      }
      
                  // Debug keyboard input detection
      if (isControlled) {
        const inputs = { forward, backward, run, jump, crouch };
        const activeInputs = Object.entries(inputs).filter(([key, value]) => value).map(([key]) => key);
        if (activeInputs.length > 0) {
          console.log(`⌨️ [${playerId}] Active inputs (${playerPrefix}):`, activeInputs.join(', '));
        }
        
         // Specifically debug jump key
         if (jump) {
           console.log(`🔑 [${playerId}] JUMP KEY DETECTED using ${playerPrefix}jump! Cooldown: ${jumpCooldown.current.toFixed(2)}, Crouch: ${crouch}`);
         }
      }
      
            // Car-like acceleration system - PROPER IMPLEMENTATION
      const maxSpeed = run ? RUN_SPEED : WALK_SPEED;
      const targetSpeed = forward ? maxSpeed : (backward ? -maxSpeed : 0);
      
      // Calculate actual acceleration/deceleration per second
      const accelPerSecond = acceleration.current; // units per second
      const decelPerSecond = deceleration.current; // units per second
      
      // Convert to per-frame values
      const accelThisFrame = accelPerSecond * delta;
      const decelThisFrame = decelPerSecond * delta;
      
      if (targetSpeed !== 0) {
        // Accelerating towards target
        if (Math.abs(currentSpeed.current) < Math.abs(targetSpeed)) {
          // Add acceleration this frame
          if (targetSpeed > 0) {
            currentSpeed.current = Math.min(currentSpeed.current + accelThisFrame, targetSpeed);
          } else {
            currentSpeed.current = Math.max(currentSpeed.current - accelThisFrame, targetSpeed);
          }
        } else {
          // Already at target speed
          currentSpeed.current = targetSpeed;
        }
      } else {
        // Decelerating towards zero
        if (Math.abs(currentSpeed.current) > 0.1) {
          if (currentSpeed.current > 0) {
            currentSpeed.current = Math.max(0, currentSpeed.current - decelThisFrame);
          } else {
            currentSpeed.current = Math.min(0, currentSpeed.current + decelThisFrame);
          }
        } else {
          currentSpeed.current = 0; // Stop completely when very slow
        }
      }
      
      // Apply speed modifier when crouching (slower for better control)
      const finalSpeed = currentSpeed.current * (crouch ? 0.7 : 1); // 50% slower when crouching for better control
      
      // Track run movement
      const isRunning = run && (forward || backward) && Math.abs(finalSpeed) > 1.5;
      if (isControlled && isRunning && !prevRunning) {
        addMovement('run');
      }
      setPrevRunning(isRunning);
      
      // Debug car movement more frequently to see it working
      if (isControlled && (forward || backward || Math.abs(currentSpeed.current) > 0.1)) {
        const speedInfo = crouch ? " (CROUCH SLIDE +40%)" : "";
        console.log(`🏎️ [${playerId}] Target: ${targetSpeed.toFixed(2)}, Current: ${currentSpeed.current.toFixed(2)}, Final: ${finalSpeed.toFixed(2)}, AccelFrame: ${accelThisFrame.toFixed(3)}${speedInfo}`);
      }

      // Update crouching state
      const newCrouchState = crouch && isGrounded;
      setIsCrouching(newCrouchState);
      
      // Track crouch movement
      if (isControlled && newCrouchState && !prevCrouching) {
        addMovement('crouch');
      }
      setPrevCrouching(newCrouchState);
      
      // PERSISTENT CROUCH MOVEMENT - Auto scoot forward while crouching
      if (crouch && isGrounded) {
        // Add automatic forward movement while crouching (slower crawling speed)
        const crouchSpeed = 0.75; // Slower crawling speed (50% of original)
        currentSpeed.current = Math.max(currentSpeed.current, crouchSpeed);
        
        // Cap maximum speed when crouching to prevent it from being too fast
        if (currentSpeed.current > 2.0) {
          currentSpeed.current = 2.0; // Lower max crouch speed cap (50% of original)
        }
      }
      
      // KEYBOARD JUMP - EXACTLY LIKE PURPLE BUTTON onClick={doJump}
      // Let's test if the conditions are the problem
      if (jump) {
        console.log(`🔑 [${playerId}] Jump detected! isControlled: ${isControlled}`);
        if (isControlled) {
          console.log(`✅ [${playerId}] isControlled is true - calling doJump!`);
          doJump();
        } else {
          console.log(`❌ [${playerId}] isControlled is FALSE - this is the problem!`);
        }
      }

      // MOVEMENT LOGIC - Cleaner separation between air and ground
      const speed = (run ? RUN_SPEED : WALK_SPEED) * (crouch ? 0.5 : 1); // Slower when crouching
      const currentPos = rb.current.translation();
      
      // Lane correction (always apply, but gentler)
      const laneOffset = currentPos.x - laneX;
      const laneCorrectionForce = -laneOffset * 3; // Gentler correction
      
      if (isGrounded && !jumpingFlag.current) {
        // GROUNDED MOVEMENT - Car-like acceleration/deceleration
        rb.current.setLinvel({
          x: laneCorrectionForce,
          y: vel.y, // Don't touch Y when grounded
          z: finalSpeed
        }, true);
        
        // Set animation based on actual speed
        const absSpeed = Math.abs(finalSpeed);
        if (crouch) {
          setAnimation("idle"); // Crouched movement
        } else if (absSpeed > RUN_SPEED * 0.7) {
          setAnimation("run");
        } else if (absSpeed > 0.5) {
          setAnimation("walk");
        } else {
          setAnimation("idle");
        }
      } else if (jumpingFlag.current) {
        // JUMPING - Don't override Y velocity, only adjust X and Z
        console.log(`🚀 [${playerId}] In jumping mode - preserving Y velocity: ${vel.y}`);
        rb.current.setLinvel({
          x: MathUtils.lerp(vel.x, laneCorrectionForce, 0.1),
          y: vel.y, // Keep the jump velocity
          z: MathUtils.lerp(vel.z, finalSpeed * 0.3, 0.1) // Use car-like speed in air too
        }, true);
      } else {
        // AIRBORNE MOVEMENT - Limited air control with car-like momentum
        const airControl = 0.3; // Reduced air control
        
        rb.current.setLinvel({
          x: MathUtils.lerp(vel.x, laneCorrectionForce, 0.1), // Gentle lane correction in air
          y: vel.y, // Never touch Y velocity in air
          z: MathUtils.lerp(vel.z, finalSpeed * airControl, 0.1) // Limited air control with momentum
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
      lockRotations={true}
      linearDamping={0.3} // Moderate damping for smooth movement
      angularDamping={4}
      gravityScale={1.4} // Balanced gravity for realistic jumping
      enabledRotations={[false, false, false]} // Lock all rotations
      type="dynamic" // Ensure it's a dynamic body
      mass={1} // Lightweight character
    >
      {/* Smaller collider when crouching */}
      <CapsuleCollider 
        args={isCrouching ? [0.22, 0.15] : [0.33, 0.2]} 
        position={isCrouching ? [0, 0.33, 0] : [0, 0.55, 0]} 
      />
      
      <group ref={container}>
        {isControlled && (
          <>
            <group ref={cameraTarget} position-z={1} />
            <group ref={cameraPosition} position-y={2} position-z={-3} />
          </>
        )}
        <group ref={character}>
          <Character 
            scale={0.198} 
            position-y={0.1} 
            animation={animation} 
            visible={!isControlled || !POV_MODE}
            isCrouching={isCrouching}
          />
        </group>
        
        {/* Visual indicator for grounded state */}
        <mesh position={[0, 0.9, 0]} visible={!isControlled || !POV_MODE}>
          <coneGeometry args={[0.1, 0.2, 4]} />
          <meshBasicMaterial color={isGrounded ? color : "#666666"} />
        </mesh>
        

      </group>
    </RigidBody>
  );
};