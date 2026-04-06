# HA Deployment and Observability Strategy

## HA deployment strategy

### Topology
- Stateless API service deployed with 3 replicas minimum.
- Externalized state:
  - MongoDB replica set/managed cluster.
  - Redis managed cache with failover.
- Traffic entry through Ingress + Service.

### Replica and failover readiness
- Kubernetes deployment sets `replicas: 3`.
- Readiness probe: `/readyz` checks Mongo and Redis readiness.
- Liveness probe: `/health` for process liveliness.
- PodDisruptionBudget enforces at least 2 pods available during voluntary disruptions.
- HPA scales from 3 to 10 replicas on CPU utilization.

### Rollout policy
- Rolling update with readiness gates prevents routing to unhealthy pods.
- Keep revision history to allow quick rollback.

## Structured logging
- JSON structured logs via pino and pino-http.
- Log fields include method, URL, status code, and standard service metadata.
- Sensitive fields are redacted (`authorization`, cookies, passwords, tokens).

## Centralized log sink
- Use Promtail or Fluent Bit as log shipper.
- Forward logs to Loki/Elastic/Splunk sink.
- Included sample promtail config at `observability/loki/promtail-config.yml`.

## Metrics and dashboards
- Prometheus metrics endpoint exposed at `/metrics`.
- API request counters and latency histograms exported.
- Dashboards provided at:
  - `observability/grafana/dashboards/worksync-api-dashboard.json`

## Alerting
- Prometheus alert rules included at:
  - `observability/prometheus/alert-rules.yml`
- Included alerts:
  - p95 latency above 300ms
  - 5xx error ratio above 1%
  - backend scrape down

## Runbook essentials
1. If `BackendDown` alert fires:
- Check readiness endpoint and pod events.
- Verify MongoDB/Redis connectivity.

2. If high latency alert fires:
- Inspect p95 panel by route.
- Check cache hit ratio and database query latency.
- Scale deployment or tune heavy endpoint queries.

3. If high error rate alert fires:
- Inspect logs in centralized sink for 5xx spikes.
- Roll back to previous deployment revision if caused by new release.
