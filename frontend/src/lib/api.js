const API_BASE_URL = "http://127.0.0.1:8000";

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json", // ✅ THIS WAS MISSING
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type");
  let data;

  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw new Error(data?.detail || data || "Request failed");
  }

  return data;
}