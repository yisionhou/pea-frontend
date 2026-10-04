# PEA Frontend

The Vue 3 web application for the Performance Evidence Auditor (PEA), built with TypeScript, Element Plus, Vue Router, Pinia, and Vite. It connects to the [FastAPI backend](../pea-backend/README.md) and uses an English black, white, and gray interface.

## Implemented Pages

| Page | Implemented Content |
| --- | --- |
| Login | Username/password sign-in, rate-limit countdown, session restoration, and safe redirects |
| Workspace | Authorized actions, record lookup by ID, and recent records for the current browser tab |
| New Audit | Claim and criterion fields, review period, optional benchmark, evidence editor, and rule/model selection |
| Audit Details | Assessment label, four analysis dimensions, evidence citations, gaps, contradictions, excluded evidence, and human reviews |
| Follow-up Details | Retrieval trace, new evidence, re-audit outcome, and before/after labels |
| New Evaluation | Authorized evaluation profiles, configuration checks, submission, and experiment lookup |
| Evaluation Report | Progress polling, accuracy and classification metrics, confusion matrix, follow-up metrics, and filtered results |

Additional functionality includes responsive layouts, mobile navigation, unsaved-form prompts, request cancellation, bounded polling retries, and explicit follow-up confirmation. Evidence is rendered as plain text. Production forms do not contain prefilled test fixtures.

The model selector supports the backend profiles `deepseek` and `claude`. The latter appears as **Claude Sonnet 5** and uses OpenRouter through the backend.

## Requirements

- Node.js 22.18 or later and npm.
- The sibling `pea-backend` project and its configured Python environment.
- A login account configured in the backend's `AUTH_ACCOUNTS` setting.

The expected directory layout is:

```text
Practice/
  pea-backend/
  pea-frontend/
```

## First-Time Setup

Start in the `Practice` directory:

```powershell
cd .\pea-frontend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Keep an existing `.env` rather than overwriting local settings. Follow the [backend setup instructions](../pea-backend/README.md#first-time-setup) to install Python dependencies and configure a login account.

## Start the Application

Open two PowerShell terminals, each initially in `Practice`.

In the first terminal, start the backend:

```powershell
cd .\pea-backend
.\.venv\Scripts\python.exe -m app serve
```

In the second terminal, start the frontend:

```powershell
cd .\pea-frontend
npm run dev
```

Open **[http://127.0.0.1:5173](http://127.0.0.1:5173)** and sign in with an account from the backend configuration. Keep both terminals running; use `Ctrl+C` to stop either server. Dependencies only need reinstalling for a fresh setup or dependency changes.

The Vite development server proxies `/v1` requests to `http://127.0.0.1:8000`. To confirm backend availability, open its [health endpoint](http://127.0.0.1:8000/health).

For an initial functional check, open **New Audit**, enter a case ID, employee ID, criterion, and claim, select **Rule-based**, and submit. Evidence may be empty. For model testing, configure the appropriate API key in the backend, choose **Model-based**, and select a model profile.

## Environment Configuration

The frontend `.env` contains public configuration only. `VITE_` settings are included in browser assets. Keep provider API keys, passwords, password hashes, and the backend account configuration in the backend `.env`.

| Setting | Example Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Empty | Same-origin API requests; set an API origin for a separate backend deployment |
| `API_PROXY_TARGET` | `http://127.0.0.1:8000` | Backend target for the development proxy |
| `VITE_MODEL_PROFILES` | `deepseek,claude` | Available audit model profile names |
| `VITE_RUBRIC_VERSION` | `v1.0` | Requested audit rubric version; restart the backend with the matching rubric configuration |
| `VITE_ENABLE_EVALUATION_SUBMIT` | `false` | Enable evaluation submission in the UI |
| `VITE_EVALUATION_PROFILES` | `core_dev,core_holdout,agent_eval` | Evaluation profiles, filtered by account permissions |
| `VITE_AGENT_PROFILE` | `tiny` | Follow-up agent profile |
| `VITE_ALLOW_PARTIAL_FOLLOWUP` | `false` | Allow follow-ups for partially supported audits when also enabled on the backend |
| `VITE_HOLDOUT_FROZEN` | `false` | Whether the holdout dataset has been frozen |
| `VITE_LABELS_CONFIRMED` | `false` | Whether reference labels have been confirmed |
| `VITE_RUBRIC_CONFIRMED` | `false` | Whether the rubric has been confirmed |
| `VITE_MAX_EVIDENCE` | `30` | Maximum evidence items |
| `VITE_MAX_EVIDENCE_ITEM_CHARS` | `4000` | Maximum Unicode code points per evidence item |
| `VITE_MAX_EVIDENCE_CHARS` | `24000` | Maximum total evidence text length |

Restart `npm run dev` after changing `.env`. Production deployments require a new build. Frontend flags control presentation; backend permissions and validation remain authoritative. Keep corresponding frontend and backend settings aligned.

## Enable Evaluations

Set these values in the corresponding files:

```dotenv
# pea-frontend/.env
VITE_ENABLE_EVALUATION_SUBMIT=true

# pea-backend/.env
ENABLE_EVALUATION_HTTP=true
```

Restart both servers and use **New Evaluation -> Development Set Comparison (`core_dev`)** for development testing. The supplied development set contains 40 cases. Evaluation methods and budgets come from the backend's `EVALUATION_PROFILES`, not the audit model selector.

The account needs evaluation permission and access to the selected profile. Holdout evaluations additionally require dataset freezing, confirmed labels and rubric, and matching backend hashes. Model-based evaluations make paid API calls.

## Session and Submission Behavior

- Login tokens are stored in `sessionStorage`; the backend verifies the session on refresh. Logout revokes the session and clears local session data.
- A `401` response returns the user to login; a `403` response preserves the session and displays an access error.
- Recent-record metadata is limited to 20 entries per user and browser tab. Evidence text is not stored in the recent-record list.
- Business POST requests are not automatically retried. Retrying an unchanged form on the same page reuses its idempotency key.
- Form drafts are held in memory. Refreshing or leaving the page discards them. Canceling browser waiting does not necessarily cancel a running backend job.

## Tests and Build

Run from `pea-frontend`:

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests cover request/session behavior, validation, and polling. Playwright tests cover the main page flows, model selection, review submission, permissions, follow-up confirmation, and responsive layouts. Browser API fixtures are confined to tests.

To run a rule-audit smoke test against an isolated real backend:

```powershell
..\pea-backend\.venv\Scripts\python.exe tests\smoke_backend.py
```

The smoke test uses temporary accounts, data, and server ports. It does not alter the existing backend configuration or call paid models. Screenshots are written to `test-results/screenshots/`. See the [verification notes](docs/verification.md) for further details.

## Deployment

`npm run build` produces `dist/`. `npm run preview` serves that build locally, normally at `http://127.0.0.1:4173`, but does not include the development API proxy. Use `npm run dev` for local frontend/backend integration.

For deployment, serve `dist/` through a static web server and reverse-proxy `/v1/` to FastAPI. Non-API application routes must fall back to `index.html`. An example is provided in [deploy/nginx.conf.example](deploy/nginx.conf.example). If the API uses a different origin, set `VITE_API_BASE_URL` before building and configure backend CORS accordingly.

## Project Structure

```text
src/api/          HTTP requests, errors, and cancellation
src/config/       Public environment configuration
src/domain/       Validation, display, idempotency, and polling logic
src/types/        API and application types
src/stores/       Authentication and recent-record state
src/router/       Routing and session guards
src/composables/  Submission, polling, and unsaved-form helpers
src/components/   Shared evidence, review, status, and metric components
src/layouts/      Sidebar and application header
src/pages/        Seven application pages and the not-found page
src/styles/       Theme and responsive styles
tests/            Unit, browser, and real-backend smoke tests
deploy/           Deployment configuration examples
```

Design references: [frontend design](../pea-backend/docs/frontend-design.md) and [English black-theme mockups](../pea-backend/docs/frontend-images/en-black/README.md).
