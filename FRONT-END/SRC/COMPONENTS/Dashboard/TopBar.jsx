import {
  FaBell,
  FaMoon,
  FaSearch,
  FaPlus,
  FaUserCircle,
  FaTrash,
} from "react-icons/fa";

import {
  useContext,
  useEffect,
  useState,
} from "react";

import {
  AnalysisContext,
} from "../../context/analysis-context";

import {
  useNavigate,
} from "react-router-dom";

import {
  clearNotifications,
  getNotifications,
  markNotificationsRead,
  NOTIFICATION_EVENT,
} from "../../services/notifications";

import {
  getSettings,
  saveSettings,
} from "../../services/settings";

export default function TopBar() {
  const {
    analysisResult,
  } = useContext(
    AnalysisContext,
  );

  const navigate =
    useNavigate();

  const [
    showNotifications,
    setShowNotifications,
  ] = useState(false);

  const [
    notifications,
    setNotifications,
  ] = useState(
    getNotifications,
  );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  useEffect(() => {
    const refresh =
      () =>
        setNotifications(
          getNotifications(),
        );

    window.addEventListener(
      NOTIFICATION_EVENT,
      refresh,
    );

    window.addEventListener(
      "storage",
      refresh,
    );

    return () => {
      window.removeEventListener(
        NOTIFICATION_EVENT,
        refresh,
      );

      window.removeEventListener(
        "storage",
        refresh,
      );
    };
  }, []);

  const unreadCount =
    notifications.filter(
      (item) =>
        !item.read,
    ).length;

  function toggleTheme() {
    const settings =
      getSettings();

    const nextTheme =
      document.documentElement.getAttribute(
        "data-theme",
      ) === "light"
        ? "dark"
        : "light";

    saveSettings({
      ...settings,
      theme: nextTheme,
    });
  }

  function toggleNotifications() {
    const next =
      !showNotifications;

    setShowNotifications(
      next,
    );

    if (next) {
      markNotificationsRead();

      setNotifications(
        getNotifications(),
      );
    }
  }

  const [userName] =
    useState(() => {
      try {
        const storedUser =
          localStorage.getItem(
            "user",
          ) ||
          localStorage.getItem(
            "authUser",
          ) ||
          localStorage.getItem(
            "currentUser",
          );

        if (!storedUser) {
          return "User";
        }

        const user =
          JSON.parse(
            storedUser,
          );

        return (
          user.name ||
          user.fullName ||
          user.username ||
          user.email?.split(
            "@",
          )[0] ||
          "User"
        );
      } catch {
        return "User";
      }
    });

  const today =
    new Date().toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );

  function searchVulnerability(
    event,
  ) {
    if (
      event.key !==
      "Enter"
    ) {
      return;
    }

    const query =
      searchTerm
        .trim()
        .toLowerCase();

    if (!query) return;

    const issues =
      Array.isArray(
        analysisResult?.issues,
      )
        ? analysisResult.issues
        : [];

    const match =
      issues.find(
        (issue) =>
          [
            issue.title,
            issue.description,
            issue.ruleId,
            issue.severity,
            issue.cwe,
            issue.owasp?.id,
            issue.owasp?.category,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(
                  query,
                ),
            ),
      );

    if (!match) {
      window.alert(
        "No matching vulnerability found.",
      );
      return;
    }

    document
      .querySelector(
        ".analytics-card",
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <div className="search-box">
            <FaSearch />

            <input
              type="text"
              placeholder="Search vulnerabilities..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value,
                )
              }
              onKeyDown={
                searchVulnerability
              }
            />
          </div>
        </div>

        <div className="topbar-right">
          <div
            style={{
              position: "relative",
            }}
          >
            <button
              className="icon-btn"
              type="button"
              onClick={
                toggleNotifications
              }
              aria-label="Notifications"
            >
              <FaBell />

              {unreadCount > 0 && (
                <span
                  style={{
                    position:
                      "absolute",
                    top: "-5px",
                    right: "-5px",
                    minWidth:
                      "18px",
                    height:
                      "18px",
                    padding:
                      "0 4px",
                    display:
                      "grid",
                    placeItems:
                      "center",
                    borderRadius:
                      "999px",
                    background:
                      "#ef4444",
                    color:
                      "#fff",
                    fontSize:
                      "10px",
                    fontWeight:
                      "800",
                  }}
                >
                  {unreadCount >
                  9
                    ? "9+"
                    : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                className="notification-popup"
                style={{
                  position:
                    "absolute",
                  right: 0,
                  top: "48px",
                  zIndex:
                    1000,
                  width:
                    "340px",
                  maxHeight:
                    "420px",
                  overflowY:
                    "auto",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap:
                      "12px",
                    marginBottom:
                      "10px",
                  }}
                >
                  <strong>
                    Notifications
                  </strong>

                  {notifications.length >
                    0 && (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => {
                        clearNotifications();

                        setNotifications(
                          [],
                        );
                      }}
                      title="Clear notifications"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>

                {notifications.length ===
                0 ? (
                  <p>
                    No security alerts.
                  </p>
                ) : (
                  notifications.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        style={{
                          padding:
                            "10px 0",
                          borderBottom:
                            "1px solid rgba(148,163,184,.12)",
                        }}
                      >
                        <strong
                          style={{
                            display:
                              "block",
                            fontSize:
                              "12px",
                          }}
                        >
                          {item.title}
                        </strong>

                        <p
                          style={{
                            margin:
                              "4px 0",
                            fontSize:
                              "11px",
                          }}
                        >
                          {item.message}
                        </p>

                        <small>
                          {new Date(
                            item.createdAt,
                          ).toLocaleString()}
                        </small>
                      </div>
                    ),
                  )
                )}
              </div>
            )}
          </div>

          <button
            className="icon-btn"
            type="button"
            onClick={
              toggleTheme
            }
            aria-label="Toggle theme"
          >
            <FaMoon />
          </button>

          <div
            className="profile-small"
            onClick={() =>
              navigate(
                "/profile",
              )
            }
          >
            <FaUserCircle />
            <span>
              {userName}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-header">
        <div>
          <h1>
            Welcome back 👋
          </h1>
          <p>{today}</p>
        </div>

        <button
          className="scan-btn"
          type="button"
          onClick={() => {
            document
              .querySelector(
                ".upload-card",
              )
              ?.scrollIntoView({
                behavior:
                  "smooth",
                block:
                  "start",
              });
          }}
        >
          <FaPlus />
          New Scan
        </button>
      </div>
    </>
  );
}
