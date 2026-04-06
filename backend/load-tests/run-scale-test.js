import fs from "node:fs";
import path from "node:path";
import autocannon from "autocannon";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(".env") });

const BASE_URL = process.env.PERF_BASE_URL || "http://localhost:5000";
const RESULTS_DIR = path.resolve("load-tests", "results");
const DURATION = Number(process.env.PERF_SCALE_DURATION || 30);
const CONNECTION_STEPS = (process.env.PERF_SCALE_CONNECTIONS || "10,25,50,100")
  .split(",")
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isFinite(v) && v > 0);

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

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const pickP95 = (latency = {}) =>
  latency.p95 ?? latency.p97_5 ?? latency.p99 ?? latency.average ?? 0;

const main = async () => {
  const rows = [];

  console.log(`Running scale test against ${BASE_URL}`);
  for (const connections of CONNECTION_STEPS) {
    console.log(`Connections: ${connections}`);
    const result = await runAutocannon({
      url: `${BASE_URL}/health`,
      method: "GET",
      connections,
      duration: DURATION,
    });

    rows.push({
      connections,
      requestsPerSec: Number((result?.requests?.average || 0).toFixed(2)),
      p95Ms: pickP95(result?.latency),
      p99Ms: result?.latency?.p99 || 0,
      maxMs: result?.latency?.max || 0,
      errors: (result.errors || 0) + (result.timeouts || 0) + (result.non2xx || 0),
      totalRequests: result?.requests?.total || 0,
    });
  }

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    duration: DURATION,
    rows,
  };

  ensureDir(RESULTS_DIR);
  const latestPath = path.join(RESULTS_DIR, "scale-latest.json");
  const datedPath = path.join(RESULTS_DIR, `scale-${Date.now()}.json`);

  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(datedPath, JSON.stringify(report, null, 2));

  console.table(rows);
  console.log(`Saved: ${latestPath}`);
};

main().catch((error) => {
  console.error("Scale test failed:", error.message);
  process.exit(1);
});
