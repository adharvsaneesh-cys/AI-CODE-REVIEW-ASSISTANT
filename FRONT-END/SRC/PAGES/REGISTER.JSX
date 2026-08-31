import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { registerUser } from "../services/auth";
import "../styles/register.css";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the terms and privacy policy.");
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      navigate("/dashboard");
    } catch (registerError) {
      setError(
        registerError.message || "Unable to create your account",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">
      <div className="register-grid-overlay" />

      <section className="register-showcase">
        <div className="register-brand-row">
          <div className="register-brand-icon">
            <ShieldCheck size={28} />
          </div>

          <div>
            <p className="register-brand-name">CodeGuard AI</p>
            <p className="register-brand-subtitle">
              Secure development starts here
            </p>
          </div>
        </div>

        <div className="register-showcase-content">
          <div className="register-showcase-badge">
            <Sparkles size={16} />
            Build secure software with confidence
          </div>

          <h1>
            Create better code.
            <span> Prevent vulnerabilities.</span>
          </h1>

          <p>
            Join a secure workspace designed to identify risks,
            explain weaknesses, and guide developers toward stronger
            code.
          </p>

          <div className="register-feature-list">
            <div>
              <span>01</span>
              AI-assisted vulnerability reviews
            </div>

            <div>
              <span>02</span>
              Secure project and scan history
            </div>

            <div>
              <span>03</span>
              Actionable remediation suggestions
            </div>
          </div>
        </div>

        <p className="register-showcase-footer">
          Secure by design. Built for developers.
        </p>
      </section>

      <section className="register-panel">
        <div className="register-card">
          <div className="register-mobile-brand">
            <ShieldCheck size={24} />
            <span>CodeGuard AI</span>
          </div>

          <div className="register-heading">
            <p className="register-eyebrow">
              Create your workspace
            </p>

            <h2>Start reviewing code securely</h2>

            <p>
              Set up your account and begin scanning projects in
              minutes.
            </p>
          </div>

          <form
            onSubmit={handleRegister}
            className="register-form"
          >
            <div className="register-form-group">
              <label htmlFor="fullName">Full name</label>

              <div className="register-input-shell">
                <UserRound size={18} />

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  minLength={2}
                  required
                />
              </div>
            </div>

            <div className="register-form-group">
              <label htmlFor="registerEmail">Email address</label>

              <div className="register-input-shell">
                <Mail size={18} />

                <input
                  id="registerEmail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="register-form-group">
              <label htmlFor="registerPassword">Password</label>

              <div className="register-input-shell">
                <LockKeyhole size={18} />

                <input
                  id="registerPassword"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  className="register-password-toggle"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              <p className="password-guidance">
                Use uppercase, lowercase, a number, and a special
                character.
              </p>
            </div>

            <div className="register-form-group">
              <label htmlFor="confirmPassword">
                Confirm password
              </label>

              <div className="register-input-shell">
                <LockKeyhole size={18} />

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={
                    showConfirmPassword ? "text" : "password"
                  }
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  className="register-password-toggle"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmed password"
                      : "Show confirmed password"
                  }
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) => !current,
                    )
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <label className="register-terms-row">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) =>
                  setAcceptedTerms(event.target.checked)
                }
              />

              <span>
                I agree to the terms of service and privacy policy.
              </span>
            </label>

            {error && (
              <div className="register-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="register-button-spinner" />
                  Creating account...
                </>
              ) : (
                "Create secure account"
              )}
            </button>
          </form>

          <div className="register-divider">
            <span>Already have an account?</span>
          </div>

          <Link to="/login" className="register-login-link">
            Sign in instead
          </Link>

          <p className="register-security-note">
            Your password is protected using secure hashing and is
            never stored in plain text.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Register;