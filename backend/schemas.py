from collections import Counter
from typing import List, Literal
from pydantic import BaseModel,Field, model_validator
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware




# ---------- Request models ----------

class Landmark(BaseModel):
    name: str
    x: float
    y: float
    z: float
    visibility: float = Field(..., ge=0.0, le=1.0)


class FrameData(BaseModel):
    timestamp: float = Field(..., ge=0)
    landmarks: List[Landmark] = Field(..., min_length=1)


class PredictRequest(BaseModel):
    exercise_type: str = Field(..., examples=["squat"])
    session_duration_seconds: int = Field(..., ge=1)
    frame_count: int = Field(..., ge=1)
    frames: List[FrameData] = Field(..., min_length=1)

    @model_validator(mode="after")
    def validate_frame_count(self):
        if self.frame_count != len(self.frames):
            raise ValueError(
                f"frame_count ({self.frame_count}) does not match number of frames ({len(self.frames)})"
            )
        return self



# ---------- Response models ----------

class ExpectedAngleRange(BaseModel):
    min: float
    max: float


class ExerciseError(BaseModel):
    rep_id: int = Field(..., ge=1)
    timestamp_sec: float = Field(..., ge=0)
    frame: int = Field(..., ge=0)
    error_type: str
    body_part: str
    measured_angle: float
    expected_angle_range: ExpectedAngleRange
    angle_deviation: float
    confidence: float = Field(..., ge=0.0, le=1.0)


class PredictResponse(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    exercise_name: str
    prediction_confidence: float = Field(..., ge=0.0, le=1.0)
    total_reps: int = Field(..., ge=0)
    errors: List[ExerciseError]

class DetailedAnalysisRequest(BaseModel):
    exercise_name: str
    analysis_result: PredictResponse


class DetailedAnalysisResponse(BaseModel):
    report: str
    summary: str
    detected_error_count: int
    priority_focus: List[str]

