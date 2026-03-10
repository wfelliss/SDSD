export async function getCurrentUser() {
  const token = localStorage.getItem("token");
  console.log("TOKEN:", token);

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