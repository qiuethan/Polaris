import math

REQUIRED_INDICES = range(33)

class JointAngleExtractor:
    def extract_angle(self, landmarks, idx_a, idx_b, idx_c):
        # Validate indices
        for idx in (idx_a, idx_b, idx_c):
            if idx not in REQUIRED_INDICES:
                raise IndexError(f"Landmark index {idx} out of range")

        # Validate landmarks structure
        if not (isinstance(landmarks, list) and len(landmarks) == 33):
            raise ValueError("Invalid landmarks list")

        a = landmarks[idx_a]
        b = landmarks[idx_b]
        c = landmarks[idx_c]
        # Validate tuple length and numeric types
        for point in (a, b, c):
            if not (isinstance(point, (list, tuple)) and len(point) >= 2):
                raise ValueError("Invalid landmark format")

        # Compute vectors
        ba = (a[0] - b[0], a[1] - b[1])
        bc = (c[0] - b[0], c[1] - b[1])
        dot = ba[0]*bc[0] + ba[1]*bc[1]
        mag_ba = math.hypot(*ba)
        mag_bc = math.hypot(*bc)
        if mag_ba == 0 or mag_bc == 0:
            return 0.0
        # Clamp cos_theta to [-1,1]
        cos_theta = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
        return math.degrees(math.acos(cos_theta))
