import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import Sidebar from "../components/Layout/Sidebar";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      try {
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
    return (
      <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 flex items-center justify-center">
          <p className={darkMode ? "text-gray-300" : "text-gray-600"}>Loading leaderboard...</p>
        </main>
      </div>
    );
  }

  const rankLabel = (rank) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`);

  return (
    <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 ml-0 md:ml-64 p-5 md:p-8">
        <h1 className={`text-2xl md:text-3xl font-bold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
          🏆 Leaderboard
        </h1>
        <p className={`mb-6 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          Top students ranked by XP
        </p>

        <div className={`rounded-2xl shadow-sm overflow-hidden ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          {leaders.length === 0 ? (
            <p className={`text-center py-10 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              No students on the leaderboard yet. Be the first!
            </p>
          ) : (
            <div>
              {leaders.map((student, i) => (
                <div
                  key={student.id || student.rank}
                  className={`flex items-center px-5 md:px-6 py-4 ${
                    i !== leaders.length - 1 ? (darkMode ? "border-b border-gray-700" : "border-b border-gray-100") : ""
                  } ${student.rank <= 3 ? (darkMode ? "bg-gray-700/40" : "bg-green-50/60") : ""}`}
                >
                  <div className="w-14 font-bold text-lg">{rankLabel(student.rank)}</div>
                  <div className={`flex-1 font-medium ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                    {student.name}
                  </div>
                  <div className={`font-bold ${darkMode ? "text-green-400" : "text-green-700"}`}>
                    {student.xp} XP
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Leaderboard;
