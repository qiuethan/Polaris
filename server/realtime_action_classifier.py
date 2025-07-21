import numpy as np

MIN_LANDMARKS = 33
MAX_LANDMARKS = 33

class RealtimeActionClassifier:
    def __init__(self):
        self.buffer = []

    def validate_landmarks(self, landmarks):
        if not isinstance(landmarks, (list, tuple)):
            return False
        if len(landmarks) != MIN_LANDMARKS:
            return False
        for lm in landmarks:
            if not isinstance(lm, (list, tuple)) or len(lm) != 3:
                return False
            # Ensure numbers are finite
            if not all(np.isfinite(x) for x in lm):
                return False
        return True

    def process(self, landmarks):
        if not self.validate_landmarks(landmarks):
            raise ValueError("Malformed landmark data")
        self.buffer.append(landmarks)
        # Keep last N frames
        if len(self.buffer) > 10:
            self.buffer.pop(0)
        # Perform temporal classification
        return "action_label"
