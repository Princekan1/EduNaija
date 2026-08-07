import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc, increment } from "firebase/firestore";
import { auth, db, aiModel } from "../firebase";
import Sidebar from "../components/Layout/Sidebar";
import { useTheme } from "../context/ThemeContext";

function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const { topicTitle } = location.state || {};
  const { darkMode } = useTheme();

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      if (!topicTitle) {
        setLoading(false);
        return;
      }

      generateQuestions(topicTitle);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, topicTitle]);

  const generateQuestions = async (title) => {
    setGenerating(true);
    try {
      const prompt = `
You are an expert Nigerian secondary school teacher following the NERDC curriculum.
Generate exactly 5 multiple-choice questions about the topic: "${title}".

Rules:
- Each question must have 4 options (A, B, C, D)
- Only one option is correct
- Questions should be appropriate for Nigerian students
- Keep language clear and simple

Return ONLY a valid JSON array like this example:
[
  {
    "question": "What is the capital of Nigeria?",
    "options": { "A": "Lagos", "B": "Abuja", "C": "Kano", "D": "Ibadan" },
    "correct": "B"
  }
]
Do not add any extra text, markdown or explanation.
`;

      const result = await aiModel.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      const generated = JSON.parse(text);
      setQuestions(generated);
    } catch (error) {
      console.error("Failed to generate questions:", error);
      setQuestions([
        {
          question: `What is an important concept in ${title}?`,
          options: { A: "Option A", B: "Option B", C: "Option C", D: "Option D" },
          correct: "A"
        }
      ]);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const handleAnswer = (option) => {
    setSelectedAnswer(option);
  };

  const handleNext = async () => {
    let newScore = score;
    if (selectedAnswer === questions[currentQuestion].correct) {
      newScore = score + 1;
      setScore(newScore);
    }

    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      const earned = newScore * 10;
      setXpEarned(earned);
      setShowResult(true);

      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            xp: increment(earned)
          });
        }
      } catch (error) {
        console.error("Error updating XP:", error);
      }
    }
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
        <main className="flex-1 ml-0 md:ml-64 p-5 md:p-8">
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

  return (
    <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 ml-0 md:ml-64 p-5 md:p-8">
        <button
          onClick={() => navigate(-1)}
          className={`text-sm font-medium mb-4 hover:underline ${darkMode ? "text-green-400" : "text-green-700"}`}
        >
          ← Back
        </button>

        <h1 className={`text-2xl md:text-3xl font-bold mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}>
          {topicTitle}
        </h1>

        {!showResult ? (
          <div className={`rounded-2xl p-6 md:p-8 shadow-sm max-w-2xl ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            <div className={`font-semibold mb-4 ${darkMode ? "text-green-400" : "text-green-700"}`}>
              Question {currentQuestion + 1} of {questions.length}
            </div>

            <h2 className={`text-lg md:text-xl leading-relaxed mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}>
              {question.question}
            </h2>

            <div className="flex flex-col gap-3 mb-8">
              {Object.entries(question.options).map(([key, value]) => {
                const isSelected = selectedAnswer === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleAnswer(key)}
                    className={`text-left px-4 py-3.5 rounded-xl border-2 text-[15px] transition ${
                      isSelected
                        ? darkMode
                          ? "border-green-500 bg-green-500/10 text-white"
                          : "border-green-700 bg-green-50 text-gray-900"
                        : darkMode
                        ? "border-gray-700 bg-gray-900 text-gray-200 hover:border-gray-600"
                        : "border-gray-200 bg-white text-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <strong>{key}.</strong> {value}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNext}
              disabled={!selectedAnswer}
              className={`px-7 py-3.5 rounded-xl font-semibold text-[15px] bg-green-700 text-white transition ${
                selectedAnswer ? "hover:bg-green-800 cursor-pointer" : "opacity-50 cursor-not-allowed"
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
                onClick={() => {
                  setCurrentQuestion(0);
                  setSelectedAnswer(null);
                  setScore(0);
                  setShowResult(false);
                  setXpEarned(0);
                  generateQuestions(topicTitle);
                }}
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
