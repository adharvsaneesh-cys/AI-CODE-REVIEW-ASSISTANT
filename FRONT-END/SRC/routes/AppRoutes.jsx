import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import Profile from "../pages/Profile";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Review from "../pages/Review";
import History from "../pages/History";
import Report from "../pages/Report";
import Setting from "../pages/Setting";
import SecurityRules from "../pages/SecurityRules";
import Projects from "../pages/Projects";
import SavedFindings from "../pages/SavedFindings";
import SecurityTrends from "../pages/SecurityTrends";
import Security from "../pages/Security";
import NotFound from "../pages/NotFound";

import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          element={<ProtectedRoute />}
        >
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/review"
            element={<Review />}
          />

          <Route
            path="/history"
            element={<History />}
          />

          <Route
            path="/reports"
            element={<Report />}
          />

          <Route
            path="/rules"
            element={<SecurityRules />}
          />

          <Route
            path="/projects"
            element={<Projects />}
          />

          <Route
            path="/saved-findings"
            element={<SavedFindings />}
          />

          <Route
            path="/security-trends"
            element={<SecurityTrends />}
          />

          <Route
            path="/security"
            element={<Security />}
          />

          <Route
            path="/settings"
            element={<Setting />}
          />

          <Route
            path="/profile"
            element={<Profile />}
          />
        </Route>

        <Route
          path="*"
          element={<NotFound />}
        />
      </Routes>
    </BrowserRouter>
  );
}