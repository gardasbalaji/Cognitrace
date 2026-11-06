
from typing import List, Dict, Any
from app.config import settings


class GroqRAGGenerator:
    """Groq client used for grounded lecture explanations."""

    _client = None

    @classmethod
    def get_client(cls):
        if cls._client is not None:
            return cls._client

        api_key = settings.GROQ_API_KEY

        if not api_key:
            print("[GROQ] API key not configured.")
            return None

        try:
            from groq import Groq
            cls._client = Groq(api_key=api_key)
            print("[GROQ] API client initialized successfully.")
            return cls._client

        except Exception as e:
            print(f"[GROQ] Client initialization failed: {e}")
            cls._client = None
            return None



def generate_explanation(
    question: str,
    context_chunks: List[Dict[str, Any]],
    level: str = "medium",
    teaching_mode: str = "direct",
    conversation_history: List[Dict[str, str]] = None,
) -> str:


    if not context_chunks:
        return "No relevant transcript segments were found for this question."

    level = (level or "medium").lower()
    
    teaching_mode = (teaching_mode or "direct").lower()

    mode_instructions = {
        "direct": (
            "Explain the concept clearly and directly. Start with the core idea, "
            "then explain the important details in a logical order."
        ),
        "real_life": (
            "Teach the concept through practical real-life examples and applications. "
            "Connect each example to the lecture content. If the transcript does not "
            "support a specific example, clearly distinguish it from lecture facts."
        ),
        "misconception": (
    "Act as a patient tutor who helps the student identify and correct "
    "misconceptions using the provided lecture context. Present one "
    "challenging but fair question, incorrect statement, or flawed solution "
    "relevant to the actual lecture topic. Initially, do not reveal the "
    "correct answer. Ask the student to identify the problem first. "

    "When the student answers, carefully evaluate their reasoning. "
    "Never agree with an incorrect answer just to be encouraging. "
    "If the answer is partially correct, acknowledge what is correct "
    "and guide the student toward the missing concept. If it is incorrect, "
    "briefly explain the misunderstanding and ask one guiding question. "
    "If it is correct, confirm why and explain the key concept briefly. "

    "For stack operations, distinguish between valid values and stack "
    "capacity. A bounded stack can overflow when it is full; underflow "
    "occurs when attempting to pop from an empty stack. Adapt examples "
    "to the actual lecture topic instead of always using stack overflow. "

    "Keep replies conversational and concise, using simple language and "
    "short paragraphs. Ask only one question at a time. Do not dump the "
    "entire transcript, reveal the answer prematurely, invent lecture "
    "claims, or output escaped Markdown such as \\\\*\\\\*."

    "Do not give the complete explanation after the student's first or "
"second incorrect attempt. Give one small hint per attempt, wait for "
"the student's response, and reveal the full correction only after "
"the student understands it, explicitly asks for the answer, or has "
"made several unsuccessful attempts. Never mix array-based stack "
"implementation details with linked-list implementation details "
"unless the lecture explicitly compares both."
),
        "workflow": (
            "Teach the concept through a step-by-step problem-solving workflow. "
            "Explain how to choose an approach, work through each step, and verify "
            "the result. For code, use a dry run when supported by the transcript; "
            "for theory, use a logical sequence; for formulas, explain the steps."
        ),
    }

    mode_instruction = mode_instructions.get(
        teaching_mode,
        mode_instructions["direct"],
    )


    if level == "beginner":
        level_instruction = (
            "Explain the concept as if the student is learning it for the first time. "
            "Use simple language, explain the basic meaning first, and break processes "
            "into small steps. Use examples only when supported by the transcript. "
            "Avoid unnecessary jargon and advanced details."
        )

    elif level == "advanced":
        level_instruction = (
            "Provide a technically precise, deeper explanation. Explain how and why "
            "the concept works, including technical details, constraints, advantages, "
            "limitations, and edge cases when supported by the transcript. "
            "Do not introduce unsupported external facts."
        )

    else:
        level_instruction = (
            "Provide a clear college-level explanation balancing simplicity and "
            "technical accuracy. Explain the main concept and important details. "
            "Use appropriate technical terminology and examples when supported "
            "by the supplied lecture context."
        )

    context_parts = []

    for chunk in context_chunks:
        start = chunk.get("start_time", 0)
        end = chunk.get("end_time", 0)
        text = chunk.get("text", "")
        context_parts.append(f"[{start}s - {end}s]\n{text}")

    context_payload = "\n\n".join(context_parts)

    system_instruction = f"""
You are CogniTrace AI, an educational assistant that explains concepts
from a student's lecture.

GROUNDING RULES:

1. Use the supplied lecture transcript as the only factual source.
2. Do not invent facts or add unsupported information.
3. Do not use unrelated external information.
4. If the transcript lacks enough information, explicitly say so.
5. Explain the relevant information in your own words.
6. Stay focused on the student's question.
7. Match the requested student's level.
8. Do not introduce unsupported examples or technical details.
9. Prioritize clarity, correctness, and educational usefulness.

STUDENT LEVEL:
{level.upper()}


LEVEL-SPECIFIC INSTRUCTIONS:
{level_instruction}

TEACHING MODE:
{teaching_mode}

TEACHING MODE INSTRUCTIONS:
{mode_instruction}

CONVERSATION RULES:
- Use the conversation history to understand follow-up questions.
- Keep the same lecture topic and teaching mode throughout the conversation.
- Do not repeat the entire explanation unless the student asks.
- Respond to the student's latest question directly.
- For misconception clearing, let the student attempt the answer before revealing the correction.
- For workflow guidance, teach in manageable steps and invite the student to try each step.
- Use only the supplied lecture transcript for lecture-specific factual claims.

"""

    user_content = f"""
LECTURE TRANSCRIPT CONTEXT:

{context_payload}

STUDENT QUESTION:

{question}

Explain the answer using only the supplied lecture context.
"""

    client = GroqRAGGenerator.get_client()

    if client is None:
        return (
            "Groq is not configured. "
            "Please add GROQ_API_KEY to the backend .env file."
        )

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            
            messages=[
                {
                    "role": "system",
                    "content": system_instruction,
                },
                *[
                    {
                        "role": message["role"],
                        "content": message["content"],
                    }
                    for message in (conversation_history or [])
                    if message.get("role") in ("user", "assistant")
                    and isinstance(message.get("content"), str)
                ],
                {
                    "role": "user",
                    "content": user_content,
                },
            ],

            temperature=0.2,
            max_tokens=1024,
        )

        answer = response.choices[0].message.content

        if answer:
            return answer.strip()

        return "Groq returned an empty response."

    except Exception as e:
        print(f"[GROQ] Explanation generation failed: {e}")
        return f"Groq could not generate the explanation. Error: {str(e)}"
