import cv2
import time

# Configuration
MAX_FRAME_WIDTH = 640
MAX_FRAME_HEIGHT = 480
FRAME_RATE_LIMIT = 30  # fps
TIMEOUT_SECONDS = 5

class DualPoseTracker:
    def __init__(self, src1=0, src2=1):
        self.cap1 = cv2.VideoCapture(src1)
        self.cap2 = cv2.VideoCapture(src2)
        self.last_frame_time = time.time()

    def validate_frame(self, frame):
        h, w = frame.shape[:2]
        if w > MAX_FRAME_WIDTH or h > MAX_FRAME_HEIGHT:
            return False
        return True

    def read_frames(self):
        now = time.time()
        elapsed = now - self.last_frame_time
n        if elapsed < 1.0 / FRAME_RATE_LIMIT:
            time.sleep((1.0 / FRAME_RATE_LIMIT) - elapsed)
        self.last_frame_time = time.time()

        ret1, frame1 = self.cap1.read()
        ret2, frame2 = self.cap2.read()
        if not ret1 or not ret2:
            return None, None

        # Validate resolution to prevent memory exhaustion
        if not (self.validate_frame(frame1) and self.validate_frame(frame2)):
            return None, None

        return frame1, frame2

    def close(self):
        self.cap1.release()
        self.cap2.release()

if __name__ == '__main__':
    tracker = DualPoseTracker()
    start = time.time()
    while True:
        if time.time() - start > TIMEOUT_SECONDS:
            break
        f1, f2 = tracker.read_frames()
        if f1 is None or f2 is None:
            continue
        # Process frames safely...
    tracker.close()