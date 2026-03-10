export async function getCurrentUser() {
  const token = localStorage.getItem("token");

  // No token stored — skip the network call entirely to avoid sending
  // "Authorization: Bearer null" to the backend and generating spurious 401 errors.
  if (!token) {
    throw new Error("No token");
  }

  const res = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Unauthorized");
  }

  return res.json();
}