import {
  useContext,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { AnalysisContext } from "../../context/analysis-context";
import { logoutUser } from "../../services/auth";

import SidebarMenu from "./SidebarMenu";
import TopBar from "./TopBar";
import UploadCard from "./UploadCard";
import CodeEditor from "./CodeEditor";
import AnalyticsChart from "./AnalyticsChart";
import AISuggestions from "./AISuggestions";
import RecentScans from "./RecentScans";
import SecurityScore from "./cards/SecurityScore";
import IssueSummary from "./cards/IssueSummary";
import RiskLevel from "./cards/RiskLevel";
import LanguageCard from "./cards/LanguageCard";

import "./DashboardLayout.css";

export default function DashboardLayout() {
  const navigate =
    useNavigate();

  const context =
    useContext(
      AnalysisContext,
    );

  if (!context) {
    throw new Error(
      "DashboardLayout must be used inside AnalysisProvider",
    );
  }

  const {
    analysisResult,
  } = context;

  const [
    selectedSeverity,
    setSelectedSeverity,
  ] = useState(null);

  const handleLogout =
    async () => {
      try {
        await logoutUser();
      } catch (error) {
        console.error(
          "Logout request failed:",
          error,
        );
      } finally {
        navigate(
          "/login",
          {
            replace: true,
          },
        );
      }
    };

  const score =
    analysisResult
      ?.securityScore ??
    100;

  const language =
    analysisResult
      ?.language ||
    "Unknown";

  const issueCount =
    analysisResult
      ?.issueCount || {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

  const critical =
    issueCount.critical ||
    0;

  const high =
    issueCount.high ||
    0;

  const medium =
    issueCount.medium ||
    0;

  const low =
    (issueCount.low ||
      0) +
    (issueCount.info ||
      0);

  return (
    <div className="dashboard-container">
      <SidebarMenu
        onLogout={
          handleLogout
        }
      />

      <main className="dashboard-content">
        <TopBar />

        <div className="dashboard-grid">
          <div className="dashboard-column">
            <SecurityScore
              score={
                score
              }
            />

            <LanguageCard
              language={
                language
              }
            />

            <UploadCard />

            <AnalyticsChart
              selectedSeverity={
                selectedSeverity
              }
            />

            <RecentScans />
          </div>

          <div className="dashboard-column">
            <RiskLevel
              score={
                score
              }
            />

            <IssueSummary
              critical={
                critical
              }
              high={
                high
              }
              medium={
                medium
              }
              low={
                low
              }
              selectedSeverity={
                selectedSeverity
              }
              onSeveritySelect={
                setSelectedSeverity
              }
            />

            <CodeEditor />

            <AISuggestions />
          </div>
        </div>
      </main>
    </div>
  );
}