# WorkSync Frontend

Frontend for the WorkSync employee-manager-admin workflow platform.

## Stack

- React + Vite
- Axios for API communication
- Zustand for auth state
- Recharts for manager analytics charts
- Sonner for toast notifications

## Role-based experience

- Employee:
	- Register/login
	- Submit and edit daily updates
	- View own update history
	- View manager feedback and notifications
- Manager:
	- View team updates
	- Apply filters by status, employee, and date
	- Submit feedback on team updates
	- View team metrics cards and trend charts
- Admin:
	- Manage users (create, update, delete)
	- Filter/search users
	- Manage runtime settings

## Prerequisites

- Node.js 18+
- Backend API running at `http://localhost:5000`

## Local development

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

3. Open app:

- `http://localhost:5173`

## API configuration

API client is configured in `src/api/axios.js`.

- Current base URL: `http://localhost:5000/api`

If backend host changes, update the `baseURL` in that file.

## Key UI pages

- `src/pages/Login.jsx`
- `src/pages/Register.jsx`
- `src/pages/EmployeeDashboard.jsx`
- `src/pages/ManagerDashboard.jsx`
- `src/pages/AdminDashboard.jsx`

## Manager analytics notes

Manager dashboard reads:

- `GET /api/dashboard/team-metrics`

It renders:

- KPI cards (team size, total updates, completion, blockers)
- Operational KPIs (daily submission %, engagement, blocker reduction, interactions/day)
- Time-series charts for completion and blocked/unresolved trends

## Notifications

Notification bell supports:

- Missed update alerts
- Blocked task alerts
- Feedback received alerts
- Reminder alerts

## Troubleshooting

- If dashboard shows stale/zero values, refresh page and verify backend is running.
- If login fails with network error, confirm backend is reachable at `http://localhost:5000`.
- If role-protected page redirects unexpectedly, clear local storage token and login again.

## Related backend checks

From the backend folder, these scripts validate end-to-end behavior:

```bash
node load-tests/role-workflow-check.js
node load-tests/smoke-check.js
node load-tests/manager-flow-check.js
```
