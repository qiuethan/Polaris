#!/usr/bin/env python3
"""
Test script to demonstrate directional head turn calculation
"""

from joint_angle_extractor import JointAngleFeatureExtractor
import numpy as np

# Create a simple mock landmark class
class MockLandmark:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.visibility = 0.9

class MockLandmarks:
    def __init__(self, landmark_dict):
        # Initialize with proper typing - list can contain MockLandmark or None
        self.landmark = []
        for i in range(33):  # MediaPipe has 33 pose landmarks
            self.landmark.append(None)
        
        # Set the landmarks we care about
        if 'nose' in landmark_dict:
            self.landmark[0] = MockLandmark(*landmark_dict['nose'])
        if 'left_ear' in landmark_dict:
            self.landmark[7] = MockLandmark(*landmark_dict['left_ear'])
        if 'right_ear' in landmark_dict:
            self.landmark[8] = MockLandmark(*landmark_dict['right_ear'])
        if 'left_shoulder' in landmark_dict:
            self.landmark[11] = MockLandmark(*landmark_dict['left_shoulder'])
        if 'right_shoulder' in landmark_dict:
            self.landmark[12] = MockLandmark(*landmark_dict['right_shoulder'])

def test_head_turns():
    print("🧠 Testing Shoulder-Relative Head Turn Detection")
    print("=" * 50)
    print("📐 NEW APPROACH: Head turn measured relative to shoulder orientation")
    print("👤 Body Reference Frame: LEFT/RIGHT based on shoulder line, not camera")
    print("🎯 This works even when body is angled relative to camera!")
    print()
    
    extractor = JointAngleFeatureExtractor()
    
    # Test cases: head positions relative to shoulder orientation
    test_cases = [
        {
            'name': '👀 Looking Straight Ahead (Body Facing Camera)',
            'landmarks': {
                'nose': (0.5, 0.25),       # Center between ears
                'left_ear': (0.4, 0.3),    # Person's left ear
                'right_ear': (0.6, 0.3),   # Person's right ear
                'left_shoulder': (0.35, 0.5),  # Person's left shoulder
                'right_shoulder': (0.65, 0.5)  # Person's right shoulder
            }
        },
        {
            'name': '➡️ Head Turned RIGHT Relative to Shoulders',
            'landmarks': {
                'nose': (0.55, 0.25),      # Nose moved toward right shoulder
                'left_ear': (0.4, 0.3),    # Left ear position
                'right_ear': (0.6, 0.3),   # Right ear position  
                'left_shoulder': (0.35, 0.5),  # Person's left shoulder
                'right_shoulder': (0.65, 0.5)  # Person's right shoulder
            }
        },
        {
            'name': '⬅️ Head Turned LEFT Relative to Shoulders', 
            'landmarks': {
                'nose': (0.45, 0.25),      # Nose moved toward left shoulder
                'left_ear': (0.4, 0.3),    # Left ear position
                'right_ear': (0.6, 0.3),   # Right ear position
                'left_shoulder': (0.35, 0.5),  # Person's left shoulder
                'right_shoulder': (0.65, 0.5)  # Person's right shoulder
            }
        },
        {
            'name': '🔄 Body Turned, Head Straight Relative to Body',
            'landmarks': {
                'nose': (0.55, 0.25),      # Nose follows body orientation
                'left_ear': (0.45, 0.3),   # Ears rotated with body
                'right_ear': (0.65, 0.3),   
                'left_shoulder': (0.4, 0.5),   # Shoulders angled
                'right_shoulder': (0.7, 0.5)   
            }
        }
    ]
    
    for test_case in test_cases:
        print(f"\n{test_case['name']}:")
        mock_landmarks = MockLandmarks(test_case['landmarks'])
        
        head_turn = extractor.head_turn_angle(mock_landmarks)
        
        if head_turn is not None:
            if head_turn > 0:
                direction = "RIGHT"
                print(f"  Head Turn: {head_turn:.1f}° {direction}")
            elif head_turn < 0:
                direction = "LEFT"
                print(f"  Head Turn: {abs(head_turn):.1f}° {direction}")
            else:
                print(f"  Head Turn: 0.0° CENTER")
        else:
            print("  Head Turn: N/A (missing landmarks)")
    
    print("\n✅ Shoulder-relative head turn detection ready!")
    print("📊 In the tracker, you'll see:")
    print("   • Head Turn: X.X° RIGHT (when turning head right relative to shoulders)")
    print("   • Head Turn: X.X° LEFT (when turning head left relative to shoulders)")  
    print("   • Head Turn: 0.0° CENTER (when head aligned with shoulder orientation)")
    print("🎯 This measurement is independent of camera angle and body position!")

if __name__ == "__main__":
    test_head_turns() 