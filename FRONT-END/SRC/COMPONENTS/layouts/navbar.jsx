import { Link } from "react-router-dom";

export default function Navbar({ onLogin }) {
  return (
    <nav className="navbar">
      <div className="logo">
        <div className="logo-icon">
          AI
        </div>

        <div className="logo-text">
          <h2>CodeGuard AI</h2>
          <p>AI Code Review Assistant</p>
        </div>
      </div>

      <ul className="nav-links">
        <li>
          <button
            type="button"
            onClick={onLogin}
            className="nav-home-btn"
          >
            Home
          </button>
        </li>

        <li>
          <Link to="/history">
            History
          </Link>
        </li>

        <li>
          <Link to="/reports">
            Reports
          </Link>
        </li>

        <li>
          <Link to="/settings">
            Settings
          </Link>
        </li>
      </ul>

      <div className="nav-buttons">
        <button
          className="login-btn"
          onClick={onLogin}
        >
          Sign In
        </button>

        <button
          className="start-btn"
          onClick={onLogin}
        >
          Start Review
        </button>
      </div>
    </nav>
  );
}