import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import Sidebar from "../components/Layout/Sidebar";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

/* ============================================================
   AI SYSTEM PROMPT
   Sent as context on every request so the model stays in
   character, matches NERDC expectations, and outputs clean
   text + valid LaTeX we can safely render with react-katex.
   ============================================================ */
const SYSTEM_PROMPT = `You are EduNaija AI Tutor for Nigerian students following the official NERDC curriculum.
NEVER use markdown bold markers ** or em-dashes —.
For every equation, formula, mathematical expression, chemical equation or scientific notation you MUST output valid LaTeX (inline $...$ or block $$...$$).
Structure answers clearly with short paragraphs, numbered steps or bullet points when helpful.
Keep language age-appropriate for the student's class.
When explaining solutions always show the LaTeX formula first, then the step-by-step reasoning.`;

const SUGGESTED_PROMPTS = [
  "Explain photosynthesis simply",
  "Solve: 2x + 5 = 15",
  "What is Boyle's Law?",
  "Balance this equation: H2 + O2 -> H2O",
];

/* ============================================================
   TEXT CLEANUP + LATEX RENDERING
   The model is instructed never to send ** or — but we still
   sanitize defensively, then split the text on $$...$$ / $...$
   so KaTeX renders math while everything else stays plain text.
   ============================================================ */
function cleanAIText(raw = "") {
  return raw.replace(/\*\*/g, "").replace(/—/g, "-");
}

function MathText({ text }) {
  const cleaned = cleanAIText(text || "");
  const blockParts = cleaned.split(/(\$\$[^$]+\$\$)/g);

  return (
    <>
      {blockParts.map((part, i) => {
        if (/^\$\$[^$]+\$\$$/.test(part)) {
          return <BlockMath key={i} math={part.slice(2, -2)} />;
        }
        const inlineParts = part.split(/(\$[^$]+\$)/g);
        return (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>
            {inlineParts.map((seg, j) =>
              /^\$[^$]+\$$/.test(seg) ? (
                <InlineMath key={j} math={seg.slice(1, -1)} />
              ) : (
                <span key={j}>{seg}</span>
              )
            )}
          </span>
        );
      })}
    </>
  );
}

function AITutor() {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hello! I'm your AI Tutor. Ask me anything about your subjects, attach a photo of a question, or use the mic to speak and I'll explain it simply.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Image upload state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Voice-to-text state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const uidRef = useRef(null);

  /* ---------------- Auth guard + load recent chat history ---------------- */
  useEffect(() => {
    const checkAuthAndLoadHistory = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      uidRef.current = session.user.id;
      try {
        const { data: history, error } = await supabase
          .from("ai_tutor_messages")
          .select("role, text")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true })
          .limit(50);

        if (error) throw error;

        if (history && history.length > 0) {
          setMessages((prev) => [...prev, ...history]);
        }
      } catch (err) {
        // History is a nice-to-have; failing silently keeps the tutor usable offline
        // or for brand-new accounts without any rows yet.
        console.warn("Could not load chat history:", err);
      } finally {
        setUserLoading(false);
      }
    };

    checkAuthAndLoadHistory();
  }, [navigate]);

  /* ---------------- Online / offline detection ---------------- */
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  /* ---------------- Auto-scroll on new messages ---------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ---------------- Speech recognition setup ---------------- */
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      setInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setErrorBanner(
        "Voice input isn't supported in this browser. Try Chrome on desktop or Android."
      );
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setErrorBanner("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  /* ---------------- Image upload / preview / drag-drop ---------------- */
  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  }, []);

  const onDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  /* ---------------- Build multimodal request + send ---------------- */
  const buildImagePart = () => {
    if (!imagePreview) return null;
    const [meta, base64] = imagePreview.split(",");
    const mimeMatch = meta.match(/data:(.*);base64/);
    return {
      inlineData: {
        mimeType: mimeMatch ? mimeMatch[1] : "image/jpeg",
        data: base64,
      },
    };
  };

  const persistMessage = async (msg) => {
    if (!uidRef.current) return;
    try {
      const { error } = await supabase.from("ai_tutor_messages").insert({
        user_id: uidRef.current,
        role: msg.role,
        text: msg.text,
      });
      if (error) throw error;
    } catch (err) {
      console.warn("Could not save chat message:", err);
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !imageFile) || loading) return;
    if (!isOnline) {
      setErrorBanner("You're offline. Reconnect to talk to your AI Tutor.");
      return;
    }

    const userText = input.trim() || "Please look at this image and explain it.";
    const userMessage = {
      role: "user",
      text: userText,
      imagePreview: imagePreview || null,
    };

    const historyForPrompt = messages.slice(-6);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    const imagePart = buildImagePart();
    removeImage();
    setLoading(true);
    setErrorBanner("");
    persistMessage(userMessage);

    try {
      const convoText = historyForPrompt
        .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.text}`)
        .join("\n");

      const promptText = `${SYSTEM_PROMPT}\n\nConversation so far:\n${convoText}\n\nStudent: ${userText}\n\nTutor:`;

      const parts = [{ text: promptText }];
      if (imagePart) parts.push(imagePart);

      const res = await fetch("/api/generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts }),
      });
      const { text: rawText } = await res.json();
      const aiText = cleanAIText(rawText);

      const aiMessage = { role: "ai", text: aiText };
      setMessages((prev) => [...prev, aiMessage]);
      persistMessage(aiMessage);
    } catch (error) {
      console.error(error);
      const friendly = !navigator.onLine
        ? "You're offline. Reconnect and try again."
        : "Sorry, I encountered an error. Please try again.";
      setMessages((prev) => [...prev, { role: "ai", text: friendly }]);
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

  const isEmptyState = messages.length === 1;

  return (
    <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 ml-0 md:ml-64 pt-20 md:pt-8 px-5 md:px-8 pb-8 flex flex-col h-screen box-border">
        <h1 className={`text-2xl md:text-3xl font-bold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
          🤖 AI Tutor
        </h1>
        <p className={`mb-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          Ask me anything about your studies
        </p>

        {!isOnline && (
          <div className="mb-3 px-4 py-2.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 border border-amber-300">
            You're offline. Messages will send once you're back online.
          </div>
        )}
        {errorBanner && (
          <div className="mb-3 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 border border-red-300">
            {errorBanner}
          </div>
        )}

        {/* ============================ CHAT WINDOW ============================ */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`relative flex-1 rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-0 ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          {dragActive && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-green-700/10 border-4 border-dashed border-green-600 rounded-2xl pointer-events-none">
              <p className="text-green-700 font-semibold text-lg bg-white/90 px-4 py-2 rounded-lg">
                Drop image to attach
              </p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 md:p-6 flex flex-col gap-3.5">
            {/* Empty state with suggested prompts */}
            {isEmptyState && (
              <div className="flex flex-col gap-3 mb-2">
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed self-start ${
                    darkMode ? "bg-gray-700 text-gray-100" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {messages[0].text}
                </div>
                <div className="flex flex-wrap gap-2 self-start">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition ${
                        darkMode
                          ? "border-gray-600 text-gray-200 hover:bg-gray-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {!isEmptyState &&
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed ${
                    msg.role === "user"
                      ? "self-end bg-green-700 text-white"
                      : darkMode
                      ? "self-start bg-gray-700 text-gray-100"
                      : "self-start bg-gray-100 text-gray-800"
                  }`}
                >
                  {msg.imagePreview && (
                    <img
                      src={msg.imagePreview}
                      alt="Attached"
                      className="mb-2 rounded-lg max-h-48 object-cover"
                    />
                  )}
                  <MathText text={msg.text} />
                </div>
              ))}

            {/* Typing indicator */}
            {loading && (
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl text-[15px] self-start flex items-center gap-1.5 ${
                  darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ============================ COMPOSER ============================ */}
          <div className={`border-t ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
            {imagePreview && (
              <div className="px-4 pt-3 flex items-center gap-2">
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
                <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Image attached
                </span>
              </div>
            )}

            <div className="p-4 md:p-5 flex gap-2 md:gap-3 items-end">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => handleImageFile(e.target.files?.[0])}
              />
              <button
                type="button"
                title="Attach image"
                onClick={() => fileInputRef.current?.click()}
                className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-lg transition ${
                  darkMode
                    ? "bg-gray-900 border border-gray-700 hover:bg-gray-700 text-gray-200"
                    : "bg-white border border-gray-300 hover:bg-gray-100 text-gray-700"
                }`}
              >
                🖼️
              </button>

              <button
                type="button"
                title={isListening ? "Stop listening" : "Speak your question"}
                onClick={toggleListening}
                className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-lg transition ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : darkMode
                    ? "bg-gray-900 border border-gray-700 hover:bg-gray-700 text-gray-200"
                    : "bg-white border border-gray-300 hover:bg-gray-100 text-gray-700"
                }`}
              >
                🎤
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={
                  isListening
                    ? "Listening..."
                    : "Ask a question... (e.g. Explain quadratic equations simply)"
                }
                rows={2}
                className={`flex-1 px-4 py-3 rounded-xl border text-[15px] resize-none font-sans focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${
                  darkMode
                    ? "bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
              <button
                onClick={sendMessage}
                disabled={loading || (!input.trim() && !imageFile) || !isOnline}
                className={`px-6 py-3 rounded-xl font-semibold text-[15px] bg-green-700 text-white transition ${
                  loading || (!input.trim() && !imageFile) || !isOnline
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-green-800 cursor-pointer"
                }`}
              >
                {loading ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AITutor;
