import {
  FaBookmark,
  FaChartLine,
  FaChartPie,
  FaCog,
  FaFolderOpen,
  FaHistory,
  FaHome,
  FaLock,
  FaRobot,
  FaShieldAlt,
  FaSignOutAlt,
  FaUserCircle,
} from "react-icons/fa";

import {
  Link,
  useLocation,
} from "react-router-dom";

import { getStoredUser } from "../../services/auth";

export default function SidebarMenu({ onLogout }) {
  const location = useLocation();

  const storedUser = getStoredUser();

  const userName =
    storedUser?.fullName ||
    storedUser?.name ||
    "CodeGuard User";

  const userRole =
    storedUser?.role === "admin"
      ? "Administrator"
      : "Cyber Security Developer";

  const menu = [
    {
      title: "Dashboard",
      icon: <FaHome />,
      path: "/dashboard",
    },

    {
      title: "Reports",
      icon: <FaChartPie />,
      path: "/reports",
    },

    {
      title: "History",
      icon: <FaHistory />,
      path: "/history",
    },

    {
      title: "Security Rules",
      icon: <FaShieldAlt />,
      path: "/rules",
    },

    {
      title: "Projects",
      icon: <FaFolderOpen />,
      path: "/projects",
    },

    {
      title: "Saved Findings",
      icon: <FaBookmark />,
      path: "/saved-findings",
    },

    {
      title: "Security Trends",
      icon: <FaChartLine />,
      path: "/security-trends",
    },

    {
      title: "Security",
      icon: <FaLock />,
      path: "/security",
    },

    {
      title: "Settings",
      icon: <FaCog />,
      path: "/settings",
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-box">
          <FaRobot />
        </div>

        <div>
          <h2>CodeGuard AI</h2>
          <p>AI Security Platform</p>
        </div>
      </div>

      <nav className="sidebar-menu">
        {menu.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(
              `${item.path}/`,
            );

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`menu-item ${
                isActive
                  ? "active"
                  : ""
              }`}
            >
              <span>
                {item.icon}
              </span>

              <p>
                {item.title}
              </p>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="profile">
          <FaUserCircle className="profile-icon" />

          <div className="profile-details">
            <h3>
              {userName}
            </h3>

            <p>
              {userRole}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-logout-button"
          onClick={onLogout}
        >
          <FaSignOutAlt />

          <span>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}