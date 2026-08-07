import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useTheme } from "../../context/ThemeContext";

import {
  LayoutDashboard,
  LibraryBig,
  Bot,
  Trophy,
  CircleUserRound,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
} from "lucide-react";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);

      if (window.innerWidth > 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const menuItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      path: "/library",
      label: "E-Library",
      icon: LibraryBig,
    },
    {
      path: "/ai-tutor",
      label: "AI Tutor",
      icon: Bot,
    },
    {
      path: "/leaderboard",
      label: "Leaderboard",
      icon: Trophy,
    },
    {
      path: "/profile",
      label: "Profile",
      icon: CircleUserRound,
    },
  ];

  const handleNav = (path) => {
    navigate(path);

    if (isMobile) {
      setIsOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-[1100] w-11 h-11 rounded-xl bg-green-700 text-white shadow-lg flex items-center justify-center"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      )}

      {/* Overlay */}
      {isMobile && isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-[999]"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 z-[1000]
          flex flex-col
          transition-all duration-300
          border-r
          ${
            darkMode
              ? "bg-gray-900 text-gray-100 border-gray-700"
              : "bg-white text-gray-800 border-gray-200"
          }
          ${
            isMobile
              ? isOpen
                ? "translate-x-0 shadow-2xl"
                : "-translate-x-full"
              : "translate-x-0"
          }
        `}
      >
        {/* Logo */}
        <div className="px-6 py-6">
          <h1 className="text-2xl font-bold text-green-700">
            EduNaija
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`
                  w-full
                  flex
                  items-center
                  gap-3
                  px-4
                  py-3
                  mb-2
                  rounded-2xl
                  text-left
                  transition-all
                  duration-300
                  hover:translate-x-1
                  hover:shadow-md

                  ${
                    isActive
                      ? "bg-gradient-to-r from-green-50 to-emerald-100 text-green-800 font-semibold shadow-sm"
                      : darkMode
                      ? "hover:bg-gray-800 text-gray-300"
                      : "hover:bg-gray-100 text-gray-700"
                  }
                `}
              >
                <div
                  className={`
                    w-10
                    h-10
                    rounded-xl
                    flex
                    items-center
                    justify-center

                    ${
                      isActive
                        ? "bg-green-700 text-white"
                        : darkMode
                        ? "bg-gray-800 text-gray-300"
                        : "bg-gray-100 text-gray-600"
                    }
                  `}
                >
                  <Icon size={20} strokeWidth={2.2} />
                </div>

                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div
          className={`border-t px-3 py-4 ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          {/* Theme */}
          <button
            onClick={toggleTheme}
            className={`
              w-full
              flex
              items-center
              gap-3
              px-4
              py-3
              rounded-2xl
              transition-all
              duration-300
              hover:translate-x-1
              hover:shadow-md
              ${
                darkMode
                  ? "hover:bg-gray-800 text-gray-300"
                  : "hover:bg-gray-100 text-gray-700"
              }
            `}
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </div>

            <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-2xl text-red-600 hover:bg-red-50 transition-all duration-300 hover:translate-x-1 hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <LogOut size={20} />
            </div>

            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;