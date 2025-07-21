from collections import deque
import numpy as np

# Keep only the N most recent inputs to bound memory usage
MAX_HISTORY = 50

class ActionClassifier:
    def __init__(self):
        # Use deque with maxlen to cap history
        self.history = deque(maxlen=MAX_HISTORY)

    def update(self, features: np.ndarray):
        # Validate input shape
        if not isinstance(features, np.ndarray) or features.ndim != 1:
            raise ValueError("Invalid feature vector")
        self.history.append(features)

    def classify(self):
        # Classification only when we have enough history
        if len(self.history) < MAX_HISTORY:
            return None
        data = np.stack(self.history)
        # Insert classification logic safely
        # e.g., model.predict(data)
        return "action_label"
