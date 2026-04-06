import dotenv from "dotenv";

dotenv.config();

const base = process.env.PERF_BASE_URL || "http://localhost:5000";
const stamp = Date.now();

const creds = {
  employee: {
    email: process.env.EMPLOYEE_LOGIN_EMAIL,
    password: process.env.EMPLOYEE_LOGIN_PASSWORD || process.env.PERF_LOGIN_PASSWORD,
  },
  manager: {
    email: process.env.MANAGER_LOGIN_EMAIL,
    password: process.env.MANAGER_LOGIN_PASSWORD || process.env.PERF_LOGIN_PASSWORD,
  },
  admin: {
    email: process.env.ADMIN_LOGIN_EMAIL,
    password: process.env.ADMIN_LOGIN_PASSWORD || process.env.PERF_LOGIN_PASSWORD,
  },
};

const requiredRoles = ["employee", "manager", "admin"];
for (const roleName of requiredRoles) {
  if (!creds[roleName].email || !creds[roleName].password) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          error: `Missing ${roleName} credentials in .env`,
        },
        null,
        2
      )
    );
    process.exit(1);
  }
}

const results = [];
const state = {
  tokens: {},
  usersByRole: {},
  createdUserId: "",
  createdUserEmail: `wf_emp_${stamp}@example.com`,
  employeeUpdateId: "",
  employeeLatestUpdateId: "",
  reviewedUpdateId: "",
  employeeCreateBlockedByLimit: false,
};

const check = async (name, fn) => {
  try {
    const data = await fn();
    results.push({ ...data, name, ok: true, step: name });
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

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

const loginAs = async (roleName) => {
  const { res, body } = await req("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(creds[roleName]),
  });

  if (!res.ok || !body?.token) {
    throw new Error(`${roleName} login failed: ${res.status} ${JSON.stringify(body)}`);
  }

  state.tokens[roleName] = body.token;
  state.usersByRole[roleName] = body.user;

  return { status: res.status, role: body.user?.role, email: body.user?.email };
};

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

await check("login_employee", async () => loginAs("employee"));
await check("login_manager", async () => loginAs("manager"));
await check("login_admin", async () => loginAs("admin"));

await check("employee_create_update", async () => {
  const { res, body } = await req("/api/updates", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...authHeaders(state.tokens.employee),
    },
    body: JSON.stringify({
      description: `Workflow check update ${stamp} completed integration validation`,
      hours: 2,
      status: "COMPLETED",
    }),
  });

  if (res.status === 201) {
    state.employeeUpdateId = body?._id || "";
    return { status: res.status, updateId: state.employeeUpdateId };
  }

  if (
    res.status === 400
    && String(body?.message || "").includes("Daily limit reached")
  ) {
    state.employeeCreateBlockedByLimit = true;
    return {
      status: res.status,
      policyEnforced: true,
      message: body.message,
    };
  }

  if (
    res.status === 400
    && String(body?.message || "").includes("Manager feedback is required on your previous update")
  ) {
    return {
      status: res.status,
      policyEnforced: true,
      message: body.message,
    };
  }

  throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
});

await check("employee_get_my_updates", async () => {
  const { res, body } = await req("/api/updates/me", {
    headers: authHeaders(state.tokens.employee),
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
  if (!Array.isArray(body)) throw new Error("invalid my updates payload");

  state.employeeLatestUpdateId = body[0]?._id || "";
  if (!state.employeeLatestUpdateId) throw new Error("employee has no updates to validate workflow");

  const hasCreated = state.employeeUpdateId
    ? body.some((item) => item?._id === state.employeeUpdateId)
    : false;

  return {
    status: res.status,
    count: body.length,
    latestUpdateId: state.employeeLatestUpdateId,
    createdVisible: hasCreated,
  };
});

await check("manager_get_team_updates", async () => {
  const { res, body } = await req("/api/updates/team?page=1&limit=20", {
    headers: authHeaders(state.tokens.manager),
  });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body?.updates)) throw new Error("invalid team updates payload");

  const hasEmployeeUpdate = body.updates.some((item) => item?._id === state.employeeUpdateId);
  return {
    status: res.status,
    count: body.updates.length,
    seesEmployeeUpdate: hasEmployeeUpdate,
  };
});

await check("manager_submit_feedback", async () => {
  const targetUpdateId = state.employeeUpdateId || state.employeeLatestUpdateId;
  if (!targetUpdateId) throw new Error("employee update id missing");

  const { res, body } = await req("/api/feedback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...authHeaders(state.tokens.manager),
    },
    body: JSON.stringify({
      updateId: targetUpdateId,
      comment: `Manager review for workflow check ${stamp}`,
    }),
  });

  if (res.status !== 201) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  state.reviewedUpdateId = targetUpdateId;
  return { status: res.status, feedbackId: body?._id || null, updateId: targetUpdateId };
});

await check("employee_create_update_after_feedback", async () => {
  if (state.employeeCreateBlockedByLimit) {
    return {
      skipped: true,
      policyEnforced: true,
      message: "Skipped follow-up create because daily submission limit is already reached today.",
    };
  }

  const { res, body } = await req("/api/updates", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...authHeaders(state.tokens.employee),
    },
    body: JSON.stringify({
      description: `Workflow follow-up update ${stamp} after manager feedback`,
      hours: 1,
      status: "IN_PROGRESS",
    }),
  });

  if (res.status !== 201) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  state.employeeUpdateId = body?._id || state.employeeUpdateId;
  return { status: res.status, updateId: state.employeeUpdateId };
});

await check("employee_fetch_feedback", async () => {
  const targetUpdateId = state.reviewedUpdateId || state.employeeLatestUpdateId;
  if (!targetUpdateId) throw new Error("no update available for feedback fetch");

  const { res, body } = await req(`/api/feedback/${targetUpdateId}`, {
    headers: authHeaders(state.tokens.employee),
  });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body?.feedback)) throw new Error("invalid feedback payload");
  return { status: res.status, count: body.feedback.length };
});

await check("manager_team_metrics", async () => {
  const { res, body } = await req("/api/dashboard/team-metrics", {
    headers: authHeaders(state.tokens.manager),
  });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  if (typeof body?.summary?.totalUpdates !== "number") {
    throw new Error("invalid team metrics summary payload");
  }
  if (!Array.isArray(body?.trends)) throw new Error("invalid trends payload");

  return {
    status: res.status,
    totalUpdates: body.summary.totalUpdates,
    completionRate: body.summary.completionRate,
    trendPoints: body.trends.length,
  };
});

await check("admin_get_users", async () => {
  const { res, body } = await req("/api/admin/users", {
    headers: authHeaders(state.tokens.admin),
  });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body?.users)) throw new Error("invalid users payload");
  return { status: res.status, count: body.users.length };
});

await check("admin_get_settings", async () => {
  const { res, body } = await req("/api/admin/settings", {
    headers: authHeaders(state.tokens.admin),
  });
  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body?.settings)) throw new Error("invalid settings payload");
  return { status: res.status, count: body.settings.length };
});

await check("admin_create_employee", async () => {
  const { res, body } = await req("/api/admin/users", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...authHeaders(state.tokens.admin),
    },
    body: JSON.stringify({
      name: `WF Employee ${stamp}`,
      email: state.createdUserEmail,
      password: "Aa@123456",
      role: "EMPLOYEE",
    }),
  });

  if (res.status !== 201) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  state.createdUserId = body?.user?._id || "";
  return { status: res.status, userId: state.createdUserId };
});

await check("admin_update_user_name", async () => {
  if (!state.createdUserId) throw new Error("created user id missing");

  const { res, body } = await req(`/api/admin/users/${state.createdUserId}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...authHeaders(state.tokens.admin),
    },
    body: JSON.stringify({ name: `WF Employee Updated ${stamp}` }),
  });

  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  return { status: res.status, name: body?.user?.name };
});

await check("admin_delete_user", async () => {
  if (!state.createdUserId) throw new Error("created user id missing");

  const { res, body } = await req(`/api/admin/users/${state.createdUserId}`, {
    method: "DELETE",
    headers: authHeaders(state.tokens.admin),
  });

  if (!res.ok) throw new Error(`status ${res.status} ${JSON.stringify(body)}`);
  return { status: res.status, message: body?.message };
});

await check("authorization_guards", async () => {
  const [employeeOnAdmin, managerOnAdmin] = await Promise.all([
    req("/api/admin/stats", { headers: authHeaders(state.tokens.employee) }),
    req("/api/admin/stats", { headers: authHeaders(state.tokens.manager) }),
  ]);

  const okEmployee = employeeOnAdmin.res.status === 403;
  const okManager = managerOnAdmin.res.status === 403;
  if (!okEmployee || !okManager) {
    throw new Error(
      `expected 403 guards employee=${employeeOnAdmin.res.status} manager=${managerOnAdmin.res.status}`
    );
  }

  return {
    employeeStatus: employeeOnAdmin.res.status,
    managerStatus: managerOnAdmin.res.status,
  };
});

console.log(JSON.stringify(results, null, 2));

const failed = results.filter((item) => !item.ok).length;
process.exit(failed ? 1 : 0);
