// components/DualLaneSystem.jsx
import React, { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useControls } from "leva";

// Define your custom path with positions and turn directions
const CUSTOM_PATH = [
  { pos: [-0.5, 2, 0], turn: "left" },      // Start - go straight
  { pos: [-0.5, 2, 6], turn: "left" },        // Turn right
  { pos: [10, 4, 0], turn: "right" },
];

// Turn direction modifiers - affects how sharp the curve is
const TURN_MODIFIERS = {
  "straight": 0.5,      // Normal smooth curvew
  "slight": 0.3,        // Very gentle curve
  "right": 0.4,         // Standard right turn
  "left": 0.4,          // Standard left turn
};

// Create smooth curve from path data
function createCurve(pathData) {
  const points = pathData.map(segment => new THREE.Vector3(...segment.pos));
  
  return new THREE.CatmullRomCurve3(
    points,
    true, // closed loop
    'centripetal',
    0.5
  );
}

// Get parallel curve offset to the right
function getParallelCurve(centerCurve, offset) {
  const points = [];
  const samples = 50;
  
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const point = centerCurve.getPoint(t);
    const tangent = centerCurve.getTangent(t);
    
    // Get perpendicular vector (to the right)
    const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    
    // Offset the point
    const offsetPoint = point.clone().add(right.multiplyScalar(offset));
    points.push(offsetPoint);
  }
  
  return new THREE.CatmullRomCurve3(points, true);
}

export function DualLaneSystem({ children }) {
  const { 
    LANE_SEPARATION,
    SHOW_LANES,
    SHOW_TURN_INFO,
    PATH_SCALE
  } = useControls("Path Settings", {
    LANE_SEPARATION: { value: 1.5, min: 0.5, max: 5, step: 0.1, label: "Lane Separation" },
    SHOW_LANES: { value: true, label: "Show Lane Lines" },
    SHOW_TURN_INFO: { value: true, label: "Show Turn Types" },
    PATH_SCALE: { value: 1.0, min: 0.1, max: 3.0, step: 0.1, label: "Path Scale" }
  });
  
  // Scale the path if needed
  const scaledPath = useMemo(() => {
    return CUSTOM_PATH.map(segment => ({
      ...segment,
      pos: [
        segment.pos[0] * PATH_SCALE,
        segment.pos[1],
        segment.pos[2] * PATH_SCALE
      ]
    }));
  }, [PATH_SCALE]);
  
  // Create the curves
  const { centerCurve, lane1Curve, lane2Curve } = useMemo(() => {
    const center = createCurve(scaledPath);
    
    // Create parallel lanes
    const lane1 = getParallelCurve(center, -LANE_SEPARATION / 2); // Left lane
    const lane2 = getParallelCurve(center, LANE_SEPARATION / 2);  // Right lane
    
    return { 
      centerCurve: center, 
      lane1Curve: lane1, 
      lane2Curve: lane2 
    };
  }, [scaledPath, LANE_SEPARATION]);
  
  // Get line points for visualization
  const centerPoints = useMemo(() => centerCurve.getPoints(100), [centerCurve]);
  const lane1Points = useMemo(() => lane1Curve.getPoints(100), [lane1Curve]);
  const lane2Points = useMemo(() => lane2Curve.getPoints(100), [lane2Curve]);
  
  return (
    <>
      {/* Visual lane lines */}
      {SHOW_LANES && (
        <>
          {/* Center line for reference */}
          <Line
            points={centerPoints}
            color="#ffff00"
            lineWidth={1}
            opacity={0.3}
            transparent
          />
          {/* Lane lines */}
          <Line
            points={lane1Points}
            color="#3b82f6"
            lineWidth={3}
            opacity={0.7}
            transparent
          />
          <Line
            points={lane2Points}
            color="#ef4444"
            lineWidth={3}
            opacity={0.7}
            transparent
          />
        </>
      )}

      {/* Point markers with turn type info */}
      {SHOW_LANES && scaledPath.map((segment, index) => (
        <group key={index}>
          {/* Point marker */}
          <mesh position={segment.pos}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color={
              segment.turn.includes('sharp') ? "#ff0000" :
              segment.turn.includes('hairpin') ? "#ff00ff" :
              segment.turn === "straight" ? "#00ff00" : "#ffffff"
            } />
          </mesh>
        </group>
      ))}
      
      {/* Provide curves to children */}
      {React.Children.map(children, child => {
        if (child.props.playerId === "player1") {
          return React.cloneElement(child, { 
            pathCurve: lane1Curve
          });
        } else if (child.props.playerId === "player2") {
          return React.cloneElement(child, { 
            pathCurve: lane2Curve
          });
        }
        return child;
      })}
    </>
  );
}