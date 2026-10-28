
import json
from typing import List, Dict, Any, Optional

from groq import Groq
from app.config import settings


# ============================================================
# QUIZ CONFIGURATION
# ============================================================

PASS_THRESHOLD = 70

WHOLE_VIDEO_TARGET_QUESTIONS = 5
WHOLE_VIDEO_MIN_QUESTIONS = 5

GROQ_MODEL = "openai/gpt-oss-120b"


# ============================================================
# GROQ CLIENT
# ============================================================

class GroqQuizGenerator:

    _client = None

    @classmethod
    def get_client(cls):

        if cls._client is not None:
            return cls._client

        api_key = settings.GROQ_API_KEY

        if not api_key:
            print("[GROQ QUIZ] ERROR: GROQ_API_KEY not configured.")
            return None
 
        try:
            cls._client = Groq(api_key=api_key)
            print("[GROQ QUIZ] Groq client connected.")
            return cls._client

        except Exception as e:
            print(f"[GROQ QUIZ] Client initialization failed: {e}")
            cls._client = None
            return None


# ============================================================
# COMMON VALIDATION
# ============================================================

def _validate_questions(
    questions: Any
) -> List[Dict[str, Any]]:

    if not isinstance(questions, list):
        return []

    valid_questions = []

    for index, q in enumerate(questions):

        if not isinstance(q, dict):
            continue

        question = q.get("question")
        options = q.get("options")
        correct_answer = q.get("correct_answer")
        explanation = q.get("explanation", "")

        if not isinstance(question, str) or not question.strip():
            continue

        if not isinstance(options, list) or len(options) != 4:
            continue

        if not all(
            isinstance(option, str) and option.strip()
            for option in options
        ):
            continue

        if isinstance(correct_answer, bool):
            continue

        if not isinstance(correct_answer, int):
            continue

        if correct_answer not in (0, 1, 2, 3):
            continue

        if not isinstance(explanation, str):
            explanation = ""

        valid_questions.append({
            "id": str(q.get("id", f"q{index + 1}")),
            "question": question.strip(),
            "options": [option.strip() for option in options],
            "correct_answer": correct_answer,
            "explanation": explanation.strip(),
        })

    return valid_questions


# ============================================================
# GROQ JSON GENERATION
# ============================================================

def _generate_questions(
    prompt: str,
    num_questions: int,
    max_tokens: int = 4096,
) -> List[Dict[str, Any]]:

    client = GroqQuizGenerator.get_client()

    if client is None:
        return []

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are CogniTrace's lecture-grounded quiz generator. "
                        "Return only valid JSON in this exact structure: "
                        '{"questions":[{"id":"q1","question":"...","options":'
                        '["A","B","C","D"],"correct_answer":0,'
                        '"explanation":"..."}]}. '
                        "correct_answer is a zero-based option index."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0.2,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content

        if not content:
            print("[GROQ QUIZ] Empty response.")
            return []

        data = json.loads(content)
        questions = _validate_questions(data.get("questions"))

        if len(questions) < num_questions:
            print(
                f"[GROQ QUIZ] Incomplete response: "
                f"{len(questions)}/{num_questions} valid questions."
            )
            return []

        questions = questions[:num_questions]

        for index, question in enumerate(questions, start=1):
            question["id"] = f"q{index}"

        return questions

    except Exception as e:
        print(f"[GROQ QUIZ] Generation failed: {e}")
        return []


# ============================================================
# TOPIC QUIZ
# ============================================================

def generate_adaptive_quiz(
    explanation_text: str,
    topic: str,
    difficulty: str = "medium",
    transcript_context: Optional[str] = None,
    num_questions: int = 5,
) -> List[Dict[str, Any]]:

    if not topic or not topic.strip():
        print("[GROQ QUIZ] Missing topic.")
        return []

    if not explanation_text or not explanation_text.strip():
        print("[GROQ QUIZ] Missing explanation.")
        return []

    try:
        num_questions = int(num_questions)
    except (TypeError, ValueError):
        num_questions = 5

    num_questions = max(1, min(10, num_questions))
    difficulty = (difficulty or "medium").lower()

    transcript_context = (transcript_context or "")[:30000]
    explanation_text = explanation_text[:15000]

    prompt = f"""
Generate a topic-specific multiple-choice quiz for CogniTrace.

CURRENT TOPIC:
{topic}

DIFFICULTY:
{difficulty}

AI EXPLANATION:
{explanation_text}

LECTURE TRANSCRIPT:
{transcript_context}

RULES:
1. Generate exactly {num_questions} questions about the current topic.
2. Use only facts supported by the supplied explanation or transcript.
3. Do not introduce unrelated lecture topics or outside facts.
4. Each question must have exactly four distinct answer options.
5. Exactly one option must be correct.
6. correct_answer must be the zero-based index: 0, 1, 2, or 3.
7. Include a short explanation for each correct answer.
8. Test understanding and application, not just memorization.
9. Avoid duplicate questions.
10. Return a JSON object containing a "questions" array only.
"""

    questions = _generate_questions(prompt, num_questions)

    if questions:
        print(f"[GROQ QUIZ] Generated {len(questions)} topic questions.")

    return questions


# ============================================================
# WHOLE-VIDEO QUIZ PROMPT
# ============================================================

def _build_whole_video_prompt(
    video_title: str,
    transcript_context: str,
    difficulty: str,
    num_questions: int,
) -> str:

    return f"""
Generate a comprehensive FINAL QUIZ for the entire lecture.

VIDEO TITLE:
{video_title}

DIFFICULTY:
{difficulty}

FULL LECTURE TRANSCRIPT:
{transcript_context}

RULES:
1. Generate exactly {num_questions} questions covering the lecture.
2. Distribute questions across different lecture sections when possible.
3. Cover the major concepts, definitions, relationships, procedures,
   examples, comparisons, and applications present in the transcript.
4. Use only information supported by the supplied transcript.
5. Do not invent facts or add outside knowledge.
6. Every question must have exactly four distinct options.
7. Exactly one option must be correct.
8. correct_answer must be a zero-based index: 0, 1, 2, or 3.
9. Include a short explanation for each correct answer.
10. Avoid duplicate questions.
11. Do not ask students to identify timestamps.
12. Return a JSON object containing a "questions" array only.
"""


# ============================================================
# WHOLE-VIDEO QUIZ
# ============================================================

def generate_video_quiz(
    video_title: str,
    transcript_context: str,
    difficulty: str = "medium",
    num_questions: int = WHOLE_VIDEO_TARGET_QUESTIONS,
) -> List[Dict[str, Any]]:

    if not video_title or not video_title.strip():
        print("[GROQ VIDEO QUIZ] Missing video title.")
        return []

    if not transcript_context or not transcript_context.strip():
        print("[GROQ VIDEO QUIZ] Missing transcript.")
        return []

    try:
        requested = int(num_questions)
    except (TypeError, ValueError):
        requested = WHOLE_VIDEO_TARGET_QUESTIONS

    requested = max(
        WHOLE_VIDEO_MIN_QUESTIONS,
        min(WHOLE_VIDEO_TARGET_QUESTIONS, requested),
    )

    prompt = _build_whole_video_prompt(
        video_title=video_title,
        transcript_context=transcript_context.strip(),
        difficulty=(difficulty or "medium").lower(),
        num_questions=requested,
    )

    questions = _generate_questions(
        prompt=prompt,
        num_questions=requested,
        max_tokens=8192,
    )

    if len(questions) < WHOLE_VIDEO_MIN_QUESTIONS:
        print("[GROQ VIDEO QUIZ] Not enough valid questions returned.")
        return []

    print(
        f"[GROQ VIDEO QUIZ] Generated {len(questions)} final questions."
    )

    return questions


# ============================================================
# QUIZ RESULT
# ============================================================

def calculate_quiz_result(
    answers: List[int],
    questions: List[Dict[str, Any]],
) -> Dict[str, Any]:

    if not questions:
        return {
            "score": 0,
            "passed": False,
            "correct": 0,
            "total": 0,
            "threshold": PASS_THRESHOLD,
        }

    correct = 0

    for index, answer in enumerate(answers):

        if index >= len(questions):
            break

        expected = questions[index].get("correct_answer")

        if answer == expected:
            correct += 1

    total = len(questions)
    score = round((correct / total) * 100)

    return {
        "score": score,
        "passed": score >= PASS_THRESHOLD,
        "correct": correct,
        "total": total,
        "threshold": PASS_THRESHOLD,
    }


# ============================================================
# FALLBACK
# ============================================================

def get_static_fallback_quiz(
    topic: str,
) -> List[Dict[str, Any]]:

    print(f"[QUIZ] No valid AI quiz generated for topic: {topic}")

    # Do not return unrelated hard-coded questions.
    return []