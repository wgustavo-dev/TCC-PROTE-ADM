(function () {
  const API_BASE_URL = window.API_BASE_URL || "http://localhost:3000/api";

  async function request(path, options) {
    const token = window.localStorage.getItem("prote_token");
    const headers = Object.assign({}, options.headers || {});

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const isJson = (response.headers.get("content-type") || "").includes("application/json");
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
      const message =
        (payload && (payload.error || payload.erro || payload.message)) ||
        `Erro HTTP ${response.status}`;
      throw new Error(message);
    }

    return payload;
  }

  function get(path) {
    return request(path, { method: "GET" });
  }

  function post(path, body) {
    const isFormData = body instanceof FormData;
    return request(path, {
      method: "POST",
      headers: isFormData ? undefined : { "Content-Type": "application/json" },
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  function put(path, body) {
    const isFormData = body instanceof FormData;
    return request(path, {
      method: "PUT",
      headers: isFormData ? undefined : { "Content-Type": "application/json" },
      body: isFormData ? body : JSON.stringify(body || {}),
    });
  }

  function del(path) {
    return request(path, { method: "DELETE" });
  }

  window.API = { get, post, put, del };
})();
