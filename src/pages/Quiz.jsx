import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Sidebar from "../components/Layout/Sidebar";
import { useTheme } from "../context/ThemeContext";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

/* ============================================================
   TEXT CLEANUP + LATEX RENDERING
   Same contract as AITutor/Topics: strip stray ** and — from
   AI output, then render $...$ / $$...$$ segments through KaTeX.
   ============================================================ */
function cleanAIText(raw = "") {
  return String(raw || "").replace(/\*\*/g, "").replace(/—/g, "-");
}

function MathText({ text }) {
  const cleaned = cleanAIText(text);
  const blockParts = cleaned.split(/(\$\$[^$]+\$\$)/g);
  return (
    <>
      {blockParts.map((part, i) => {
        if (/^\$\$[^$]+\$\$$/.test(part)) {
          return <BlockMath key={i} math={part.slice(2, -2)} />;
        }
        const inlineParts = part.split(/(\$[^$]+\$)/g);
        return (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>
            {inlineParts.map((seg, j) =>
              /^\$[^$]+\$$/.test(seg) ? (
                <InlineMath key={j} math={seg.slice(1, -1)} />
              ) : (
                <span key={j}>{seg}</span>
              )
            )}
          </span>
        );
      })}
    </>
  );
}

/* ============================================================
   DYNAMIC QUESTION-COUNT LOGIC
   Class level decides the base band; whether the AI judges the
   topic "complex" for that band decides which end of the range
   it should land in. We hand the AI the exact rule in the
   prompt rather than hard-coding a single number ourselves,
   because "complex" is a judgement call the model is better
   placed to make per-topic than a keyword heuristic.
   ============================================================ */
function getLevelCategory(classLevel = "") {
  if (classLevel.startsWith("Primary")) return "Primary";
  if (classLevel.startsWith("JSS")) return "JSS";
  if (classLevel.startsWith("SS")) return "SS";
  return "JSS"; // sensible fallback if classLevel wasn't passed through
}

function getCountInstruction(category) {
  switch (category) {
    case "Primary":
      return "This is a Primary school student. If the topic is NOT complex for this level, generate exactly 10 questions. If it IS complex, generate exactly 20 questions.";
    case "SS":
      return "This is a Senior Secondary (SS) student preparing for WAEC/NECO/JAMB. If the topic is NOT complex for this level, generate between 20 and 30 questions. If it IS complex, generate between 40 and 50 questions. Pick one exact number within the applicable range.";
    case "JSS":
    default:
      return "This is a Junior Secondary (JSS) student. If the topic is NOT complex for this level, generate exactly 20 questions. If it IS complex, generate between 30 and 40 questions. Pick one exact number within the applicable range.";
  }
}

function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const { topicTitle, classLevel } = location.state || {};
  const { darkMode } = useTheme();

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerLocked, setAnswerLocked] = useState(false); // true once feedback is shown for this question
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [xpEarned, setXpEarned] = useState(0);

  const levelCategory = getLevelCategory(classLevel);

  /* ---------------- AI question generation ---------------- */
  const generateQuestions = async (title) => {
    setGenerating(true);
    setGenError("");
    try {
      const prompt = `
You are an expert Nigerian secondary school teacher following the NERDC curriculum.
Assess if the topic is complex for this class level and generate exactly N multiple-choice questions (with 4 options, one correct answer, and a short explanation). Use LaTeX for any formulae.

Topic: "${title}"
Class level: ${classLevel || "Not specified"}
${getCountInstruction(levelCategory)}

Rules:
- Each question must have 4 options (A, B, C, D)
- Only one option is correct
- Include a short "explanation" (1-2 sentences) for why the correct answer is correct
- Questions should be appropriate for Nigerian students
- Keep language clear and simple
- Never use markdown bold markers ** or em-dashes —
- Any equation, formula or chemical notation MUST use valid LaTeX (inline $...$ or block $$...$$)

Return ONLY a valid JSON array like this example:
[
  {
    "question": "What is the capital of Nigeria?",
    "options": { "A": "Lagos", "B": "Abuja", "C": "Kano", "D": "Ibadan" },
    "correct": "B",
    "explanation": "Abuja became Nigeria's capital in 1991, replacing Lagos."
  }
]
Do not add any extra text, markdown or explanation outside the JSON.
`;

      const res = await fetch("/api/generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const { text: rawText } = await res.json();
      let text = rawText.trim();
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      const generated = JSON.parse(text);
      setQuestions(generated);
    } catch (error) {
      console.error("Failed to generate questions:", error);
      setGenError(
        error?.message?.includes("429") || error?.message?.includes("quota")
          ? "The AI has hit its usage limit for now. Please try again shortly."
          : "Couldn't generate questions for this topic. Please try again."
      );
      setQuestions([
        {
          question: `What is an important concept in ${title}?`,
          options: { A: "Option A", B: "Option B", C: "Option C", D: "Option D" },
          correct: "A",
          explanation: "",
        },
      ]);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }

      if (!topicTitle) {
        setLoading(false);
        return;
      }

      generateQuestions(topicTitle);
    };

    checkAuthAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, topicTitle]);

  /* ---------------- Answering + immediate feedback ---------------- */
  const handleAnswer = (option) => {
    if (answerLocked) return; // already answered this question
    setSelectedAnswer(option);
    setAnswerLocked(true);
    if (option === questions[currentQuestion].correct) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = async () => {
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setAnswerLocked(false);
    } else {
      const earned = score * 10;
      setXpEarned(earned);
      setShowResult(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile, error: fetchError } = await supabase
            .from("profiles")
            .select("xp")
            .eq("id", session.user.id)
            .single();

          if (fetchError) throw fetchError;

          const { error: updateError } = await supabase
            .from("profiles")
            .update({ xp: (profile?.xp || 0) + earned })
            .eq("id", session.user.id);

          if (updateError) throw updateError;
        }
      } catch (error) {
        console.error("Error updating XP:", error);
      }
    }
  };

  const retryQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswerLocked(false);
    setScore(0);
    setShowResult(false);
    setXpEarned(0);
    generateQuestions(topicTitle);
  };

  if (loading || generating) {
    return (
      <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 flex items-center justify-center p-6">
          <p className={`text-lg font-medium ${darkMode ? "text-green-400" : "text-green-700"}`}>
            {generating ? `AI is generating questions for "${topicTitle}"...` : "Loading quiz..."}
          </p>
        </main>
      </div>
    );
  }

  if (!topicTitle || questions.length === 0) {
    return (
      <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 pt-20 md:pt-8 px-5 md:px-8 pb-8">
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
            No quiz selected
          </h2>
          <button
            onClick={() => navigate("/dashboard")}
            className={`text-sm font-medium hover:underline ${darkMode ? "text-green-400" : "text-green-700"}`}
          >
            Go back to Dashboard
          </button>
        </main>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progressPct = ((currentQuestion + (answerLocked ? 1 : 0)) / questions.length) * 100;

  return (
    <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 ml-0 md:ml-64 pt-20 md:pt-8 px-5 md:px-8 pb-8">
        <button
          onClick={() => navigate(-1)}
          className={`text-sm font-medium mb-4 hover:underline ${darkMode ? "text-green-400" : "text-green-700"}`}
        >
          ← Back
        </button>

        <h1 className={`text-2xl md:text-3xl font-bold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
          {topicTitle}
        </h1>
        {classLevel && (
          <p className={`mb-4 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{classLevel}</p>
        )}

        {genError && (
          <div className="mb-4 max-w-2xl px-4 py-2.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 border border-red-300">
            {genError}
          </div>
        )}

        {!showResult ? (
          <div className={`rounded-2xl p-6 md:p-8 shadow-sm max-w-2xl ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            {/* Progress indicator */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-1.5">
                <span className={`text-sm font-semibold ${darkMode ? "text-green-400" : "text-green-700"}`}>
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Score: {score}
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                <div
                  className="h-full bg-green-700 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <h2 className={`text-lg md:text-xl leading-relaxed mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}>
              <MathText text={question.question} />
            </h2>

            <div className="flex flex-col gap-3 mb-6">
              {Object.entries(question.options).map(([key, value]) => {
                const isSelected = selectedAnswer === key;
                const isCorrectOption = key === question.correct;
                let stateClasses = darkMode
                  ? "border-gray-700 bg-gray-900 text-gray-200 hover:border-gray-600"
                  : "border-gray-200 bg-white text-gray-800 hover:border-gray-300";

                if (answerLocked) {
                  if (isCorrectOption) {
                    stateClasses = darkMode
                      ? "border-green-500 bg-green-500/10 text-white"
                      : "border-green-700 bg-green-50 text-gray-900";
                  } else if (isSelected && !isCorrectOption) {
                    stateClasses = darkMode
                      ? "border-red-500 bg-red-500/10 text-white"
                      : "border-red-500 bg-red-50 text-gray-900";
                  }
                } else if (isSelected) {
                  stateClasses = darkMode
                    ? "border-green-500 bg-green-500/10 text-white"
                    : "border-green-700 bg-green-50 text-gray-900";
                }

                return (
                  <button
                    key={key}
                    onClick={() => handleAnswer(key)}
                    disabled={answerLocked}
                    className={`text-left px-4 py-3.5 rounded-xl border-2 text-[15px] transition ${stateClasses} ${
                      answerLocked ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    <strong>{key}.</strong> <MathText text={value} />
                    {answerLocked && isCorrectOption && (
                      <span className="ml-2 text-green-600 font-semibold">✓ Correct</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Immediate feedback + explanation */}
            {answerLocked && question.explanation && (
              <div
                className={`mb-6 rounded-xl p-4 border-l-4 border-amber-500 text-sm leading-relaxed ${
                  darkMode ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-900"
                }`}
              >
                <p className="font-semibold mb-1">
                  {selectedAnswer === question.correct ? "Correct!" : "Not quite."}
                </p>
                <MathText text={question.explanation} />
              </div>
            )}

            <button
              onClick={handleNext}
              disabled={!answerLocked}
              className={`px-7 py-3.5 rounded-xl font-semibold text-[15px] bg-green-700 text-white transition ${
                answerLocked ? "hover:bg-green-800 cursor-pointer" : "opacity-50 cursor-not-allowed"
              }`}
            >
              {currentQuestion + 1 === questions.length ? "Finish Quiz" : "Next Question"}
            </button>
          </div>
        ) : (
          <div className={`rounded-2xl p-8 md:p-10 shadow-sm max-w-md text-center ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
              Quiz Completed! 🎉
            </h2>
            <p className={`text-lg mb-2 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
              You scored <strong>{score}</strong> out of <strong>{questions.length}</strong>
            </p>
            <p className={`text-xl font-bold ${darkMode ? "text-green-400" : "text-green-700"}`}>
              +{xpEarned} XP Earned!
            </p>
            <p className={`mt-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              {score === questions.length
                ? "Perfect score! Amazing work!"
                : score >= questions.length / 2
                ? "Good job! Keep practicing."
                : "Review the topic and try again!"}
            </p>

            <div className="mt-6 flex gap-3 justify-center flex-wrap">
              <button
                onClick={retryQuiz}
                className="px-6 py-3 rounded-xl font-semibold text-[15px] bg-green-700 text-white hover:bg-green-800 transition"
              >
                Try New Questions
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className={`px-6 py-3 rounded-xl font-semibold text-[15px] text-white transition ${
                  darkMode ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-500 hover:bg-gray-600"
                }`}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Quiz;
