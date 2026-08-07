import { useState, useEffect } from "react";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import Sidebar from "../components/Layout/Sidebar";
import { useNavigate } from "react-router-dom";

function Profile() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const classOptions = [
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
    "JSS 1", "JSS 2", "JSS 3",
    "SS 1", "SS 2", "SS 3"
  ];

  const isSeniorSecondary = classLevel.startsWith("SS");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUser({ ...data, email: currentUser.email, uid: currentUser.uid });
          setName(data.name || "");
          setClassLevel(data.classLevel || "");
          setDepartment(data.department || "");
        } else {
          setUser({
            name: currentUser.displayName || "Student",
            email: currentUser.email,
            xp: 0,
            uid: currentUser.uid
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
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
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: name.trim(),
        classLevel,
        department: isSeniorSecondary ? department : null
      });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name.trim() });
      }

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
    return <div style={{ textAlign: "center", marginTop: "100px" }}>Loading profile...</div>;
  }

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <h1 style={styles.title}>👤 My Profile</h1>
        <p style={styles.subtitle}>Manage your account information</p>

        <div style={styles.card}>
          <div style={styles.infoRow}>
            <span style={styles.label}>Email</span>
            <span>{user?.email}</span>
          </div>

          <div style={styles.infoRow}>
            <span style={styles.label}>XP</span>
            <span style={{ color: "#008751", fontWeight: "bold" }}>{user?.xp || 0} XP</span>
          </div>

          <form onSubmit={handleSave} style={{ marginTop: "25px" }}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              required
            />

            <label style={{ ...styles.label, marginTop: "18px" }}>Class Level</label>
            <select
              value={classLevel}
              onChange={(e) => {
                setClassLevel(e.target.value);
                if (!e.target.value.startsWith("SS")) {
                  setDepartment("");
                }
              }}
              style={styles.input}
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
                <label style={{ ...styles.label, marginTop: "18px" }}>Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={styles.input}
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
              <p style={{
                color: message.includes("success") ? "#008751" : "#e74c3c",
                marginTop: "10px",
                fontSize: "14px"
              }}>
                {message}
              </p>
            )}

            <button
              type="submit"
              style={styles.saveBtn}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
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
  },
  title: {
    margin: "0 0 6px",
    fontSize: "26px",
  },
  subtitle: {
    color: "#777",
    marginBottom: "25px",
  },
  card: {
    background: "white",
    padding: "30px",
    borderRadius: "14px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
    maxWidth: "500px",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid #f0f0f0",
    fontSize: "15px",
  },
  label: {
    display: "block",
    fontWeight: "600",
    marginBottom: "8px",
    color: "#555",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "15px",
    boxSizing: "border-box",
  },
  saveBtn: {
    marginTop: "20px",
    padding: "13px 24px",
    background: "#008751",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

export default Profile;