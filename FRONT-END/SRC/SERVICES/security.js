import {
  refreshAccessToken,
} from "./auth";

const API_URL =
  import.meta.env
    .VITE_API_URL ||
  "http://localhost:8001/api/v1";

async function requestWithAuthentication(
  url,
  options = {},
) {
  let accessToken =
    localStorage.getItem(
      "accessToken",
    );

  if (!accessToken) {
    throw new Error(
      "Please sign in again.",
    );
  }

  const makeRequest =
    (token) =>
      fetch(url, {
        ...options,

        headers: {
          ...(options.headers ||
            {}),

          Authorization:
            `Bearer ${token}`,
        },

        credentials:
          "include",
      });

  let response =
    await makeRequest(
      accessToken,
    );

  if (
    response.status ===
    401
  ) {
    try {
      accessToken =
        await refreshAccessToken();

      response =
        await makeRequest(
          accessToken,
        );
    } catch {
      localStorage.removeItem(
        "accessToken",
      );

      localStorage.removeItem(
        "user",
      );

      throw new Error(
        "Your session has expired. Please sign in again.",
      );
    }
  }

  return response;
}

async function parseResponse(
  response,
) {
  const data =
    await response
      .json()
      .catch(() => ({
        success: false,

        message:
          "Invalid server response.",
      }));

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Security request failed.",
    );
  }

  return data;
}

export async function getSecurityStatus() {
  const response =
    await requestWithAuthentication(
      `${API_URL}/auth/security`,
      {
        method: "GET",
      },
    );

  return parseResponse(
    response,
  );
}

export async function changePassword({
  currentPassword,
  newPassword,
}) {
  const response =
    await requestWithAuthentication(
      `${API_URL}/auth/change-password`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      },
    );

  return parseResponse(
    response,
  );
}

export async function logoutAllSessions() {
  const response =
    await requestWithAuthentication(
      `${API_URL}/auth/logout-all`,
      {
        method: "POST",
      },
    );

  return parseResponse(
    response,
  );
}