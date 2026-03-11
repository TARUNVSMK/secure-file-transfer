# Secure File Transfer

Secure File Transfer is a full-stack file sharing app with three tools in one interface:

- secure file link sharing
- styled QR code generation
- barcode generation

The upload flow encrypts files with AES-256-GCM, creates expiring share links, and removes expired files automatically. The frontend is built with React and Vite, and the production backend now runs through Netlify Functions with MongoDB Atlas and Cloudflare R2.

## Highlights

- Encrypted file sharing with expiring download links
- File uploads must stay below `4 MB`
- Automatic expiry cleanup for shared files
- QR code generator with color, shape, logo, and export controls
- Barcode generator with multiple formats and export actions
- Local fallback mode for development when cloud services are not configured
- Netlify-only production hosting with direct R2 uploads and browser-side decryption

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 7, Tailwind CSS, shadcn-style UI |
| Backend | Node.js 24+, Express 5 for local dev, Netlify Functions in production |
| Database | MongoDB Atlas in cloud mode, SQLite in local fallback mode |
| Object Storage | Cloudflare R2 in cloud mode, local filesystem in fallback mode |
| Hosting | Netlify for frontend and production API |

## Project Structure

```text
securefiletransfer/
|- frontend/   React client
|- backend/    Express API
|- netlify.toml
|- render.yaml
|- package.json
```

## Requirements

- Node.js `24+`
- npm
- MongoDB Atlas and Cloudflare R2 for production

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the backend

Copy `backend/.env.example` to `backend/.env` and fill in the values you want to use:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
PUBLIC_API_BASE_URL=http://localhost:5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/secure-file-transfer
R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=secure-file-transfer
R2_REGION=auto
DELETE_TOKEN=change-me
MAX_UPLOAD_SIZE_MB=4
DEFAULT_EXPIRY_SECONDS=3600
ALLOW_LOCAL_FALLBACK=true
CLEANUP_INTERVAL_SECONDS=60
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX=300
UPLOAD_RATE_LIMIT_WINDOW_MS=900000
UPLOAD_RATE_LIMIT_MAX=50
```

Notes:

- `DELETE_TOKEN` is optional.
- The upload rule is currently "file must be smaller than 4 MB".
- If Atlas and R2 are missing locally and `ALLOW_LOCAL_FALLBACK=true`, the app uses SQLite plus local encrypted storage.

### 3. Configure the frontend

Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

### 4. Start the app

```bash
npm run dev
```

This starts:

- frontend at `http://localhost:5173`
- backend at `http://localhost:5000`

## Core Behavior

### Secure File Sharing

- A user uploads one file at a time
- On Netlify, the file is encrypted in the browser before direct upload to Cloudflare R2
- On the local Express backend, the server encrypts the uploaded file before storage
- Only file metadata is stored in the database
- A share token and download flow are returned
- Expired transfers are cleaned up automatically

### Upload Limits

- Upload size must be strictly below `4 MB`
- Default upload rate limit is `50` uploads per `15 minutes`

### QR Generator

- Single text mode
- vCard mode
- Batch mode
- PNG and SVG export
- Clipboard copy for content and QR image

### Barcode Generator

- Data Matrix
- Aztec
- PDF417
- Code 128
- Code 39
- EAN-13
- UPC-A

## API Overview

### `GET /api/health`

Returns runtime status and configuration summary.

### `POST /api/files/upload/init`

Creates a signed direct-upload URL for production Netlify uploads.

### `POST /api/files/upload/complete`

Finalizes a production upload after the encrypted file reaches R2.

### `POST /api/files/upload`

Multipart upload used by the local Express backend.

### `GET /api/files/:shareToken`

Returns transfer metadata.

### `POST /api/files/:shareToken/downloaded`

Records a completed client-side download in Netlify production mode.

### `DELETE /api/files/:shareToken`

Deletes a transfer immediately. If `DELETE_TOKEN` is set, send it through:

- `x-delete-token: <value>`
- or JSON body `{ "token": "<value>" }`

## Deployment

### Recommended Stack

- Frontend: Netlify
- Backend API: Netlify Functions
- Database: MongoDB Atlas
- Storage: Cloudflare R2

### Netlify Production

This repo already includes [netlify.toml](./netlify.toml).

- Build command: `npm run build`
- Publish directory: `frontend/dist`
- Functions directory: `netlify/functions`
- Production site can use same-origin `/api/*` calls, so `VITE_API_BASE_URL` is optional

Required production env vars:

- `CLIENT_URL`
- `PUBLIC_API_BASE_URL`
- `MONGO_URI`
- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_REGION`
- `DELETE_TOKEN`

R2 bucket CORS must allow your Netlify site origin for `GET`, `HEAD`, and `PUT`.

## Verification

Run these before deploying:

```bash
npm test
npm run build --workspace frontend
npx tsc --noEmit --project frontend/tsconfig.json
```

## Repository Setup

If you are pushing this to GitHub for the first time:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/secure-file-transfer.git
git push -u origin main
```

## Notes

- Temporary decrypted files are written to `backend/tmp/` during downloads and then removed.
- Encrypted blobs are stored as `uploads/<shareToken>/<filename>.enc`.
- The encryption key never appears in frontend responses.
