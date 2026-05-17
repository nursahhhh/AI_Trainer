from collections import Counter
from typing import List, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from feedback_agent import generate_exercise_feedback_report
from schemas import (
    PredictRequest,
    PredictResponse,
    DetailedAnalysisRequest,
    DetailedAnalysisResponse,
)
from pydantic import BaseModel
from typing import Any, Dict

from predictor_service import predict_from_landmarks
app = FastAPI(title="Fitness Analysis Backend", version="1.1.0")


# Expo app'ten istek gelsin diye geliştirme aşamasında geniş açıyoruz.
# Production aşamasında bunu belirli origin'lerle sınırlandır.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




# ---------- Helper functions ----------

def validate_payload_quality(payload: PredictRequest) -> None:
    if not payload.frames:
        raise HTTPException(status_code=400, detail="No frames provided.")

    empty_landmark_frames = [idx for idx, frame in enumerate(payload.frames) if not frame.landmarks]
    if empty_landmark_frames:
        raise HTTPException(
            status_code=400,
            detail=f"Some frames do not contain landmarks: {empty_landmark_frames[:5]}",
        )



def build_detailed_report(analysis: PredictResponse) -> DetailedAnalysisResponse:
    error_count = len(analysis.errors)

    if error_count == 0:
        return DetailedAnalysisResponse(
            report=(
                f"Your {analysis.exercise_name} analysis looks good. "
                "No significant form errors were detected in the current session. "
                "Keep maintaining your tempo and alignment."
            ),
            summary="Clean session with no major detected form errors.",
            detected_error_count=0,
            priority_focus=["Maintain current technique", "Keep a controlled tempo"],
        )

    error_type_counts = Counter(item.error_type for item in analysis.errors)
    body_part_counts = Counter(item.body_part for item in analysis.errors)

    most_common_error = error_type_counts.most_common(1)[0][0]
    most_affected_body_part = body_part_counts.most_common(1)[0][0]

    error_summaries = []
    for item in analysis.errors:
        error_summaries.append(
            f"rep {item.rep_id}: {item.error_type} on {item.body_part} "
            f"(deviation {item.angle_deviation}, confidence {item.confidence:.2f})"
        )

    priority_focus = [
        f"Improve {most_common_error.replace('_', ' ')}",
        f"Stabilize {most_affected_body_part.replace('_', ' ')}",
        "Use slower and more controlled repetitions",
    ]

    report = (
        f"During this {analysis.exercise_name} session, {error_count} notable form issue(s) were detected. "
        f"Detected issues: {'; '.join(error_summaries)}. "
        f"The most repeated issue was {most_common_error.replace('_', ' ')}, and the most affected area was "
        f"{most_affected_body_part.replace('_', ' ')}. "
        "Focus on joint alignment, posture control, and slower repetitions."
    )

    return DetailedAnalysisResponse(
        report=report,
        summary=(
            f"{error_count} form issue(s) detected. Main pattern: {most_common_error.replace('_', ' ')}."
        ),
        detected_error_count=error_count,
        priority_focus=priority_focus,
    )


# ---------- Health ----------

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Fitness Analysis Backend",
        "version": "1.1.0",
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Fitness Analysis Backend",
        "version": "1.1.0",
    }


# ---------- Predict ----------

@app.post("/predict", response_model=PredictResponse)
def predict_exercise(payload: PredictRequest):
    validate_payload_quality(payload)
    return predict_from_landmarks(payload)


# ---------- Detailed analysis ----------

@app.post("/detailed-analysis", response_model=DetailedAnalysisResponse)
def detailed_analysis(payload: DetailedAnalysisRequest):
    analysis = payload.analysis_result

    if payload.exercise_name != analysis.exercise_name:
        raise HTTPException(
            status_code=400,
            detail=(
                f"exercise_name mismatch: request has '{payload.exercise_name}' but "
                f"analysis_result has '{analysis.exercise_name}'"
            ),
        )

    return build_detailed_report(analysis)



class FeedbackRequest(BaseModel):
    exercise_analysis: Dict[str, Any]

class FeedbackResponse(BaseModel):
    report: str

@app.post("/feedback-report", response_model=FeedbackResponse)
def feedback_report(payload: FeedbackRequest):
    report = generate_exercise_feedback_report(payload.exercise_analysis)

    return {
        "report": report
    }

# ---------- Notes ----------
# Run:
# uvicorn main:app --reload --host 0.0.0.0 --port 8000
#
# Next backend steps:
# 1) Move helper functions into services/
# 2) Replace mock_predict_logic with real model inference
# 3) Replace build_detailed_report with LLM-based natural feedback generation
# 4) Add logging and request IDs
