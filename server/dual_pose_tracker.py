import cv2
import mediapipe as mp
import numpy as np
import time
from joint_angle_extractor import JointAngleFeatureExtractor
from action_classifier import classify_action_from_history
from collections import deque

class DualPoseTracker:
    def __init__(self):
        # Initialize MediaPipe pose solutions
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # Create two separate pose estimators for left and right halves
        self.pose_left = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        self.pose_right = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Initialize joint angle feature extractors for both sides
        self.angle_extractor_left = JointAngleFeatureExtractor()
        self.angle_extractor_right = JointAngleFeatureExtractor()
        
        # Action classification setup - separate for each side
        self.left_angle_history = deque(maxlen=5)   # Store last 5 frames for movement detection
        self.right_angle_history = deque(maxlen=5)  # Store last 5 frames for movement detection
        self.left_action = "unknown"
        self.right_action = "unknown"
        
        # Track previous actions to detect new instances
        self.prev_left_action = "unknown"
        self.prev_right_action = "unknown"
        
        # Simple immediate action detection - no smoothing needed
    
    def draw_angle_info(self, frame, angles, side="left"):
        """Draw joint angle information showing BOTH left and right limbs individually"""
        
        # Colors for different limb sides
        left_limb_color = (255, 100, 0)   # Blue for left limbs (BGR format)
        right_limb_color = (0, 165, 255)  # Orange for right limbs (BGR format)
        missing_color = (80, 80, 80)      # Dark gray for missing angles
        
        start_y = 30
        x_offset = 10 if side == "left" else frame.shape[1] - 250
        
        # Show both left and right limb angles for each joint type
        joint_types = ['knee', 'hip', 'ankle', 'elbow', 'shoulder']
        
        y_position = start_y
        total_detected = 0
        
        # Header
        header_text = f"{'Left Half' if side == 'left' else 'Right Half'} - Individual Limbs"
        cv2.putText(frame, header_text, (x_offset, y_position), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        y_position += 25
        
        for joint_type in joint_types:
            # Left limb angle
            left_key = f"left_{joint_type}_angle"
            right_key = f"right_{joint_type}_angle"
            
            # Left limb
            if left_key in angles and angles[left_key] is not None:
                left_text = f"L-{joint_type.title()}: {angles[left_key]:.1f}°"
                left_color = left_limb_color
                total_detected += 1
            else:
                left_text = f"L-{joint_type.title()}: N/A"
                left_color = missing_color
            
            # Right limb  
            if right_key in angles and angles[right_key] is not None:
                right_text = f"R-{joint_type.title()}: {angles[right_key]:.1f}°"
                right_color = right_limb_color
                total_detected += 1
            else:
                right_text = f"R-{joint_type.title()}: N/A"
                right_color = missing_color
            
            # Draw left limb angle
            cv2.putText(frame, left_text, (x_offset, y_position), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.45, left_color, 2)
            
            # Draw right limb angle (offset to the right)
            cv2.putText(frame, right_text, (x_offset + 120, y_position), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.45, right_color, 2)
            
            y_position += 20
        
        # Show detection status
        status_text = f"Detected: {total_detected}/10 limb angles"
        status_color = left_limb_color if total_detected > 0 else missing_color
        cv2.putText(frame, status_text, (x_offset, y_position + 10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, status_color, 1)
        
        # Add legend
        legend_y = y_position + 35
        cv2.putText(frame, "L = Left Limb", (x_offset, legend_y), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.35, left_limb_color, 1)
        cv2.putText(frame, "R = Right Limb", (x_offset + 100, legend_y), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.35, right_limb_color, 1)
    

    
    def draw_action_info(self, frame):
        """Draw the detected actions for both sides on the frame"""
        # Action colors
        action_colors = {
            "jump": (0, 255, 255),      # Yellow
            "run": (0, 255, 0),         # Green  
            "crouch": (255, 0, 255),    # Magenta
            "mountain_climber": (0, 165, 255),  # Orange
            "unknown": (128, 128, 128)     # Gray
        }
        
        frame_width = frame.shape[1]
        frame_height = frame.shape[0]
        
        # === LEFT SIDE ACTION ===
        left_text = f"LEFT: {self.left_action.upper()}"
        left_color = action_colors.get(self.left_action, (128, 128, 128))
        
        # Position on left quarter of frame
        left_text_size = cv2.getTextSize(left_text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)[0]
        left_x = (frame_width // 4) - (left_text_size[0] // 2)
        left_y = 100
        
        # Background rectangle for left action
        cv2.rectangle(frame, (left_x - 10, left_y - 30), (left_x + left_text_size[0] + 10, left_y + 10), (0, 0, 0), -1)
        cv2.rectangle(frame, (left_x - 10, left_y - 30), (left_x + left_text_size[0] + 10, left_y + 10), left_color, 2)
        cv2.putText(frame, left_text, (left_x, left_y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, left_color, 2)
        
        # === RIGHT SIDE ACTION ===
        right_text = f"RIGHT: {self.right_action.upper()}"
        right_color = action_colors.get(self.right_action, (128, 128, 128))
        
        # Position on right quarter of frame
        right_text_size = cv2.getTextSize(right_text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)[0]
        right_x = (3 * frame_width // 4) - (right_text_size[0] // 2)
        right_y = 100
        
        # Background rectangle for right action
        cv2.rectangle(frame, (right_x - 10, right_y - 30), (right_x + right_text_size[0] + 10, right_y + 10), (0, 0, 0), -1)
        cv2.rectangle(frame, (right_x - 10, right_y - 30), (right_x + right_text_size[0] + 10, right_y + 10), right_color, 2)
        cv2.putText(frame, right_text, (right_x, right_y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, right_color, 2)
    
    def process_frame(self, frame):
        """Process a frame and return it with pose landmarks drawn"""
        height, width = frame.shape[:2]
        mid_point = width // 2
        
        # Split frame into left and right halves
        left_half = frame[:, :mid_point].copy()
        right_half = frame[:, mid_point:].copy()
        
        # Convert BGR to RGB for MediaPipe processing
        left_rgb = cv2.cvtColor(left_half, cv2.COLOR_BGR2RGB)
        right_rgb = cv2.cvtColor(right_half, cv2.COLOR_BGR2RGB)
        
        # Process poses on each half
        left_results = self.pose_left.process(left_rgb)
        right_results = self.pose_right.process(right_rgb)
        
        # Draw landmarks and calculate angles for left half
        left_angles = {}
        if left_results.pose_landmarks:
            self.mp_drawing.draw_landmarks(
                left_half,
                left_results.pose_landmarks,
                self.mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=self.mp_drawing_styles.get_default_pose_landmarks_style()
            )
            # Calculate joint angles for left side (only returns successfully calculated angles)
            left_angles = self.angle_extractor_left.compute_all_angles(left_results.pose_landmarks)
        
        # Draw landmarks and calculate angles for right half
        right_angles = {}
        if right_results.pose_landmarks:
            self.mp_drawing.draw_landmarks(
                right_half,
                right_results.pose_landmarks,
                self.mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=self.mp_drawing_styles.get_default_pose_landmarks_style()
            )
            # Calculate joint angles for right side (only returns successfully calculated angles)
            right_angles = self.angle_extractor_right.compute_all_angles(right_results.pose_landmarks)
        
        # Draw angle information on each half
        self.draw_angle_info(left_half, left_angles, "left")
        self.draw_angle_info(right_half, right_angles, "right")
        
        # === ACTION CLASSIFICATION - SEPARATE FOR EACH SIDE ===
        # Add to history buffers for each side
        if left_angles:  # Only add if we have some angle data
            self.left_angle_history.append(left_angles)
        
        if right_angles:  # Only add if we have some angle data
            self.right_angle_history.append(right_angles)
        
        # Run classification every frame for immediate detection
        if len(self.left_angle_history) >= 1:
            try:
                self.left_action = classify_action_from_history(list(self.left_angle_history))
            except Exception as e:
                print(f"Left side classification error: {e}")
                self.left_action = "unknown"
        else:
            self.left_action = "unknown"
        
        if len(self.right_angle_history) >= 1:
            try:
                self.right_action = classify_action_from_history(list(self.right_angle_history))
            except Exception as e:
                print(f"Right side classification error: {e}")
                self.right_action = "unknown"
        else:
            self.right_action = "unknown"
        
        # === LOG NEW ACTION INSTANCES ===
        # Left side - detect transitions from unknown to action
        if self.prev_left_action == "unknown" and self.left_action != "unknown":
            if self.left_action == "crouch":
                print("🦵 LEFT SIDE: 1 crouch detected!")
            elif self.left_action == "mountain_climber":
                print("🧗 LEFT SIDE: 1 mountain climber kick detected!")
        
        # Right side - detect transitions from unknown to action  
        if self.prev_right_action == "unknown" and self.right_action != "unknown":
            if self.right_action == "crouch":
                print("🦵 RIGHT SIDE: 1 crouch detected!")
            elif self.right_action == "mountain_climber":
                print("🧗 RIGHT SIDE: 1 mountain climber kick detected!")
        
        # Update previous actions for next frame
        self.prev_left_action = self.left_action
        self.prev_right_action = self.right_action
        
        # Add a vertical line to separate the two halves
        cv2.line(left_half, (left_half.shape[1]-1, 0), (left_half.shape[1]-1, height), (0, 255, 0), 2)
        cv2.line(right_half, (0, 0), (0, height), (0, 255, 0), 2)
        
        # Recombine the two halves
        combined_frame = np.hstack((left_half, right_half))
        
        # Draw action information on the combined frame
        self.draw_action_info(combined_frame)
        
        return combined_frame
    
    def run(self):
        """Main loop to capture and process webcam frames"""
        # Initialize webcam
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("Error: Could not open webcam")
            return
        
        # Give camera time to initialize and warm up
        print("Initializing camera, please wait...")
        time.sleep(2)  # Wait 2 seconds for camera to initialize
        
        # Test camera by reading a few frames to ensure it's working
        print("Testing camera connection...")
        for i in range(5):
            ret, test_frame = cap.read()
            if ret and test_frame is not None:
                print(f"Camera test {i+1}/5: ✓")
                time.sleep(0.2)  # Small delay between test reads
            else:
                print(f"Camera test {i+1}/5: ✗ (retrying...)")
                time.sleep(0.5)  # Longer delay on failure
        
        print("✨ SIMPLIFIED Dual Pose Tracker started. Press ESC to exit.")
        print("🔵 Blue = Left limbs | 🟠 Orange = Right limbs | Gray = Missing joints")
        print("📊 Tracking: Left/Right Knee, Hip, Ankle, Elbow, Shoulder angles")
        print("🎯 ACTION DETECTION:")
        print("   🦵 CROUCH: Both knees bent < 110°")
        print("   🧗 MOUNTAIN CLIMBER: Arms > 150° + Shoulders < 130° + Hip movement > 7°")
        print("⚡ Instant response with SENSITIVE detection!")
        print("📝 Console logging: Each new action instance will be logged!")
        
        try:
            consecutive_failures = 0
            max_failures = 10  # Allow up to 10 consecutive failures before giving up
            
            while True:
                # Capture frame from webcam
                ret, frame = cap.read()
                
                if not ret:
                    consecutive_failures += 1
                    print(f"Warning: Could not read frame from webcam (attempt {consecutive_failures})")
                    
                    if consecutive_failures >= max_failures:
                        print("Error: Too many consecutive frame read failures. Exiting...")
                        break
                    
                    # Brief pause before retrying
                    time.sleep(0.1)
                    continue
                
                # Reset failure counter on successful read
                consecutive_failures = 0
                
                # Validate frame is not empty or corrupted
                if frame is None or frame.size == 0:
                    print("Warning: Received empty frame, skipping...")
                    continue
                
                # Flip frame horizontally for mirror effect
                frame = cv2.flip(frame, 1)
                
                # Process frame with dual pose tracking
                processed_frame = self.process_frame(frame)
                
                # Add title text
                cv2.putText(processed_frame, "Dual Pose Tracker - Joint Angles + Separate Action Detection", 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                cv2.putText(processed_frame, "Press ESC to exit", 
                           (10, processed_frame.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
                
                # Display the frame
                cv2.imshow('Dual Pose Tracker', processed_frame)
                
                # Check for ESC key press (key code 27)
                key = cv2.waitKey(1) & 0xFF
                if key == 27:  # ESC key
                    print("ESC pressed. Exiting...")
                    break
                    
        except KeyboardInterrupt:
            print("Interrupted by user")
        
        finally:
            # Clean up
            cap.release()
            cv2.destroyAllWindows()
            self.pose_left.close()
            self.pose_right.close()

def main():
    """Main function to start the dual pose tracker"""
    tracker = DualPoseTracker()
    tracker.run()

if __name__ == "__main__":
    main() 