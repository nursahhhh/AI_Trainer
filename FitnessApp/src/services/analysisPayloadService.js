export function buildAnalysisPayload({
  exerciseType,
  elapsedSeconds,
  frames,
}) {
  return {
    exercise_type: exerciseType,
    session_duration_seconds: elapsedSeconds,
    frame_count: frames.length,
    frames,
  };
}

export function buildDetailedAnalysisPayload({
  exerciseType,
  predictionResult,
}) {
  return {
    exercise_name: exerciseType,
    analysis_result: predictionResult,
  };
}