import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import Sidebar from "../components/Layout/Sidebar";

function Topics() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState({ title: "", content: "" });
  const [showVideo, setShowVideo] = useState(null); // stores topic id
  const [audioUrl, setAudioUrl] = useState(null);

  // Temporary topics data
  const topicsData = {
    mathematics: [
      { 
        id: 1, 
        title: "Number Bases", 
        description: "Conversion between binary, decimal, octal and hexadecimal",
        note: "Number bases are systems of counting. The most common is Base 10 (Decimal). Computers use Base 2 (Binary). Other important ones are Base 8 (Octal) and Base 16 (Hexadecimal).\n\nTo convert from Binary to Decimal, multiply each digit by powers of 2.",
        video: "https://www.youtube.com/embed/rA2u6o_5b5M",
        audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
      },
      { 
        id: 2, 
        title: "Algebraic Processes", 
        description: "Simplification and factorization of algebraic expressions",
        note: "Algebraic processes involve simplifying expressions and solving equations. Always collect like terms and follow BODMAS rule.",
        video: "https://www.youtube.com/embed/3nhn3Yq2q3Y",
        audio: null
      },
      { 
        id: 3, 
        title: "Quadratic Equations", 
        description: "Solving quadratic equations using different methods",
        note: "A quadratic equation is of the form ax² + bx + c = 0. You can solve it by factorization, completing the square, or using the quadratic formula.",
        video: null,
        audio: null
      },
    ],
    english: [
      { 
        id: 1, 
        title: "Comprehension", 
        description: "Reading and understanding passages",
        note: "Comprehension means understanding what you read. Always identify the main idea, supporting details, and the writer's intention.",
        video: null,
        audio: null
      },
      { 
        id: 2, 
        title: "Essay Writing", 
        description: "Narrative, descriptive and argumentative essays",
        note: "Good essays have introduction, body paragraphs, and conclusion. Always plan before you write.",
        video: null,
        audio: null
      },
    ],
    physics: [
      { 
        id: 1, 
        title: "Measurements & Units", 
        description: "Fundamental and derived quantities",
        note: "Fundamental quantities include Length, Mass, and Time. Derived quantities are calculated from fundamental ones (e.g. Speed = Distance/Time).",
        video: null,
        audio: null
      },
    ],
    chemistry: [
      { 
        id: 1, 
        title: "Particulate Nature of Matter", 
        description: "Atoms, molecules and ions",
        note: "All matter is made up of tiny particles called atoms. Atoms can combine to form molecules.",
        video: null,
        audio: null
      },
    ],
    biology: [
      { 
        id: 1, 
        title: "Cell Structure", 
        description: "Plant and animal cells",
        note: "The cell is the basic unit of life. Plant cells have cell wall and chloroplasts, while animal cells do not.",
        video: null,
        audio: null
      },
    ],
    civic: [
      { 
        id: 1, 
        title: "Citizenship", 
        description: "Rights and duties of a citizen",
        note: "A citizen has rights (e.g. right to education, freedom of speech) and duties (e.g. paying tax, obeying laws).",
        video: null,
        audio: null
      },
    ],
  };

  const subjectNames = {
    mathematics: "Mathematics",
    english: "English Language",
    physics: "Physics",
    chemistry: "Chemistry",
    biology: "Biology",
    civic: "Civic Education",
  };

  const topics = topicsData[subjectId] || [];
  const subjectName = subjectNames[subjectId] || "Subject";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Handlers
  const openNote = (topic) => {
    setCurrentNote({ title: topic.title, content: topic.note || "No note available for this topic yet." });
    setShowNoteModal(true);
  };

  const openVideo = (topic) => {
    if (!topic.video) {
      alert("No video available for this topic yet.");
      return;
    }
    setShowVideo(showVideo === topic.id ? null : topic.id);
  };

  const playAudio = (topic) => {
    if (!topic.audio) {
      alert("No audio available for this topic yet.");
      return;
    }
    setAudioUrl(topic.audio);
  };

const startPractice = (topic) => {
  navigate("/quiz", {
    state: {
      topicTitle: topic.title,
      // You can pass real questions later
    }
  });
};

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "100px" }}>Loading topics...</div>;
  }

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <button style={styles.backBtn} onClick={() => navigate("/dashboard")}>
          ← Back to Subjects
        </button>

        <h1 style={styles.title}>{subjectName}</h1>
        <p style={styles.subtitle}>Select a topic to start learning</p>

        <div style={styles.topicsList}>
          {topics.map((topic) => (
            <div key={topic.id} style={styles.topicCard}>
              <div>
                <h3 style={styles.topicTitle}>{topic.title}</h3>
                <p style={styles.topicDesc}>{topic.description}</p>
              </div>

              <div style={styles.actions}>
                <button style={{ ...styles.btn, ...styles.btnRead }} onClick={() => openNote(topic)}>
                  📖 Read Note
                </button>
                <button style={{ ...styles.btn, ...styles.btnWatch }} onClick={() => openVideo(topic)}>
                  ▶️ Watch Video
                </button>
                <button style={{ ...styles.btn, ...styles.btnAudio }} onClick={() => playAudio(topic)}>
                  🎧 Listen Audio
                </button>
                <button style={{ ...styles.btn, ...styles.btnPractice }} onClick={() => startPractice(topic)}>
                  ✍️ Practice
                </button>
              </div>

              {/* Video Player */}
              {showVideo === topic.id && topic.video && (
                <div style={styles.videoContainer}>
                  <iframe
                    src={topic.video}
                    title={topic.title}
                    style={styles.iframe}
                    allowFullScreen
                  ></iframe>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Note Modal */}
      {showNoteModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <button style={styles.closeBtn} onClick={() => setShowNoteModal(false)}>×</button>
            <h2 style={{ color: "#008751", marginBottom: "15px" }}>{currentNote.title}</h2>
            <div style={{ lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
              {currentNote.content}
            </div>
          </div>
        </div>
      )}

      {/* Audio Player */}
      {audioUrl && (
        <div style={styles.audioPlayer}>
          <button style={styles.audioClose} onClick={() => setAudioUrl(null)}>×</button>
          <audio src={audioUrl} controls autoPlay style={{ flex: 1 }} />
        </div>
      )}
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
    padding: "25px 30px",
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
    margin: "0 0 6px",
    fontSize: "28px",
    color: "#222",
  },
  subtitle: {
    color: "#777",
    marginBottom: "25px",
  },
  topicsList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  topicCard: {
    background: "white",
    padding: "22px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    borderLeft: "5px solid #008751",
  },
  topicTitle: {
    margin: "0 0 6px",
    fontSize: "18px",
  },
  topicDesc: {
    margin: 0,
    color: "#666",
    fontSize: "14px",
  },
  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "16px",
    flexWrap: "wrap",
  },
  btn: {
    padding: "9px 14px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },
  btnRead: { background: "#008751", color: "white" },
  btnWatch: { background: "#FFD700", color: "#333" },
  btnAudio: { background: "#f0f0f0", color: "#333" },
  btnPractice: { background: "#6c5ce7", color: "white" },
  videoContainer: {
    marginTop: "15px",
    borderRadius: "8px",
    overflow: "hidden",
    background: "#000",
  },
  iframe: {
    width: "100%",
    height: "340px",
    border: "none",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    background: "white",
    padding: "30px",
    borderRadius: "12px",
    maxWidth: "700px",
    width: "100%",
    maxHeight: "80vh",
    overflowY: "auto",
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: "15px",
    right: "20px",
    background: "#e74c3c",
    color: "white",
    border: "none",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    fontSize: "20px",
    cursor: "pointer",
  },
  audioPlayer: {
    position: "fixed",
    bottom: 0,
    left: 0,
    width: "100%",
    background: "white",
    padding: "15px 20px",
    boxShadow: "0 -4px 12px rgba(0,0,0,0.1)",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    zIndex: 1000,
    borderTop: "3px solid #008751",
  },
  audioClose: {
    background: "#e74c3c",
    color: "white",
    border: "none",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    fontSize: "18px",
    cursor: "pointer",
  },
};

export default Topics;