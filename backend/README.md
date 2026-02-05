# Admin listing backend (no Blaze required)

This tiny Express app exposes `/listUsers` using the Firebase Admin SDK. Deploy it to a platform like Render, Railway, Fly.io, Vercel/Netlify functions (Node 20), or any VPS. No Firebase Blaze upgrade is needed.

## Files
- `server.js` – Express server with `/listUsers` (verifies ID token, checks admin allowlist, lists users via Admin SDK).
- `package.json` – dependencies: `firebase-admin`, `express`, `cors`.

## Required env vars
- `FIREBASE_SERVICE_ACCOUNT` – full JSON of a Firebase service account (stringified).
- `ADMIN_EMAILS` – comma-separated admin emails (e.g., `admin@example.com,other@example.com`).
- `PORT` – optional; defaults to `3000`.

## Run locally (Node 20)
```bash
cd backend
npm install
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}' \
ADMIN_EMAILS="admin@example.com" \
npm start
```

## Deploy (example: Render/Railway/Fly/Vercel/Netlify functions)
1) Push `backend/` to a repo.
2) Create a new Node service (Node 20).
3) Add env vars above; base64-encode or JSON-stringify the service account as required by the host.
4) Start command: `npm start`.
5) After deploy, note the URL for `/listUsers`.

## Wire the frontend
In `.env.local` set:
```
VITE_ADMIN_USERS_ENDPOINT=https://your-deployed-url/listUsers
```
Restart `npm run dev`. Admins will now see the Users tab populated; non-admins remain blocked.
