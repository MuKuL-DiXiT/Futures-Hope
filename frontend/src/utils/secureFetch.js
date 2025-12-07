export default async function secureFetch(path, options = {}) {
  const baseUrl = import.meta.env.VITE_BACKEND_URL;
  const url = `${baseUrl}${path}`;
  let res = await fetch(url, { ...options, credentials: "include" });
  if (res.status === 401) {
    const refresh = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refresh.ok) {
      return fetch(url, { ...options, credentials: "include" });
    } else {
      await fetch(`${baseUrl}/auth/logout`, {
        method: "GET",
        credentials: "include",
      });
      throw new Error("Session expired. Logged out.");
    }
  }
  return res;
}
