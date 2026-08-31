const STORAGE_KEY = "codeguardSettings";

export const DEFAULT_SETTINGS = {
  theme: "dark",
  compactMode: false,

  scanProfile: "balanced",
  minimumSeverity: "info",
  autoScan: false,

  aiReviewMode: "standard",
  secureCodeExamples: true,
  showOwasp: true,
  showCwe: true,

  pdfTheme: "match",
  includeSuggestions: true,
  includeIssueDetails: true,
  includeSecurityScore: true,

  scanNotifications: true,
  criticalNotifications: true,
  failedScanNotifications: true,

  sessionTimeout: "60",
  rememberLastProject: true,
};

export function getSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return { ...DEFAULT_SETTINGS };
    }

    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(stored),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  const next = {
    ...DEFAULT_SETTINGS,
    ...settings,
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(next),
  );

  localStorage.setItem(
    "dashboardTheme",
    next.theme,
  );

  document.documentElement.setAttribute(
    "data-theme",
    next.theme,
  );

  document.documentElement.setAttribute(
    "data-compact",
    next.compactMode ? "true" : "false",
  );

  if (!next.rememberLastProject) {
    localStorage.removeItem("selectedProjectId");
  }

  window.dispatchEvent(
    new CustomEvent("codeguard-settings-changed", {
      detail: next,
    }),
  );

  return next;
}

export function resetSettings() {
  return saveSettings({ ...DEFAULT_SETTINGS });
}

export function getScanRequestSettings() {
  const settings = getSettings();

  return {
    scanProfile: settings.scanProfile,
    minimumSeverity: settings.minimumSeverity,
    aiReviewMode: settings.aiReviewMode,
    secureCodeExamples: settings.secureCodeExamples,
    showOwasp: settings.showOwasp,
    showCwe: settings.showCwe,
  };
}
