// components/Map.jsx
import { useAnimations, useGLTF, Clone } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useEffect, useRef } from "react";

export const Map = ({ model, ...props }) => {
  console.log(`🗺️ Loading map: ${model}`);
  const { scene, animations } = useGLTF(model);
  const group = useRef();
  const { actions } = useAnimations(animations, group);
  
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);
  
  useEffect(() => {
    if (actions && animations.length > 0) {
      actions[animations[0].name]?.play();
    }
  }, [actions, animations]);
  
  return (
    <group>
      <RigidBody type="fixed" colliders="trimesh">
        {/* Use Clone to create a unique instance */}
        <Clone object={scene} {...props} ref={group} />
      </RigidBody>
    </group>
  );
};