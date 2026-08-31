import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEnvelope,
  FaUserCircle,
} from "react-icons/fa";

export default function Profile() {
  const navigate = useNavigate();

  let user = {};

  try {
    const storedUser =
      localStorage.getItem("user") ||
      localStorage.getItem("authUser") ||
      localStorage.getItem("currentUser");

    if (storedUser) {
      user = JSON.parse(storedUser);
    }
  } catch (error) {
    console.error("Unable to read user:", error);
  }

  const name =
    user.fullName ||
    user.name ||
    user.username ||
    user.email?.split("@")[0] ||
    "User";

  const email =
    user.email || "Email not available";

  return (
    <div className="profile-page">
      <button
        type="button"
        className="profile-back-button"
        onClick={() => navigate("/dashboard")}
      >
        <FaArrowLeft />
        Back to Dashboard
      </button>

      <div className="profile-page-card">
        <div className="profile-page-header">
          <FaUserCircle className="profile-page-icon" />

          <h1>{name}</h1>

          <p>CodeGuard AI User</p>
        </div>

        <div className="profile-info-card">
          <span>Username</span>
          <strong>{name}</strong>
        </div>

        <div className="profile-info-card">
          <span className="profile-info-label">
            <FaEnvelope />
            Email
          </span>

          <strong>{email}</strong>
        </div>
      </div>
    </div>
  );
}