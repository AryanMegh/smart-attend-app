# SmartAttend

Face-verified, geofenced employee attendance — React + Vite + Firebase, with a Gemini-powered AI assistant.

**Employees** check in once a day (first check-in is final) and check out any time (the latest check-out wins). Each action needs a face match and a location check. **Admins** import the roster from Excel, watch attendance live, open any employee's dashboard/reports/history, and ask the AI assistant about the team.

## Quick start
```bash
npm install
cp .env.example .env     # fill Firebase + geofence + Gemini values
npm run dev              # http://localhost:5173
firebase deploy --only firestore   # publish rules + index
```
Full steps: [docs/09-SETUP.md](docs/09-SETUP.md).

## Stack
React 18 · Vite 7 · Tailwind v4 · shadcn/ui · Firebase Auth + Firestore · face-api.js · recharts · Gemini API.

## Documentation
| | |
|---|---|
| [PRD](docs/01-PRD.md) · [Design](docs/02-DESIGN.md) · [Architecture](docs/03-ARCHITECTURE.md) | what & how |
| [Database](docs/04-DATABASE.md) · [API](docs/05-API.md) · [Auth](docs/11-AUTH.md) | data & security |
| [Features](docs/10-FEATURES.md) · [Plan](docs/08-PLAN.md) · [Integration](docs/13-INTEGRATION.md) | scope & roadmap |
| [Agents](docs/06-AGENTS.md) · [MCP](docs/12-MCP.md) · [`CLAUDE.md`](CLAUDE.md) · [`SKILLS.md`](SKILLS.md) | AI & dev agents |
| [Setup](docs/09-SETUP.md) · [Testing](docs/14-TESTING.md) · [Debugging](docs/15-DEBUGGING.md) | run & fix |

## Project layout
```
src/pages        routes          src/lib        firestoreApi, geofence, face, gemini
src/components   UI               src/context    Auth, Attendance
firestore.rules  access control   scripts/       admin provisioning (dry-run by default)
```
## Security
Never commit `.env`, service-account keys or the employee spreadsheet. Restrict the Gemini key to your domain. See [docs/11-AUTH.md](docs/11-AUTH.md).
