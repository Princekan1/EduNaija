import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const getFriendlyError = (message = "") => {
  const m = message.toLowerCase();
  if (m.includes("password should be at least")) return "Password should be at least 6 characters.";
  if (m.includes("network")) return "Network error. Check your connection and try again.";
  return "Something went wrong. Please try again.";
};

// Reads Supabase's ?error=... / #error=... params (sent when a recovery
// link is expired, already used, or otherwise invalid).
function parseLinkError() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const search = window.location.search.startsWith("?")
    ? window.location.search.slice(1)
    : window.location.search;

  const hashParams = new URLSearchParams(hash);
  const searchParams = new URLSearchParams(search);

  const errorCode = hashParams.get("error_code") || searchParams.get("error_code");
  const errorDescription =
    hashParams.get("error_description") || searchParams.get("error_description");

  if (!errorCode) return null;

  if (errorCode === "otp_expired") {
    return "This reset link has expired or was already used. Please request a new one.";
  }
  return errorDescription
    ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
    : "This reset link is invalid. Please request a new one.";
}

function ResetPassword() {
  const [checking, setChecking] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkError, setLinkError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  // Supabase's client auto-parses the recovery token from the URL on load.
  // We just need to detect whether that succeeded (a session exists) or
  // whether the link itself carried an error (expired / already used).
  useEffect(() => {
    const linkErr = parseLinkError();
    if (linkErr) {
      setLinkError(linkErr);
      setChecking(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setLinkError("This reset link is invalid or has expired. Please request a new one.");
      }
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setSessionReady(true);
        setLinkError("");
        setChecking(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 1800);
    } catch (err) {
      const message = getFriendlyError(err.message);
      if (message) setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-green-700 to-emerald-500 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-green-700">🇳🇬 EduNaija</h1>
          <p className="text-gray-500 mt-2 text-sm">Reset your password</p>
        </div>

        {checking ? (
          <p className="text-center text-gray-500 text-sm py-6">Checking your link…</p>
        ) : linkError ? (
          <div className="text-center space-y-5">
            <p className="text-red-500 text-sm">{linkError}</p>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-green-700 text-white py-3.5 rounded-xl font-semibold hover:bg-green-800 transition"
            >
              Back to Login
            </button>
          </div>
        ) : success ? (
          <p className="text-center text-green-700 text-sm py-6">
            Password updated! Taking you to your dashboard…
          </p>
        ) : sessionReady ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent disabled:bg-gray-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-700 transition-colors duration-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent disabled:bg-gray-100"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-700 transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 text-white py-3.5 rounded-xl font-semibold hover:bg-green-800 transition disabled:opacity-60"
            >
              {loading ? "Updating…" : "Update Password"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

export default ResetPassword;
