import { refreshAccessToken } from "./auth";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8001/api/v1";

async function getAccessToken() {
  let accessToken =
    localStorage.getItem("accessToken");

  if (!accessToken) {
    throw new Error(
      "Please log in again.",
    );
  }

  return accessToken;
}

async function authorizedRequest(
  url,
  options = {},
) {
  let accessToken =
    await getAccessToken();

  const makeRequest = (token) =>
    fetch(url, {
      ...options,

      headers: {
        ...(options.headers || {}),

        Authorization:
          `Bearer ${token}`,
      },

      credentials: "include",
    });

  let response =
    await makeRequest(
      accessToken,
    );

  if (response.status === 401) {
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
        "Your session expired. Please sign in again.",
      );
    }
  }

  return response;
}

async function readResponse(
  response,
) {
  const data =
    await response
      .json()
      .catch(() => ({
        success: false,
        message:
          "Invalid response from the backend.",
      }));

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Request failed.",
    );
  }

  return data;
}

export async function getProjects() {
  const response =
    await authorizedRequest(
      `${API_URL}/projects`,
      {
        method: "GET",
      },
    );

  const data =
    await readResponse(
      response,
    );

  if (
    !Array.isArray(
      data.projects,
    )
  ) {
    console.error(
      "Unexpected projects response:",
      data,
    );

    return [];
  }

  return data.projects;
}

export async function createProject(
  projectData,
) {
  const response =
    await authorizedRequest(
      `${API_URL}/projects`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          projectData,
        ),
      },
    );

  const data =
    await readResponse(
      response,
    );

  return data.project;
}

export async function deleteProject(
  projectId,
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required.",
    );
  }

  const response =
    await authorizedRequest(
      `${API_URL}/projects/${projectId}`,
      {
        method: "DELETE",
      },
    );

  return readResponse(
    response,
  );
}