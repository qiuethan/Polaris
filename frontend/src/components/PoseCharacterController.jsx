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
    POSE_CONTROL_ENABLED
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

  // Better ground detection using raycast
  const checkGrounded = () => {
    if (!rb.current) return false;
    
    const pos = rb.current.translation();
    const vel = rb.current.linvel();
    
    // Simple ground detection: low Y velocity + not too high off ground
    const isLowVelocity = Math.abs(vel.y) < 2;
    const isReasonableHeight = pos.y < 10;
    
    return isLowVelocity && isReasonableHeight;
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
      
      // Check grounded state periodically
      if (groundCheckTimer.current > 0.1) { // Check every 100ms
        setIsGrounded(checkGrounded());
        groundCheckTimer.current = 0;
      }

      // Get pose input (if enabled) or fallback to keyboard
      const playerData = getCurrentPoseData();
      const poseInput = playerData ? processPoseActions(playerData) : null;
      
      // Process movement and actions
      let movement = 0;
      let jump = false;
      let run = false;
      let crouch = false;
      
      if (poseInput && POSE_CONTROL_ENABLED) {
        // Use pose data
        movement = poseInput.movement;
        jump = poseInput.jump;
        run = poseInput.run;
        crouch = poseInput.crouch;
        
        // DEBUG: Log final movement values
        if (isControlled && (movement !== 0 || jump || run || crouch)) {
          console.log(`[${playerId}] Final movement values:`, {
            movement,
            jump,
            run,
            crouch,
            isGrounded,
            POSE_CONTROL_ENABLED
          });
        }
        
        // Update crouching state
        setIsCrouching(crouch);
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
        
        // Fallback to keyboard (this would need keyboard controls integration)
        setIsCrouching(false);
      }

      // JUMP LOGIC
      if (jump && isGrounded && jumpCooldown.current <= 0) {
        console.log(`${playerId} jumping! (pose-controlled: ${POSE_CONTROL_ENABLED})`);
        
        rb.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
        
        jumpCooldown.current = 0.5;
        setAnimation("jump");
        setIsGrounded(false);
      }

      // MOVEMENT LOGIC
      const speed = run ? RUN_SPEED : WALK_SPEED;
      const currentPos = rb.current.translation();
      
      // Lane correction
      const laneOffset = currentPos.x - laneX;
      const laneCorrectionForce = -laneOffset * 3;
      
      if (isGrounded) {
        // GROUNDED MOVEMENT
        if (movement !== 0) {
          const newVel = {
            x: laneCorrectionForce,
            y: vel.y,
            z: movement * speed
          };
          
          // DEBUG: Log velocity being applied
          if (isControlled) {
            console.log(`[${playerId}] Applying velocity:`, newVel, `(speed: ${speed})`);
          }
          
          rb.current.setLinvel(newVel, true);
          
          // Set animation based on speed and state
          if (crouch) {
            setAnimation("idle"); // Crouched idle
          } else {
            setAnimation(run ? "run" : "walk");
          }
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
        const airControl = 0.3;
        
        rb.current.setLinvel({
          x: MathUtils.lerp(vel.x, laneCorrectionForce, 0.1),
          y: vel.y,
          z: MathUtils.lerp(vel.z, movement * speed * airControl, 0.1)
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
      lockRotations
      linearDamping={0.4}
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