import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { auth, db, aiModel } from "../firebase";
import Sidebar from "../components/Layout/Sidebar";
import { useTheme } from "../context/ThemeContext";

function Topics() {
  const { subjectId } = useParams();
  const [searchParams] = useSearchParams();
  const classLevel = searchParams.get("class") || "";
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const [topics, setTopics] = useState([]);
  const [subjectName, setSubjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Media states
  const [showVideo, setShowVideo] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const generateTopics = async () => {
    setGenerating(true);
    try {
      const prompt = `
You are an expert in the Nigerian education curriculum (NERDC).
Generate 8 to 12 important topics for the subject "${subjectName || subjectId}" for ${classLevel} students in Nigeria.
Return ONLY a valid JSON array like this example:
[
  {
    "id": "topic-1",
    "title": "Introduction to Numbers",
    "description": "Understanding counting and basic number concepts"
  }
]
Do not add any extra text, markdown or explanation. Only return pure JSON.
`;

      const result = await aiModel.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      const generated = JSON.parse(text);

      const savedTopics = [];
      for (let i = 0; i < generated.length; i++) {
        const topic = generated[i];
        const topicData = {
          title: topic.title,
          description: topic.description,
          order: i + 1,
          video: null,
          audio: null,
          lesson: null, // generated on demand the first time a student opens it
        };

        await setDoc(
          doc(db, "curriculum", classLevel, "subjects", subjectId, "topics", topic.id || `topic-${i + 1}`),
          topicData
        );

        savedTopics.push({ id: topic.id || `topic-${i + 1}`, ...topicData });
      }

      setTopics(savedTopics);
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
      const subjectSnap = await getDocs(collection(db, "curriculum", classLevel, "subjects"));
      const subject = subjectSnap.docs.find((d) => d.id === subjectId);
      if (subject) {
        setSubjectName(subject.data().name);
      }

      const topicsRef = collection(db, "curriculum", classLevel, "subjects", subjectId, "topics");
      const snapshot = await getDocs(topicsRef);

      if (!snapshot.empty) {
        const loaded = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        loaded.sort((a, b) => (a.order || 0) - (b.order || 0));
        setTopics(loaded);
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      if (!classLevel) {
        navigate("/dashboard");
        return;
      }

      await loadTopics();
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, classLevel, navigate]);

  const [showLessonModal, setShowLessonModal] = useState(false);
  const [activeLesson, setActiveLesson] = useState(null); // { title, objectives, keyTerms, sections, checkYourUnderstanding, summary }
  const [lessonLoadingFor, setLessonLoadingFor] = useState(null); // topic.id currently generating
  const [lessonError, setLessonError] = useState("");

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

  const openLesson = async (topic) => {
    setLessonError("");

    // Already generated and cached — just show it, no AI call needed.
    if (topic.lesson) {
      setActiveLesson({ title: topic.title, ...topic.lesson });
      setShowLessonModal(true);
      return;
    }

    setLessonLoadingFor(topic.id);
    setShowLessonModal(true);

    try {
      const prompt = `
You are an expert Nigerian curriculum textbook author (NERDC), writing with the clarity and structure of a well-regarded textbook series like Prentice Hall Science Explorer: clear learning objectives, defined vocabulary, an explanation built section by section, checkpoint questions to test understanding, and a closing summary.

Subject: ${subjectName || subjectId}
Topic: ${topic.title} — ${topic.description}
Student's class level: ${classLevel}

${readingLevelGuidance(classLevel)}

Write a complete lesson for this topic. Use real-world Nigerian examples and context where they help understanding. Return ONLY valid JSON in exactly this shape, with no markdown fences and no extra text:

{
  "objectives": ["2 to 4 short 'By the end of this lesson, you will be able to...' statements"],
  "keyTerms": [{"term": "...", "definition": "..."}],
  "sections": [{"heading": "...", "content": "..."}],
  "checkYourUnderstanding": [{"question": "...", "answer": "..."}],
  "summary": "A short 2-3 sentence wrap-up of the whole topic"
}

Rules:
- 3 to 5 sections, each building on the last, each 2 to 4 sentences.
- 3 to 6 key terms, only ones actually used in the sections.
- 2 to 3 check-your-understanding questions with clear answers.
- Match the vocabulary and sentence complexity to the class level instructions above.
`;

      const result = await aiModel.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      const lesson = JSON.parse(text);

      // Cache it so this exact topic never needs to be regenerated again.
      await setDoc(
        doc(db, "curriculum", classLevel, "subjects", subjectId, "topics", topic.id),
        { lesson },
        { merge: true }
      );

      setTopics((prev) => prev.map((t) => (t.id === topic.id ? { ...t, lesson } : t)));
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
      state: { topicTitle: topic.title },
    });
  };

  if (loading || generating) {
    return (
      <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 flex items-center justify-center p-6">
          <p className={`text-lg font-medium ${darkMode ? "text-green-400" : "text-green-700"}`}>
            {generating
              ? `AI is generating topics for ${subjectName || subjectId} (${classLevel})...`
              : "Loading topics..."}
          </p>
        </main>
      </div>
    );
  }

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
        <p className={`mb-6 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          {classLevel} • Select a topic to start learning
        </p>

        <div className="flex flex-col gap-4">
          {topics.length === 0 ? (
            <p className={darkMode ? "text-gray-400" : "text-gray-500"}>No topics available yet.</p>
          ) : (
            topics.map((topic) => (
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

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() => openLesson(topic)}
                    disabled={lessonLoadingFor === topic.id}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-700 text-white hover:bg-green-800 transition disabled:opacity-60"
                  >
                    {lessonLoadingFor === topic.id ? "Preparing lesson…" : "📖 Learn This Topic"}
                  </button>
                  <button
                    onClick={() => openVideo(topic)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-yellow-400 text-gray-900 hover:bg-yellow-500 transition"
                  >
                    ▶️ Watch Video
                  </button>
                  <button
                    onClick={() => playAudio(topic)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      darkMode
                        ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    🎧 Listen Audio
                  </button>
                  <button
                    onClick={() => startPractice(topic)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition"
                  >
                    ✍️ Practice
                  </button>
                </div>

                {showVideo === topic.id && topic.video && (
                  <div className="mt-4 rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={topic.video}
                      title={topic.title}
                      className="w-full h-85 border-0"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Lesson Modal */}
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
                    Preparing your lesson on "{topics.find((t) => t.id === lessonLoadingFor)?.title}"…
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
                <>
                  <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${darkMode ? "text-green-400" : "text-green-700"}`}>
                    {subjectName} • {classLevel}
                  </p>
                  <h2 className={`text-2xl font-bold mb-5 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {activeLesson.title}
                  </h2>

                  {/* Objectives */}
                  {activeLesson.objectives?.length > 0 && (
                    <div className={`rounded-xl p-4 mb-5 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
                      <h3 className={`text-sm font-bold uppercase tracking-wide mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        Learning Objectives
                      </h3>
                      <ul className="space-y-1.5">
                        {activeLesson.objectives.map((obj, i) => (
                          <li key={i} className={`text-sm flex gap-2 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                            <span className={darkMode ? "text-green-400" : "text-green-700"}>✓</span>
                            {obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key Terms */}
                  {activeLesson.keyTerms?.length > 0 && (
                    <div className={`rounded-xl p-4 mb-5 border-l-4 border-blue-500 ${
                      darkMode ? "bg-blue-500/10" : "bg-blue-50"
                    }`}>
                      <h3 className={`text-sm font-bold uppercase tracking-wide mb-2 ${darkMode ? "text-blue-300" : "text-blue-800"}`}>
                        Key Vocabulary
                      </h3>
                      <dl className="space-y-2">
                        {activeLesson.keyTerms.map((kt, i) => (
                          <div key={i} className="text-sm">
                            <dt className={`font-semibold inline ${darkMode ? "text-white" : "text-gray-900"}`}>
                              {kt.term}:{" "}
                            </dt>
                            <dd className={`inline ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                              {kt.definition}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  {/* Sections */}
                  <div className="space-y-5 mb-5">
                    {activeLesson.sections?.map((sec, i) => (
                      <div key={i}>
                        <h3 className={`font-bold mb-1.5 ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {sec.heading}
                        </h3>
                        <p className={`text-sm leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          {sec.content}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Check Your Understanding */}
                  {activeLesson.checkYourUnderstanding?.length > 0 && (
                    <div className={`rounded-xl p-4 mb-5 border-l-4 border-amber-500 ${
                      darkMode ? "bg-amber-500/10" : "bg-amber-50"
                    }`}>
                      <h3 className={`text-sm font-bold uppercase tracking-wide mb-3 ${darkMode ? "text-amber-300" : "text-amber-800"}`}>
                        Check Your Understanding
                      </h3>
                      <div className="space-y-3">
                        {activeLesson.checkYourUnderstanding.map((qa, i) => (
                          <details key={i} className="text-sm">
                            <summary className={`font-medium cursor-pointer ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                              {i + 1}. {qa.question}
                            </summary>
                            <p className={`mt-1.5 pl-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                              {qa.answer}
                            </p>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {activeLesson.summary && (
                    <div className={`rounded-xl p-4 border-l-4 border-green-700 ${
                      darkMode ? "bg-green-500/10" : "bg-green-50"
                    }`}>
                      <h3 className={`text-sm font-bold uppercase tracking-wide mb-1.5 ${darkMode ? "text-green-300" : "text-green-800"}`}>
                        Summary
                      </h3>
                      <p className={`text-sm leading-relaxed ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                        {activeLesson.summary}
                      </p>
                    </div>
                  )}
                </>
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

export default Topics;
