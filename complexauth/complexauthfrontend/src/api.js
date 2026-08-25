import axios from "axios";
// Axios is a JS library used to make HTTP requests (i.e. talking to a backend API from the browser).
// Cleaner, more powerful replacement for fetch().

// Creates a custom HTTP client, so that instead of axios.get("http://localhost:8000/me")
// you can write api.get("/me")
export const api = axios.create({

  baseURL: "http://localhost:8000",
  withCredentials: true, // include cookies in cross-origin requests
});

let accessToken = localStorage.getItem("accessToken");

export function setAccessToken(token) {
  accessToken = token;

  if (token) {
    // Every request made by this API client will include the header Authorization:
    // Bearer eyJ...
    localStorage.setItem("accessToken", token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
     // Stop sending authentication headers
    localStorage.removeItem("accessToken");
    delete api.defaults.headers.common["Authorization"];
  }
}

export function getAccessToken() {
  return accessToken;
}

function handleApiError(error) {
  const status = error.response?.status;

  if (status === 401) {
    // optional: let AuthProvider handle it instead
  }

  if (status >= 500) {
    console.error("Server error:", error.response?.data);
  }

  return Promise.reject(error); // re-throws an error in an async Promise chain
  // Without it, Axios thinks the the error was handled successfully and the request succeeded.
  // and api.get("/me") resolves as undefined
  // With it, we go into api.get("/me")'s  .catch(error).
}

// REQUEST interceptor - runs before every request
api.interceptors.request.use((config) => {
  // 1. Attach JWT access token
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // 2. Attach CSRF token
  const csrfToken = document.cookie
    .split("; ")
    .find(row => row.startsWith("csrf_token="))
    ?.split("=")[1];

  if (csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }

  return config;
});

// RESPONSE interceptor (error handling)
api.interceptors.response.use(
  (response) => response, // On success return response
  handleApiError // On failure do this
);