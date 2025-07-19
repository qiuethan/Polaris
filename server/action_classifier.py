from typing import List, Dict

def classify_action_simple(angle_history: List[Dict]) -> str:
    """
    Simple, direct action classification based on current pose.
    
    Args:
        angle_history: List of dictionaries containing joint angles over time
        
    Returns:
        String action label: "crouch", "mountain_climber", or "unknown"
    """
    if not angle_history:
        return "unknown"
    
    # Get the most recent frame
    current_frame = angle_history[-1]
    
    # Get current joint angles
    left_knee = current_frame.get('left_knee_angle')
    right_knee = current_frame.get('right_knee_angle')
    left_hip = current_frame.get('left_hip_angle')
    right_hip = current_frame.get('right_hip_angle')
    left_elbow = current_frame.get('left_elbow_angle')
    right_elbow = current_frame.get('right_elbow_angle')
    left_shoulder = current_frame.get('left_shoulder_angle')
    right_shoulder = current_frame.get('right_shoulder_angle')
    
    # === MOUNTAIN CLIMBER DETECTION ===
    # 1. Straight arms (elbows close to 180°) - more sensitive
    straight_arms = False
    if (left_elbow is not None and right_elbow is not None):
        straight_arms = (left_elbow > 150 and right_elbow > 150)  # Was 160°
    
    # 2. Hunched back/forward lean (shoulders pulled forward, hips bent) - more sensitive
    hunched_back = False
    if (left_shoulder is not None and right_shoulder is not None):
        # Lower shoulder angles indicate forward lean/hunched position
        hunched_back = (left_shoulder < 130 and right_shoulder < 130)  # Was 120°
    
    # 3. Hip movement over recent frames
    hip_movement = False
    if len(angle_history) >= 3 and left_hip is not None and right_hip is not None:
        # Look at hip angle changes over last few frames
        recent_left_hips = [frame.get('left_hip_angle') for frame in angle_history[-3:] 
                           if frame.get('left_hip_angle') is not None]
        recent_right_hips = [frame.get('right_hip_angle') for frame in angle_history[-3:] 
                            if frame.get('right_hip_angle') is not None]
        
        if len(recent_left_hips) >= 2 and len(recent_right_hips) >= 2:
            # Filter out None values and ensure we have numbers
            valid_left_hips = [h for h in recent_left_hips if h is not None]
            valid_right_hips = [h for h in recent_right_hips if h is not None]
            
            if len(valid_left_hips) >= 2 and len(valid_right_hips) >= 2:
                left_hip_change = abs(max(valid_left_hips) - min(valid_left_hips))
                right_hip_change = abs(max(valid_right_hips) - min(valid_right_hips))
                # Significant hip movement detected - more sensitive
                hip_movement = (left_hip_change > 7 or right_hip_change > 7)  # Was 10°
    
    # Mountain climber: All three conditions
    if straight_arms and hunched_back and (hip_movement or len(angle_history) < 3):
        return "mountain_climber"
    
    # === CROUCH DETECTION ===
    # Simple rule: Both knees bent beyond 110 degrees
    if (left_knee is not None and right_knee is not None and 
        left_knee < 110 and right_knee < 110):
        return "crouch"
    
    # === DEFAULT TO UNKNOWN ===
    return "unknown"


def classify_action_from_history(angle_history: List[Dict]) -> str:
    """
    Simple action classification based on current pose.
    
    Args:
        angle_history: List of dictionaries containing joint angles over time
        
    Returns:
        String action label
    """
    return classify_action_simple(angle_history)


# Example usage and testing
if __name__ == "__main__":
    # Example 1: Crouch data
    crouch_frames = [
        {
            "left_knee_angle": 100.0,  # Bent knee (< 110°)
            "right_knee_angle": 95.0,  # Bent knee (< 110°)
            "left_hip_angle": 120.0,
            "right_hip_angle": 125.0,
        }
    ]
    
    # Example 2: Mountain climber data - using new sensitive thresholds
    mountain_climber_frames = [
        {
            "left_elbow_angle": 155.0,     # Straight arm (> 150°)
            "right_elbow_angle": 152.0,    # Straight arm (> 150°)
            "left_shoulder_angle": 125.0,  # Hunched forward (< 130°)
            "right_shoulder_angle": 128.0, # Hunched forward (< 130°)
            "left_hip_angle": 160.0,
            "right_hip_angle": 150.0,      # Hip movement (10° difference)
        },
        {
            "left_elbow_angle": 158.0,     # Still straight
            "right_elbow_angle": 151.0,    # Still straight
            "left_shoulder_angle": 122.0,  # Still hunched
            "right_shoulder_angle": 126.0, # Still hunched
            "left_hip_angle": 152.0,       # Hip moved (8° change - > 7°)
            "right_hip_angle": 158.0,      # Hip moved (8° change - > 7°)
        }
    ]
    
    # Test the classifier
    crouch_action = classify_action_from_history(crouch_frames)
    climber_action = classify_action_from_history(mountain_climber_frames)
    
    print(f"Test crouch detection: {crouch_action}")        # Should print "crouch"
    print(f"Test mountain climber detection: {climber_action}")  # Should print "mountain_climber" 