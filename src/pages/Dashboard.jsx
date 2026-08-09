import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { auth, db, aiModel } from "../firebase";
import Sidebar from "../components/Layout/Sidebar";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

// Book-cover art. Custom-generated for EduNaija specifically (own branding,
// "FOR NIGERIAN SCHOOLS" seal) — not scanned/copied publisher covers. Each
// cover has its class level (SS 1 / SS 2 / SS 3) baked into the artwork, so
// covers are looked up by (classLevel, subject) together — a cover only
// ever renders for the exact class level it was made for. Anything without
// a matching cover falls back to the gradient tile design further down.

// SS 1
import ss1Mathematics from "../assets/covers/mathematics.webp";
import ss1Biology from "../assets/covers/biology.webp";
import ss1EnglishLanguage from "../assets/covers/english-language.webp";
import ss1Physics from "../assets/covers/physics.webp";
import ss1Chemistry from "../assets/covers/chemistry.webp";
import ss1AgriculturalScience from "../assets/covers/agricultural-science.webp";
import ss1ComputerStudies from "../assets/covers/computer-studies.webp";
import ss1FurtherMathematics from "../assets/covers/further-mathematics.webp";
import ss1CivicEducation from "../assets/covers/civic-education.webp";
import ss1Geography from "../assets/covers/geography.webp";
import ss1TechnicalDrawing from "../assets/covers/technical-drawing.webp";
import ss1Economics from "../assets/covers/economics.webp";
import ss1History from "../assets/covers/history.webp";
import ss1Government from "../assets/covers/government.webp";
import ss1FinancialAccounting from "../assets/covers/financial-accounting.webp";
import ss1Commerce from "../assets/covers/commerce.webp";
import ss1DataProcessing from "../assets/covers/ss1-data-processing.webp";
import ss1YorubaLanguage from "../assets/covers/ss1-yoruba-language.webp";
import ss1FineArt from "../assets/covers/ss1-fine-art.webp";
import ss1ChristianReligiousStudies from "../assets/covers/ss1-christian-religious-studies.webp";
import ss1LiteratureInEnglish from "../assets/covers/ss1-literature-in-english.webp";

// SS 2
import ss2History from "../assets/covers/ss2-history.webp";
import ss2TechnicalDrawing from "../assets/covers/ss2-technical-drawing.webp";
import ss2Economics from "../assets/covers/ss2-economics.webp";
import ss2Physics from "../assets/covers/ss2-physics.webp";
import ss2Mathematics from "../assets/covers/ss2-mathematics.webp";
import ss2EnglishLanguage from "../assets/covers/ss2-english-language.webp";
import ss2Biology from "../assets/covers/ss2-biology.webp";
import ss2FurtherMathematics from "../assets/covers/ss2-further-mathematics.webp";
import ss2DataProcessing from "../assets/covers/ss2-data-processing.webp";
import ss2Chemistry from "../assets/covers/ss2-chemistry.webp";
import ss2FineArt from "../assets/covers/ss2-fine-art.webp";
import ss2YorubaLanguage from "../assets/covers/ss2-yoruba-language.webp";
import ss2ChristianReligiousStudies from "../assets/covers/ss2-christian-religious-studies.webp";

// SS 3
import ss3LiteratureInEnglish from "../assets/covers/ss3-literature-in-english.webp";
import ss3Biology from "../assets/covers/ss3-biology.webp";
import ss3Chemistry from "../assets/covers/ss3-chemistry.webp";
import ss3Physics from "../assets/covers/ss3-physics.webp";
import ss3History from "../assets/covers/ss3-history.webp";
import ss3CivicEducation from "../assets/covers/ss3-civic-education.webp";
import ss3Mathematics from "../assets/covers/ss3-mathematics.webp";
import ss3EnglishLanguage from "../assets/covers/ss3-english-language.webp";

// JSS 1
// NOTE: only unambiguous covers are wired in below — any JSS cover with a
// misspelled "Edtaija" logo, or with more than one competing design, was
// deliberately left out for now rather than guessed at. Anything missing
// here just falls back to the gradient tile until a final image is picked.
import jss1BasicScience from "../assets/covers/jss1-basic-science.webp";
import jss1Mathematics from "../assets/covers/jss1-mathematics.webp";
import jss1EnglishLanguage from "../assets/covers/jss1-english-language.webp";
import jss1ComputerStudies from "../assets/covers/jss1-computer-studies.webp";
import jss1CulturalAndCreativeArts from "../assets/covers/jss1-cultural-and-creative-arts.webp";

// JSS 2
import jss2BasicScience from "../assets/covers/jss2-basic-science.webp";
import jss2EnglishLanguage from "../assets/covers/jss2-english-language.webp";
import jss2Mathematics from "../assets/covers/jss2-mathematics.webp";
import jss2ComputerStudies from "../assets/covers/jss2-computer-studies.webp";
import jss2CulturalAndCreativeArts from "../assets/covers/jss2-cultural-and-creative-arts.webp";
import jss2PhysicalAndHealthEducation from "../assets/covers/jss2-physical-and-health-education.webp";
import jss1PhysicalAndHealthEducation from "../assets/covers/jss1-physical-and-health-education.webp";

// JSS 3
import jss3BasicScience from "../assets/covers/jss3-basic-science.webp";
import jss3Mathematics from "../assets/covers/jss3-mathematics.webp";
import jss3EnglishLanguage from "../assets/covers/jss3-english-language.webp";
import jss3ComputerStudies from "../assets/covers/jss3-computer-studies.webp";
import jss3CulturalAndCreativeArts from "../assets/covers/jss3-cultural-and-creative-arts.webp";
import jss3BasicTechnology from "../assets/covers/jss3-basic-technology.webp";

// Keyed by [classLevel][normalized subject slug] so lookups don't depend on
// the AI producing byte-identical id strings every time it generates subjects.
const SUBJECT_COVERS = {
  "SS 1": {
    "mathematics": ss1Mathematics,
    "biology": ss1Biology,
    "english-language": ss1EnglishLanguage,
    "physics": ss1Physics,
    "chemistry": ss1Chemistry,
    "agricultural-science": ss1AgriculturalScience,
    "computer-studies": ss1ComputerStudies,
    "further-mathematics": ss1FurtherMathematics,
    "civic-education": ss1CivicEducation,
    "geography": ss1Geography,
    "technical-drawing": ss1TechnicalDrawing,
    "economics": ss1Economics,
    "history": ss1History,
    "government": ss1Government,
    "financial-accounting": ss1FinancialAccounting,
    "commerce": ss1Commerce,
    "data-processing": ss1DataProcessing,
    "yoruba-language": ss1YorubaLanguage,
    "fine-art": ss1FineArt,
    "christian-religious-studies": ss1ChristianReligiousStudies,
    "literature-in-english": ss1LiteratureInEnglish,
  },
  "SS 2": {
    "history": ss2History,
    "technical-drawing": ss2TechnicalDrawing,
    "economics": ss2Economics,
    "physics": ss2Physics,
    "mathematics": ss2Mathematics,
    "english-language": ss2EnglishLanguage,
    "biology": ss2Biology,
    "further-mathematics": ss2FurtherMathematics,
    "data-processing": ss2DataProcessing,
    "chemistry": ss2Chemistry,
    "fine-art": ss2FineArt,
    "yoruba-language": ss2YorubaLanguage,
    "christian-religious-studies": ss2ChristianReligiousStudies,
  },
  "SS 3": {
    "literature-in-english": ss3LiteratureInEnglish,
    "biology": ss3Biology,
    "chemistry": ss3Chemistry,
    "physics": ss3Physics,
    "history": ss3History,
    "civic-education": ss3CivicEducation,
    "mathematics": ss3Mathematics,
    "english-language": ss3EnglishLanguage,
  },
  "JSS 1": {
    "basic-science": jss1BasicScience,
    "mathematics": jss1Mathematics,
    "english-language": jss1EnglishLanguage,
    "computer-studies": jss1ComputerStudies,
    "cultural-and-creative-arts": jss1CulturalAndCreativeArts,
    "physical-and-health-education": jss1PhysicalAndHealthEducation,
  },
  "JSS 2": {
    "basic-science": jss2BasicScience,
    "english-language": jss2EnglishLanguage,
    "mathematics": jss2Mathematics,
    "computer-studies": jss2ComputerStudies,
    "cultural-and-creative-arts": jss2CulturalAndCreativeArts,
    "physical-and-health-education": jss2PhysicalAndHealthEducation,
  },
  "JSS 3": {
    "basic-science": jss3BasicScience,
    "mathematics": jss3Mathematics,
    "english-language": jss3EnglishLanguage,
    "computer-studies": jss3ComputerStudies,
    "cultural-and-creative-arts": jss3CulturalAndCreativeArts,
    "basic-technology": jss3BasicTechnology,
  },
};

const normalizeSlug = (str) =>
  (str || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const getCoverFor = (subject, classLevel) => {
  const covers = SUBJECT_COVERS[classLevel];
  if (!covers) return null;
  return covers[normalizeSlug(subject.id)] || covers[normalizeSlug(subject.name)] || null;
};

function Dashboard() {
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  // Gradients are applied via inline style (below), not Tailwind classes.
  // These class names used to be built dynamically at runtime (`from-x to-y`),
  // and Tailwind's build-time scanner can't reliably detect and generate
  // CSS for classes assembled that way — which is why cards were rendering
  // with no visible background at all. Inline gradients always work.
  const subjectStyles = [
    { icon: "📐", gradient: "linear-gradient(135deg, #6366f1, #9333ea)" },   // indigo -> purple
    { icon: "📖", gradient: "linear-gradient(135deg, #ec4899, #f43f5e)" },   // pink -> rose
    { icon: "🧬", gradient: "linear-gradient(135deg, #34d399, #06b6d4)" },   // emerald -> cyan
    { icon: "⚡", gradient: "linear-gradient(135deg, #60a5fa, #22d3ee)" },   // blue -> cyan
    { icon: "🧪", gradient: "linear-gradient(135deg, #4ade80, #2dd4bf)" },   // green -> teal
    { icon: "🇳🇬", gradient: "linear-gradient(135deg, #f87171, #f472b6)" },  // red -> pink
    { icon: "🌍", gradient: "linear-gradient(135deg, #c084fc, #f9a8d4)" },   // purple -> pink
    { icon: "🎨", gradient: "linear-gradient(135deg, #fdba74, #f9a8d4)" },   // orange -> pink
    { icon: "💻", gradient: "linear-gradient(135deg, #22d3ee, #3b82f6)" },   // cyan -> blue
    { icon: "📊", gradient: "linear-gradient(135deg, #facc15, #fb923c)" },   // yellow -> orange
    { icon: "🏛️", gradient: "linear-gradient(135deg, #86efac, #fde047)" },  // green -> yellow
    { icon: "📚", gradient: "linear-gradient(135deg, #d946ef, #ec4899)" },   // fuchsia -> pink
  ];

  const getCurriculumKey = (userData) => {
    if (userData.classLevel.startsWith("SS")) {
      return `${userData.classLevel}-${userData.department}`;
    }
    return userData.classLevel;
  };

  const generateSubjects = async (userData) => {
    setGenerating(true);
    try {
      const { classLevel, department } = userData;
      const key = getCurriculumKey(userData);

      let prompt = "";

      if (classLevel.startsWith("SS")) {
        prompt = `
You are an expert in the Nigerian Senior Secondary School curriculum (NERDC).
The student is in ${classLevel} and belongs to the ${department} department.

Generate a list of subjects with these rules:
1. Always include these 3 COMPULSORY subjects first:
   - English Language
   - Mathematics
   - Biology
2. Then add 7 to 9 other subjects that are typical for the ${department} department in Nigerian secondary schools.

Return ONLY a valid JSON array like this:
[
  {"name": "English Language", "id": "english-language", "compulsory": true},
  {"name": "Mathematics", "id": "mathematics", "compulsory": true},
  {"name": "Biology", "id": "biology", "compulsory": true},
  {"name": "Physics", "id": "physics", "compulsory": false}
]
Do not add any extra text or markdown.
`;
      } else {
        prompt = `
You are an expert in the Nigerian education curriculum (NERDC).
List exactly 10 to 12 compulsory subjects for ${classLevel} students in Nigeria.
Return ONLY a valid JSON array like this:
[
  {"name": "Mathematics", "id": "mathematics"},
  {"name": "English Language", "id": "english-language"}
]
Do not add any extra text or markdown.
`;
      }

      const result = await aiModel.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const generated = JSON.parse(text);

      const subjectsWithStyle = [];

      for (let i = 0; i < generated.length; i++) {
        const subject = generated[i];
        const style = subjectStyles[i % subjectStyles.length];

        const subjectData = {
          name: subject.name,
          id: subject.id,
          icon: style.icon,
          gradient: style.gradient,
          order: i + 1,
          compulsory: subject.compulsory || false
        };

        await setDoc(doc(db, "curriculum", key, "subjects", subject.id), subjectData);
        subjectsWithStyle.push(subjectData);
      }

      setSubjects(subjectsWithStyle);
    } catch (error) {
      console.error("AI generation error:", error);
      alert("Failed to generate subjects. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const loadSubjects = async (userData) => {
    try {
      const key = getCurriculumKey(userData);
      const subjectsRef = collection(db, "curriculum", key, "subjects");
      const snapshot = await getDocs(subjectsRef);

      if (!snapshot.empty) {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        loaded.sort((a, b) => (a.order || 0) - (b.order || 0));
        setSubjects(loaded);
      } else {
        await generateSubjects(userData);
      }
    } catch (error) {
      console.error("Error loading subjects:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser(userData);

          if (!userData.classLevel) {
            setLoading(false);
            return;
          }

          if (userData.classLevel.startsWith("SS") && !userData.department) {
            setLoading(false);
            return;
          }

          await loadSubjects(userData);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 flex items-center justify-center">
          <p className="text-lg text-gray-600">Loading your dashboard...</p>
        </main>
      </div>
    );
  }

  if (!user?.classLevel) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 flex items-center justify-center p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3">Please select your class</h2>
            <p className="text-gray-500 mb-6">Go to Profile and choose your class level first.</p>
            <button
              onClick={() => navigate("/profile")}
              className="bg-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition"
            >
              Go to Profile
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (user.classLevel.startsWith("SS") && !user.department) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 flex items-center justify-center p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3">Please select your department</h2>
            <p className="text-gray-500 mb-6">
              As a Senior Secondary student, you need to choose Science, Art or Commercial.
            </p>
            <button
              onClick={() => navigate("/profile")}
              className="bg-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition"
            >
              Go to Profile
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 ml-0 md:ml-64 p-5 md:p-8">
        {/* Header */}
        <header className={`rounded-2xl p-5 md:p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm
          ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          <div>
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Welcome back, {user?.name?.split(" ")[0] || "Student"} 👋
            </h2>
            <p className={`mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {user.classLevel}
              {user.department ? ` • ${user.department}` : ""} • Ready to continue learning?
            </p>
          </div>
          <div className="bg-green-100 text-green-800 px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap">
            ⭐ {user?.xp || 0} XP
          </div>
        </header>

        {/* Subjects Section */}
        <section>
          <h3 className={`text-xl font-semibold mb-5 ${darkMode ? "text-white" : "text-gray-800"}`}>
            Your Subjects {generating && <span className="text-green-600 text-base font-normal">(Generating with AI...)</span>}
          </h3>

          {generating ? (
            <div className="text-center py-16 text-green-700 font-medium">
              AI is generating subjects for {user.classLevel}
              {user.department ? ` (${user.department})` : ""}... Please wait.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
              {subjects.map((subject, i) => {
                // Looks up a cover matching both this subject AND the
                // student's actual class level, across all classes with
                // wired-in cover art — anything without a match falls
                // back to the gradient tile below.
                const cover = getCoverFor(subject, user.classLevel);

                return (
                  <div
                    key={subject.id}
                    onClick={() =>
                      navigate(
                        `/topics/${subject.id}?class=${encodeURIComponent(getCurriculumKey(user))}`
                      )
                    }
                    className="rounded-2xl cursor-pointer shadow-md hover:scale-105 hover:shadow-xl transition-all duration-200 aspect-3/4 overflow-hidden relative"
                    style={cover ? undefined : { background: subject.gradient || subjectStyles[i % subjectStyles.length].gradient }}
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={`${subject.name} textbook cover`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full text-white flex flex-col items-center justify-center p-4">
                        <div className="text-4xl mb-3">{subject.icon}</div>
                        <div className="font-semibold text-center text-sm leading-tight">
                          {subject.name}
                        </div>
                        {subject.compulsory && (
                          <div className="text-[11px] mt-2 bg-white/20 px-2 py-0.5 rounded-full">
                            Compulsory
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;