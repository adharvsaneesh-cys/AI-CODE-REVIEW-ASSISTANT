import { refreshAccessToken } from "./auth";
import { getScanRequestSettings } from "./settings";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8001/api/v1";

async function parseResponse(response) {
  const data = await response
    .json()
    .catch(() => ({
      success: false,
      message:
        "The server returned an invalid response",
    }));

  if (!response.ok) {
    console.error(
      "SCAN API ERROR:",
      {
        status:
          response.status,
        data,
      },
    );

    throw new Error(
      data.message ||
        `Scan failed with status ${response.status}`,
    );
  }

  return data;
}

async function requestWithRefresh(
  createRequest,
) {
  let accessToken =
    localStorage.getItem(
      "accessToken",
    );

  if (!accessToken) {
    throw new Error(
      "Your session has expired. Please log in again.",
    );
  }

  let response =
    await createRequest(
      accessToken,
    );

  if (
    response.status === 401
  ) {
    accessToken =
      await refreshAccessToken();

    response =
      await createRequest(
        accessToken,
      );
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
      String(
        settings.secureCodeExamples,
      ),

    "X-CodeGuard-Show-OWASP":
      String(
        settings.showOwasp,
      ),

    "X-CodeGuard-Show-CWE":
      String(
        settings.showCwe,
      ),
  };
}

function normalizeId(
  value,
  message,
) {
  const normalized =
    String(
      value || "",
    ).trim();

  if (!normalized) {
    throw new Error(
      message,
    );
  }

  return normalized;
}

function normalizeZipFilePath(
  value,
) {
  const normalized =
    String(
      value || "",
    )
      .replace(/\\/g, "/")
      .replace(/^\.\/+/, "")
      .trim();

  if (!normalized) {
    throw new Error(
      "Select a ZIP project file.",
    );
  }

  return normalized;
}

function getDownloadFileName(
  response,
  fallbackName,
) {
  const disposition =
    response.headers.get(
      "Content-Disposition",
    );

  if (!disposition) {
    return fallbackName;
  }

  const utfMatch =
    disposition.match(
      /filename\*=UTF-8''([^;]+)/i,
    );

  if (
    utfMatch &&
    utfMatch[1]
  ) {
    try {
      return decodeURIComponent(
        utfMatch[1]
          .replace(
            /^["']|["']$/g,
            "",
          ),
      );
    } catch {
      return utfMatch[1]
        .replace(
          /^["']|["']$/g,
          "",
        );
    }
  }

  const normalMatch =
    disposition.match(
      /filename="?([^";]+)"?/i,
    );

  if (
    normalMatch &&
    normalMatch[1]
  ) {
    return normalMatch[1].trim();
  }

  return fallbackName;
}

async function parseDownloadError(
  response,
) {
  const contentType =
    String(
      response.headers.get(
        "Content-Type",
      ) || "",
    ).toLowerCase();

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    const data =
      await response
        .json()
        .catch(() => null);

    return (
      data?.message ||
      `Download failed with status ${response.status}`
    );
  }

  const message =
    await response
      .text()
      .catch(() => "");

  return (
    message ||
    `Download failed with status ${response.status}`
  );
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

export async function analyzeZipProject({
  projectId,
  file,
  geminiReviewMode = "findings",
}) {
  if (!projectId) {
    throw new Error(
      "Select a project before scanning the ZIP file.",
    );
  }

  if (!(file instanceof File)) {
    throw new Error(
      "Select a valid ZIP project.",
    );
  }

  if (
    !file.name
      .toLowerCase()
      .endsWith(".zip")
  ) {
    throw new Error(
      "Only .zip project archives are supported.",
    );
  }

  const validGeminiModes = [
    "findings",
    "sensitive",
    "remaining",
    "off",
  ];

  const normalizedGeminiMode =
    validGeminiModes.includes(
      geminiReviewMode,
    )
      ? geminiReviewMode
      : "findings";

  const createFormData =
    () => {
      const formData =
        new FormData();

      formData.append(
        "projectId",
        projectId,
      );

      formData.append(
        "geminiReviewMode",
        normalizedGeminiMode,
      );

      formData.append(
        "file",
        file,
        file.name,
      );

      return formData;
    };

  const response =
    await requestWithRefresh(
      (accessToken) =>
        fetch(
          `${API_URL}/scans/zip`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,

              ...settingHeaders(),
            },

            credentials:
              "include",

            body:
              createFormData(),
          },
        ),
    );

  return parseResponse(
    response,
  );
}

export async function getZipProjectFiles(
  scanId,
) {
  const normalizedScanId =
    normalizeId(
      scanId,
      "ZIP scan ID is required.",
    );

  const response =
    await requestWithRefresh(
      (accessToken) =>
        fetch(
          `${API_URL}/scans/${encodeURIComponent(
            normalizedScanId,
          )}/zip-files`,
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

export async function getZipProjectFileSource({
  scanId,
  filePath,
}) {
  const normalizedScanId =
    normalizeId(
      scanId,
      "ZIP scan ID is required.",
    );

  const normalizedFilePath =
    normalizeZipFilePath(
      filePath,
    );

  const params =
    new URLSearchParams({
      filePath:
        normalizedFilePath,
    });

  const response =
    await requestWithRefresh(
      (accessToken) =>
        fetch(
          `${API_URL}/scans/${encodeURIComponent(
            normalizedScanId,
          )}/zip-file/source?${params.toString()}`,
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

export async function getZipFileAiReview({
  scanId,
  filePath,
}) {
  const normalizedScanId =
    normalizeId(
      scanId,
      "ZIP scan ID is required for AI review.",
    );

  const normalizedFilePath =
    normalizeZipFilePath(
      filePath,
    );

  const params =
    new URLSearchParams({
      filePath:
        normalizedFilePath,
    });

  const response =
    await requestWithRefresh(
      (accessToken) =>
        fetch(
          `${API_URL}/scans/${encodeURIComponent(
            normalizedScanId,
          )}/zip-file/ai-review?${params.toString()}`,
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

export async function generateZipFileAiReview({
  scanId,
  filePath,
  force = false,
}) {
  const normalizedScanId =
    normalizeId(
      scanId,
      "ZIP scan ID is required for AI review.",
    );

  const normalizedFilePath =
    normalizeZipFilePath(
      filePath,
    );

  const response =
    await requestWithRefresh(
      (accessToken) =>
        fetch(
          `${API_URL}/scans/${encodeURIComponent(
            normalizedScanId,
          )}/zip-file/ai-review`,
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
                filePath:
                  normalizedFilePath,

                force:
                  Boolean(
                    force,
                  ),
              }),
          },
        ),
    );

  return parseResponse(
    response,
  );
}

export async function verifyZipProjectFile({
  scanId,
  filePath,
  code,
}) {
  const normalizedScanId =
    normalizeId(
      scanId,
      "ZIP scan ID is required for verification.",
    );

  const normalizedFilePath =
    normalizeZipFilePath(
      filePath,
    );

  if (
    typeof code !== "string"
  ) {
    throw new Error(
      "Valid source code is required for verification.",
    );
  }

  const response =
    await requestWithRefresh(
      (accessToken) =>
        fetch(
          `${API_URL}/scans/${encodeURIComponent(
            normalizedScanId,
          )}/zip-file/verify`,
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
                filePath:
                  normalizedFilePath,

                code,
              }),
          },
        ),
    );

  return parseResponse(
    response,
  );
}

export async function downloadSecuredZip(
  scanId,
) {
  const normalizedScanId =
    normalizeId(
      scanId,
      "ZIP scan ID is required for secured ZIP download.",
    );

  const response =
    await requestWithRefresh(
      (accessToken) =>
        fetch(
          `${API_URL}/scans/${encodeURIComponent(
            normalizedScanId,
          )}/zip/download`,
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

  if (!response.ok) {
    const message =
      await parseDownloadError(
        response,
      );

    console.error(
      "SECURED ZIP DOWNLOAD ERROR:",
      {
        status:
          response.status,
        message,
      },
    );

    throw new Error(message);
  }

  const blob =
    await response.blob();

  if (
    !blob ||
    blob.size === 0
  ) {
    throw new Error(
      "The server returned an empty secured ZIP archive.",
    );
  }

  const fileName =
    getDownloadFileName(
      response,
      "project-codeguard-secured.zip",
    );

  const objectUrl =
    URL.createObjectURL(
      blob,
    );

  try {
    const anchor =
      document.createElement(
        "a",
      );

    anchor.href =
      objectUrl;

    anchor.download =
      fileName;

    anchor.style.display =
      "none";

    document.body.appendChild(
      anchor,
    );

    anchor.click();

    anchor.remove();
  } finally {
    window.setTimeout(
      () => {
        URL.revokeObjectURL(
          objectUrl,
        );
      },
      1000,
    );
  }

  return {
    success: true,
    fileName,
    sizeBytes:
      blob.size,

    replacedFiles:
      Number(
        response.headers.get(
          "X-CodeGuard-Replaced-Files",
        ) || 0,
      ),

    totalSourceFiles:
      Number(
        response.headers.get(
          "X-CodeGuard-Source-Files",
        ) || 0,
      ),
  };
}

export async function getScan(
  scanId,
) {
  const normalizedScanId =
    normalizeId(
      scanId,
      "Scan ID is required.",
    );

  const response =
    await requestWithRefresh(
      (accessToken) =>
        fetch(
          `${API_URL}/scans/${encodeURIComponent(
            normalizedScanId,
          )}`,
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
  const normalizedProjectId =
    normalizeId(
      projectId,
      "Project ID is required.",
    );

  const response =
    await requestWithRefresh(
      (accessToken) =>
        fetch(
          `${API_URL}/scans/project/${encodeURIComponent(
            normalizedProjectId,
          )}/history`,
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