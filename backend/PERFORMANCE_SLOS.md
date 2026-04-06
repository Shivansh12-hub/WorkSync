# Performance SLIs and SLOs

## Objective
Normal-load API performance target is p95 latency under 300 ms with low error rate.

## SLIs
1. Latency SLI:
- Definition: p95 response time per endpoint (ms)
- Source: `autocannon` latency metrics in benchmark reports

2. Availability SLI:
- Definition: success rate = 1 - ((errors + timeouts + non2xx) / total requests)
- Source: benchmark report reliability block

3. Throughput SLI:
- Definition: average requests per second per endpoint
- Source: benchmark report requests block

## SLOs
1. Latency SLO:
- p95 <= 300 ms for normal load profile

2. Reliability SLO:
- error rate <= 1.0%

3. Throughput SLO:
- non-degrading throughput under step-load health check profile

## Normal Load Profile
- Duration: 20s per scenario
- Connections: 20
- Endpoints:
  - `/health`
  - `/api/auth/login` (if PERF_LOGIN_EMAIL/PERF_LOGIN_PASSWORD are set)
  - `/api/dashboard/stats` (if token is available)
  - `/api/notifications` (if token is available)

## Scale Profile
- Endpoint: `/health`
- Duration: 30s per step
- Connection steps: 10, 25, 50, 100

## How to run
1. Install dependencies:
- `npm install`

2. Optional env for authenticated scenarios:
- `PERF_BASE_URL=http://localhost:5000`
- `PERF_LOGIN_EMAIL=<valid user email>`
- `PERF_LOGIN_PASSWORD=<valid user password>`

3. Run normal benchmark:
- `npm run perf:test`

4. Run strict benchmark (non-zero exit if SLO fails):
- `npm run perf:test:strict`

5. Run scale test:
- `npm run perf:scale`

## Evidence files
Generated evidence is saved under:
- `load-tests/results/benchmark-latest.json`
- `load-tests/results/scale-latest.json`
