import { apiRequest } from "./api";

const API_BASE_URL = "http://127.0.0.1:8000";

export async function loginUser(username, password) {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.detail || "Login failed");
  }

  localStorage.setItem("token", data.access_token);
  return data;
}

export async function getCurrentUser() {
  return await apiRequest("/auth/me", {
    method: "GET",
  });
}

export function logoutUser() {
  localStorage.removeItem("token");
}

export function getStoredToken() {
  return localStorage.getItem("token");
}