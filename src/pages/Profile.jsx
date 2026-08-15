import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Sidebar from "../components/Layout/Sidebar";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function Profile() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const classOptions = [
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
    "JSS 1", "JSS 2", "JSS 3",
    "SS 1", "SS 2", "SS 3"
  ];

  const isSeniorSecondary = classLevel.startsWith("SS");

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (profile) {
          setUser({ ...profile, email: session.user.email, uid: session.user.id });
          setName(profile.name || "");
          setClassLevel(profile.classLevel || "");
          setDepartment(profile.department || "");
        } else {
          setUser({
            name: session.user.user_metadata?.full_name || "Student",
            email: session.user.email,
            xp: 0,
            uid: session.user.id
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !classLevel) return;
    if (isSeniorSecondary && !department) {
      setMessage("Please select a department for Senior Secondary");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          classLevel,
          department: isSeniorSecondary ? department : null
        })
        .eq("id", user.uid);

      if (updateError) throw updateError;

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { full_name: name.trim() }
      });
      if (authUpdateError) throw authUpdateError;

      setUser({ ...user, name: name.trim(), classLevel, department });
      setMessage("Profile updated successfully!");
    } catch (error) {
      setMessage("Failed to update profile. Please try again.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 flex items-center justify-center">
          <p className={darkMode ? "text-gray-300" : "text-gray-600"}>Loading profile...</p>
        </main>
      </div>
    );
  }

  const inputClasses = `w-full px-4 py-3 rounded-xl border text-[15px] focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${
    darkMode
      ? "bg-gray-900 border-gray-700 text-white placeholder-gray-500"
      : "bg-white border-gray-300 text-gray-900"
  }`;

  const labelClasses = `block font-semibold mb-2 text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`;

  return (
    <div className={`flex min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 md:ml-64 pt-20 md:pt-8 px-5 md:px-8 pb-8">
        <h1 className={`text-2xl md:text-3xl font-bold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
          👤 My Profile
        </h1>
        <p className={`mb-6 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          Manage your account information
        </p>

        <div className={`rounded-2xl shadow-sm p-6 md:p-8 max-w-lg ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          <div className={`flex justify-between py-3 text-[15px] border-b ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
            <span className={`font-semibold text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Email</span>
            <span className={darkMode ? "text-gray-200" : "text-gray-900"}>{user?.email}</span>
          </div>

          <div className={`flex justify-between py-3 text-[15px] border-b ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
            <span className={`font-semibold text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>XP</span>
            <span className={`font-bold ${darkMode ? "text-green-400" : "text-green-700"}`}>{user?.xp || 0} XP</span>
          </div>

          <form onSubmit={handleSave} className="mt-6">
            <label className={labelClasses}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClasses}
              required
            />

            <label className={`${labelClasses} mt-4`}>Class Level</label>
            <select
              value={classLevel}
              onChange={(e) => {
                setClassLevel(e.target.value);
                if (!e.target.value.startsWith("SS")) {
                  setDepartment("");
                }
              }}
              className={inputClasses}
              required
            >
              <option value="">Select your class</option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>

            {/* Department only shows for SS1 - SS3 */}
            {isSeniorSecondary && (
              <>
                <label className={`${labelClasses} mt-4`}>Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className={inputClasses}
                  required
                >
                  <option value="">Select Department</option>
                  <option value="Science">Science</option>
                  <option value="Art">Art</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </>
            )}

            {message && (
              <p className={`mt-3 text-sm ${
                message.includes("success")
                  ? darkMode ? "text-green-400" : "text-green-700"
                  : darkMode ? "text-red-400" : "text-red-500"
              }`}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-5 px-6 py-3.5 rounded-xl font-semibold text-[15px] bg-green-700 text-white hover:bg-green-800 transition disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Profile;
