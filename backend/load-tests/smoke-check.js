import dotenv from "dotenv";

dotenv.config();

const base = process.env.PERF_BASE_URL || "http://localhost:5000";
const results = [];

const check = async (name, fn) => {
  try {
    const data = await fn();
    results.push({ name, ok: true, ...data });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
};

const req = async (path, options = {}) => {
  const res = await fetch(base + path, options);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
};

let token = "";

await check("health", async () => {
  const { res } = await req("/health");
  if (!res.ok) throw new Error(`status ${res.status}`);
  return { status: res.status };
});

await check("readyz", async () => {
  const { res, body } = await req("/readyz");
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  return { status: res.status };
});

await check("metrics", async () => {
  const { res, body } = await req("/metrics");
  if (!res.ok) throw new Error(`status ${res.status}`);
  const metricText = String(body || "");
  if (!metricText.includes("worksync_http_requests_total")) {
    throw new Error("expected metric not found");
  }
  return { status: res.status };
});

await check("auth_login", async () => {
  const { res, body } = await req("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: process.env.PERF_LOGIN_EMAIL,
      password: process.env.PERF_LOGIN_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  token = body?.token || "";
  if (!token) throw new Error("token missing");
  return { status: res.status, role: body?.user?.role || "unknown" };
});

const authHeaders = () => ({ Authorization: `Bearer ${token}` });

await check("dashboard_stats", async () => {
  const { res, body } = await req("/api/dashboard/stats", { headers: authHeaders() });
  if (!res.ok) throw new Error(`status ${res.status}`);
  if (typeof body?.total !== "number") throw new Error("invalid payload");
  return { status: res.status, total: body.total };
});

await check("team_metrics", async () => {
  const { res, body } = await req("/api/dashboard/team-metrics", { headers: authHeaders() });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  if (typeof body?.summary?.completionRate !== "number") throw new Error("summary missing");
  if (typeof body?.kpis?.dailySubmissionPercentage !== "number") throw new Error("kpis missing");
  return { status: res.status, teamSize: body.summary.teamSize };
});

await check("team_employees", async () => {
  const { res, body } = await req("/api/updates/employees?page=1&limit=10", {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body?.users)) throw new Error("invalid employees payload");
  return { status: res.status, count: body.users.length };
});

await check("team_updates", async () => {
  const { res, body } = await req("/api/updates/team?page=1&limit=10", {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body?.updates)) throw new Error("invalid updates payload");
  return { status: res.status, count: body.updates.length };
});

await check("notifications", async () => {
  const { res, body } = await req("/api/notifications", { headers: authHeaders() });
  if (!res.ok) throw new Error(`status ${res.status}`);
  if (!Array.isArray(body)) throw new Error("invalid notifications payload");
  return { status: res.status, count: body.length };
});

console.log(JSON.stringify(results, null, 2));

const failed = results.filter((row) => !row.ok).length;
process.exit(failed ? 1 : 0);
