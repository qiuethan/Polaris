import asyncio
import json
import time
import cv2
from typing import Dict, List, Optional, Any, Union
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import uvicorn

# Import our pose tracking modules
from dual_pose_tracker import DualPoseTracker

app = FastAPI(title="Pose Tracker WebSocket Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.latest_pose_data: Optional[Dict] = None
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        if self.latest_pose_data:
            try:
                await websocket.send_text(json.dumps(self.latest_pose_data))
            except:
                pass
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast(self, data: Dict):
        self.latest_pose_data = data
        if not self.active_connections:
            return
        
        message = json.dumps(data)
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                disconnected.append(connection)
        
        for connection in disconnected:
            self.disconnect(connection)

manager = ConnectionManager()
pose_tracker = None

def extract_player_data(angles_dict, action, player_id) -> Dict[str, Any]:
    """Extract data for a single player"""
    
    # Extract head angles
    head_data: Dict[str, Optional[float]] = {"pitch": None, "yaw": None, "roll": None}
    
    if 'head_tilt_angle' in angles_dict and angles_dict['head_tilt_angle'] is not None:
        head_data["pitch"] = float(angles_dict['head_tilt_angle'])
    
    if 'head_turn_angle' in angles_dict and angles_dict['head_turn_angle'] is not None:
        head_data["yaw"] = float(angles_dict['head_turn_angle'])
    
    if 'neck_angle' in angles_dict and angles_dict['neck_angle'] is not None:
        head_data["roll"] = float(angles_dict['neck_angle'])
    
    # Extract arm angles
    arms_data: Dict[str, Dict[str, Optional[float]]] = {
        "left": {
            "shoulder_angle": None,
            "elbow_angle": None
        },
        "right": {
            "shoulder_angle": None,
            "elbow_angle": None
        }
    }
    
    # Left arm
    if 'left_shoulder_angle' in angles_dict and angles_dict['left_shoulder_angle'] is not None:
        arms_data["left"]["shoulder_angle"] = float(angles_dict['left_shoulder_angle'])
    if 'left_elbow_angle' in angles_dict and angles_dict['left_elbow_angle'] is not None:
        arms_data["left"]["elbow_angle"] = float(angles_dict['left_elbow_angle'])
    
    # Right arm
    if 'right_shoulder_angle' in angles_dict and angles_dict['right_shoulder_angle'] is not None:
        arms_data["right"]["shoulder_angle"] = float(angles_dict['right_shoulder_angle'])
    if 'right_elbow_angle' in angles_dict and angles_dict['right_elbow_angle'] is not None:
        arms_data["right"]["elbow_angle"] = float(angles_dict['right_elbow_angle'])
    
    # Calculate speed based on action
    speed = 0.0
    if action == "run":
        speed = 8.5
    elif action == "jump":
        speed = 5.0
    elif action == "mountain_climber":
        speed = 6.0
    elif action == "crouch":
        speed = 1.0
    
    return {
        "player": player_id,
        "action": action if action != "unknown" else None,
        "speed": speed,
        "head": head_data,
        "arms": arms_data,
        "timestamp": time.time()
    }

def extract_pose_data(tracker) -> Dict[str, Any]:
    """Extract pose data from tracker and format for WebSocket - returns data for both players"""
    
    # Get latest angle data for both sides
    left_angles = {}
    right_angles = {}
    
    if len(tracker.left_angle_history) > 0:
        left_angles = tracker.left_angle_history[-1]
    
    if len(tracker.right_angle_history) > 0:
        right_angles = tracker.right_angle_history[-1]
    
    # Get actions for both sides
    left_action = getattr(tracker, 'left_action', 'unknown')
    right_action = getattr(tracker, 'right_action', 'unknown')
    
    # Extract data for both players
    player1_data = extract_player_data(left_angles, left_action, 1)
    player2_data = extract_player_data(right_angles, right_action, 2)
    
    return {
        "players": [player1_data, player2_data],
        "timestamp": time.time(),
        "debug": {
            "left_reps": {
                "run": getattr(tracker, 'left_run_reps', 0),
                "jump": getattr(tracker, 'left_jump_reps', 0),
                "crouch": getattr(tracker, 'left_crouch_reps', 0),
                "mountain_climber": getattr(tracker, 'left_mountain_climber_reps', 0)
            },
            "right_reps": {
                "run": getattr(tracker, 'right_run_reps', 0),
                "jump": getattr(tracker, 'right_jump_reps', 0),
                "crouch": getattr(tracker, 'right_crouch_reps', 0),
                "mountain_climber": getattr(tracker, 'right_mountain_climber_reps', 0)
            }
        }
    }

async def camera_loop():
    """Main camera processing loop"""
    global pose_tracker, manager
    
    print("📹 Starting camera...")
    pose_tracker = DualPoseTracker()
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Could not open camera")
        return
    
    print("✅ Camera ready")
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                await asyncio.sleep(0.1)
                continue
            
            frame = cv2.flip(frame, 1)
            
            # Process frame to extract pose data and get visual output
            processed_frame = pose_tracker.process_frame(frame)
            
            # Display the processed frame with pose landmarks
            cv2.imshow('Dual Pose Tracker - WebSocket Server', processed_frame)
            
            # Extract and broadcast pose data
            pose_data = extract_pose_data(pose_tracker)
            await manager.broadcast(pose_data)
            
            # Check for ESC key to exit (non-blocking)
            if cv2.waitKey(1) & 0xFF == 27:  # ESC key
                print("🔑 ESC pressed - stopping camera...")
                break
            
            # Control frame rate (30 FPS)
            await asyncio.sleep(1/30)
            
    except asyncio.CancelledError:
        print("📹 Camera stopped")
    finally:
        cap.release()
        cv2.destroyAllWindows()  # Close OpenCV windows
        if pose_tracker and hasattr(pose_tracker, 'pose_left'):
            pose_tracker.pose_left.close()
        if pose_tracker and hasattr(pose_tracker, 'pose_right'):
            pose_tracker.pose_right.close()

# Global camera task
camera_task = None

@app.on_event("startup")
async def startup():
    global camera_task
    print("🚀 Starting pose tracker server...")
    camera_task = asyncio.create_task(camera_loop())

@app.on_event("shutdown")
async def shutdown():
    global camera_task
    if camera_task:
        camera_task.cancel()
        try:
            await camera_task
        except asyncio.CancelledError:
            pass

@app.websocket("/ws/pose")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print(f"🔌 Client connected. Total: {len(manager.active_connections)}")
    
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"🔌 Client disconnected. Total: {len(manager.active_connections)}")

@app.get("/")
async def root():
    # Serve the test HTML page
    html_file = "test_websocket.html"
    if os.path.exists(html_file):
        return FileResponse(html_file)
    else:
        return {
            "message": "Pose Tracker WebSocket Server",
            "active_connections": len(manager.active_connections),
            "websocket_url": "ws://localhost:8000/ws/pose",
            "test_page": "http://localhost:8000/test"
        }

@app.get("/api")
async def api_info():
    return {
        "message": "Pose Tracker WebSocket Server",
        "active_connections": len(manager.active_connections),
        "websocket_url": "ws://localhost:8000/ws/pose"
    }

@app.get("/test")
async def test_page():
    return FileResponse("test_websocket.html")

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "connections": len(manager.active_connections),
        "camera_active": pose_tracker is not None
    }

if __name__ == "__main__":
    print("🚀 Starting Pose Tracker WebSocket Server...")
    uvicorn.run(
        "pose_websocket_server:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    ) 