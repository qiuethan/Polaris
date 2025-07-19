from typing import List, Dict

def classify_action_simple(angle_history: List[Dict]) -> str:
    """
    Simple, direct action classification based on current pose.
    
    Args:
        angle_history: List of dictionaries containing joint angles over time
        
    Returns:
        String action label: "crouch" or "unknown"
    """
    if not angle_history:
        return "unknown"
    
    # Get the most recent frame
    current_frame = angle_history[-1]
    
    # Get current knee angles
    left_knee = current_frame.get('left_knee_angle')
    right_knee = current_frame.get('right_knee_angle')
    
    # === CROUCH DETECTION ===
    # Simple rule: Both knees bent beyond 105 degrees (more lenient)
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
    # Example angle history (simulated crouch data)
    sample_frames = [
        {
            "left_knee_angle": 100.0,  # Bent knee (< 105°)
            "right_knee_angle": 95.0,  # Bent knee (< 105°)
            "left_hip_angle": 120.0,
            "right_hip_angle": 125.0,
        }
    ]
    
    # Test the classifier
    action = classify_action_from_history(sample_frames)
    print(f"Test crouch detection: {action}")  # Should print "crouch" 