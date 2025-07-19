from typing import List, Dict, Optional

def classify_action_simple(angle_history: List[Dict], prev_action: Optional[str] = None) -> str:
    """
    Simple, direct action classification based on current pose.
    
    Args:
        angle_history: List of dictionaries containing joint angles over time
        prev_action: Previous detected action for cooldown logic
        
    Returns:
        String action label: "crouch", "mountain_climber", "run", "jump", or "unknown"
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
    
    # === CROUCH DETECTION WITH BUFFER ===
    # Both knees bent beyond 120 degrees BUT NOT in mountain climber position - HIGHEST PRIORITY (more lenient)
    knees_bent = (left_knee is not None and right_knee is not None and 
                  left_knee < 120 and right_knee < 120)
    
    # Check if person is in mountain climber position (would exclude from crouch)
    in_mountain_climber_position = False
    if (left_elbow is not None and right_elbow is not None and
        left_shoulder is not None and right_shoulder is not None):
        # Mountain climber indicators: straight arms + hunched forward (plank position)
        arms_straight = (left_elbow > 150 and right_elbow > 150)
        hunched_forward = (left_shoulder < 120 and right_shoulder < 120)
        in_mountain_climber_position = arms_straight and hunched_forward
    
    # Only classify as crouch if knees are bent AND not in mountain climber position
    is_crouching = knees_bent and not in_mountain_climber_position
    
    if is_crouching:
        return "crouch"
    
    # Add buffer after crouch or mountain climber to prevent immediate run/jump detection
    action_buffer_active = False
    if prev_action in ["crouch", "mountain_climber"] and len(angle_history) >= 2:
        # Check if we just exited crouch or mountain climber position in recent frames
        for i in range(min(3, len(angle_history))):  # Look back 3 frames
            frame = angle_history[-(i+1)]
            frame_left_knee = frame.get('left_knee_angle')
            frame_right_knee = frame.get('right_knee_angle')
            frame_left_elbow = frame.get('left_elbow_angle')
            frame_right_elbow = frame.get('right_elbow_angle')
            frame_left_shoulder = frame.get('left_shoulder_angle')
            frame_right_shoulder = frame.get('right_shoulder_angle')
            
                         # Check for recent crouching
            recent_crouch = (frame_left_knee is not None and frame_right_knee is not None and
                            frame_left_knee < 130 and frame_right_knee < 130)
            
            # Check for recent mountain climber position (arms extended + hunched)
            recent_mountain_climber = False
            if (frame_left_elbow is not None and frame_right_elbow is not None and
                frame_left_shoulder is not None and frame_right_shoulder is not None):
                arms_extended = (frame_left_elbow > 150 and frame_right_elbow > 150)
                hunched_position = (frame_left_shoulder < 125 and frame_right_shoulder < 125)
                recent_mountain_climber = arms_extended and hunched_position
            
            # If any recent frame was crouching or mountain climbing, maintain buffer
            if recent_crouch or recent_mountain_climber:
                action_buffer_active = True
                break
    
    # === MOUNTAIN CLIMBER DETECTION (MODERATE SENSITIVITY - AFTER CROUCH) ===
    # 1. Straight arms (elbows close to 180°) - STRICTER
    straight_arms = False
    if (left_elbow is not None and right_elbow is not None):
        straight_arms = (left_elbow > 160 and right_elbow > 160)  # More strict (was 155°)
    
    # 2. Hunched back/forward lean (shoulders pulled forward, hips bent) - STRICTER
    hunched_back = False
    if (left_shoulder is not None and right_shoulder is not None):
        # Lower shoulder angles indicate forward lean/hunched position
        hunched_back = (left_shoulder < 115 and right_shoulder < 115)  # More strict (was 125°)
    
    # 3. Alternating hip movement (key indicator for mountain climbers)
    alternating_hips = False
    if len(angle_history) >= 3 and left_hip is not None and right_hip is not None:
        # Look at hip angle changes over recent frames to detect alternating pattern
        recent_left_hips = [frame.get('left_hip_angle') for frame in angle_history[-3:] 
                           if frame.get('left_hip_angle') is not None]
        recent_right_hips = [frame.get('right_hip_angle') for frame in angle_history[-3:] 
                            if frame.get('right_hip_angle') is not None]
        
        if len(recent_left_hips) >= 3 and len(recent_right_hips) >= 3:
            # Filter out None values
            valid_left_hips = [h for h in recent_left_hips if h is not None]
            valid_right_hips = [h for h in recent_right_hips if h is not None]
            
            if len(valid_left_hips) >= 3 and len(valid_right_hips) >= 3:
                # Check for alternating pattern: one hip more bent (knee to chest), other more open
                
                # Current hip difference (mountain climber position)
                current_hip_diff = abs(left_hip - right_hip)
                alternating_position = current_hip_diff > 15  # One hip more bent, other more open
                
                # Check for movement/switching over frames
                left_hip_range = abs(max(valid_left_hips) - min(valid_left_hips))
                right_hip_range = abs(max(valid_right_hips) - min(valid_right_hips))
                significant_movement = (left_hip_range > 12 or right_hip_range > 12)
                
                # Check for alternating pattern - hips should move in opposite directions
                left_hip_trend = valid_left_hips[-1] - valid_left_hips[0]  # Getting more/less bent
                right_hip_trend = valid_right_hips[-1] - valid_right_hips[0]  # Getting more/less bent
                
                # Alternating: if one hip is bending more, the other should be opening more
                opposite_movement = (left_hip_trend * right_hip_trend < 0) and (abs(left_hip_trend) > 8 or abs(right_hip_trend) > 8)
                
                alternating_hips = alternating_position and (significant_movement or opposite_movement)
    
    # Mountain climber: Require ALL three conditions - arms straight, hunched forward, alternating hips
    if straight_arms and hunched_back and (alternating_hips or len(angle_history) < 3):
        return "mountain_climber"
    
    # === RUNNING DETECTION ===
    # 1. Alternating knee pattern (moderate threshold to catch natural running)
    alternating_knees = False
    if (left_knee is not None and right_knee is not None):
        knee_difference = abs(left_knee - right_knee)
        # Relaxed difference for easier natural running motion detection
        alternating_knees = (knee_difference > 20)  # 20° difference - more lenient for natural running
    
    # 2. Basic arm movement detection (simpler approach)
    arm_movement = False
    if len(angle_history) >= 2:
        # Check if arms are moving (not locked in position)
        prev_frame = angle_history[-2] if len(angle_history) > 1 else angle_history[-1]
        prev_left_elbow = prev_frame.get('left_elbow_angle')
        prev_right_elbow = prev_frame.get('right_elbow_angle')
        
        # Relaxed arm movement check - easier to detect arm swing for running
        if (left_elbow is not None and prev_left_elbow is not None):
            left_elbow_change = abs(left_elbow - prev_left_elbow)
            if left_elbow_change > 10:  # Reduced from 15° for easier detection
                arm_movement = True
        
        if (right_elbow is not None and prev_right_elbow is not None):
            right_elbow_change = abs(right_elbow - prev_right_elbow)
            if right_elbow_change > 10:  # Reduced from 15° for easier detection
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
    
    # Running: Significant alternating knees + substantial arm activity + proper position + no action buffer
    if alternating_knees and arm_movement and proper_running_position and not action_buffer_active:
        return "run"
    
    # === JUMP DETECTION ===
    # Track UPWARD vertical movement while maintaining consistent size - LOWEST PRIORITY
    # COOLDOWN: No jump detection after crouch or mountain climber
    jump_detected = False
    
    # Add cooldown period after crouch or mountain climber, or if action buffer is active
    cooldown_active = prev_action in ["crouch", "mountain_climber"] or action_buffer_active
    
    if not cooldown_active and len(angle_history) >= 3:  # Reduced frames needed for faster detection
        # Get hip positions from previous frames
        prev_frames = angle_history[-3:]  # Look at last 3 frames (faster detection)
        hip_y_positions = []
        body_sizes = []
        
        for frame in prev_frames:
            left_hip_y = frame.get('left_hip_y')
            right_hip_y = frame.get('right_hip_y')
            left_shoulder_y = frame.get('left_shoulder_y')
            right_shoulder_y = frame.get('right_shoulder_y')
            
            # Only process if all positions are available and not None
            if (left_hip_y is not None and right_hip_y is not None and 
                left_shoulder_y is not None and right_shoulder_y is not None):
                # Average hip position (center of mass)
                avg_hip_y = (left_hip_y + right_hip_y) / 2
                hip_y_positions.append(avg_hip_y)
                
                # Body size indicator (shoulder to hip distance)
                avg_shoulder_y = (left_shoulder_y + right_shoulder_y) / 2
                body_size = abs(avg_hip_y - avg_shoulder_y)
                body_sizes.append(body_size)
        
        # Check for jump pattern: UPWARD movement + consistent size + proper pose
        if len(hip_y_positions) >= 2 and len(body_sizes) >= 2:  # Reduced minimum frames for faster detection
            # 1. UPWARD vertical movement only (decreasing Y values = moving up)
            earliest_hip_y = hip_y_positions[0]  # First frame
            latest_hip_y = hip_y_positions[-1]   # Last frame
            
            # Check if person moved UP (Y coordinates decrease when going up)
            upward_movement = earliest_hip_y - latest_hip_y  # Positive = moved up
            
            # Use person's body size as reference (more consistent than frame height)
            avg_body_size = sum(body_sizes) / len(body_sizes)
            if avg_body_size > 0:
                # Jump threshold relative to person's height (shoulder to hip distance)
                jump_threshold = avg_body_size * 0.08  # 8% of person's torso height (much more sensitive)
                is_moving_up = upward_movement > jump_threshold
            else:
                is_moving_up = False  # Can't detect without body size reference
            
            # 2. Consistent body size (person doesn't get bigger/smaller)
            # Note: avg_body_size already calculated above for jump threshold
            max_body_size = max(body_sizes)
            min_body_size = min(body_sizes)
            
            # 3. Proper jumping pose (not crouching during movement)
            proper_jump_pose = True
            if (left_knee is not None and right_knee is not None):
                # Exclude if person is in deep crouch during the movement
                if left_knee < 110 and right_knee < 110:  # Both knees bent (crouching)
                    proper_jump_pose = False
                
                # Exclude if person is in mountain climber pose
                if (left_shoulder is not None and right_shoulder is not None and
                    left_elbow is not None and right_elbow is not None):
                    hunched_forward = (left_shoulder < 115 and right_shoulder < 115)
                    arms_extended = (left_elbow > 165 and right_elbow > 165)
                    if hunched_forward and arms_extended:  # Mountain climber pose
                        proper_jump_pose = False
            
            # Avoid division by zero (avg_body_size already checked above)
            if avg_body_size > 0:
                size_variation = abs(max_body_size - min_body_size) / avg_body_size
                
                # Jump criteria: UPWARD movement (relative to person height) + stable size + proper pose + no cooldown
                stable_size = size_variation < 0.15  # Size varies less than 15%
                
                if is_moving_up and stable_size and proper_jump_pose:
                    jump_detected = True
    
    if jump_detected:
        return "jump"
    
    # === DEFAULT TO UNKNOWN ===
    return "unknown"


def classify_action_from_history(angle_history: List[Dict], prev_action: Optional[str] = None) -> str:
    """
    Simple action classification based on current pose.
    
    Args:
        angle_history: List of dictionaries containing joint angles over time
        prev_action: Previous detected action for cooldown logic
        
    Returns:
        String action label
    """
    return classify_action_simple(angle_history, prev_action)


# Example usage and testing
if __name__ == "__main__":
    # Example 1: Crouch data (more lenient)
    crouch_frames = [
        {
            "left_knee_angle": 115.0,  # Bent knee (< 120°) - more lenient
            "right_knee_angle": 110.0,  # Bent knee (< 120°) - more lenient
            "left_hip_angle": 120.0,
            "right_hip_angle": 125.0,
        }
    ]
    
    # Example 2: Mountain climber data - using hip movement detection
    mountain_climber_frames = [
        {
            "left_elbow_angle": 165.0,     # Straight arm (> 160°)
            "right_elbow_angle": 163.0,    # Straight arm (> 160°)
            "left_shoulder_angle": 110.0,  # Hunched forward (< 115°)
            "right_shoulder_angle": 112.0, # Hunched forward (< 115°)
            "left_hip_angle": 125.0,       # One hip bent (knee to chest)
            "right_hip_angle": 145.0,      # Other hip more open - 20° difference
        },
        {
            "left_elbow_angle": 167.0,     # Still straight arms
            "right_elbow_angle": 161.0,    # Still straight arms
            "left_shoulder_angle": 108.0,  # Still hunched
            "right_shoulder_angle": 113.0, # Still hunched
            "left_hip_angle": 135.0,       # Left hip opening (10° change)
            "right_hip_angle": 130.0,      # Right hip closing (15° change) - alternating
        },
        {
            "left_elbow_angle": 164.0,     # Still straight arms
            "right_elbow_angle": 162.0,    # Still straight arms
            "left_shoulder_angle": 109.0,  # Still hunched
            "right_shoulder_angle": 111.0, # Still hunched
            "left_hip_angle": 150.0,       # Left hip now open (alternated)
            "right_hip_angle": 120.0,      # Right hip now bent (alternated) - 30° difference
        }
    ]
    
    # Example 3: Running data - relaxed requirements for easier detection
    running_frames = [
        {
            "left_knee_angle": 155.0,      # One leg straighter (running stance)
            "right_knee_angle": 125.0,     # Other leg bent (30° difference > 20°)
            "left_elbow_angle": 130.0,     # Arm position
            "right_elbow_angle": 160.0,    # Arm swinging
        },
        {
            "left_knee_angle": 130.0,      # Leg switched - now bent
            "right_knee_angle": 160.0,     # Other leg straighter (30° difference > 20°)
            "left_elbow_angle": 150.0,     # Arm moved (20° change > 10°)
            "right_elbow_angle": 140.0,    # Arm moved (20° change > 10°)
        }
    ]
    
    # Example 4: Jump data - vertical position change + proper jumping pose (not crouching)
    jump_frames = [
        {
            "left_hip_y": 0.6,             # Hip position at bottom
            "right_hip_y": 0.6,            # Hip position at bottom
            "left_shoulder_y": 0.4,        # Shoulder position
            "right_shoulder_y": 0.4,       # Shoulder position (0.2 body size)
            "left_knee_angle": 160.0,      # Knees not bent (proper jumping stance)
            "right_knee_angle": 165.0,     # Knees not bent (proper jumping stance)
        },
        {
            "left_hip_y": 0.5,             # Hip moved up
            "right_hip_y": 0.5,            # Hip moved up
            "left_shoulder_y": 0.3,        # Shoulder moved up
            "right_shoulder_y": 0.3,       # Shoulder moved up (0.2 body size - consistent)
            "left_knee_angle": 155.0,      # Still not crouching
            "right_knee_angle": 160.0,     # Still not crouching
        },
        {
            "left_hip_y": 0.45,            # Hip at peak (0.15 total movement > 5%)
            "right_hip_y": 0.45,           # Hip at peak
            "left_shoulder_y": 0.25,       # Shoulder at peak
            "right_shoulder_y": 0.25,      # Shoulder at peak (0.2 body size - consistent)
            "left_knee_angle": 170.0,      # Extended in air
            "right_knee_angle": 175.0,     # Extended in air
        },
        {
            "left_hip_y": 0.55,            # Hip coming down
            "right_hip_y": 0.55,           # Hip coming down
            "left_shoulder_y": 0.35,       # Shoulder coming down
            "right_shoulder_y": 0.35,      # Shoulder coming down (0.2 body size - consistent)
            "left_knee_angle": 165.0,      # Landing with knees not deeply bent
            "right_knee_angle": 160.0,     # Landing with knees not deeply bent
        }
    ]
    
    # Test the classifier (in priority order)
    climber_action = classify_action_from_history(mountain_climber_frames)
    crouch_action = classify_action_from_history(crouch_frames)
    run_action = classify_action_from_history(running_frames)
    jump_action = classify_action_from_history(jump_frames)
    
    print(f"Priority 1 - Crouch detection: {crouch_action}")    # Should print "crouch"
    print(f"Priority 2 - Mountain climber (HIP MOVEMENT): {climber_action}")  # Should print "mountain_climber"
    print(f"Priority 3 - Running detection: {run_action}")     # Should print "run"
    print(f"Priority 4 - Jump detection (UPWARD >8% person height + cooldown): {jump_action}")  # Should print "jump" 