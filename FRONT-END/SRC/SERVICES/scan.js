import { refreshAccessToken } from "./auth";
import { getScanRequestSettings } from "./settings";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8001/api/v1";

async function parseResponse(response) {
  const data = await response.json().catch(() => ({
    success: false,
    message: "The server returned an invalid response",
  }));

  if (!response.ok) {
    console.error("SCAN API ERROR:", {
      status: response.status,
      data,
    });

    throw new Error(
      data.message ||
        `Scan failed with status ${response.status}`,
    );
  }

  return data;
}

async function requestWithRefresh(createRequest) {
  let accessToken =
    localStorage.getItem("accessToken");

  if (!accessToken) {
    throw new Error(
      "Your session has expired. Please log in again.",
    );
  }

  let response =
    await createRequest(accessToken);

  if (response.status === 401) {
    accessToken =
      await refreshAccessToken();

    response =
      await createRequest(accessToken);
  }

  return response;
}

function settingHeaders() {
  const settings =
    getScanRequestSettings();

  return {
    "X-CodeGuard-Scan-Profile":
      settings.scanProfile,

    "X-CodeGuard-Min-Severity":
      settings.minimumSeverity,

    "X-CodeGuard-AI-Mode":
      settings.aiReviewMode,

    "X-CodeGuard-Secure-Examples":
      String(settings.secureCodeExamples),

    "X-CodeGuard-Show-OWASP":
      String(settings.showOwasp),

    "X-CodeGuard-Show-CWE":
      String(settings.showCwe),
  };
}

export async function analyzePastedCode({
  projectId,
  language,
  fileName,
  code,
}) {
  const response =
    await requestWithRefresh(
      (accessToken) =>
        fetch(
          `${API_URL}/scans/paste`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${accessToken}`,

              ...settingHeaders(),
            },

            credentials:
              "include",

            body:
              JSON.stringify({
                projectId,
                language,
                fileName,
                code,
              }),
          },
        ),
    );

  return parseResponse(
    response,
  );
}

export async function getScan(scanId) {
  const response =
    await requestWithRefresh(
      (accessToken) =>
        fetch(
          `${API_URL}/scans/${scanId}`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },

            credentials:
              "include",
          },
        ),
    );

  return parseResponse(
    response,
  );
}

export async function getProjectScanHistory(
  projectId,
) {
  const response =
    await requestWithRefresh(
      (accessToken) =>
        fetch(
          `${API_URL}/scans/project/${projectId}/history`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },

            credentials:
              "include",
          },
        ),
    );

  return parseResponse(
    response,
  );
}
