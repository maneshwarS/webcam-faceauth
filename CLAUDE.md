# CLAUDE.md

## Project overview
Facial recognition authentication web app. Users sign up with credentials + face, then sign in via password+face 2FA or face-only login.

## Tech stack
- **Frontend**: React 19 + Vite, face-api.js (TensorFlow.js) for in-browser face detection
- **Backend**: Node.js + Express, SQLite via better-sqlite3, JWT auth (access + httpOnly refresh cookie)
- **Deployment**: Render (free tier), config in `render.yaml`

## Local development
```bash
# Terminal 1 — backend
cd backend && npm run dev    # Express on :3001

# Terminal 2 — frontend
cd frontend && npm run dev   # Vite on :5173, proxies /api to :3001
```

## Key architecture decisions
- **Atomic signup**: credentials + face descriptor are sent in a single POST to `/api/auth/signup`. No partial user records in DB if face capture fails.
- **Temp token pattern**: password sign-in returns a 60-second `temp_face_verify` JWT. User isn't logged in until face verification also passes via `/api/face/verify`.
- **Face descriptors**: 128-float arrays from face-api.js, stored as JSON text in SQLite. Server-side Euclidean distance matching with threshold 0.75.
- **All ML runs in browser**: face-api.js loads 4 models (~12MB) from `frontend/public/models/`. Server never sees raw images.
- **Access tokens in memory only**: stored in React state, never localStorage. Refresh tokens are httpOnly cookies.

## face-api.js model files
Located in `frontend/public/models/`. Required files (downloaded from face-api.js GitHub):
- ssd_mobilenetv1 (shard1 + shard2 + manifest)
- face_landmark_68 (shard1 + manifest)
- face_recognition (shard1 + shard2 + manifest)
- face_expression (shard1 + manifest)

**Do NOT** call `faceapi.env.monkeyPatch()` — it doesn't exist in the browser build and throws. face-api.js auto-detects the browser environment.

## Common pitfalls
- `better-sqlite3` requires native compilation. If Node version changes and install fails, try `npm install better-sqlite3@latest`.
- The Vite build command on Render needs `--include=dev` because Vite is a devDependency: `npm install --include=dev`.
- The backend serves the built frontend in production (`frontend/dist/` via `express.static`). Helmet CSP is disabled in prod to allow face-api.js model loading.

## Environment variables (backend/.env)
```
PORT=3001
JWT_SECRET=<random 64+ chars>
JWT_REFRESH_SECRET=<different random 64+ chars>
DB_PATH=./db/faceid.db
NODE_ENV=development
```

## Admin endpoint
`GET /api/admin/users?key=<JWT_SECRET>` — returns registered users (no passwords/descriptors). Protected by JWT_SECRET as query param.
