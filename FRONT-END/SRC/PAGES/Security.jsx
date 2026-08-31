import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaKey,
  FaLock,
  FaShieldAlt,
  FaSignOutAlt,
  FaUserShield,
} from "react-icons/fa";

import {
  useNavigate,
} from "react-router-dom";

import {
  changePassword,
  getSecurityStatus,
  logoutAllSessions,
} from "../services/security";

import "../styles/Security.css";

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Not available";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function calculatePasswordStrength(
  password,
) {
  let score = 0;

  if (
    password.length >=
    8
  ) {
    score += 1;
  }

  if (
    password.length >=
    12
  ) {
    score += 1;
  }

  if (
    /[A-Z]/.test(
      password,
    )
  ) {
    score += 1;
  }

  if (
    /[a-z]/.test(
      password,
    )
  ) {
    score += 1;
  }

  if (
    /\d/.test(
      password,
    )
  ) {
    score += 1;
  }

  if (
    /[^A-Za-z0-9]/.test(
      password,
    )
  ) {
    score += 1;
  }

  if (score <= 2) {
    return {
      label: "Weak",
      className: "weak",
      percentage: 30,
    };
  }

  if (score <= 4) {
    return {
      label: "Medium",
      className: "medium",
      percentage: 65,
    };
  }

  return {
    label: "Strong",
    className: "strong",
    percentage: 100,
  };
}

export default function Security() {
  const navigate =
    useNavigate();

  const [
    security,
    setSecurity,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    revoking,
    setRevoking,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    showPasswordForm,
    setShowPasswordForm,
  ] = useState(false);

  const [
    passwordForm,
    setPasswordForm,
  ] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    loadSecurityStatus();
  }, []);

  async function loadSecurityStatus() {
    try {
      setLoading(true);
      setError("");

      const result =
        await getSecurityStatus();

      setSecurity(
        result.security ||
          null,
      );
    } catch (loadError) {
      console.error(
        "SECURITY STATUS ERROR:",
        loadError,
      );

      setError(
        loadError.message ||
          "Unable to load account security.",
      );
    } finally {
      setLoading(false);
    }
  }

  const passwordStrength =
    useMemo(
      () =>
        calculatePasswordStrength(
          passwordForm
            .newPassword,
        ),
      [
        passwordForm
          .newPassword,
      ],
    );

  function updatePasswordField(
    key,
    value,
  ) {
    setPasswordForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  }

  async function handlePasswordChange(
    event,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (
      !passwordForm
        .currentPassword
    ) {
      setError(
        "Enter your current password.",
      );

      return;
    }

    if (
      passwordForm
        .newPassword.length <
      8
    ) {
      setError(
        "New password must contain at least 8 characters.",
      );

      return;
    }

    if (
      passwordForm
        .newPassword !==
      passwordForm
        .confirmPassword
    ) {
      setError(
        "New passwords do not match.",
      );

      return;
    }

    try {
      setSubmitting(true);

      const result =
        await changePassword({
          currentPassword:
            passwordForm
              .currentPassword,

          newPassword:
            passwordForm
              .newPassword,
        });

      setMessage(
        result.message ||
          "Password changed successfully.",
      );

      localStorage.removeItem(
        "accessToken",
      );

      localStorage.removeItem(
        "user",
      );

      localStorage.removeItem(
        "selectedProjectId",
      );

      setTimeout(() => {
        navigate(
          "/login",
          {
            replace: true,
          },
        );
      }, 1200);
    } catch (passwordError) {
      setError(
        passwordError.message ||
          "Unable to change password.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogoutAll() {
    const confirmed =
      window.confirm(
        "Log out all active sessions?\n\nYou will need to sign in again.",
      );

    if (!confirmed) {
      return;
    }

    try {
      setRevoking(true);
      setError("");

      const result =
        await logoutAllSessions();

      setMessage(
        result.message ||
          "All sessions revoked.",
      );

      localStorage.removeItem(
        "accessToken",
      );

      localStorage.removeItem(
        "user",
      );

      localStorage.removeItem(
        "selectedProjectId",
      );

      setTimeout(() => {
        navigate(
          "/login",
          {
            replace: true,
          },
        );
      }, 1000);
    } catch (logoutError) {
      setError(
        logoutError.message ||
          "Unable to revoke sessions.",
      );
    } finally {
      setRevoking(false);
    }
  }

  if (loading) {
    return (
      <div className="security-page">
        <div className="security-loading">
          <div className="security-loader" />

          <h2>
            Loading Security Center
          </h2>

          <p>
            Checking account
            protection...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="security-page">
      <div className="security-page-header">
        <div>
          <span className="security-eyebrow">
            ACCOUNT PROTECTION
          </span>

          <h1>
            Security Center
          </h1>

          <p>
            Manage your account
            password, authentication
            sessions and CodeGuard
            security controls.
          </p>
        </div>

        <div className="security-health">
          <FaShieldAlt />

          <div>
            <strong>
              Protected
            </strong>

            <span>
              Security status
            </span>
          </div>
        </div>
      </div>

      {message && (
        <div className="security-message success">
          <FaCheckCircle />
          {message}
        </div>
      )}

      {error && (
        <div className="security-message error">
          <FaExclamationTriangle />
          {error}
        </div>
      )}

      <div className="security-overview-grid">
        <div className="security-stat-card">
          <FaUserShield />

          <div>
            <span>
              Account
            </span>

            <strong>
              {security
                ?.accountActive
                ? "Active"
                : "Disabled"}
            </strong>
          </div>
        </div>

        <div className="security-stat-card">
          <FaLock />

          <div>
            <span>
              Password
            </span>

            <strong>
              Bcrypt Protected
            </strong>
          </div>
        </div>

        <div className="security-stat-card">
          <FaClock />

          <div>
            <span>
              Access Token
            </span>

            <strong>
              {security
                ?.accessTokenLifetime ||
                "15m"}
            </strong>
          </div>
        </div>

        <div className="security-stat-card">
          <FaKey />

          <div>
            <span>
              Session
            </span>

            <strong>
              {security
                ?.activeSession
                ? "Active"
                : "Inactive"}
            </strong>
          </div>
        </div>
      </div>

      <div className="security-layout">
        <div className="security-main-column">
          <section className="security-card">
            <div className="security-card-heading">
              <div className="security-heading-icon">
                <FaKey />
              </div>

              <div>
                <h2>
                  Password Security
                </h2>

                <p>
                  Periodically update
                  your password to
                  protect your account.
                </p>
              </div>

              <button
                type="button"
                className="security-secondary-button"
                onClick={() =>
                  setShowPasswordForm(
                    (current) =>
                      !current,
                  )
                }
              >
                {showPasswordForm
                  ? "Cancel"
                  : "Change Password"}
              </button>
            </div>

            {showPasswordForm && (
              <form
                className="change-password-form"
                onSubmit={
                  handlePasswordChange
                }
              >
                <div className="security-form-field">
                  <label>
                    Current Password
                  </label>

                  <input
                    type="password"
                    autoComplete="current-password"
                    value={
                      passwordForm
                        .currentPassword
                    }
                    onChange={(event) =>
                      updatePasswordField(
                        "currentPassword",
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      submitting
                    }
                  />
                </div>

                <div className="security-password-grid">
                  <div className="security-form-field">
                    <label>
                      New Password
                    </label>

                    <input
                      type="password"
                      autoComplete="new-password"
                      value={
                        passwordForm
                          .newPassword
                      }
                      onChange={(event) =>
                        updatePasswordField(
                          "newPassword",
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        submitting
                      }
                    />
                  </div>

                  <div className="security-form-field">
                    <label>
                      Confirm Password
                    </label>

                    <input
                      type="password"
                      autoComplete="new-password"
                      value={
                        passwordForm
                          .confirmPassword
                      }
                      onChange={(event) =>
                        updatePasswordField(
                          "confirmPassword",
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        submitting
                      }
                    />
                  </div>
                </div>

                {passwordForm
                  .newPassword && (
                  <div className="password-strength">
                    <div className="password-strength-top">
                      <span>
                        Password strength
                      </span>

                      <strong
                        className={
                          passwordStrength
                            .className
                        }
                      >
                        {
                          passwordStrength
                            .label
                        }
                      </strong>
                    </div>

                    <div className="password-strength-track">
                      <div
                        className={
                          passwordStrength
                            .className
                        }
                        style={{
                          width:
                            `${passwordStrength.percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="password-guidelines">
                  <strong>
                    Recommended
                  </strong>

                  <span>
                    At least 12
                    characters
                  </span>

                  <span>
                    Uppercase and
                    lowercase letters
                  </span>

                  <span>
                    Numbers
                  </span>

                  <span>
                    Special characters
                  </span>
                </div>

                <button
                  type="submit"
                  className="change-password-button"
                  disabled={
                    submitting
                  }
                >
                  <FaLock />

                  {submitting
                    ? "Updating..."
                    : "Update Password"}
                </button>
              </form>
            )}
          </section>

          <section className="security-card">
            <div className="security-card-heading">
              <div className="security-heading-icon danger">
                <FaSignOutAlt />
              </div>

              <div>
                <h2>
                  Active Sessions
                </h2>

                <p>
                  Revoke your refresh
                  session if you
                  suspect unauthorized
                  account access.
                </p>
              </div>
            </div>

            <div className="session-card">
              <div>
                <span className="session-status-dot" />

                <div>
                  <strong>
                    Current CodeGuard
                    Session
                  </strong>

                  <p>
                    Refresh token:
                    HTTP-only secure
                    cookie
                  </p>
                </div>
              </div>

              <span className="session-active-label">
                Active
              </span>
            </div>

            <button
              type="button"
              className="logout-all-button"
              onClick={
                handleLogoutAll
              }
              disabled={
                revoking
              }
            >
              <FaSignOutAlt />

              {revoking
                ? "Revoking..."
                : "Logout All Sessions"}
            </button>
          </section>
        </div>

        <div className="security-side-column">
          <section className="security-card security-account-card">
            <span className="security-section-label">
              ACCOUNT DETAILS
            </span>

            <h2>
              Security Information
            </h2>

            <div className="security-detail-list">
              <div>
                <span>
                  Email
                </span>

                <strong>
                  {security
                    ?.email ||
                    "Unknown"}
                </strong>
              </div>

              <div>
                <span>
                  Role
                </span>

                <strong>
                  {security
                    ?.role ||
                    "user"}
                </strong>
              </div>

              <div>
                <span>
                  Password hashing
                </span>

                <strong>
                  bcrypt
                </strong>
              </div>

              <div>
                <span>
                  Refresh token
                </span>

                <strong>
                  Hashed SHA-256
                </strong>
              </div>

              <div>
                <span>
                  Last login
                </span>

                <strong>
                  {formatDate(
                    security
                      ?.lastLoginAt,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Account created
                </span>

                <strong>
                  {formatDate(
                    security
                      ?.accountCreatedAt,
                  )}
                </strong>
              </div>
            </div>
          </section>

          <section className="security-card">
            <span className="security-section-label">
              RECOMMENDATIONS
            </span>

            <h2>
              Security Checklist
            </h2>

            <div className="security-checklist">
              <div>
                <FaCheckCircle />
                Strong bcrypt password
                hashing
              </div>

              <div>
                <FaCheckCircle />
                HTTP-only refresh
                cookies
              </div>

              <div>
                <FaCheckCircle />
                Short-lived JWT access
                tokens
              </div>

              <div>
                <FaCheckCircle />
                Refresh tokens stored
                as hashes
              </div>

              <div>
                <FaCheckCircle />
                Authentication required
                for protected routes
              </div>

              <div>
                <FaCheckCircle />
                Session revocation
                available
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}