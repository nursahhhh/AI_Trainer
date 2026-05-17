const API_BASE_URL =  "http://10.225.210.42:8000";



export async function predictExercise(payload) {
  console.log("API_BASE_URL:", API_BASE_URL);
  console.log("Predict payload:", payload);
  console.log("Predict payload size:", JSON.stringify(payload).length);

  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      exercise_type: payload.exercise_type,
      session_duration_seconds: 2,
      frame_count: 1,
      frames: [
        {
          timestamp: Date.now(),
          landmarks: [
            {
              name: "left_knee",
              x: 0.4,
              y: 0.7,
              z: 0.0,
              visibility: 0.9,
            },
          ],
        },
      ],
    }),
  });

  console.log("Predict response status:", response.status);

  const text = await response.text();
  console.log("Predict raw response text:", text);

  if (!response.ok) {
    throw new Error(`Predict request failed: ${response.status}`);
  }

  return JSON.parse(text);
}
export async function generateFeedbackReport(exerciseAnalysis) {
  const response = await fetch(`${API_BASE_URL}/feedback-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      exercise_analysis: exerciseAnalysis,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Feedback API error ${response.status}: ${text}`);
  }

  return JSON.parse(text);
}
