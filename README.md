# Secure File Transfer

Secure File Transfer is a full-stack web application that combines three tools in one interface:

- Secure file sharing with expiring links
- QR code generation with styling and export options
- Barcode generation with multiple formats

This documentation intentionally uses placeholder values only. No personal data, private credentials, real emails, or real cloud secrets are included here.

## What The Project Does

The main secure-sharing flow lets a user upload a file, generate a temporary share link, and download the file before the link expires.

Depending on runtime mode, the upload path works in one of two ways:

- Local Express mode:
  the backend receives the file, encrypts it, stores the encrypted file, and serves decrypted downloads through the API
- Cloud / Netlify mode:
  the browser encrypts the file, uploads the encrypted blob directly to object storage, and later decrypts it in the browser during download

The app also includes:

- A QR generator with presets, colors, shapes, logo upload, PNG export, SVG export, and clipboard copy
- A barcode generator with several supported symbologies, PNG and SVG export, and clipboard copy

## Core Features

- AES-256-GCM file encryption
- Expiring secure download links
- Automatic cleanup for expired transfers
- File-size enforcement
- Per-IP API throttling
- Per-IP upload quota protection
- Per-IP concurrent upload protection
- QR download as PNG
- Responsive single-page interface with animated background

## Current Upload Rules

These values are configurable through environment variables, but the current documented defaults are:

- Maximum file size: smaller than `4 MB`
- Minimum link lifetime: `31 seconds`
- Maximum link lifetime: `23:59:59`
- Default link lifetime: `31 seconds`
- Upload quota per IP: `5 uploads` every `10 minutes`
- Concurrent uploads per IP: `2`

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 7, JavaScript / JSX, Tailwind support, custom CSS |
| Backend | Node.js 24+, Express 5 |
| Upload handling | multer |
| Security headers | helmet |
| Request logging | morgan |
| Rate limiting | express-rate-limit plus custom upload guards |
| Cloud database | MongoDB Atlas |
| Cloud object storage | Cloudflare R2 |
| Local database fallback | SQLite |
| Local object storage fallback | filesystem storage under `backend/storage/` |
| Production serverless option | Netlify Functions |
| Alternative API deployment template | Render Blueprint via `render.yaml` |

## Repository Structure

```text
securefiletransfer/
|- backend/
|  |- src/
|  |  |- app.js
|  |  |- server.js
|  |  |- config.js
|  |  |- routes/
|  |  |- services/
|  |  |- repositories/
|  |  |- db/
|  |  `- lib/
|  |- tests/
|  |- .env.example
|  `- package.json
|- frontend/
|  |- src/
|  |  |- App.jsx
|  |  |- main.jsx
|  |  |- styles.css
|  |  |- components/
|  |  `- lib/
|  |- .env.example
|  `- package.json
|- netlify/
|  `- functions/api.js
|- netlify.toml
|- render.yaml
|- PROJECT_PLAYBOOK.md
`- README.md
```

## Main Runtime Modes

### Cloud mode

Cloud mode is active when the required MongoDB and R2 settings are present.

Behavior:

- transfer metadata is stored in MongoDB
- encrypted files are stored in Cloudflare R2
- the app can support cloud and serverless deployment paths

### Local fallback mode

Local fallback mode is active when cloud configuration is missing and `ALLOW_LOCAL_FALLBACK=true`.

Behavior:

- transfer metadata is stored in SQLite
- encrypted files are stored on the local filesystem
- local development can continue without cloud services

### Degraded mode

Degraded mode is active when cloud services are unavailable and local fallback is disabled.

Behavior:

- health endpoint reports degraded status
- uploads should not proceed

## User Flows

### 1. Secure link flow

1. The user selects a file.
2. The user chooses a lifetime.
3. The upload is validated against file size and IP-based protections.
4. The file is encrypted.
5. The encrypted payload is stored.
6. A share token is created.
7. The UI displays the temporary link, countdown, QR code, and export/copy actions.

### 2. Share / download flow

1. The recipient opens the share route.
2. The app fetches transfer metadata.
3. If the link is still valid, the file is downloaded.
4. In local Express mode, the backend decrypts the file before response.
5. In Netlify direct-upload mode, the browser decrypts the encrypted download using transfer metadata.

### 3. QR generator flow

The QR tool supports:

- single text / URL mode
- vCard builder mode
- batch mode
- color and shape customization
- logo upload
- PNG export
- SVG export
- clipboard copy of content
- clipboard copy of rendered QR image

### 4. Barcode generator flow

The barcode tool supports:

- Data Matrix
- Aztec
- PDF417
- Code 128
- Code 39
- EAN-13
- UPC-A

It also supports PNG export, SVG export, and clipboard copy.

## Local Development

### Requirements

- Node.js `24+`
- npm

Cloud services are optional for local development if local fallback mode is enabled.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure backend environment

Copy the example file:

```bash
copy backend\\.env.example backend\\.env
```

Use placeholder values or your own runtime values. Do not commit real secrets.

### 3. Configure frontend environment

Copy the example file:

```bash
copy frontend\\.env.example frontend\\.env
```

### 4. Start the app

```bash
npm run dev
```

This starts:

- frontend at `http://localhost:5173`
- backend at `http://localhost:5000`

## Environment Variables

### Backend variables

The backend reads `backend/.env`. A safe starter example is included in [backend/.env.example](./backend/.env.example).

| Variable | Required | Example / Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | No | `5000` | Local backend port |
| `CLIENT_URL` | Yes for browser access control | `http://localhost:5173` | Allowed frontend origin(s), comma-separated |
| `PUBLIC_API_BASE_URL` | Recommended | `http://localhost:5000` | Base URL used in generated API links |
| `MONGO_URI` | Cloud mode only | `mongodb+srv://username:password@example.mongodb.net/secure-file-transfer` | MongoDB connection string |
| `R2_ENDPOINT_URL` | Cloud mode only | `https://<account-id>.r2.cloudflarestorage.com` | Cloudflare R2 endpoint |
| `R2_ACCESS_KEY_ID` | Cloud mode only | `your-r2-access-key-id` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloud mode only | `your-r2-secret-access-key` | R2 secret key |
| `R2_BUCKET_NAME` | Cloud mode only | `secure-file-transfer` | R2 bucket name |
| `R2_REGION` | No | `auto` | R2 region |
| `DELETE_TOKEN` | Optional | `change-me` | Protects delete endpoint calls |
| `MAX_UPLOAD_SIZE_MB` | No | `4` | Maximum allowed upload size |
| `DEFAULT_EXPIRY_SECONDS` | No | `31` | Default secure-link lifetime |
| `ALLOW_LOCAL_FALLBACK` | No | `true` | Enables SQLite/filesystem fallback |
| `CLEANUP_INTERVAL_SECONDS` | No | `60` | Expired-transfer cleanup interval |
| `API_RATE_LIMIT_WINDOW_MS` | No | `900000` | Global API rate-limit window |
| `API_RATE_LIMIT_MAX` | No | `300` | Global API rate-limit request count |
| `UPLOAD_RATE_LIMIT_WINDOW_MS` | No | `900000` | Generic upload request window |
| `UPLOAD_RATE_LIMIT_MAX` | No | `50` | Generic upload request count |
| `UPLOADS_PER_IP_WINDOW_MS` | No | `600000` | Upload quota window per IP |
| `UPLOADS_PER_IP_WINDOW_MAX` | No | `5` | Max completed uploads per IP within the quota window |
| `CONCURRENT_UPLOAD_LIMIT_PER_IP` | No | `2` | Max active uploads from one IP |
| `CONCURRENT_UPLOAD_COOLDOWN_MS` | No | `60000` | Cooldown after concurrent-upload limit is exceeded |

### Frontend variables

The frontend reads `frontend/.env`. A safe starter example is included in [frontend/.env.example](./frontend/.env.example).

| Variable | Required | Example / Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Optional in same-origin deployments | `http://localhost:5000` | API origin for frontend requests |

## HTTP API Overview

### Health

`GET /api/health`

Returns:

- runtime status
- storage backend
- database mode
- upload size limit
- expiry limits
- upload quota settings
- concurrency settings

### Local Express upload

`POST /api/files/upload`

Used in local Express mode. The backend accepts multipart form data, encrypts the file, stores it, and returns transfer metadata.

### Netlify direct upload init

`POST /api/files/upload/init`

Used in serverless direct-upload mode. Returns signed upload data for the encrypted blob.

### Netlify direct upload complete

`POST /api/files/upload/complete`

Finalizes the transfer after the encrypted upload has reached object storage.

### Transfer metadata

`GET /api/files/:shareToken`

Returns the transfer details if the link is still valid.

### Download record endpoint

`POST /api/files/:shareToken/downloaded`

Used in the direct-upload / browser-decrypt flow to record a completed download.

### Delete transfer

`DELETE /api/files/:shareToken`

Deletes a transfer immediately. If `DELETE_TOKEN` is configured, provide it either:

- in `x-delete-token`
- or in a JSON body as `{ "token": "..." }`

## Security Notes

- Files are encrypted before storage
- The app does not store unencrypted file blobs in permanent storage
- File downloads expire automatically
- Temporary files created during processing are cleaned up
- Helmet is enabled for HTTP security headers
- CORS is restricted to configured client origins
- API traffic is rate-limited
- Upload traffic is protected by:
  - generic request throttling
  - completed-upload quota per IP
  - concurrent-upload protection per IP

## Storage Behavior

### Local mode

- metadata is stored in SQLite under `backend/data/`
- encrypted files are stored under `backend/storage/`
- temporary processing files are created under `backend/tmp/`

### Cloud mode

- metadata is stored in MongoDB
- encrypted blobs are stored in Cloudflare R2

## Deployment Paths

### Netlify

This repo includes [netlify.toml](./netlify.toml) and a serverless API entry at [netlify/functions/api.js](./netlify/functions/api.js).

Typical production behavior on Netlify:

- frontend is served from `frontend/dist`
- API routes are handled by `netlify/functions/api.js`
- encrypted upload can happen in the browser before direct object-storage upload

### Render / traditional Node hosting

This repo also includes [render.yaml](./render.yaml) for a Node-hosted backend deployment path.

If you use Render or another Node host:

- the Express app runs from `backend/src/server.js`
- review all environment values before deployment
- do not copy any real local `.env` file into hosted documentation or source control

## Testing And Validation

Run the main checks with:

```bash
npm test
npm run build --workspace frontend
```

Backend tests currently cover:

- encryption round-trip
- upload concurrency guard behavior
- upload quota guard behavior

## Troubleshooting

### Frontend cannot reach backend

Check:

- `VITE_API_BASE_URL`
- backend `PORT`
- backend `CLIENT_URL`

### API health reports degraded mode

Check:

- cloud variables are missing and local fallback is disabled
- or storage/database credentials are incomplete

### Upload rejected immediately

Possible causes:

- file size exceeds configured limit
- upload quota per IP has been reached
- concurrent upload limit per IP has been reached
- requested lifetime is outside allowed range

### Link expires too quickly

Check:

- `DEFAULT_EXPIRY_SECONDS`
- `minExpirySeconds` and `maxExpirySeconds` returned by `/api/health`

## Documentation And Privacy

- This README uses placeholder values only.
- Example credentials in `.env.example` are fake and safe.
- Real `.env` files are gitignored and should never be committed.
- If you publish this repository, review logs, screenshots, and deployment settings to ensure no personal data is exposed.
