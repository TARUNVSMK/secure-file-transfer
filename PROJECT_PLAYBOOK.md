# Secure File Transfer - Project Playbook

## 1. What this project is

This project is a full-stack secure file sharing application with extra QR and barcode tools.

Current product areas:

- `Landing page` with animated entry screen
- `Secure Link` flow for encrypted temporary file sharing
- `Share page` for viewing file details before download
- `QR Generator` with styling, logo, export, and copy features
- `Barcode Generator` with multiple barcode types and export/copy features

The main goal is:

- upload a file
- encrypt it on the backend
- store only encrypted data in storage
- share a temporary link
- auto-delete expired transfers

---

## 2. Current tech stack

### Frontend

- `React 19`
- `Vite 7`
- `JavaScript / JSX` for the main app
- `TypeScript support enabled` for UI/component integration
- `Tailwind CSS support enabled`
- `shadcn-style project structure enabled`
- Custom CSS in `frontend/src/styles.css`
- UI animation/components from:
  - `gsap`
  - `simplex-noise`
  - `qr-code-styling`
  - `react-qr-code`

### Backend

- `Node.js 24+`
- `Express 5`
- `multer` for uploads
- `helmet` for security headers
- `cors`
- `morgan`
- `express-rate-limit`

### Data + storage

- `MongoDB Atlas` for transfer metadata in cloud mode
- `Cloudflare R2` for encrypted file storage in cloud mode
- `SQLite + local filesystem` fallback in local mode

### Deployment targets

- `Frontend`: Vercel or Netlify style static hosting
- `Backend`: Render style Node hosting

---

## 3. Repository structure

```text
securefiletransfer/
├─ frontend/
│  ├─ src/
│  │  ├─ App.jsx
│  │  ├─ main.jsx
│  │  ├─ styles.css
│  │  ├─ lib/
│  │  └─ components/ui/
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ components.json
├─ backend/
│  ├─ src/
│  │  ├─ app.js
│  │  ├─ server.js
│  │  ├─ config.js
│  │  ├─ routes/files.js
│  │  ├─ services/
│  │  ├─ repositories/
│  │  ├─ db/
│  │  └─ lib/
│  ├─ tests/
│  ├─ .env.example
│  └─ package.json
├─ README.md
└─ PROJECT_PLAYBOOK.md
```

---

## 4. Important files

### Frontend

- `frontend/src/App.jsx`
  - main application logic
  - tab switching
  - secure upload UI
  - share page UI
  - QR generator UI
  - barcode generator UI

- `frontend/src/styles.css`
  - most of the current UI and responsive behavior
  - wave background integration
  - landing screen styling
  - tool dashboards

- `frontend/src/components/ui/demo.tsx`
  - animated landing entry screen

- `frontend/src/components/ui/spiral-animation.tsx`
  - spiral landing animation

- `frontend/src/components/ui/wave-background.tsx`
  - animated background used behind the app

- `frontend/components.json`
  - shadcn-style component aliases and CSS config

### Backend

- `backend/src/app.js`
  - Express app setup
  - CORS, Helmet, rate limits
  - health endpoint
  - file routes

- `backend/src/routes/files.js`
  - upload
  - metadata fetch
  - download
  - delete

- `backend/src/config.js`
  - env parsing
  - runtime mode selection
  - expiry and upload limits

- `backend/src/services/runtimeStorage.js`
  - switches between R2 and local file storage

- `backend/src/services/expiredTransferCleanup.js`
  - scheduled cleanup for expired transfers

---

## 5. Runtime modes

The backend can run in three modes.

### `cloud`

Used when all required cloud config is present:

- `MONGO_URI`
- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

Behavior:

- metadata goes to MongoDB Atlas
- encrypted files go to Cloudflare R2

### `local`

Used when cloud config is missing but `ALLOW_LOCAL_FALLBACK=true`.

Behavior:

- metadata uses local SQLite
- encrypted files are stored on disk

### `degraded`

Used when cloud config is missing and local fallback is disabled.

Behavior:

- API health returns degraded status
- uploads should not proceed

---

## 6. Frontend application flow

### Route model

The frontend currently uses hash-based routing logic instead of React Router.

Main route states:

- `#/` → landing screen
- `#/share/:token` → share/download details page
- `#works` → main tool interface

### UI flow

1. User lands on the animated landing page
2. User clicks `Enter`
3. App moves to `#works`
4. User uses one of three tabs:
   - `Secure Link`
   - `QR Generator`
   - `Barcode Generator`

### Secure Link flow in frontend

1. User selects a file
2. User sets lifetime
3. Frontend sends upload request to backend
4. Backend returns metadata + share token
5. Frontend shows:
   - QR code
   - copy link
   - copy QR
   - open link
   - expiry details

### Share page flow

When another user opens a shared URL:

1. frontend reads the share token from hash route
2. frontend fetches metadata from backend
3. share page shows:
   - filename
   - size
   - expiry
   - countdown
   - download button
4. download happens in a separate request

### QR Generator flow

Supports:

- single payload
- vCard builder
- batch mode
- styling presets
- dot/eye/pupil/canvas customization
- logo upload
- export PNG/SVG
- copy content
- copy QR image

### Barcode Generator flow

Supports multiple symbologies, including:

- Micro QR
- Data Matrix
- Aztec
- PDF417
- Code 128
- Code 39
- EAN-13
- UPC-A

Supports:

- single mode
- batch preparation
- size and padding
- foreground/background colors
- PNG/SVG export
- clipboard copy

---

## 7. Backend processing workflow

### Upload flow

`POST /api/files/upload`

1. request hits upload rate limiter
2. `multer` stores the uploaded file temporarily in `backend/tmp/`
3. backend validates expiry seconds
4. backend generates a random `shareToken`
5. backend encrypts the file using AES-256-GCM
6. encrypted file is uploaded to:
   - `Cloudflare R2` in cloud mode
   - `backend/storage/` in local mode
7. metadata record is created in:
   - `MongoDB` in cloud mode
   - `SQLite` in local mode
8. temp files are deleted
9. frontend receives response with share metadata

### Download flow

`GET /api/files/:shareToken/download`

1. backend loads metadata by share token
2. backend rejects missing or expired transfers
3. backend reads encrypted object from storage
4. backend decrypts to a temporary file
5. backend increments download count
6. backend streams download to user
7. backend deletes temporary decrypted file

### Metadata flow

`GET /api/files/:shareToken`

Returns transfer metadata only.

It does **not** expose the encryption key.

### Delete flow

`DELETE /api/files/:shareToken`

1. backend checks transfer existence
2. if `DELETE_TOKEN` is configured, backend validates it
3. backend deletes stored encrypted object
4. backend deletes transfer metadata

### Cleanup flow

1. cleanup job runs every `CLEANUP_INTERVAL_SECONDS` in the long-running Node server and every minute on Netlify scheduled functions
2. expired transfers are located
3. storage object is removed
4. metadata record is deleted
5. expired links are also purged on access if a user hits them before the scheduled cleanup
6. Netlify API traffic also triggers a throttled best-effort cleanup pass between scheduled runs

---

## 8. Access tokens, credentials, and env variables

## Important rule

Do **not** store real credentials in markdown, source files, screenshots, or Git.

Use:

- `backend/.env`
- `frontend/.env`

and commit only:

- `backend/.env.example`
- `frontend/.env.example`

### Backend environment variables

#### Public or operational config

- `PORT`
- `CLIENT_URL`
- `PUBLIC_API_BASE_URL`
- `MAX_UPLOAD_SIZE_MB`
- `DEFAULT_EXPIRY_SECONDS`
- `ALLOW_LOCAL_FALLBACK`
- `CLEANUP_INTERVAL_SECONDS`
- `API_RATE_LIMIT_WINDOW_MS`
- `API_RATE_LIMIT_MAX`
- `UPLOAD_RATE_LIMIT_WINDOW_MS`
- `UPLOAD_RATE_LIMIT_MAX`

#### Sensitive credentials

- `MONGO_URI`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `DELETE_TOKEN`

#### Cloud storage config

- `R2_ENDPOINT_URL`
- `R2_BUCKET_NAME`
- `R2_REGION`

### Frontend environment variables

- `VITE_API_BASE_URL`

This is not a secret. It tells the frontend where the backend API lives.

### What this project does **not** currently use

There is currently no full user authentication system in the app.

That means:

- no login flow
- no user accounts
- no session cookies
- no JWT-based user auth in active product flow

Current access control is based on:

- opaque share tokens for file access
- optional `DELETE_TOKEN` for forced deletion

### Security handling notes

- encryption is handled only on the backend
- encryption key is not returned to the frontend
- frontend only receives share-safe metadata
- expired transfers are purged automatically
- do not expose `.env` values in logs or docs

---

## 9. API surface

### `GET /api/health`

Used by frontend and developers to inspect:

- runtime mode
- storage backend
- upload limits
- expiry limits
- cleanup interval
- fallback status

### `POST /api/files/upload`

Multipart upload endpoint.

Main fields:

- `file`
- `expirySeconds`

### `GET /api/files/:shareToken`

Returns metadata for the share page.

### `GET /api/files/:shareToken/download`

Downloads the decrypted file.

### `DELETE /api/files/:shareToken`

Deletes a transfer immediately.

If `DELETE_TOKEN` is configured, it must be sent in:

- `x-delete-token` header
- or request body `{ "token": "..." }`

---

## 10. Current development commands

### From repo root

Install:

```bash
npm install
```

Run both frontend and backend:

```bash
npm run dev
```

Run only backend:

```bash
npm run dev:backend
```

Run only frontend:

```bash
npm run dev:frontend
```

Build frontend:

```bash
npm run build
```

Run backend tests:

```bash
npm test
```

### Runtime URLs during local development

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health: `http://localhost:5000/api/health`

---

## 11. Recommended development workflow for this repo

This is the practical workflow we should keep using.

### Step 1 — Install

```bash
npm install
```

### Step 2 — Configure env

- copy `backend/.env.example` to `backend/.env`
- copy `frontend/.env.example` to `frontend/.env`
- fill only the values needed for the intended runtime mode

### Step 3 — Start local dev

```bash
npm run dev
```

### Step 4 — Verify runtime

Check:

- frontend loads
- backend health returns `ok` or expected runtime state
- secure upload works
- share page opens
- QR copy/export works
- barcode copy/export works

### Step 5 — Make changes

Preferred order:

1. inspect relevant files
2. make focused patch
3. verify the changed feature
4. run frontend build
5. run backend tests if backend logic changed

### Step 6 — Before shipping

Always verify:

- no secrets were committed
- frontend builds
- backend tests pass
- local/production env variables are documented
- responsive layout still works

---

## 12. UI / UX architecture notes

### Current UI direction

The app currently uses:

- dark glass surfaces
- animated `21st.dev`-style wave background
- custom dashboard-style layouts
- animated landing page

### Frontend styling reality

The project supports:

- `TypeScript`
- `Tailwind`
- `shadcn-style folders`

But the main app is still primarily built with:

- `React JSX`
- `custom CSS`

This means future work should be careful about mixing:

- pure CSS patterns already in `styles.css`
- new component-based UI patterns from `components/ui`

---

## 13. Deployment overview

### Frontend deployment

Deploy `frontend/` as a static site.

Required env:

- `VITE_API_BASE_URL`

### Backend deployment

Deploy `backend/` as a Node service.

Required env depends on runtime mode:

- for cloud mode: Mongo + R2 values
- for local-like fallback: not recommended for production

### Cloud requirements

#### MongoDB Atlas

- database for transfer metadata
- network access for backend host
- connection string in `MONGO_URI`

#### Cloudflare R2

- bucket created
- API credentials created
- endpoint URL configured

---

## 14. Project risks / constraints

### Current architectural constraints

- no full auth/user system
- hash-based routing instead of a router library
- main app logic is concentrated in `frontend/src/App.jsx`
- most styling is centralized in one large `frontend/src/styles.css`

### Practical impact

- fast iteration is possible
- but large UI changes require careful CSS regression checking
- feature work should stay disciplined and localized

---

## 15. Suggested future cleanup roadmap

If we continue improving the project, this is the clean order.

### High value

1. Split `frontend/src/App.jsx` into feature modules
2. Split `frontend/src/styles.css` into feature-level style files
3. Add frontend component tests for generators and share page
4. Add end-to-end flow test for upload → share → download
5. Add a proper router if route complexity grows

### Security / operations

1. Add secret scanning in CI
2. Add structured logging
3. Add upload malware scanning if needed
4. Add audit logging for delete actions

---

## 16. Quick reference

### Main user features

- temporary encrypted file link
- QR generation
- barcode generation
- share page with file details and download
- auto-expiry cleanup

### Main secrets

- `MONGO_URI`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `DELETE_TOKEN`

### Main commands

```bash
npm install
npm run dev
npm run build
npm test
```

### Main URLs

- `http://localhost:5173`
- `http://localhost:5000`
- `http://localhost:5000/api/health`

---

## 17. Bottom line

This project is a secure temporary file sharing app with generator tools layered into the same frontend.

The backend is responsible for:

- encryption
- storage
- metadata
- cleanup

The frontend is responsible for:

- upload UX
- share UX
- QR/barcode generation UX
- responsive interaction layer

For ongoing work, the safest approach is:

- keep secrets in env files only
- verify runtime via `/api/health`
- keep UI changes localized
- build after frontend changes
- test after backend changes
