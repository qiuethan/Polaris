from typing import List, Dict

def classify_action_simple(angle_history: List[Dict]) -> str:
    """
    Simple, direct action classification based on current pose.
    
    Args:
        angle_history: List of dictionaries containing joint angles over time
        
    Returns:
        String action label: "crouch", "mountain_climber", "run", or "unknown"
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
    # 1. Straight arms (elbows close to 180°) - stricter requirement
    straight_arms = False
    if (left_elbow is not None and right_elbow is not None):
        straight_arms = (left_elbow > 165 and right_elbow > 165)  # More strict (was 150°)
    
    # 2. Hunched back/forward lean (shoulders pulled forward, hips bent) - stricter requirement
    hunched_back = False
    if (left_shoulder is not None and right_shoulder is not None):
        # Lower shoulder angles indicate forward lean/hunched position
        hunched_back = (left_shoulder < 110 and right_shoulder < 110)  # More strict (was 130°)
    
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
                # Significant hip movement detected - stricter requirement
                hip_movement = (left_hip_change > 12 or right_hip_change > 12)  # More strict (was 7°)
    
    # Mountain climber: All three conditions
    if straight_arms and hunched_back and (hip_movement or len(angle_history) < 3):
        return "mountain_climber"
    
    # === RUNNING DETECTION ===
    # 1. Alternating knee pattern (moderate threshold to catch natural running)
    alternating_knees = False
    if (left_knee is not None and right_knee is not None):
        knee_difference = abs(left_knee - right_knee)
        # Moderate difference for natural running motion
        alternating_knees = (knee_difference > 25)  # 25° difference - catches natural running
    
    # 2. Basic arm movement detection (simpler approach)
    arm_movement = False
    if len(angle_history) >= 2:
        # Check if arms are moving (not locked in position)
        prev_frame = angle_history[-2] if len(angle_history) > 1 else angle_history[-1]
        prev_left_elbow = prev_frame.get('left_elbow_angle')
        prev_right_elbow = prev_frame.get('right_elbow_angle')
        
        # Substantial arm movement check - filter out noise, detect real arm swing
        if (left_elbow is not None and prev_left_elbow is not None):
            left_elbow_change = abs(left_elbow - prev_left_elbow)
            if left_elbow_change > 15:  # Increased from 8° to filter noise
                arm_movement = True
        
        if (right_elbow is not None and prev_right_elbow is not None):
            right_elbow_change = abs(right_elbow - prev_right_elbow)
            if right_elbow_change > 15:  # Increased from 8° to filter noise
                arm_movement = True
        
        # If we can't detect arm movement at all, focus on legs only with higher threshold
        if left_elbow is None and right_elbow is None:
            arm_movement = True
    
    # 3. Proper running position (not crouching, knees in running range)
    proper_running_position = True
    if (left_knee is not None and right_knee is not None):
        # Avoid deep squats (both knees very bent)
        if left_knee < 90 and right_knee < 90:
            proper_running_position = False
        
        # Ensure at least one leg is in running stance (not both too bent)
        # Running typically has one leg straighter (>140°) and one more bent
        max_knee = max(left_knee, right_knee)
        if max_knee < 130:  # Both legs too bent for running
            proper_running_position = False
    
    # Running: Significant alternating knees + substantial arm activity + proper position
    if alternating_knees and arm_movement and proper_running_position:
        return "run"
    
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
    
    # Example 2: Mountain climber data - using stricter thresholds
    mountain_climber_frames = [
        {
            "left_elbow_angle": 170.0,     # Very straight arm (> 165°)
            "right_elbow_angle": 168.0,    # Very straight arm (> 165°)
            "left_shoulder_angle": 110.0,  # Very hunched forward (< 115°)
            "right_shoulder_angle": 112.0, # Very hunched forward (< 115°)
            "left_hip_angle": 160.0,
            "right_hip_angle": 145.0,      # Hip movement (15° difference)
        },
        {
            "left_elbow_angle": 172.0,     # Still very straight
            "right_elbow_angle": 166.0,    # Still very straight
            "left_shoulder_angle": 108.0,  # Still very hunched
            "right_shoulder_angle": 113.0, # Still very hunched
            "left_hip_angle": 145.0,       # Hip moved (15° change - > 12°)
            "right_hip_angle": 160.0,      # Hip moved (15° change - > 12°)
        }
    ]
    
    # Example 3: Running data - moderate movements for natural running
    running_frames = [
        {
            "left_knee_angle": 155.0,      # One leg straighter (running stance)
            "right_knee_angle": 125.0,     # Other leg bent (30° difference > 25°)
            "left_elbow_angle": 130.0,     # Arm position
            "right_elbow_angle": 160.0,    # Arm swinging
        },
        {
            "left_knee_angle": 130.0,      # Leg switched - now bent
            "right_knee_angle": 160.0,     # Other leg straighter (30° difference > 25°)
            "left_elbow_angle": 150.0,     # Arm moved (20° change > 15°)
            "right_elbow_angle": 140.0,    # Arm moved (20° change > 15°)
        }
    ]
    
    # Test the classifier
    crouch_action = classify_action_from_history(crouch_frames)
    climber_action = classify_action_from_history(mountain_climber_frames)
    run_action = classify_action_from_history(running_frames)
    
    print(f"Test crouch detection: {crouch_action}")        # Should print "crouch"
    print(f"Test mountain climber detection: {climber_action}")  # Should print "mountain_climber"
    print(f"Test running detection: {run_action}")         # Should print "run" 