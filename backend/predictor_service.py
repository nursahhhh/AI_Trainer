import os
from functools import lru_cache
from typing import List

import numpy as np
import torch

from schemas import PredictRequest, PredictResponse
from src.model import LSTMClassifier
from src.utils import normalize_landmarks


MEDIAPIPE_LANDMARK_ORDER = [
    "nose",
    "left_eye_inner", "left_eye", "left_eye_outer",
    "right_eye_inner", "right_eye", "right_eye_outer",
    "left_ear", "right_ear",
    "mouth_left", "mouth_right",
    "left_shoulder", "right_shoulder",
    "left_elbow", "right_elbow",
    "left_wrist", "right_wrist",
    "left_pinky", "right_pinky",
    "left_index", "right_index",
    "left_thumb", "right_thumb",
    "left_hip", "right_hip",
    "left_knee", "right_knee",
    "left_ankle", "right_ankle",
    "left_heel", "right_heel",
    "left_foot_index", "right_foot_index",
]

SEQ_LENGTH = 40
INPUT_DIM = 132
HIDDEN_DIM = 64


def reorder_landmarks_by_name(landmarks) -> List[float]:
    by_name = {lm.name: lm for lm in landmarks}

    ordered = []
    for name in MEDIAPIPE_LANDMARK_ORDER:
        lm = by_name.get(name)
        if lm is None:
            ordered.extend([0.0, 0.0, 0.0, 0.0])
        else:
            ordered.extend([lm.x, lm.y, lm.z, lm.visibility])

    return ordered


@lru_cache(maxsize=1)
def get_device():
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


@lru_cache(maxsize=1)
def load_class_names():
    classes_path = os.getenv("CLASSES_PATH", "data/models/classes.npy")
    return np.load(classes_path, allow_pickle=True)


@lru_cache(maxsize=1)
def load_model():
    model_path = os.getenv("MODEL_PATH", "data/models/fitness_action_model.pth")
    class_names = load_class_names()
    device = get_device()

    model = LSTMClassifier(
        input_dim=INPUT_DIM,
        hidden_dim=HIDDEN_DIM,
        num_classes=len(class_names),
    ).to(device)

    state_dict = torch.load(model_path, map_location=device)
    model.load_state_dict(state_dict)
    model.eval()
    return model


def build_sequence_from_payload(payload: PredictRequest) -> np.ndarray:
    normalized_frames = []

    for frame in payload.frames:
        flat_landmarks = reorder_landmarks_by_name(frame.landmarks)
        normalized_frame = normalize_landmarks(flat_landmarks)
        normalized_frames.append(normalized_frame)

    if len(normalized_frames) == 0:
        return np.zeros((SEQ_LENGTH, INPUT_DIM), dtype=np.float32)

    if len(normalized_frames) < SEQ_LENGTH:
        last_frame = normalized_frames[-1]
        while len(normalized_frames) < SEQ_LENGTH:
            normalized_frames.append(last_frame)
    else:
        normalized_frames = normalized_frames[-SEQ_LENGTH:]

    return np.array(normalized_frames, dtype=np.float32)


def predict_from_landmarks(payload):
    """
    Temporary mock prediction until the real model files are available.

    Later, when model files are added:
    - uncomment load_model()
    - uncomment preprocessing
    - uncomment inference
    - remove mock response
    """

    print("predict_from_landmarks called")
    print("exercise_type:", payload.exercise_type)
    print("frame_count:", payload.frame_count)
    print("frames received:", len(payload.frames))

    # -------------------------------------------------
    # REAL MODEL CODE - TEMPORARILY DISABLED
    # -------------------------------------------------
    # model = load_model()
    #
    # features = preprocess_landmarks(payload)
    # prediction = model(features)
    # result = postprocess_prediction(prediction)
    #
    # return result

    # -------------------------------------------------
    # TEMPORARY MOCK RESPONSE
    # -------------------------------------------------
    return{
        "schema_version": "1.0",
        "exercise_name": payload.exercise_type,
        "prediction_confidence": 0.91,
        "total_reps": 5,
        "errors": [
            {
                "rep_id": 2,
                "timestamp_sec": 12.4,
                "frame": 372,
                "error_type": "knee_valgus",
                "body_part": "left_knee",
                "measured_angle": 148,
                "expected_angle_range": {
                    "min": 160,
                    "max": 180
                },
                "angle_deviation": -12,
                "confidence": 0.91
            },
            {
                "rep_id": 4,
                "timestamp_sec": 24.7,
                "frame": 741,
                "error_type": "forward_lean",
                "body_part": "torso",
                "measured_angle": 52,
                "expected_angle_range": {
                    "min": 70,
                    "max": 90
                },
                "angle_deviation": -18,
                "confidence": 0.87
            }
        ]
    }