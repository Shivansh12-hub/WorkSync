import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry, prefix: "worksync_" });

const httpRequestDurationSeconds = new Histogram({
  name: "worksync_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

const httpRequestsTotal = new Counter({
  name: "worksync_http_requests_total",
  help: "Total count of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [metricsRegistry],
});

const resolveRouteLabel = (req) => {
  if (req.route?.path) {
    return `${req.baseUrl || ""}${req.route.path}`;
  }
  if (req.path) {
    return req.path;
  }
  return "unknown";
};

export const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationSeconds = Number(end - start) / 1_000_000_000;
    const labels = {
      method: req.method,
      route: resolveRouteLabel(req),
      status_code: String(res.statusCode),
    };

    httpRequestDurationSeconds.observe(labels, durationSeconds);
    httpRequestsTotal.inc(labels);
  });

  next();
};

export const metricsHandler = async (req, res) => {
  res.set("Content-Type", metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
};
