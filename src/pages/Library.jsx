import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import Sidebar from "../components/Layout/Sidebar";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function Library() {
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { darkMode } = useTheme();

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
    : libraryItems.filter((item) => item.type === filter);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 flex items-center justify-center">
          <p className={darkMode ? "text-gray-300" : "text-gray-600"}>Loading library...</p>
        </main>
      </div>
    );
  }

  const badgeColor = (type) =>
    type === "Audio Book" ? "bg-violet-600" : type === "Past Questions" ? "bg-orange-500" : "bg-green-700";

  return (
    <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 ml-0 md:ml-64 p-5 md:p-8">
        <h1 className={`text-2xl md:text-3xl font-bold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
          📖 E-Library
        </h1>
        <p className={`mb-6 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          Access textbooks, audio lessons and past questions
        </p>

        {/* Filter Buttons */}
        <div className="flex gap-2.5 mb-6 flex-wrap">
          {["All", "Textbook", "Audio Book", "Past Questions"].map((item) => {
            const isActive = filter === item;
            return (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium border transition ${
                  isActive
                    ? "bg-green-700 text-white border-green-700"
                    : darkMode
                    ? "bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Library Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.length === 0 ? (
            <p className={`col-span-full text-center py-10 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
              No materials found.
            </p>
          ) : (
            filteredItems.map((book) => (
              <div
                key={book.id}
                className={`rounded-2xl p-5 shadow-sm flex flex-col ${darkMode ? "bg-gray-800" : "bg-white"}`}
              >
                <div className={`inline-block w-fit text-white text-[11px] font-bold uppercase px-2.5 py-1 rounded-full mb-3 ${badgeColor(book.type)}`}>
                  {book.type}
                </div>
                <h3 className={`text-[17px] font-semibold leading-snug mb-2.5 ${darkMode ? "text-white" : "text-gray-900"}`}>
                  {book.title}
                </h3>
                <p className={`text-sm leading-relaxed flex-1 mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {book.desc}
                </p>
                <a
                  href={book.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center py-2.5 rounded-lg font-semibold text-sm bg-green-700 text-white hover:bg-green-800 transition"
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

export default Library;
