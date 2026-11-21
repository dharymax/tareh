# TAREH Admin Dashboard

React + TypeScript + Vite administration frontend.

## Run locally
1. Start PostgreSQL and the NestJS API.
2. Configure VITE_API_BASE_URL in admin/.env if the API is not at http://localhost:3000/api/v1.
3. Run npm install at the repository root.
4. Run npm run dev:admin and open http://localhost:5173.

## Login
- Sign in with the OTP flow using a phone number that has been provisioned with an administrative role.
- The backend must have an SMS provider configured for production; local development codes are printed to the API terminal.
- To create the first Super Admin, follow the provisioning instructions in docs/DEVELOPMENT.md.
- Dashboard data is fetched from GET /api/v1/admin/dashboard and protected by the backend JWT and role guard.
- Access and refresh tokens remain in the page's memory only. Reloading the page requires signing in again.

## Current scope
The dashboard currently implements OTP login, health/readiness status and a role-protected summary view. Management pages for users, matches, competitions, predictions, provider synchronization, reports and audit logs are planned but not implemented yet.
