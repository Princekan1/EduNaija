import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Sidebar from "../components/Layout/Sidebar";
import { useTheme } from "../context/ThemeContext";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

const TERM_NAMES = ["First Term", "Second Term", "Third Term"];

/* ============================================================
   TEXT CLEANUP + LATEX RENDERING
   Strips stray ** / — the model might still slip in, then
   splits on $$...$$ / $...$ so KaTeX renders math and everything
   else renders as normal text. Also recognises "[Diagram: ...]"
   markers (used for the SS-Science layout) and renders them as
   a placeholder box instead of literal bracket text.
   ============================================================ */
function cleanAIText(raw = "") {
  return String(raw || "").replace(/\*\*/g, "").replace(/—/g, "-");
}

function MathText({ text }) {
  const cleaned = cleanAIText(text);
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

// Renders body text but swaps any [Diagram: ...] marker for a dashed
// placeholder box, used mainly in the SS-Science formula-heavy layout.
function ContentWithDiagrams({ text, darkMode }) {
  const segments = String(text || "").split(/(\[Diagram:[^\]]+\])/g);
  return (
    <>
      {segments.map((seg, i) => {
        const match = seg.match(/^\[Diagram:([^\]]+)\]$/);
        if (match) {
          return (
            <div
              key={i}
              className={`my-2 px-4 py-3 rounded-lg border-2 border-dashed text-xs font-medium ${
                darkMode
                  ? "border-gray-600 text-gray-400 bg-gray-900"
                  : "border-gray-300 text-gray-500 bg-gray-50"
              }`}
            >
              📊 Diagram: {match[1].trim()}
            </div>
          );
        }
        return seg.trim() ? <MathText key={i} text={seg} /> : null;
      })}
    </>
  );
}

/* ============================================================
   CLASS-LEVEL LAYOUT SYSTEM
   Decides card density / colour / section labels for the topic
   list and lesson modal so Primary 1-3, Primary 4-6, JSS and SS
   (branched by stream) each feel appropriately pitched.
   ============================================================ */
function getLevelLayout(classLevel = "") {
  const primaryMatch = classLevel.match(/Primary\s*(\d)/i);
  if (primaryMatch) {
    return parseInt(primaryMatch[1], 10) <= 3 ? "primaryLower" : "primaryUpper";
  }
  if (classLevel.startsWith("JSS")) return "jss";
  if (classLevel.startsWith("SS")) return "ss";
  return "jss";
}

function getSectionLabels(layout) {
  if (layout === "primaryLower" || layout === "primaryUpper") {
    return { keyConcepts: "Key Points", workedExamples: "Examples", practice: "Activity" };
  }
  return { keyConcepts: "Key Concepts", workedExamples: "Worked Examples", practice: "Practice" };
}

const PRIMARY_ICONS = ["🎈", "🌟", "🚀", "🎨", "📚", "🔬", "🍎", "🎵", "🧩", "🌈"];
const PRIMARY_COLORS = [
  { light: "bg-yellow-50 border-yellow-400", dark: "bg-gray-800 border-yellow-500" },
  { light: "bg-pink-50 border-pink-400", dark: "bg-gray-800 border-pink-500" },
  { light: "bg-blue-50 border-blue-400", dark: "bg-gray-800 border-blue-500" },
  { light: "bg-green-50 border-green-400", dark: "bg-gray-800 border-green-500" },
  { light: "bg-purple-50 border-purple-400", dark: "bg-gray-800 border-purple-500" },
];

function Topics() {
  const { subjectId } = useParams();
  const [searchParams] = useSearchParams();
  const classLevel = searchParams.get("class") || "";
  const stream = searchParams.get("stream") || ""; // Science / Commercial / Arts — SS only
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const layout = getLevelLayout(classLevel);
  const sectionLabels = getSectionLabels(layout);

  const [termTopics, setTermTopics] = useState({
    "First Term": [],
    "Second Term": [],
    "Third Term": [],
  });
  const [activeTerm, setActiveTerm] = useState("First Term");
  const [subjectName, setSubjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Media states
  const [showVideo, setShowVideo] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  /* ---------------- AI: generate the COMPLETE 3-term topic list ---------------- */
  const generateTopics = async () => {
    setGenerating(true);
    try {
      const streamLabel = stream ? ` (${stream} stream)` : "";
      const prompt = `
You are an expert in the Nigerian education curriculum (NERDC).
Return the complete official NERDC scheme-of-work topics for ${classLevel} ${subjectName || subjectId}${streamLabel} First Term, Second Term and Third Term. List every topic under each term. Do not omit any.

Return ONLY valid JSON in exactly this shape, with no markdown fences and no extra text:
{
  "First Term": [{"id": "t1-1", "title": "...", "description": "..."}],
  "Second Term": [{"id": "t2-1", "title": "...", "description": "..."}],
  "Third Term": [{"id": "t3-1", "title": "...", "description": "..."}]
}
`;

      const res = await fetch("/api/generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const { text: rawText } = await res.json();
      let text = rawText.trim();
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      const generated = JSON.parse(text);
      const grouped = { "First Term": [], "Second Term": [], "Third Term": [] };

      for (const termName of TERM_NAMES) {
        const list = Array.isArray(generated[termName]) ? generated[termName] : [];
        for (let i = 0; i < list.length; i++) {
          const topic = list[i];
          const termSlug = termName.replace(/\s+/g, "").toLowerCase();
          const topicId = topic.id || `${termSlug}-${i + 1}`;
          const topicData = {
            curriculum_key: classLevel,
            subject_id: subjectId,
            topic_id: topicId,
            title: topic.title,
            description: topic.description,
            term: termName,
            order: i + 1,
            video: null,
            audio: null,
            lesson: null, // generated on demand the first time a student opens it
          };

          await supabase.from("curriculum_topics").upsert(topicData);

          grouped[termName].push({ id: topicId, ...topicData });
        }
      }

      setTermTopics(grouped);
    } catch (error) {
      console.error("AI topic generation error:", error);
      alert("Failed to generate topics. Please try again.");
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const loadTopics = async () => {
    try {
      const { data: subject } = await supabase
        .from("curriculum_subjects")
        .select("name")
        .eq("curriculum_key", classLevel)
        .eq("subject_id", subjectId)
        .single();

      if (subject) {
        setSubjectName(subject.name);
      }

      const { data: topics, error } = await supabase
        .from("curriculum_topics")
        .select("*")
        .eq("curriculum_key", classLevel)
        .eq("subject_id", subjectId);

      if (error) throw error;

      if (topics && topics.length > 0) {
        const grouped = { "First Term": [], "Second Term": [], "Third Term": [] };
        topics.forEach((d) => {
          const data = { ...d, id: d.topic_id };
          const term = TERM_NAMES.includes(data.term) ? data.term : "First Term";
          grouped[term].push(data);
        });
        TERM_NAMES.forEach((t) => grouped[t].sort((a, b) => (a.order || 0) - (b.order || 0)));
        setTermTopics(grouped);
        setLoading(false);
      } else {
        await generateTopics();
      }
    } catch (error) {
      console.error("Error loading topics:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }

      if (!classLevel) {
        navigate("/dashboard");
        return;
      }

      await loadTopics();
    };

    checkAuthAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, classLevel, navigate]);

  const [showLessonModal, setShowLessonModal] = useState(false);
  const [activeLesson, setActiveLesson] = useState(null);
  const [lessonLoadingFor, setLessonLoadingFor] = useState(null);
  const [lessonError, setLessonError] = useState("");
  const [activeTopicMeta, setActiveTopicMeta] = useState(null); // { id, term } of the topic currently open in the modal

  // Guides how the AI adjusts vocabulary and complexity for the lesson.
  const readingLevelGuidance = (level) => {
    if (level.startsWith("Primary")) {
      return "Write for a young child. Use very short sentences, everyday words, and simple everyday Nigerian examples (market, home, school, family). Avoid technical jargon entirely — explain any unavoidable term in plain words the moment it's used.";
    }
    if (level.startsWith("JSS")) {
      return "Write for a young teenager building subject vocabulary for the first time. Use clear, moderately short sentences. Introduce technical terms deliberately and define each one plainly the first time it appears. Use relatable Nigerian examples (local context, familiar situations).";
    }
    return "Write for a student preparing for WAEC/NECO/JAMB. Use precise, exam-appropriate technical language, but still explain new terms clearly rather than assuming prior mastery. Examples can be more abstract or exam-style where appropriate.";
  };

  // Stream-specific instructions + extra JSON fields for SS students.
  const streamGuidance = () => {
    if (layout !== "ss" || !stream) return { instruction: "", extraFields: "" };
    if (stream === "Science") {
      return {
        instruction:
          "This is a Science-stream student. Make key concepts and worked examples formula-heavy using LaTeX. Wherever a diagram would help understanding, add a short marker like [Diagram: label describing what to draw] on its own line instead of describing the image in prose.",
        extraFields: "",
      };
    }
    if (stream === "Commercial") {
      return {
        instruction:
          "This is a Commercial-stream student. Where relevant, ground the introduction or key concepts in a short real-world Nigerian business case study, and provide a comparison or summary table.",
        extraFields: `,\n  "table": {"headers": ["...", "..."], "rows": [["...", "..."]]}`,
      };
    }
    if (stream === "Arts") {
      return {
        instruction:
          "This is an Arts-stream student. Where relevant, include a short illustrative quotation with a brief analysis of its meaning and significance.",
        extraFields: `,\n  "quoteAnalysis": [{"quote": "...", "analysis": "..."}]`,
      };
    }
    return { instruction: "", extraFields: "" };
  };

  const openLesson = async (topic) => {
    setLessonError("");
    setActiveTopicMeta({ id: topic.id, term: topic.term });

    if (topic.lesson) {
      setActiveLesson({ title: topic.title, ...topic.lesson });
      setShowLessonModal(true);
      return;
    }

    setLessonLoadingFor(topic.id);
    setShowLessonModal(true);

    try {
      const { instruction, extraFields } = streamGuidance();

      const prompt = `
You are an expert Nigerian curriculum textbook author (NERDC), writing with the clarity and structure of a well-regarded textbook series: clear learning objectives, defined vocabulary, an introduction, concept-by-concept explanation, worked examples, practice questions and a closing summary.

Subject: ${subjectName || subjectId}
Topic: ${topic.title} — ${topic.description}
Student's class level: ${classLevel}${stream ? ` (${stream} stream)` : ""}

${readingLevelGuidance(classLevel)}
${instruction}

Write a complete lesson for this topic. Use real-world Nigerian examples and context where they help understanding. Never use markdown bold markers ** or em-dashes —. Any equation, formula or chemical notation MUST use valid LaTeX (inline $...$ or block $$...$$).

Return ONLY valid JSON in exactly this shape, with no markdown fences and no extra text:
{
  "objectives": ["2 to 4 short 'By the end of this lesson, you will be able to...' statements"],
  "keyTerms": [{"term": "...", "definition": "..."}],
  "introduction": "A short 2 to 4 sentence introduction to the topic",
  "keyConcepts": [{"heading": "...", "content": "..."}],
  "workedExamples": [{"problem": "...", "solution": "..."}],
  "summary": "A short 2 to 3 sentence wrap-up of the whole topic",
  "practice": [{"question": "...", "answer": "..."}]${extraFields}
}

Rules:
- 3 to 5 key concepts, each building on the last, each 2 to 4 sentences.
- 3 to 6 key terms, only ones actually used.
- 1 to 3 worked examples with full step-by-step solutions.
- 2 to 3 practice questions with clear answers.
- Match the vocabulary and sentence complexity to the class level instructions above.
`;

      const res = await fetch("/api/generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const { text: rawText } = await res.json();
      let text = rawText.trim();
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      const lesson = JSON.parse(text);

      await supabase
        .from("curriculum_topics")
        .update({ lesson })
        .eq("curriculum_key", classLevel)
        .eq("subject_id", subjectId)
        .eq("topic_id", topic.id);

      setTermTopics((prev) => {
        const updated = { ...prev };
        const term = TERM_NAMES.includes(topic.term) ? topic.term : "First Term";
        updated[term] = updated[term].map((t) => (t.id === topic.id ? { ...t, lesson } : t));
        return updated;
      });
      setActiveLesson({ title: topic.title, ...lesson });
    } catch (error) {
      console.error("Lesson generation error:", error);
      setLessonError(
        error?.message?.includes("429") || error?.message?.includes("quota")
          ? "The AI has hit its usage limit for now. Please try again shortly."
          : "Couldn't generate this lesson. Please try again."
      );
    } finally {
      setLessonLoadingFor(null);
    }
  };

  // Called once a per-sub-section illustration finishes generating.
  // Updates local state immediately, then persists the image into the
  // topic's stored lesson JSON in Supabase so it's never regenerated.
  const saveConceptImage = (index, imageDataUrl) => {
    if (!activeTopicMeta) return;

    setActiveLesson((prevLesson) => {
      if (!prevLesson || !prevLesson.keyConcepts) return prevLesson;

      const updatedKeyConcepts = prevLesson.keyConcepts.map((kc, i) =>
        i === index ? { ...kc, image: imageDataUrl } : kc
      );
      const updatedLesson = { ...prevLesson, keyConcepts: updatedKeyConcepts };

      // Strip the locally-added "title" field before persisting, since the
      // stored lesson JSON in Supabase never included it (title lives on
      // the topic row itself).
      const { title: _title, ...lessonForStorage } = updatedLesson;

      (async () => {
        try {
          await supabase
            .from("curriculum_topics")
            .update({ lesson: lessonForStorage })
            .eq("curriculum_key", classLevel)
            .eq("subject_id", subjectId)
            .eq("topic_id", activeTopicMeta.id);

          setTermTopics((prev) => {
            const updated = { ...prev };
            const term = TERM_NAMES.includes(activeTopicMeta.term) ? activeTopicMeta.term : "First Term";
            updated[term] = updated[term].map((t) =>
              t.id === activeTopicMeta.id ? { ...t, lesson: lessonForStorage } : t
            );
            return updated;
          });
        } catch (err) {
          console.error("Failed to save concept image:", err);
        }
      })();

      return updatedLesson;
    });
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
      state: { topicTitle: topic.title, classLevel },
    });
  };

  if (loading || generating) {
    return (
      <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 flex items-center justify-center p-6">
          <p className={`text-lg font-medium ${darkMode ? "text-green-400" : "text-green-700"}`}>
            {generating
              ? `AI is generating the full 3-term topic list for ${subjectName || subjectId} (${classLevel})...`
              : "Loading topics..."}
          </p>
        </main>
      </div>
    );
  }

  const currentTopics = termTopics[activeTerm] || [];

  return (
    <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 ml-0 md:ml-64 pt-20 md:pt-8 px-5 md:px-8 pb-8">
        <button
          onClick={() => navigate("/dashboard")}
          className={`text-sm font-medium mb-4 hover:underline ${
            darkMode ? "text-green-400" : "text-green-700"
          }`}
        >
          ← Back to Subjects
        </button>

        <h1 className={`text-2xl md:text-3xl font-bold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
          {subjectName || subjectId}
        </h1>
        <p className={`mb-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          {classLevel}
          {stream ? ` • ${stream} stream` : ""} • Select a topic to start learning
        </p>

        {/* Term tabs — the class-level switch above decides card styling below,
            this switch decides WHICH term's topics are visible. */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TERM_NAMES.map((term) => (
            <button
              key={term}
              onClick={() => setActiveTerm(term)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                activeTerm === term
                  ? "bg-green-700 text-white"
                  : darkMode
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {term} ({(termTopics[term] || []).length})
            </button>
          ))}
        </div>

        <div className={layout === "primaryLower" ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "flex flex-col gap-4"}>
          {currentTopics.length === 0 ? (
            <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
              No topics available for {activeTerm} yet.
            </p>
          ) : (
            currentTopics.map((topic, index) => {
              // ---- Primary 1-3: large, colourful, icon-led cards ----
              if (layout === "primaryLower") {
                const color = PRIMARY_COLORS[index % PRIMARY_COLORS.length];
                return (
                  <div
                    key={topic.id}
                    className={`rounded-3xl p-6 border-4 shadow-sm ${darkMode ? color.dark : color.light}`}
                  >
                    <div className="text-4xl mb-3">{PRIMARY_ICONS[index % PRIMARY_ICONS.length]}</div>
                    <h3 className={`text-xl font-extrabold mb-1.5 ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {topic.title}
                    </h3>
                    <p className={`text-base mb-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {topic.description}
                    </p>
                    <TopicActions
                      topic={topic}
                      darkMode={darkMode}
                      lessonLoadingFor={lessonLoadingFor}
                      openLesson={openLesson}
                      openVideo={openVideo}
                      playAudio={playAudio}
                      startPractice={startPractice}
                      big
                    />
                    {showVideo === topic.id && topic.video && (
                      <VideoEmbed topic={topic} />
                    )}
                  </div>
                );
              }

              // ---- Primary 4-6 / JSS / SS: structured card, density increases with level ----
              return (
                <div
                  key={topic.id}
                  className={`rounded-2xl p-5 md:p-6 shadow-sm border-l-4 border-green-700 ${
                    darkMode ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <div>
                    <h3 className={`text-lg font-semibold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {topic.title}
                    </h3>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {topic.description}
                    </p>
                  </div>

                  <TopicActions
                    topic={topic}
                    darkMode={darkMode}
                    lessonLoadingFor={lessonLoadingFor}
                    openLesson={openLesson}
                    openVideo={openVideo}
                    playAudio={playAudio}
                    startPractice={startPractice}
                  />

                  {showVideo === topic.id && topic.video && <VideoEmbed topic={topic} />}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* ============================ LESSON MODAL ============================ */}
      {showLessonModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-1000 p-4 md:p-5"
          onClick={() => setShowLessonModal(false)}
        >
          <div
            className={`rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto relative ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLessonModal(false)}
              className="absolute top-4 right-5 w-8 h-8 rounded-full bg-red-500 text-white text-lg leading-none flex items-center justify-center hover:bg-red-600 z-10"
            >
              ×
            </button>

            <div className="p-6 md:p-8">
              {lessonLoadingFor && !activeLesson ? (
                <div className="py-16 text-center">
                  <p className={`font-medium ${darkMode ? "text-green-400" : "text-green-700"}`}>
                    Preparing your lesson…
                  </p>
                  <p className={`text-sm mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Levelled for {classLevel} — this only takes a moment.
                  </p>
                </div>
              ) : lessonError ? (
                <div className="py-10 text-center">
                  <p className="text-red-500 font-medium mb-4">{lessonError}</p>
                  <button
                    onClick={() => setShowLessonModal(false)}
                    className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-gray-500 text-white hover:bg-gray-600 transition"
                  >
                    Close
                  </button>
                </div>
              ) : activeLesson ? (
                <LessonContent
                  lesson={activeLesson}
                  subjectName={subjectName}
                  classLevel={classLevel}
                  stream={stream}
                  layout={layout}
                  sectionLabels={sectionLabels}
                  darkMode={darkMode}
                  onConceptImageGenerated={saveConceptImage}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Audio Player */}
      {audioUrl && (
        <div
          className={`fixed bottom-0 left-0 w-full p-4 flex items-center gap-4 border-t-4 border-green-700 shadow-lg z-1000 ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <button
            onClick={() => setAudioUrl(null)}
            className="w-9 h-9 rounded-full bg-red-500 text-white text-lg flex items-center justify-center hover:bg-red-600 shrink-0"
          >
            ×
          </button>
          <audio src={audioUrl} controls autoPlay className="flex-1" />
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Shared topic-card action buttons (Learn / Video / Audio / Practice)
   ============================================================ */
function TopicActions({ topic, darkMode, lessonLoadingFor, openLesson, openVideo, playAudio, startPractice, big }) {
  const size = big ? "px-5 py-2.5 text-base" : "px-4 py-2 text-sm";
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <button
        onClick={() => openLesson(topic)}
        disabled={lessonLoadingFor === topic.id}
        className={`${size} rounded-lg font-semibold bg-green-700 text-white hover:bg-green-800 transition disabled:opacity-60`}
      >
        {lessonLoadingFor === topic.id ? "Preparing lesson…" : "📖 Learn This Topic"}
      </button>
      <button
        onClick={() => openVideo(topic)}
        className={`${size} rounded-lg font-semibold bg-yellow-400 text-gray-900 hover:bg-yellow-500 transition`}
      >
        ▶️ Watch Video
      </button>
      <button
        onClick={() => playAudio(topic)}
        className={`${size} rounded-lg font-semibold transition ${
          darkMode ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
        }`}
      >
        🎧 Listen Audio
      </button>
      <button
        onClick={() => startPractice(topic)}
        className={`${size} rounded-lg font-semibold bg-violet-600 text-white hover:bg-violet-700 transition`}
      >
        ✍️ Practice
      </button>
    </div>
  );
}

function VideoEmbed({ topic }) {
  return (
    <div className="mt-4 rounded-lg overflow-hidden bg-black">
      <iframe src={topic.video} title={topic.title} className="w-full h-85 border-0" allowFullScreen></iframe>
    </div>
  );
}

/* ============================================================
   Per-sub-section illustration for the Key Concepts block.
   Generates once via /api/generateTopicImage, shows a lightweight
   loading placeholder while waiting, then reports the finished
   image back up via onGenerated so it can be cached in Supabase
   and never regenerated on future visits.
   ============================================================ */
function ConceptIllustration({ subjectName, heading, content, existingImage, onGenerated, darkMode }) {
  const [image, setImage] = useState(existingImage || null);
  const [loading, setLoading] = useState(!existingImage);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (existingImage) {
      setImage(existingImage);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    const prompt = `Simple, clear educational diagram illustrating: ${heading}. Context: ${content}. Style: clean textbook illustration, minimal colors, white background, for a Nigerian secondary school ${subjectName} lesson. Purely visual — use icons, arrows, shapes, and diagrams to convey the concept. Do not include any text, words, letters, numbers, or labels of any kind in the image.`;

    fetch("/api/generateTopicImage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) throw new Error(data.error || "Image generation failed");
        setImage(data.image);
        setLoading(false);
        onGenerated?.(data.image);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Illustration error:", err);
        setFailed(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heading]);

  if (loading) {
    return (
      <div
        className={`my-3 rounded-lg h-40 flex items-center justify-center text-xs ${
          darkMode ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400"
        }`}
      >
        Generating illustration…
      </div>
    );
  }

  if (failed || !image) return null;

  return <img src={image} alt={heading} className="my-3 rounded-lg w-full max-h-72 object-contain border" />;
}

/* ============================================================
   Lesson note layout — box/card per section, restyled by level.
   Primary: big friendly boxes. JSS: clean academic boxes.
   SS: sophisticated layout, further branched by stream
   (Science = formulas + diagram placeholders, Commercial =
   table/case-study box, Arts = quotation/analysis box).
   ============================================================ */
function LessonContent({ lesson, subjectName, classLevel, stream, layout, sectionLabels, darkMode, onConceptImageGenerated }) {
  const cardBase =
    layout === "primaryLower"
      ? "rounded-2xl p-5 mb-5 border-2"
      : "rounded-xl p-4 mb-5";

  return (
    <>
      <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${darkMode ? "text-green-400" : "text-green-700"}`}>
        {subjectName} • {classLevel}
        {stream ? ` • ${stream}` : ""}
      </p>
      <h2 className={`text-2xl font-bold mb-5 ${darkMode ? "text-white" : "text-gray-900"}`}>{lesson.title}</h2>

      {/* Objectives */}
      {lesson.objectives?.length > 0 && (
        <div className={`${cardBase} ${darkMode ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wide mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Learning Objectives
          </h3>
          <ul className="space-y-1.5">
            {lesson.objectives.map((obj, i) => (
              <li key={i} className={`text-sm flex gap-2 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                <span className={darkMode ? "text-green-400" : "text-green-700"}>✓</span>
                <MathText text={obj} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Terms */}
      {lesson.keyTerms?.length > 0 && (
        <div className={`${cardBase} border-l-4 border-blue-500 ${darkMode ? "bg-blue-500/10" : "bg-blue-50"}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wide mb-2 ${darkMode ? "text-blue-300" : "text-blue-800"}`}>
            Key Vocabulary
          </h3>
          <dl className="space-y-2">
            {lesson.keyTerms.map((kt, i) => (
              <div key={i} className="text-sm">
                <dt className={`font-semibold inline ${darkMode ? "text-white" : "text-gray-900"}`}>{kt.term}: </dt>
                <dd className={`inline ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <MathText text={kt.definition} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Introduction */}
      {lesson.introduction && (
        <div className={`${cardBase} ${darkMode ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wide mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Introduction
          </h3>
          <p className={`text-sm leading-relaxed ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
            <ContentWithDiagrams text={lesson.introduction} darkMode={darkMode} />
          </p>
        </div>
      )}

      {/* Key Concepts / Key Points */}
      {lesson.keyConcepts?.length > 0 && (
        <div className="space-y-4 mb-5">
          <h3 className={`text-sm font-bold uppercase tracking-wide ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            {sectionLabels.keyConcepts}
          </h3>
          {lesson.keyConcepts.map((sec, i) => (
            <div key={i} className={cardBase.replace("mb-5", "")}>
              <h4 className={`font-bold mb-1.5 ${darkMode ? "text-white" : "text-gray-900"}`}>{sec.heading}</h4>
              <p className={`text-sm leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                <ContentWithDiagrams text={sec.content} darkMode={darkMode} />
              </p>
              <ConceptIllustration
                subjectName={subjectName}
                heading={sec.heading}
                content={sec.content}
                existingImage={sec.image}
                darkMode={darkMode}
                onGenerated={(img) => onConceptImageGenerated?.(i, img)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Worked Examples / Examples */}
      {lesson.workedExamples?.length > 0 && (
        <div className={`${cardBase} border-l-4 border-indigo-500 ${darkMode ? "bg-indigo-500/10" : "bg-indigo-50"}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wide mb-3 ${darkMode ? "text-indigo-300" : "text-indigo-800"}`}>
            {sectionLabels.workedExamples}
          </h3>
          <div className="space-y-4">
            {lesson.workedExamples.map((ex, i) => (
              <div key={i} className="text-sm">
                <p className={`font-semibold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
                  {i + 1}. <MathText text={ex.problem} />
                </p>
                <p className={`pl-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <MathText text={ex.solution} />
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commercial stream: comparison / case-study table */}
      {lesson.table?.headers?.length > 0 && (
        <div className={`${cardBase} border-l-4 border-teal-500 overflow-x-auto ${darkMode ? "bg-teal-500/10" : "bg-teal-50"}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wide mb-3 ${darkMode ? "text-teal-300" : "text-teal-800"}`}>
            Summary Table
          </h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {lesson.table.headers.map((h, i) => (
                  <th
                    key={i}
                    className={`text-left py-2 px-3 border-b font-semibold ${
                      darkMode ? "border-gray-700 text-gray-200" : "border-gray-300 text-gray-800"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lesson.table.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`py-2 px-3 border-b ${darkMode ? "border-gray-800 text-gray-300" : "border-gray-200 text-gray-700"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Arts stream: quotation / analysis boxes */}
      {lesson.quoteAnalysis?.length > 0 && (
        <div className="space-y-3 mb-5">
          {lesson.quoteAnalysis.map((qa, i) => (
            <blockquote
              key={i}
              className={`${cardBase} mb-0 border-l-4 border-rose-500 italic ${darkMode ? "bg-rose-500/10" : "bg-rose-50"}`}
            >
              <p className={`text-sm mb-2 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>"{qa.quote}"</p>
              <p className={`text-sm not-italic ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{qa.analysis}</p>
            </blockquote>
          ))}
        </div>
      )}

      {/* Practice / Activity */}
      {lesson.practice?.length > 0 && (
        <div className={`${cardBase} border-l-4 border-amber-500 ${darkMode ? "bg-amber-500/10" : "bg-amber-50"}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wide mb-3 ${darkMode ? "text-amber-300" : "text-amber-800"}`}>
            {sectionLabels.practice}
          </h3>
          <div className="space-y-3">
            {lesson.practice.map((qa, i) => (
              <details key={i} className="text-sm">
                <summary className={`font-medium cursor-pointer ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                  {i + 1}. <MathText text={qa.question} />
                </summary>
                <p className={`mt-1.5 pl-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <MathText text={qa.answer} />
                </p>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {lesson.summary && (
        <div className={`${cardBase} mb-0 border-l-4 border-green-700 ${darkMode ? "bg-green-500/10" : "bg-green-50"}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wide mb-1.5 ${darkMode ? "text-green-300" : "text-green-800"}`}>
            Summary
          </h3>
          <p className={`text-sm leading-relaxed ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
            <MathText text={lesson.summary} />
          </p>
        </div>
      )}
    </>
  );
}

export default Topics;
