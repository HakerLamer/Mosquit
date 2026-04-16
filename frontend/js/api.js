// js/api.js

const API = {
  async request(url, options = {}) {
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Ошибка API");
    }

    return res.json();
  },

  get: (url) => API.request(url),
  post: (url, body) =>
    API.request(url, { method: "POST", body: JSON.stringify(body) }),
  put: (url, body) =>
    API.request(url, { method: "PUT", body: JSON.stringify(body) }),
  del: (url) => API.request(url, { method: "DELETE" }),
};

window.api = API;
