export async function getMeClient() {
  const res = await fetch("/api/me", { cache: "no-store" });
  if (!res.ok) throw new Error("not logged in");
  return res.json();
}

export async function loginClient(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).message ?? "login failed");
  return res.json();
}

export async function registerClient(name: string, email: string, password: string) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).message ?? "register failed");
  return res.json();
}

export async function logoutClient() {
  await fetch("/api/auth/logout", { method: "POST" });
}
