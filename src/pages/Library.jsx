import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import Sidebar from "../components/Layout/Sidebar";
import { useNavigate } from "react-router-dom";

function Library() {
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Temporary library data (we can connect to Firebase later)
  const libraryItems = [
    {
      id: 1,
      title: "New General Mathematics for Senior Secondary Schools",
      type: "Textbook",
      desc: "Comprehensive mathematics textbook covering Algebra, Geometry, Trigonometry and Statistics.",
      url: "#"
    },
    {
      id: 2,
      title: "Comprehensive English for SSCE",
      type: "Textbook",
      desc: "Covers Comprehension, Summary, Essay Writing, Lexis and Structure.",
      url: "#"
    },
    {
      id: 3,
      title: "Physics for Senior Secondary Schools - Audio Lessons",
      type: "Audio Book",
      desc: "Audio explanations of major Physics topics for easy learning on the go.",
      url: "#"
    },
    {
      id: 4,
      title: "Biology Practical Handbook",
      type: "Textbook",
      desc: "Step-by-step guide to Biology practicals and experiments.",
      url: "#"
    },
    {
      id: 5,
      title: "Civic Education Audio Series",
      type: "Audio Book",
      desc: "Audio lessons on Citizenship, Democracy, and National Values.",
      url: "#"
    },
    {
      id: 6,
      title: "Chemistry Past Questions & Solutions",
      type: "Past Questions",
      desc: "WAEC and NECO past questions with detailed solutions.",
      url: "#"
    },
  ];

  const filteredItems = filter === "All" 
    ? libraryItems 
    : libraryItems.filter(item => item.type === filter);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "100px" }}>Loading library...</div>;
  }

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <h1 style={styles.title}>📖 E-Library</h1>
        <p style={styles.subtitle}>Access textbooks, audio lessons and past questions</p>

        {/* Filter Buttons */}
        <div style={styles.filterBar}>
          {["All", "Textbook", "Audio Book", "Past Questions"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              style={{
                ...styles.filterBtn,
                ...(filter === item ? styles.activeFilter : {})
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Library Grid */}
        <div style={styles.grid}>
          {filteredItems.length === 0 ? (
            <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "#999", padding: "40px" }}>
              No materials found.
            </p>
          ) : (
            filteredItems.map((book) => (
              <div key={book.id} style={styles.card}>
                <div style={{
                  ...styles.typeBadge,
                  background: book.type === "Audio Book" ? "#6c5ce7" : 
                              book.type === "Past Questions" ? "#e67e22" : "#008751"
                }}>
                  {book.type}
                </div>
                <h3 style={styles.cardTitle}>{book.title}</h3>
                <p style={styles.cardDesc}>{book.desc}</p>
                <a 
                  href={book.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={styles.openBtn}
                >
                  {book.type === "Audio Book" ? "🎧 Listen Now" : "📖 Open Material"}
                </a>
              </div>
            ))
          )}
        </div>
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
    padding: "25px 30px",
  },
  title: {
    margin: "0 0 6px",
    fontSize: "26px",
  },
  subtitle: {
    color: "#777",
    marginBottom: "25px",
  },
  filterBar: {
    display: "flex",
    gap: "10px",
    marginBottom: "25px",
    flexWrap: "wrap",
  },
  filterBtn: {
    padding: "9px 18px",
    borderRadius: "20px",
    border: "1px solid #ddd",
    background: "white",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  activeFilter: {
    background: "#008751",
    color: "white",
    borderColor: "#008751",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
  },
  card: {
    background: "white",
    padding: "22px",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
  },
  typeBadge: {
    display: "inline-block",
    color: "white",
    fontSize: "11px",
    fontWeight: "bold",
    padding: "4px 10px",
    borderRadius: "20px",
    marginBottom: "12px",
    width: "fit-content",
    textTransform: "uppercase",
  },
  cardTitle: {
    margin: "0 0 10px",
    fontSize: "17px",
    lineHeight: "1.3",
  },
  cardDesc: {
    color: "#666",
    fontSize: "14px",
    lineHeight: "1.5",
    flex: 1,
    marginBottom: "18px",
  },
  openBtn: {
    display: "inline-block",
    textAlign: "center",
    padding: "11px",
    background: "#008751",
    color: "white",
    textDecoration: "none",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
  },
};

export default Library;