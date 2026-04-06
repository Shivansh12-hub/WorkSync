import dotenv from "dotenv";

dotenv.config();

const base = process.env.PERF_BASE_URL || "http://localhost:5000";
const email = process.env.PERF_LOGIN_EMAIL;
const password = process.env.PERF_LOGIN_PASSWORD;
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
let role = "";
let chosenEmployeeId = "";
let chosenUpdateId = "";

await check("manager_login", async () => {
  const { res, body } = await req("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  token = body?.token || "";
  role = body?.user?.role || "";
  if (!token) throw new Error("token missing");
  return { status: res.status, role };
});

const authHeaders = () => ({ Authorization: `Bearer ${token}` });

await check("manager_role_guard", async () => {
  if (role !== "MANAGER" && role !== "ADMIN") {
    throw new Error(`expected MANAGER/ADMIN, got ${role || "unknown"}`);
  }
  return { role };
});

await check("team_metrics_base", async () => {
  const { res, body } = await req("/api/dashboard/team-metrics", { headers: authHeaders() });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body?.trends)) throw new Error("trends missing");
  if (typeof body?.kpis?.dailySubmissionPercentage !== "number") throw new Error("kpis missing");
  return {
    status: res.status,
    trendPoints: body.trends.length,
    completionRate: body?.summary?.completionRate,
  };
});

await check("employee_listing", async () => {
  const { res, body } = await req("/api/updates/employees?page=1&limit=20", {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body?.users)) throw new Error("users missing");
  chosenEmployeeId = body.users[0]?._id || "";
  return { status: res.status, count: body.users.length };
});

await check("team_updates_default", async () => {
  const { res, body } = await req("/api/updates/team?page=1&limit=20", {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body?.updates)) throw new Error("updates missing");
  chosenUpdateId = body.updates[0]?._id || "";
  return { status: res.status, count: body.updates.length };
});

await check("team_updates_filter", async () => {
  const qs = new URLSearchParams();
  qs.set("status", "COMPLETED");
  if (chosenEmployeeId) qs.set("employeeId", chosenEmployeeId);
  qs.set("page", "1");
  qs.set("limit", "20");
  const { res, body } = await req(`/api/updates/team?${qs.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body?.updates)) throw new Error("filtered updates missing");
  return { status: res.status, count: body.updates.length };
});

await check("team_metrics_filter", async () => {
  const qs = new URLSearchParams();
  if (chosenEmployeeId) qs.set("employeeId", chosenEmployeeId);
  const { res, body } = await req(`/api/dashboard/team-metrics?${qs.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body?.trends)) throw new Error("filtered trends missing");
  return { status: res.status, trendPoints: body.trends.length };
});

await check("feedback_submit", async () => {
  if (!chosenUpdateId) {
    return { skipped: true, reason: "no team update available" };
  }
  const { res, body } = await req("/api/feedback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      updateId: chosenUpdateId,
      comment: "Reviewed by manager in automated functionality check.",
    }),
  });
  if (res.status !== 201) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  return { status: res.status, feedbackId: body?._id || null };
});

await check("feedback_fetch", async () => {
  if (!chosenUpdateId) {
    return { skipped: true, reason: "no team update available" };
  }
  const { res, body } = await req(`/api/feedback/${chosenUpdateId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body?.feedback)) throw new Error("feedback list missing");
  return { status: res.status, count: body.feedback.length };
});

console.log(JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok).length;
process.exit(failed ? 1 : 0);
