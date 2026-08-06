import { useState } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/dashboard");
      } else {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          name: fullName,
          email: email,
          xp: 0,
          createdAt: new Date()
        });

        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          name: user.displayName || "Student",
          email: user.email,
          xp: 0,
          createdAt: new Date()
        });
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🇳🇬 EduNaija</h1>
        <p style={styles.subtitle}>
          {isLogin ? "Log in to continue your learning journey" : "Create your account"}
        </p>

        <button style={styles.googleBtn} onClick={handleGoogleSignIn} disabled={loading}>
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            width="18" 
            style={{ marginRight: 8 }}
          />
          Continue with Google
        </button>

        <div style={styles.divider}>
          <div style={styles.line}></div>
          <span style={{ padding: "0 10px", color: "#999", fontSize: "13px" }}>OR</span>
          <div style={styles.line}></div>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={styles.input}
            />
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />

          {/* Password Field with Show/Hide */}
          <div style={styles.passwordContainer}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
            <span 
              style={styles.eyeIcon}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          {/* Confirm Password Field (only on signup) */}
          {!isLogin && (
            <div style={styles.passwordContainer}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={styles.input}
              />
              <span 
                style={styles.eyeIcon}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </span>
            </div>
          )}

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        <p style={styles.switchText}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <span 
            style={styles.switchLink} 
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
          >
            {isLogin ? "Create Account" : "Login"}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #008751, #2ecc71)",
    padding: "20px"
  },
  card: {
    background: "white",
    padding: "40px 30px",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
  },
  title: {
    color: "#008751",
    textAlign: "center",
    marginBottom: "8px",
    fontSize: "28px"
  },
  subtitle: {
    textAlign: "center",
    color: "#777",
    marginBottom: "25px",
    fontSize: "14px"
  },
  googleBtn: {
    width: "100%",
    padding: "12px",
    background: "white",
    border: "1px solid #dadce0",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontWeight: "500",
    marginBottom: "10px"
  },
  divider: {
    display: "flex",
    alignItems: "center",
    margin: "20px 0",
  },
  line: {
    flex: 1,
    height: "1px",
    background: "#eee"
  },
  input: {
    width: "100%",
    padding: "13px 14px",
    marginBottom: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "15px",
    boxSizing: "border-box"
  },
  passwordContainer: {
    position: "relative"
  },
  eyeIcon: {
    position: "absolute",
    right: "14px",
    top: "13px",
    cursor: "pointer",
    fontSize: "18px",
    userSelect: "none"
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    background: "#008751",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "8px"
  },
  error: {
    color: "#e74c3c",
    fontSize: "13px",
    marginBottom: "10px",
    textAlign: "center"
  },
  switchText: {
    textAlign: "center",
    marginTop: "20px",
    fontSize: "14px",
    color: "#555"
  },
  switchLink: {
    color: "#008751",
    fontWeight: "bold",
    cursor: "pointer"
  }
};

export default Auth;