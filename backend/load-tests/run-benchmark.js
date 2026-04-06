import fs from "node:fs";
import path from "node:path";
import autocannon from "autocannon";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(".env") });

const SLO_P95_MS = Number(process.env.SLO_P95_MS || 300);
const SLO_ERROR_RATE = Number(process.env.SLO_ERROR_RATE || 0.01);
const BASE_URL = process.env.PERF_BASE_URL || "http://localhost:5000";
const RESULTS_DIR = path.resolve("load-tests", "results");

const args = process.argv.slice(2);
const shouldFailOnSlo = args.includes("--fail-on-slo") || process.env.PERF_FAIL_ON_SLO === "true";
const durationArg = args.find((arg) => arg.startsWith("--duration="));
const connectionsArg = args.find((arg) => arg.startsWith("--connections="));

const defaultDuration = durationArg ? Number(durationArg.split("=")[1]) : 20;
const defaultConnections = connectionsArg ? Number(connectionsArg.split("=")[1]) : 20;

const runAutocannon = (config) =>
  new Promise((resolve, reject) => {
    const instance = autocannon(config, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });

    autocannon.track(instance, { renderProgressBar: false, renderResultsTable: false });
  });

const getJson = async (url, payload) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed (${res.status}): ${text}`);
  }

  return res.json();
};

const maybeGetToken = async () => {
  const email = process.env.PERF_LOGIN_EMAIL;
  const password = process.env.PERF_LOGIN_PASSWORD;

  if (!email || !password) {
    return null;
  }

  const body = await getJson(`${BASE_URL}/api/auth/login`, { email, password });
  return body?.token || null;
};

const computeSummary = (name, result) => {
  const totalRequests = result?.requests?.total || 0;
  const errors = (result.errors || 0) + (result.timeouts || 0) + (result.non2xx || 0);
  const errorRate = totalRequests ? errors / totalRequests : 0;
  const p95 =
    result?.latency?.p95 ??
    result?.latency?.p97_5 ??
    result?.latency?.p99 ??
    result?.latency?.average ??
    0;

  return {
    name,
    requests: {
      total: totalRequests,
      averagePerSec: Number((result?.requests?.average || 0).toFixed(2)),
    },
    latency: {
      averageMs: Number((result?.latency?.average || 0).toFixed(2)),
      p95Ms: p95,
      p99Ms: result?.latency?.p99 || 0,
      maxMs: result?.latency?.max || 0,
    },
    reliability: {
      errors,
      errorRate: Number(errorRate.toFixed(4)),
    },
    slo: {
      targetP95Ms: SLO_P95_MS,
      targetErrorRate: SLO_ERROR_RATE,
      p95Met: p95 <= SLO_P95_MS,
      errorRateMet: errorRate <= SLO_ERROR_RATE,
    },
  };
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const main = async () => {
  console.log(`Running benchmark against ${BASE_URL}`);

  const token = await maybeGetToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const scenarios = [
    {
      name: "health",
      config: {
        url: `${BASE_URL}/health`,
        method: "GET",
        duration: defaultDuration,
        connections: defaultConnections,
      },
    },
    {
      name: "auth_login",
      enabled: Boolean(process.env.PERF_LOGIN_EMAIL && process.env.PERF_LOGIN_PASSWORD),
      config: {
        url: `${BASE_URL}/api/auth/login`,
        method: "POST",
        duration: defaultDuration,
        connections: Math.max(5, Math.floor(defaultConnections / 2)),
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: process.env.PERF_LOGIN_EMAIL,
          password: process.env.PERF_LOGIN_PASSWORD,
        }),
      },
    },
    {
      name: "dashboard_stats",
      enabled: Boolean(token),
      config: {
        url: `${BASE_URL}/api/dashboard/stats`,
        method: "GET",
        duration: defaultDuration,
        connections: defaultConnections,
        headers: authHeaders,
      },
    },
    {
      name: "notifications",
      enabled: Boolean(token),
      config: {
        url: `${BASE_URL}/api/notifications`,
        method: "GET",
        duration: defaultDuration,
        connections: defaultConnections,
        headers: authHeaders,
      },
    },
  ];

  const activeScenarios = scenarios.filter((scenario) => scenario.enabled !== false);
  const results = [];

  for (const scenario of activeScenarios) {
    console.log(`Benchmarking: ${scenario.name}`);
    const raw = await runAutocannon(scenario.config);
    results.push(computeSummary(scenario.name, raw));
  }

  const allSloMet = results.every((row) => row.slo.p95Met && row.slo.errorRateMet);

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    settings: {
      duration: defaultDuration,
      connections: defaultConnections,
      slo: {
        p95Ms: SLO_P95_MS,
        errorRate: SLO_ERROR_RATE,
      },
    },
    results,
    overall: {
      allSloMet,
    },
  };

  ensureDir(RESULTS_DIR);
  const latestPath = path.join(RESULTS_DIR, "benchmark-latest.json");
  const datedPath = path.join(RESULTS_DIR, `benchmark-${Date.now()}.json`);

  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(datedPath, JSON.stringify(report, null, 2));

  console.log("Benchmark summary:");
  for (const row of report.results) {
    console.log(
      `${row.name} | p95=${row.latency.p95Ms}ms | errRate=${row.reliability.errorRate} | SLO=${
        row.slo.p95Met && row.slo.errorRateMet ? "PASS" : "FAIL"
      }`
    );
  }

  console.log(`Saved: ${latestPath}`);

  if (!allSloMet && shouldFailOnSlo) {
    process.exit(1);
  }
};

main().catch((error) => {
  console.error("Benchmark failed:", error.message);
  process.exit(1);
});
