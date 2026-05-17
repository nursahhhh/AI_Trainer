import os
import json
from openai import OpenAI

# --------------------------------------------------
# Config
# --------------------------------------------------
XAI_API_KEY = os.getenv("XAI_API_KEY")

client = OpenAI(
    api_key=XAI_API_KEY,
    base_url="https://api.x.ai/v1",
)

MODEL_NAME = "grok-4.3"


# --------------------------------------------------
# Agent function
# --------------------------------------------------
def generate_exercise_feedback_report(exercise_json: dict) -> str:
    system_prompt = """
You are an expert personal trainer and movement coach.

You will receive exercise-performance data in JSON format.
Your job is to turn that data into a human-like feedback report.

Instructions:
- Write like a real coach speaking to a client
- Be encouraging but honest
- Use simple, natural language
- Mention the exercise name
- Mention whether the issues happened in a few reps or throughout the set
- Explain each important mistake clearly
- Explain why it matters for performance or safety
- Give specific tips the user can apply in the next set
- Do not mention raw JSON fields, confidence values, frame numbers, or angle ranges unless necessary
- Do not invent errors that are not present

Output format:
Overall assessment:
...

Key form issues:
...

Why this matters:
...

How to improve next time:
...

Final tone:
supportive, practical, human
"""

    user_prompt = f"""
Here is the exercise analysis data:

{json.dumps(exercise_json, indent=2)}

Write a natural, human-like coaching report for the user.
"""

    response = client.chat.completions.create(
        model=MODEL_NAME,
        temperature=0.5,
        messages=[
            {"role": "system", "content": system_prompt.strip()},
            {"role": "user", "content": user_prompt.strip()},
        ],
    )

    return response.choices[0].message.content.strip()


# --------------------------------------------------
# Example usage
# --------------------------------------------------
if __name__ == "__main__":
    sample_input = {
  "schema_version": "1.0",

  "exercise_name": "squat",

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

      "confidence": 0.88
    }
  ]
}

    report = generate_exercise_feedback_report(sample_input)
    print(report)