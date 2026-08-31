const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8001/api/v1"

export async function loginUser(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: "Invalid server response",
  }));

  if (!response.ok) {
    throw new Error(
      data.message || "Login failed",
    );
  }

  if (!data.accessToken) {
    throw new Error(
      "Login succeeded but no access token was returned.",
    );
  }

  localStorage.setItem(
    "accessToken",
    data.accessToken,
  );

  if (data.user) {
    localStorage.setItem(
      "user",
      JSON.stringify(data.user),
    );
  }

  return data;
}

export async function registerUser({
  fullName,
  email,
  password,
}) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      fullName,
      email,
      password,
    }),
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: "Invalid server response",
  }));

  if (!response.ok) {
    throw new Error(
      data.message || "Registration failed",
    );
  }

  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data;
}

export async function refreshAccessToken() {
  const response = await fetch(
    `${API_URL}/auth/refresh`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    },
  );

  const data = await response.json().catch(() => ({
    success: false,
    message: "Invalid refresh response",
  }));

  if (!response.ok || !data.accessToken) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");

    throw new Error(
      data.message ||
        "Session expired. Please sign in again.",
    );
  }

  localStorage.setItem(
    "accessToken",
    data.accessToken,
  );

  return data.accessToken;
}

export async function getCurrentUser() {
  let accessToken =
    localStorage.getItem("accessToken");

  if (!accessToken) {
    try {
      accessToken =
        await refreshAccessToken();
    } catch {
      throw new Error(
        "Please log in again.",
      );
    }
  }

  let response = await fetch(
    `${API_URL}/auth/me`,
    {
      method: "GET",
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  if (response.status === 401) {
    accessToken =
      await refreshAccessToken();

    response = await fetch(
      `${API_URL}/auth/me`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
        credentials: "include",
      },
    );
  }

  const data = await response.json().catch(() => ({
    success: false,
    message: "Invalid server response",
  }));

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Unable to load current user",
    );
  }

  if (data.user) {
    localStorage.setItem(
      "user",
      JSON.stringify(data.user),
    );
  }

  return data.user;
}

export async function logoutUser() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error(
      "Logout request failed:",
      error,
    );
  } finally {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem(
      "selectedProjectId",
    );
  }
}

export function getStoredAccessToken() {
  return localStorage.getItem("accessToken");
}

export function getStoredUser() {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(
    localStorage.getItem("accessToken"),
  );
}