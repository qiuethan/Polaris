import numpy as np
import math

class JointAngleFeatureExtractor:
    """
    A class to extract joint angles from MediaPipe pose landmarks.
    Only calculates angles when all required landmarks are reliably detected.
    """
    
    def __init__(self, min_visibility=0.3):
        # MediaPipe pose landmark indices
        self.landmark_indices = {
            'left_shoulder': 11,
            'right_shoulder': 12,
            'left_elbow': 13,
            'right_elbow': 14,
            'left_wrist': 15,
            'right_wrist': 16,
            'left_hip': 23,
            'right_hip': 24,
            'left_knee': 25,
            'right_knee': 26,
            'left_ankle': 27,
            'right_ankle': 28,
            'left_foot': 31,
            'right_foot': 32
        }
        self.min_visibility = min_visibility
    
    def is_landmark_reliable(self, landmark):
        """
        Check if a landmark is reliable enough for angle calculation
        """
        # Check if the landmark has visibility score and if it's above threshold
        if hasattr(landmark, 'visibility'):
            if landmark.visibility < self.min_visibility:
                return False
        
        # Additional check: reject if coordinates are obviously invalid
        if landmark.x <= 0.0 and landmark.y <= 0.0:
            return False
        if landmark.x >= 1.0 or landmark.y >= 1.0:
            return False
            
        return True
    
    def get_landmark_coords(self, landmarks, landmark_name):
        """
        Extract x, y coordinates from a landmark if it's reliable
        Returns None if landmark is missing or unreliable
        """
        try:
            idx = self.landmark_indices[landmark_name]
            landmark = landmarks.landmark[idx]
            
            # Check if landmark is reliable enough
            if not self.is_landmark_reliable(landmark):
                return None
                
            return np.array([landmark.x, landmark.y])
        except:
            return None
    
    def calculate_angle(self, point_a, point_b, point_c):
        """
        Calculate angle at point_b formed by points a-b-c
        Returns angle in degrees, or None if any point is missing
        """
        # If any point is missing, cannot calculate angle
        if point_a is None or point_b is None or point_c is None:
            return None
        
        # Create vectors BA and BC
        vector_ba = point_a - point_b
        vector_bc = point_c - point_b
        
        # Calculate dot product and magnitudes
        dot_product = np.dot(vector_ba, vector_bc)
        magnitude_ba = np.linalg.norm(vector_ba)
        magnitude_bc = np.linalg.norm(vector_bc)
        
        # Avoid division by zero
        if magnitude_ba == 0 or magnitude_bc == 0:
            return None
        
        # Calculate cosine of angle
        cos_angle = dot_product / (magnitude_ba * magnitude_bc)
        
        # Clip cosine value to avoid math domain errors
        cos_angle = np.clip(cos_angle, -1.0, 1.0)
        
        # Calculate angle in radians and convert to degrees
        angle_rad = math.acos(cos_angle)
        angle_deg = math.degrees(angle_rad)
        
        return angle_deg
    
    def left_knee_angle(self, landmarks):
        """Calculate left knee angle (hip → knee → ankle) - only if all joints detected"""
        if not landmarks:
            return None
        
        hip = self.get_landmark_coords(landmarks, 'left_hip')
        knee = self.get_landmark_coords(landmarks, 'left_knee')
        ankle = self.get_landmark_coords(landmarks, 'left_ankle')
        
        return self.calculate_angle(hip, knee, ankle)
    
    def right_knee_angle(self, landmarks):
        """Calculate right knee angle (hip → knee → ankle) - only if all joints detected"""
        if not landmarks:
            return None
        
        hip = self.get_landmark_coords(landmarks, 'right_hip')
        knee = self.get_landmark_coords(landmarks, 'right_knee')
        ankle = self.get_landmark_coords(landmarks, 'right_ankle')
        
        return self.calculate_angle(hip, knee, ankle)
    
    def left_hip_angle(self, landmarks):
        """Calculate left hip angle (shoulder → hip → knee) - only if all joints detected"""
        if not landmarks:
            return None
        
        shoulder = self.get_landmark_coords(landmarks, 'left_shoulder')
        hip = self.get_landmark_coords(landmarks, 'left_hip')
        knee = self.get_landmark_coords(landmarks, 'left_knee')
        
        return self.calculate_angle(shoulder, hip, knee)
    
    def right_hip_angle(self, landmarks):
        """Calculate right hip angle (shoulder → hip → knee) - only if all joints detected"""
        if not landmarks:
            return None
        
        shoulder = self.get_landmark_coords(landmarks, 'right_shoulder')
        hip = self.get_landmark_coords(landmarks, 'right_hip')
        knee = self.get_landmark_coords(landmarks, 'right_knee')
        
        return self.calculate_angle(shoulder, hip, knee)
    
    def left_elbow_angle(self, landmarks):
        """Calculate left elbow angle (shoulder → elbow → wrist) - only if all joints detected"""
        if not landmarks:
            return None
        
        shoulder = self.get_landmark_coords(landmarks, 'left_shoulder')
        elbow = self.get_landmark_coords(landmarks, 'left_elbow')
        wrist = self.get_landmark_coords(landmarks, 'left_wrist')
        
        return self.calculate_angle(shoulder, elbow, wrist)
    
    def right_elbow_angle(self, landmarks):
        """Calculate right elbow angle (shoulder → elbow → wrist) - only if all joints detected"""
        if not landmarks:
            return None
        
        shoulder = self.get_landmark_coords(landmarks, 'right_shoulder')
        elbow = self.get_landmark_coords(landmarks, 'right_elbow')
        wrist = self.get_landmark_coords(landmarks, 'right_wrist')
        
        return self.calculate_angle(shoulder, elbow, wrist)
    
    def left_shoulder_angle(self, landmarks):
        """Calculate left shoulder angle (elbow → shoulder → hip) - only if all joints detected"""
        if not landmarks:
            return None
        
        elbow = self.get_landmark_coords(landmarks, 'left_elbow')
        shoulder = self.get_landmark_coords(landmarks, 'left_shoulder')
        hip = self.get_landmark_coords(landmarks, 'left_hip')
        
        return self.calculate_angle(elbow, shoulder, hip)
    
    def right_shoulder_angle(self, landmarks):
        """Calculate right shoulder angle (elbow → shoulder → hip) - only if all joints detected"""
        if not landmarks:
            return None
        
        elbow = self.get_landmark_coords(landmarks, 'right_elbow')
        shoulder = self.get_landmark_coords(landmarks, 'right_shoulder')
        hip = self.get_landmark_coords(landmarks, 'right_hip')
        
        return self.calculate_angle(elbow, shoulder, hip)
    
    def left_ankle_angle(self, landmarks):
        """Calculate left ankle angle (knee → ankle → foot) - only if all joints detected"""
        if not landmarks:
            return None
        
        knee = self.get_landmark_coords(landmarks, 'left_knee')
        ankle = self.get_landmark_coords(landmarks, 'left_ankle')
        foot = self.get_landmark_coords(landmarks, 'left_foot')
        
        return self.calculate_angle(knee, ankle, foot)
    
    def right_ankle_angle(self, landmarks):
        """Calculate right ankle angle (knee → ankle → foot) - only if all joints detected"""
        if not landmarks:
            return None
        
        knee = self.get_landmark_coords(landmarks, 'right_knee')
        ankle = self.get_landmark_coords(landmarks, 'right_ankle')
        foot = self.get_landmark_coords(landmarks, 'right_foot')
        
        return self.calculate_angle(knee, ankle, foot)
    
    def compute_all_angles(self, landmarks):
        """
        Compute all joint angles and return as a dictionary
        Only includes angles where all required joints were detected
        """
        all_angles = {
            "left_knee_angle": self.left_knee_angle(landmarks),
            "right_knee_angle": self.right_knee_angle(landmarks),
            "left_hip_angle": self.left_hip_angle(landmarks),
            "right_hip_angle": self.right_hip_angle(landmarks),
            "left_ankle_angle": self.left_ankle_angle(landmarks),
            "right_ankle_angle": self.right_ankle_angle(landmarks),
            "left_elbow_angle": self.left_elbow_angle(landmarks),
            "right_elbow_angle": self.right_elbow_angle(landmarks),
            "left_shoulder_angle": self.left_shoulder_angle(landmarks),
            "right_shoulder_angle": self.right_shoulder_angle(landmarks)
        }
        
        # Only return angles that were successfully calculated (not None)
        valid_angles = {k: v for k, v in all_angles.items() if v is not None}
        return valid_angles 