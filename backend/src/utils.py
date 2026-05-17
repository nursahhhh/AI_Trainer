import numpy as np
import cv2


def get_biggest_pose(pose_landmarks_list):
    """Select pose with largest bounding box area when multiple people detected."""
    if not pose_landmarks_list:
        return None
    
    max_area = 0
    biggest_pose_idx = 0
    
    for idx, landmarks in enumerate(pose_landmarks_list):
        x_vals = [lm.x for lm in landmarks]
        y_vals = [lm.y for lm in landmarks]
        
        min_x, max_x = min(x_vals), max(x_vals)
        min_y, max_y = min(y_vals), max(y_vals)
        area = (max_x - min_x) * (max_y - min_y)
        
        if area > max_area:
            max_area = area
            biggest_pose_idx = idx
    
    return pose_landmarks_list[biggest_pose_idx]


def normalize_landmarks(landmarks):
    """
    Normalize pose landmarks:
    1. Center at hip midpoint (0,0,0)
    2. Scale to unit sphere (max distance = 1)
    
    Args:
        landmarks: Flat list of 132 values (x,y,z,v) * 33
    
    Returns:
        Normalized numpy array of shape (132,)
    """
    data = np.array(landmarks).reshape(33, 4)
    coords = data[:, :3]
    visibility = data[:, 3].reshape(-1, 1)
    
    left_hip = coords[23]
    right_hip = coords[24]
    hip_center = (left_hip + right_hip) / 2.0
    
    centered_coords = coords - hip_center
    max_distance = np.max(np.linalg.norm(centered_coords, axis=1))
    
    if max_distance == 0:
        max_distance = 1
    
    scaled_coords = centered_coords / max_distance
    normalized_data = np.hstack((scaled_coords, visibility)).flatten()
    
    return normalized_data


def calculate_angle(a, b, c):
    """
    Calculate angle at point b formed by points a, b, c.
    
    Args:
        a, b, c: [x, y] coordinates
    
    Returns:
        Angle in degrees (0-180)
    """
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    
    if angle > 180.0:
        angle = 360 - angle
    
    return angle


def add_noise(landmarks, noise_level=0.01):
    """Add random Gaussian noise for data augmentation."""
    noise = np.random.normal(0, noise_level, landmarks.shape)
    return landmarks + noise
