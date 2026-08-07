import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, aiModel } from "../firebase";
import Sidebar from "../components/Layout/Sidebar";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function AITutor() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hello! 👋 I'm your AI Tutor. Ask me anything about your subjects and I'll explain it simply." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/");
      setUserLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      const result = await aiModel.generateContent(userMessage);
      const aiText = result.response.text();

      setMessages((prev) => [...prev, { role: "ai", text: aiText }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Sorry, I encountered an error. Please try again." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (userLoading) {
    return (
      <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 flex items-center justify-center">
          <p className={darkMode ? "text-gray-300" : "text-gray-600"}>Loading AI Tutor...</p>
        </main>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 ml-0 md:ml-64 p-5 md:p-8 flex flex-col h-screen box-border">
        <h1 className={`text-2xl md:text-3xl font-bold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
          🤖 AI Tutor
        </h1>
        <p className={`mb-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          Ask me anything about your studies
        </p>

        <div className={`flex-1 rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-0 ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}>
          <div className="flex-1 overflow-y-auto p-5 md:p-6 flex flex-col gap-3.5">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[75%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "self-end bg-green-700 text-white"
                    : darkMode
                    ? "self-start bg-gray-700 text-gray-100"
                    : "self-start bg-gray-100 text-gray-800"
                }`}
              >
                {msg.text}
              </div>
            ))}

            {loading && (
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-[15px] self-start ${
                darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
              }`}>
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={`p-4 md:p-5 border-t flex gap-3 items-end ${
            darkMode ? "border-gray-700" : "border-gray-100"
          }`}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask a question... (e.g. Explain quadratic equations simply)"
              rows={2}
              className={`flex-1 px-4 py-3 rounded-xl border text-[15px] resize-none font-sans focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${
                darkMode
                  ? "bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className={`px-6 py-3 rounded-xl font-semibold text-[15px] bg-green-700 text-white transition ${
                loading || !input.trim() ? "opacity-60 cursor-not-allowed" : "hover:bg-green-800 cursor-pointer"
              }`}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AITutor;
