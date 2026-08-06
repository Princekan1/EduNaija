import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import Sidebar from "../components/Layout/Sidebar";
import { useNavigate } from "react-router-dom";

function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      try {
        // Try to fetch real data from Firebase
        const q = query(
          collection(db, "users"),
          orderBy("xp", "desc"),
          limit(20)
        );
        const snapshot = await getDocs(q);
        
        const data = snapshot.docs.map((doc, index) => ({
          id: doc.id,
          rank: index + 1,
          name: doc.data().name || "Anonymous",
          xp: doc.data().xp || 0,
        }));

        setLeaders(data);
      } catch (error) {
        console.error("Error loading leaderboard:", error);
        // Fallback dummy data if Firebase fails
        setLeaders([
          { rank: 1, name: "Adebayo Samuel", xp: 1250 },
          { rank: 2, name: "Chioma Okeke", xp: 980 },
          { rank: 3, name: "Ibrahim Musa", xp: 870 },
          { rank: 4, name: "You", xp: 0 },
        ]);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "100px" }}>Loading leaderboard...</div>;
  }

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <h1 style={styles.title}>🏆 Leaderboard</h1>
        <p style={styles.subtitle}>Top students ranked by XP</p>

        <div style={styles.card}>
          {leaders.length === 0 ? (
            <p style={{ textAlign: "center", color: "#999", padding: "40px" }}>
              No students on the leaderboard yet. Be the first!
            </p>
          ) : (
            <div>
              {leaders.map((student) => (
                <div
                  key={student.id || student.rank}
                  style={{
                    ...styles.row,
                    ...(student.rank <= 3 ? styles.topThree : {})
                  }}
                >
                  <div style={styles.rank}>
                    {student.rank === 1 ? "🥇" : 
                     student.rank === 2 ? "🥈" : 
                     student.rank === 3 ? "🥉" : 
                     `#${student.rank}`}
                  </div>
                  <div style={styles.name}>{student.name}</div>
                  <div style={styles.xp}>{student.xp} XP</div>
                </div>
              ))}
            </div>
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
  card: {
    background: "white",
    borderRadius: "14px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  row: {
    display: "flex",
    alignItems: "center",
    padding: "16px 22px",
    borderBottom: "1px solid #f0f0f0",
  },
  topThree: {
    background: "#f8fff9",
  },
  rank: {
    width: "60px",
    fontWeight: "bold",
    fontSize: "18px",
  },
  name: {
    flex: 1,
    fontSize: "16px",
    fontWeight: "500",
  },
  xp: {
    fontWeight: "bold",
    color: "#008751",
    fontSize: "16px",
  },
};

export default Leaderboard;