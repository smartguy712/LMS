/* API helper – talks to Flask /api endpoints */
const API = {
  async request(path, options = {}) {
    const opts = {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    };
    if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
      opts.body = JSON.stringify(opts.body);
    }
    if (opts.body instanceof FormData) {
      delete opts.headers["Content-Type"];
    }
    const res = await fetch(`/api${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || `Error ${res.status}`);
    return data;
  },
  get: (p) => API.request(p),
  post: (p, body) => API.request(p, { method: "POST", body }),
  put: (p, body) => API.request(p, { method: "PUT", body }),
  del: (p) => API.request(p, { method: "DELETE" }),
  upload: (p, formData) => API.request(p, { method: "POST", body: formData }),
};
