import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import Sidebar from "../components/Layout/Sidebar";

function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const { topicTitle, questions } = location.state || {};

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sample questions (we will make this dynamic later)
  const sampleQuestions = questions || [
    {
      question: "What is the base of the binary number system?",
      options: { A: "2", B: "8", C: "10", D: "16" },
      correct: "A"
    },
    {
      question: "Which of the following is a fundamental quantity?",
      options: { A: "Speed", B: "Force", C: "Mass", D: "Area" },
      correct: "C"
    },
    {
      question: "The basic unit of life is the:",
      options: { A: "Tissue", B: "Organ", C: "Cell", D: "System" },
      correct: "C"
    }
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleAnswer = (option) => {
    setSelectedAnswer(option);
  };

  const handleNext = () => {
    if (selectedAnswer === sampleQuestions[currentQuestion].correct) {
      setScore(score + 1);
    }

    if (currentQuestion + 1 < sampleQuestions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setShowResult(true);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "100px" }}>Loading quiz...</div>;
  }

  if (!topicTitle && !questions) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <main style={styles.main}>
          <h2>No quiz selected</h2>
          <button onClick={() => navigate("/dashboard")} style={styles.backBtn}>
            Go back to Dashboard
          </button>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>

        <h1 style={styles.title}>{topicTitle || "Practice Quiz"}</h1>

        {!showResult ? (
          <div style={styles.quizCard}>
            <div style={styles.progress}>
              Question {currentQuestion + 1} of {sampleQuestions.length}
            </div>

            <h2 style={styles.question}>
              {sampleQuestions[currentQuestion].question}
            </h2>

            <div style={styles.options}>
              {Object.entries(sampleQuestions[currentQuestion].options).map(([key, value]) => (
                <button
                  key={key}
                  style={{
                    ...styles.optionBtn,
                    ...(selectedAnswer === key ? styles.selectedOption : {})
                  }}
                  onClick={() => handleAnswer(key)}
                >
                  <strong>{key}.</strong> {value}
                </button>
              ))}
            </div>

            <button
              style={{
                ...styles.nextBtn,
                opacity: selectedAnswer ? 1 : 0.5,
                cursor: selectedAnswer ? "pointer" : "not-allowed"
              }}
              onClick={handleNext}
              disabled={!selectedAnswer}
            >
              {currentQuestion + 1 === sampleQuestions.length ? "Finish Quiz" : "Next Question"}
            </button>
          </div>
        ) : (
          <div style={styles.resultCard}>
            <h2>Quiz Completed!</h2>
            <p style={styles.scoreText}>
              You scored <strong>{score}</strong> out of <strong>{sampleQuestions.length}</strong>
            </p>
            <p style={{ fontSize: "18px", margin: "10px 0" }}>
              {score === sampleQuestions.length
                ? "🎉 Excellent! Perfect score!"
                : score >= sampleQuestions.length / 2
                ? "👍 Good job! Keep practicing."
                : "💪 Don't worry, review the topic and try again!"}
            </p>

            <div style={{ marginTop: "25px", display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                style={styles.nextBtn}
                onClick={() => {
                  setCurrentQuestion(0);
                  setSelectedAnswer(null);
                  setScore(0);
                  setShowResult(false);
                }}
              >
                Try Again
              </button>
              <button
                style={{ ...styles.nextBtn, background: "#555" }}
                onClick={() => navigate("/dashboard")}
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

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f4f7f6",
  },
  main: {
    marginLeft: "260px",
    flex: 1,
    padding: "30px",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#008751",
    fontSize: "15px",
    cursor: "pointer",
    marginBottom: "15px",
    fontWeight: "500",
  },
  title: {
    marginBottom: "25px",
    color: "#222",
  },
  quizCard: {
    background: "white",
    padding: "30px",
    borderRadius: "14px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
    maxWidth: "700px",
  },
  progress: {
    color: "#008751",
    fontWeight: "600",
    marginBottom: "15px",
  },
  question: {
    fontSize: "20px",
    marginBottom: "25px",
    lineHeight: "1.4",
  },
  options: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "30px",
  },
  optionBtn: {
    textAlign: "left",
    padding: "14px 18px",
    border: "2px solid #eee",
    borderRadius: "10px",
    background: "white",
    cursor: "pointer",
    fontSize: "16px",
    transition: "0.2s",
  },
  selectedOption: {
    borderColor: "#008751",
    background: "#e8f5e9",
  },
  nextBtn: {
    padding: "14px 28px",
    background: "#008751",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
  resultCard: {
    background: "white",
    padding: "40px",
    borderRadius: "14px",
    textAlign: "center",
    maxWidth: "500px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
  },
  scoreText: {
    fontSize: "22px",
    margin: "20px 0",
  },
};

export default Quiz;