import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: "/dashboard", label: "🏠 Dashboard", id: "dashboard" },
    { path: "/library", label: "📖 E-Library", id: "library" },
    { path: "/ai-tutor", label: "🤖 AI Tutor", id: "ai-tutor" },
    { path: "/leaderboard", label: "🏆 Leaderboard", id: "leaderboard" },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>EduNaija</div>

      <nav style={styles.nav}>
        {menuItems.map((item) => (
          <div
            key={item.id}
            style={{
              ...styles.navItem,
              ...(location.pathname === item.path ? styles.activeNavItem : {})
            }}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </div>
        ))}
      </nav>

      <div style={styles.logout} onClick={handleLogout}>
        🚪 Logout
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "260px",
    height: "100vh",
    background: "white",
    borderRight: "1px solid #eee",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    left: 0,
    top: 0,
  },
  logo: {
    padding: "25px 20px",
    fontWeight: "bold",
    color: "#008751",
    fontSize: "1.5rem",
  },
  nav: {
    flex: 1,
    paddingTop: "10px",
  },
  navItem: {
    padding: "15px 20px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "15px",
    color: "#333",
    transition: "0.2s",
  },
  activeNavItem: {
    background: "#e8f5e9",
    color: "#008751",
    borderRight: "4px solid #008751",
    fontWeight: "600",
  },
  logout: {
    padding: "18px 20px",
    cursor: "pointer",
    color: "#e74c3c",
    borderTop: "1px solid #eee",
    fontWeight: "500",
  },
};

export default Sidebar;