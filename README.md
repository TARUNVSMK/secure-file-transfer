# Secure File Transfer

Secure File Transfer is a full-stack file sharing app with three tools in one interface:

- secure file link sharing
- styled QR code generation
- barcode generation

The upload flow encrypts files with AES-256-GCM before storage, creates expiring share links, and removes expired files automatically. The frontend is built with React and Vite, and the backend runs on Node.js and Express.

## Highlights

- Encrypted file sharing with expiring download links
- File uploads must stay below `200 MB`
- Automatic expiry cleanup for shared files
- QR code generator with color, shape, logo, and export controls
- Barcode generator with multiple formats and export actions
- Local fallback mode for development when cloud services are not configured

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 7, Tailwind CSS, shadcn-style UI |
| Backend | Node.js 24+, Express 5, Multer |
| Database | MongoDB Atlas in cloud mode, SQLite in local fallback mode |
| Object Storage | Cloudflare R2 in cloud mode, local filesystem in fallback mode |
| Hosting | Netlify for frontend, Render for backend |

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
MAX_UPLOAD_SIZE_MB=200
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
- The upload rule is currently "file must be smaller than 200 MB".
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
- The file is encrypted before storage
- Only file metadata is stored in the database
- A share token and download URL are returned
- Expired transfers are cleaned up automatically

### Upload Limits

- Upload size must be strictly below `200 MB`
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

### `POST /api/files/upload`

Multipart upload.

Fields:

- `file`
- `expirySeconds`

### `GET /api/files/:shareToken`

Returns transfer metadata.

### `GET /api/files/:shareToken/download`

Streams the decrypted file to the user.

### `DELETE /api/files/:shareToken`

Deletes a transfer immediately. If `DELETE_TOKEN` is set, send it through:

- `x-delete-token: <value>`
- or JSON body `{ "token": "<value>" }`

## Deployment

### Recommended Free Stack

- Frontend: Netlify
- Backend: Render
- Database: MongoDB Atlas free tier
- Storage: Cloudflare R2 free tier

### Netlify Frontend

This repo already includes [netlify.toml](./netlify.toml).

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`
- Required env var: `VITE_API_BASE_URL=https://your-backend-url`

### Render Backend

This repo already includes [render.yaml](./render.yaml).

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm run start`
- Health check path: `/api/health`

Required production env vars:

- `CLIENT_URL`
- `PUBLIC_API_BASE_URL`
- `MONGO_URI`
- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

### Why Not Netlify-Only for File Sharing

The frontend works great on Netlify, but the secure file sharing backend is a long-running Express API with upload handling and cleanup logic. Keeping full file-sharing behavior is much more reliable with a dedicated backend host.

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
