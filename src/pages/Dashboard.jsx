import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { auth, db, aiModel } from "../firebase";
import Sidebar from "../components/Layout/Sidebar";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import {
  Hand,
  Star,
  ChevronDown,
  Calculator,
  BookOpen,
  Dna,
  Zap,
  FlaskConical,
  Flag,
  Globe2,
  Palette,
  Laptop,
  BarChart3,
  Landmark,
  BookMarked,
} from "lucide-react";

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
import ss2Commerce from "../assets/covers/ss2-commerce.webp";
import ss2LiteratureInEnglish from "../assets/covers/ss2-literature-in-english.webp";
import ss2FinancialAccounting from "../assets/covers/ss2-financial-accounting.webp";
import ss2Geography from "../assets/covers/ss2-geography.webp";

// SS 3
import ss3LiteratureInEnglish from "../assets/covers/ss3-literature-in-english.webp";
import ss3Geography from "../assets/covers/ss3-geography.webp";
import ss3Commerce from "../assets/covers/ss3-commerce.webp";
import ss3FinancialAccounting from "../assets/covers/ss3-financial-accounting.webp";
import ss3ChristianReligiousStudies from "../assets/covers/ss3-christian-religious-studies.webp";
import ss3TechnicalDrawing from "../assets/covers/ss3-technical-drawing.webp";
import ss3DataProcessing from "../assets/covers/ss3-data-processing.webp";
import ss3Government from "../assets/covers/ss3-government.webp";
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
    "commerce": ss2Commerce,
    "literature-in-english": ss2LiteratureInEnglish,
    "financial-accounting": ss2FinancialAccounting,
    "geography": ss2Geography,
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
    "geography": ss3Geography,
    "commerce": ss3Commerce,
    "financial-accounting": ss3FinancialAccounting,
    "christian-religious-studies": ss3ChristianReligiousStudies,
    "technical-drawing": ss3TechnicalDrawing,
    "data-processing": ss3DataProcessing,
    "government": ss3Government,
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

// XP -> level: every 100 XP is one level. Purely a display convenience,
// doesn't touch what's stored in Firestore.
const XP_PER_LEVEL = 100;
const getLevelProgress = (xp) => {
  const safeXp = Math.max(0, xp || 0);
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const intoLevel = safeXp % XP_PER_LEVEL;
  return { level, intoLevel, remaining: XP_PER_LEVEL - intoLevel, percent: intoLevel };
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

// Subject icons are stored as plain string keys (never as component
// references) because subjectStyles gets copied into subjectData and
// saved straight to Firestore via setDoc — a React component isn't
// serializable, so only the lookup key travels with the saved subject.
const SUBJECT_ICONS = {
  calculator: Calculator,
  "book-open": BookOpen,
  dna: Dna,
  zap: Zap,
  flask: FlaskConical,
  flag: Flag,
  globe: Globe2,
  palette: Palette,
  laptop: Laptop,
  "bar-chart": BarChart3,
  landmark: Landmark,
  "book-marked": BookMarked,
};

function Dashboard() {
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [xpExpanded, setXpExpanded] = useState(false);
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Gradients are applied via inline style (below), not Tailwind classes.
  // These class names used to be built dynamically at runtime (`from-x to-y`),
  // and Tailwind's build-time scanner can't reliably detect and generate
  // CSS for classes assembled that way — which is why cards were rendering
  // with no visible background at all. Inline gradients always work.
  const subjectStyles = [
    { icon: "calculator", gradient: "linear-gradient(135deg, #6366f1, #9333ea)" },   // indigo -> purple
    { icon: "book-open", gradient: "linear-gradient(135deg, #ec4899, #f43f5e)" },    // pink -> rose
    { icon: "dna", gradient: "linear-gradient(135deg, #34d399, #06b6d4)" },          // emerald -> cyan
    { icon: "zap", gradient: "linear-gradient(135deg, #60a5fa, #22d3ee)" },          // blue -> cyan
    { icon: "flask", gradient: "linear-gradient(135deg, #4ade80, #2dd4bf)" },        // green -> teal
    { icon: "flag", gradient: "linear-gradient(135deg, #f87171, #f472b6)" },         // red -> pink
    { icon: "globe", gradient: "linear-gradient(135deg, #c084fc, #f9a8d4)" },        // purple -> pink
    { icon: "palette", gradient: "linear-gradient(135deg, #fdba74, #f9a8d4)" },      // orange -> pink
    { icon: "laptop", gradient: "linear-gradient(135deg, #22d3ee, #3b82f6)" },       // cyan -> blue
    { icon: "bar-chart", gradient: "linear-gradient(135deg, #facc15, #fb923c)" },    // yellow -> orange
    { icon: "landmark", gradient: "linear-gradient(135deg, #86efac, #fde047)" },     // green -> yellow
    { icon: "book-marked", gradient: "linear-gradient(135deg, #d946ef, #ec4899)" },  // fuchsia -> pink
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
        <header
          className={`
            relative overflow-hidden rounded-2xl mb-8 shadow-sm
            transition-all duration-500 ease-out
            ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
            ${darkMode ? "bg-gray-800" : "bg-white"}
          `}
        >
          {/* Accent bar */}
          <div className="h-1.5 bg-linear-to-r from-green-600 via-emerald-500 to-green-600" />

          <style>{`
            @keyframes edunaija-wave {
              0%, 100% { transform: rotate(0deg); }
              15% { transform: rotate(-12deg); }
              30% { transform: rotate(10deg); }
              45% { transform: rotate(-8deg); }
              60% { transform: rotate(6deg); }
              75% { transform: rotate(0deg); }
            }
            .edunaija-wave-icon {
              display: inline-block;
              transform-origin: 70% 70%;
              animation: edunaija-wave 1.6s ease-in-out 0.4s 1;
            }
          `}</style>

          <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-2xl bg-linear-to-br from-green-600 to-emerald-500 text-white flex items-center justify-center text-xl md:text-2xl font-bold shadow-md">
                {(user?.name?.trim()?.[0] || "S").toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className={`flex items-center gap-2 text-xl md:text-2xl font-bold truncate ${darkMode ? "text-white" : "text-gray-900"}`}>
                  <span className="truncate">{getGreeting()}, {user?.name?.split(" ")[0] || "Student"}</span>
                  <Hand size={22} className="edunaija-wave-icon text-amber-500 shrink-0" strokeWidth={2.25} />
                </h2>
                <p className={`mt-1 text-sm md:text-base truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {user.classLevel}
                  {user.department ? ` • ${user.department}` : ""} • Ready to continue learning?
                </p>
              </div>
            </div>

            {/* XP / Level module — tap to expand */}
            {(() => {
              const { level, intoLevel, remaining, percent } = getLevelProgress(user?.xp);
              return (
                <button
                  type="button"
                  onClick={() => setXpExpanded((v) => !v)}
                  aria-expanded={xpExpanded}
                  className={`shrink-0 rounded-2xl px-5 py-3.5 w-full sm:w-56 text-left transition-colors ${
                    darkMode ? "bg-gray-900/60 hover:bg-gray-900/80" : "bg-amber-50 hover:bg-amber-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`flex items-center gap-1.5 text-sm font-bold ${darkMode ? "text-amber-300" : "text-amber-700"}`}>
                      <Star size={15} className="fill-current" strokeWidth={0} />
                      Level {level}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {user?.xp || 0} XP
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${xpExpanded ? "rotate-180" : ""}`}
                      />
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${darkMode ? "bg-gray-700" : "bg-amber-100"}`}>
                    <div
                      className="h-full rounded-full bg-linear-to-r from-amber-400 to-orange-500 transition-all duration-700 ease-out"
                      style={{ width: mounted ? `${percent}%` : "0%" }}
                    />
                  </div>

                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      xpExpanded ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0 mt-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className={`text-[11px] leading-snug ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                        {intoLevel} / {XP_PER_LEVEL} XP into level {level} • {remaining} XP to level {level + 1}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })()}
          </div>
        </header>

        {/* Subjects Section */}
        <section
          className={`transition-all duration-500 ease-out delay-100 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
            <h3 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
              Your Subjects
            </h3>
            {!generating && subjects.length > 0 && (
              <span className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                {subjects.length} subject{subjects.length !== 1 ? "s" : ""} • tap one to start learning
              </span>
            )}
          </div>

          {generating ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 rounded-full border-4 border-green-200 border-t-green-600 animate-spin" />
              <p className={`font-medium text-center ${darkMode ? "text-gray-300" : "text-green-700"}`}>
                AI is generating subjects for {user.classLevel}
                {user.department ? ` (${user.department})` : ""}...
              </p>
            </div>
          ) : subjects.length === 0 ? (
            <div className={`text-center py-16 rounded-2xl ${darkMode ? "bg-gray-800 text-gray-400" : "bg-white text-gray-500"}`}>
              No subjects loaded yet. Try refreshing the page.
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
                    className={`
                      group rounded-2xl cursor-pointer shadow-md hover:shadow-xl
                      hover:-translate-y-1 transition-all duration-200
                      h-48 sm:h-56 md:h-64 lg:h-72 overflow-hidden relative
                      transition-all duration-500 ease-out
                      border ${darkMode ? "border-gray-700 hover:border-gray-600" : "border-transparent"}
                      ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
                    `}
                    style={{
                      transitionDelay: mounted ? `${Math.min(i, 10) * 40}ms` : "0ms",
                      ...(cover ? {} : { background: subject.gradient || subjectStyles[i % subjectStyles.length].gradient }),
                    }}
                  >
                    {subject.compulsory && (
                      <div className="absolute top-2.5 left-2.5 z-10 bg-white/90 text-green-800 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shadow-sm">
                        Compulsory
                      </div>
                    )}

                    {cover ? (
                      <>
                        <img
                          src={cover}
                          alt={`${subject.name} textbook cover`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </>
                    ) : (
                      <div className="w-full h-full text-white flex flex-col items-center justify-center p-4">
                        {(() => {
                          // Falls back to BookOpen for any subject saved
                          // before this change, since older records may
                          // still hold an emoji string instead of a key.
                          const SubjectIcon = SUBJECT_ICONS[subject.icon] || BookOpen;
                          return <SubjectIcon size={36} strokeWidth={1.75} className="mb-3" />;
                        })()}
                        <div className="font-semibold text-center text-sm leading-tight">
                          {subject.name}
                        </div>
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