import math
import numpy as np
from collections import deque
from typing import List, Optional, Tuple, Dict

class ActionClassifier:
    """
    Real-time action classifier using MediaPipe pose landmarks.
    
    Detects: jump, run, crouch, mountain_climber, none
    Uses temporal analysis over 30-frame buffer for robust classification.
    """
    
    def __init__(self, buffer_size: int = 5):
        """
        Initialize the action classifier.
        
        Args:
            buffer_size: Number of frames to keep in history buffer (reduced for faster response)
        """
        self.buffer_size = buffer_size
        self.pose_buffer = deque(maxlen=buffer_size)
        self.current_action = "none"
        
        # MediaPipe pose landmark indices
        self.landmarks = {
            'nose': 0,
            'left_eye_inner': 1, 'left_eye': 2, 'left_eye_outer': 3,
            'right_eye_inner': 4, 'right_eye': 5, 'right_eye_outer': 6,
            'left_ear': 7, 'right_ear': 8,
            'mouth_left': 9, 'mouth_right': 10,
            'left_shoulder': 11, 'right_shoulder': 12,
            'left_elbow': 13, 'right_elbow': 14,
            'left_wrist': 15, 'right_wrist': 16,
            'left_pinky': 17, 'right_pinky': 18,
            'left_index': 19, 'right_index': 20,
            'left_thumb': 21, 'right_thumb': 22,
            'left_hip': 23, 'right_hip': 24,
            'left_knee': 25, 'right_knee': 26,
            'left_ankle': 27, 'right_ankle': 28,
            'left_heel': 29, 'right_heel': 30,
            'left_foot_index': 31, 'right_foot_index': 32
        }
    
    def get_joint_angle(self, point_a: Tuple[float, float], 
                       point_b: Tuple[float, float], 
                       point_c: Tuple[float, float]) -> Optional[float]:
        """
        Calculate angle at point_b formed by points a-b-c.
        
        Args:
            point_a: First point (x, y)
            point_b: Middle point (vertex of angle) (x, y)
            point_c: Third point (x, y)
            
        Returns:
            Angle in degrees, or None if calculation fails
        """
        try:
            # Convert to numpy arrays for vector calculations
            a = np.array(point_a)
            b = np.array(point_b)
            c = np.array(point_c)
            
            # Create vectors BA and BC
            ba = a - b
            bc = c - b
            
            # Calculate cosine of angle using dot product
            cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
            
            # Clamp to valid range to avoid numerical errors
            cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
            
            # Convert to degrees
            angle = math.degrees(math.acos(cosine_angle))
            
            return angle
            
        except (ValueError, ZeroDivisionError):
            return None
    
    def extract_landmark_coords(self, landmarks, landmark_name: str) -> Optional[Tuple[float, float]]:
        """
        Extract x, y coordinates from a landmark.
        
        Args:
            landmarks: MediaPipe pose landmarks
            landmark_name: Name of the landmark to extract
            
        Returns:
            (x, y) coordinates or None if landmark is missing/invalid
        """
        try:
            if landmark_name not in self.landmarks:
                return None
                
            idx = self.landmarks[landmark_name]
            if idx >= len(landmarks.landmark):
                return None
                
            landmark = landmarks.landmark[idx]
            
            # Check if landmark has reasonable visibility
            if hasattr(landmark, 'visibility') and landmark.visibility < 0.3:
                return None
                
            return (landmark.x, landmark.y)
            
        except (AttributeError, IndexError):
            return None
    
    def get_knee_angle(self, landmarks, side: str) -> Optional[float]:
        """
        Calculate knee angle (hip -> knee -> ankle).
        
        Args:
            landmarks: MediaPipe pose landmarks
            side: "left" or "right"
            
        Returns:
            Knee angle in degrees or None if calculation fails
        """
        hip = self.extract_landmark_coords(landmarks, f'{side}_hip')
        knee = self.extract_landmark_coords(landmarks, f'{side}_knee')
        ankle = self.extract_landmark_coords(landmarks, f'{side}_ankle')
        
        if hip is None or knee is None or ankle is None:
            return None
            
        return self.get_joint_angle(hip, knee, ankle)
    
    def get_hip_height(self, landmarks) -> Optional[float]:
        """
        Get average hip height (y-coordinate).
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            Average hip y-coordinate or None if hips not detected
        """
        left_hip = self.extract_landmark_coords(landmarks, 'left_hip')
        right_hip = self.extract_landmark_coords(landmarks, 'right_hip')
        
        if left_hip is None and right_hip is None:
            return None
        elif left_hip is None and right_hip is not None:
            return right_hip[1]
        elif right_hip is None and left_hip is not None:
            return left_hip[1]
        elif left_hip is not None and right_hip is not None:
            return (left_hip[1] + right_hip[1]) / 2
        else:
            return None
    
    def get_ankle_height(self, landmarks) -> Optional[float]:
        """
        Get average ankle height (y-coordinate).
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            Average ankle y-coordinate or None if ankles not detected
        """
        left_ankle = self.extract_landmark_coords(landmarks, 'left_ankle')
        right_ankle = self.extract_landmark_coords(landmarks, 'right_ankle')
        
        if left_ankle is None and right_ankle is None:
            return None
        elif left_ankle is None and right_ankle is not None:
            return right_ankle[1]
        elif right_ankle is None and left_ankle is not None:
            return left_ankle[1]
        elif left_ankle is not None and right_ankle is not None:
            return (left_ankle[1] + right_ankle[1]) / 2
        else:
            return None
    
    def get_torso_angle(self, landmarks) -> Optional[float]:
        """
        Calculate torso angle (shoulder -> hip -> vertical).
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            Torso angle in degrees or None if calculation fails
        """
        # Use average shoulder and hip positions
        left_shoulder = self.extract_landmark_coords(landmarks, 'left_shoulder')
        right_shoulder = self.extract_landmark_coords(landmarks, 'right_shoulder')
        left_hip = self.extract_landmark_coords(landmarks, 'left_hip')
        right_hip = self.extract_landmark_coords(landmarks, 'right_hip')
        
        if not all([left_shoulder, right_shoulder, left_hip, right_hip]):
            return None
        
        # Calculate average positions - all values are guaranteed not None from the check above
        assert left_shoulder is not None and right_shoulder is not None
        assert left_hip is not None and right_hip is not None
        
        avg_shoulder = ((left_shoulder[0] + right_shoulder[0]) / 2, 
                       (left_shoulder[1] + right_shoulder[1]) / 2)
        avg_hip = ((left_hip[0] + right_hip[0]) / 2, 
                  (left_hip[1] + right_hip[1]) / 2)
        
        # Create vertical reference point
        vertical_point = (avg_hip[0], avg_hip[1] - 0.1)  # Point above hip
        
        return self.get_joint_angle(avg_shoulder, avg_hip, vertical_point)
    
    def analyze_temporal_patterns(self) -> Dict[str, float]:
        """
        Analyze patterns across the pose buffer.
        
        Returns:
            Dictionary of temporal features for classification
        """
        if len(self.pose_buffer) < 3:
            return {}
        
        features = {}
        
        # Extract temporal data
        left_knee_angles = []
        right_knee_angles = []
        hip_heights = []
        ankle_heights = []
        torso_angles = []
        
        for landmarks in self.pose_buffer:
            # Knee angles
            left_knee = self.get_knee_angle(landmarks, 'left')
            right_knee = self.get_knee_angle(landmarks, 'right')
            if left_knee is not None:
                left_knee_angles.append(left_knee)
            if right_knee is not None:
                right_knee_angles.append(right_knee)
            
            # Heights
            hip_height = self.get_hip_height(landmarks)
            ankle_height = self.get_ankle_height(landmarks)
            if hip_height is not None:
                hip_heights.append(hip_height)
            if ankle_height is not None:
                ankle_heights.append(ankle_height)
            
            # Torso angle
            torso_angle = self.get_torso_angle(landmarks)
            if torso_angle is not None:
                torso_angles.append(torso_angle)
        
        # Calculate features
        if left_knee_angles and right_knee_angles:
            all_knee_angles = left_knee_angles + right_knee_angles
            features['avg_knee_angle'] = np.mean(all_knee_angles)
            features['knee_angle_std'] = np.std(all_knee_angles)
            
            # Leg alternation detection (reduced requirement for faster response)
            if len(left_knee_angles) >= 2 and len(right_knee_angles) >= 2:
                # Count how often left vs right knee angles cross over
                min_len = min(len(left_knee_angles), len(right_knee_angles))
                left_subset = left_knee_angles[:min_len]
                right_subset = right_knee_angles[:min_len]
                
                crossovers = 0
                for i in range(1, min_len):
                    if ((left_subset[i-1] - right_subset[i-1]) * 
                        (left_subset[i] - right_subset[i]) < 0):
                        crossovers += 1
                
                features['leg_alternation'] = crossovers
            else:
                features['leg_alternation'] = 0
        
        if hip_heights:
            features['avg_hip_height'] = np.mean(hip_heights)
            features['hip_height_std'] = np.std(hip_heights)
            features['hip_range'] = max(hip_heights) - min(hip_heights)
        
        if ankle_heights:
            features['avg_ankle_height'] = np.mean(ankle_heights)
            features['ankle_height_std'] = np.std(ankle_heights)
            features['ankle_range'] = max(ankle_heights) - min(ankle_heights)
        
        if torso_angles:
            features['avg_torso_angle'] = np.mean(torso_angles)
            features['torso_angle_std'] = np.std(torso_angles)
        
        return features
    
    def classify_action(self, features: Dict[str, float]) -> str:
        """
        Classify action based on temporal features.
        
        Args:
            features: Dictionary of extracted temporal features
            
        Returns:
            Classified action: "jump", "run", "crouch", "mountain_climber", or "none"
        """
        if not features:
            return "none"
        
        # === CROUCH DETECTION ===
        # Low knee angles, stable position (more sensitive)
        if (features.get('avg_knee_angle', 180) < 110 and
            features.get('knee_angle_std', 0) < 20):
            return "crouch"
        
        # === JUMP DETECTION ===
        # Extended knees, ankle movement indicating feet leaving ground (much more sensitive)
        if (features.get('avg_knee_angle', 0) > 130 and  # Reduced from 140 to 130
            features.get('ankle_range', 0) > 0.01 and   # Reduced from 0.02 to 0.01 (50% more sensitive)
            features.get('leg_alternation', 0) < 2):     # Legs move together
            return "jump"
        
        # === MOUNTAIN CLIMBER DETECTION ===
        # Low torso angle, leg alternation, variable knee angles (more sensitive)
        if (features.get('avg_torso_angle', 90) < 60 and
            features.get('leg_alternation', 0) > 1 and
            features.get('knee_angle_std', 0) > 15):
            return "mountain_climber"
        
        # === RUN DETECTION ===
        # Leg alternation, knee movement, hip oscillation (original sensitivity)
        if (features.get('leg_alternation', 0) > 1 and
            features.get('knee_angle_std', 0) > 10 and
            features.get('hip_range', 0) > 0.01):
            return "run"
        
        # === DEFAULT ===
        return "none"
    
    def process_frame(self, landmarks) -> str:
        """
        Process a single frame of pose landmarks.
        
        Args:
            landmarks: MediaPipe pose landmarks for current frame
            
        Returns:
            Classified action for current frame
        """
        if landmarks is None:
            return "none"
        
        # Add current frame to buffer
        self.pose_buffer.append(landmarks)
        
        # Analyze temporal patterns
        features = self.analyze_temporal_patterns()
        
        # Classify action
        self.current_action = self.classify_action(features)
        
        return self.current_action
    
    def get_current_action(self) -> str:
        """
        Get the current classified action.
        
        Returns:
            Current action classification
        """
        return self.current_action
    
    def reset(self):
        """
        Reset the classifier state.
        """
        self.pose_buffer.clear()
        self.current_action = "none"
    
    def get_debug_info(self) -> Dict:
        """
        Get debug information about current state.
        
        Returns:
            Dictionary with buffer size, current action, and recent features
        """
        features = self.analyze_temporal_patterns()
        return {
            'buffer_size': len(self.pose_buffer),
            'current_action': self.current_action,
            'features': features
        }


# Example usage and testing
if __name__ == "__main__":
    # Example usage
    classifier = ActionClassifier(buffer_size=30)
    
    # Simulate processing frames
    print("ActionClassifier initialized")
    print(f"Buffer size: {classifier.buffer_size}")
    print(f"Current action: {classifier.get_current_action()}")
    
    # In real usage, you would call:
    # action = classifier.process_frame(pose_landmarks)
    # print(f"Detected action: {action}")
    
    print("\nReady to process MediaPipe pose landmarks!")
    print("Call classifier.process_frame(landmarks) for each frame")
    print("Actions detected: jump, run, crouch, mountain_climber, none") 