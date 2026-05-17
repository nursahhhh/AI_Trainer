import os
import json
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()
XAI_API_KEY = os.getenv("XAI_API_KEY")

client = OpenAI(
    api_key=XAI_API_KEY,
    base_url="https://api.x.ai/v1",
)

MODEL_NAME = "grok-4.3"


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