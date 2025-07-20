// components/PoseCharacterController.jsx - POSE-CONTROLLED CHARACTER
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { useControls } from "leva";
import { useEffect, useRef, useState } from "react";
import { MathUtils, Vector3 } from "three";
import { Character } from "./Character";
import { GameState } from "./Game";
import { usePoseWebSocket } from "../api/usePoseWebSocket";
import { getPlayer, isPlayerDoing } from "../api/poseUtils";
import { Html } from "@react-three/drei";

export const PoseCharacterController = ({ 
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
    GROUND_DETECTION_DISTANCE,
    POSE_CONTROL_ENABLED,
    ACCELERATION,
    DECELERATION
  } = useControls(
    "Pose Character Control",
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
      POSE_CONTROL_ENABLED: { value: true, label: "Enable Pose Control" },
      ACCELERATION: { value: 8, min: 1, max: 20, step: 0.5, label: "Car Acceleration" },
      DECELERATION: { value: 6, min: 1, max: 15, step: 0.5, label: "Car Deceleration" },
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
  const [leftArmAction, setLeftArmAction] = useState(null);
  const [rightArmAction, setRightArmAction] = useState(null);
  
  const cameraWorldPosition = useRef(new Vector3());
  const cameraLookAtWorldPosition = useRef(new Vector3());
  const cameraLookAt = useRef(new Vector3());
  
  const jumpCooldown = useRef(0);
  const groundCheckTimer = useRef(0);
  const actionCooldown = useRef(0);
  const jumpingFlag = useRef(false); // Prevent movement logic from overriding jump
  const [poseJumpTrigger, setPoseJumpTrigger] = useState(0); // State-based jump trigger
  const [prevPoseAction, setPrevPoseAction] = useState(null); // Track previous action for transitions
  
  // Car-like movement variables
  const currentSpeed = useRef(0); // Current forward/backward speed
  const acceleration = useRef(8); // How fast to accelerate
  const deceleration = useRef(6); // How fast to decelerate when no input
  
  // Update acceleration/deceleration from Leva controls
  useEffect(() => {
    acceleration.current = ACCELERATION;
    deceleration.current = DECELERATION;
  }, [ACCELERATION, DECELERATION]);
  
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

  // Handle jump outside useFrame (like purple button)
  useEffect(() => {
    if (poseJumpTrigger > 0) {
      if (jumpCooldown.current <= 0 && isGrounded) {
        console.log(`🎯 [${playerId}] POSE JUMP TRIGGERED OUTSIDE useFrame! Trigger: ${poseJumpTrigger}, Grounded: ${isGrounded}`);
        doJump();
      } else {
        console.log(`❌ [${playerId}] POSE JUMP BLOCKED - Cooldown: ${jumpCooldown.current.toFixed(2)}s, Grounded: ${isGrounded}`);
      }
      // Reset trigger to prevent infinite loop
      setPoseJumpTrigger(0);
    }
  }, [poseJumpTrigger, isGrounded]);
  
  // WORKING JUMP FUNCTION - Same as purple button
  const doJump = () => {
    if (!rb.current) {
      console.log(`❌ [${playerId}] rb.current is null!`);
      return;
    }
    
    // Additional safety check for purple button
    if (jumpCooldown.current > 0) {
      console.log(`❌ [${playerId}] Purple button blocked - still cooling down: ${jumpCooldown.current.toFixed(2)}s`);
      return;
    }
    
    if (!isGrounded) {
      console.log(`❌ [${playerId}] Purple button blocked - not grounded`);
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
      y: 13, // Reduced upward velocity by 1/6 (from 16)
      z: Math.max(currentVel.z * 0.8, 2) // Slightly reduce forward speed to avoid wall hits
    }, true);
    
    // STAGE 2: Add forward momentum after character is airborne (150ms delay)
    const forwardMomentum = Math.max(currentVel.z + 3, 10); // Reduced momentum by 1/6 (+3 boost, max 10)
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
    
    console.log(`✅ [${playerId}] Pose jump complete - should be moving upward!`);
  };
  
  // Make doJump available globally for debugging
  if (isControlled && typeof window !== 'undefined') {
    window[`doJump_pose_${playerId}`] = doJump;
    console.log(`🔧 [${playerId}] Pose doJump function available as window.doJump_pose_${playerId}`);
  }

  // WebSocket connection for pose data
  const { poseData, connectionStatus, error, disconnect } = usePoseWebSocket();

  // Fixed lane positions
  const laneX = playerId === "player1" ? -LANE_SEPARATION/2 : LANE_SEPARATION/2;
  
  // Map playerId to player index for pose data
  const posePlayerIndex = playerId === "player1" ? 0 : 1;

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

  // Get current pose data for this player
  const getCurrentPoseData = () => {
    if (!POSE_CONTROL_ENABLED || !poseData) return null;
    const playerData = getPlayer(poseData, posePlayerIndex);
    
    // DEBUG: Log pose data retrieval
    if (playerData && isControlled) {
      console.log(`[${playerId}] Pose data:`, {
        action: playerData.action,
        speed: playerData.speed,
        hasArms: !!playerData.arms,
        hasHead: !!playerData.head
      });
    }
    
    return playerData;
  };

  // Smooth ground detection - Same as keyboard version
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

  // Process pose actions into game inputs
  const processPoseActions = (playerData) => {
    if (!playerData) return { movement: 0, jump: false, run: false, crouch: false };

    const action = playerData.action;
    const speed = playerData.speed || 0;
    
    // DEBUG: Log action processing
    console.log(`[${playerId}] Processing action: "${action}" with speed: ${speed}`);
    
    // Reset arm actions
    setLeftArmAction(null);
    setRightArmAction(null);
    
    // Process arm angles for gestures
    if (playerData.arms) {
      // Left arm wave detection (high shoulder angle)
      if (playerData.arms.left?.shoulder_angle > 100) {
        setLeftArmAction("wave");
      }
      // Right arm wave detection
      if (playerData.arms.right?.shoulder_angle > 100) {
        setRightArmAction("wave");
      }
      
      // Point gesture (moderate shoulder angle + extended elbow)
      if (playerData.arms.left?.shoulder_angle > 60 && 
          playerData.arms.left?.shoulder_angle < 100 &&
          playerData.arms.left?.elbow_angle > 150) {
        setLeftArmAction("point");
      }
      if (playerData.arms.right?.shoulder_angle > 60 && 
          playerData.arms.right?.shoulder_angle < 100 &&
          playerData.arms.right?.elbow_angle > 150) {
        setRightArmAction("point");
      }
    }

    let result;
    switch (action) {
      case "run":
        result = { 
          movement: 1, 
          jump: false, 
          run: true, 
          crouch: false 
        };
        break;
      
      case "jump":
        result = { 
          movement: 0, 
          jump: true, 
          run: false, 
          crouch: false 
        };
        break;
      
      case "crouch":
        result = { 
          movement: 0, 
          jump: false, 
          run: false, 
          crouch: true 
        };
        break;
      
      case "mountain_climber":
        // Treat mountain climber as fast forward movement
        result = { 
          movement: 1, 
          jump: false, 
          run: true, 
          crouch: false 
        };
        break;
      
      default: // "none" or unknown or null
        result = { 
          movement: 0, 
          jump: false, 
          run: false, 
          crouch: false 
        };
        break;
    }
    
    // DEBUG: Log the resulting movement input
    console.log(`[${playerId}] Action "${action}" → Movement input:`, result);
    
    return result;
  };

  useFrame(({ camera }, delta) => {
    if (!rb.current) return;

    if (isControlled) {
      const vel = rb.current.linvel();
      const pos = rb.current.translation();
      
      // Update timers
      jumpCooldown.current = Math.max(0, jumpCooldown.current - delta);
      groundCheckTimer.current += delta;
      actionCooldown.current = Math.max(0, actionCooldown.current - delta);
      
      // Check grounded state more frequently
      if (groundCheckTimer.current > 0.05) { // Check every 50ms for better responsiveness
        const newGroundedState = checkGrounded();
        if (newGroundedState !== isGrounded && isControlled) {
          console.log(`🌍 [${playerId}] POSE Ground state changed: ${isGrounded} → ${newGroundedState}, Y: ${pos.y}, Vel: ${vel.y}`);
        }
        setIsGrounded(newGroundedState);
        groundCheckTimer.current = 0;
      }

      // Get pose input (if enabled) or fallback to keyboard
      const playerData = getCurrentPoseData();
      const poseInput = playerData ? processPoseActions(playerData) : null;
      
      // Process movement and actions from pose data
      let forward = false;
      let backward = false;
      let jump = false;
      let run = false;
      let crouch = false;
      
      if (poseInput && POSE_CONTROL_ENABLED) {
        // Convert pose movement to forward/backward
        if (poseInput.movement > 0) forward = true;
        if (poseInput.movement < 0) backward = true;
        
        jump = poseInput.jump;
        run = poseInput.run;
        crouch = poseInput.crouch;
        
        // DEBUG: Log final movement values
        if (isControlled && (forward || backward || jump || run || crouch)) {
          console.log(`[${playerId}] Pose inputs:`, {
            forward,
            backward,
            jump,
            run,
            crouch,
            isGrounded,
            POSE_CONTROL_ENABLED
          });
        }
        
      } else {
        // DEBUG: Log why pose control isn't being used
        if (isControlled) {
          console.log(`[${playerId}] Not using pose control:`, {
            hasPoseInput: !!poseInput,
            POSE_CONTROL_ENABLED,
            hasPlayerData: !!playerData,
            connectionStatus
          });
        }
        
        // No pose input - reset everything
        setIsCrouching(false);
      }
      
      // Car-like acceleration system - SAME AS KEYBOARD VERSION
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
      
      // Apply useful speed boost when crouching (momentum for obstacles)
      const finalSpeed = currentSpeed.current * (crouch ? 1.4 : 1); // 40% speed boost when crouching for obstacle navigation
      
              // Debug car movement for pose
        if (isControlled && (forward || backward || Math.abs(currentSpeed.current) > 0.1)) {
          const speedInfo = crouch ? " (CROUCH SLIDE +40%)" : "";
          console.log(`🏎️ [${playerId}] POSE Car movement - Target: ${targetSpeed.toFixed(2)}, Current: ${currentSpeed.current.toFixed(2)}, Final: ${finalSpeed.toFixed(2)}${speedInfo}`);
        }

      // Update crouching state
      setIsCrouching(crouch && isGrounded);
      
      // PERSISTENT CROUCH MOVEMENT - Auto scoot forward while crouching
      if (crouch && isGrounded) {
        // Add automatic forward movement while crouching (useful crawling speed)
        const crouchSpeed = 1.5; // Useful crawling speed for obstacle navigation
        currentSpeed.current = Math.max(currentSpeed.current, crouchSpeed);
        
        // Cap maximum speed when crouching to prevent it from being too fast
        if (currentSpeed.current > 4.0) {
          currentSpeed.current = 4.0; // Reasonable max crouch speed cap
        }
      }

      // POSE JUMP LOGIC - ONLY TRIGGER ON TRANSITION (NO DUPLICATES!)
      const currentAction = playerData?.action;
      const isNewJump = jump && currentAction === "jump" && prevPoseAction !== "jump";
      
      if (isNewJump && jumpCooldown.current <= 0 && isGrounded) {
        console.log(`🎯 [${playerId}] NEW POSE JUMP DETECTED - triggering state change! Grounded: ${isGrounded}`);
        setPoseJumpTrigger(prev => prev + 1); // Trigger jump via state change (next render)
      } else if (jump && isControlled) {
        console.log(`❌ [${playerId}] POSE JUMP BLOCKED - Cooldown: ${jumpCooldown.current.toFixed(2)}s, Grounded: ${isGrounded}, New: ${isNewJump}`);
      }
      
      // Update previous action for next frame
      setPrevPoseAction(currentAction);

      // CAR-LIKE MOVEMENT LOGIC - Same as keyboard version
      const currentPos = rb.current.translation();
      
      // Lane correction
      const laneOffset = currentPos.x - laneX;
      const laneCorrectionForce = -laneOffset * 3;
      
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
        console.log(`🚀 [${playerId}] POSE In jumping mode - preserving Y velocity: ${vel.y}`);
        rb.current.setLinvel({
          x: MathUtils.lerp(vel.x, laneCorrectionForce, 0.1),
          y: vel.y, // Keep the jump velocity
          z: MathUtils.lerp(vel.z, finalSpeed * 0.3, 0.1) // Use car-like speed in air too
        }, true);
      } else {
        // AIRBORNE MOVEMENT - Limited air control with car-like momentum
        const airControl = 0.3;
        
        rb.current.setLinvel({
          x: MathUtils.lerp(vel.x, laneCorrectionForce, 0.1),
          y: vel.y,
          z: MathUtils.lerp(vel.z, finalSpeed * airControl, 0.1) // Use car momentum in air
        }, true);
        
        // Animation based on Y velocity
        if (vel.y > 1) {
          setAnimation("jump");
        } else if (vel.y < -1) {
          setAnimation("fall");
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

      // Camera follow
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
      // Non-controlled character syncs from GameState
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
        args={isCrouching ? [0.2, 0.15] : [0.3, 0.2]} 
        position={isCrouching ? [0, 0.3, 0] : [0, 0.5, 0]} 
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
            scale={0.18} 
            position-y={0.1} 
            animation={animation} 
            visible={!isControlled || !POV_MODE}
            isCrouching={isCrouching}
            leftArmAction={leftArmAction}
            rightArmAction={rightArmAction}
          />
        </group>
        
        {/* Visual indicator for grounded state */}
        <mesh position={[0, 0.9, 0]} visible={!isControlled || !POV_MODE}>
          <coneGeometry args={[0.1, 0.2, 4]} />
          <meshBasicMaterial color={isGrounded ? color : "#666666"} />
        </mesh>
        
        {/* Debug: Show grounded state and pose connection */}
        {isControlled && (
          <>
            <mesh position={[0, 1.2, 0]} visible={!POV_MODE}>
              <sphereGeometry args={[0.05]} />
              <meshBasicMaterial color={isGrounded ? "#00ff00" : "#ff0000"} />
            </mesh>
            
            {/* Pose connection indicator */}
            <mesh position={[0, 1.4, 0]} visible={!POV_MODE}>
              <sphereGeometry args={[0.03]} />
              <meshBasicMaterial 
                color={
                  !POSE_CONTROL_ENABLED ? "#888888" :
                  connectionStatus === "connected" ? "#00ff00" : 
                  connectionStatus === "connecting" ? "#ffff00" : "#ff0000"
                } 
              />
            </mesh>
            
            {/* Purple jump button - Same as keyboard version */}
            <mesh 
              position={[0, 1.6, 0]} 
              visible={!POV_MODE}
              onClick={doJump}
            >
              <boxGeometry args={[0.2, 0.1, 0.1]} />
              <meshBasicMaterial color="#ff00ff" />
            </mesh>
          </>
        )}
        
        {/* Display current pose action */}
        {isControlled && (
          <mesh position={[0, 1.6, 0]} visible={!POV_MODE}>
            <planeGeometry args={[0.8, 0.3]} />
            <meshBasicMaterial color="#000000" opacity={0.7} transparent />
          </mesh>
        )}
        
        {/* Connection Debug Panel */}
        {isControlled && !POV_MODE && (
          <Html position={[0, 2, 0]} center>
            <div style={{
              background: 'rgba(0,0,0,0.9)',
              color: 'white',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px',
              textAlign: 'center',
              minWidth: '150px'
            }}>
              <div>🔌 {connectionStatus}</div>
              {error && <div style={{color: 'red', fontSize: '10px'}}>{error}</div>}
              <button 
                onClick={disconnect}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  fontSize: '10px',
                  marginTop: '4px',
                  cursor: 'pointer'
                }}
              >
                Force Disconnect
              </button>
            </div>
          </Html>
        )}
      </group>
    </RigidBody>
  );
}; 