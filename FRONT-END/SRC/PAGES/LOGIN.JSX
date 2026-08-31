import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { loginUser } from "../services/auth";
import "../styles/login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await loginUser(email.trim(), password);

      if (result?.user) {
  localStorage.setItem(
    "user",
    JSON.stringify(result.user),
  );
}

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email.trim());
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      navigate("/dashboard");
    } catch (loginError) {
      setError(loginError.message || "Unable to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-grid-overlay" />

      <section className="login-showcase">
        <div className="brand-row">
          <div className="brand-icon">
            <ShieldCheck size={28} />
          </div>

          <div>
            <p className="brand-name">CodeGuard AI</p>
            <p className="brand-subtitle">
              AI-powered secure code review
            </p>
          </div>
        </div>

        <div className="showcase-content">
          <div className="showcase-badge">
            <Sparkles size={16} />
            Intelligent security analysis
          </div>

          <h1>
            Review smarter.
            <span> Ship safer.</span>
          </h1>

          <p>
            Detect vulnerabilities, improve code quality, and receive
            practical AI-powered remediation guidance in one secure
            workspace.
          </p>

          <div className="feature-list">
            <div>
              <span>01</span>
              Static vulnerability detection
            </div>

            <div>
              <span>02</span>
              Actionable AI remediation
            </div>

            <div>
              <span>03</span>
              Security reports and scan history
            </div>
          </div>
        </div>

        <p className="showcase-footer">
          Built for modern developers and security teams.
        </p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand">
            <ShieldCheck size={24} />
            <span>CodeGuard AI</span>
          </div>

          <div className="login-heading">
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in to your workspace</h2>
            <p>
              Continue reviewing code and monitoring project security.
            </p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email address</label>

              <div className="input-shell">
                <Mail size={18} />

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="password-label-row">
                <label htmlFor="password">Password</label>

                <button
                  type="button"
                  className="text-button"
                  onClick={() => setError(
                    "Password reset will be added in the next phase.",
                  )}
                >
                  Forgot password?
                </button>
              </div>

              <div className="input-shell">
                <LockKeyhole size={18} />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <label className="remember-row">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) =>
                  setRememberMe(event.target.checked)
                }
              />

              <span>Remember my email</span>
            </label>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="button-spinner" />
                  Signing in...
                </>
              ) : (
                "Sign in securely"
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>New to CodeGuard AI?</span>
          </div>

          <Link to="/register" className="register-link">
            Create an account
          </Link>

          <p className="security-note">
            Your session is protected using secure authentication and
            short-lived access tokens.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;