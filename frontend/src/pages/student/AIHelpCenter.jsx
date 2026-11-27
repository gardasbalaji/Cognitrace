import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BookOpen,
  RotateCcw,
  RefreshCw,
  Clock,
  Play,
  Video,
} from "lucide-react";

function extractYoutubeVideoId(url) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : '';
}

const API_BASE = "/api/student";

// Quiz pass threshold
const QUIZ_PASS_THRESHOLD = 60;

export default function AIHelpCenter() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const requestedLectureId = searchParams.get("lec") || searchParams.get("play");

  // ---------------------------------------------------------
  // LECTURE / TOPIC
  // ---------------------------------------------------------

  const [lecture, setLecture] = useState(null);
  const lectureId = lecture?.id ?? null;
  const [topic, setTopic] = useState("Current Lecture Topic");

  // ---------------------------------------------------------
  // FLOW
  // ---------------------------------------------------------

  const [step, setStep] = useState("loading");
  const [message, setMessage] = useState("");

  // ---------------------------------------------------------
  // PREREQUISITE
  // ---------------------------------------------------------

  const [prerequisiteName, setPrerequisiteName] = useState(
    "the prerequisite concepts"
  );
  const [prerequisiteLectureId, setPrerequisiteLectureId] = useState(null);
  const [prerequisiteLecture, setPrerequisiteLecture] = useState(null);
  const [allLectures, setAllLectures] = useState([]);

  // ---------------------------------------------------------
  // EXPLANATION
  // ---------------------------------------------------------

  const [explanationLevel, setExplanationLevel] = useState(null);
  const [explanationMethod, setExplanationMethod] = useState(null);

  const [explanation, setExplanation] = useState("");
  const [suggestedTimestamps, setSuggestedTimestamps] = useState([]);

  // ---------------------------------------------------------
  // QUIZ
  // ---------------------------------------------------------

  const [quiz, setQuiz] = useState([]);
  const [quizActive, setQuizActive] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerChecked, setAnswerChecked] = useState(false);

  const [answers, setAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizPersisting, setQuizPersisting] = useState(false);
  const [quizPersistError, setQuizPersistError] = useState('');

  // ---------------------------------------------------------
  // CUSTOM QUESTION
  // ---------------------------------------------------------

  const [customQuestion, setCustomQuestion] = useState("");
  const [customLoading, setCustomLoading] = useState(false);

  
  const [chatMessages, setChatMessages] = useState([]);
  const [activeTeachingMode, setActiveTeachingMode] = useState("direct");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);

  const messagesEndRef = useRef(null);
const chatInputRef = useRef(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({
    behavior: "smooth",
  });
}, [chatMessages, chatLoading]);

useEffect(() => {
  if (step === "chat") {
    chatInputRef.current?.focus();
  }
}, [step]);


  // ---------------------------------------------------------
  // LOAD CURRENT LECTURE
  // ---------------------------------------------------------

  useEffect(() => {
    loadLecture();
  }, [requestedLectureId]);

  async function loadLecture() {
    setStep("loading");

    try {
      const response = await fetch(`${API_BASE}/lectures`);

      if (!response.ok) {
        throw new Error("Unable to load lectures");
      }

      const lectures = await response.json();
      const lecturesList = Array.isArray(lectures) ? lectures : [];
      setAllLectures(lecturesList);

      if (lecturesList.length === 0) {
        setLecture(null);
        setStep("error");
        setMessage("No course lectures are currently available.");
        return;
      }

      let currentLecture = null;
      if (requestedLectureId) {
        currentLecture = lecturesList.find(
          (item) => String(item.id) === String(requestedLectureId)
        );

        if (!currentLecture) {
          // Stale legacy ID or nonexistent UUID
          setLecture(null);
          setStep("error");
          setMessage(
            `The requested lecture ID (${requestedLectureId}) was not found in available course lectures. Please choose a valid lecture.`
          );
          return;
        }
      } else {
        // No lecture selected, use first available lecture
        currentLecture = lecturesList[0];
      }

      if (currentLecture) {
        setLecture(currentLecture);

        const derivedTopic =
          currentLecture.title?.includes(":")
            ? currentLecture.title.split(":").slice(1).join(":").trim()
            : currentLecture.title || "Current Lecture Topic";

        setTopic(derivedTopic);

        const prereqVidTitle = currentLecture.prerequisite_lecture_title || currentLecture.prerequisite_topic || (currentLecture.prerequisites && currentLecture.prerequisites.length > 0 ? currentLecture.prerequisites[0] : null);

        let targetPrereq = null;
        if (currentLecture.prerequisite_lecture_id) {
          targetPrereq = lecturesList.find(
            (l) => String(l.id) === String(currentLecture.prerequisite_lecture_id)
          );
        }
        if (!targetPrereq && (currentLecture.prerequisite_lecture_title || currentLecture.prerequisite_topic)) {
          const t = (currentLecture.prerequisite_lecture_title || currentLecture.prerequisite_topic).toLowerCase();
          targetPrereq = lecturesList.find(
            (l) => String(l.id) !== String(currentLecture.id) && (l.title || '').toLowerCase().includes(t)
          );
        }
        if (!targetPrereq) {
          targetPrereq = lecturesList.find((l) => String(l.id) !== String(currentLecture.id));
        }

        if (targetPrereq) {
          setPrerequisiteLecture(targetPrereq);
          setPrerequisiteLectureId(targetPrereq.id);
        }

        if (prereqVidTitle) {
          setPrerequisiteName(prereqVidTitle);
          setMessage(
            `Before learning ${currentLecture.title}, have you watched the prerequisite video "${prereqVidTitle}"?`
          );
        } else {
          setPrerequisiteName(
            `the prerequisite concepts required before ${derivedTopic}`
          );
          setMessage(
            `Before learning ${currentLecture.title}, do you already understand the prerequisite concepts required for this topic?`
          );
        }

        setStep("check_prereq");
      }
    } catch (error) {
      console.error("Lecture loading error:", error);

      setLecture(null);
      setStep("error");
      setMessage(
        "Failed to load course lectures. Please check your network connection and try again."
      );
    }
  }

  // ---------------------------------------------------------
  // RESET QUIZ
  // ---------------------------------------------------------

  function resetQuizState() {
    setQuiz([]);
    setQuizActive(false);
    setQuizLoading(false);

    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswerChecked(false);

    setAnswers({});
    setQuizScore(0);
    setQuizFinished(false);
    setQuizPersisting(false);
    setQuizPersistError('');
  }

  // ---------------------------------------------------------
  // PREREQUISITE YES
  // ---------------------------------------------------------

 
function handlePrerequisiteYes() {
  setExplanationLevel("medium");
  setStep("select_method");
  setMessage(
    `Great! Choose how you would like ${topic} to be explained.`
  );
}


  // ---------------------------------------------------------
  // PREREQUISITE NO
  // ---------------------------------------------------------

  async function handlePrerequisiteNo() {
     if (!lectureId) {
        setMessage("Please wait for a lecture to load, then try again.");
        return;
     }
    setStep("loading");

    try {
      const response = await fetch(
        `${API_BASE}/help-center/state`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lecture_id: lectureId,
            step: "check_prereq",
            knows_prereq: false,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Prerequisite request failed");
      }

      const data = await response.json();

      let targetId = data.prerequisite_lecture_id || lecture?.prerequisite_lecture_id;
      if (!targetId && data.recommended_videos && data.recommended_videos.length > 0) {
        targetId = data.recommended_videos[0].id;
      }
      if (targetId) {
        setPrerequisiteLectureId(targetId);
      }

      let foundPrereq = allLectures.find((l) => String(l.id) === String(targetId));
      if (!foundPrereq && data.prerequisite_name) {
        foundPrereq = allLectures.find(
          (l) =>
            String(l.id) !== String(lectureId) &&
            (l.title || '').toLowerCase().includes(data.prerequisite_name.toLowerCase())
        );
      }
      if (!foundPrereq) {
        foundPrereq = allLectures.find((l) => String(l.id) !== String(lectureId)) || allLectures[0];
      }

      if (foundPrereq) {
        setPrerequisiteLecture(foundPrereq);
        setPrerequisiteLectureId(foundPrereq.id);
        setPrerequisiteName(foundPrereq.title);
      } else if (data.prerequisite_name) {
        setPrerequisiteName(data.prerequisite_name);
      }

      setStep("recommend_previous");
      setMessage(
        data.message ||
        `You should review the prerequisite lecture before learning ${topic}.`
      );
    } catch (error) {
      console.error("Prerequisite error:", error);

      setStep("recommend_previous");
      setMessage(
        `You should review the prerequisite lecture before learning ${topic}.`
      );
    }
  }

  // ---------------------------------------------------------
  // SELECT LEVEL
  // ---------------------------------------------------------

  function handleLevelSelect(level) {
    setExplanationLevel(level);

    setStep("select_method");

    setMessage(
      `You selected ${level}. Now choose how you want ${topic} explained.`
    );
  }

  
  async function handleMethodSelect(method) {
    if (!lectureId) {
      setMessage("Please wait for a lecture to load, then try again.");
      return;
    }

    const modeConfig = {
      direct: {
        title: "Direct Explanation",
        question: `Explain the topic "${topic}" clearly using the lecture transcript.`,
        opening: `Let's understand ${topic} clearly, using your lecture. Ask me any follow-up questions as we go.`,
      },
      real_life: {
        title: "Real-Life Examples",
        question: `Teach "${topic}" using practical real-life examples supported by the lecture transcript.`,
        opening: `Let's connect ${topic} to real-life situations. I'll use examples to help you understand the concept.`,
      },
      misconception: {
        title: "Misconception Clearing",
        question: `Create the first misconception-clearing challenge about "${topic}" based on the lecture transcript. Present one plausible incorrect statement or flawed solution and ask the student to identify the problem. Do not reveal the answer yet.`,
        opening: `Let's test your understanding of ${topic}. I'll give you one challenge at a time. Try to identify the mistake, and I'll help you correct it.`,
      },
      workflow: {
        title: "Workflow / How to Solve",
        question: `Start a guided, step-by-step learning session about "${topic}" using the lecture transcript. Adapt to the subject: use a code dry run for programming, a logical sequence for theory, or formula and solution steps for numerical topics. Start with the first manageable step and invite the student to respond.`,
        opening: `Let's work through ${topic} step by step. I'll guide you through the approach and give you checkpoints so you can practise as we go.`,
      },
    };

    const selectedMode = modeConfig[method] || modeConfig.direct;

    setExplanationMethod(method);
    setActiveTeachingMode(method);
    setChatMessages([]);
    setChatInput("");
    setShowFinishConfirmation(false);
    resetQuizState();
    setChatLoading(true);
    setStep("chat");

    try {
      const response = await fetch(`${API_BASE}/ask-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: selectedMode.question,
          lecture_id: lectureId,
          level: explanationLevel || "medium",
          teaching_mode: method,
          conversation_history: [],
        }),
      });

      if (!response.ok) {
        throw new Error("AI Help Center request failed");
      }

      const data = await response.json();

      if (data.status === "error" || !data.explanation?.trim()) {
        throw new Error(data.explanation || "Empty AI response");
      }

      setChatMessages([
        {
          role: "assistant",
          content: `${selectedMode.opening}\n\n${data.explanation}`,
        },
      ]);

      setSuggestedTimestamps(
        Array.isArray(data.suggested_timestamps)
          ? data.suggested_timestamps
          : []
      );
    } catch (error) {
      console.error("AI Help Center initialization error:", error);

      setChatMessages([
        {
          role: "assistant",
          content:
            "I couldn't start this learning session. Please try again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }


  // ---------------------------------------------------------
  // CUSTOM AI QUESTION
  // ---------------------------------------------------------

  async function handleCustomQuestion(event) {
    if (!lectureId) {
       setMessage("Please wait for a lecture to load, then try again.");
       return;
    }
    event.preventDefault();

    if (!customQuestion.trim()) {
      return;
    }

    setCustomLoading(true);
    setStep("loading");

    try {
      const response = await fetch(`${API_BASE}/ask-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: customQuestion.trim(),
          lecture_id: lectureId,
          level: explanationLevel || "medium",
        }),
      });

      if (!response.ok) {
        throw new Error("Custom AI request failed");
      }

      const data = await response.json();

      if (
        !data.explanation ||
        data.explanation.trim().length === 0
      ) {
        throw new Error("Empty Gemini response");
      }

      setExplanation(data.explanation);

      setSuggestedTimestamps(
        Array.isArray(data.suggested_timestamps)
          ? data.suggested_timestamps
          : []
      );

      setCustomQuestion("");

      resetQuizState();

      setStep("explanation");
    } catch (error) {
      console.error("Custom AI error:", error);

      setExplanation(
        "Gemini could not answer this question. Please check your Gemini API configuration."
      );

      setSuggestedTimestamps([]);

      setStep("explanation");
    } finally {
      setCustomLoading(false);
    }
  }


  
  async function handleChatSend(event) {
    event?.preventDefault();

    const question = chatInput.trim();

    if (!question || chatLoading || !lectureId) {
      return;
    }

    const updatedMessages = [
      ...chatMessages,
      { role: "user", content: question },
    ];

    setChatMessages(updatedMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch(`${API_BASE}/ask-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          lecture_id: lectureId,
          level: explanationLevel || "medium",
          teaching_mode: activeTeachingMode,
          conversation_history: chatMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("AI chat request failed");
      }

      const data = await response.json();

      if (data.status === "error" || !data.explanation?.trim()) {
        throw new Error(data.explanation || "Empty AI response");
      }

      setChatMessages([
        ...updatedMessages,
        { role: "assistant", content: data.explanation },
      ]);
    } catch (error) {
      console.error("AI Help Center chat error:", error);

      setChatMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content:
            "I couldn't answer that right now. Please try sending your question again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }



  // ---------------------------------------------------------
  // GENERATE TOPIC-SPECIFIC QUIZ
  // ---------------------------------------------------------

  async function handleGenerateQuiz() {
    const chatExplanation = chatMessages
      .filter((item) => item.role === "assistant")
      .map((item) => item.content)
      .join("\n\n");

    const learningContent = [
      explanation || "",
      chatExplanation,
    ]
      .filter((item) => item.trim().length > 0)
      .join("\n\n");

    if (!learningContent.trim()) {
      console.error("Cannot generate quiz: no learning content available.");
      setStep("quiz_error");
      return;
    }

    setQuizLoading(true);

    try {
      const quizPrompt = `
Generate a comprehension quiz ONLY about the current lecture topic.

Current lecture:
${lecture?.title || lectureId}

Current topic:
${topic}

Selected difficulty:
${explanationLevel || "medium"}

Selected teaching mode:
${activeTeachingMode}

Learning content from the AI tutoring conversation:
${learningContent}

Requirements:
- Test concepts relevant to the current lecture and topic.
- Use the learning content and lecture transcript as grounding.
- Match the selected difficulty level.
- Generate multiple-choice questions.
- Do not use predefined or unrelated questions.
- Do not assume information that is not supported by the learning content.
`;

      const response = await fetch(`${API_BASE}/generate-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          explanation_text: quizPrompt,
          topic: topic,
          level: explanationLevel || "medium",
          lecture_id: lectureId,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Quiz API failed with status ${response.status}`
        );
      }

      const data = await response.json();

      if (
        !data ||
        !Array.isArray(data.questions) ||
        data.questions.length === 0
      ) {
        throw new Error("The AI returned no quiz questions.");
      }

      const validQuestions = data.questions.filter(
        (question) =>
          question &&
          typeof question.question === "string" &&
          question.question.trim().length > 0 &&
          Array.isArray(question.options) &&
          question.options.length >= 2 &&
          Number.isInteger(question.correct_answer) &&
          question.correct_answer >= 0 &&
          question.correct_answer < question.options.length
      );

      if (validQuestions.length === 0) {
        throw new Error("No valid quiz questions were returned.");
      }

      setQuiz(validQuestions);
      setQuizActive(true);
      setQuizFinished(false);

      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setAnswerChecked(false);
      setAnswers({});
      setQuizScore(0);

      setStep("quiz");
    } catch (error) {
      console.error("Quiz generation error:", error);

      setQuiz([]);
      setQuizActive(false);
      setQuizFinished(false);

      setStep("quiz_error");
    } finally {
      setQuizLoading(false);
    }
  }

  // ---------------------------------------------------------
  // ANSWER QUIZ QUESTION
  // ---------------------------------------------------------

  function handleQuizAnswer(index) {
    if (answerChecked) {
      return;
    }

    setSelectedAnswer(index);
  }

  // ---------------------------------------------------------
  // SUBMIT / NEXT
  // ---------------------------------------------------------

  async function handleQuizSubmit() {
    if (selectedAnswer === null) {
      return;
    }

    const current = quiz[currentQuestion];

    if (!answerChecked) {
      setAnswerChecked(true);

      setAnswers((previous) => ({
        ...previous,
        [currentQuestion]: selectedAnswer,
      }));

      return;
    }

    // Move to next question
    if (currentQuestion < quiz.length - 1) {
      setCurrentQuestion(
        (previous) => previous + 1
      );

      setSelectedAnswer(null);
      setAnswerChecked(false);

      return;
    }

    // -------------------------------------------------------
    // FINAL SCORE
    // -------------------------------------------------------

    const finalAnswers = { ...answers, [currentQuestion]: selectedAnswer };

    let correct = 0;

    quiz.forEach((question, index) => {
      const answer = finalAnswers[index];

      if (
        Number(answer) ===
        Number(question.correct_answer)
      ) {
        correct++;
      }
    });

    const percentage = Math.round(
      (correct / quiz.length) * 100
    );

    setQuizScore(percentage);
    setQuizFinished(true);
    setQuizActive(false);

    if (percentage >= QUIZ_PASS_THRESHOLD) {
      setStep("passed");
    } else {
      setStep("failed");
    }

    // -------------------------------------------------------
    // PERSIST ATTEMPT
    // -------------------------------------------------------

    if (!lectureId) {
      setQuizPersistError('Could not save attempt: lecture ID is missing.');
      return;
    }

    const difficultyMap = { beginner: 'easy', medium: 'medium', advanced: 'hard', easy: 'easy', hard: 'hard' };
    const mappedDifficulty = difficultyMap[(explanationLevel || 'medium').toLowerCase()] || 'medium';

    const answersPayload = quiz.map((q, index) => {
      const sel = finalAnswers[index];
      const isCorrect = Number(sel) === Number(q.correct_answer);
      return {
        question_index: index,
        question: q.question,
        options: q.options || [],
        selected_option: sel !== undefined ? sel : null,
        selected_text: sel !== undefined && q.options ? q.options[sel] : null,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation || null,
      };
    });

    setQuizPersisting(true);
    setQuizPersistError('');

    try {
      const response = await fetch(`${API_BASE}/quiz/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecture_id: lectureId,
          difficulty: mappedDifficulty,
          total_questions: quiz.length,
          correct_answers: correct,
          score: percentage,
          passed: percentage >= QUIZ_PASS_THRESHOLD,
          answers: answersPayload,
        }),
      });

      if (!response.ok) {
        let detail = `Save failed (${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson.detail) detail = errJson.detail;
        } catch { /* keep fallback */ }
        throw new Error(detail);
      }
    } catch (err) {
      console.error('[AIHelpCenter] Failed to persist quiz attempt:', err);
      setQuizPersistError('Result shown but could not be saved: ' + (err.message || 'unknown error'));
    } finally {
      setQuizPersisting(false);
    }
  }

  // ---------------------------------------------------------
  // RETRY
  // ---------------------------------------------------------

  function retryExplanation() {
    resetQuizState();

    setExplanation("");
    setSuggestedTimestamps([]);

    setStep("select_method");

    setMessage(
      `Let's try another way of explaining ${topic}.`
    );
  }

  // ---------------------------------------------------------
  // RETURN TO VIDEO
  // ---------------------------------------------------------

  function returnToVideo() {
    navigate(
      `/student/session?play=${lectureId}`
    );
  }

  // ---------------------------------------------------------
  // LEARNING SUMMARY
  // ---------------------------------------------------------

  function renderSummary(passed) {
    return (
      <div className="mt-8 pt-6 border-t border-[#D9E1D2] space-y-4 text-left">

        <h5 className="font-outfit font-bold text-xs text-primary-400 uppercase tracking-widest">
          Learning Summary
        </h5>

        <div className="grid grid-cols-2 gap-4">

          <div className="p-4 bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl shadow-xs">
            <span className="text-[10px] text-[#68766B] block">
              Topic
            </span>

            <span className="text-xs font-bold text-[#26332A]">
              {topic}
            </span>
          </div>

          <div className="p-4 bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl shadow-xs">
            <span className="text-[10px] text-[#68766B] block">
              Quiz Score
            </span>

            <span
              className={`text-xs font-bold ${passed
                  ? "text-emerald-400"
                  : "text-rose-400"
                }`}
            >
              {quizScore}%
            </span>
          </div>

          <div className="p-4 bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl shadow-xs">
            <span className="text-[10px] text-[#68766B] block">
              Required Threshold
            </span>

            <span className="text-xs font-bold text-[#26332A]">
              {QUIZ_PASS_THRESHOLD}%
            </span>
          </div>

          <div className="p-4 bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl shadow-xs">
            <span className="text-[10px] text-[#68766B] block">
              Status
            </span>

            <span
              className={`text-xs font-bold ${passed
                  ? "text-emerald-400"
                  : "text-rose-400"
                }`}
            >
              {passed ? "Passed" : "Needs Review"}
            </span>
          </div>

        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-3xl mx-auto flex flex-col justify-center min-h-[80vh]">

      <div className="glass-panel rounded-3xl p-8 border-primary-500/20 shadow-2xl">

        {/* HEADER */}

        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[#D9E1D2]">

          <div className="p-2.5 bg-primary-600/10 border border-primary-500/30 rounded-xl">
            <Sparkles className="h-5 w-5 text-primary-400" />
          </div>

          <div>
            <h4 className="font-outfit font-bold text-base text-[#26332A]">
              AI Help Center
            </h4>

            <p className="text-[10px] text-[#879187] font-semibold tracking-wider uppercase">
              Interactive Concept Remediation
            </p>
          </div>

        </div>

        {/* LOADING */}

        {step === "loading" && (
          <div className="text-center py-16 space-y-4">

            <RefreshCw className="h-8 w-8 animate-spin text-primary-500 mx-auto" />

            <p className="text-xs text-[#879187]">
              CogniTrace AI is processing your request...
            </p>

          </div>
        )}

        {/* ERROR */}

        {step === "error" && (
          <div className="text-center py-12 space-y-4">
            <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
            <h4 className="font-outfit font-bold text-base text-[#26332A]">Lecture Selection Notice</h4>
            <p className="text-xs text-[#879187] max-w-md mx-auto leading-relaxed">{message}</p>
            <button
              onClick={() => navigate('/student/lectures')}
              className="mt-4 px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-2 transition-all"
            >
              Browse Course Lectures
            </button>
          </div>
        )}

        {/* --------------------------------------------------
            PREREQUISITE
        -------------------------------------------------- */}

        {step === "check_prereq" && (
          <div className="space-y-6">

            <div className="p-4 bg-[#FCFCF8] rounded-2xl border border-[#D9E1D2] flex gap-3 shadow-xs">

              <AlertCircle className="h-5 w-5 text-primary-400 shrink-0" />

              <div>

                <span className="font-bold text-[#26332A] block mb-1">
                  Prerequisite Check
                </span>

                <p className="text-xs text-[#879187]">
                  {message}
                </p>

              </div>

            </div>

            <div className="flex gap-4">

              <button
                onClick={handlePrerequisiteYes}
                className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider"
              >
                Yes, I understand them
              </button>

              <button
                onClick={handlePrerequisiteNo}
                className="flex-1 py-3 bg-[#E2E8D8] border border-[#D9E1D2] hover:bg-[#E8EDE1] text-[#315C46] font-bold rounded-full text-xs uppercase tracking-wider"
              >
                No, I need a refresher
              </button>

            </div>

          </div>
        )}

        {/* --------------------------------------------------
            RECOMMENDED PREVIOUS VIDEO
        -------------------------------------------------- */}

        {step === "recommend_previous" && (
          <div className="space-y-6 text-center py-4">

            <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">

              <BookOpen className="h-6 w-6 text-amber-400" />

            </div>

            <h4 className="font-outfit font-bold text-lg text-[#26332A]">
              Recommended Prerequisite Lecture
            </h4>

            <p className="text-xs text-[#879187] leading-relaxed">
              {message}
            </p>

            <p className="text-xs text-[#68766B]">
              Recommended: {prerequisiteName}
            </p>

            <button
              onClick={() => {
                let targetPrereq = prerequisiteLecture;
                if (!targetPrereq) {
                  targetPrereq =
                    allLectures.find(
                      (l) => String(l.id) === String(prerequisiteLectureId)
                    ) ||
                    allLectures.find(
                      (l) => String(l.id) !== String(lectureId)
                    ) ||
                    allLectures[0];
                  if (targetPrereq) {
                    setPrerequisiteLecture(targetPrereq);
                    setPrerequisiteLectureId(targetPrereq.id);
                  }
                }
                setStep("watch_prerequisite");
              }}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-brand-950 font-bold rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
            >
              Go to Prerequisite Lecture

              <ArrowRight className="h-3.5 w-3.5" />

            </button>

          </div>
        )}

        {/* --------------------------------------------------
            WATCH PREREQUISITE VIDEO
        -------------------------------------------------- */}

        {step === "watch_prerequisite" && (() => {
          const activePrereq =
            prerequisiteLecture ||
            allLectures.find(
              (l) => String(l.id) === String(prerequisiteLectureId)
            ) ||
            allLectures.find(
              (l) => String(l.id) !== String(lectureId)
            ) ||
            allLectures[0];

          const isPrereqYoutube = Boolean(
            activePrereq?.youtube_id ||
            activePrereq?.video_type === "youtube" ||
            activePrereq?.source === "youtube" ||
            (activePrereq?.video_url &&
              activePrereq.video_url.includes("youtube.com"))
          );

          const prereqYoutubeId =
            activePrereq?.youtube_id ||
            extractYoutubeVideoId(
              activePrereq?.video_url || activePrereq?.youtube_url
            );

          const prereqVideoUrl = activePrereq?.video_url?.startsWith("/api")
            ? activePrereq.video_url
            : activePrereq?.id
            ? `/api/faculty/lectures/${activePrereq.id}/video`
            : "";

          return (
            <div className="space-y-6 py-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Play className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                      Prerequisite Video
                    </span>
                    <h3 className="font-outfit font-bold text-base text-[#26332A] line-clamp-1">
                      {activePrereq?.title || prerequisiteName}
                    </h3>
                    {activePrereq?.duration && (
                      <span className="text-[11px] text-[#879187]">
                        Duration: {activePrereq.duration}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setStep("recommend_previous")}
                  className="text-xs text-[#879187] hover:text-[#26332A] px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors shrink-0"
                >
                  Back
                </button>
              </div>

              {/* Video Player Embed */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[#D9E1D2] shadow-2xl">
                {isPrereqYoutube && prereqYoutubeId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${prereqYoutubeId}?autoplay=1`}
                    title={activePrereq?.title || "Prerequisite Video"}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    key={prereqVideoUrl}
                    src={prereqVideoUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  >
                    Your browser does not support HTML5 video.
                  </video>
                )}
              </div>

              {/* Action buttons after watching */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#D9E1D2]">
                <button
                  onClick={handlePrerequisiteYes}
                  className="w-full sm:w-auto px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-900/30"
                >
                  I'm Ready — Return to Lesson
                  <ArrowRight className="h-4 w-4" />
                </button>

                {activePrereq?.id && (
                  <button
                    onClick={() =>
                      navigate(`/student/session?play=${activePrereq.id}`)
                    }
                    className="text-xs text-[#879187] hover:text-[#26332A] underline underline-offset-4 py-1"
                  >
                    Open in full session player
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        
        {/* --------------------------------------------------
            EXPLANATION METHOD
        -------------------------------------------------- */}

{step === "select_method" && (
          <div className="space-y-6">
            <p className="text-sm text-[#26332A] font-medium">
              {message}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => handleMethodSelect("direct")}
                className="p-4 bg-[#FCFCF8] hover:bg-[#E8EDE1] border border-[#D9E1D2] hover:border-[#315C46] rounded-2xl text-left transition-all"
              >
                <span className="text-[#26332A] font-bold text-sm">
                  Direct Explanation
                </span>
                <span className="block text-[11px] text-[#68766B] mt-1">
                  Understand the concept clearly, step by step.
                </span>
              </button>

              <button
                onClick={() => handleMethodSelect("real_life")}
                className="p-4 bg-[#FCFCF8] hover:bg-[#E8EDE1] border border-[#D9E1D2] hover:border-[#315C46] rounded-2xl text-left transition-all"
              >
                <span className="text-[#26332A] font-bold text-sm">
                  Real-Life Examples
                </span>
                <span className="block text-[11px] text-[#68766B] mt-1">
                  Learn through practical examples and applications.
                </span>
              </button>

              <button
                onClick={() => handleMethodSelect("misconception")}
                className="p-4 bg-[#FCFCF8] hover:bg-[#E8EDE1] border border-[#D9E1D2] hover:border-[#315C46] rounded-2xl text-left transition-all"
              >
                <span className="text-[#26332A] font-bold text-sm">
                  Misconception Clearing
                </span>
                <span className="block text-[11px] text-[#68766B] mt-1">
                  Identify mistakes and correct misunderstandings.
                </span>
              </button>

              <button
                onClick={() => handleMethodSelect("workflow")}
                className="p-4 bg-[#FCFCF8] hover:bg-[#E8EDE1] border border-[#D9E1D2] hover:border-[#315C46] rounded-2xl text-left transition-all"
              >
                <span className="text-[#26332A] font-bold text-sm">
                  Workflow / How to Solve
                </span>
                <span className="block text-[11px] text-[#68766B] mt-1">
                  Practice solution steps, code dry runs, and approaches.
                </span>
              </button>
            </div>
          </div>
        )}


      
        {/* --------------------------------------------------
            EXPLANATION METHOD
        -------------------------------------------------- */}


{/* SHARED AI LEARNING CHAT */}

{step === "chat" && (
  <div className="flex flex-col h-[65vh] min-h-[460px] max-h-[680px] -mx-2">

    {/* Chat header */}
    <div className="flex items-center justify-between gap-3 px-3 pb-4 border-b border-[#D9E1D2]">
      <div className="min-w-0">
        <h3 className="text-[#26332A] font-bold text-base truncate">
          🤖 {topic}
        </h3>

        <p className="text-xs text-[#879187] mt-1">
          {activeTeachingMode === "direct" && "Direct Explanation"}
          {activeTeachingMode === "real_life" && "Real-Life Examples"}
          {activeTeachingMode === "misconception" && "Misconception Clearing"}
          {activeTeachingMode === "workflow" && "Workflow / How to Solve"}
          {" · "}
          {(explanationLevel || "medium").toUpperCase()}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowFinishConfirmation(true)}
        disabled={chatLoading || quizLoading}
        className="shrink-0 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-[#26332A] text-xs font-bold transition-colors"
      >
        Done
      </button>
    </div>

    {/* Messages */}
    <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-4">

      {chatMessages.length === 0 && !chatLoading && (
        <div className="text-center text-sm text-[#879187] py-8">
          Start learning by asking a question about {topic}.
        </div>
      )}

      {chatMessages.map((item, index) => (
        <div
          key={`${item.role}-${index}`}
          className={`flex items-end gap-2 ${
            item.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          {item.role === "assistant" && (
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-base">
              🤖
            </div>
          )}

          <div
            className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              item.role === "user"
                ? "rounded-br-sm bg-primary-600 text-white"
                : "rounded-bl-sm border border-[#D9E1D2] bg-[#EFF1E7] text-[#26332A]"
            }`}
          >
           <ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    p: ({ children }) => (
      <p className="mb-2 last:mb-0">{children}</p>
    ),
    strong: ({ children }) => (
      <strong className="font-bold text-[#26332A]">{children}</strong>
    ),
    ul: ({ children }) => (
      <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>
    ),
    li: ({ children }) => <li>{children}</li>,
    code: ({ children }) => (
      <code className="rounded bg-slate-800 px-1.5 py-0.5 text-emerald-300 font-mono text-xs">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="overflow-x-auto rounded-lg bg-[#EFF1E7] border border-[#D9E1D2] text-[#26332A] p-3 my-2 text-xs">
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-primary-500 pl-3 my-2 text-slate-300">
        {children}
      </blockquote>
    ),
  }}
>
  {item.content
    .replace(/\\\*\*/g, "**")
    .replace(/\\\*/g, "*")
    .replace(/\\`/g, "`")}
</ReactMarkdown>
          </div>
        </div>
      ))}

      {chatLoading && (
        <div className="flex items-end gap-2 justify-start">
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
            🤖
          </div>

          <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-[#D9E1D2] bg-[#EFF1E7] px-4 py-3 text-sm text-[#68766B]">
            <RefreshCw className="h-4 w-4 animate-spin text-primary-400" />
            AI Tutor is thinking...
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>

    {/* Message input */}
    <form
      onSubmit={handleChatSend}
      className="shrink-0 border-t border-[#D9E1D2] pt-3 px-3"
    >
      <div className="flex items-end gap-2 rounded-2xl border border-[#D9E1D2] bg-[#FCFCF8] p-2 focus-within:border-[#315C46] transition-colors">
        <textarea
          ref={chatInputRef}
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              handleChatSend(event);
            }
          }}
          placeholder="Ask a follow-up question..."
          rows={1}
          disabled={chatLoading || quizLoading}
          className="flex-1 min-w-0 resize-none bg-transparent px-3 py-2 text-sm text-black font-medium placeholder:text-black/50 focus:outline-none disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={chatLoading || quizLoading || !chatInput.trim()}
          aria-label="Send message"
          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>

      <p className="text-[10px] text-[#68766B] text-center mt-2">
        Enter to send · Shift + Enter for a new line
      </p>
    </form>

  </div>
)}

        {/* --------------------------------------------------
            QUIZ
        -------------------------------------------------- */}

        {step === "quiz" &&
          quizActive &&
          quiz.length > 0 &&
          !quizFinished && (
            <div className="space-y-6">

              <div className="flex justify-between items-center">

                <h5 className="font-outfit font-bold text-sm text-[#26332A] flex items-center gap-2">

                  <BookOpen className="h-4 w-4 text-primary-400" />

                  {topic} Quiz

                </h5>

                <span className="text-[10px] text-[#68766B] font-bold">
                  Question {currentQuestion + 1} of{" "}
                  {quiz.length}
                </span>

              </div>

              <p className="text-sm text-[#26332A] font-semibold leading-relaxed">
                {quiz[currentQuestion].question}
              </p>

              <div className="space-y-3">

                {quiz[currentQuestion].options.map(
                  (option, index) => {

                    const correct =
                      Number(index) ===
                      Number(
                        quiz[currentQuestion]
                          .correct_answer
                      );

                    const selected =
                      selectedAnswer === index;

                    let style =
                      "border-[#D9E1D2] bg-[#FCFCF8] text-[#68766B] hover:bg-[#E8EDE1]";

                    if (!answerChecked && selected) {
                      style =
                        "border-black bg-black text-white";
                    }

                    if (answerChecked && correct) {
                      style =
                        "border-emerald-500 bg-emerald-500/10 text-emerald-400";
                    }

                    if (
                      answerChecked &&
                      selected &&
                      !correct
                    ) {
                      style =
                        "border-rose-500 bg-rose-500/10 text-rose-400";
                    }

                    return (
                      <button
                        key={index}
                        onClick={() =>
                          handleQuizAnswer(index)
                        }
                        className={`w-full text-left p-4 rounded-xl border transition-all ${style}`}
                      >
                        <span className="font-bold mr-3">
                          {String.fromCharCode(
                            65 + index
                          )}
                          .
                        </span>

                        {option}
                      </button>
                    );
                  }
                )}

              </div>

              {answerChecked && (
                <div className="p-4 bg-[#FCFCF8] rounded-2xl border border-[#D9E1D2] shadow-xs">

                  <p
                    className={`font-bold text-xs mb-2 ${Number(selectedAnswer) ===
                        Number(
                          quiz[currentQuestion]
                            .correct_answer
                        )
                        ? "text-emerald-400"
                        : "text-rose-400"
                      }`}
                  >
                    {Number(selectedAnswer) ===
                      Number(
                        quiz[currentQuestion]
                          .correct_answer
                      )
                      ? "✓ Correct"
                      : "✗ Incorrect"}
                  </p>

                  <p className="text-xs text-[#879187] leading-relaxed">
                    {quiz[currentQuestion].explanation ||
                      "Review the explanation and transcript segments above."}
                  </p>

                </div>
              )}

              <button
                onClick={handleQuizSubmit}
                disabled={selectedAnswer === null}
                className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs uppercase tracking-wider"
              >
                {!answerChecked
                  ? "Check Answer"
                  : currentQuestion < quiz.length - 1
                    ? "Next Question"
                    : "Finish Quiz"}
              </button>

            </div>
          )}

       
{/* --------------------------------------------------
    QUIZ ERROR
-------------------------------------------------- */}

{step === "quiz_error" && (
  <div className="space-y-6 text-center py-8">
    <XCircle className="h-12 w-12 text-rose-400 mx-auto" />

    <h4 className="text-lg font-bold text-[#26332A]">
      Quiz Could Not Be Generated
    </h4>

    <p className="text-xs text-[#879187] max-w-md mx-auto">
      We couldn't generate valid questions for this lecture topic.
      Your learning conversation is still available.
    </p>

    <p className="text-xs text-[#68766B]">
      Please check that Groq is configured correctly and that
      transcript chunks are available for this lecture.
    </p>

    <div className="flex justify-center gap-3">
      <button
        onClick={() => setStep("chat")}
        className="px-5 py-3 bg-primary-600 text-white rounded-xl text-xs font-bold"
      >
        Return to Chat
      </button>
    </div>
  </div>
)}

        {/* --------------------------------------------------
            PASSED
        -------------------------------------------------- */}

        {step === "passed" && (
          <div className="space-y-6 text-center py-6">

            <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">

              <CheckCircle className="h-7 w-7 text-emerald-400" />

            </div>

            <h4 className="font-outfit font-bold text-xl text-[#26332A]">
              Topic Quiz Passed!
            </h4>

            <p className="text-sm text-[#879187]">
              You scored{" "}
              <strong className="text-emerald-400">
                {quizScore}%
              </strong>{" "}
              on {topic}.
            </p>

            <p className="text-xs text-[#68766B]">
              Required threshold: {QUIZ_PASS_THRESHOLD}%
            </p>

            {quizPersisting && (
              <p className="text-xs text-[#68766B]">Saving attempt…</p>
            )}

            {quizPersistError && (
              <p className="text-xs text-rose-400">⚠ {quizPersistError}</p>
            )}

            {renderSummary(true)}

            <button
              onClick={returnToVideo}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-brand-950 font-bold rounded-xl text-xs uppercase"
            >
              Return to Video Lecture
            </button>

          </div>
        )}

        {/* --------------------------------------------------
            FAILED
        -------------------------------------------------- */}

        {step === "failed" && (
          <div className="space-y-6 text-center py-6">

            <div className="h-14 w-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto">

              <XCircle className="h-7 w-7 text-rose-400" />

            </div>

            <h4 className="font-outfit font-bold text-xl text-[#26332A]">
              Needs More Review
            </h4>

            <p className="text-sm text-[#879187]">
              You scored{" "}
              <strong className="text-rose-400">
                {quizScore}%
              </strong>{" "}
              on {topic}.
            </p>

            <p className="text-xs text-[#68766B]">
              You need at least{" "}
              {QUIZ_PASS_THRESHOLD}% to pass.
            </p>

            {quizPersisting && (
              <p className="text-xs text-[#68766B]">Saving attempt…</p>
            )}

            {quizPersistError && (
              <p className="text-xs text-rose-400">⚠ {quizPersistError}</p>
            )}

            {renderSummary(false)}

            <div className="flex justify-center gap-3">

              <button
                onClick={retryExplanation}
                className="px-5 py-3 bg-[#E2E8D8] border border-[#D9E1D2] text-[#315C46] hover:bg-[#E8EDE1] font-bold rounded-full text-xs uppercase flex items-center gap-2"
              >

                <RotateCcw className="h-3.5 w-3.5" />

                Try Another Explanation

              </button>

              <button
                onClick={returnToVideo}
                className="px-5 py-3 bg-primary-600 text-white font-bold rounded-xl text-xs uppercase"
              >
                Return to Video
              </button>

            </div>

          </div>
        )}


{/* FINISH LEARNING CONFIRMATION */}

{showFinishConfirmation && step === "chat" && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
    <div className="w-full max-w-md rounded-2xl border border-[#D9E1D2] bg-[#DEE8DC] p-6 shadow-2xl">

      <h3 className="text-lg font-bold text-[#26332A]">
        Finish Learning?
      </h3>

      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Are you sure you want to finish learning and take the quiz?
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setShowFinishConfirmation(false)}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
        >
          No, Continue Learning
        </button>

        <button
          type="button"
          onClick={() => {
            setShowFinishConfirmation(false);
            handleGenerateQuiz();
          }}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-[#26332A] hover:bg-primary-500"
        >
          Yes, Take Quiz
        </button>
      </div>

    </div>
  </div>
)}

      </div>
    </div>
  );
}