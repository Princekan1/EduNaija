import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import Sidebar from "../components/Layout/Sidebar";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Temporary subjects (we will make this dynamic later)
  const subjects = [
    { id: "mathematics", name: "Mathematics", icon: "📐", color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { id: "english", name: "English Language", icon: "📖", color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
    { id: "physics", name: "Physics", icon: "⚡", color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
    { id: "chemistry", name: "Chemistry", icon: "🧪", color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
    { id: "biology", name: "Biology", icon: "🧬", color: "linear-gradient(135deg, #7bed9f 0%, #70a1ff 100%)" },
    { id: "civic", name: "Civic Education", icon: "🇳🇬", color: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)" },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data());
        } else {
          setUser({ name: currentUser.displayName || "Student", xp: 0 });
        }
      } else {
        navigate("/");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px", fontSize: "18px" }}>
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <h2 style={{ margin: 0, fontSize: "24px" }}>
              Welcome back, {user?.name?.split(" ")[0] || "Student"} 👋
            </h2>
            <p style={{ margin: "6px 0 0", color: "#777" }}>
              Ready to continue learning today?
            </p>
          </div>
          <div style={styles.xpBadge}>
            ⭐ {user?.xp || 0} XP
          </div>
        </header>

        {/* Subjects Section */}
        <section>
          <h3 style={styles.sectionTitle}>Your Subjects</h3>

          <div style={styles.subjectsGrid}>
            {subjects.map((subject) => (
              <div
                key={subject.id}
                style={{
                  ...styles.subjectCard,
                  background: subject.color,
                }}
                onClick={() => navigate(`/topics/${subject.id}`)}
              >
                <div style={styles.subjectIcon}>{subject.icon}</div>
                <div style={styles.subjectName}>{subject.name}</div>
              </div>
            ))}
          </div>
        </section>
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
  header: {
    background: "white",
    padding: "20px 25px",
    borderRadius: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  xpBadge: {
    background: "#e8f5e9",
    color: "#008751",
    padding: "10px 18px",
    borderRadius: "30px",
    fontWeight: "bold",
    fontSize: "15px",
  },
  sectionTitle: {
    marginBottom: "18px",
    fontSize: "20px",
    color: "#333",
  },
  subjectsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "18px",
  },
  subjectCard: {
    padding: "25px 15px",
    borderRadius: "16px",
    textAlign: "center",
    cursor: "pointer",
    color: "white",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    minHeight: "140px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  subjectIcon: {
    fontSize: "2.8rem",
    marginBottom: "12px",
  },
  subjectName: {
    fontWeight: "600",
    fontSize: "15px",
    lineHeight: "1.3",
  },
};

export default Dashboard;