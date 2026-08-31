import {
  useEffect,
  useState,
} from "react";

import {
  FaBell,
  FaBrain,
  FaCheckCircle,
  FaFilePdf,
  FaPalette,
  FaRedoAlt,
  FaSave,
  FaShieldAlt,
  FaSlidersH,
} from "react-icons/fa";

import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
} from "../services/settings";

import "../styles/Setting.css";

function Toggle({
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={`setting-toggle ${
        checked ? "active" : ""
      }`}
      onClick={() =>
        !disabled && onChange(!checked)
      }
      disabled={disabled}
      aria-pressed={checked}
    >
      <span />
    </button>
  );
}

export default function Setting() {
  const [settings, setSettings] =
    useState(getSettings);

  const [savedSettings, setSavedSettings] =
    useState(getSettings);

  const [message, setMessage] =
    useState("");

  const hasChanges =
    JSON.stringify(settings) !==
    JSON.stringify(savedSettings);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      settings.theme,
    );

    document.documentElement.setAttribute(
      "data-compact",
      settings.compactMode ? "true" : "false",
    );
  }, [
    settings.theme,
    settings.compactMode,
  ]);

  function updateSetting(key, value) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setMessage("");
  }

  function handleSave() {
    const saved = saveSettings(settings);

    setSettings(saved);
    setSavedSettings(saved);

    setMessage(
      "Settings saved and applied successfully.",
    );

    window.setTimeout(
      () => setMessage(""),
      2500,
    );
  }

  function restoreDefaults() {
    const confirmed =
      window.confirm(
        "Restore all CodeGuard settings to their default values?",
      );

    if (!confirmed) {
      return;
    }

    setSettings({
      ...DEFAULT_SETTINGS,
    });

    setMessage(
      "Defaults loaded. Click Save Changes to apply them permanently.",
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <span className="settings-eyebrow">
            CODEGUARD PREFERENCES
          </span>

          <h1>Settings</h1>

          <p>
            Configure the CodeGuard interface,
            scanner, AI review, reports,
            notifications and workspace behaviour.
          </p>
        </div>

        <div className="settings-header-actions">
          <button
            type="button"
            className="restore-settings-button"
            onClick={restoreDefaults}
          >
            <FaRedoAlt />
            Restore Defaults
          </button>

          <button
            type="button"
            className="save-settings-button"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <FaSave />
            {hasChanges
              ? "Save Changes"
              : "Saved"}
          </button>
        </div>
      </div>

      {message && (
        <div className="settings-message">
          <FaCheckCircle />
          {message}
        </div>
      )}

      {hasChanges && (
        <div className="settings-unsaved">
          You have unsaved changes.
        </div>
      )}

      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-icon purple">
              <FaPalette />
            </div>
            <div>
              <h2>Appearance</h2>
              <p>Customize the dashboard appearance.</p>
            </div>
          </div>

          <div className="setting-control">
            <div>
              <strong>Interface Theme</strong>
              <span>Changes the complete CodeGuard theme.</span>
            </div>
            <select
              value={settings.theme}
              onChange={(event) =>
                updateSetting(
                  "theme",
                  event.target.value,
                )
              }
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div className="setting-control">
            <div>
              <strong>Compact Layout</strong>
              <span>Reduces dashboard gaps and card padding.</span>
            </div>
            <Toggle
              checked={settings.compactMode}
              onChange={(value) =>
                updateSetting(
                  "compactMode",
                  value,
                )
              }
            />
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-icon blue">
              <FaShieldAlt />
            </div>
            <div>
              <h2>Security Scanner</h2>
              <p>Control real static-analysis behaviour.</p>
            </div>
          </div>

          <div className="setting-control">
            <div>
              <strong>Scan Profile</strong>
              <span>
                Quick checks core risks, Balanced is recommended,
                Deep runs the entire ruleset.
              </span>
            </div>
            <select
              value={settings.scanProfile}
              onChange={(event) =>
                updateSetting(
                  "scanProfile",
                  event.target.value,
                )
              }
            >
              <option value="quick">Quick</option>
              <option value="balanced">Balanced</option>
              <option value="deep">Deep Scan</option>
            </select>
          </div>

          <div className="setting-control">
            <div>
              <strong>Minimum Severity</strong>
              <span>Filters scanner findings below this severity.</span>
            </div>
            <select
              value={settings.minimumSeverity}
              onChange={(event) =>
                updateSetting(
                  "minimumSeverity",
                  event.target.value,
                )
              }
            >
              <option value="info">Info</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="setting-control">
            <div>
              <strong>Automatic Analysis</strong>
              <span>
                Immediately scans a valid file after it is loaded.
              </span>
            </div>
            <Toggle
              checked={settings.autoScan}
              onChange={(value) =>
                updateSetting(
                  "autoScan",
                  value,
                )
              }
            />
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-icon cyan">
              <FaBrain />
            </div>
            <div>
              <h2>AI Security Review</h2>
              <p>Controls what Gemini is asked to generate.</p>
            </div>
          </div>

          <div className="setting-control">
            <div>
              <strong>AI Review Detail</strong>
              <span>Changes prompt depth and output limits.</span>
            </div>
            <select
              value={settings.aiReviewMode}
              onChange={(event) =>
                updateSetting(
                  "aiReviewMode",
                  event.target.value,
                )
              }
            >
              <option value="quick">Quick</option>
              <option value="standard">Standard</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>

          <div className="setting-control">
            <div>
              <strong>Secure Code Examples</strong>
              <span>Controls corrected-code generation.</span>
            </div>
            <Toggle
              checked={settings.secureCodeExamples}
              onChange={(value) =>
                updateSetting(
                  "secureCodeExamples",
                  value,
                )
              }
            />
          </div>

          <div className="setting-control">
            <div>
              <strong>OWASP Mapping</strong>
              <span>Controls OWASP mapping in scanner and AI results.</span>
            </div>
            <Toggle
              checked={settings.showOwasp}
              onChange={(value) =>
                updateSetting(
                  "showOwasp",
                  value,
                )
              }
            />
          </div>

          <div className="setting-control">
            <div>
              <strong>CWE Mapping</strong>
              <span>Controls CWE mapping in scanner and AI results.</span>
            </div>
            <Toggle
              checked={settings.showCwe}
              onChange={(value) =>
                updateSetting(
                  "showCwe",
                  value,
                )
              }
            />
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-icon red">
              <FaFilePdf />
            </div>
            <div>
              <h2>Reports & Export</h2>
              <p>Controls the exported PDF.</p>
            </div>
          </div>

          <div className="setting-control">
            <div>
              <strong>PDF Theme</strong>
              <span>Match UI or force Dark/Light PDF export.</span>
            </div>
            <select
              value={settings.pdfTheme}
              onChange={(event) =>
                updateSetting(
                  "pdfTheme",
                  event.target.value,
                )
              }
            >
              <option value="match">Match UI</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div className="setting-control">
            <div>
              <strong>Security Score</strong>
              <span>Include the score in exported PDF reports.</span>
            </div>
            <Toggle
              checked={settings.includeSecurityScore}
              onChange={(value) =>
                updateSetting(
                  "includeSecurityScore",
                  value,
                )
              }
            />
          </div>

          <div className="setting-control">
            <div>
              <strong>Vulnerability Details</strong>
              <span>Include static findings in exported PDF reports.</span>
            </div>
            <Toggle
              checked={settings.includeIssueDetails}
              onChange={(value) =>
                updateSetting(
                  "includeIssueDetails",
                  value,
                )
              }
            />
          </div>

          <div className="setting-control">
            <div>
              <strong>AI Recommendations</strong>
              <span>Include Gemini review in exported PDF reports.</span>
            </div>
            <Toggle
              checked={settings.includeSuggestions}
              onChange={(value) =>
                updateSetting(
                  "includeSuggestions",
                  value,
                )
              }
            />
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-icon yellow">
              <FaBell />
            </div>
            <div>
              <h2>Notifications</h2>
              <p>Controls real alerts shown by the top-bar bell.</p>
            </div>
          </div>

          <div className="setting-control">
            <div>
              <strong>Scan Completed</strong>
              <span>Add an alert when analysis finishes successfully.</span>
            </div>
            <Toggle
              checked={settings.scanNotifications}
              onChange={(value) =>
                updateSetting(
                  "scanNotifications",
                  value,
                )
              }
            />
          </div>

          <div className="setting-control">
            <div>
              <strong>Critical Findings</strong>
              <span>Add a high-priority alert for critical vulnerabilities.</span>
            </div>
            <Toggle
              checked={settings.criticalNotifications}
              onChange={(value) =>
                updateSetting(
                  "criticalNotifications",
                  value,
                )
              }
            />
          </div>

          <div className="setting-control">
            <div>
              <strong>Failed Scans</strong>
              <span>Add an alert when analysis fails.</span>
            </div>
            <Toggle
              checked={settings.failedScanNotifications}
              onChange={(value) =>
                updateSetting(
                  "failedScanNotifications",
                  value,
                )
              }
            />
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-icon green">
              <FaSlidersH />
            </div>
            <div>
              <h2>General Preferences</h2>
              <p>Controls session and project behaviour.</p>
            </div>
          </div>

          <div className="setting-control">
            <div>
              <strong>Session Timeout</strong>
              <span>
                Automatically signs out after the selected period of inactivity.
              </span>
            </div>
            <select
              value={settings.sessionTimeout}
              onChange={(event) =>
                updateSetting(
                  "sessionTimeout",
                  event.target.value,
                )
              }
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          <div className="setting-control">
            <div>
              <strong>Remember Last Project</strong>
              <span>
                Restores the previously selected project on the next visit.
              </span>
            </div>
            <Toggle
              checked={settings.rememberLastProject}
              onChange={(value) =>
                updateSetting(
                  "rememberLastProject",
                  value,
                )
              }
            />
          </div>
        </section>
      </div>

      <div className="settings-bottom-bar">
        <div>
          <FaShieldAlt />
          <span>
            Saved settings are applied across CodeGuard immediately.
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges}
        >
          <FaSave />
          {hasChanges
            ? "Save Changes"
            : "All Changes Saved"}
        </button>
      </div>
    </div>
  );
}
