import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, aiModel } from "../firebase";
import Sidebar from "../components/Layout/Sidebar";
import { useNavigate } from "react-router-dom";

function AITutor() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hello! 👋 I'm your AI Tutor. Ask me anything about your subjects and I'll explain it simply." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

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
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      const result = await aiModel.generateContent(userMessage);
      const aiText = result.response.text();

      setMessages(prev => [...prev, { role: "ai", text: aiText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
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
    return <div style={{ textAlign: "center", marginTop: "100px" }}>Loading AI Tutor...</div>;
  }

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <h1 style={styles.title}>🤖 AI Tutor</h1>
        <p style={styles.subtitle}>Ask me anything about your studies</p>

        <div style={styles.chatContainer}>
          <div style={styles.messages}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  ...styles.message,
                  ...(msg.role === "user" ? styles.userMessage : styles.aiMessage)
                }}
              >
                {msg.text}
              </div>
            ))}

            {loading && (
              <div style={{ ...styles.message, ...styles.aiMessage }}>
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputArea}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask a question... (e.g. Explain quadratic equations simply)"
              style={styles.textarea}
              rows={2}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                ...styles.sendBtn,
                opacity: loading || !input.trim() ? 0.6 : 1
              }}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
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
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  },
  title: {
    margin: "0 0 5px",
    fontSize: "26px",
  },
  subtitle: {
    color: "#777",
    marginBottom: "20px",
  },
  chatContainer: {
    flex: 1,
    background: "white",
    borderRadius: "14px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  messages: {
    flex: 1,
    padding: "25px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  message: {
    maxWidth: "75%",
    padding: "12px 16px",
    borderRadius: "12px",
    lineHeight: "1.5",
    fontSize: "15px",
    whiteSpace: "pre-wrap",
  },
  userMessage: {
    alignSelf: "flex-end",
    background: "#008751",
    color: "white",
  },
  aiMessage: {
    alignSelf: "flex-start",
    background: "#f0f0f0",
    color: "#333",
  },
  inputArea: {
    padding: "15px 20px",
    borderTop: "1px solid #eee",
    display: "flex",
    gap: "12px",
    alignItems: "flex-end",
  },
  textarea: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    fontSize: "15px",
    resize: "none",
    fontFamily: "inherit",
  },
  sendBtn: {
    padding: "12px 22px",
    background: "#008751",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "15px",
  },
};

export default AITutor;