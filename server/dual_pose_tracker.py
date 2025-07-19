import cv2
import mediapipe as mp
import numpy as np
from joint_angle_extractor import JointAngleFeatureExtractor

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
    
    def draw_angle_info(self, frame, angles, side="left"):
        """Draw joint angle information on the frame - only shows detected angles"""
        
        # Choose color and position based on side  
        valid_color = (255, 0, 0)  # Pure blue for valid angles (BGR format)
        missing_color = (80, 80, 80)  # Dark gray for missing angles
        start_y = 50
        x_offset = 10 if side == "left" else frame.shape[1] - 200
        
        # All possible angles we track
        all_angle_labels = {
            f"{side}_knee_angle": f"{side.title()} Knee",
            f"{side}_hip_angle": f"{side.title()} Hip", 
            f"{side}_ankle_angle": f"{side.title()} Ankle",
            f"{side}_elbow_angle": f"{side.title()} Elbow",
            f"{side}_shoulder_angle": f"{side.title()} Shoulder"
        }
        
        y_position = start_y
        detected_count = 0
        
        for angle_key, label in all_angle_labels.items():
            if angle_key in angles and angles[angle_key] is not None:
                # Angle was successfully calculated
                angle_value = angles[angle_key]
                text = f"{label}: {angle_value:.1f}°"
                color = valid_color
                detected_count += 1
            else:
                # Angle could not be calculated (missing joints)
                text = f"{label}: N/A"
                color = missing_color
            
            cv2.putText(frame, text, (x_offset, y_position), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            y_position += 22
        
        # Show detection status
        status_text = f"{side.title()}: {detected_count}/5 angles"
        status_color = valid_color if detected_count > 0 else missing_color
        cv2.putText(frame, status_text, (x_offset, y_position + 10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, status_color, 1)
    
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
        
        # Add a vertical line to separate the two halves
        cv2.line(left_half, (left_half.shape[1]-1, 0), (left_half.shape[1]-1, height), (0, 255, 0), 2)
        cv2.line(right_half, (0, 0), (0, height), (0, 255, 0), 2)
        
        # Recombine the two halves
        combined_frame = np.hstack((left_half, right_half))
        
        return combined_frame
    
    def run(self):
        """Main loop to capture and process webcam frames"""
        # Initialize webcam
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("Error: Could not open webcam")
            return
        
        print("Dual Pose Tracker started. Press ESC to exit.")
        print("Blue angles = detected joints | Gray angles = missing joints")
        
        try:
            while True:
                # Capture frame from webcam
                ret, frame = cap.read()
                
                if not ret:
                    print("Error: Could not read frame from webcam")
                    break
                
                # Flip frame horizontally for mirror effect
                frame = cv2.flip(frame, 1)
                
                # Process frame with dual pose tracking
                processed_frame = self.process_frame(frame)
                
                # Add title text
                cv2.putText(processed_frame, "Dual Pose Tracker - Only Real Joint Angles", 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
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