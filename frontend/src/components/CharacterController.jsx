// components/CharacterController.jsx
import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { useControls } from "leva";
import { useEffect, useRef, useState } from "react";
import { MathUtils, Vector3 } from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { Character } from "./Character";
import { GameState } from "./Game";

const normalizeAngle = (angle) => {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
};

const lerpAngle = (start, end, t) => {
  start = normalizeAngle(start);
  end = normalizeAngle(end);

  if (Math.abs(end - start) > Math.PI) {
    if (end > start) {
      start += 2 * Math.PI;
    } else {
      end += 2 * Math.PI;
    }
  }

  return normalizeAngle(start + (end - start) * t);
};

export const CharacterController = ({ playerId, isControlled, color = "#ffffff" }) => {
  const { WALK_SPEED, RUN_SPEED, ROTATION_SPEED, JUMP_FORCE } = useControls(
    "Character Control",
    {
      WALK_SPEED: { value: 2.0, min: 0.1, max: 4, step: 0.1 },
      RUN_SPEED: { value: 4.0, min: 0.2, max: 12, step: 0.1 },
      ROTATION_SPEED: {
        value: degToRad(2),
        min: degToRad(0.1),
        max: degToRad(5),
        step: degToRad(0.1),
      },
      JUMP_FORCE: { value: 5, min: 1, max: 10, step: 0.5 },
    }
  );
  
  const rb = useRef();
  const container = useRef();
  const character = useRef();
  const cameraTarget = useRef();
  const cameraPosition = useRef();

  const [animation, setAnimation] = useState("idle");
  const characterRotationTarget = useRef(0);
  const rotationTarget = useRef(0);
  
  const cameraWorldPosition = useRef(new Vector3());
  const cameraLookAtWorldPosition = useRef(new Vector3());
  const cameraLookAt = useRef(new Vector3());
  
  const [, get] = useKeyboardControls();
  const isClicking = useRef(false);
  const isOnFloor = useRef(true);
  const canJump = useRef(true);

  // Initialize position
  useEffect(() => {
    if (rb.current && GameState[playerId]) {
      const timer = setTimeout(() => {
        const initialPos = GameState[playerId].position;
        rb.current.setTranslation({
          x: initialPos.x,
          y: 2, // Start higher to avoid getting stuck
          z: initialPos.z
        });
        console.log(`Initialized ${playerId} position`);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [playerId]);

  useEffect(() => {
    if (!isControlled) return;

    const onMouseDown = () => isClicking.current = true;
    const onMouseUp = () => isClicking.current = false;
    
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isControlled]);

  useFrame(({ camera, mouse }) => {
    if (!rb.current) return;

    if (isControlled) {
      const vel = rb.current.linvel();
      const movement = { x: 0, z: 0 };

      // Check if on floor (simple ground check)
      isOnFloor.current = Math.abs(vel.y) < 0.1;
      
      // Get input
      if (get().forward) movement.z = 1;
      if (get().backward) movement.z = -1;
      if (get().left) movement.x = 1;
      if (get().right) movement.x = -1;

      // Jump logic
      if (get().jump && isOnFloor.current && canJump.current) {
        rb.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
        canJump.current = false;
        setAnimation("jump");
      }
      
      // Reset jump when landing
      if (!get().jump && isOnFloor.current) {
        canJump.current = true;
      }

      let speed = get().run ? RUN_SPEED : WALK_SPEED;

      // Mouse control for player 1
      if (isClicking.current && playerId === "player1") {
        movement.x = -mouse.x * 2;
        movement.z = mouse.y + 0.4;
        if (Math.abs(movement.x) > 0.5 || Math.abs(movement.z) > 0.5) {
          speed = RUN_SPEED;
        }
      }

      // Rotation
      if (movement.x !== 0) {
        rotationTarget.current += ROTATION_SPEED * movement.x;
      }

      // Movement
      if (movement.x !== 0 || movement.z !== 0) {
        characterRotationTarget.current = Math.atan2(movement.x, movement.z);
        
        // Set velocity
        const moveAngle = rotationTarget.current + characterRotationTarget.current;
        const newVelX = Math.sin(moveAngle) * speed;
        const newVelZ = Math.cos(moveAngle) * speed;
        
        // Apply velocity - keep Y velocity for gravity
        rb.current.setLinvel({ x: newVelX, y: vel.y, z: newVelZ }, true);
        
        if (isOnFloor.current) {
          setAnimation(speed === RUN_SPEED ? "run" : "walk");
        }
      } else {
        // Stop horizontal movement but keep gravity
        rb.current.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
        if (isOnFloor.current) {
          setAnimation("idle");
        }
      }

      // Update character rotation
      if (character.current) {
        character.current.rotation.y = lerpAngle(
          character.current.rotation.y,
          characterRotationTarget.current,
          0.1
        );
      }

      // Update GameState
      const pos = rb.current.translation();
      GameState[playerId].position.set(pos.x, pos.y, pos.z);
      GameState[playerId].rotation = rotationTarget.current;

      // Camera follow
      container.current.rotation.y = MathUtils.lerp(
        container.current.rotation.y,
        rotationTarget.current,
        0.1
      );

      if (cameraPosition.current && cameraTarget.current) {
        cameraPosition.current.getWorldPosition(cameraWorldPosition.current);
        camera.position.lerp(cameraWorldPosition.current, 0.1);

        cameraTarget.current.getWorldPosition(cameraLookAtWorldPosition.current);
        cameraLookAt.current.lerp(cameraLookAtWorldPosition.current, 0.1);
        camera.lookAt(cameraLookAt.current);
      }
    } else {
      // Non-controlled character syncs from GameState
      const state = GameState[playerId];
      if (state && state.position) {
        const currentPos = rb.current.translation();
        
        // Smooth position sync
        rb.current.setTranslation({
          x: MathUtils.lerp(currentPos.x, state.position.x, 0.2),
          y: MathUtils.lerp(currentPos.y, state.position.y, 0.2), // Sync Y position too
          z: MathUtils.lerp(currentPos.z, state.position.z, 0.2)
        });
        
        // Sync rotation
        container.current.rotation.y = MathUtils.lerp(
          container.current.rotation.y,
          state.rotation,
          0.2
        );
        
        // Estimate animation from movement
        const dx = state.position.x - currentPos.x;
        const dy = state.position.y - currentPos.y;
        const dz = state.position.z - currentPos.z;
        const moveSpeed = Math.sqrt(dx * dx + dz * dz);
        
        if (Math.abs(dy) > 0.1) {
          setAnimation("jump");
        } else if (moveSpeed > 0.05) {
          setAnimation("run");
        } else if (moveSpeed > 0.01) {
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
      linearDamping={2}  // Reduced from 4
      angularDamping={4}
      gravityScale={1.5}  // Reduced from 2
    >
      {/* Adjusted capsule collider - bigger and better positioned */}
      <CapsuleCollider args={[0.25, 0.15]} position={[0, 0.4, 0]} />
      
      <group ref={container}>
        {isControlled && (
          <>
            <group ref={cameraTarget} position-z={1.5} />
            <group ref={cameraPosition} position-y={4} position-z={-4} />
          </>
        )}
        <group ref={character}>
          {/* Adjusted character position to align with collider */}
          <Character scale={0.18} position-y={0} animation={animation} />
        </group>
        
        {/* Color indicator cone - positioned above character */}
        <mesh position={[0, 0.8, 0]}>
          <coneGeometry args={[0.1, 0.2, 4]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>
    </RigidBody>
  );
};