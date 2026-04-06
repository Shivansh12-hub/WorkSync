import dotenv from "dotenv";

dotenv.config();

const base = process.env.PERF_BASE_URL || "http://localhost:5000";
const stamp = Date.now();
const email = `emp_${stamp}@example.com`;
const password = "Aa@123456";

const call = async (path, options = {}) => {
  const res = await fetch(base + path, options);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
};

const register = await call("/api/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Flow Employee",
    email,
    password,
  }),
});

if (register.status !== 201) {
  console.log(JSON.stringify({ step: "register", result: register }, null, 2));
  process.exit(1);
}

const token = register.body?.token;

const createUpdate = await call("/api/updates", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    description: "Completed API flow validation task for employee create update.",
    hours: 2,
    status: "COMPLETED",
  }),
});

const myUpdates = await call("/api/updates/me", {
  headers: { Authorization: `Bearer ${token}` },
});

console.log(
  JSON.stringify(
    {
      register: { status: register.status, role: register.body?.user?.role },
      createUpdate: {
        status: createUpdate.status,
        message: createUpdate.body?.message || null,
        id: createUpdate.body?._id || null,
      },
      myUpdates: {
        status: myUpdates.status,
        count: Array.isArray(myUpdates.body) ? myUpdates.body.length : null,
      },
    },
    null,
    2
  )
);
